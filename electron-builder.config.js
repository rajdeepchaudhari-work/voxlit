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
  extraResources: [
    { from: `${__dirname}/resources/icons`, to: 'icons' },
    { from: `${__dirname}/resources/native`, to: 'native' },
    { from: `${__dirname}/src/main/db/migrations`, to: 'migrations' },
  ],
  asarUnpack: ['node_modules/better-sqlite3/**/*'],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    category: 'public.app-category.productivity',
    gatekeeperAssess: false,
    identity: 'VoxlitDev',
    hardenedRuntime: false,
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
