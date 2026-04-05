import Foundation
import AVFoundation

/// Captures microphone audio at 16kHz mono Float32 and streams PCM frames over the socket.
class AudioEngine {
    private let engine = AVAudioEngine()
    private weak var socket: SocketWriter?
    private var isRunning = false

    private let targetFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: 16000,
        channels: 1,
        interleaved: false
    )!

    init(socket: SocketWriter) {
        self.socket = socket
    }

    func start() throws {
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

        // Handle audio interruptions (other app takes mic, headphones plug/unplug).
        // Closure form required — AudioEngine doesn't inherit NSObject so selector form would crash.
        NotificationCenter.default.addObserver(
            forName: .AVAudioEngineConfigurationChange,
            object: engine,
            queue: .main
        ) { [weak self] _ in
            guard let self, self.isRunning else { return }
            print("[AudioEngine] Configuration changed — restarting engine")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                guard let self, self.isRunning else { return }
                do {
                    try self.engine.start()
                    print("[AudioEngine] Restarted after config change")
                } catch {
                    print("[AudioEngine] Failed to restart after config change: \(error)")
                }
            }
        }

        try engine.start()
        isRunning = true
        print("[AudioEngine] Started — inputFormat: \(inputFormat)")
    }

    func stop() {
        isRunning = false
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
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
