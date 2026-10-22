# Kalali production-readiness roadmap

This roadmap separates improvements that can be made safely in the current browser prototype from capabilities that require a trusted backend and operational decisions.

## Implemented in this change set

- English and Arabic translation dictionaries are checked for top-level key parity by the prototype source check.
- Supplier bid entry includes a bilingual readiness checklist for price, delivery timeline, and payment terms.
- Buyer bid comparison displays a bilingual reminder to validate specifications, delivery capacity, quote validity, required certificates, and excluded bids before awarding.
- Award submission requires a rationale and the prototype stores it with the request. This is a usability aid only; browser storage is not an authoritative audit record.
- The Kalali Windows desktop wrapper uses Electron's isolated, sandboxed renderer and a versioned GitHub Releases update channel.

## Next phase: trusted workflow foundation

Do not connect real supplier or bid data until the following are implemented and independently tested.

1. **Identity and access**
   - Integrate an organization-approved identity provider using OIDC or SAML.
   - Enforce buyer, buyer approver, supplier, and administrator permissions on the server for every request.
   - Add MFA policy, session expiry/revocation, account recovery, and administrative access reviews.
   - Remove the demo role selector as a source of authorization.

2. **API and data model**
   - Introduce a versioned API and managed relational database, such as PostgreSQL.
   - Model organizations, users, supplier profiles, RFQs, invitations, bids, clarifications, approvals, awards, contracts, and attachments explicitly.
   - Add server-side schema validation, optimistic concurrency, idempotent submissions, database migrations, and tested backup/restore.
   - Define retention, deletion, residency, and disaster-recovery requirements with the business owner before choosing hosting.

3. **Audit and approvals**
   - Write append-only audit events on the server with actor identity, timestamps, entity identifiers, before/after values where appropriate, and award rationale.
   - Enforce separation of duties and configurable approval thresholds on the server.
   - Prevent changes to submitted bids after deadline except through a documented, permissioned workflow.
   - Record award decision evidence and keep the scoring model/version used for each decision.

4. **Supplier verification and documents**
   - Store documents in private object storage with short-lived authorized download links, malware scanning, size/type limits, and encryption.
   - Track each certificate's issuer, number, expiry, verification status, and verification source; never present demo seed data as verified evidence.
   - Provide clear missing-document, expired-document, and rejected-document explanations with resubmission steps.

5. **Notifications and operations**
   - Send email or in-app notifications for invitations, questions, deadline reminders, bid receipts, approval decisions, and contract milestones.
   - Add delivery retries, duplicate prevention, monitoring, support diagnostics, and alerting.
   - Use feature flags and staged rollout for new workflows; keep rollback and recovery procedures documented.

6. **Integration readiness**
   - Treat Etimad, ERP, identity, and ZATCA as separate integrations with their own authorized access, mapping, error handling, and acceptance tests.
   - Do not claim a connection or regulatory compliance until a real integration is implemented and validated against the applicable official requirements.
   - ZATCA e-invoicing requirements concern tax invoices and e-invoicing integration; they do not make this procurement prototype compliant by themselves.

## Acceptance criteria before live procurement use

- Role and organization isolation tests pass at the API layer, including attempts to access another organization's bids and documents.
- No real bid price, supplier document, or approval decision depends on browser local storage.
- Approval policy and award rationale are server-enforced and audit events cannot be edited by ordinary users.
- Backup restoration, incident response, access revocation, and release rollback have been rehearsed.
- Arabic and English journeys are usability-tested with Saudi buyers and suppliers, including keyboard navigation, screen readers, mobile layouts, dates, amounts, and mixed RTL/LTR identifiers.
- Security review, privacy review, legal/compliance review, and business owner sign-off are documented.

## Reference material

- ZATCA e-invoicing overview: https://zatca.gov.sa/en/E-Invoicing/Introduction/Pages/What-is-e-invoicing.aspx
- ZATCA e-invoicing FAQ: https://zatca.gov.sa/en/E-Invoicing/Introduction/FAQ/Pages/default.aspx?page=FAQ_022
- Electron security recommendations: https://www.electronjs.org/docs/latest/tutorial/security/
- electron-builder auto-update guide: https://www.electron.build/docs/features/auto-update/
