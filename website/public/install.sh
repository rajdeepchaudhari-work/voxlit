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

# ── Already installed? Check both possible bundle names ────────────────────
EXISTING_APP=""
for candidate in /Applications/Voxlit.app /Applications/voxlit.app; do
  if [ -d "$candidate" ]; then EXISTING_APP="$candidate"; break; fi
done
if [ -n "$EXISTING_APP" ]; then
  CURRENT=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$EXISTING_APP/Contents/Info.plist" 2>/dev/null || echo "")
  if [ "$CURRENT" = "$VERSION" ]; then
    ok "Voxlit $TAG already installed at $EXISTING_APP"
    printf "\n   Open it from Spotlight or run:  ${BOLD}open -a Voxlit${RESET}\n\n"
    exit 0
  fi
  warn "Existing Voxlit $CURRENT will be replaced with $TAG"
fi

# ── Download ────────────────────────────────────────────────────────────────
TMP=$(mktemp -d -t voxlit-install.XXXXXX)
MOUNT="$TMP/mount"
# Cleanup: detach DMG FIRST (mount is read-only — rm would error out on it),
# then remove the tmp dir. Swallow all stderr so the exit path stays quiet.
cleanup() {
  hdiutil detach "$MOUNT" -quiet -force >/dev/null 2>&1 || true
  rm -rf "$TMP" 2>/dev/null || true
}
trap cleanup EXIT

DMG="$TMP/voxlit.dmg"
info "Downloading DMG from GitHub Releases…"
if ! curl -fL --progress-bar "$DMG_URL" -o "$DMG"; then
  die "Download failed: $DMG_URL"
fi
SIZE=$(du -h "$DMG" | awk '{print $1}')
ok "Downloaded ($SIZE)"

# ── Mount + copy ────────────────────────────────────────────────────────────
info "Mounting DMG…"
mkdir -p "$MOUNT"
hdiutil attach "$DMG" -nobrowse -noautoopen -quiet -mountpoint "$MOUNT"

# The .app bundle filename is 'voxlit.app' (lowercase, per package.json `name`)
# even though productName is 'Voxlit'. Search case-insensitively for either.
APP_SRC=$(find "$MOUNT" -maxdepth 2 -iname 'voxlit.app' -type d | head -n1)
[ -d "$APP_SRC" ] || die "Voxlit app bundle not found inside DMG"

# Resolve the real destination name from the source — so if the bundle is
# voxlit.app we install /Applications/voxlit.app, matching auto-updater expectations.
APP_NAME=$(basename "$APP_SRC")
DEST_APP="/Applications/$APP_NAME"

info "Copying to /Applications…"
# Quit any running instance so the copy doesn't race the running binary
osascript -e 'tell application "Voxlit" to quit' 2>/dev/null || true
sleep 0.5
# Remove any prior install (covers case where bundle name changed case)
for old in /Applications/Voxlit.app /Applications/voxlit.app; do
  [ -d "$old" ] && rm -rf "$old"
done
cp -R "$APP_SRC" "/Applications/"

info "Ejecting DMG…"
hdiutil detach "$MOUNT" -quiet -force >/dev/null 2>&1 || true

# ── Strip quarantine (the reason this script exists) ───────────────────────
info "Clearing macOS quarantine attribute…"
xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true

ok "Installed Voxlit $TAG to $DEST_APP"
printf "\n   ${BOLD}${GREEN}All set.${RESET} Launch with:  ${BOLD}open -a Voxlit${RESET}\n\n"
