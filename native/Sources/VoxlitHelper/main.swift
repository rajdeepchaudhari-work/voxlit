import Foundation
import AppKit
import CoreGraphics

// ─── Unix socket client ───────────────────────────────────────────────────────

let socketPath = "/tmp/voxlit.socket"

class SocketClient: SocketWriter {
    private var fd: Int32 = -1
    var onJSON: (([String: Any]) -> Void)?

    func connect() -> Bool {
        let sock = Darwin.socket(AF_UNIX, SOCK_STREAM, 0)
        guard sock >= 0 else { return false }

        var addr = sockaddr_un()
        addr.sun_family = sa_family_t(AF_UNIX)
        withUnsafeMutablePointer(to: &addr.sun_path) { ptr in
            ptr.withMemoryRebound(to: CChar.self, capacity: 104) { cStr in
                _ = strncpy(cStr, socketPath, 103)
            }
        }

        let result = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.connect(sock, $0, socklen_t(MemoryLayout<sockaddr_un>.size))
            }
        }

        guard result == 0 else { Darwin.close(sock); return false }

        fd = sock
        print("[SocketClient] Connected to \(socketPath)")
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in self?.readLoop() }
        return true
    }

    private func readLoop() {
        var buf = Data()
        while true {
            var chunk = [UInt8](repeating: 0, count: 4096)
            let n = Darwin.read(fd, &chunk, chunk.count)
            guard n > 0 else { print("[SocketClient] Disconnected"); break }
            buf.append(contentsOf: chunk.prefix(n))
            let (frames, remaining) = SocketProtocol.parse(buffer: buf)
            buf = Data(remaining)  // copy to reset startIndex to 0 — suffix(from:) keeps original indices
            for frame in frames where frame.type == .json {
                if let obj = try? JSONSerialization.jsonObject(with: frame.payload) as? [String: Any] {
                    DispatchQueue.main.async { self.onJSON?(obj) }
                }
            }
        }
    }

    func sendJSON(_ object: [String: Any]) {
        guard fd >= 0, let data = SocketProtocol.frameJSON(object) else { return }
        _ = data.withUnsafeBytes { Darwin.write(fd, $0.baseAddress!, data.count) }
    }

    func sendPCM(_ samples: Data) {
        guard fd >= 0 else { return }
        let frame = SocketProtocol.framePCM(samples)
        _ = frame.withUnsafeBytes { Darwin.write(fd, $0.baseAddress!, frame.count) }
    }
}

// ─── CGEventTap for Fn key (push-to-talk) ────────────────────────────────────
// Intercepts Fn at HID level before the emoji picker.
// Requires Input Monitoring permission.

extension Notification.Name {
    static let fnDown = Notification.Name("VoxlitFnDown")
    static let fnUp   = Notification.Name("VoxlitFnUp")
}

// Wrapper so we can pass state through the C callback userInfo pointer
final class FnState {
    var isDown = false
}

func installFnKeyTap(client: SocketClient) {
    let state = FnState()
    let statePtr = Unmanaged.passRetained(state).toOpaque()

    let mask = CGEventMask(1 << CGEventType.flagsChanged.rawValue)

    guard let tap = CGEvent.tapCreate(
        tap: .cghidEventTap,
        place: .headInsertEventTap,
        options: .defaultTap,
        eventsOfInterest: mask,
        callback: { _, type, event, userInfo -> Unmanaged<CGEvent>? in
            guard type == .flagsChanged, let userInfo else {
                return Unmanaged.passRetained(event)
            }
            let s = Unmanaged<FnState>.fromOpaque(userInfo).takeUnretainedValue()
            let fnDown = event.flags.contains(.maskSecondaryFn)

            if fnDown && !s.isDown {
                s.isDown = true
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: .fnDown, object: nil)
                }
                return nil  // consume — suppresses emoji picker
            } else if !fnDown && s.isDown {
                s.isDown = false
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: .fnUp, object: nil)
                }
                return nil
            }
            return Unmanaged.passRetained(event)
        },
        userInfo: statePtr
    ) else {
        print("[FnTap] Failed — grant Input Monitoring in System Settings → Privacy & Security")
        return
    }

    let src = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
    CFRunLoopAddSource(CFRunLoopGetMain(), src, .commonModes)
    CGEvent.tapEnable(tap: tap, enable: true)

    // Forward Fn press/release to Electron
    NotificationCenter.default.addObserver(forName: .fnDown, object: nil, queue: .main) { _ in
        // Capture focused app NOW before anything changes focus
        TextInjector.captureFocusedApp()
        client.sendJSON(["type": "hotkey", "action": "start"])
    }
    NotificationCenter.default.addObserver(forName: .fnUp, object: nil, queue: .main) { _ in
        client.sendJSON(["type": "hotkey", "action": "stop"])
    }

    print("[FnTap] Installed — Fn = push-to-talk")
}

// ─── Entry point ─────────────────────────────────────────────────────────────

let client = SocketClient()
let hotkeyManager = HotkeyManager(socket: client)
let audioEngine = AudioEngine(socket: client)

client.onJSON = { msg in
    guard let type = msg["type"] as? String else { return }
    if type == "inject", let text = msg["text"] as? String {
        TextInjector.inject(text)
    }
}

// Connect to Electron's socket server with retry
var connected = false
for i in 1...20 {
    if client.connect() { connected = true; break }
    print("[VoxlitHelper] Waiting for socket... (\(i)/20)")
    Thread.sleep(forTimeInterval: 0.25)
}
guard connected else { print("[VoxlitHelper] Could not connect — exiting"); exit(1) }

installFnKeyTap(client: client)
// Note: Carbon hotkey disabled — Fn is the only trigger (push-to-talk via CGEventTap)

do {
    try audioEngine.start()
} catch {
    print("[AudioEngine] Failed: \(error)")
}

print("[VoxlitHelper] Running.")
RunLoop.main.run()
