#!/usr/bin/env bash
# Builds whisper.cpp from source and places binaries under resources/binaries/.
# On Apple Silicon, only builds arm64 (Metal-accelerated).
# On Intel, builds x86_64.
# Requires: cmake, Xcode command-line tools
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WHISPER_DIR="$REPO_ROOT/.whisper-src"
OUT_DIR="$REPO_ROOT/resources/binaries"

echo "Building whisper.cpp..."
mkdir -p "$OUT_DIR"

# Clone whisper.cpp if not already present
if [ ! -d "$WHISPER_DIR" ]; then
    git clone --depth 1 https://github.com/ggerganov/whisper.cpp.git "$WHISPER_DIR"
fi

cd "$WHISPER_DIR"

HOST_ARCH="$(uname -m)"

if [ "$HOST_ARCH" = "arm64" ]; then
    echo "Building for arm64 (Metal)..."
    cmake -B build-arm64 \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_OSX_ARCHITECTURES=arm64 \
        -DGGML_METAL=ON
    cmake --build build-arm64 --target whisper-cli -j "$(sysctl -n hw.logicalcpu)"
    cp "build-arm64/bin/whisper-cli" "$OUT_DIR/whisper-cli-arm64"
    chmod +x "$OUT_DIR/whisper-cli-arm64"
    # Symlink as default so TranscriptManager can find it without arch detection
    ln -sf "$OUT_DIR/whisper-cli-arm64" "$OUT_DIR/whisper-cli"
    echo "Done. arm64: $OUT_DIR/whisper-cli-arm64"
else
    echo "Building for x86_64..."
    cmake -B build-x64 \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_OSX_ARCHITECTURES=x86_64 \
        -DGGML_METAL=OFF
    cmake --build build-x64 --target whisper-cli -j "$(sysctl -n hw.logicalcpu)"
    cp "build-x64/bin/whisper-cli" "$OUT_DIR/whisper-cli-x64"
    chmod +x "$OUT_DIR/whisper-cli-x64"
    ln -sf "$OUT_DIR/whisper-cli-x64" "$OUT_DIR/whisper-cli"
    echo "Done. x86_64: $OUT_DIR/whisper-cli-x64"
fi
