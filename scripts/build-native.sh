#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NATIVE_DIR="$REPO_ROOT/native"
OUT_DIR="$REPO_ROOT/resources/native/macos/build/release"

echo "Building VoxlitHelper (universal binary)..."
mkdir -p "$OUT_DIR"

cd "$NATIVE_DIR"

# Try universal first (xcbuild can be broken on some Xcode/CLT configurations).
# If it fails, fall back to host-arch only — release artifacts ship arm64-only anyway.
if swift build -c release --arch arm64 --arch x86_64 2>/dev/null; then
    BINARY=".build/apple/Products/Release/VoxlitHelper"
else
    echo "Universal build failed, falling back to arm64-only..."
    swift build -c release --arch arm64
    BINARY=".build/arm64-apple-macosx/release/VoxlitHelper"
fi

if [ ! -f "$BINARY" ]; then
    echo "ERROR: Expected binary not found at $BINARY"
    exit 1
fi

cp "$BINARY" "$OUT_DIR/VoxlitHelper"
chmod +x "$OUT_DIR/VoxlitHelper"

echo "Done. Binary at: $OUT_DIR/VoxlitHelper"
lipo -info "$OUT_DIR/VoxlitHelper"
