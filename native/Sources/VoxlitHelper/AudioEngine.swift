import Foundation
import AVFoundation
import CoreAudio
import AudioToolbox

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
    /// Gain mode: "off" (no boost), "manual" (use inputGain), "auto" (AGC)
    private var gainMode: String = "auto"
    /// Current AGC gain — adapts each buffer to hit agcTargetPeak
    private var currentAutoGain: Float = 2.0
    private let agcTargetPeak: Float = 0.6
    private let agcMinGain: Float = 1.0
    private let agcMaxGain: Float = 5.0
    /// Below this RMS we assume silence — hold gain steady so we don't amplify noise floor
    private let agcNoiseGate: Float = 0.005
    /// Fast attack: drop gain quickly when input gets too loud (avoid clipping)
    private let agcAttackCoef: Float = 0.30
    /// Slow release: raise gain gradually when input is consistently quiet
    private let agcReleaseCoef: Float = 0.02
    /// Apple's voice processing IO: built-in noise suppression + echo cancellation.
    /// Toggled by setNoiseSuppression(); applied at engine.start() time.
    private var noiseSuppression: Bool = true

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

    /// Set gain mode: "off" (pass-through), "manual" (apply inputGain), "auto" (AGC)
    func setGainMode(_ mode: String) {
        let valid = ["off", "manual", "auto"]
        gainMode = valid.contains(mode) ? mode : "auto"
        // Reset AGC to a sensible starting point when entering auto mode
        if gainMode == "auto" { currentAutoGain = 2.0 }
        print("[AudioEngine] Gain mode: \(gainMode)")
    }

    /// Enable/disable Apple's voice processing IO (noise + echo cancellation).
    /// Takes effect on next start() — the input node has to be reconfigured.
    func setNoiseSuppression(_ enabled: Bool) {
        noiseSuppression = enabled
        print("[AudioEngine] Noise suppression: \(enabled ? "on" : "off")")
    }

    func start() throws {
        guard !isRunning else { return }

        // Rebuild engine each session so device changes take effect cleanly
        engine = AVAudioEngine()

        // Toggle Apple's voice processing IO (noise suppression + echo cancellation).
        // Must be set before reading inputFormat — it changes the AudioUnit subtype.
        // Wrapped in try? since macOS < 10.15 and some hardware will throw.
        do {
            try engine.inputNode.setVoiceProcessingEnabled(noiseSuppression)
        } catch {
            print("[AudioEngine] setVoiceProcessingEnabled(\(noiseSuppression)) failed: \(error)")
        }

        // VPIO ships with its own AGC enabled by default — disable it so our
        // custom AGC isn't fighting Apple's. Same for built-in muting/ducking.
        if noiseSuppression, let au = engine.inputNode.audioUnit {
            var off: UInt32 = 0
            AudioUnitSetProperty(au, kAUVoiceIOProperty_VoiceProcessingEnableAGC,
                                 kAudioUnitScope_Global, 0, &off, UInt32(MemoryLayout<UInt32>.size))
        }

        // For Bluetooth devices, force the system default input so macOS negotiates
        // the HFP profile (required to use the BT mic). Only do this at start time —
        // doing it on device selection would keep HFP active permanently and the
        // orange mic indicator would stay lit between recordings.
        if let uid = preferredDeviceUID, let deviceID = AudioDevices.idForUID(uid),
           AudioDevices.isBluetoothDevice(deviceID) {
            AudioDevices.setSystemDefaultInput(uid: uid)
        }

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
        // Disable voice processing first — VPIO holds the audio HAL open
        // for echo-cancel reference, which keeps the orange mic indicator on.
        try? engine.inputNode.setVoiceProcessingEnabled(false)
        engine.stop()
        // Recreate the engine to drop the input AudioUnit reference. Without this,
        // ARC keeps the old AudioUnit alive long enough that the system still sees
        // an active input client, and the menubar mic indicator never turns off.
        engine = AVAudioEngine()
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

        // Apply gain according to mode. tanh soft-limits the result so
        // boosted samples don't square-wave clip (which causes Whisper hallucinations).
        switch gainMode {
        case "off":
            break  // pass-through
        case "manual":
            if inputGain != 1.0 {
                for i in 0..<frameLength {
                    channelData[i] = tanhf(channelData[i] * inputGain)
                }
            }
        case "auto":
            // Measure peak + RMS this buffer
            var peak: Float = 0
            var sumSquares: Float = 0
            for i in 0..<frameLength {
                let v = channelData[i]
                let abs_v = v < 0 ? -v : v
                if abs_v > peak { peak = abs_v }
                sumSquares += v * v
            }
            let rms = sqrtf(sumSquares / Float(frameLength))

            // Only adapt when there's actual signal — otherwise the gate freezes
            // gain and we don't amplify the noise floor between sentences.
            if rms > agcNoiseGate && peak > 0 {
                let desired = agcTargetPeak / peak
                let clamped = max(agcMinGain, min(agcMaxGain, desired))
                // Asymmetric smoothing: snap down fast (avoid clip), creep up slow (avoid pumping)
                let coef = clamped < currentAutoGain ? agcAttackCoef : agcReleaseCoef
                currentAutoGain = currentAutoGain * (1 - coef) + clamped * coef
            }

            for i in 0..<frameLength {
                channelData[i] = tanhf(channelData[i] * currentAutoGain)
            }
        default:
            break
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

    /// Public Bluetooth check — used by AudioEngine to decide whether to force HFP at start.
    static func isBluetoothDevice(_ deviceID: AudioDeviceID) -> Bool {
        return isBluetooth(deviceID)
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
