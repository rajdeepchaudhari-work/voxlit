/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'app.voxlit',
  productName: 'Voxlit',
  copyright: 'Copyright © 2026 Voxlit Contributors',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: [
    'out/**/*',
    {
      from: 'resources/icons',
      to: 'resources/icons'
    },
    {
      from: 'resources/models',
      to: 'resources/models',
      filter: ['ggml-base.en.bin']
    },
    {
      from: 'resources/native',
      to: 'resources/native'
    },
    {
      from: 'src/main/db/migrations',
      to: 'migrations'
    }
  ],
  // Native addons and binaries must be unpacked from the asar archive
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
    'resources/native/**/*',
    'resources/binaries/**/*'
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['universal'] }],
    category: 'public.app-category.productivity',
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    icon: 'resources/icons/icon.icns'
  },
  dmg: {
    title: 'Voxlit ${version}',
    window: { width: 540, height: 380 }
  },
  afterSign: 'scripts/notarize.js',
  extraMetadata: {
    main: 'out/main/index.js'
  }
}
