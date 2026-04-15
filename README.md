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
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases/latest"><strong>Download</strong></a> &nbsp;·&nbsp;
  <a href="#getting-started">Getting Started</a> &nbsp;·&nbsp;
  <a href="#architecture">Architecture</a> &nbsp;·&nbsp;
  <a href="SECURITY.md">Security</a>
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
  <img src="https://img.shields.io/badge/arch-Universal-black?style=flat-square" alt="Universal Binary" />
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
  <a href="SECURITY.md">
    <img src="https://img.shields.io/badge/security-policy-665DF5?style=flat-square" alt="Security Policy" />
  </a>
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases">
    <img src="https://img.shields.io/badge/signed-cosign-22D3EE?style=flat-square" alt="Signed with Cosign" />
  </a>
</p>

<br/>

<p align="center">
  <img width="1012" alt="Voxlit main window" src="https://github.com/user-attachments/assets/c5307040-22f6-4069-99ae-a1146bec3c03" />
  <br/>
  <img width="320" alt="Voxlit floating status pill" src="https://github.com/user-attachments/assets/0b878834-f37c-48f8-8963-4e9184840c75" />
</p>

---

## Contents

- [Why Voxlit](#why-voxlit)
- [Features](#features)
- [Install](#install)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Build from Source](#build-from-source)
- [Scripts](#scripts)
- [Configuration](#configuration)
- [Privacy & Security](#privacy--security)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License & Credits](#license--credits)

---

## Why Voxlit

Most macOS dictation tools lock you into one engine, one billing plan, and one company's privacy policy. Voxlit doesn't.

- **Pick your engine, not ours.** Voxlit Cloud for zero-setup convenience, Local for full offline privacy, or OpenAI BYOK for pay-as-you-go.
- **Every component is open source** — the Electron app, the Swift helper, **and the cloud server** ([`server/`](server/)). Audit it, fork it, or self-host it.
- **No account, no telemetry, no analytics.** Not even for the hosted service.
- **macOS-native**, not a web wrapper pretending to be an app. Signed Swift helper, CoreAudio mic capture, AXUIElement text injection.

---

## Features

**Transcription**
- **Three engines, one shortcut** — swap between Voxlit Cloud, Local (offline), or OpenAI BYOK without reinstalling
- **Voxlit Cloud** *(default)* — hosted Whisper at `api.voxlit.co`, dictation-tuned, no API key required
- **Local mode** — whisper.cpp runs 100% on-device with Metal GPU acceleration; no network
- **OpenAI BYOK** — use your own `sk-…` key, direct HTTPS to OpenAI

**Experience**
- **Works in every app** — universal paste via System Events: Notion, Slack, VS Code, Mail, Terminal, iTerm, Ghostty, Chrome — anywhere `⌘V` works
- **Floating status pill** — appears only while you speak, dismisses itself
- **Customisable hotkey** — `Fn` *(default)*, `⌥Space`, `⌃Space`, `⌘⇧D`, or `⌃⇧F`
- **Mic picker** — route capture through AirPods, USB mic, or the built-in
- **Searchable history** — local SQLite archive of every transcript
- **Start/stop chimes** — subtle audio feedback, pre-warmed for zero latency
- **Onboarding wizard** — walks you through permissions step-by-step
- **Health popover** — one-glance status for mic, helper, socket, engine, and updates; auto-fix for common issues
- **About panel** — version, license, links to source and issue tracker

**Reliability**
- **Sleep/wake recovery** — auto-reconnects mic and falls back to the default device after lid-close or display-sleep
- **Signed auto-updater** — notarized Apple-signed releases, verified with Cosign
- **Graceful helper restart** — kills the Swift helper cleanly before updates so you never see a stuck "Restart to update"

---

## Install

### Homebrew *(recommended)*

```bash
brew tap rajdeepchaudhari-work/voxlit
brew install --cask voxlit
```

The tap is auto-updated on every release.

### One-line installer

```bash
curl -fsSL https://voxlit.co/install.sh | bash
```

Downloads the latest DMG, mounts it, and copies `Voxlit.app` to `/Applications`. No `sudo`, no Gatekeeper prompt (files fetched via `curl` aren't quarantined).

### Direct DMG

Download the latest DMG from [**Releases**](https://github.com/rajdeepchaudhari-work/voxlit/releases/latest), open it, and drag Voxlit to Applications.

All downloads are code-signed, notarized by Apple, and Cosign-signed against the GitHub release workflow.

---

## Getting Started

1. **Launch Voxlit** — the onboarding wizard walks you through microphone and accessibility permissions.
2. **Choose your engine**
   - **Voxlit Cloud** — zero-setup, dictation-tuned Whisper *(default)*
   - **Local** — fully offline; downloads a whisper.cpp model (~500 MB)
   - **OpenAI** — paste your `sk-…` key; billed directly by OpenAI
3. **Set your hotkey** — default is `Fn`.
4. **Hold hotkey → speak → release** — text is typed into whichever app is focused.

> On first launch, macOS will ask you to approve the signed Swift helper in **System Settings → Privacy & Security**.

---

## Architecture

Three processes cooperate so dictation can cross the sandbox:

```
┌─────────────────────────────────────────────────────────┐
│  Swift Native Helper     (signed, separate process)     │
│  HotkeyManager · AudioEngine · TextInjector             │
│           │ Unix socket (/tmp/voxlit.socket)            │
├─────────────────────────────────────────────────────────┤
│  Electron Main Process                                  │
│  SocketManager · TranscriptManager · SessionStore       │
│           │ contextBridge IPC                           │
├─────────────────────────────────────────────────────────┤
│  React Renderer                                         │
│  StatusPill · HistoryPanel · SettingsPanel · Onboarding │
└─────────────────────────────────────────────────────────┘
                         │ HTTPS (cloud engines only)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Voxlit Server   (server/, FastAPI on api.voxlit.co)    │
│  Whisper transcription + dictation post-processing      │
└─────────────────────────────────────────────────────────┘
```

- **Audio pipeline** — AVAudioEngine (16 kHz mono float32 PCM) → Unix socket → VAD trim → transcription
- **Local transcription** — `whisper-cli` subprocess with Metal GPU acceleration
- **Voxlit Cloud** — multipart upload to `api.voxlit.co/v1/transcribe` from the main process (renderer has no network). Server code lives in [`server/`](server/) — fork and self-host with your own OpenAI key
- **OpenAI BYOK** — direct HTTPS to `api.openai.com` using the user's key (encrypted on disk via `electron-store`)
- **Storage** — SQLite via `better-sqlite3` + Drizzle ORM

For deeper notes on each process, see [`CLAUDE.md`](CLAUDE.md).

---

## Build from Source

### Prerequisites

- macOS 13+ (Apple Silicon recommended)
- Node.js 22+
- Xcode Command Line Tools
- Python 3 with `setuptools` — `pip3 install setuptools --break-system-packages`

### Steps

```bash
# 1. Clone
git clone https://github.com/rajdeepchaudhari-work/voxlit.git
cd voxlit

# 2. Install dependencies (auto-rebuilds better-sqlite3 for Electron)
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

# 7. Build a production DMG
npm run build:mac
```

> **macOS 26 (Darwin 25+):** Electron's adhoc-signed dev binary doesn't boot on macOS 26. `npm run dev` fails with `Cannot read properties of undefined (reading 'whenReady')`. Build a signed production DMG with `npm run build:mac` instead, or sign your local Electron binary with a Developer ID certificate.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Electron with Vite HMR |
| `npm run build` | Production JS build |
| `npm run build:mac` | Build a universal macOS DMG |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright Electron integration tests |
| `npm run lint` | ESLint check |
| `npm run typecheck` | TypeScript check (node + web configs) |
| `npm run db:generate` | Generate Drizzle migrations |
| `./scripts/build-native.sh` | Compile Swift helper |
| `./scripts/build-whisper.sh` | Compile whisper.cpp |
| `./scripts/record-demo.sh` | One-command GIF capture for README/site |

---

## Configuration

All settings are stored in `~/Library/Application Support/Voxlit/` and editable from the Settings panel.

| Setting | Default | Description |
|---|---|---|
| Hotkey | `Fn` | Push-to-talk trigger |
| Engine | `voxlit` | `voxlit` (hosted cloud), `local` (offline), or `cloud` (OpenAI BYOK) |
| Local model | `ggml-small.en` | Whisper model used when engine is `local` |
| Mic device | System default | Any CoreAudio input (built-in, AirPods, USB) |
| VAD sensitivity | `0.5` | Voice activity detection threshold |
| Mic gain boost | `off` | Optional pre-amp for quiet mics |
| Noise suppression | `off` | Optional denoiser on capture |
| Start/stop chimes | `on` | Subtle audio feedback |

---

## Privacy & Security

Voxlit is built so privacy is a property of the architecture, not a policy promise.

- **Local mode** — audio never leaves the device. No telemetry, no analytics, no server
- **Voxlit Cloud** — audio is streamed over HTTPS to `api.voxlit.co`, transcribed by Whisper, and discarded. No account, no IP logging beyond per-minute rate limits, no retention. Server source: [`server/`](server/)
- **OpenAI BYOK** — audio goes directly to OpenAI using your key. Voxlit never proxies or stores the key; it's encrypted on disk via `electron-store`
- **The renderer has no internet access by design** — every network call goes through the auditable main process
- **Signed Swift helper** — the only process with mic and accessibility permissions; quits cleanly on app exit
- **Supply-chain hardening** — CodeQL static analysis, OpenSSF Scorecard, Dependabot, SHA-pinned GitHub Actions, Cosign-signed release artifacts, SBOM published with every release

See [`SECURITY.md`](SECURITY.md) for our security policy and how to report vulnerabilities.

---

## Troubleshooting

- **"Voxlit can't be opened because Apple cannot check it for malicious software"** — you downloaded the DMG via a browser; the curl installer avoids this. Alternatively: right-click → Open, or run `xattr -d com.apple.quarantine /Applications/Voxlit.app`.
- **Hotkey does nothing** — open the health popover (menu bar) and hit *Auto-fix*. It re-registers the hotkey and restarts the helper if needed.
- **Mic silent after sleep/wake** — fixed in v1.0.10; earlier versions need a manual restart.
- **Stuck "Restart to update"** — fixed in v1.0.7; update and the issue won't recur.

Still stuck? Open an issue with the output of **Health popover → Copy diagnostics**.

---

## Roadmap

Tracking in [**Issues**](https://github.com/rajdeepchaudhari-work/voxlit/issues) and [**Discussions**](https://github.com/rajdeepchaudhari-work/voxlit/discussions). Near-term:

- Streaming partial transcripts (live preview while you speak)
- Custom vocabulary and replacement rules
- Multi-language model picker
- Per-app engine overrides (e.g. Local for Messages, Cloud for email)
- Windows port *(contributors wanted)*

---

## Contributing

PRs are welcome. For anything non-trivial, open an issue first so we can agree on the approach.

```bash
git checkout -b feat/your-feature
npm install
npm run lint && npm run typecheck && npm run test
git commit -m "feat: your feature"
git push origin feat/your-feature
# open PR
```

Style & conventions:

- TypeScript strict mode; run `npm run typecheck` before pushing
- ESLint + Prettier (`npm run format`)
- Conventional commits preferred (`feat:`, `fix:`, `chore:`)
- Swift changes live under [`native/`](native/) — build with `./scripts/build-native.sh`
- UI follows [`BRAND_IDENTITY.md`](BRAND_IDENTITY.md)

Good first issues are tagged [**`good first issue`**](https://github.com/rajdeepchaudhari-work/voxlit/labels/good%20first%20issue).

---

## License & Credits

Voxlit is released under the [MIT License](LICENSE).

Built with and thanks to:

- [Electron](https://www.electronjs.org) · [Vite](https://vitejs.dev) · [React](https://react.dev) · [Zustand](https://zustand-demo.pmnd.rs)
- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) by Georgi Gerganov
- [Silero VAD](https://github.com/snakers4/silero-vad)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [Drizzle ORM](https://orm.drizzle.team)
- [electron-builder](https://www.electron.build) · [electron-updater](https://www.electron.build/auto-update)

<br/>

<p align="center">
  Made on macOS · <a href="https://voxlit.co">voxlit.co</a>
</p>
