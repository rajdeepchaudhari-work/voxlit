# Security Policy

Voxlit is a local-first voice dictation app. The architecture is designed so that
audio never leaves your Mac in the default configuration — there is no telemetry,
no analytics, and no background network activity. The entire codebase is MIT
licensed and auditable.

Even so, bugs happen. If you find one that affects security or privacy, we want
to hear about it.

## Reporting a vulnerability

**Do not open a public GitHub issue for security bugs.**

Please report privately via one of:

1. **GitHub private vulnerability report** — preferred
   [github.com/rajdeepchaudhari-work/voxlit/security/advisories/new](https://github.com/rajdeepchaudhari-work/voxlit/security/advisories/new)

2. **Email** — `security@voxlit.co`

Include:
- A description of the issue and its impact
- Steps to reproduce (or a proof-of-concept)
- The Voxlit version, macOS version, and Mac architecture (arm64 / x64)
- Whether you've disclosed this elsewhere

You should expect an acknowledgement within **3 business days**.

## What we consider in-scope

- Local privilege escalation via Voxlit or the `VoxlitHelper` Swift binary
- Arbitrary code execution from an untrusted DMG, update payload, or IPC message
- Audio or transcripts leaking outside the process when the user selected
  **Local** mode
- Bypasses of the Unix-socket isolation between the renderer and the helper
- TCC / permission bypasses (microphone, accessibility, automation)
- Memory safety issues in the Swift helper
- Update-channel tampering (e.g. forged `latest-mac.yml`, corrupted blockmap)
- Supply-chain issues in our dependencies we can feasibly mitigate

## Out of scope

- Third-party transcription providers' own infrastructure (OpenAI Whisper,
  Voxlit Cloud) — report those to the provider directly. Your API key is
  encrypted on disk via `electron-store` but we make no cryptographic
  guarantees about the provider's handling of your audio.
- Issues requiring an already-compromised Mac user account
- Social engineering or phishing against maintainers
- Denial of service from the user's own machine
- Missing security headers on the marketing website at `voxlit.co`

## Disclosure

We aim for **90-day coordinated disclosure** by default, but will work with you
if longer is needed for a complex fix. Credit will be given in the release notes
and `CHANGELOG` unless you prefer to remain anonymous.

## Scope of this policy

This policy covers:
- The Voxlit macOS app (this repository)
- The `VoxlitHelper` Swift binary (this repository, under `native/`)
- The Homebrew cask at `rajdeepchaudhari-work/homebrew-voxlit`
- The Voxlit Cloud server (hosted — repo link on request)

## Verification

Every release ships with:
- A SHA256 checksum visible on the GitHub Releases page
- A **Sigstore keyless signature** — each asset has a paired `.sig` and `.pem`.
  Verify with:
  ```bash
  cosign verify-blob \
    --certificate voxlit-1.0.7-arm64.dmg.pem \
    --signature  voxlit-1.0.7-arm64.dmg.sig \
    --certificate-identity-regexp 'https://github.com/rajdeepchaudhari-work/voxlit' \
    --certificate-oidc-issuer     'https://token.actions.githubusercontent.com' \
    voxlit-1.0.7-arm64.dmg
  ```
  The cert ties the signature to a specific GitHub Actions run — you can audit
  exactly which commit built the binary.
- A reproducible build — clone the repo at the release tag, run
  `npm install && npm run build:mac`, and the resulting DMG's sha256 should
  match the published release asset (within code-signing differences —
  subtract signatures if comparing against ours)
- Signed commits on `main` (GitHub verified badge)

Thanks for helping keep Voxlit and its users safe.
