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

for (const pkg of ['better-sqlite3', 'bindings', 'file-uri-to-path']) {
  const src = path.join(root, 'node_modules', pkg)
  if (fs.existsSync(src)) {
    console.log(`› node_modules/${pkg}`)
    cpDir(src, path.join(nm, pkg))
  }
}

console.log('✓ /tmp/voxlit-clean ready')
console.log('  contents:', fs.readdirSync(clean).join(', '))
