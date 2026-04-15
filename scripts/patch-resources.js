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

// Bundle name follows package.json "productName" (=> 'Voxlit.app') or falls
// back to "name" (=> 'voxlit.app') — support both to stay compatible with
// older builds that shipped as voxlit.app before productName was set.
const distMacDir = path.join(root, 'dist/mac-arm64')
const bundleName = ['Voxlit.app', 'voxlit.app'].find((n) =>
  fs.existsSync(path.join(distMacDir, n))
)
if (!bundleName) {
  console.error('App bundle not found in', distMacDir)
  process.exit(1)
}
const appPath = path.join(distMacDir, bundleName)
const appResources = path.join(appPath, 'Contents', 'Resources')

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

// Copy whisper-cli binaries (local-engine users need these at runtime).
const binariesSrc = path.join(root, 'resources/binaries')
if (fs.existsSync(binariesSrc)) {
  cpDir(binariesSrc, path.join(appResources, 'binaries'))
  console.log('✓ patched binaries/')
}

// Re-sign the app after modifying its bundle
console.log('› re-signing app...')
try {
  execSync(`codesign --force --deep --sign "VoxlitDev" "${appPath}"`, { stdio: 'inherit' })
  console.log('✓ re-signed')
} catch (e) {
  console.warn('⚠ re-sign failed (non-fatal):', e.message)
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// ── Rebuild the DMG ─────────────────────────────────────────────────────────
console.log('› rebuilding DMG...')
const dmgPath = path.join(root, `dist/voxlit-${pkg.version}-arm64.dmg`)
if (fs.existsSync(dmgPath)) fs.rmSync(dmgPath)
try {
  execSync(
    `hdiutil create -volname "Voxlit" -srcfolder "${appPath}" -ov -format UDZO "${dmgPath}"`,
    { stdio: 'inherit' }
  )
  console.log(`✓ DMG rebuilt at dist/voxlit-${pkg.version}-arm64.dmg`)
} catch (e) {
  console.error('DMG rebuild failed:', e.message)
  process.exit(1)
}

// ── Rebuild the ZIP (used by electron-updater) ──────────────────────────────
// Without this, auto-updates ship a ZIP that pre-dates the patch step —
// missing native/, migrations/, and the new signature. New installs via DMG
// work, but every existing user who updates gets a broken install.
console.log('› rebuilding ZIP for auto-updater...')
const zipPath = path.join(root, `dist/voxlit-${pkg.version}-arm64-mac.zip`)
const blockmapPath = `${zipPath}.blockmap`
if (fs.existsSync(zipPath)) fs.rmSync(zipPath)
if (fs.existsSync(blockmapPath)) fs.rmSync(blockmapPath)
try {
  execSync(
    `ditto -c -k --keepParent "${appPath}" "${zipPath}"`,
    { stdio: 'inherit' }
  )
  console.log(`✓ ZIP rebuilt at dist/voxlit-${pkg.version}-arm64-mac.zip`)
} catch (e) {
  console.error('ZIP rebuild failed:', e.message)
  process.exit(1)
}

// ── Regenerate latest-mac.yml so SHA512 + size match the new ZIP ────────────
// electron-updater verifies the downloaded ZIP against this file. Stale hashes
// = signature failure = stuck install.
console.log('› regenerating latest-mac.yml...')
const crypto = require('crypto')
const ymlPath = path.join(root, 'dist/latest-mac.yml')
const zipBuf = fs.readFileSync(zipPath)
const dmgBuf = fs.readFileSync(dmgPath)
const sha512 = (buf) => crypto.createHash('sha512').update(buf).digest('base64')
const zipName = path.basename(zipPath)
const dmgName = path.basename(dmgPath)
const yml = [
  `version: ${pkg.version}`,
  `files:`,
  `  - url: ${zipName}`,
  `    sha512: ${sha512(zipBuf)}`,
  `    size: ${zipBuf.length}`,
  `  - url: ${dmgName}`,
  `    sha512: ${sha512(dmgBuf)}`,
  `    size: ${dmgBuf.length}`,
  `path: ${zipName}`,
  `sha512: ${sha512(zipBuf)}`,
  `releaseDate: '${new Date().toISOString()}'`,
  '',
].join('\n')
fs.writeFileSync(ymlPath, yml)
console.log('✓ latest-mac.yml regenerated with fresh hashes')

// Restore evicted dirs back to project root
const EVICT = [
  { tmp: '.whisper-src-evicted',    dst: '.whisper-src' },
  { tmp: '.agents-evicted',         dst: '.agents' },
  { tmp: '.claude-evicted',         dst: '.claude' },
  { tmp: 'Glaido.app-evicted',      dst: 'Glaido.app' },
  { tmp: 'models-evicted',          dst: 'resources/models' },
  { tmp: 'native-.build-evicted',   dst: 'native/.build' },
]
for (const { tmp, dst } of EVICT) {
  const src = path.join('/tmp', tmp)
  const dstPath = path.join(root, dst)
  if (fs.existsSync(src) && !fs.existsSync(dstPath)) {
    fs.mkdirSync(path.dirname(dstPath), { recursive: true })
    fs.renameSync(src, dstPath)
    console.log(`› restored ${dst}`)
  }
}
