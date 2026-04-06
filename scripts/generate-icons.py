#!/usr/bin/env python3
"""
Generate Voxlit app icons from SVG source.
Requires: pip3 install cairosvg
"""

import os
import subprocess
import cairosvg

# ─── SVG source ───────────────────────────────────────────────────────────────
# 1024x1024 master — dark squircle + white V lettermark on #665DF5 bg

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Background: #665DF5 squircle -->
  <rect x="0" y="0" width="1024" height="1024" rx="224" fill="#665DF5"/>

  <!-- Inner subtle gradient overlay -->
  <rect x="0" y="0" width="1024" height="1024" rx="224"
        fill="url(#topLight)" opacity="0.18"/>

  <defs>
    <linearGradient id="topLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="white"/>
      <stop offset="100%" stop-color="black"/>
    </linearGradient>
  </defs>

  <!-- Bold V lettermark — white, rounded strokes -->
  <polyline
    points="200,270 512,760 824,270"
    fill="none"
    stroke="white"
    stroke-width="142"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>"""

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

# ─── Generate iconset sizes ───────────────────────────────────────────────────
SIZES = [16, 32, 64, 128, 256, 512, 1024]

for size in SIZES:
    # 1x
    path = os.path.join(ICONSET_DIR, f'icon_{size}x{size}.png')
    cairosvg.svg2png(bytestring=SVG.encode(), write_to=path, output_width=size, output_height=size)
    print(f'  ✓ icon_{size}x{size}.png')

    # 2x (retina) — skip 1024 (no 2x needed)
    if size <= 512:
        path2x = os.path.join(ICONSET_DIR, f'icon_{size}x{size}@2x.png')
        cairosvg.svg2png(bytestring=SVG.encode(), write_to=path2x, output_width=size*2, output_height=size*2)
        print(f'  ✓ icon_{size}x{size}@2x.png')

# ─── Master icon.png (1024x1024) ─────────────────────────────────────────────
master_path = os.path.join(OUTPUT_DIR, 'icon.png')
cairosvg.svg2png(bytestring=SVG.encode(), write_to=master_path, output_width=1024, output_height=1024)
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
