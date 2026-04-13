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
    /// Input gain multiplier applied to captured samples before sending.
    /// Default 1.0 = no boost. Hard clipping causes Whisper hallucinations,
    /// so we use soft limiting (tanh) when gain > 1.0.
    private var inputGain: Float = 1.0

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

    /// Set input gain multiplier (1.0 = no boost, 2.5 = default, max ~5.0)
    func setGain(_ gain: Float) {
        inputGain = max(0.5, min(5.0, gain))
        print("[AudioEngine] Input gain: \(inputGain)x")
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

        // Apply input gain with SOFT limiting (tanh-style) — boosts quiet
        // speech without creating square-wave distortion that confuses Whisper.
        if inputGain != 1.0 {
            for i in 0..<frameLength {
                let amplified = channelData[i] * inputGain
                // tanh-based soft limit: linear up to ±0.7, smoothly compresses above
                channelData[i] = tanhf(amplified)
            }
        }

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
    let isBluetooth: Bool
}

enum AudioDevices {
    /// Enumerate all input-capable audio devices.
    /// Bluetooth devices in A2DP-only mode (no active input stream) are included
    /// because selecting them triggers HFP negotiation via setSystemDefaultInput.
    static func listInputs() -> [AudioDeviceInfo] {
        let defaultID = currentDefaultInputID()
        let all = allDeviceIDs()
        print("[AudioDevices] Found \(all.count) total devices, default input: \(defaultID)")
        let inputs: [AudioDeviceInfo] = all.compactMap { deviceID in
            let bt = isBluetooth(deviceID)
            // Include if it has active input streams OR is a Bluetooth device
            // (Bluetooth may show no input streams until HFP profile is activated)
            guard hasInputStreams(deviceID) || bt else { return nil }
            guard let uid = stringProperty(deviceID, kAudioDevicePropertyDeviceUID) else {
                print("[AudioDevices] Device \(deviceID) skipped — no UID")
                return nil
            }
            let name = stringProperty(deviceID, kAudioObjectPropertyName) ?? uid
            return AudioDeviceInfo(uid: uid, name: name, isDefault: deviceID == defaultID, isBluetooth: bt)
        }
        print("[AudioDevices] Returning \(inputs.count) input devices: \(inputs.map { "\($0.name)\($0.isBluetooth ? " [BT]" : "")" })")
        return inputs
    }

    /// Set the macOS system default input device by UID.
    /// This forces macOS to activate the HFP profile on Bluetooth headsets,
    /// which is what unlocks them as microphone inputs.
    static func setSystemDefaultInput(uid: String) {
        guard let deviceID = idForUID(uid) else {
            print("[AudioDevices] setSystemDefaultInput: UID not found — \(uid)")
            return
        }
        var addr = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var id = deviceID
        let status = AudioObjectSetPropertyData(
            AudioObjectID(kAudioObjectSystemObject),
            &addr, 0, nil,
            UInt32(MemoryLayout<AudioDeviceID>.size),
            &id
        )
        print("[AudioDevices] setSystemDefaultInput(\(uid)) status: \(status == noErr ? "OK" : "err \(status)")")
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

    private static func transportType(_ deviceID: AudioDeviceID) -> UInt32 {
        var addr = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyTransportType,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var type: UInt32 = 0
        var size = UInt32(MemoryLayout<UInt32>.size)
        AudioObjectGetPropertyData(deviceID, &addr, 0, nil, &size, &type)
        return type
    }

    private static func isBluetooth(_ deviceID: AudioDeviceID) -> Bool {
        let t = transportType(deviceID)
        // kAudioDeviceTransportTypeBluetooth = 0x0040
        // kAudioDeviceTransportTypeBluetoothLE = 0x0041
        return t == 0x0040 || t == 0x0041
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

    /// Read a CFString property from CoreAudio. Uses raw memory + Unmanaged
    /// because the HAL writes a CFStringRef pointer into the buffer with a
    /// +1 retain count — Unmanaged.takeRetainedValue() handles ownership correctly.
    private static func stringProperty(_ deviceID: AudioDeviceID, _ selector: AudioObjectPropertySelector) -> String? {
        var addr = AudioObjectPropertyAddress(
            mSelector: selector,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var size = UInt32(MemoryLayout<CFString?>.size)
        let buffer = UnsafeMutableRawPointer.allocate(byteCount: Int(size), alignment: MemoryLayout<CFString?>.alignment)
        defer { buffer.deallocate() }
        buffer.initializeMemory(as: CFString?.self, repeating: nil, count: 1)

        let status = AudioObjectGetPropertyData(deviceID, &addr, 0, nil, &size, buffer)
        guard status == noErr else { return nil }

        let typed = buffer.bindMemory(to: CFString?.self, capacity: 1)
        guard let cf = typed.pointee else { return nil }
        return cf as String
    }
}
