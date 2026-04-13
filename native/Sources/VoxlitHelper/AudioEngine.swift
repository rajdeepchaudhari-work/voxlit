import Foundation
import AVFoundation
import CoreAudio

/// Captures microphone audio at 16kHz mono Float32 and streams PCM frames over the socket.
/// The engine only runs while a recording session is active — this is what makes
/// macOS show the orange mic indicator *during recording* (vs. always-on).
class AudioEngine {
    private var engine = AVAudioEngine()
    private weak var socket: SocketWriter?
    private var isRunning = false
    private var preferredDeviceUID: String?

    private let targetFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: 16000,
        channels: 1,
        interleaved: false
    )!

    init(socket: SocketWriter) {
        self.socket = socket
    }

    /// Set the preferred input device by CoreAudio UID (e.g. "BuiltInMicrophoneDevice",
    /// or AirPods UID from AVAudioDevices). Empty/nil uses system default.
    func setPreferredDevice(uid: String?) {
        preferredDeviceUID = (uid?.isEmpty == false) ? uid : nil
        print("[AudioEngine] Preferred device UID: \(preferredDeviceUID ?? "(system default)")")
    }

    func start() throws {
        guard !isRunning else { return }

        // Rebuild engine each session so device changes take effect cleanly
        engine = AVAudioEngine()

        // Bind the requested device to the input AudioUnit BEFORE reading inputFormat
        if let uid = preferredDeviceUID, let deviceID = AudioDevices.idForUID(uid) {
            if let au = engine.inputNode.audioUnit {
                var dev = deviceID
                let status = AudioUnitSetProperty(
                    au,
                    kAudioOutputUnitProperty_CurrentDevice,
                    kAudioUnitScope_Global,
                    0,
                    &dev,
                    UInt32(MemoryLayout<AudioDeviceID>.size)
                )
                if status != noErr {
                    print("[AudioEngine] Failed to bind device \(uid) (status \(status)) — using default")
                }
            }
        }

        let inputNode = engine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard inputFormat.sampleRate > 0 else {
            throw AudioEngineError.noInputDevice
        }

        guard let converter = AVAudioConverter(from: inputFormat, to: targetFormat) else {
            throw AudioEngineError.converterFailed
        }

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, _ in
            guard let self, self.isRunning else { return }
            self.processBuffer(buffer, converter: converter)
        }

        try engine.start()
        isRunning = true
        print("[AudioEngine] Started — inputFormat: \(inputFormat)")
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        print("[AudioEngine] Stopped")
    }

    private func processBuffer(_ input: AVAudioPCMBuffer, converter: AVAudioConverter) {
        let frameCount = AVAudioFrameCount(Double(input.frameLength) * targetFormat.sampleRate / input.format.sampleRate)
        guard let output = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else { return }

        var error: NSError?
        var inputConsumed = false

        converter.convert(to: output, error: &error) { _, outStatus in
            if inputConsumed {
                outStatus.pointee = .noDataNow
                return nil
            }
            outStatus.pointee = .haveData
            inputConsumed = true
            return input
        }

        if error != nil { return }

        let frameLength = Int(output.frameLength)
        guard frameLength > 0, let channelData = output.floatChannelData?[0] else { return }

        let byteCount = frameLength * MemoryLayout<Float32>.size
        let data = Data(bytes: channelData, count: byteCount)
        socket?.sendPCM(data)
    }
}

enum AudioEngineError: Error {
    case converterFailed
    case noInputDevice
}

// MARK: - CoreAudio device enumeration

struct AudioDeviceInfo {
    let uid: String
    let name: String
    let isDefault: Bool
}

enum AudioDevices {
    /// Enumerate all input-capable audio devices.
    static func listInputs() -> [AudioDeviceInfo] {
        let defaultID = currentDefaultInputID()
        let all = allDeviceIDs()
        print("[AudioDevices] Found \(all.count) total devices, default input: \(defaultID)")
        let inputs: [AudioDeviceInfo] = all.compactMap { deviceID in
            guard hasInputStreams(deviceID) else { return nil }
            guard let uid = stringProperty(deviceID, kAudioDevicePropertyDeviceUID) else {
                print("[AudioDevices] Device \(deviceID) has input but no UID — skipping")
                return nil
            }
            let name = stringProperty(deviceID, kAudioObjectPropertyName) ?? uid
            return AudioDeviceInfo(uid: uid, name: name, isDefault: deviceID == defaultID)
        }
        print("[AudioDevices] Returning \(inputs.count) input devices: \(inputs.map { $0.name })")
        return inputs
    }

    /// Look up the numeric AudioDeviceID for a given UID string.
    static func idForUID(_ uid: String) -> AudioDeviceID? {
        for deviceID in allDeviceIDs() {
            if stringProperty(deviceID, kAudioDevicePropertyDeviceUID) == uid {
                return deviceID
            }
        }
        return nil
    }

    // MARK: internals

    private static func allDeviceIDs() -> [AudioDeviceID] {
        var addr = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var size: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size) == noErr else {
            return []
        }
        let count = Int(size) / MemoryLayout<AudioDeviceID>.size
        var devices = [AudioDeviceID](repeating: 0, count: count)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &devices) == noErr else {
            return []
        }
        return devices
    }

    private static func hasInputStreams(_ deviceID: AudioDeviceID) -> Bool {
        var addr = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreams,
            mScope: kAudioObjectPropertyScopeInput,
            mElement: kAudioObjectPropertyElementMain
        )
        var size: UInt32 = 0
        AudioObjectGetPropertyDataSize(deviceID, &addr, 0, nil, &size)
        return size > 0
    }

    private static func currentDefaultInputID() -> AudioDeviceID {
        var addr = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var id: AudioDeviceID = 0
        var size = UInt32(MemoryLayout<AudioDeviceID>.size)
        AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &addr, 0, nil, &size, &id)
        return id
    }

    /// Read a CFString property from CoreAudio. Uses Optional<CFString> because
    /// the HAL writes a CFStringRef pointer into our buffer — Optional<CFString>
    /// has the right ABI (single pointer-sized slot) for that.
    private static func stringProperty(_ deviceID: AudioDeviceID, _ selector: AudioObjectPropertySelector) -> String? {
        var addr = AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var name: CFString?
        var size = UInt32(MemoryLayout<CFString?>.size)
        let status = AudioObjectGetPropertyData(deviceID, &addr, 0, nil, &size, &name)
        guard status == noErr, let name else { return nil }
        return name as String
    }
}
