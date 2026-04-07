#!/usr/bin/env node
/**
 * Creates /tmp/voxlit-clean/ with ONLY what the packaged app needs.
 * electron-builder is then pointed at this directory via directories.app,
 * so it can never accidentally bundle dev files from the project root.
 */

const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const clean = '/tmp/voxlit-clean'

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true })
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

// Move large dev-only dirs out of project root so electron-builder can't sweep them in.
// They are gitignored but physically present — electron-builder's file scanner finds them.
const EVICT = [
  { src: '.whisper-src',     tmp: '.whisper-src-evicted' },
  { src: '.agents',          tmp: '.agents-evicted' },
  { src: '.claude',          tmp: '.claude-evicted' },
  { src: 'Glaido.app',       tmp: 'Glaido.app-evicted' },
  { src: 'resources/models', tmp: 'models-evicted' },
  { src: 'native/.build',    tmp: 'native-.build-evicted' },
]
for (const { src, tmp } of EVICT) {
  const srcPath = path.join(root, src)
  const tmpPath = path.join('/tmp', tmp)
  if (fs.existsSync(srcPath)) {
    if (fs.existsSync(tmpPath)) fs.rmSync(tmpPath, { recursive: true, force: true })
    fs.renameSync(srcPath, tmpPath)
    console.log(`› evicted ${src} → /tmp/${tmp}`)
  }
}

console.log('› Cleaning /tmp/voxlit-clean')
rmrf(clean)
fs.mkdirSync(clean)

console.log('› package.json')
// Write a minimal package.json — only what the packaged app needs at runtime.
// Copying the full package.json causes electron-builder to npm-install all
// devDependencies into the staging dir, bloating the DMG to 3.5GB+.
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const minimalPkg = {
  name: rootPkg.name,
  version: rootPkg.version,
  description: rootPkg.description,
  main: rootPkg.main,
  author: rootPkg.author,
  license: rootPkg.license,
  repository: rootPkg.repository,
  dependencies: {
    'better-sqlite3': rootPkg.dependencies['better-sqlite3']
  }
}
fs.writeFileSync(path.join(clean, 'package.json'), JSON.stringify(minimalPkg, null, 2))

console.log('› out/')
cpDir(path.join(root, 'out'), path.join(clean, 'out'))

// Remove build artifacts that must not end up in the ASAR
for (const artifact of [
  'out/tsconfig.node.tsbuildinfo',
  'out/tsconfig.web.tsbuildinfo',
]) {
  const p = path.join(clean, artifact)
  if (fs.existsSync(p)) fs.rmSync(p)
}

const nm = path.join(clean, 'node_modules')
fs.mkdirSync(nm)

// Symlink electron so electron-builder can detect the version
const electronSrc = path.join(root, 'node_modules', 'electron')
const electronDst = path.join(nm, 'electron')
if (fs.existsSync(electronSrc) && !fs.existsSync(electronDst)) {
  fs.symlinkSync(electronSrc, electronDst)
  console.log('› node_modules/electron (symlink)')
}

for (const pkg of ['better-sqlite3', 'bindings', 'file-uri-to-path']) {
  const src = path.join(root, 'node_modules', pkg)
  if (fs.existsSync(src)) {
    console.log(`› node_modules/${pkg}`)
    cpDir(src, path.join(nm, pkg))
  }
}

// Copy resources that electron-builder needs to bundle into the app
// These go into staging so extraResources paths resolve correctly from directories.app
fs.mkdirSync(path.join(clean, 'resources'), { recursive: true })

// entitlements
const entitlementsSrc = path.join(root, 'resources', 'entitlements.mac.plist')
if (fs.existsSync(entitlementsSrc)) {
  fs.copyFileSync(entitlementsSrc, path.join(clean, 'resources', 'entitlements.mac.plist'))
  console.log('› resources/entitlements.mac.plist')
}

// icon.icns at buildResources root
const iconSrc = path.join(root, 'resources', 'icons', 'icon.icns')
if (fs.existsSync(iconSrc)) {
  fs.copyFileSync(iconSrc, path.join(clean, 'resources', 'icon.icns'))
  console.log('› resources/icon.icns')
}

// extra/ — these become extraResources (Contents/Resources/) in the app
// Placed at staging root so electron-builder resolves them from directories.app
fs.mkdirSync(path.join(clean, 'extra'), { recursive: true })

// icons/ folder (tray icon, dock icon)
const iconsDirSrc = path.join(root, 'resources', 'icons')
if (fs.existsSync(iconsDirSrc)) {
  cpDir(iconsDirSrc, path.join(clean, 'extra', 'icons'))
  console.log('› extra/icons/')
}

// native/ folder (Swift helper binary)
const nativeSrc = path.join(root, 'resources', 'native')
if (fs.existsSync(nativeSrc)) {
  cpDir(nativeSrc, path.join(clean, 'extra', 'native'))
  console.log('› extra/native/')
}

// DB migrations
const migrationsSrc = path.join(root, 'src', 'main', 'db', 'migrations')
if (fs.existsSync(migrationsSrc)) {
  cpDir(migrationsSrc, path.join(clean, 'extra', 'migrations'))
  console.log('› extra/migrations/')
}

console.log('✓ /tmp/voxlit-clean ready')
console.log('  contents:', fs.readdirSync(clean).join(', '))
