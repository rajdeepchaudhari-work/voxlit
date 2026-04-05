import XCTest
@testable import VoxlitHelper

final class SocketProtocolTests: XCTestCase {

    func testFrameAndParseJSON() throws {
        let message: [String: Any] = ["type": "hotkey", "action": "toggle"]
        let framed = SocketProtocol.frameJSON(message)
        XCTAssertNotNil(framed)

        let (frames, remaining) = SocketProtocol.parse(buffer: framed!)
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].type, .json)
        XCTAssertTrue(remaining.isEmpty)

        let parsed = try JSONSerialization.jsonObject(with: frames[0].payload) as? [String: String]
        XCTAssertEqual(parsed?["type"], "hotkey")
        XCTAssertEqual(parsed?["action"], "toggle")
    }

    func testFrameAndParsePCM() {
        let samples = Data([0x01, 0x02, 0x03, 0x04])
        let framed = SocketProtocol.framePCM(samples)

        let (frames, remaining) = SocketProtocol.parse(buffer: framed)
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].type, .pcm)
        XCTAssertEqual(frames[0].payload, samples)
        XCTAssertTrue(remaining.isEmpty)
    }

    func testPartialFrameBuffering() {
        let message: [String: Any] = ["type": "test"]
        let full = SocketProtocol.frameJSON(message)!

        // Feed only half the frame
        let half = full.prefix(full.count / 2)
        let (frames1, remaining1) = SocketProtocol.parse(buffer: Data(half))
        XCTAssertEqual(frames1.count, 0)
        XCTAssertEqual(remaining1, Data(half))

        // Feed the rest
        let second = full.suffix(from: full.count / 2)
        let combined = remaining1 + second
        let (frames2, remaining2) = SocketProtocol.parse(buffer: combined)
        XCTAssertEqual(frames2.count, 1)
        XCTAssertTrue(remaining2.isEmpty)
    }

    func testMultipleFrames() {
        let msg1 = SocketProtocol.frameJSON(["type": "a"])!
        let msg2 = SocketProtocol.frameJSON(["type": "b"])!
        let combined = msg1 + msg2

        let (frames, remaining) = SocketProtocol.parse(buffer: combined)
        XCTAssertEqual(frames.count, 2)
        XCTAssertTrue(remaining.isEmpty)
    }
}
