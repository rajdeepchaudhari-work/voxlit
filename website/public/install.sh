#!/usr/bin/env bash
# Voxlit installer.
#   curl -fsSL https://voxlit.co/install.sh | bash
#
# Downloads the latest release from GitHub, mounts the DMG, copies Voxlit.app
# to /Applications, strips the macOS quarantine attribute so Gatekeeper doesn't
# block launch (works because files downloaded via curl — not a browser — are
# never marked with the com.apple.quarantine xattr by the system).
#
# No sudo required: /Applications is user-writable for the installing user.

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  GREEN=$'\033[32m'; RED=$'\033[31m'; CYAN=$'\033[36m'; YELLOW=$'\033[33m'
else
  BOLD=''; DIM=''; RESET=''; GREEN=''; RED=''; CYAN=''; YELLOW=''
fi

info()  { printf "${CYAN}›${RESET} %s\n" "$*"; }
ok()    { printf "${GREEN}✓${RESET} %s\n" "$*"; }
warn()  { printf "${YELLOW}!${RESET} %s\n" "$*"; }
die()   { printf "${RED}✗${RESET} %s\n" "$*" >&2; exit 1; }

# ── Pre-flight ──────────────────────────────────────────────────────────────
if [ "$(uname)" != "Darwin" ]; then
  die "Voxlit is macOS only. Detected: $(uname)"
fi

ARCH=$(uname -m)
if [ "$ARCH" != "arm64" ]; then
  warn "Voxlit ships arm64 only. Detected: $ARCH"
  warn "The app may not launch on Intel Macs. Continuing anyway…"
fi

REPO="rajdeepchaudhari-work/voxlit"
API="https://api.github.com/repos/$REPO/releases/latest"

printf "\n${BOLD}Voxlit installer${RESET}\n"
printf "${DIM}Privacy-first voice dictation for macOS${RESET}\n\n"

# ── Resolve latest release ─────────────────────────────────────────────────
info "Looking up latest release…"
TAG=$(curl -fsSL "$API" | awk -F'"' '/"tag_name"/ {print $4; exit}')
if [ -z "${TAG:-}" ]; then
  die "Couldn't determine latest release from $API"
fi
VERSION="${TAG#v}"
DMG_URL="https://github.com/$REPO/releases/download/$TAG/voxlit-$VERSION-arm64.dmg"
ok "Found $TAG"

# ── Abort if already installed at the same version ─────────────────────────
DEST_APP="/Applications/Voxlit.app"
if [ -d "$DEST_APP" ]; then
  CURRENT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$DEST_APP/Contents/Info.plist" 2>/dev/null || echo "")
  if [ "$CURRENT" = "$VERSION" ]; then
    ok "Voxlit $TAG already installed at $DEST_APP"
    printf "\n   Open it from Spotlight or run:  ${BOLD}open -a Voxlit${RESET}\n\n"
    exit 0
  fi
  warn "Existing Voxlit $CURRENT will be replaced with $TAG"
fi

# ── Download ────────────────────────────────────────────────────────────────
TMP=$(mktemp -d -t voxlit-install.XXXXXX)
trap 'rm -rf "$TMP"; hdiutil detach "$TMP/mount" -quiet 2>/dev/null || true' EXIT

DMG="$TMP/voxlit.dmg"
info "Downloading DMG from GitHub Releases…"
if ! curl -fL --progress-bar "$DMG_URL" -o "$DMG"; then
  die "Download failed: $DMG_URL"
fi
SIZE=$(du -h "$DMG" | awk '{print $1}')
ok "Downloaded ($SIZE)"

# ── Mount + copy ────────────────────────────────────────────────────────────
info "Mounting DMG…"
mkdir -p "$TMP/mount"
hdiutil attach "$DMG" -nobrowse -noautoopen -quiet -mountpoint "$TMP/mount"

APP_SRC=$(find "$TMP/mount" -maxdepth 2 -name 'Voxlit.app' -type d | head -n1)
[ -d "$APP_SRC" ] || die "Voxlit.app not found inside DMG"

info "Copying to /Applications…"
if [ -d "$DEST_APP" ]; then
  # Quit any running instance so the copy doesn't race the running binary
  osascript -e 'tell application "Voxlit" to quit' 2>/dev/null || true
  sleep 0.5
  rm -rf "$DEST_APP"
fi
cp -R "$APP_SRC" "/Applications/"

info "Eject DMG…"
hdiutil detach "$TMP/mount" -quiet || true

# ── Strip quarantine (the reason this script exists) ───────────────────────
info "Clearing macOS quarantine attribute…"
xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true

ok "Installed Voxlit $TAG to $DEST_APP"
printf "\n   ${BOLD}${GREEN}All set.${RESET} Launch with:  ${BOLD}open -a Voxlit${RESET}\n\n"
