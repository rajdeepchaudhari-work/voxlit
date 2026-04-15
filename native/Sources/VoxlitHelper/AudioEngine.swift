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
    /// True when the engine needs full reconfiguration (device change, VPIO toggle).
    /// First start() always reconfigures. Subsequent presses just call engine.start()
    /// — instant compared to rebuilding inputNode + tap + format negotiation.
    private var needsReconfigure: Bool = true
    /// Input gain multiplier applied to captured samples before sending.
    /// Default 1.0 = no boost. Hard clipping causes Whisper hallucinations,
    /// so we use soft limiting (tanh) when gain > 1.0.
    private var inputGain: Float = 1.0
    /// Gain mode: "off" (no boost), "manual" (use inputGain), "auto" (AGC)
    private var gainMode: String = "off"
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
    /// Default off — VPIO can conflict with custom device binding and our own AGC,
    /// causing the engine to fail-to-start on some hardware (mic indicator flickers).
    /// Users can opt in via Settings.
    private var noiseSuppression: Bool = false
    /// True when the most recent start() had to fall back to the system default
    /// because the preferred device was unavailable. Resets when the user picks
    /// a new device or when the preferred device reappears on next start().
    private var fellBackToDefault: Bool = false

    private let targetFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: 16000,
        channels: 1,
        interleaved: false
    )!

    init(socket: SocketWriter) {
        self.socket = socket
        // AVAudioEngine posts this when the route/device topology changes
        // (device plugged/unplugged, system default switched). We force a full
        // reconfigure on next start() instead of trying to patch the live graph.
        NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            print("[AudioEngine] Configuration change — will reconfigure on next start()")
            self.needsReconfigure = true
        }
    }

    /// Called when the Mac wakes from sleep. AVAudioEngine's HAL bindings are
    /// unreliable after wake (especially with Bluetooth/USB devices that come
    /// and go), so force a full rebuild on the next press.
    func handleSystemWake() {
        needsReconfigure = true
        fellBackToDefault = false
    }

    /// Set the preferred input device by CoreAudio UID (e.g. "BuiltInMicrophoneDevice",
    /// or AirPods UID from AVAudioDevices). Empty/nil uses system default.
    func setPreferredDevice(uid: String?) {
        let newUID = (uid?.isEmpty == false) ? uid : nil
        if newUID != preferredDeviceUID {
            needsReconfigure = true
            // User picked a new device — the old "we already warned the user"
            // dedupe state is irrelevant. If THIS device later vanishes, we
            // want the user to see a fresh audio_error event.
            fellBackToDefault = false
        }
        preferredDeviceUID = newUID
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
        if enabled != noiseSuppression { needsReconfigure = true }
        noiseSuppression = enabled
        print("[AudioEngine] Noise suppression: \(enabled ? "on" : "off")")
    }

    func start() throws {
        guard !isRunning else { return }

        // Attempt 1: honour the user's preferred device if it currently exists.
        // Attempt 2 (fallback): if the preferred device is missing OR the engine
        // fails to start with it bound, retry against the system default. This
        // is what rescues dictation when a Bluetooth mic is gone after wake, or
        // the user switched accounts with a different default input.
        let wantsPreferred = preferredDeviceUID != nil && AudioDevices.idForUID(preferredDeviceUID!) != nil
        let activeUID: String? = wantsPreferred ? preferredDeviceUID : nil

        if preferredDeviceUID != nil && !wantsPreferred {
            print("[AudioEngine] Preferred device \(preferredDeviceUID!) not available — falling back to system default")
            reportFallback(reason: "preferred device unavailable")
        }

        // Reconfigure (heavy: ~500-1500ms) only when device or VPIO setting actually changed.
        // After first press the engine, tap, format, and converter all get reused — subsequent
        // start() calls only pay the engine.start() cost (~tens of ms).
        if needsReconfigure {
            do {
                try reconfigure(withUID: activeUID)
            } catch {
                // If reconfigure with the preferred device failed and we haven't
                // already been on the default path, try again against the default.
                if activeUID != nil {
                    print("[AudioEngine] reconfigure with preferred device failed (\(error)) — retrying with system default")
                    reportFallback(reason: "reconfigure failed: \(error)")
                    try reconfigure(withUID: nil)
                } else {
                    throw error
                }
            }
            needsReconfigure = false
        }

        // For Bluetooth, force HFP at start time. Only do this when we're actually
        // going to use the preferred device — if we already fell back, leave the
        // system default alone.
        if let uid = activeUID, let deviceID = AudioDevices.idForUID(uid),
           AudioDevices.isBluetoothDevice(deviceID) {
            AudioDevices.setSystemDefaultInput(uid: uid)
        }

        do {
            try engine.start()
        } catch {
            // Last-chance fallback: engine passed reconfigure but engine.start()
            // threw (e.g. device vanished between reconfigure and start). If we
            // were bound to a preferred device, rebuild against the default.
            if activeUID != nil {
                print("[AudioEngine] engine.start() failed (\(error)) — falling back to system default and retrying")
                reportFallback(reason: "engine.start failed: \(error)")
                try reconfigure(withUID: nil)
                try engine.start()
            } else {
                throw error
            }
        }

        isRunning = true
        print("[AudioEngine] Started")
    }

    /// Emit an audio_error JSON to Electron so the UI can show the user that
    /// we're on the default mic, not the one they picked. De-dupes per session
    /// to avoid spamming on every press once a device is gone.
    private func reportFallback(reason: String) {
        guard !fellBackToDefault else { return }
        fellBackToDefault = true
        socket?.sendJSON([
            "type": "audio_error",
            "kind": "device_fallback",
            "message": "Using system default microphone — \(reason)",
            "preferredUid": preferredDeviceUID ?? "",
        ])
    }

    /// Heavy setup: rebuild the engine, configure VPIO, bind device, install tap.
    /// Only called when something material changed since the last reconfigure.
    /// Pass `uid=nil` to skip device binding entirely and let AVAudioEngine use
    /// the system default — that's the fallback path when the preferred device
    /// is gone or fails to bind.
    private func reconfigure(withUID uid: String?) throws {
        engine = AVAudioEngine()

        // Voice processing IO (noise + echo cancel). Must be set before reading inputFormat
        // — it changes the AudioUnit subtype. wrapped in try? since some hardware throws.
        do {
            try engine.inputNode.setVoiceProcessingEnabled(noiseSuppression)
        } catch {
            print("[AudioEngine] setVoiceProcessingEnabled(\(noiseSuppression)) failed: \(error)")
        }

        // VPIO ships with its own AGC — disable so our AGC isn't fighting Apple's.
        if noiseSuppression, let au = engine.inputNode.audioUnit {
            var off: UInt32 = 0
            AudioUnitSetProperty(au, kAUVoiceIOProperty_VoiceProcessingEnableAGC,
                                 kAudioUnitScope_Global, 0, &off, UInt32(MemoryLayout<UInt32>.size))
        }

        // Bind the requested device to the input AudioUnit BEFORE reading inputFormat.
        // If the bind fails we throw — the caller catches and retries with uid=nil.
        if let uid, let deviceID = AudioDevices.idForUID(uid) {
            if let au = engine.inputNode.audioUnit {
                var dev = deviceID
                let status = AudioUnitSetProperty(
                    au, kAudioOutputUnitProperty_CurrentDevice, kAudioUnitScope_Global, 0,
                    &dev, UInt32(MemoryLayout<AudioDeviceID>.size)
                )
                if status != noErr {
                    print("[AudioEngine] Failed to bind device \(uid) (status \(status))")
                    throw AudioEngineError.deviceBindFailed(status: status)
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

        // Pre-roll the audio HAL so the FIRST engine.start() is also fast.
        // Without prepare(), the first start() call still has to negotiate with the HAL.
        engine.prepare()

        print("[AudioEngine] Reconfigured — inputFormat: \(inputFormat)")
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        // Just stop — keep tap installed and engine alive across recordings so the
        // next start() is sub-50ms instead of paying the full reconfigure cost.
        // engine.stop() releases the audio HAL, so the orange mic indicator turns off.
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
    case deviceBindFailed(status: OSStatus)
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
