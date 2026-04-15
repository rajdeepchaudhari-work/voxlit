<p align="center">
  <img src="resources/icons/logo.png" width="96" height="96" alt="Voxlit" style="border-radius: 22px" />
</p>

<h1 align="center">Voxlit</h1>

<p align="center">
  <strong>Dictation on macOS, done right.</strong><br/>
  Hold a key. Talk. The words land in whatever app you were already in.
</p>

<p align="center">
  <a href="https://voxlit.co"><strong>voxlit.co</strong></a> &nbsp;·&nbsp;
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases/latest"><strong>Download</strong></a> &nbsp;·&nbsp;
  <a href="#how-it-feels">How it feels</a> &nbsp;·&nbsp;
  <a href="#under-the-hood">Under the hood</a> &nbsp;·&nbsp;
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
  <a href="https://github.com/rajdeepchaudhari-work/voxlit/releases">
    <img src="https://img.shields.io/badge/signed-cosign-22D3EE?style=flat-square" alt="Signed with Cosign" />
  </a>
</p>

<br/>

<p align="center">
  <img width="1012" alt="Voxlit main window" src="https://github.com/user-attachments/assets/c5307040-22f6-4069-99ae-a1146bec3c03" />
  <br/><br/>
  <img width="320" alt="Voxlit floating status pill" src="https://github.com/user-attachments/assets/0b878834-f37c-48f8-8963-4e9184840c75" />
</p>

---

## Why this exists

Apple's built-in dictation is slow, wrong, and forgets you exist between words. The paid apps work — and then ask you to pay monthly rent on your own voice, pipe your audio through servers you can't audit, and marry you to one model from one vendor.

Voxlit is the dictation app we wanted and couldn't find. Fast enough to trust mid-sentence. Private enough to run fully offline when it matters. Open enough that nobody — not us, not OpenAI, not a future acquirer — can take it away from you.

Every line of the app is MIT. Every transcription engine is swappable. Even the cloud server is in this repo ([`server/`](server/)) — audit it, fork it, or host it yourself in an afternoon.

---

## How it feels

You press `Fn`. You talk. A small pill appears and listens. You let go. The text is already in Slack, or VS Code, or the email draft you had open. You didn't switch windows. You didn't paste. You didn't look.

That's it. That's the whole product.

Everything else — the three engines, the health popover, the sleep/wake recovery, the signed helper — exists so that sentence stays true on your machine, on every machine, every time.

---

## Three engines, one hotkey

One shortcut, three ways to transcribe. Switch whenever you want; nothing else changes.

**Voxlit Cloud** &nbsp;·&nbsp; *default, zero setup*
Our hosted Whisper at `api.voxlit.co`, dictation-tuned for punctuation, contractions, and the "ums" you don't want in the transcript. No account. No API key. No retention. If you ever stop trusting us, the server code is [right here](server/).

**Local** &nbsp;·&nbsp; *fully offline*
`whisper.cpp` on-device with Metal acceleration. Audio never leaves your Mac. This is the mode for anything you'd rather not put on someone else's server.

**OpenAI BYOK** &nbsp;·&nbsp; *pay-as-you-go*
Your own `sk-…` key, straight to OpenAI. Voxlit never proxies the audio or stores the key — it's encrypted on disk and handed off as-is.

---

## What's actually in the box

- **Works wherever `⌘V` works.** Notion, Slack, VS Code, Mail, Terminal, iTerm, Ghostty, Chrome. Universal paste via macOS System Events — no per-app integrations to rot.
- **A pill that knows when to disappear.** Floats while you speak, gone when you don't.
- **Your hotkey, your call.** `Fn`, `⌥Space`, `⌃Space`, `⌘⇧D`, or `⌃⇧F`.
- **Every word, searchable.** Local SQLite archive of every transcript. Never phones home.
- **A health popover that tells you the truth.** Mic, helper, socket, engine, updates — all green or all honest. One-click auto-fix for common breakage.
- **Survives sleep, swapped AirPods, and yanked USB mics.** Reconnects, falls back to the default device, moves on.
- **Signed end-to-end.** Developer ID, notarized by Apple, release artifacts signed with Cosign against the GitHub workflow that built them.

---

## Install

**Homebrew** — recommended. Tap auto-updates on every release.

```bash
brew tap rajdeepchaudhari-work/voxlit
brew install --cask voxlit
```

**One-line installer** — downloads the latest DMG, copies `Voxlit.app` to `/Applications`, skips the Gatekeeper dance. No `sudo`.

```bash
curl -fsSL https://voxlit.co/install.sh | bash
```

**Direct DMG** — grab it from [**Releases**](https://github.com/rajdeepchaudhari-work/voxlit/releases/latest), open it, drag it to Applications. Every DMG is code-signed, notarized, and Cosign-verified.

---

## First run

1. Launch Voxlit. The onboarding wizard walks you through mic and accessibility permissions.
2. Pick an engine — Cloud if you just want it to work, Local if you want it private, OpenAI if you already pay them.
3. Pick a hotkey — `Fn` by default.
4. Hold it. Talk. Let go.

On first launch, macOS will ask you to approve the signed Swift helper in **System Settings → Privacy & Security**. That's the only process that ever touches your mic or keyboard.

---

## Under the hood

Voxlit is three processes in a trench coat. They cooperate because macOS won't let any single process own the mic, the hotkey, and the keystroke injection cleanly.

```
┌─────────────────────────────────────────────────────────┐
│  Swift native helper          (signed, own process)     │
│  HotkeyManager · AudioEngine · TextInjector             │
│           │ Unix socket (/tmp/voxlit.socket)            │
├─────────────────────────────────────────────────────────┤
│  Electron main process                                  │
│  SocketManager · TranscriptManager · SessionStore       │
│           │ contextBridge IPC                           │
├─────────────────────────────────────────────────────────┤
│  React renderer                                         │
│  StatusPill · HistoryPanel · SettingsPanel · Onboarding │
└─────────────────────────────────────────────────────────┘
                         │ HTTPS (cloud engines only)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Voxlit server   (server/, FastAPI on api.voxlit.co)    │
│  Whisper transcription + dictation post-processing      │
└─────────────────────────────────────────────────────────┘
```

- **The Swift helper** is the only component with microphone and accessibility permissions. Small, signed, easy to audit.
- **The audio pipeline** is 16 kHz mono float32 PCM over a Unix socket. VAD trims the silence before transcription, so you're not shipping dead air to a model.
- **Local transcription** shells out to `whisper-cli` with Metal GPU acceleration.
- **Cloud transcription** uploads multipart to `api.voxlit.co/v1/transcribe` **from the main process** — the renderer has no network access at all, by design.
- **History** is `better-sqlite3` + Drizzle ORM, stored under `~/Library/Application Support/Voxlit/`.

Deeper architectural notes live in [`CLAUDE.md`](CLAUDE.md).

---

## Build it yourself

You'll need macOS 13+ (Apple Silicon recommended), Node 22+, Xcode CLT, and Python 3 with setuptools (`pip3 install setuptools --break-system-packages`).

```bash
git clone https://github.com/rajdeepchaudhari-work/voxlit.git
cd voxlit
npm install                     # auto-rebuilds better-sqlite3 for Electron
./scripts/build-native.sh       # Swift helper
./scripts/build-whisper.sh      # whisper.cpp binaries
npm run dev                     # start with HMR
npm run build:mac               # production universal DMG
```

For Local mode, drop a model in place:

```bash
mkdir -p ~/Library/Application\ Support/Voxlit/models
curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin \
  -o ~/Library/Application\ Support/Voxlit/models/ggml-base.en.bin
```

> **macOS 26 (Darwin 25+):** Electron's adhoc-signed dev binary doesn't boot. `npm run dev` fails with `Cannot read properties of undefined (reading 'whenReady')`. Build a signed production DMG with `npm run build:mac`, or sign your local Electron binary with a Developer ID.

### Commands cheatsheet

| Command | Does |
|---|---|
| `npm run dev` | Electron with Vite HMR |
| `npm run build:mac` | Universal macOS DMG |
| `npm run test` · `npm run test:e2e` | Vitest unit · Playwright Electron |
| `npm run lint` · `npm run typecheck` | ESLint · TS across node + web |
| `npm run db:generate` | Drizzle migrations from schema |
| `./scripts/build-native.sh` | Swift helper |
| `./scripts/build-whisper.sh` | whisper.cpp |
| `./scripts/record-demo.sh` | One-command GIF capture for the README |

### Settings

All configuration lives in `~/Library/Application Support/Voxlit/` and is editable from the Settings panel.

| Setting | Default | What it does |
|---|---|---|
| Hotkey | `Fn` | Push-to-talk trigger |
| Engine | `voxlit` | `voxlit` (cloud), `local` (offline), `cloud` (OpenAI BYOK) |
| Local model | `ggml-small.en` | Whisper model for Local mode |
| Mic device | System default | Any CoreAudio input |
| VAD sensitivity | `0.5` | Voice-activity threshold |
| Mic gain boost | `off` | Pre-amp for quiet mics |
| Noise suppression | `off` | Capture-side denoiser |
| Start/stop chimes | `on` | Subtle audio feedback |

---

## Privacy, for real

Voxlit treats privacy as an architectural property, not a policy promise.

- **Local mode** — your audio never leaves the machine. No telemetry, no analytics, no server.
- **Voxlit Cloud** — audio streams over HTTPS to `api.voxlit.co`, gets transcribed, and is discarded. No account, no IP logging beyond per-minute rate limits, no retention. The whole server is in [`server/`](server/).
- **OpenAI BYOK** — audio goes directly to OpenAI using your key. We never proxy it and never see the key; it's encrypted on disk via `electron-store`.
- **The renderer process has no internet access.** Every network call is forced through the main process so it can be audited in one place.
- **Supply chain** — CodeQL, OpenSSF Scorecard, Dependabot, SHA-pinned GitHub Actions, Cosign-signed releases, SBOM published per release.

Security policy and how to report vulnerabilities: [`SECURITY.md`](SECURITY.md).

---

## When something breaks

- **"Apple cannot check this for malicious software"** — you downloaded via a browser. Use the `curl` installer, or right-click → Open, or run `xattr -d com.apple.quarantine /Applications/Voxlit.app`.
- **Hotkey does nothing** — menu bar → Health → *Auto-fix*. Re-registers the hotkey and restarts the helper.
- **Mic silent after sleep/wake** — fixed in v1.0.10. Update.
- **Stuck "Restart to update"** — fixed in v1.0.7. Update.

Still stuck? Open an issue with the output of **Health popover → Copy diagnostics**. It captures everything we need.

---

## What's next

Tracked in [Issues](https://github.com/rajdeepchaudhari-work/voxlit/issues) and [Discussions](https://github.com/rajdeepchaudhari-work/voxlit/discussions). In the pipe:

- Streaming partial transcripts — live preview while you speak
- Custom vocabulary and find/replace rules
- Multi-language model picker
- Per-app engine overrides (Local for Messages, Cloud for email)
- A Windows port — contributors very much wanted

---

## Contributing

Show up. PRs welcome. For anything non-trivial, open an issue first so we can agree on the shape before you write the code.

```bash
git checkout -b feat/your-thing
npm install
npm run lint && npm run typecheck && npm run test
git commit -m "feat: your thing"
git push origin feat/your-thing
```

House rules:

- TypeScript strict. `npm run typecheck` before pushing.
- ESLint + Prettier (`npm run format`).
- Conventional commits (`feat:`, `fix:`, `chore:`).
- Swift changes under [`native/`](native/) — rebuild with `./scripts/build-native.sh`.
- UI changes follow [`BRAND_IDENTITY.md`](BRAND_IDENTITY.md).

Starting point: [**`good first issue`**](https://github.com/rajdeepchaudhari-work/voxlit/labels/good%20first%20issue).

---

## Standing on shoulders

Voxlit is MIT-licensed ([`LICENSE`](LICENSE)). It wouldn't exist without:

- [whisper.cpp](https://github.com/ggerganov/whisper.cpp) — Georgi Gerganov shipped this and changed what a small team can build
- [Silero VAD](https://github.com/snakers4/silero-vad) — tiny, accurate, free
- [Electron](https://www.electronjs.org) · [Vite](https://vitejs.dev) · [React](https://react.dev) · [Zustand](https://zustand-demo.pmnd.rs)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) · [Drizzle ORM](https://orm.drizzle.team)
- [electron-builder](https://www.electron.build) · [electron-updater](https://www.electron.build/auto-update)

<br/>

<p align="center">
  Made on macOS, out in the open. &nbsp;·&nbsp; <a href="https://voxlit.co">voxlit.co</a>
</p>
