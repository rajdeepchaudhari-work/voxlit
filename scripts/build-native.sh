#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE_DIR="$REPO_ROOT/native"
OUT_DIR="$REPO_ROOT/resources/native/macos/build/release"

echo "Building VoxlitHelper (universal binary)..."
mkdir -p "$OUT_DIR"

cd "$NATIVE_DIR"

# Swift PM produces a universal binary when both archs are requested
swift build -c release --arch arm64 --arch x86_64

# SPM universal output path
BINARY=".build/apple/Products/Release/VoxlitHelper"

if [ ! -f "$BINARY" ]; then
    echo "ERROR: Expected binary not found at $BINARY"
    exit 1
fi

cp "$BINARY" "$OUT_DIR/VoxlitHelper"
chmod +x "$OUT_DIR/VoxlitHelper"

echo "Done. Binary at: $OUT_DIR/VoxlitHelper"
lipo -info "$OUT_DIR/VoxlitHelper"
