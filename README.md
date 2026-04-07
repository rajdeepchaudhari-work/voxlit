<p align="center">
  <img src="resources/icons/logo.png" width="96" height="96" alt="Voxlit" style="border-radius: 22px" />
</p>

<h1 align="center">Voxlit</h1>

<p align="center">
  <strong>Privacy-first, offline voice dictation for macOS.</strong><br/>
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

<br/>

<p align="center">
  <img width="1012" height="762" alt="2026-04-07_1-51-26 am" src="https://github.com/user-attachments/assets/c5307040-22f6-4069-99ae-a1146bec3c03" />

</p>

---

## Features

- **100% offline by default** — Whisper runs locally, nothing leaves your Mac
- **Works in any app** — text is injected via Accessibility API, no clipboard required
- **Cloud mode (opt-in)** — OpenAI Whisper API for faster, more accurate transcription
- **Minimal UI** — floating status pill shows only when you're speaking
- **History panel** — full searchable transcript history stored in SQLite
- **Customisable hotkey** — Fn, ⌥ Space, ⌃ Space, ⌘⇧D, or ⌃⇧F
- **macOS native helper** — separate signed Swift process handles mic access and text injection
- **Fast** — silence trimming + greedy decoding keeps local latency low

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

1. **Launch Voxlit** — the onboarding wizard walks you through mic and accessibility permissions.
2. **Choose your engine** — Local (offline, no API key) or Cloud (OpenAI Whisper API key).
3. **Set your hotkey** — default is `Fn`.
4. **Hold hotkey → speak → release** — your words appear in whatever app is focused.

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
```

- **Audio pipeline:** AVAudioEngine (16 kHz mono float32 PCM) → Unix socket → VAD worker → Whisper
- **Local transcription:** `whisper-cli` subprocess with Metal GPU acceleration
- **Cloud transcription:** direct HTTPS to `api.openai.com` from main process (renderer has no internet)
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
| Engine | `local` | `local` or `cloud` |
| Local model | `ggml-small.en` | Whisper model to use |
| VAD sensitivity | `0.5` | Voice activity detection threshold |

---

## Privacy

- **Local mode:** audio never leaves your device. No telemetry, no analytics.
- **Cloud mode:** audio is sent to OpenAI's Whisper API using your own API key. Voxlit never stores or proxies your key — it's encrypted on disk via electron-store.
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
