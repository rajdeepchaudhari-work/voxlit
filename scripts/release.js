#!/usr/bin/env node
/**
 * Publishes a GitHub release with the DMG + all electron-updater assets.
 *
 * Why this exists: a plain `gh release create <tag> <dmg>` uploads only the
 * DMG. electron-updater needs the .zip, .zip.blockmap, .dmg.blockmap AND
 * latest-mac.yml on the release to deliver auto-updates. Missing any of
 * those breaks auto-update for every user downstream.
 *
 * Usage: npm run release
 */

const { execSync } = require('child_process')
const { existsSync } = require('fs')
const path = require('path')
const pkg = require('../package.json')

const version = pkg.version
const tag = `v${version}`
const dist = path.join(__dirname, '..', 'dist')

const assets = [
  `voxlit-${version}-arm64.dmg`,
  `voxlit-${version}-arm64.dmg.blockmap`,
  `voxlit-${version}-arm64-mac.zip`,
  `voxlit-${version}-arm64-mac.zip.blockmap`,
  'latest-mac.yml',
]

// Sanity-check all assets exist before we touch the remote
const missing = assets.filter(a => !existsSync(path.join(dist, a)))
if (missing.length) {
  console.error('✗ Missing build outputs:')
  for (const m of missing) console.error('  -', m)
  console.error('\nRun `npm run build:mac` first.')
  process.exit(1)
}

// Generate a CycloneDX SBOM of the production dependencies and attach to release.
// npx with no-install ensures we don't pollute package.json — cyclonedx-npm fetches
// at runtime if missing. SBOM lets users and security scanners audit our dep tree.
const sbomPath = path.join(dist, `voxlit-${version}-sbom.cdx.json`)
console.log('› Generating CycloneDX SBOM…')
try {
  execSync(
    `npx --yes @cyclonedx/cyclonedx-npm --omit dev --omit optional --output-format json --output-file "${sbomPath}"`,
    { stdio: 'pipe', cwd: path.join(__dirname, '..') }
  )
  assets.push(path.basename(sbomPath))
  console.log('  ✓ SBOM generated')
} catch (err) {
  console.warn('  ! SBOM generation failed — continuing release without it:', err.message.split('\n')[0])
}

// Does the release already exist?
let releaseExists = false
try {
  execSync(`gh release view ${tag} --repo rajdeepchaudhari-work/voxlit`, { stdio: 'pipe' })
  releaseExists = true
} catch {}

// Assets array may include the SBOM (added above if generation succeeded).
// Re-filter against disk state in case SBOM failed silently.
const assetPaths = assets.filter(a => existsSync(path.join(dist, a))).map(a => path.join(dist, a))
const dmgLabel = `Voxlit-${version}-arm64.dmg`

if (releaseExists) {
  console.log(`› Updating existing release ${tag} with ${assets.length} assets`)
  execSync(`gh release upload ${tag} ${assetPaths.map(p => `"${p}"`).join(' ')} --clobber --repo rajdeepchaudhari-work/voxlit`, { stdio: 'inherit' })
} else {
  console.log(`› Creating release ${tag} with ${assets.length} assets`)
  const dmgArg = `"${path.join(dist, `voxlit-${version}-arm64.dmg`)}#${dmgLabel}"`
  const rest = assetPaths.filter(p => !p.endsWith(`voxlit-${version}-arm64.dmg`)).map(p => `"${p}"`).join(' ')
  execSync(
    `gh release create ${tag} ${dmgArg} ${rest} --title "${tag}" --latest --notes "See CHANGELOG for details." --repo rajdeepchaudhari-work/voxlit`,
    { stdio: 'inherit' }
  )
}

console.log(`\n✓ Released ${tag}`)
console.log(`  https://github.com/rajdeepchaudhari-work/voxlit/releases/tag/${tag}`)
