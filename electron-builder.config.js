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
    extendInfo: {
      // Required for AppleScript System Events calls from the Swift helper —
      // without this key, macOS silently denies Apple Events with no prompt.
      NSAppleEventsUsageDescription:
        'Voxlit uses System Events to paste transcribed text into the active application.',
      // Tell user why we need mic access
      NSMicrophoneUsageDescription:
        'Voxlit transcribes your speech into text when you hold the dictation hotkey.',
    },
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
