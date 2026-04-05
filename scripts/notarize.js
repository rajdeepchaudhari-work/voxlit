// electron-builder afterSign hook — called after code signing, before DMG creation.
// Notarizes the app using Apple's notarytool (requires APPLE_ID, APPLE_TEAM_ID,
// APPLE_APP_SPECIFIC_PASSWORD env vars set as CI secrets).
const { notarize } = require('@electron/notarize')
const path = require('path')

module.exports = async (context) => {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName !== 'darwin') return

  // Skip notarization in local dev builds
  if (!process.env.APPLE_ID) {
    console.log('Skipping notarization — APPLE_ID not set')
    return
  }

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)

  console.log(`Notarizing ${appPath}...`)

  await notarize({
    tool: 'notarytool',
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  })

  console.log('Notarization complete.')
}
