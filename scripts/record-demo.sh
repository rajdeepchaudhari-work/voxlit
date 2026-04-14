#!/usr/bin/env bash
# Record a screen region and convert to a README-ready GIF.
#
#   ./scripts/record-demo.sh                  # defaults: recordings/demo-<ts>.gif, 15fps, 900px
#   ./scripts/record-demo.sh docs/demo.gif    # custom output
#   FPS=20 WIDTH=1100 ./scripts/record-demo.sh
#
# Uses macOS's screencapture for the recording (native, no permissions beyond
# Screen Recording which you've granted already for Voxlit) and ffmpeg + the
# two-pass palette dance for clean, small GIFs suitable for GitHub.
set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
FPS="${FPS:-15}"
WIDTH="${WIDTH:-900}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEFAULT_OUT="$REPO_ROOT/recordings/demo-$(date +%Y%m%d-%H%M%S).gif"
OUTPUT="${1:-$DEFAULT_OUT}"

# ── Colors ──────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RESET=$'\033[0m'
  GREEN=$'\033[32m'; RED=$'\033[31m'; CYAN=$'\033[36m'; YELLOW=$'\033[33m'
else
  BOLD=''; DIM=''; RESET=''; GREEN=''; RED=''; CYAN=''; YELLOW=''
fi

info() { printf "${CYAN}›${RESET} %s\n" "$*"; }
ok()   { printf "${GREEN}✓${RESET} %s\n" "$*"; }
die()  { printf "${RED}✗${RESET} %s\n" "$*" >&2; exit 1; }

# ── Pre-flight ──────────────────────────────────────────────────────────────
if [ "$(uname)" != "Darwin" ]; then
  die "macOS only (uses screencapture)."
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  printf "${YELLOW}!${RESET} ffmpeg not found. Install it with:\n\n   brew install ffmpeg\n\n"
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT")"

TMP=$(mktemp -d -t voxlit-demo.XXXXXX)
trap 'rm -rf "$TMP"' EXIT

MOV="$TMP/demo.mov"
PALETTE="$TMP/palette.png"

# ── Record ──────────────────────────────────────────────────────────────────
printf "\n${BOLD}Record Voxlit demo${RESET}\n"
printf "${DIM}output:${RESET} %s\n" "$OUTPUT"
printf "${DIM}   fps:${RESET} %s    ${DIM}width:${RESET} %spx\n" "$FPS" "$WIDTH"
printf "\n${BOLD}Instructions:${RESET}\n"
printf "  1. A crosshair appears — drag to select the recording region\n"
printf "     (or press Space to toggle window-capture mode, then click a window)\n"
printf "  2. Click ${BOLD}Record${RESET} to start\n"
printf "  3. Do your thing — press Fn, speak, see text appear\n"
printf "  4. Click the ${BOLD}stop icon${RESET} in the menubar (or ${BOLD}Control+Option+Esc${RESET})\n"
printf "\n"
read -r -p "Press Enter when ready… "

# -v: video, interactive region selector. Writes until user stops.
screencapture -v "$MOV"

if [ ! -f "$MOV" ] || [ ! -s "$MOV" ]; then
  die "No recording produced — cancelled or failed."
fi

MOV_SIZE=$(du -h "$MOV" | awk '{print $1}')
info "Recorded $MOV_SIZE of video, converting to GIF…"

# ── Convert ─────────────────────────────────────────────────────────────────
# Pass 1: generate an optimized palette from the video.
# Pass 2: map frames to the palette with bayer dithering. Produces high-quality
# GIFs at a fraction of the size of naive ffmpeg -> gif conversion.
ffmpeg -y -i "$MOV" \
  -vf "fps=$FPS,scale=$WIDTH:-1:flags=lanczos,palettegen=max_colors=192" \
  "$PALETTE" -loglevel error

ffmpeg -y -i "$MOV" -i "$PALETTE" \
  -filter_complex "fps=$FPS,scale=$WIDTH:-1:flags=lanczos[s];[s][1:v]paletteuse=dither=bayer:bayer_scale=5" \
  "$OUTPUT" -loglevel error

GIF_SIZE=$(du -h "$OUTPUT" | awk '{print $1}')
DURATION=$(ffprobe -v quiet -show_entries format=duration -of csv=p=0 "$MOV" 2>/dev/null | awk '{printf "%.1f", $1}')

ok "Created $OUTPUT"
printf "   ${DIM}size:${RESET} %s    ${DIM}duration:${RESET} %ss    ${DIM}fps:${RESET} %s\n\n" "$GIF_SIZE" "$DURATION" "$FPS"

# ── Post-hints ──────────────────────────────────────────────────────────────
printf "${BOLD}Next steps:${RESET}\n"
printf "  ${DIM}•${RESET} Preview:  ${BOLD}open \"$OUTPUT\"${RESET}\n"
printf "  ${DIM}•${RESET} Too big?  Re-run with a smaller WIDTH (e.g. ${BOLD}WIDTH=700${RESET})\n"
printf "  ${DIM}•${RESET} Ship it:  move to ${BOLD}docs/demo.gif${RESET} and reference in README\n"
printf "    (recordings/ is gitignored — docs/ is the committed location)\n\n"
