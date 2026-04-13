<p align="center">
  <img src="resources/icons/logo.png" width="96" height="96" alt="Voxlit" style="border-radius: 22px" />
</p>

<h1 align="center">Voxlit</h1>

<p align="center">
  <strong>Voice dictation for macOS. Open source. Three engines. Zero lock-in.</strong><br/>
  Press a hotkey → speak → text appears in any app.
</p>

<p align="center">
  <a href="https://voxlit.co"><strong>voxlit.co</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases/latest">Download</a>
</p>

<p align="center">
  <a href="https://voxlit.co">
    <img src="https://img.shields.io/badge/website-voxlit.co-7C3AED?style=flat-square" alt="Website" />
  </a>
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases/latest">
    <img src="https://img.shields.io/github/v/release/rajdeepchaudhari-work/voxlit?style=flat-square&color=7C3AED&label=Download" alt="Latest Release" />
  </a>
  <img src="https://img.shields.io/badge/platform-macOS%2013%2B-black?style=flat-square" alt="macOS 13+" />
  <img src="https://img.shields.io/badge/arch-Apple%20Silicon-black?style=flat-square" alt="Apple Silicon" />
  <img src="https://img.shields.io/github/license/rajdeepchaudhari-work/voxlit?style=flat-square&color=22D3EE" alt="MIT License" />
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
  <a href="SECURITY.md">
    <img src="https://img.shields.io/badge/security-policy-665DF5?style=flat-square" alt="Security Policy" />
  </a>
</p>

<br/>

<p align="center">
  <img width="1012" height="762" alt="2026-04-07_1-51-26 am" src="https://github.com/user-attachments/assets/c5307040-22f6-4069-99ae-a1146bec3c03" />
<img width="320" height="72" alt="2026-04-07_2-40-23 am" src="https://github.com/user-attachments/assets/0b878834-f37c-48f8-8963-4e9184840c75" />

</p>

---

## Features

- **Three transcription engines** — pick the one that fits your use case:
  - **Voxlit Cloud** (recommended default) — our hosted endpoint at `api.voxlit.co`. Whisper under the hood, dictation-tuned, no API key needed
  - **Local (offline)** — whisper.cpp runs 100% on your Mac. No internet, no telemetry, maximum privacy
  - **OpenAI (BYOK)** — use your own OpenAI API key directly
- **Works in every app** — universal paste via System Events: Notion, Slack, VS Code, Mail, Terminal, iTerm, Ghostty, Chrome — anywhere Cmd+V works
- **macOS-native helper** — separate signed Swift process owns mic capture (AVFoundation) and keystroke injection; only component that needs permissions
- **Floating status pill** — shows only while you're speaking; dismisses itself
- **History panel** — searchable local SQLite archive of every transcript
- **Customisable hotkey** — Fn (default), ⌥ Space, ⌃ Space, ⌘⇧D, or ⌃⇧F
- **Input device selection** — route capture through AirPods, a USB mic, or the built-in
- **Open source, top to bottom** — the Electron app, the Swift helper, **and the cloud server** (`server/`) are all MIT licensed. Self-host the server anytime.

---

## Download

### Direct

Download the latest **DMG** from [Releases](https://github.com/rajdeepchaudhari-work/voxlit/releases/latest), open it, and drag Voxlit to Applications.

### Homebrew

```bash
brew tap rajdeepchaudhari-work/voxlit
brew install --cask voxlit
```

---

## Getting Started

1. **Launch Voxlit** — the onboarding wizard walks you through permissions step-by-step.
2. **Choose your engine**:
   - **Voxlit Cloud** — zero-setup, hosted Whisper + dictation-tuned polish (default)
   - **Local** — fully offline; downloads a whisper.cpp model (~500 MB)
   - **OpenAI** — bring your own `sk-…` key, billed pay-as-you-go
3. **Set your hotkey** — default is `Fn`.
4. **Hold hotkey → speak → release** — text is typed into whatever app is focused.

> **Note:** The Swift helper binary must be allowed in **System Settings → Privacy & Security** on first launch.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Swift Helper (signed, separate process)                 │
│  HotkeyManager · AudioEngine · TextInjector             │
│           │ Unix socket (/tmp/voxlit.socket)             │
├─────────────────────────────────────────────────────────┤
│  Electron Main Process                                   │
│  SocketManager · TranscriptManager · SessionStore       │
│           │ contextBridge IPC                            │
├─────────────────────────────────────────────────────────┤
│  React Renderer                                          │
│  StatusPill · HistoryPanel · SettingsPanel · Onboarding │
└─────────────────────────────────────────────────────────┘
                         │ HTTPS (cloud engines only)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Voxlit Server   (server/, FastAPI on api.voxlit.co)    │
│  Whisper transcription + dictation post-processing      │
└─────────────────────────────────────────────────────────┘
```

- **Audio pipeline:** AVAudioEngine (16 kHz mono float32 PCM) → Unix socket → silence trim → transcription
- **Local transcription:** `whisper-cli` subprocess with Metal GPU acceleration
- **Voxlit Cloud:** multipart upload to `api.voxlit.co/v1/transcribe` from main process (renderer has no internet). Server code lives in [`server/`](server/) — fork and self-host with your own OpenAI key.
- **OpenAI BYOK:** direct HTTPS to `api.openai.com` using the user's key
- **Storage:** SQLite via better-sqlite3 + Drizzle ORM

---

## Building from Source

### Prerequisites

- macOS 13+ (Apple Silicon recommended)
- Node.js 20+
- Xcode Command Line Tools
- Python 3 with setuptools (`pip3 install setuptools`)

### Steps

```bash
# 1. Clone
git clone https://github.com/rajdeepchaudhari-work/voxlit.git
cd voxlit

# 2. Install dependencies
npm install

# 3. Build the Swift helper
./scripts/build-native.sh

# 4. Build whisper.cpp binaries
./scripts/build-whisper.sh

# 5. (Local mode only) Download a model
mkdir -p ~/Library/Application\ Support/Voxlit/models
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin \
  -o ~/Library/Application\ Support/Voxlit/models/ggml-base.en.bin

# 6. Run in development
npm run dev

# 7. Build production DMG
npm run build:mac
```

> **macOS 26 (Darwin 25+):** `npm run dev` requires a Developer ID-signed Electron binary due to macOS 26 security restrictions. Build production with `npm run build:mac` instead.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with Vite HMR |
| `npm run build` | Production JS build |
| `npm run build:mac` | Build universal macOS DMG |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check |
| `./scripts/build-native.sh` | Compile Swift helper |
| `./scripts/build-whisper.sh` | Compile whisper.cpp |

---

## Configuration

All settings are stored in `~/Library/Application Support/Voxlit/` and can be changed in the Settings panel.

| Setting | Default | Description |
|---|---|---|
| Hotkey | `Fn` | Push-to-talk trigger |
| Engine | `voxlit` | `voxlit` (hosted cloud), `local` (offline), or `cloud` (OpenAI BYOK) |
| Local model | `ggml-small.en` | Whisper model to use when engine is `local` |
| Mic device | System default | Any CoreAudio input (built-in, AirPods, USB) |
| VAD sensitivity | `0.5` | Voice activity detection threshold |

---

## Privacy

- **Local mode:** audio never leaves your device. No telemetry, no analytics, no server.
- **Voxlit Cloud:** audio is sent over HTTPS to `api.voxlit.co` where it's transcribed by OpenAI Whisper and discarded. No account, no IP logging beyond per-minute rate limits, no retention. Server source is in [`server/`](server/) — audit it, or self-host it with your own OpenAI key.
- **OpenAI BYOK:** audio goes directly to OpenAI's Whisper API using your API key. Voxlit never proxies or stores the key — it's encrypted on disk via electron-store.
- The renderer process has no internet access by design — all network calls go through the auditable main process.

---

## Contributing

PRs are welcome. Please open an issue first for large changes.

```bash
git checkout -b feat/your-feature
# make changes
npm run lint && npm run typecheck
git commit -m "feat: your feature"
git push origin feat/your-feature
# open PR
```

---

## License

MIT — see [LICENSE](LICENSE).

---

<p align="center">
  Built with <a href="https://www.electronjs.org">Electron</a>, <a href="https://vitejs.dev">Vite</a>, <a href="https://react.dev">React</a>, and <a href="https://github.com/ggerganov/whisper.cpp">whisper.cpp</a>.
</p>
