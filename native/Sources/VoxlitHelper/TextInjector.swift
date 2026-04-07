import Foundation
import ApplicationServices
import AppKit

/// Injects text into the previously focused application using a two-tier strategy:
///
/// Tier 1 — AX direct inject: sets kAXSelectedTextAttribute on the captured focused
///   element. Instant, no clipboard side-effects. Works for AppKit text fields / NSTextView.
///
/// Tier 2 — Unicode keystroke simulation: sends each character as a CGEvent with
///   keyboardSetUnicodeString posted directly to the target PID. Works universally —
///   Terminal, VS Code, Electron, Chrome, web apps. Does NOT require the app to be
///   frontmost; postToPid delivers events straight to the process queue.
struct TextInjector {

    /// Captured at Fn press time — before our helper process takes any focus
    static var targetApp: NSRunningApplication?

    /// AX element that was focused in the target app at hotkey-press time.
    private static var capturedElement: AXUIElement?

    /// Call this when Fn is pressed to snapshot the frontmost app and its focused element.
    /// Must be called BEFORE any window activation changes focus.
    static func captureFocusedApp() {
        targetApp = NSWorkspace.shared.frontmostApplication

        let systemWide = AXUIElementCreateSystemWide()
        var ref: AnyObject?
        if AXUIElementCopyAttributeValue(systemWide, kAXFocusedUIElementAttribute as CFString, &ref) == .success,
           let ref = ref {
            capturedElement = (ref as! AXUIElement)
        } else {
            capturedElement = nil
        }
    }

    static func inject(_ text: String) {
        // Tier 1 — AX direct inject (fast, no clipboard side-effects)
        if let element = capturedElement {
            let result = AXUIElementSetAttributeValue(
                element,
                kAXSelectedTextAttribute as CFString,
                text as CFTypeRef
            )
            if result == .success {
                return
            }
        }

        // Tier 2 — Unicode keystroke simulation via postToPid
        // Each UTF-16 code unit is sent as a CGEvent directly to the target process.
        // postToPid bypasses the frontmost-app requirement — no activation needed.
        let pid = targetApp?.processIdentifier
        sendKeystrokes(text, to: pid)
    }

    // MARK: - Private

    private static func sendKeystrokes(_ text: String, to pid: pid_t?) {
        guard let source = CGEventSource(stateID: .hidSystemState) else { return }

        // Use UTF-16 code units — CGEvent.keyboardSetUnicodeString expects UniChar (UInt16)
        let units = Array(text.utf16)

        for var unit in units {
            let keyDown = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: true)
            let keyUp   = CGEvent(keyboardEventSource: source, virtualKey: 0, keyDown: false)

            keyDown?.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unit)
            keyUp?.keyboardSetUnicodeString(stringLength: 1, unicodeString: &unit)

            if let pid = pid {
                keyDown?.postToPid(pid)
                keyUp?.postToPid(pid)
            } else {
                keyDown?.post(tap: .cghidEventTap)
                keyUp?.post(tap: .cghidEventTap)
            }

            // Tiny delay so the target app's event queue doesn't get flooded.
            // 1ms per char = 100 chars in 100ms — imperceptible to the user.
            usleep(1_000)
        }
    }
}
