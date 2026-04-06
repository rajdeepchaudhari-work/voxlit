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
fs.copyFileSync(path.join(root, 'package.json'), path.join(clean, 'package.json'))

console.log('› out/')
cpDir(path.join(root, 'out'), path.join(clean, 'out'))

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
