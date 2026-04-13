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

        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)

        // Activate target app — Cmd+V needs to land in the target's window
        let pid = targetApp?.processIdentifier
        if let app = targetApp {
            app.activate(options: .activateIgnoringOtherApps)
        }

        // Wait until target is actually frontmost (activation is async)
        if let pid = pid {
            let deadline = Date().addingTimeInterval(0.5)
            while Date() < deadline {
                if NSWorkspace.shared.frontmostApplication?.processIdentifier == pid { break }
                Thread.sleep(forTimeInterval: 0.015)
            }
        }
        Thread.sleep(forTimeInterval: 0.05)   // settle delay

        sendCmdV()

        // Restore clipboard after paste has been consumed
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            pasteboard.clearContents()
            if let prev = previous {
                pasteboard.setString(prev, forType: .string)
            }
        }
    }

    /// Send Cmd+V via AppleScript (System Events). This is the most universal
    /// path because System Events is a trusted system process whose synthetic
    /// keystrokes are honored by every app — including iTerm, Ghostty, and
    /// other terminals that filter raw CGEvents originating from third-party apps.
    ///
    /// First time this runs the user will see a TCC prompt:
    /// "Voxlit wants to control System Events". Granting it once is permanent.
    private static func sendCmdV() {
        let script = """
        tell application "System Events" to keystroke "v" using command down
        """
        var error: NSDictionary?
        NSAppleScript(source: script)?.executeAndReturnError(&error)

        if let e = error {
            print("[TextInjector] AppleScript paste failed: \(e). Falling back to CGEvent.")
            sendCmdVViaCGEvent()
        }
    }

    private static func sendCmdVViaCGEvent() {
        guard let source = CGEventSource(stateID: .hidSystemState) else { return }
        let vKey = CGKeyCode(0x09)   // V

        let down = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: true)
        down?.flags = .maskCommand
        let up = CGEvent(keyboardEventSource: source, virtualKey: vKey, keyDown: false)
        up?.flags = .maskCommand

        // Annotated session tap is higher-level than HID — better odds with
        // apps that filter low-level synthetic events.
        down?.post(tap: .cgAnnotatedSessionEventTap)
        up?.post(tap: .cgAnnotatedSessionEventTap)
    }
}
