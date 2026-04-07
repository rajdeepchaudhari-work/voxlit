/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'app.voxlit',
  productName: 'Voxlit',
  copyright: 'Copyright © 2026 Voxlit Contributors',
  directories: {
    buildResources: 'resources',
    output: 'dist',
    // Clean temp dir created by scripts/stage-build.js — lives outside the project
    // root so electron-builder never bundles .whisper-src, .agents, Glaido.app, etc.
    app: '/tmp/voxlit-clean',
  },
  files: ['**/*', '!**/*.map'],
  // Files placed in Contents/Resources/ — accessible via process.resourcesPath
  extraResources: [
    { from: 'resources/icons', to: 'icons' },
    { from: 'resources/native', to: 'native' },
    { from: 'src/main/db/migrations', to: 'migrations' },
  ],
  // Native addon must be unpacked from ASAR to be loaded at runtime
  asarUnpack: [
    'node_modules/better-sqlite3/**/*',
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64'] }],
    category: 'public.app-category.productivity',
    gatekeeperAssess: false,
    identity: 'VoxlitDev',
    // hardenedRuntime requires an Apple Developer ID cert — off for local dev builds
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
