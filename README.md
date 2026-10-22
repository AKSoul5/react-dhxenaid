# KALALI Procurement Prototype

A React demo for bilingual (English/Arabic) procurement flows, bid comparison, approvals, and supplier marketplace exploration. The frontend uses Vite and Vitest rather than the deprecated Create React App toolchain.

## Run locally

Requirements: Node.js 22.12 or later and npm.

```sh
npm ci --no-audit --no-fund
npm run check:prototype
npm test
npm start
```

Create a production build with `npm run build`. Preview it locally with `npm run preview`.

## Kalali desktop app (Windows)

A Windows desktop wrapper and GitHub Release updater are being introduced in this repository. The desktop app packages the built React interface in an Electron window and checks for newer published releases on startup. Users can also select **Kalali → Check for Updates**. The updater downloads a published patch and offers to restart to install it.

For local desktop development, first build the web app, then run:

```sh
npm run build
cd desktop
npm install
npm start
```

For the first installer, merge the desktop implementation, then create a version tag matching `desktop/package.json` (initial version `v1.0.0`). The release workflow builds and publishes the Windows installer and updater metadata to GitHub Releases. See [the desktop release and update guide](docs/kalali-desktop-updates.md) for initial installation and patch-release steps.

The updater only installs versioned GitHub Releases, not arbitrary commits. Windows code signing is not configured yet; plan to add a signing certificate before broad distribution.

## Important limitations

This is a **prototype, not a production procurement system**. Demo role selection does not authenticate users or enforce permissions. Application records are stored in browser local storage, which is not a trusted or shared database. Seeded supplier details, prices, ratings, and certification claims are illustrative and are not verified evidence. The Etimad reference field is a demo field, not a live integration.

Do not enter real bid prices, supplier documents, personal data, credentials, or confidential procurement records. Do not use the app to award or approve real purchases.

Before production use, implement trusted backend persistence, server-side authentication and authorization, server-side validation and audit logging, secure document storage, and independent security review. See [SECURITY.md](SECURITY.md).

## Checks and dependency hygiene

The pull-request workflow runs source regression checks, Vitest runtime smoke tests, a production build, and publishes an npm audit report. The lockfile is committed and CI uses `npm ci`. Dependabot proposes weekly npm and GitHub Actions updates, and CodeQL scans JavaScript on pull requests and weekly. Continue reviewing audit output and dependency updates; passing tests do not mean the application is production-secure.

## Open in StackBlitz

[Edit in StackBlitz](https://stackblitz.com/~/github.com/AKSoul5/react-dhxenaid)
