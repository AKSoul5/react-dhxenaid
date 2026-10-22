# Security policy

## Scope

This repository is a browser-local procurement prototype. The demo role selector is not authentication, role-based access control, or an authorization boundary. Records stored in browser local storage can be read or changed by the person using that browser and are not a trusted system of record.

**Do not enter real supplier personal data, confidential bid prices, contracts, credentials, or other sensitive procurement information.** Do not use this prototype to make or approve real purchasing decisions.

## Reporting a vulnerability

Please report suspected security issues privately to the repository owner through GitHub's private vulnerability reporting feature, if enabled. Do not publish exploit details or sensitive data in a public issue.

## Before production use

A production deployment requires, at minimum:

- Server-side authentication and authorization enforced on every protected operation.
- Trusted server-side persistence with tenant and supplier isolation.
- Server-side validation of bids, award decisions, approvals, and audit events.
- Secure handling of supplier documents and secrets, with access controls and retention policies.
- Dependency review, reproducible builds, automated security scanning, and independent security testing.
