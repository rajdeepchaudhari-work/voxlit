import Foundation

// Wire protocol between VoxlitHelper and the Electron main process.
//
// Frame format:
//   [4 bytes] big-endian UInt32 — total message length (includes type byte)
//   [1 byte]  message type
//   [N bytes] payload
//
// Message types:
//   0x01 — JSON control message (UTF-8 encoded)
//   0x02 — PCM audio frame (raw Float32 samples, 16kHz mono)

enum MessageType: UInt8 {
    case json  = 0x01
    case pcm   = 0x02
}

struct SocketProtocol {

    /// Frames a JSON-encodable value into the wire format.
    static func frameJSON(_ object: [String: Any]) -> Data? {
        guard let payload = try? JSONSerialization.data(withJSONObject: object) else { return nil }
        return frame(type: .json, payload: payload)
    }

    /// Frames raw PCM data into the wire format.
    static func framePCM(_ samples: Data) -> Data {
        return frame(type: .pcm, payload: samples)
    }

    private static func frame(type: MessageType, payload: Data) -> Data {
        let length = UInt32(payload.count + 1)  // +1 for type byte
        var header = Data(count: 5)
        header[0] = UInt8((length >> 24) & 0xFF)
        header[1] = UInt8((length >> 16) & 0xFF)
        header[2] = UInt8((length >> 8)  & 0xFF)
        header[3] = UInt8(length & 0xFF)
        header[4] = type.rawValue
        return header + payload
    }

    /// Parses as many complete frames as possible from `buffer`.
    /// Returns (frames, remaining) where `remaining` is the unconsumed bytes.
    static func parse(buffer: Data) -> (frames: [(type: MessageType, payload: Data)], remaining: Data) {
        var frames: [(type: MessageType, payload: Data)] = []
        var offset = 0

        while offset + 5 <= buffer.count {
            let length = Int(
                (UInt32(buffer[offset])     << 24) |
                (UInt32(buffer[offset + 1]) << 16) |
                (UInt32(buffer[offset + 2]) << 8)  |
                 UInt32(buffer[offset + 3])
            )

            guard offset + 4 + length <= buffer.count else { break }

            let typeRaw = buffer[offset + 4]
            let payload = buffer[(offset + 5)..<(offset + 4 + length)]

            if let type = MessageType(rawValue: typeRaw) {
                frames.append((type: type, payload: Data(payload)))
            }

            offset += 4 + length
        }

        return (frames, buffer.suffix(from: offset))
    }
}
