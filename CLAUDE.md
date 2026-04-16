# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

Single-developer project. Commit and push directly to `main` — do NOT create branches or pull requests unless explicitly asked. Skip the PR review cycle.

## Project Status

Phase 1 scaffold is complete. The full TypeScript/React/Electron project structure exists with working builds (`npm run build` ✓). The Swift native helper is scaffolded but not yet functional (binary must be compiled with `./scripts/build-native.sh`). whisper.cpp binaries must be compiled with `./scripts/build-whisper.sh` and placed in `resources/binaries/`. The `resources/models/ggml-base.en.bin` model must be downloaded separately.

## What Voxlit Is

Privacy-first, open-source macOS voice dictation app. Press a hotkey → speak → transcript is injected into whatever app is focused. Works entirely offline using bundled whisper.cpp; OpenAI cloud transcription is opt-in with the user's own API key.

## Dev Environment Notes

- **macOS 26+ (Darwin 25+):** Electron's adhoc-signed dev binary does not initialize the browser process on macOS 26. `npm run dev` will fail with `TypeError: Cannot read properties of undefined (reading 'whenReady')`. This is an OS security restriction — the adhoc signature is insufficient. Workaround: sign the electron binary with a Developer ID, or wait for Electron to ship a macOS 26-compatible release.
- **After `npm install`:** `better-sqlite3` is auto-rebuilt for Electron via the `postinstall` script (`electron-rebuild -f -w better-sqlite3`). If you skip the postinstall, `npm run build` succeeds but the production app crashes with a native addon error.
- **Python for node-gyp:** Python 3.12+ removed `distutils`. Run `pip3 install setuptools --break-system-packages` once if node-gyp fails with `ModuleNotFoundError: No module named 'distutils'`.

## Commands

```bash
npm run dev          # Start Electron app with Vite HMR
npm run build        # Production build
npm run build:mac    # Build universal macOS DMG
npm run test         # Run Vitest unit tests
npm run test:e2e     # Run Playwright Electron integration tests
npm run lint         # ESLint check
npm run format       # Prettier format
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run typecheck    # TypeScript check (both tsconfig.node and tsconfig.web)

# Native build scripts
./scripts/build-native.sh    # Compile Swift helper binary
./scripts/build-whisper.sh   # Compile whisper.cpp from source
```

Single test: `npx vitest run tests/unit/someTest.test.ts`

## Architecture

Three processes communicate to make dictation work:

### 1. Swift Native Helper (`native/`)
Separate signed process — the only component that can reliably access AVFoundation (mic) and AXUIElement (text injection) on macOS. Communicates with the Electron main process exclusively via a **Unix domain socket** at `/tmp/voxlit.socket` using length-prefixed JSON + binary frames.

- `HotkeyManager.swift` — Carbon `RegisterEventHotKey` for global shortcuts; emits `{"type":"hotkey","action":"start"|"stop"|"toggle"}`
- `AudioEngine.swift` — AVAudioEngine at 16 kHz mono float32 PCM; each frame prefixed with 4-byte length header
- `TextInjector.swift` — primary path: `AXUIElement` setValue; fallback: write to pasteboard + simulate `Cmd+V` via `CGEvent`

### 2. Electron Main Process (`src/main/`)
Node.js side. No `nodeIntegration` in renderer; all Node APIs go through `contextBridge`.

- `SocketManager.ts` — spawns Swift helper, manages Unix socket, routes audio chunks and control messages
- `TranscriptManager.ts` — receives VAD-gated PCM, invokes whisper.cpp subprocess or OpenAI API, emits transcript segments
- `SessionStore.ts` — Drizzle ORM over better-sqlite3; `sessions` + `entries` tables
- `ModelManager.ts` — manages bundled `ggml-base.en.bin` and user-downloaded larger models in `~/Library/Application Support/Voxlit/models/`
- `src/preload/index.ts` — the `contextBridge` API surface; typed IPC client exposed to renderer

### 3. React Renderer (`src/renderer/`)
UI only. No direct Node access.

- `workers/vad.worker.ts` — Silero VAD v5 ONNX runs here; emits `speech_start`/`speech_end` with buffered PCM
- `store/useAppStore.ts` — Zustand store for session state, transcript buffer, settings, UI state
- `components/StatusPill/` — floating pill window showing idle/listening/processing states
- `components/HistoryPanel/`, `SettingsPanel/`, `OnboardingWizard/`

### Transcription Layer
- **Local (default):** `whisper-cli` subprocess invoked as `whisper-cli -m model.bin -f audio.wav --output-json`; Voxlit queues VAD segments as temp WAV files
- **Cloud (opt-in):** thin wrapper around `openai.audio.transcriptions.create`; identical interface from main process perspective; API key encrypted via electron-store

## Key Technical Constraints

- **Renderer has no internet access** — all network calls go through main process IPC (auditable, privacy guarantee)
- **Swift helper must be signed** — local dev builds require `xattr -d com.apple.quarantine ./path/to/binary` to bypass Gatekeeper
- **Universal binary** — must build for both arm64 (Apple Silicon) and x64 (Intel); whisper.cpp binaries and the Swift helper are bundled per-arch under `resources/binaries/`
- **Entitlements needed:** `com.apple.security.device.audio-input`, `com.apple.security.automation.apple-events`
- **VAD tuning:** 500ms trailing silence buffer before marking end-of-speech; sensitivity exposed as a user slider

## Database Schema
SQLite via better-sqlite3 + Drizzle ORM. Schema defined in `src/main/db/schema.ts`. Schema is intentionally compatible with Glaido's DB for future import support. Migrations auto-generated in `src/main/db/migrations/`.

## Frontend Design

When building any UI component, page, or interface, use the `/frontend-design` skill (defined in `frontend-design.md`). It guides production-grade, distinctive UI work and prevents generic aesthetics.

All visual design decisions — colors, typography, spacing, shadows, motion, logo usage, and copy tone — must follow `BRAND_IDENTITY.md`. Key references:
- **Colors:** Electron Violet `#7C3AED`, Plasma Cyan `#22D3EE`, Void Black `#0A0A0F`, Star White `#F0EEFF`
- **Fonts:** Space Grotesk (display/headings), Inter (body/UI), JetBrains Mono (transcription output, shortcuts)
- **Theme:** Dark only. No light backgrounds for branded surfaces.
- **Motion:** Purposeful and restrained — use the timing tokens in `BRAND_IDENTITY.md §6`, no bouncy or decorative animations.

## Glaido Reference Build
A compiled Glaido.app is in `Glaido.app/` — use it as a reference for behavior and UX patterns, not as source code.

Workslate-cloud-ssh-details.