/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'app.voxlit',
  productName: 'Voxlit',
  copyright: 'Copyright © 2026 Voxlit Contributors',
  directories: {
    buildResources: 'resources',
    output: 'dist',
    // Clean staging dir outside project root — prevents dev files from being bundled
    app: '/tmp/voxlit-clean',
  },
  files: ['**/*', '!**/*.map'],
  // extraResources are staged into /tmp/voxlit-clean/extra/ by stage-build.js
  // and unpacked here via asar files exclusion so they land in Contents/Resources/
  extraResources: [
    { from: 'extra/icons', to: 'icons' },
    { from: 'extra/native', to: 'native' },
    { from: 'extra/migrations', to: 'migrations' },
  ],
  asarUnpack: ['node_modules/better-sqlite3/**/*'],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    category: 'public.app-category.productivity',
    gatekeeperAssess: false,
    identity: 'VoxlitDev',
    hardenedRuntime: false,
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
  },
  dmg: {
    title: 'Voxlit ${version}',
    window: { width: 540, height: 380 }
  },
  publish: [
    {
      provider: 'github',
      owner: 'rajdeepchaudhari-work',
      repo: 'voxlit',
      releaseType: 'release'
    }
  ],
  afterSign: 'scripts/notarize.js',
  extraMetadata: {
    main: 'out/main/index.js'
  }
}
