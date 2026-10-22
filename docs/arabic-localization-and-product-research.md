# Kalali Procurement UX and Market Research

**Prepared:** 22 October 2026  
**Scope:** Product review and implementation priorities for the current React prototype, based on the supplied screenshots, repository code, and public research. This is desk research, not interviews or validation with Kalali customers.

## Executive recommendation

Prioritize trust, comparability, and task completion over adding many features. The prototype already demonstrates request creation, bid comparison, local approval tasks, supplier profiles, and sample analytics. Its main product risks are incomplete localization, English-only user-generated data, unclear demo-vs-live status, and workflows that are not backed by a trusted shared service.

## What the current screenshots and code show

- The Arabic interface is right-to-left, but the comparison view still displays an English award confirmation and English request content such as “Sugar · 100 metric tons”.
- Some request records include Arabic companion fields, but new requests previously had only one title/specification field. This update adds optional Arabic title and specification inputs and localizes the award confirmation.
- The code and README describe browser-local prototype storage and demo roles. Those are not production authentication, a shared supplier portal, a live ERP connection, or a verified compliance check.
- Sample supplier scores, prices, certification claims, and market prices are illustrative. They should remain visibly marked as samples until supported by verified sources.

## Public research and implications

### 1. Arabic is a product behavior, not just translated labels

A Saudi-focused RTL design guide recommends natural Arabic copy, correct handling of mixed Arabic/Latin text, locale-aware dates and numerals, logical CSS properties, and testing real content with Arabic-speaking users. A separate Arabic product guide emphasizes complete-journey testing, a maintained terminology glossary, and checking language switching, forms, keyboard order, and responsive layouts.

**Implications for Kalali**
- Translate all system-owned text: banners, empty states, errors, badges, notifications, approval messages, dialogs, and tooltips.
- Support bilingual user-entered request titles and specifications rather than silently machine-translating commercial terms.
- Add a reviewed glossary for terms such as request for quotation, bid, award, local content, supplier qualification, payment terms, and delivery lead time.
- Keep supplier names, email addresses, tender references, product codes, and currency values isolated with correct bidirectional rendering.
- Keep the selected language when navigating and refreshing; announce document language and direction accurately.
- Test Arabic with long names, Latin product codes, both Arabic and Latin numerals in input, narrow screens, and keyboard navigation.

### 2. Buyer sourcing: comparability and decision traceability

A current sourcing/RFx buyer guide describes structured request templates, supplier invitations, centralized Q&A, standardized bid collection, multi-round clarification, lot-based and split awards, weighted scoring, and an auditable award process as important evaluation areas.

**Implications for Kalali**
- Create reusable RFQ templates with required fields, specification attachments, delivery location, quantity/unit, Incoterms where relevant, delivery window, warranty, payment terms, and response deadline.
- Normalize bids into comparable line items: unit price, total landed cost, tax treatment, shipping, lead time, minimum order quantity, validity period, and exclusions.
- Show the scoring formula, configured weights, missing-data treatment, disqualification reasons, and sensitivity to changing weights. Never imply a score is objective if inputs are self-reported or sample data.
- Add supplier Q&A with a shared clarification log and deadline extensions visible to all invited suppliers when policy requires.
- Support award rationale, reviewer comments, separation of duties, approval thresholds, and a tamper-evident server-side audit trail before production.
- Make it possible to compare split-award scenarios, not only a single winner, when supply capacity or risk calls for it.

### 3. Supplier onboarding and retention

Supplier onboarding guidance highlights collecting business/tax details, payment setup, compliance documents, risk review, and setting clear expectations. Procurement software buyer guidance also stresses mobile-friendly document upload, self-service profile updates, progress indicators, reminders, multilingual support, and avoiding unnecessary registration friction.

**Implications for Kalali**
- Use a staged onboarding checklist with save-and-resume, progress, clear reasons for each requested document, and expiry reminders.
- Let suppliers maintain company profile, product categories, capacity, service regions, delivery lead times, certifications, and payment preferences once, then reuse the data across bids.
- Show a bid-readiness checklist before submission and explain precisely what blocks submission.
- Give suppliers status visibility: draft, submitted, clarification requested, under evaluation, shortlisted, awarded, unsuccessful, withdrawn.
- Provide a clear reason and appropriate feedback when a bid is rejected, subject to the buyer's confidentiality policy.
- Design for mobile, low-bandwidth conditions, accessible form errors, and bilingual transactional notifications.

### 4. Saudi compliance and integrations

ZATCA states that human-readable tax invoice fields must be in Arabic; invoices may also include English. Its e-invoicing integration phase is implemented in waves for targeted taxpayers, with notifications and technical requirements. The prototype's ZATCA/Fatoora labels must not be presented as proof of compliance or a live integration.

**Implications for Kalali**
- Treat compliant tax invoicing as a future integration project with a qualified implementation partner and a documented scope; do not label the prototype “ZATCA compliant”.
- Distinguish a document uploaded by a supplier, a buyer-reviewed document, a third-party-verified credential, and a live authority/system validation.
- Build a compliance matrix for applicable VAT/e-invoicing, procurement policies, data privacy, retention, access controls, and records before handling real transactions.
- Only advertise Etimad, ZATCA/Fatoora, SABER, or local-content validation integrations once the relevant access, technical work, and end-to-end testing exist.

## Prioritized product roadmap

### P0 — Before any real procurement use
1. Complete Arabic/English parity for every system-owned string and add automated missing-key checks.
2. Replace browser-only storage with a secure shared backend, server-side validation, authentication, role-based authorization, and server-side audit records.
3. Establish real supplier identity and document verification; mark unverified/self-reported information distinctly.
4. Review procurement approval separation, scoring governance, data privacy, security, backups, and incident response.
5. Remove any UI wording that could be mistaken for a live ERP, Etimad, ZATCA, or certification integration.

### P1 — Highest-value usability improvements
1. Arabic-first request creation with bilingual title/specification fields and reviewed terminology.
2. Guided RFQ creation, reusable templates, inline examples, required-field explanations, and save-as-draft.
3. Buyer bid comparison with landed-cost normalization, configurable weights, transparent scoring, exclusion reasons, and award rationale.
4. Supplier onboarding checklist, save/resume, document expiry reminders, and self-service profile updates.
5. Unified activity center with actionable notifications, clear deadlines, and unread-state handling.
6. Responsive mobile experience, accessible focus states, semantic labels, and keyboard testing in both directions.

### P2 — Differentiation after validating demand
1. Split awards and multi-lot sourcing.
2. Scenario comparison for cost, delivery, capacity, and supplier concentration.
3. Contract milestones, delivery confirmations, service-level tracking, and renewal reminders.
4. Supplier performance scorecards based on actual, explainable delivery/quality data—not opaque reputation scores.
5. Buyer/supplier messaging with a searchable clarification history.
6. Integrations and analytics only after source data, ownership, and governance are defined.

## Suggested discovery and validation plan

Run short, moderated usability sessions separately with buyers, approvers, and suppliers, including Arabic-first participants. Ask each participant to complete: (1) create a request, (2) submit or revise a bid, (3) compare bids and explain the recommended choice, and (4) find the status/reason for an award decision. Observe completion and errors rather than relying only on opinions.

Measure:
- Task completion and time-on-task by role and language.
- Form abandonment and validation errors.
- Supplier onboarding completion and bid submission success.
- Clarification volume and missed deadlines.
- Buyer time to compare bids and document an award rationale.
- Accessibility and mobile usability defects.
- Percentage of supplier claims that are verified versus self-reported.

Do not set arbitrary success targets until a baseline is measured. Compare the results of the Arabic and English journeys, and use the findings to prioritize further changes.

## Sources

- True Ventures, “Arabic RTL Design Done Right” (21 July 2026): https://truevs.sa/en/blog/arabic-rtl-ux-design/
- Medyard Online, “Building digital products in Arabic: a guide to UX, content and RTL” (September 2026): https://medyardonline.com/insights/en/arabic-first-digital-products/
- Commercial.ai, “Buyer’s Guide to Sourcing & RFx Software in Procurement” (2026): https://commercial.ai/guides/procurement/sourcing-and-rfx
- Commercial.ai, “Supplier Management Software Buyer’s Guide” (9 September 2026): https://commercial.ai/guides/procurement/supplier-management
- Stripe, “Supplier and vendor onboarding: A quick guide” (4 September 2025): https://stripe.com/resources/more/supplier-and-vendor-onboarding
- ZATCA, “Frequently Asked Questions — E-Invoicing”: https://zatca.gov.sa/en/E-Invoicing/Introduction/FAQ/Pages/default.aspx?page=FAQ_022
- ZATCA, “What is E-Invoicing?”: https://zatca.gov.sa/en/E-Invoicing/Introduction/Pages/What-is-e-invoicing.aspx
- ZATCA, “Wave 25 for E-invoicing Integration Phase” (24 July 2026): https://zatca.gov.sa/en/MediaCenter/News/Pages/Wave25-E-invoicing.aspx

**Evidence limits:** Vendor buyer guides and design-agency articles are useful for generating hypotheses, not neutral proof that every feature will be valuable to Kalali's users. Validate priorities with actual buyers and suppliers in the target sectors.
