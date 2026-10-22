const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const appPath = path.join(__dirname, "..", "src", "App.jsx");
const source = fs.readFileSync(appPath, "utf8");
const i18nStart = source.indexOf("const I18N =");
const arabicStart = source.indexOf("\n  ar: {", i18nStart);
const i18nEnd = source.indexOf("\n};", arabicStart);
assert.ok(i18nStart >= 0 && arabicStart > i18nStart && i18nEnd > arabicStart, "I18N locale boundaries must exist");
const locales = {
  en: source.slice(i18nStart, arabicStart),
  ar: source.slice(arabicStart, i18nEnd),
};
const requiredKeys = [
  "buyerPrefersLabel", "previousBidLabel", "floorLabel",
  "supplierHashLabel", "answeredByLabel", "buyerRoleLabel",
  "recommendedBadge", "anonExplainer", "placeholderRequestTitle",
  "placeholderQuantity", "placeholderBudgetMin", "placeholderBudgetMax",
  "placeholderSpecs", "placeholderBidPrice", "placeholderBidDelivery",
  "fieldProposalNotes", "placeholderProposalNotes", "placeholderFloorPrice",
  "compareRankingNote", "compareDisclaimer", "priceScoreFormula",
  "priceScoreUnavailable", "lcgpaMinimumLabel", "highestScoreAtLabel",
  "winnerSaudiContentLabel", "winnerSaudiContentThreshold",
  "submitForApprovalBtn", "submittedForApprovalTitle", "approvalTaskExplainer",
  "purchaseOrderSummary", "reviewBeforeSubmitting", "historicalBidsLabel",
  "historicalContractsLabel", "historicalWinRateLabel", "locationLabel",
  "capacityLabel", "lcgpaVerified", "selfReported", "belowLcgpa30",
  "lowLabel", "highLabel", "sampleBadge", "perMtLabel", "per1000Label",
  "expiresLabel", "openRequestsTitle", "matchingRequestsCount",
  "placeholderSearchRequests", "requiredCertsFilterLabel", "paymentTermsFilterLabel",
  "authProductTagline", "authSubTagline", "authIntro", "authFooter",
  "analyticsSubtitle", "daySuffix", "etimadRefTitle",
];
for (const [locale, text] of Object.entries(locales)) {
  for (const key of requiredKeys) {
    assert.match(text, new RegExp("^\\s{4}" + key + ":", "m"), locale + " missing I18N key " + key);
  }
  for (const key of [
    "supplierUnavailable", "supplierBlacklisted", "mandatoryListNotConfirmed",
    "missingCert", "expiredCert", "unverifiedCert", "localContentBelow",
  ]) {
    assert.ok(text.includes(key + ":"), locale + " missing disqualification reason " + key);
  }
  for (const key of [
    "requestPostedNotification", "bidUpdatedNotification", "bidSubmittedNotification",
    "negotiationClosedNotification", "bidWithdrawnNotification",
    "awardApprovalRequestedNotification", "awardApprovedNotification",
    "clarificationAnsweredNotification",
  ]) {
    assert.ok(text.includes(key + ":"), locale + " missing notification template " + key);
  }
}
assert.match(source, /const SCHEMA_VERSION = 8;/);
assert.match(source, /STORAGE_KEY = "kalali-prototype-v1"/);
assert.match(source, /const malformedCoreRecords =/);
assert.match(source, /parsed\.requests\.some\(/);
assert.match(source, /parsed\.bids\.some\(/);
assert.match(source, /parsed\.auditLog\.some\(/);
assert.match(source, /legacyReasonToObject/);
assert.match(source, /status: \["reviewing", "disqualified"\]\.includes\(bid\.status\)/);
assert.match(source, /String\(template \?\? "\[missing translation\]"\)/);
assert.match(source, /date == null \|\| date === ""/);
assert.match(source, /iso == null \|\| iso === ""/);
assert.match(source, /riskFlagLabel\(supplier\.riskFlag, lang\)/);
assert.match(source, /riskFlagLabel\(bid\.supplier\.riskFlag, lang\)/);
assert.doesNotMatch(source, /<RiskFlag msg=\{supplier\.riskFlag\} \/>/);
assert.doesNotMatch(source, /<RiskFlag msg=\{bid\.supplier\.riskFlag\} \/>/);
assert.match(source, /data-ltr style=\{\{ display: "inline-block" \}\}>\{I18N\[lang\]\.authProductTagline\}/);
assert.match(source, /data-ltr style=\{\{ display: "inline-block" \}\}>\{I18N\[lang\]\.authSubTagline\}/);
assert.match(source, /supplierName\(c\.supplier, lang\)/);
assert.match(source, /supplierName\(contract\.supplier, lang\)/);
assert.match(source, /\{c\.daysLeft\} \{t\.daySuffix\}/);
assert.equal(source.split("Etimad Ref").length - 1, 1, "raw Etimad Ref label should exist only in the translation dictionary");
console.log("Prototype source checks passed: " + requiredKeys.length + " bilingual keys per locale plus schema, migration, date, LTR, risk, and supplier-rendering guards.");
