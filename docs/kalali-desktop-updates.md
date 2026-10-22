# Kalali desktop app and automatic updates

## What this adds

Kalali is packaged as a Windows x64 desktop app using Electron and electron-builder. The installed app opens the built React interface in its own window, has a Start Menu and optional Desktop shortcut, and checks GitHub Releases for updates at startup. Users can also choose Kalali → Check for Updates. When an update is downloaded, Kalali offers to restart and install it now or later.

The updater uses the public GitHub Releases feed for this repository. It does not require a GitHub token on users' laptops. Update files and metadata are downloaded over HTTPS and validated by electron-updater. Windows code signing is not configured in this repository yet; a production deployment should acquire a code-signing certificate and sign the installer and application to reduce SmartScreen warnings and strengthen publisher identity.

## First release

1. Merge the desktop-app pull request into main.
2. Ensure desktop/package.json has the intended release version (initially 1.0.0).
3. Create and push the matching version tag, e.g. v1.0.0.
4. GitHub Actions runs .github/workflows/release-desktop.yml, builds the web app, packages Kalali-Setup-1.0.0.exe, and publishes the installer plus update metadata to a GitHub Release.
5. Download the installer from the release's Assets section and install Kalali on the laptop.

The release workflow rejects a tag if its version does not match desktop/package.json. Only publish tags from reviewed, merged commits. Do not publish a release from an unreviewed feature branch.

## Shipping a patch

For a patch release, update desktop/package.json to the next version (for example 1.0.1), merge the change, then push tag v1.0.1 on that merged commit. GitHub Actions builds and publishes the installer and updater metadata. Existing installations check for the newer release automatically on startup and can install it after download. Version numbers must increase; do not overwrite a previously published release tag.

## Local development

From the repository root:

    npm ci
    npm run build
    cd desktop
    npm install
    npm start

The desktop shell loads the local dist/index.html. Development mode does not check for updates. To test the actual updater, install a packaged release and publish a newer version; a local Electron run is not a substitute for testing the installed NSIS app.

## Security and operational notes

- The renderer has Node integration disabled, context isolation enabled, sandboxing enabled, and navigation restricted to the bundled app. External GitHub links open in the system browser.
- Never embed a GitHub personal access token in the installer or renderer. The public release feed does not require one.
- The updater is for signed-off, versioned GitHub Releases, not every arbitrary source commit. Code review and release tags are the deployment gate.
- Automatic app updates do not migrate, back up, synchronize, or secure browser-local procurement data. The current prototype is still not suitable for real supplier records, confidential bids, or real award decisions.
- Before production procurement use, implement backend persistence, server-enforced authentication/authorization, server-side validation, tamper-resistant audit records, protected document storage, backup/restore, monitoring, and independent security testing.
