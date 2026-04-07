import Foundation
import ApplicationServices
import AppKit

/// Injects text into the previously focused application.
/// The focused app must be captured at hotkey-press time (before recording starts),
/// then re-activated before injection — exactly what Glaido does via FocusedAppService.
struct TextInjector {

    /// Captured at Fn press time — before our helper process takes any focus
    static var targetApp: NSRunningApplication?

    /// Call this when Fn is pressed to snapshot the current frontmost app
    static func captureFocusedApp() {
        targetApp = NSWorkspace.shared.frontmostApplication
    }

    static func inject(_ text: String) {
        guard let app = targetApp else {
            pasteboardFallback(text)
            return
        }

        // Set clipboard immediately
        let pasteboard = NSPasteboard.general
        let previous = pasteboard.string(forType: .string)
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        // Activate the target app
        app.activate(options: .activateIgnoringOtherApps)

        // Poll until it's actually frontmost, then send Cmd+V
        let pid = app.processIdentifier
        var attempts = 0
        func trySend() {
            attempts += 1
            let frontmost = NSWorkspace.shared.frontmostApplication?.processIdentifier
            if frontmost == pid || attempts >= 10 {
                simulatePaste(to: pid)
                // Restore clipboard after 500ms
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    pasteboard.clearContents()
                    if let prev = previous { pasteboard.setString(prev, forType: .string) }
                }
            } else {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { trySend() }
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { trySend() }
    }

    // MARK: - AXUIElement insert at cursor

    private static func tryAXInsert(_ text: String) -> Bool {
        let systemWide = AXUIElementCreateSystemWide()
        var focusedElement: AnyObject?
        guard AXUIElementCopyAttributeValue(systemWide, kAXFocusedUIElementAttribute as CFString, &focusedElement) == .success,
              let element = focusedElement else { return false }

        let axElement = element as! AXUIElement
        return AXUIElementSetAttributeValue(axElement, kAXSelectedTextAttribute as CFString, text as CFTypeRef) == .success
    }

    // MARK: - Pasteboard fallback

    private static func pasteboardFallback(_ text: String) {
        let pasteboard = NSPasteboard.general
        let previous = pasteboard.string(forType: .string)

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        // Small delay for clipboard to settle
        Thread.sleep(forTimeInterval: 0.05)
        simulatePaste(to: targetApp?.processIdentifier)

        // Restore clipboard after 500ms
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            pasteboard.clearContents()
            if let prev = previous {
                pasteboard.setString(prev, forType: .string)
            }
        }
    }

    private static func simulatePaste(to pid: pid_t?) {
        let source = CGEventSource(stateID: .hidSystemState)

        let keyDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(0x09), keyDown: true)
        keyDown?.flags = .maskCommand

        let keyUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(0x09), keyDown: false)
        keyUp?.flags = .maskCommand

        if let pid = pid {
            // Send directly to target process — works even if focus hasn't fully switched
            keyDown?.postToPid(pid)
            keyUp?.postToPid(pid)
        } else {
            keyDown?.post(tap: .cghidEventTap)
            keyUp?.post(tap: .cghidEventTap)
        }
    }
}
