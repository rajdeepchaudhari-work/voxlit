import Foundation
import Carbon

/// Registers a global hotkey via Carbon and forwards hotkey events to the socket.
/// Default: Option+Space (kVK_Space + optionKey)
class HotkeyManager {
    private var hotKeyRef: EventHotKeyRef?
    private weak var socket: SocketWriter?

    init(socket: SocketWriter) {
        self.socket = socket
    }

    func register(keyCode: UInt32 = UInt32(kVK_Space), modifiers: UInt32 = UInt32(optionKey)) {
        var hotKeyID = EventHotKeyID()
        hotKeyID.signature = OSType(0x564F584C)  // 'VOXL'
        hotKeyID.id = 1

        var eventSpec = EventTypeSpec(eventClass: OSType(kEventClassKeyboard),
                                      eventKind: UInt32(kEventHotKeyPressed))

        let selfPtr = Unmanaged.passRetained(self).toOpaque()
        InstallEventHandler(
            GetApplicationEventTarget(),
            { _, event, userData -> OSStatus in
                guard let userData else { return noErr }
                let mgr = Unmanaged<HotkeyManager>.fromOpaque(userData).takeUnretainedValue()
                mgr.onHotkeyPressed()
                return noErr
            },
            1,
            &eventSpec,
            selfPtr,
            nil
        )

        RegisterEventHotKey(keyCode, modifiers, hotKeyID, GetApplicationEventTarget(), 0, &hotKeyRef)
        print("[HotkeyManager] Registered hotkey: keyCode=\(keyCode) modifiers=\(modifiers)")
    }

    func unregister() {
        if let ref = hotKeyRef {
            UnregisterEventHotKey(ref)
            hotKeyRef = nil
        }
    }

    private func onHotkeyPressed() {
        socket?.sendJSON(["type": "hotkey", "action": "toggle", "timestamp": Date().timeIntervalSince1970])
    }
}

protocol SocketWriter: AnyObject {
    func sendJSON(_ object: [String: Any])
    func sendPCM(_ data: Data)
}
