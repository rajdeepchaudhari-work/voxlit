#!/usr/bin/env node
/**
 * Copies extraResources (icons, native, migrations) directly into the built
 * app bundle after electron-builder finishes. This is needed because
 * electron-builder ignores extraResources when directories.app is an
 * external path outside the project root.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const root = path.resolve(__dirname, '..')
const appResources = path.join(root, 'dist/mac-arm64/voxlit.app/Contents/Resources')

if (!fs.existsSync(appResources)) {
  console.error('App bundle not found at dist/mac-arm64/voxlit.app')
  process.exit(1)
}

function cpDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isSymbolicLink()) {
      if (fs.existsSync(d)) fs.unlinkSync(d)
      fs.symlinkSync(fs.readlinkSync(s), d)
    } else if (entry.isDirectory()) {
      cpDir(s, d)
    } else {
      fs.copyFileSync(s, d)
    }
  }
}

// Copy icons
const iconsSrc = path.join(root, 'resources/icons')
if (fs.existsSync(iconsSrc)) {
  cpDir(iconsSrc, path.join(appResources, 'icons'))
  console.log('✓ patched icons/')
}

// Copy native helper
const nativeSrc = path.join(root, 'resources/native')
if (fs.existsSync(nativeSrc)) {
  cpDir(nativeSrc, path.join(appResources, 'native'))
  console.log('✓ patched native/')
}

// Copy migrations
const migrationsSrc = path.join(root, 'src/main/db/migrations')
if (fs.existsSync(migrationsSrc)) {
  cpDir(migrationsSrc, path.join(appResources, 'migrations'))
  console.log('✓ patched migrations/')
}

// Re-sign the app after modifying its bundle
console.log('› re-signing app...')
try {
  execSync(`codesign --force --deep --sign "VoxlitDev" "${path.join(root, 'dist/mac-arm64/voxlit.app')}"`, { stdio: 'inherit' })
  console.log('✓ re-signed')
} catch (e) {
  console.warn('⚠ re-sign failed (non-fatal):', e.message)
}

// Rebuild the DMG
console.log('› rebuilding DMG...')
const dmgPath = path.join(root, 'dist/voxlit-1.0.1-arm64.dmg')
if (fs.existsSync(dmgPath)) fs.rmSync(dmgPath)

try {
  execSync(
    `hdiutil create -volname "Voxlit" -srcfolder "${path.join(root, 'dist/mac-arm64/voxlit.app')}" -ov -format UDZO "${dmgPath}"`,
    { stdio: 'inherit' }
  )
  console.log('✓ DMG rebuilt at dist/voxlit-1.0.1-arm64.dmg')
} catch (e) {
  console.error('DMG rebuild failed:', e.message)
  process.exit(1)
}
