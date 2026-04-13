import Foundation
import ApplicationServices
import AppKit

/// Injects text into the previously focused application using a tiered strategy:
///
/// Tier 1 — AX direct inject: sets kAXSelectedTextAttribute on the captured focused
///   element. Instant, no clipboard side-effects. Works for AppKit text fields / NSTextView.
///
/// Tier 2a — Clipboard + Cmd+V (terminals): terminal emulators read raw keycodes
///   from the input stream and ignore Unicode-payload CGEvents. They do honor
///   Cmd+V which writes directly to the PTY. Used for iTerm, Terminal.app, Warp,
///   Alacritty, kitty, WezTerm, Hyper.
///
/// Tier 2b — Unicode keystroke simulation: sends each UTF-16 code unit as a
///   CGEvent with keyboardSetUnicodeString posted directly to the target PID.
///   Used for everything non-terminal — VS Code, Chrome, Slack, native apps.
struct TextInjector {

    /// Captured at Fn press time — before our helper process takes any focus
    static var targetApp: NSRunningApplication?

    /// AX element that was focused in the target app at hotkey-press time.
    private static var capturedElement: AXUIElement?

    /// Bundle IDs of terminal emulators that need clipboard+paste injection
    /// because they don't honor Unicode keystroke events.
    private static let terminalBundleIDs: Set<String> = [
        "com.apple.Terminal",
        "com.googlecode.iterm2",
        "io.alacritty",
        "dev.warp.Warp-Stable",
        "co.zeit.hyper",
        "net.kovidgoyal.kitty",
        "com.github.wez.wezterm",
        "com.tabby.app",
    ]

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
        let pid = targetApp?.processIdentifier
        let bundleID = targetApp?.bundleIdentifier ?? ""
        let isTerminal = terminalBundleIDs.contains(bundleID)

        // Tier 1 — AX direct inject (skip for terminals; their AX is unreliable)
        if !isTerminal, let element = capturedElement {
            let result = AXUIElementSetAttributeValue(
                element,
                kAXSelectedTextAttribute as CFString,
                text as CFTypeRef
            )
            if result == .success {
                return
            }
        }

        // Tier 2 — choose injection strategy based on app type
        if isTerminal {
            // Terminals don't accept Unicode CGEvents — paste via Cmd+V
            injectViaClipboard(text, pid: pid)
        } else {
            sendKeystrokes(text, to: pid)
        }
    }

    // MARK: - Private

    /// Clipboard + Cmd+V via postToPid. Used for terminals (iTerm, Terminal,
    /// Warp, Alacritty, etc.) that don't honor Unicode keystroke events.
    private static func injectViaClipboard(_ text: String, pid: pid_t?) {
        let pasteboard = NSPasteboard.general
        let previous = pasteboard.string(forType: .string)

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        // Let pasteboard change propagate before sending Cmd+V — apps read
        // the pasteboard asynchronously and may miss the change otherwise.
        Thread.sleep(forTimeInterval: 0.05)

        guard let source = CGEventSource(stateID: .hidSystemState) else { return }
        let vKey = CGKeyCode(0x09)   // V key

        let keyDown = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true)
        keyDown?.flags = .maskCommand
        let keyUp = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false)
        keyUp?.flags = .maskCommand

        if let pid = pid {
            keyDown?.postToPid(pid)
            keyUp?.postToPid(pid)
        } else {
            keyDown?.post(tap: .cghidEventTap)
            keyUp?.post(tap: .cghidEventTap)
        }

        // Restore previous clipboard contents after the paste completes.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            pasteboard.clearContents()
            if let prev = previous {
                pasteboard.setString(prev, forType: .string)
            }
        }
    }

    /// Unicode keystroke simulation. Used for most apps (VS Code, Chrome, Slack,
    /// native macOS apps). Sends each UTF-16 code unit as a CGEvent directly to
    /// the target process. Doesn't pollute the clipboard.
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
