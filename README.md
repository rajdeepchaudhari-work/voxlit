<p align="center">
  <img src="resources/icons/logo.png" width="96" height="96" alt="Voxlit" style="border-radius: 22px" />
</p>

<h1 align="center">Voxlit</h1>

<p align="center">
  <strong>Voice dictation + AI agent for macOS.</strong><br/>
  Hold a key. Talk. The words land in whatever app you're in.<br/>
  Say "Hey Voxlit" and the AI executes your intent.
</p>

<p align="center">
  <a href="https://voxlit.co"><strong>voxlit.co</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases/latest"><strong>Download</strong></a> &nbsp;·&nbsp;
  <a href="#voxlit-agent">Agent</a> &nbsp;·&nbsp;
  <a href="#install">Install</a> &nbsp;·&nbsp;
  <a href="#under-the-hood">Architecture</a>
</p>

<p align="center">
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases/latest">
    <img src="https://img.shields.io/github/v/release/rajdeepchaudhari-work/voxlit?style=flat-square&color=7C3AED&label=release" alt="Latest Release" />
  </a>
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases">
    <img src="https://img.shields.io/github/downloads/rajdeepchaudhari-work/voxlit/total?style=flat-square&color=7C3AED&label=downloads" alt="Total Downloads" />
  </a>
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/stargazers">
    <img src="https://img.shields.io/github/stars/rajdeepchaudhari-work/voxlit?style=flat-square&color=22D3EE&label=stars" alt="Stars" />
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%2013%2B-black?style=flat-square" alt="macOS 13+" />
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/rajdeepchaudhari-work/voxlit?style=flat-square&color=22D3EE" alt="MIT License" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/rajdeepchaudhari-work/voxlit/ci.yml?style=flat-square&label=build&color=00C853" alt="Build" />
  </a>
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/actions/workflows/codeql.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/rajdeepchaudhari-work/voxlit/codeql.yml?style=flat-square&label=CodeQL&color=00C853" alt="CodeQL" />
  </a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/rajdeepchaudhari-work/voxlit">
    <img src="https://api.securityscorecards.dev/projects/github.com/rajdeepchaudhari-work/voxlit/badge" alt="OpenSSF Scorecard" />
  </a>
</p>

<br/>

<p align="center">
  <img width="1012" alt="Voxlit main window" src="https://github.com/user-attachments/assets/c5307040-22f6-4069-99ae-a1146bec3c03" />
  <br/><br/>
  <img width="320" alt="Voxlit floating status pill" src="https://github.com/user-attachments/assets/0b878834-f37c-48f8-8963-4e9184840c75" />
</p>

---

## What Voxlit does

Press `Fn`. Talk. A floating pill listens. Release. Text appears in Slack, VS Code, Terminal, Mail — wherever your cursor was. No window switching, no paste.

**Voxlit Cloud** is the default engine — accurate, punctuated, zero setup. Free during beta.

**Local mode** runs whisper.cpp on your Mac. Fully offline. Audio never leaves the machine.

---

## Voxlit Agent

Say **"Hey Voxlit"** before any command and the AI executes your intent — not just transcription.

```
🎙 "Hey Voxlit, write an email declining this meeting politely"
→ Pastes a ready-to-send decline email into your Mail draft

🎙 "Hey Voxlit, optimize this prompt: build a REST API for user profiles"
→ Pastes a structured prompt with requirements, acceptance criteria, scope

🎙 "Hey Voxlit, fix the grammar in: me and him went to store yesterday"
→ Pastes: "He and I went to the store yesterday."

🎙 "Hey Voxlit, write a commit message for adding dark mode support"
→ Pastes: "feat: add dark mode support with system preference detection"

🎙 "Hey Voxlit, summarize this meeting notes"
→ Pastes concise bullet points

🎙 "Hey Voxlit, translate this to Spanish: the meeting is at 3pm"
→ Pastes: "La reunión es a las 3 de la tarde."
```

Works with emails, code, writing, translations, bug reports, proposals, todo lists, and more. Powered by Voxlit Cloud.

---

## Install

**Homebrew** (recommended)

```bash
brew tap rajdeepchaudhari-work/voxlit
brew install --cask voxlit
```

**Direct download** — grab the DMG from [Releases](https://github.com/rajdeepchaudhari-work/voxlit/releases/latest).

> **First launch on macOS:** The app is open-source and adhoc-signed. macOS will show "cannot verify developer." Right-click the app → Open → click Open. You only need to do this once.

### Permissions

On first launch, grant these when prompted:

| Permission | Why |
|---|---|
| Microphone | Captures your speech |
| Accessibility | Injects text into the focused app |
| Automation (System Events) | Sends Cmd+V paste keystroke |

---

## Under the hood

Three processes cooperating over a Unix socket:

```
┌──────────────────────────────────────────────────┐
│  Swift helper          (signed, own process)     │
│  HotkeyManager · AudioEngine · TextInjector      │
│          │ Unix socket (/tmp/voxlit.socket)       │
├──────────────────────────────────────────────────┤
│  Electron main process                           │
│  SocketManager · TranscriptManager · VoxlitAgent │
│          │ contextBridge IPC                      │
├──────────────────────────────────────────────────┤
│  React renderer                                  │
│  StatusPill · History · Settings · Onboarding    │
└──────────────────────────────────────────────────┘
```

- **Audio:** 16 kHz mono float32 PCM over Unix socket. Silence-trimmed before transcription.
- **Local engine:** shells out to `whisper-cli` with Metal GPU acceleration.
- **Voxlit Cloud:** HTTPS from main process only — renderer has no network access by design.
- **Agent:** detects "Hey Voxlit" trigger → routes command to GPT-4o-mini → injects result.
- **History:** SQLite via better-sqlite3 + Drizzle ORM in `~/Library/Application Support/Voxlit/`.

Architecture details in [`CLAUDE.md`](CLAUDE.md).

---

## Build from source

Requires macOS 13+, Node 22+, Xcode CLT.

```bash
git clone https://github.com/rajdeepchaudhari-work/voxlit.git
cd voxlit
npm install
./scripts/build-native.sh       # Swift helper
./scripts/build-whisper.sh      # whisper.cpp binaries (local mode only)
npm run dev                     # start with HMR
npm run build:mac               # production DMG
```

| Command | What |
|---|---|
| `npm run dev` | Electron + Vite HMR |
| `npm run build:mac` | Production DMG |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Cannot verify developer" | Right-click → Open, or: `xattr -d com.apple.quarantine /Applications/Voxlit.app` |
| Hotkey does nothing | Menu bar → Health → Auto-fix |
| No audio after sleep/wake | Fixed in v2.0. Update. |
| Local mode fails | Download a model in Settings → Transcription first |

Still stuck? [Open an issue](https://github.com/rajdeepchaudhari-work/voxlit/issues/new) with Health popover → Copy diagnostics.

---

## Contributing

PRs welcome. For non-trivial changes, open an issue first.

```bash
git checkout -b feat/your-thing
npm run lint && npm run typecheck && npm run test
```

Conventional commits (`feat:`, `fix:`, `chore:`). TypeScript strict. UI follows [`BRAND_IDENTITY.md`](BRAND_IDENTITY.md).

---

## Acknowledgements

MIT licensed ([`LICENSE`](LICENSE)). Built on:

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) by Georgi Gerganov
- [Electron](https://www.electronjs.org) · [React](https://react.dev) · [Vite](https://vitejs.dev)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [Drizzle ORM](https://orm.drizzle.team)

<br/>

<p align="center">
  © 2026 <a href="https://eagerhq.com">Eager HQ</a> &nbsp;·&nbsp; Maintained by Rajdeep Chaudhari &nbsp;·&nbsp; <a href="https://voxlit.co">voxlit.co</a>
</p>
