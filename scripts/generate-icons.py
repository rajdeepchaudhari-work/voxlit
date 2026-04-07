#!/usr/bin/env python3
"""
Generate Voxlit app icons from logo.png source.
Requires: pip3 install cairosvg Pillow
"""

import os
import subprocess
import cairosvg
from PIL import Image

# ─── Tray icon SVG (monochrome, template for macOS menu bar) ──────────────────
TRAY_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <polyline
    points="5,8 16,24 27,8"
    fill="none"
    stroke="black"
    stroke-width="4.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>"""

TRAY_SVG_WHITE = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <polyline
    points="5,8 16,24 27,8"
    fill="none"
    stroke="white"
    stroke-width="4.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>"""

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'resources', 'icons')
ICONSET_DIR = os.path.join(OUTPUT_DIR, 'iconset.iconset')
os.makedirs(ICONSET_DIR, exist_ok=True)

# ─── Load logo.png and add macOS-standard padding ────────────────────────────
# macOS app icons need ~12% inset padding so content doesn't touch squircle edges.
# Without padding the icon looks oversized compared to system apps like Notes/Calendar.
LOGO_PATH = os.path.join(OUTPUT_DIR, 'logo.png')
MASTER_SIZE = 1024
PADDING_PCT = 0.18  # 18% padding each side = 64% content area

def make_padded(size):
    from PIL import ImageDraw

    # Outer margin — transparent space around the background shape
    OUTER_MARGIN = 0.06  # 6% transparent gap on each side
    outer = int(size * OUTER_MARGIN)

    logo = Image.open(LOGO_PATH).convert('RGBA')

    bg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bg)
    r = int((size - outer * 2) * 0.225)
    draw.rounded_rectangle([outer, outer, size - outer - 1, size - outer - 1], radius=r, fill=(102, 93, 245, 255))

    # Paste logo centered with inner padding (relative to the background rect)
    pad = outer + int((size - outer * 2) * PADDING_PCT)
    inner = size - pad * 2
    logo_resized = logo.resize((inner, inner), Image.LANCZOS)
    bg.paste(logo_resized, (pad, pad), logo_resized)
    return bg

# ─── Generate iconset sizes ───────────────────────────────────────────────────
SIZES = [16, 32, 64, 128, 256, 512, 1024]

for size in SIZES:
    img = make_padded(size)
    path = os.path.join(ICONSET_DIR, f'icon_{size}x{size}.png')
    img.save(path)
    print(f'  ✓ icon_{size}x{size}.png')

    if size <= 512:
        img2x = make_padded(size * 2)
        path2x = os.path.join(ICONSET_DIR, f'icon_{size}x{size}@2x.png')
        img2x.save(path2x)
        print(f'  ✓ icon_{size}x{size}@2x.png')

# ─── Master icon.png (1024x1024) ─────────────────────────────────────────────
master_path = os.path.join(OUTPUT_DIR, 'icon.png')
make_padded(MASTER_SIZE).save(master_path)
print(f'  ✓ icon.png (1024x1024)')

# ─── Tray icons ───────────────────────────────────────────────────────────────
cairosvg.svg2png(bytestring=TRAY_SVG.encode(), write_to=os.path.join(OUTPUT_DIR, 'tray.png'), output_width=16, output_height=16)
cairosvg.svg2png(bytestring=TRAY_SVG.encode(), write_to=os.path.join(OUTPUT_DIR, 'tray@2x.png'), output_width=32, output_height=32)
print(f'  ✓ tray.png / tray@2x.png')

# ─── .icns via iconutil ───────────────────────────────────────────────────────
icns_path = os.path.join(OUTPUT_DIR, 'icon.icns')
result = subprocess.run(
    ['iconutil', '-c', 'icns', ICONSET_DIR, '-o', icns_path],
    capture_output=True, text=True
)
if result.returncode == 0:
    print(f'  ✓ icon.icns')
else:
    print(f'  ✗ icon.icns failed: {result.stderr}')

print('\nDone.')
