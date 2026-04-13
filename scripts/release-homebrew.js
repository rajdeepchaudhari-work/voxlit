#!/usr/bin/env node
/**
 * Updates the Homebrew cask at rajdeepchaudhari-work/homebrew-voxlit
 * to point at the just-released DMG (same version as package.json).
 *
 * Run after `npm run release`. Requires:
 *   - dist/voxlit-<version>-arm64.dmg present (from build:mac)
 *   - gh CLI authenticated with push access to homebrew-voxlit
 *
 * Usage: npm run release:homebrew
 */

const { execSync } = require('child_process')
const { existsSync, mkdtempSync, readFileSync, writeFileSync } = require('fs')
const { createHash } = require('crypto')
const { tmpdir } = require('os')
const path = require('path')

const pkg = require('../package.json')
const version = pkg.version
const repo = 'rajdeepchaudhari-work/homebrew-voxlit'

// 1. Verify the DMG is where we expect
const dmg = path.join(__dirname, '..', 'dist', `voxlit-${version}-arm64.dmg`)
if (!existsSync(dmg)) {
  console.error(`✗ DMG not found at ${dmg}`)
  console.error(`  Run 'npm run build:mac' first.`)
  process.exit(1)
}

// 2. Compute SHA256 of the DMG (Homebrew verifies this on install)
const hash = createHash('sha256').update(readFileSync(dmg)).digest('hex')
console.log(`› DMG sha256: ${hash}`)

// 3. Clone the tap repo, update the cask, commit, push
const work = mkdtempSync(path.join(tmpdir(), 'voxlit-tap-'))
const tap = path.join(work, 'homebrew-voxlit')

console.log(`› Cloning ${repo}...`)
execSync(`git clone --quiet "https://github.com/${repo}.git" "${tap}"`)

const caskPath = path.join(tap, 'Casks', 'voxlit.rb')
const existing = readFileSync(caskPath, 'utf8')

// Do two targeted rewrites — version line and sha256 line. Everything else is
// stable (url template uses #{version} so no separate URL update needed).
const updated = existing
  .replace(/version "[\d.]+"/,   `version "${version}"`)
  .replace(/sha256 "[a-f0-9]+"/, `sha256 "${hash}"`)

if (updated === existing) {
  console.error('✗ Cask file had no version/sha256 lines to replace — check format')
  process.exit(1)
}

writeFileSync(caskPath, updated)

// 4. Commit + push (bail if nothing changed, idempotent across re-runs)
try {
  execSync('git diff --quiet', { cwd: tap })
  console.log(`✓ Cask already at v${version} — nothing to push.`)
  process.exit(0)
} catch { /* has changes, continue */ }

const message = `Bump voxlit cask to v${version}\n\nsha256 ${hash}`
execSync(`git -C "${tap}" commit -am "${message.replace(/"/g, '\\"')}"`, { stdio: 'inherit' })
execSync(`git -C "${tap}" push origin main`, { stdio: 'inherit' })

console.log(`\n✓ Homebrew cask updated to v${version}`)
console.log(`  Users: brew upgrade --cask voxlit`)
