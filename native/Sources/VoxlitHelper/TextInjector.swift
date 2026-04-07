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

        // Use longer delay for apps that are slow to accept focus (Terminal, Notes)
        let bundleId = app.bundleIdentifier ?? ""
        let delay: Double = (bundleId == "com.apple.Terminal" || bundleId == "com.apple.Notes") ? 0.35 : 0.15

        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            if !tryAXInsert(text) {
                pasteboardFallback(text)
            }
        }
    }

    // MARK: - AXUIElement insert at cursor

    private static func tryAXInsert(_ text: String) -> Bool {
        let systemWide = AXUIElementCreateSystemWide()
        var focusedElement: AnyObject?
        guard AXUIElementCopyAttributeValue(systemWide, kAXFocusedUIElementAttribute as CFString, &focusedElement) == .success,
              let element = focusedElement else { return false }

        let axElement = element as! AXUIElement

        // Try 1: Replace selected text (works in most apps)
        if AXUIElementSetAttributeValue(axElement, kAXSelectedTextAttribute as CFString, text as CFTypeRef) == .success {
            return true
        }

        // Try 2: Insert via selected text range (works in Terminal, some text editors)
        var rangeValue: AnyObject?
        if AXUIElementCopyAttributeValue(axElement, kAXSelectedTextRangeAttribute as CFString, &rangeValue) == .success,
           let range = rangeValue {
            var currentValue: AnyObject?
            if AXUIElementCopyAttributeValue(axElement, kAXValueAttribute as CFString, &currentValue) == .success,
               let current = currentValue as? String {
                // Get the range as CFRange
                var cfRange = CFRange()
                guard AXValueGetValue(range as! AXValue, .cfRange, &cfRange) else { return false }
                var newString = current
                let start = current.index(current.startIndex, offsetBy: min(cfRange.location, current.count))
                let end = current.index(start, offsetBy: min(cfRange.length, current.count - cfRange.location))
                newString.replaceSubrange(start..<end, with: text)
                if AXUIElementSetAttributeValue(axElement, kAXValueAttribute as CFString, newString as CFTypeRef) == .success {
                    return true
                }
            }
        }

        return false
    }

    // MARK: - Pasteboard fallback

    private static func pasteboardFallback(_ text: String) {
        let pasteboard = NSPasteboard.general
        let previous = pasteboard.string(forType: .string)

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        Thread.sleep(forTimeInterval: 0.05)
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
