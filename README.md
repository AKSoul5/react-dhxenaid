# KALALI Procurement Prototype

A React demo for bilingual (English/Arabic) procurement flows, bid comparison, approvals, and supplier marketplace exploration.

## Run locally

Requirements: Node.js 20 or later and npm.

```sh
npm install --no-audit --no-fund
npm run check:prototype
npm test -- --watchAll=false
npm start
```

Create a production build with `npm run build`.

## Important limitations

This is a **prototype, not a production procurement system**. Demo role selection does not authenticate users or enforce permissions. Application records are stored in browser local storage, which is not a trusted or shared database. Seeded supplier details, prices, ratings, and certification claims are illustrative and are not verified evidence. The Etimad reference field is a demo field, not a live integration.

Do not enter real bid prices, supplier documents, personal data, credentials, or confidential procurement records. Do not use the app to award or approve real purchases.

Before production use, implement trusted backend persistence, server-side authentication and authorization, server-side validation and audit logging, secure document storage, and independent security review. See [SECURITY.md](SECURITY.md).

## Checks

The pull-request workflow runs source regression checks, React runtime smoke tests, and a production build. Dependabot is configured to propose weekly npm and GitHub Actions dependency updates. The current Create React App toolchain has known transitive dependency advisories; automated updates and a reviewed toolchain migration are still required before production deployment.

## Open in StackBlitz

[Edit in StackBlitz](https://stackblitz.com/~/github.com/AKSoul5/react-dhxenaid)
