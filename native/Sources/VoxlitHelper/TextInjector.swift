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

        // Re-activate the target app so it's frontmost before we inject
        app.activate(options: .activateIgnoringOtherApps)

        let bundleId = app.bundleIdentifier ?? ""

        // Apps where AX works reliably — use it to avoid clipboard side effects
        let axApps: Set<String> = [
            "com.apple.TextEdit",
            "com.google.Chrome",
            "com.apple.Safari",
        ]

        let delay: Double = 0.2

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            if axApps.contains(bundleId) && tryAXInsert(text) {
                return
            }
            // All other apps: use pasteboard + Cmd+V (works universally)
            pasteboardFallback(text)
        }
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

        Thread.sleep(forTimeInterval: 0.1)
        simulatePaste()

        // Restore clipboard after 300ms (matches Glaido's approach)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            pasteboard.clearContents()
            if let prev = previous {
                pasteboard.setString(prev, forType: .string)
            }
        }
    }

    private static func simulatePaste() {
        let source = CGEventSource(stateID: .hidSystemState)
        let keyDown = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(0x09), keyDown: true)
        keyDown?.flags = .maskCommand
        keyDown?.post(tap: .cghidEventTap)

        let keyUp = CGEvent(keyboardEventSource: source, virtualKey: CGKeyCode(0x09), keyDown: false)
        keyUp?.flags = .maskCommand
        keyUp?.post(tap: .cghidEventTap)
    }
}
