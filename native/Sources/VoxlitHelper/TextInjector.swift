import Foundation
import ApplicationServices
import AppKit

/// Universal text injection: clipboard + activate target + Cmd+V.
///
/// Why this works everywhere:
/// - macOS treats a Cmd+V from the system event tap identically to a real
///   keypress — every app that supports paste honors it
/// - Terminals (iTerm, Terminal, Warp, Alacritty) write paste directly to PTY
/// - Native apps trigger their Edit > Paste menu item
/// - Web apps and Electron apps fire their JavaScript paste handler
/// - The previous Unicode-keystroke approach failed in terminals because they
///   read raw keycodes from input stream, ignoring Unicode-payload events
///
/// Trade-off: target app briefly comes to front (visible to user). This is
/// the same behavior as Glaido and other production dictation tools.
struct TextInjector {

    /// Captured at Fn press time — before our helper process takes any focus
    static var targetApp: NSRunningApplication?

    /// Call this when Fn is pressed to snapshot the frontmost app.
    /// Must be called BEFORE any window activation changes focus.
    static func captureFocusedApp() {
        targetApp = NSWorkspace.shared.frontmostApplication
    }

    static func inject(_ text: String) {
        guard !text.isEmpty else { return }

        let pasteboard = NSPasteboard.general
        let previous = pasteboard.string(forType: .string)

        // Write text to clipboard
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        // Bring the target app to the front so Cmd+V is interpreted by IT.
        // Without activation, the system event tap delivers Cmd+V to whatever
        // is currently frontmost (could be Voxlit itself, the menu bar, etc.).
        let pid = targetApp?.processIdentifier
        if let app = targetApp {
            app.activate(options: .activateIgnoringOtherApps)
        }

        // Wait until the target app actually becomes frontmost — necessary
        // because activation is async. Cap at 500ms; if it never happens,
        // try the paste anyway (best effort).
        if let pid = pid {
            let deadline = Date().addingTimeInterval(0.5)
            while Date() < deadline {
                if NSWorkspace.shared.frontmostApplication?.processIdentifier == pid {
                    break
                }
                Thread.sleep(forTimeInterval: 0.015)
            }
        }

        // Brief settle delay so the app's event loop is ready to process Cmd+V
        // and the pasteboard write has propagated.
        Thread.sleep(forTimeInterval: 0.05)

        sendCmdV()

        // Restore the user's previous clipboard contents after the paste has
        // been consumed (most apps read clipboard within ~200ms of paste).
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            pasteboard.clearContents()
            if let prev = previous {
                pasteboard.setString(prev, forType: .string)
            }
        }
    }

    /// Send Cmd+V via the system HID event tap. This goes through the same
    /// pathway as a real keypress and works for every app that maps Cmd+V to paste.
    private static func sendCmdV() {
        guard let source = CGEventSource(stateID: .hidSystemState) else { return }
        let vKey = CGKeyCode(0x09)   // V

        let down = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true)
        down?.flags = .maskCommand
        down?.post(tap: .cghidEventTap)

        let up = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false)
        up?.flags = .maskCommand
        up?.post(tap: .cghidEventTap)
    }
}
