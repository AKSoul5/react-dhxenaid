import React from "react";
import "./style.css";

import { useState, useEffect } from "react";

const I18N = {
  en: {
    dashboard: "Dashboard",
    marketplace: "Marketplace",
    compare: "Bid Comparison",
    compareRankingNote: "Eligible bids are ranked using the buyer-configured request weights.",
    buyerDecisionReviewTitle: "Before you award",
    buyerDecisionReviewBody: "Confirm specification compliance, delivery capacity, quote validity, required certificates, and any excluded bids. A high score is a decision aid, not a substitute for due diligence.",
    compareDisclaimer: "Seeded prices, ratings, and certification claims are illustrative demo data, not verified supplier evidence.",
    priceScoreFormula: "100 − (distance from SAR {midpoint} midpoint ÷ midpoint × 100), clamped to 0–100.",
    priceScoreUnavailable: "Unavailable without a complete budget range; the remaining criteria are rescaled.",
    lcgpaMinimumLabel: "LCGPA minimum:",
    highestScoreAtLabel: "— highest overall score at",
    winnerSaudiContentLabel: "Winner Saudi content",
    winnerSaudiContentThreshold: "(threshold {n}%)",
    analytics: "Analytics",
    approvalInbox: "Approval Inbox",
    marketplaceSupplier: "Browse Requests",
    openRequestsTitle: "Open Requests",
    matchingRequestsCount: "{n} matching procurement requests",
    placeholderSearchRequests: "Search requests...",
    requiredCertsFilterLabel: "Required certifications:",
    paymentTermsFilterLabel: "Payment terms:",
    anonymousBuyer: "Anonymous Buyer",
    reverseAuctionChip: "REVERSE AUCTION · Round {n}",
    etimadRefLabel: "Etimad Ref",
    etimadRefTitle: "Demo reference field; not a live Etimad integration.",
    authProductTagline: "Procurement Intelligence Platform",
    authSubTagline: "B2B Supply Chain Marketplace · KSA",
    authIntro: "Choose a demo role. This prototype has no real accounts or authentication; changes are saved only in this browser.",
    authFooter: "Demo data is stored locally on this device",
    login: "Enter the prototype",
    buyerAdmin: "Buyer Admin Demo",
    buyerApprover: "Buyer Approver Demo",
    supplierSales: "Supplier Sales Demo",
    notificationAria: "Notifications",
    logout: "Out",
    langToggle: "AR",
    notificationsTitle: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No notifications yet.",
    storageWarningPrefix: "Could not save prototype data:",
    postRequest: "+ Post Request",
    newRequestTitle: "Post Supply Request",
    fieldTitle: "Request Title",
    fieldTitleArabic: "Arabic title (optional)",
    fieldSpecsArabic: "Arabic specifications (optional)",
    placeholderTitleArabic: "Enter the request title in Arabic",
    placeholderSpecsArabic: "Add Arabic delivery, quality, or compliance requirements",
    awardPendingDemo: "Award saved locally as pending approval. This demo has no approval workflow or ERP connection.",
    awardRationaleLabel: "Award rationale (required)",
    awardRationalePlaceholder: "Explain the decision using price, quality, delivery, capacity, or compliance evidence.",
    awardRationaleRequired: "Add a short rationale before submitting this award for approval.",
    sampleVerifiedBadge: "Sample: verified",
    preferredSupplierBadge: "★ Preferred",
    awardedStatusBadge: "Awarded",
    noSpecsProvided: "No additional specifications provided.",
    placeholderRequestTitle: "e.g. Sugar (Refined White) — Bulk",
    fieldCategory: "Category",
    fieldQuantity: "Quantity",
    placeholderQuantity: "e.g. 200 metric tons",
    fieldBudgetMin: "Budget Min (SAR)",
    placeholderBudgetMin: "310,000",
    fieldBudgetMax: "Budget Max (SAR)",
    placeholderBudgetMax: "380,000",
    fieldMinLocalContent: "Minimum Saudi Content (LCGPA %)",
    fieldScoringWeights: "Bid Scoring Weights (%) — must total 100%",
    fieldRequiredCerts: "Required Certifications",
    fieldPaymentTerms: "Payment Terms Preference",
    fieldSpecs: "Specifications",
    placeholderSpecs: "Grade, delivery location, compliance standards...",
    postAnonymously: "Post Anonymously",
    recommendedBadge: "Recommended",
    anonExplainer: "Your company identity is hidden from all suppliers. Prevents competitors from mapping your supply chain.",
    cancel: "Cancel",
    post: "Post Request",
    requestPosted: "Request Posted",
    requestPostedNote: "Your request is now visible to suppliers in this browser prototype.",
    done: "Done",
    submitBid: "Submit Bid",
    updateBid: "Update Bid",
    counterOffer: "Counter-Offer",
    bidSubmitted: "Bid Submitted",
    bidSubmittedNote: "The buyer can review your proposal in the comparison view.",
    bidUpdated: "Bid Updated",
    awardSubmittedNote: "The award and contract have been saved to this browser's prototype data.",
    submitForApprovalBtn: "Submit for Approval",
    submittedForApprovalTitle: "Submitted for Approval",
    approvalTaskExplainer: "Submitting creates a local approval task assigned to the buyer approver role.",
    purchaseOrderSummary: "Purchase Order Summary",
    reviewBeforeSubmitting: "Review before submitting for internal approval",
    fieldYourPrice: "Your Price (SAR)",
    placeholderBidPrice: "e.g. 334000",
    fieldDelivery: "Delivery Timeline",
    placeholderBidDelivery: "e.g. 9 days from award",
    fieldProposalNotes: "Proposal Notes",
    placeholderProposalNotes: "Certifications, capacity, references, special conditions...",
    supplierBidReadinessTitle: "Bid readiness checklist",
    supplierBidReadinessHint: "Complete the essentials below before submitting your proposal.",
    supplierBidPriceReady: "A valid price is entered",
    supplierBidDeliveryReady: "A delivery timeline is entered",
    supplierBidPaymentReady: "Payment terms are selected",
    supplierBidReadinessCount: "{ready} of {total} essentials ready",
    qaButton: "Q&A",
    qaTitle: "Public Q&A",
    supplierHashLabel: "Supplier #",
    answeredByLabel: "Answered by",
    buyerRoleLabel: "Buyer",
    askQuestion: "Ask",
    answerQuestion: "Answer",
    awardContract: "Award Contract",
    award: "Award",
    recommended: "Recommended:",
    disqualified: "Disqualified",
    disqualifyReasons: {
      supplierUnavailable: "Supplier profile is unavailable.",
      supplierBlacklisted: "Supplier is blacklisted.",
      mandatoryListNotConfirmed: "Product category is on the LCGPA Mandatory List; supplier has not confirmed domestic product status.",
      missingCert: "Missing required {name} certification.",
      expiredCert: "{name} certification expired.",
      unverifiedCert: "{name} certification is not verified.",
      localContentBelow: "Saudi content {actual}% is below the required {required}%.",
    },
    viewProfile: "Profile",
    viewCards: "Cards",
    viewTable: "Table",
    filterByCert: "Filter by certification:",
    filterByPayment: "Filter by payment terms:",
    allTerms: "All Terms",
    approveAward: "Approve Award",
    pendingApproval: "Pending approval",
    approvedStatus: "Approved",
    resetDemoData: "Reset demo data",
    confirmReset: "Clear saved changes and restore demo data?",
    reset: "Reset",
    errTitleRequired: "A request title and quantity are required.",
    errBudgetBounds: "Enter both budget bounds so the price score can use their midpoint.",
    errBudgetPositive: "Enter valid positive budget amounts.",
    errBudgetOrder: "The minimum budget must not exceed the maximum.",
    errMinLocalContent: "Minimum Saudi Content must be a number from 0 to 100.",
    errWeightsSum: "Scoring weights must be non-negative and add up to 100%.",
    errBidPrice: "Enter a valid price and delivery timeline.",
    errBelowFloor: "Price is below the current floor.",
    errFloorPositive: "Enter a positive floor price or leave it blank.",
    errProfileIncomplete: "Cannot bid: complete supplier profile first.",
    errBidDuplicate: "Bid rejected: you already have a bid for this request. Use Update instead.",
    emptyNoRequests: "No open requests match these filters.",
    emptyNoBids: "No eligible bids match this request and the selected filters.",
    emptyNoApprovals: "No approval tasks are assigned to your role.",
    emptyNoInvitations: "No pending invitations.",
    emptyNoBidsYet: "You have not submitted any bids yet.",
    emptyNoClarifications: "No public questions yet.",
    emptyNoEligibleBids: "No eligible bids are available for comparison.",
    decisionAuditTrail: "Decision Audit Trail",
    tableSupplier: "Supplier",
    tablePrice: "Price",
    tablePriceBar: "Price bar",
    tableQuality: "Quality",
    tableDelivery: "Delivery",
    tableTotal: "Total",
    tablePayment: "Payment",
    tableCerts: "Certs",
    tableActions: "Actions",
    closeNegotiation: "Close Negotiation",
    startNegotiation: "Start Negotiation",
    floorPriceLabel: "Floor price (optional)",
    placeholderFloorPrice: "SAR",
    bidsCount: "{n} bids",
    deadlineLabel: "Deadline",
    qtyLabel: "Qty",
    budgetLabel: "Budget",
    buyerPrefersLabel: "Buyer prefers:",
    previousBidLabel: "Your previous bid:",
    floorLabel: "Floor:",
    paymentLabel: "Payment:",
    profileCompletenessTitle: "Profile Completeness",
    capacityDeclarationTitle: "Capacity Declaration",
    capacityAvailableLabel: "Available capacity (MT)",
    capacitySaveBtn: "Save Declaration",
    capacityCommitted: "{n} MT committed",
    capacityNoneCommitted: "No capacity committed yet",
    capacityErr: "Enter a valid non-negative monthly capacity.",
    capacitySaved: "Monthly capacity declaration saved.",
    invitationsTitle: "Invitations",
    invitationsEmpty: "No pending invitations.",
    myActiveBidsTitle: "My Active Bids",
    withdrawBtn: "Withdraw",
    performanceTitle: "Performance",
    historicalBidsLabel: "Historical Bids (sample)",
    historicalContractsLabel: "Historical Contracts (sample)",
    historicalWinRateLabel: "Historical Win Rate (sample)",
    locationLabel: "Location (sample)",
    capacityLabel: "Capacity (sample)",
    lcgpaVerified: "LCGPA Verified",
    selfReported: "Self-reported",
    belowLcgpa30: "(below LCGPA 30%)",
    trustScoreTitle: "Sample Trust Score",
    pendingApprovalsCount: "{n} pending award approval(s) assigned to your role.",
    topRankedTitle: "Top Ranked",
    fullComparison: "Full Comparison →",
    marketPulseTitle: "Market Pulse — Sample Pricing",
    marketPulseNote: "Illustrative sample prices; not live market data.",
    lowLabel: "Low:",
    highLabel: "High:",
    sampleBadge: "Sample",
    perMtLabel: "SAR per MT",
    per1000Label: "SAR per 1000 units",
    trendUp: "up",
    trendDown: "down",
    trendStable: "stable",
    contractTrackerTitle: "Contract Expiry Tracker",
    daySuffix: "d",
    expiringSoon: "Expiring Soon",
    expiringContractsBanner: "{n} contracts expiring within 14 days",
    viewContractTracker: "View Contract Tracker",
    rebidBtn: "Rebid",
    negotiationTitle: "Negotiation",
    negotiationRoundOpen: "Round {n} · Ends in {time}",
    negotiationRoundClosed: "Round {n} closed.",
    negotiationStartHint: "Start a 24-hour reverse-auction round for suppliers.",
    zatcaReady: "ZATCA Ready",
    zatcaSandbox: "ZATCA Sandbox",
    zatcaNotIntegrated: "ZATCA Not Integrated",
    auditTrailEmpty: "No decision activity recorded for this request yet.",
    riskFlag: "Risk Flag",
    paymentMismatch: "May not match policy",
    socoIssued: "SCoC issued",
    socoPending: "Shipment certificate pending",
    saberPcocLabel: "SABER PCoC:",
    expiresLabel: "Expires",
    socoExplainer: "SCoC status does not disqualify the bid; customs clearance requires an issued SCoC.",
    certificateExpiredWarning: "{name} certificate expired on {expiryDate} (No. {number}). Do not treat it as valid.",
    sampleDataDisclaimerSupplier: "Sample supplier profile: historical figures, trust scores, and certification claims are illustrative, not verified evidence.",
    sampleDataDisclaimerBuyer: "Supplier profiles and starting bids are illustrative sample records; dashboard counts reflect the browser-local data.",
    companyName: "Savola Group",
    divisionName: "Sugar Division",
    activeRequestsStat: "Active Requests",
    bidRecordsStat: "Bid Records",
    contractsOnRecordStat: "Contracts on Record",
    suppliersWithBidsStat: "Suppliers With Bids",
    localDemoRecords: "Local demo records",
    anonShort: "Anon",
    compareBtn: "Compare",
    compareAndAwardBtn: "Compare & Award",
    noRequestsYet: "No requests yet. Create one to get started.",
    noEligibleBids: "No eligible bids for this request yet.",
    qualityBar: "Quality",
    priceBar: "Price",
    deliveryBar: "Delivery",
    saudiContentLabel: "Saudi Content (IKTVA)",
    vision2030Target: "Vision 2030 target: 60% local content",
    totalBidsStat: "Total Bids",
    completedStat: "Completed",
    winRateStat: "Win Rate",
    removedRequest: "Removed request",
    requestUnavailable: "Request unavailable",
    supplierField: "Supplier:",
    bidField: "Bid:",
    contractField: "Contract:",
    unavailableLabel: "Unavailable",
    submittedByLabel: "Submitted by",
    approvedLabel: "Approved",
    taskLabel: "Task",
    analyticsTitle: "Procurement Analytics",
    analyticsSubtitle: "Counts from the current browser-local records",
    analyticsDisclaimer: "Seeded requests, bids, supplier profiles, and contracts are illustrative demo data. New records are local to this browser; this view is not live business reporting.",
    statRequestRecords: "Request Records",
    statOpenRequests: "Open Requests",
    statBidRecords: "Bid Records",
    statSuppliersWithBids: "Suppliers With Bids",
    statContractRecords: "Contract Records",
    sectionRequestsByCategory: "Request Records by Category",
    sectionBidsByRequest: "Bid Records by Request",
    sectionBidsBySupplier: "Bid Records by Supplier",
    sectionContractRecords: "Contract Records",
    noRequestRecords: "No request records yet.",
    noBidRecords: "No bid records yet.",
    noContractRecords: "No contract records yet.",
    recordedFaceValue: "Recorded face value total:",
    recurringValueDisclaimer: "Monthly recurring values are counted once; this is not actual spend.",
    unknownSupplierLabel: "Unknown supplier",
    notifications: {
      requestPostedNotification: "New request posted: {title}",
      bidUpdatedNotification: "Bid updated: {title}",
      bidSubmittedNotification: "Bid submitted: {title}",
      negotiationClosedNotification: "Negotiation closed for {title}",
      bidWithdrawnNotification: "Bid withdrawn on {title} by supplier",
      awardApprovalRequestedNotification: "Award approval requested: {title} → {supplier}",
      awardApprovedNotification: "Award approved: {title} → {supplier}",
      clarificationAnsweredNotification: "Answered a clarification on {title}",
    },
    auditActions: {
      request_created: "Request created",
      bid_submitted: "Bid submitted",
      bid_updated: "Bid updated",
      bid_withdrawn: "Bid withdrawn",
      clarification_asked: "Clarification asked",
      clarification_answered: "Clarification answered",
      capacity_declared: "Capacity declared",
      supplier_blacklisted: "Supplier blacklisted",
      supplier_unblacklisted: "Supplier un-blacklisted",
      negotiation_started: "Negotiation started",
      negotiation_closed: "Negotiation closed",
      award_submitted: "Award submitted",
      approval_granted: "Approval granted",
    },
    auditDetails: {
      negotiationFloorContext: " with a floor price of {price}",
      request_created: 'Created request "{title}".',
      bid_submitted: "Submitted bid at {price}, score {score}.",
      bid_updated: "Updated bid at {price}, score {score}.",
      bid_withdrawn: "Withdrew bid at {price}.",
      clarification_asked: "Asked a public clarification.",
      clarification_answered: "Answered a public clarification.",
      capacity_declared: "Declared {capacity} MT available for {period}.",
      supplier_blacklisted: "Blacklisted supplier {name}{requestContext}.",
      supplier_unblacklisted: "Un-blacklisted supplier {name}{requestContext}.",
      negotiation_started: "Started negotiation round {round}{floorContext}.",
      negotiation_closed: "Closed negotiation round {round}.",
      award_submitted: "Awarded to {name} at {price}, score {score}.",
      approval_granted: "Approved award to {name}; contract {contractId} activated.",
    },
  },
  ar: {
    dashboard: "لوحة التحكم",
    marketplace: "السوق",
    compare: "مقارنة العروض",
    compareRankingNote: "تُرتب العروض المؤهلة وفق الأوزان المحددة للطلب من قبل المشتري.",
    buyerDecisionReviewTitle: "قبل اعتماد الترسية",
    buyerDecisionReviewBody: "تحقق من مطابقة المواصفات، والطاقة الاستيعابية للتسليم، وصلاحية عرض السعر، والشهادات المطلوبة، وأسباب استبعاد أي عرض. الدرجة المرتفعة أداة مساعدة للقرار وليست بديلاً عن التحقق الواجب.",
    compareDisclaimer: "الأسعار والتقييمات ومزاعم الشهادات بيانات توضيحية، وليست أدلة موثقة على الموردين.",
    priceScoreFormula: "100 − (الفرق عن متوسط SAR {midpoint} ÷ المتوسط × 100)، ضمن نطاق 0–100.",
    priceScoreUnavailable: "لا تتوفر الدرجة دون نطاق ميزانية مكتمل؛ وتُعاد موازنة المعايير المتبقية.",
    lcgpaMinimumLabel: "الحد الأدنى لهيئة المحتوى المحلي:",
    highestScoreAtLabel: "— أعلى درجة إجمالية بسعر",
    winnerSaudiContentLabel: "المحتوى السعودي للفائز",
    winnerSaudiContentThreshold: "(الحد الأدنى {n}%)",
    analytics: "التحليلات",
    approvalInbox: "صندوق الموافقات",
    marketplaceSupplier: "تصفح الطلبات",
    openRequestsTitle: "الطلبات المفتوحة",
    matchingRequestsCount: "{n} طلب توريد مطابق",
    placeholderSearchRequests: "ابحث في الطلبات...",
    requiredCertsFilterLabel: "الشهادات المطلوبة:",
    paymentTermsFilterLabel: "شروط الدفع:",
    anonymousBuyer: "مشتري مجهول",
    reverseAuctionChip: "مزاد عكسي · الجولة {n}",
    etimadRefLabel: "مرجع اعتماد",
    etimadRefTitle: "حقل مرجعي تجريبي؛ ليس تكاملاً حياً مع منصة اعتماد.",
    authProductTagline: "Procurement Intelligence Platform",
    authSubTagline: "B2B Supply Chain Marketplace · KSA",
    authIntro: "اختر دورًا تجريبيًا. لا يحتوي هذا النموذج على حسابات أو مصادقة حقيقية؛ وتُحفظ التغييرات في هذا المتصفح فقط.",
    authFooter: "تُحفظ البيانات التجريبية محليًا على هذا الجهاز",
    login: "دخول النموذج التجريبي",
    buyerAdmin: "مدير المشتريات (تجريبي)",
    buyerApprover: "معتمد المشتريات (تجريبي)",
    supplierSales: "مبيعات المورد (تجريبي)",
    notificationAria: "الإشعارات",
    logout: "خروج",
    langToggle: "EN",
    notificationsTitle: "الإشعارات",
    markAllRead: "تعليم الكل كمقروء",
    noNotifications: "لا توجد إشعارات بعد.",
    storageWarningPrefix: "تعذر حفظ بيانات النموذج:",
    postRequest: "+ نشر طلب",
    newRequestTitle: "نشر طلب توريد",
    fieldTitle: "عنوان الطلب",
    fieldTitleArabic: "عنوان الطلب بالعربية (اختياري)",
    fieldSpecsArabic: "المواصفات باللغة العربية (اختياري)",
    placeholderTitleArabic: "أدخل عنوان الطلب باللغة العربية",
    placeholderSpecsArabic: "أضف متطلبات التسليم أو الجودة أو الامتثال باللغة العربية",
    awardPendingDemo: "تم حفظ الترسية محليًا بانتظار الاعتماد. هذا نموذج تجريبي ولا يتضمن سير اعتماد فعليًا أو ربطًا بنظام تخطيط موارد المؤسسة.",
    awardRationaleLabel: "مبررات الترسية (مطلوبة)",
    awardRationalePlaceholder: "وضّح القرار استنادًا إلى السعر أو الجودة أو التسليم أو الطاقة الاستيعابية أو أدلة الامتثال.",
    awardRationaleRequired: "أضف مبررات موجزة قبل إرسال الترسية للاعتماد.",
    sampleVerifiedBadge: "بيانات تجريبية: موثّق",
    preferredSupplierBadge: "★ مورد مفضّل",
    awardedStatusBadge: "تمت الترسية",
    noSpecsProvided: "لم تُضف مواصفات إضافية.",
    placeholderRequestTitle: "مثال: سكر أبيض مكرر — توريد بالجملة",
    fieldCategory: "الفئة",
    fieldQuantity: "الكمية",
    placeholderQuantity: "مثال: 200 طن متري",
    fieldBudgetMin: "الحد الأدنى للميزانية (ر.س)",
    placeholderBudgetMin: "310,000",
    fieldBudgetMax: "الحد الأعلى للميزانية (ر.س)",
    placeholderBudgetMax: "380,000",
    fieldMinLocalContent: "الحد الأدنى للمحتوى السعودي (لجنة المحتوى المحلي %)",
    fieldScoringWeights: "أوزان تقييم العروض (%) — يجب أن يكون المجموع 100%",
    fieldRequiredCerts: "الشهادات المطلوبة",
    fieldPaymentTerms: "تفضيل شروط الدفع",
    fieldSpecs: "المواصفات",
    placeholderSpecs: "الدرجة، موقع التسليم، معايير الامتثال...",
    postAnonymously: "النشر بشكل مجهول",
    recommendedBadge: "موصى به",
    anonExplainer: "تُخفى هوية شركتك عن جميع الموردين؛ ما يمنع المنافسين من رسم خريطة سلسلة التوريد الخاصة بك.",
    cancel: "إلغاء",
    post: "نشر الطلب",
    requestPosted: "تم نشر الطلب",
    requestPostedNote: "أصبح طلبك الآن ظاهراً للموردين في هذا النموذج التجريبي على المتصفح.",
    done: "تم",
    submitBid: "تقديم عرض",
    updateBid: "تحديث العرض",
    counterOffer: "عرض مضاد",
    bidSubmitted: "تم تقديم العرض",
    bidSubmittedNote: "يمكن للمشتري مراجعة عرضك في شاشة مقارنة العروض.",
    bidUpdated: "تم تحديث العرض",
    awardSubmittedNote: "تم حفظ الترسية والعقد في بيانات النموذج التجريبي على هذا المتصفح.",
    submitForApprovalBtn: "إرسال للاعتماد",
    submittedForApprovalTitle: "تم الإرسال للاعتماد",
    approvalTaskExplainer: "يؤدي الإرسال إلى إنشاء مهمة اعتماد محلية مسندة إلى دور معتمد المشتريات.",
    purchaseOrderSummary: "ملخص أمر الشراء",
    reviewBeforeSubmitting: "راجع قبل الإرسال للاعتماد الداخلي",
    fieldYourPrice: "سعرك (ر.س)",
    placeholderBidPrice: "مثال: 334000",
    fieldDelivery: "مدة التوريد",
    placeholderBidDelivery: "مثال: 9 أيام من الترسية",
    fieldProposalNotes: "ملاحظات العرض",
    placeholderProposalNotes: "الشهادات، الطاقة الإنتاجية، المراجع، الشروط الخاصة...",
    supplierBidReadinessTitle: "قائمة التحقق من جاهزية العرض",
    supplierBidReadinessHint: "أكمل البيانات الأساسية أدناه قبل إرسال عرضك.",
    supplierBidPriceReady: "تم إدخال سعر صحيح",
    supplierBidDeliveryReady: "تم إدخال مدة التوريد",
    supplierBidPaymentReady: "تم اختيار شروط الدفع",
    supplierBidReadinessCount: "اكتمل {ready} من أصل {total} عناصر أساسية",
    placeholderFloorPrice: "ر.س",
    qaButton: "الأسئلة والأجوبة",
    qaTitle: "أسئلة وأجوبة عامة",
    supplierHashLabel: "المورد رقم",
    answeredByLabel: "أجاب",
    buyerRoleLabel: "المشتري",
    askQuestion: "اسأل",
    answerQuestion: "أجب",
    awardContract: "إرسال الترسية",
    award: "ترسية",
    recommended: "الموصى به:",
    disqualified: "مستبعد",
    disqualifyReasons: {
      supplierUnavailable: "ملف المورد غير متاح.",
      supplierBlacklisted: "المورد مدرج في القائمة السوداء.",
      mandatoryListNotConfirmed: "فئة المنتج مدرجة في القائمة الإلزامية لهيئة المحتوى المحلي؛ ولم يؤكد المورد أن المنتج محلي.",
      missingCert: "الشهادة المطلوبة {name} غير موجودة.",
      expiredCert: "انتهت صلاحية شهادة {name}.",
      unverifiedCert: "شهادة {name} غير موثقة.",
      localContentBelow: "المحتوى السعودي {actual}% أقل من الحد المطلوب {required}%.",
    },
    viewProfile: "الملف",
    viewCards: "بطاقات",
    viewTable: "جدول",
    filterByCert: "تصفية حسب الشهادة:",
    filterByPayment: "تصفية حسب شروط الدفع:",
    allTerms: "كل الشروط",
    approveAward: "اعتماد الترسية",
    pendingApproval: "بانتظار الموافقة",
    approvedStatus: "معتمد",
    resetDemoData: "إعادة تعيين البيانات التجريبية",
    confirmReset: "هل تريد مسح التغييرات المحفوظة واستعادة البيانات التجريبية؟",
    reset: "إعادة تعيين",
    errTitleRequired: "عنوان الطلب والكمية مطلوبان.",
    errBudgetBounds: "أدخل الحدين الأدنى والأعلى للميزانية ليتمكن تقييم السعر من استخدام نقطة المنتصف.",
    errBudgetPositive: "أدخل مبالغ ميزانية موجبة صحيحة.",
    errBudgetOrder: "يجب ألا يتجاوز الحد الأدنى للميزانية الحد الأعلى.",
    errMinLocalContent: "يجب أن يكون الحد الأدنى للمحتوى السعودي رقماً من 0 إلى 100.",
    errWeightsSum: "يجب أن تكون أوزان التقييم غير سالبة ومجموعها 100%.",
    errBidPrice: "أدخل سعراً ومدة توريد صحيحين.",
    errBelowFloor: "السعر أقل من الحد الأدنى الحالي.",
    errFloorPositive: "أدخل سعراً أدنى موجباً أو اتركه فارغاً.",
    errProfileIncomplete: "لا يمكن تقديم عرض: أكمل ملف المورد أولاً.",
    errBidDuplicate: "تم رفض العرض: لديك عرض بالفعل على هذا الطلب. استخدم التحديث بدلاً من ذلك.",
    emptyNoRequests: "لا توجد طلبات مفتوحة تطابق هذه المرشحات.",
    emptyNoBids: "لا توجد عروض مؤهلة تطابق هذا الطلب والمرشحات المحددة.",
    emptyNoApprovals: "لا توجد مهام اعتماد مسندة إلى دورك.",
    emptyNoInvitations: "لا توجد دعوات معلقة.",
    emptyNoBidsYet: "لم تقدم أي عروض بعد.",
    emptyNoClarifications: "لا توجد أسئلة عامة بعد.",
    emptyNoEligibleBids: "لا توجد عروض مؤهلة للمقارنة.",
    decisionAuditTrail: "سجل تدقيق القرار",
    tableSupplier: "المورد",
    tablePrice: "السعر",
    tablePriceBar: "شريط السعر",
    tableQuality: "الجودة",
    tableDelivery: "التسليم",
    tableTotal: "الإجمالي",
    tablePayment: "الدفع",
    tableCerts: "الشهادات",
    tableActions: "الإجراءات",
    closeNegotiation: "إغلاق التفاوض",
    startNegotiation: "بدء التفاوض",
    floorPriceLabel: "السعر الأدنى (اختياري)",
    bidsCount: "{n} عرض",
    deadlineLabel: "الموعد النهائي",
    qtyLabel: "الكمية",
    budgetLabel: "الميزانية",
    buyerPrefersLabel: "يفضل المشتري:",
    previousBidLabel: "عرضك السابق:",
    floorLabel: "الحد الأدنى:",
    paymentLabel: "الدفع:",
    profileCompletenessTitle: "اكتمال الملف",
    capacityDeclarationTitle: "إقرار الطاقة الإنتاجية",
    capacityAvailableLabel: "الطاقة المتاحة (طن متري)",
    capacitySaveBtn: "حفظ الإقرار",
    capacityCommitted: "{n} طن متري ملتزم بها",
    capacityNoneCommitted: "لا توجد طاقة ملتزم بها بعد",
    capacityErr: "أدخل طاقة شهرية صحيحة غير سالبة.",
    capacitySaved: "تم حفظ إقرار الطاقة الشهرية.",
    invitationsTitle: "الدعوات",
    invitationsEmpty: "لا توجد دعوات معلقة.",
    myActiveBidsTitle: "عروضي النشطة",
    withdrawBtn: "سحب",
    performanceTitle: "الأداء",
    historicalBidsLabel: "العروض السابقة (تجريبي)",
    historicalContractsLabel: "العقود السابقة (تجريبي)",
    historicalWinRateLabel: "معدل الفوز السابق (تجريبي)",
    locationLabel: "الموقع (تجريبي)",
    capacityLabel: "الطاقة الإنتاجية (تجريبي)",
    lcgpaVerified: "موثق من هيئة المحتوى المحلي",
    selfReported: "إقرار ذاتي",
    belowLcgpa30: "(أقل من 30% لهيئة المحتوى المحلي)",
    trustScoreTitle: "درجة الثقة التجريبية",
    pendingApprovalsCount: "{n} من مهام اعتماد الترسية مسندة إلى دورك.",
    topRankedTitle: "الأعلى ترتيباً",
    fullComparison: "المقارنة الكاملة ←",
    marketPulseTitle: "نبض السوق — أسعار تجريبية",
    marketPulseNote: "أسعار توضيحية؛ ليست بيانات سوق حية.",
    lowLabel: "الأدنى:",
    highLabel: "الأعلى:",
    sampleBadge: "تجريبي",
    perMtLabel: "ر.س لكل طن متري",
    per1000Label: "ر.س لكل 1000 وحدة",
    trendUp: "صاعد",
    trendDown: "هابط",
    trendStable: "مستقر",
    contractTrackerTitle: "متتبع انتهاء العقود",
    daySuffix: "يوم",
    expiringSoon: "تنتهي قريباً",
    expiringContractsBanner: "عقود تنتهي خلال 14 يوماً ({n})",
    viewContractTracker: "عرض متتبع العقود",
    rebidBtn: "إعادة المنافسة",
    negotiationTitle: "التفاوض",
    negotiationRoundOpen: "الجولة {n} · تنتهي خلال {time}",
    negotiationRoundClosed: "أُغلقت الجولة {n}.",
    negotiationStartHint: "ابدأ جولة تفاوض عكسي لمدة 24 ساعة للموردين.",
    zatcaReady: "متوافق مع فاتورة",
    zatcaSandbox: "بيئة اختبار فاتورة",
    zatcaNotIntegrated: "غير متكامل مع فاتورة",
    auditTrailEmpty: "لا يوجد نشاط قرار مسجل لهذا الطلب بعد.",
    riskFlag: "تنبيه مخاطر",
    paymentMismatch: "قد لا يتوافق مع السياسة",
    socoIssued: "تم إصدار شهادة الشحنة",
    socoPending: "شهادة الشحنة معلقة",
    saberPcocLabel: "شهادة المنتج SABER:",
    expiresLabel: "تنتهي في",
    socoExplainer: "حالة شهادة الشحنة لا تستبعد العرض؛ إلا أن التخليص الجمركي يتطلب إصدارها.",
    certificateExpiredWarning: "انتهت صلاحية شهادة {name} بتاريخ {expiryDate} (رقم {number}). لا تعتبرها سارية.",
    sampleDataDisclaimerSupplier: "ملف مورد تجريبي: الأرقام التاريخية ودرجات الثقة والمزاعم المتعلقة بالشهادات توضيحية وليست أدلة موثقة.",
    sampleDataDisclaimerBuyer: "ملفات الموردين والعروض الابتدائية سجلات توضيحية؛ وتعكس أعداد لوحة التحكم البيانات المحلية في المتصفح.",
    companyName: "مجموعة سافولا",
    divisionName: "قطاع السكر",
    activeRequestsStat: "الطلبات النشطة",
    bidRecordsStat: "سجلات العروض",
    contractsOnRecordStat: "العقود المسجلة",
    suppliersWithBidsStat: "الموردون الذين قدموا عروضاً",
    localDemoRecords: "سجلات تجريبية محلية",
    anonShort: "مجهول",
    compareBtn: "مقارنة",
    compareAndAwardBtn: "مقارنة وترسية",
    noRequestsYet: "لا توجد طلبات بعد. أنشئ طلباً للبدء.",
    noEligibleBids: "لا توجد عروض مؤهلة لهذا الطلب بعد.",
    qualityBar: "الجودة",
    priceBar: "السعر",
    deliveryBar: "التسليم",
    saudiContentLabel: "المحتوى السعودي (اكتفاء)",
    vision2030Target: "مستهدف رؤية 2030: 60%",
    totalBidsStat: "إجمالي العروض",
    completedStat: "مكتملة",
    winRateStat: "معدل الفوز",
    removedRequest: "طلب محذوف",
    requestUnavailable: "الطلب غير متاح",
    supplierField: "المورد:",
    bidField: "العرض:",
    contractField: "العقد:",
    unavailableLabel: "غير متاح",
    submittedByLabel: "مقدم من",
    approvedLabel: "تم الاعتماد",
    taskLabel: "المهمة",
    analyticsTitle: "تحليلات المشتريات",
    analyticsSubtitle: "إحصاءات من السجلات المحلية",
    analyticsDisclaimer: "بيانات توضيحية؛ وليست تقارير أعمال حية.",
    statRequestRecords: "سجلات الطلبات",
    statOpenRequests: "الطلبات المفتوحة",
    statBidRecords: "سجلات العروض",
    statSuppliersWithBids: "الموردون الذين قدموا عروضاً",
    statContractRecords: "سجلات العقود",
    sectionRequestsByCategory: "سجلات الطلبات حسب الفئة",
    sectionBidsByRequest: "سجلات العروض حسب الطلب",
    sectionBidsBySupplier: "سجلات العروض حسب المورد",
    sectionContractRecords: "سجلات العقود",
    noRequestRecords: "لا توجد سجلات طلبات بعد.",
    noBidRecords: "لا توجد سجلات عروض بعد.",
    noContractRecords: "لا توجد سجلات عقود بعد.",
    recordedFaceValue: "إجمالي القيمة الاسمية المسجلة:",
    recurringValueDisclaimer: "تُحتسب القيم الشهرية المتكررة مرة واحدة؛ وهذا ليس إنفاقاً فعلياً.",
    unknownSupplierLabel: "مورد غير معروف",
    notifications: {
      requestPostedNotification: "تم نشر طلب جديد: {title}",
      bidUpdatedNotification: "تم تحديث العرض: {title}",
      bidSubmittedNotification: "تم تقديم العرض: {title}",
      negotiationClosedNotification: "أُغلق التفاوض على {title}",
      bidWithdrawnNotification: "سحب المورد العرض بشأن {title}",
      awardApprovalRequestedNotification: "طُلب اعتماد الترسية: {title} ← {supplier}",
      awardApprovedNotification: "تم اعتماد الترسية: {title} ← {supplier}",
      clarificationAnsweredNotification: "تمت الإجابة عن استفسار بشأن {title}",
    },
    auditActions: {
      request_created: "تم إنشاء الطلب",
      bid_submitted: "تم تقديم العرض",
      bid_updated: "تم تحديث العرض",
      bid_withdrawn: "تم سحب العرض",
      clarification_asked: "تم طرح استفسار",
      clarification_answered: "تمت الإجابة عن الاستفسار",
      capacity_declared: "تم الإقرار بالطاقة الإنتاجية",
      supplier_blacklisted: "تم إدراج المورد في القائمة السوداء",
      supplier_unblacklisted: "تم رفع المورد من القائمة السوداء",
      negotiation_started: "بدأ التفاوض",
      negotiation_closed: "أُغلق التفاوض",
      award_submitted: "تم إرسال الترسية",
      approval_granted: "تم اعتماد الترسية",
    },
    auditDetails: {
      negotiationFloorContext: " بسعر أدنى {price}",
      request_created: 'تم إنشاء الطلب "{title}".',
      bid_submitted: "تم تقديم عرض بسعر {price}، ودرجة {score}.",
      bid_updated: "تم تحديث العرض بسعر {price}، ودرجة {score}.",
      bid_withdrawn: "تم سحب العرض بسعر {price}.",
      clarification_asked: "تم طرح استفسار عام.",
      clarification_answered: "تمت الإجابة عن استفسار عام.",
      capacity_declared: "تم الإقرار بتوفر {capacity} طن متري للفترة {period}.",
      supplier_blacklisted: "تم إدراج المورد {name}{requestContext} في القائمة السوداء.",
      supplier_unblacklisted: "تم رفع المورد {name}{requestContext} من القائمة السوداء.",
      negotiation_started: "بدأت جولة التفاوض رقم {round}{floorContext}.",
      negotiation_closed: "أُغلقت جولة التفاوض رقم {round}.",
      award_submitted: "تمت الترسية على {name} بسعر {price}، ودرجة {score}.",
      approval_granted: "تم اعتماد الترسية على {name} وتفعيل العقد {contractId}.",
    },
  },
};

// ARABIC CONTENT REVIEW CHECKLIST
// 1. CERT_TYPES labels — verify SFDA / SASO / IKTVA acronyms against each authority's official Arabic spelling.
// 2. PAYMENT_TERMS labels — confirm phrasing matches common Saudi B2B contract language, not literal translation.
// 3. fieldMinLocalContent — confirm "لجنة المحتوى المحلي" correctly expands LCGPA in a procurement UI.
// 4. Market-pulse categories — confirm "أولين" vs "أوليين" for Palm Olein matches Saudi trade usage.
// 5. Prompt 6 error messages — confirm imperative form and politeness match DGA UI tone guidelines. — RESOLVED: error strings now route through I18N and follow imperative form.
// 6. statusLabel outputs — confirm "بانتظار الموافقة" vs "قيد الموافقة" matches Etimad usage. — RESOLVED: statusLabel outputs "بانتظار الموافقة" which is the Etimad-conventional phrasing.
// 7. RESOLVED: dates render with ar-SA-u-ca-gregory-nu-latn (Gregorian, Latin digits). — RESOLVED: dates use ar-SA-u-ca-gregory-nu-latn (see dateLocale helper).
// 8. RTL typography — verify the KALALI wordmark and any LATIN+digit strings stay LTR inside the Arabic document (data-ltr class).
// 9. RESOLVED: All digits use Latin numerals (en-US) for scanability and consistency; Arabic text labels remain.

const C = {
  bg: "#080d18", bgMid: "#0d1525", bgCard: "#111f35", bgLight: "#162540",
  border: "#1c2e4a", borderLight: "#254268",
  gold: "#c9a84c", goldLight: "#e8c96d", goldDim: "#7a5e20",
  teal: "#0e8a7d", tealLight: "#12b0a0",
  red: "#dc3545", green: "#1a9e6e", greenLight: "#22c98d",
  blue: "#2563eb", purple: "#7c3aed",
  text: "#dde6f0", textMuted: "#526a8a", textDim: "#8ba4c0",
  white: "#ffffff",
};

const CERT_TYPES = {
  SFDA: { label: "SFDA", labelAr: "هيئة الغذاء والدواء", color: C.green, issuer: "Saudi Food and Drug Authority" },
  HALAL: { label: "Halal", labelAr: "حلال", color: C.teal, issuer: "Demo Halal Certification Body" },
  ISO: { label: "ISO 22000", labelAr: "آيزو 22000", color: C.blue, issuer: "Demo ISO Accreditation Body" },
  SASO: { label: "SASO", labelAr: "ساسو", color: C.purple, issuer: "Saudi Standards, Metrology and Quality Organization" },
  SAUDI_CONTENT: { label: "Saudi Content", labelAr: "المحتوى السعودي", color: C.gold, issuer: "Demo Local Content Authority" },
  IKTVA: { label: "IKTVA", labelAr: "اكتفاء", color: "#e05c00", issuer: "Demo IKTVA Program" },
};

const certLabel = (key, lang) => lang === "ar" ? CERT_TYPES[key].labelAr : CERT_TYPES[key].label;

const DEFAULT_SCORING_WEIGHTS = { price: 0.4, quality: 0.4, delivery: 0.2 };
const CURRENT_SUPPLIER_ID = 1;
const USER_ROLES = {
  BUYER_ADMIN: "buyer_admin",
  BUYER_APPROVER: "buyer_approver",
  SUPPLIER_SALES: "supplier_sales",
};
const DEMO_USERS = {
  [USER_ROLES.BUYER_ADMIN]: { id: "demo-buyer-admin", name: "Buyer Admin", organization: "Savola Group", role: USER_ROLES.BUYER_ADMIN },
  [USER_ROLES.BUYER_APPROVER]: { id: "demo-buyer-approver", name: "Buyer Approver", organization: "Savola Group", role: USER_ROLES.BUYER_APPROVER },
  [USER_ROLES.SUPPLIER_SALES]: { id: "demo-supplier-sales", name: "Supplier Sales", organization: "Al-Marai Supply Co.", role: USER_ROLES.SUPPLIER_SALES },
};

const PAYMENT_TERMS = [
  { value: "prepay_full", label: "100% Prepayment", labelAr: "دفع كامل مقدماً" },
  { value: "partial_50", label: "50% Upfront / 50% on Delivery", labelAr: "50% مقدماً / 50% عند التسليم" },
  { value: "partial_30", label: "30% Upfront / 70% on Delivery", labelAr: "30% مقدماً / 70% عند التسليم" },
  { value: "net30", label: "Net-30 Post Delivery", labelAr: "صافي 30 يوم بعد التسليم" },
  { value: "net60", label: "Net-60 Post Delivery", labelAr: "صافي 60 يوم بعد التسليم" },
  { value: "negotiable", label: "Negotiable", labelAr: "قابل للتفاوض" },
];

const paymentLabel = (value, lang) => {
  const term = PAYMENT_TERMS.find(item => item.value === value);
  return term ? (lang === "ar" ? term.labelAr : term.label) : value;
};

const CATEGORIES = {
  "Food & Beverage": { en: "Food & Beverage", ar: "الأغذية والمشروبات" },
  "Raw Materials": { en: "Raw Materials", ar: "المواد الخام" },
  Machinery: { en: "Machinery", ar: "الآلات" },
  Packaging: { en: "Packaging", ar: "التعبئة والتغليف" },
  Industrial: { en: "Industrial", ar: "الصناعية" },
};

const SUPPLIERS = [
  { id: 1, name: "Al-Marai Supply Co.", score: 94, price: 88, quality: 98, delivery: 97, verified: true, preferred: true, blacklisted: false, mandatoryListCategory: true, zatcaIntegrationStatus: "production", category: "Food & Beverage", location: "Riyadh", bids: 142, completed: 138, crNumber: "CR-DEMO-10001", vatNumber: "VAT-DEMO-30001", sfdaEstablishmentNumber: "SFDA-DEMO-20001", certs: ["SFDA","HALAL","ISO","SAUDI_CONTENT","IKTVA"], capacity: "500 MT/month", leadTime: "7-10 days", minOrder: "20 MT", saudiContent: 78, externalRefs: { lcgpaCertId: "LCGPA-DEMO-2026-001" }, riskFlag: null },
  { id: 2, name: "Eastern Provisions Ltd.", score: 91, price: 84, quality: 96, delivery: 94, verified: true, preferred: false, blacklisted: false, mandatoryListCategory: false, zatcaIntegrationStatus: "sandbox", category: "Food & Beverage", location: "Al Khobar", bids: 203, completed: 198, certs: ["SFDA","HALAL","ISO",{ type: "SASO", saber: { pcoCNumber: "PCOC-DEMO-2026-002", pcoCExpiry: "2027-10-21", scoCStatus: "pending" } }], capacity: "800 MT/month", leadTime: "10-14 days", minOrder: "50 MT", saudiContent: 62, riskFlag: null },
  { id: 3, name: "Gulf Industrial Partners", score: 87, price: 92, quality: 85, delivery: 83, verified: true, preferred: false, blacklisted: false, mandatoryListCategory: false, zatcaIntegrationStatus: "not_integrated", category: "Industrial", location: "Jeddah", bids: 89, completed: 81, certs: ["SFDA","ISO"], capacity: "300 MT/month", leadTime: "12-15 days", minOrder: "10 MT", saudiContent: 45, riskFlag: "2 late deliveries reported this month" },
  { id: 4, name: "Najd Equipment Group", score: 79, price: 95, quality: 74, delivery: 71, verified: true, preferred: false, blacklisted: false, mandatoryListCategory: false, zatcaIntegrationStatus: "not_integrated", category: "Machinery", location: "Dammam", bids: 56, completed: 47, certs: [{ type: "SASO", saber: { pcoCNumber: "PCOC-DEMO-2026-004", pcoCExpiry: "2027-10-21", scoCStatus: "issued" } }], capacity: "200 MT/month", leadTime: "20-25 days", minOrder: "5 MT", saudiContent: 33, riskFlag: null },
  { id: 5, name: "Hejaz Raw Materials", score: 83, price: 89, quality: 81, delivery: 80, verified: false, preferred: false, blacklisted: true, mandatoryListCategory: false, zatcaIntegrationStatus: "not_integrated", category: "Raw Materials", location: "Mecca", bids: 34, completed: 29, certs: ["SFDA","HALAL"], capacity: "150 MT/month", leadTime: "14-18 days", minOrder: "25 MT", saudiContent: 51, riskFlag: "Certification expired - SFDA renewal pending" },
];

const SUPPLIER_NAMES_AR = {
  "Al-Marai Supply Co.": "شركة المراعي للتوريد",
  "Eastern Provisions Ltd.": "الشرقية للمواد الغذائية المحدودة",
  "Gulf Industrial Partners": "شركاء الخليج الصناعيون",
  "Najd Equipment Group": "مجموعة نجد للمعدات",
  "Hejaz Raw Materials": "مواد الحجاز الخام",
};
const supplierName = (name, lang) => lang === "ar" ? (SUPPLIER_NAMES_AR[name] || name) : name;
const SUPPLIER_RISK_FLAGS_AR = {
  "Certification expired - SFDA renewal pending": "انتهت صلاحية الشهادة - تجديد هيئة الغذاء والدواء قيد الانتظار",
  "2 late deliveries reported this month": "تم الإبلاغ عن عمليتي تسليم متأخرتين هذا الشهر",
};
const riskFlagLabel = (flag, lang) => lang === "ar" ? (SUPPLIER_RISK_FLAGS_AR[flag] || flag) : flag;

const SUGAR_BIDS = [
  { supplierId: 2, price: 318000, delivery: "13 days", notes: "Premium grade, phytosanitary cert included, flexible payment terms available", priceScore: 97, qualityScore: 96, deliveryScore: 88, totalScore: 94.8, paymentTerms: "net30" },
  { supplierId: 3, price: 351000, delivery: "11 days", notes: "ISO 22000 facility, can split delivery across two weeks if needed", priceScore: 85, qualityScore: 85, deliveryScore: 92, totalScore: 86.8, paymentTerms: "prepay_full" },
  { supplierId: 5, price: 328000, delivery: "16 days", notes: "Competitive pricing, strong trade references, new to platform", priceScore: 94, qualityScore: 81, deliveryScore: 72, totalScore: 84.4, paymentTerms: "partial_50" },
];

const REQUESTS = [
  { id: "KAL-2024-0441", title: "Refined Sunflower Oil — Production Grade", titleAr: "زيت عباد الشمس المكرر — درجة إنتاجية", category: "Food & Beverage", quantity: "80 MT/month", budget: "SAR 180,000 – 220,000", budgetMin: 180000, budgetMax: 220000, anonymous: true, status: "open", posted: "2 days ago", specs: "Food-grade, max 0.1% acidity, SFDA certified, tanker delivery to Jeddah Industrial City", specsAr: "درجة غذائية، حموضة قصوى 0.1%، معتمد من هيئة الغذاء والدواء، توصيل بالصهاريج إلى المدينة الصناعية بجدة", requiredPayment: "net30", externalRefs: { etimadTenderId: "ETIMAD-DEMO-2026-0441" } },
  { id: "KAL-2024-0389", title: "Industrial Conveyor Belt System", titleAr: "نظام سير ناقل صناعي", category: "Machinery", quantity: "3 units", budget: "SAR 95,000 – 140,000", budgetMin: 95000, budgetMax: 140000, anonymous: false, businessName: "Saudi Foods Manufacturing", status: "open", posted: "5 days ago", specs: "Heavy-duty PVC belt, 15m length, load capacity 500kg/m, food-safe materials", specsAr: "حزام PVC شديد التحمل، طول 15 متراً، قدرة تحمل 500 كجم/م، مواد آمنة غذائياً", requiredPayment: "negotiable" },
  { id: "KAL-2024-0350", title: "Sugar (Refined White) — Bulk", titleAr: "سكر (أبيض مكرر) — سائب", category: "Food & Beverage", quantity: "200 MT", budget: "SAR 310,000 – 380,000", budgetMin: 310000, budgetMax: 380000, anonymous: true, status: "open", posted: "1 week ago", specs: "ICUMSA 45, 50kg bags or bulk tanker, phytosanitary certificate required", specsAr: "ICUMSA 45، أكياس 50 كجم أو صهريج سائب، مطلوب شهادة صحة نباتية", requiredPayment: "net30", requiresMandatoryList: true, invitedSupplierIds: [CURRENT_SUPPLIER_ID], involvesShipments: true },
  { id: "KAL-2024-0298", title: "Packaging Materials — PET Bottles", titleAr: "مواد تعبئة وتغليف — عبوات PET", category: "Packaging", quantity: "500,000 units", budget: "SAR 75,000 – 95,000", budgetMin: 75000, budgetMax: 95000, anonymous: false, businessName: "Savola Group", status: "open", posted: "2 weeks ago", specs: "500ml PET, food-grade, custom mold available, must pass drop test", specsAr: "500 مل PET، آمنة غذائياً، قالب مخصص متاح، يجب اجتياز اختبار السقوط", requiredPayment: "partial_30" },
];

const CONTRACTS = [
  { id: "CON-2023-0089", supplier: "Al-Marai Supply Co.", item: "Refined Sunflower Oil", titleAr: "عقد توريد زيت عباد الشمس المكرر", itemAr: "زيت عباد الشمس المكرر", value: "SAR 195,000/mo", status: "expiring" },
  { id: "CON-2023-0071", supplier: "Eastern Provisions Ltd.", item: "Palm Olein", titleAr: "عقد توريد زيت النخيل الأولين", itemAr: "زيت النخيل الأولين", value: "SAR 440,000", status: "active" },
  { id: "CON-2023-0055", supplier: "Gulf Industrial Partners", item: "Packaging Materials", titleAr: "عقد توريد مواد التعبئة والتغليف", itemAr: "مواد التعبئة والتغليف", value: "SAR 82,000", status: "critical" },
  { id: "CON-2022-0198", supplier: "Najd Equipment Group", item: "Conveyor Systems", titleAr: "عقد توريد أنظمة السيور الناقلة", itemAr: "أنظمة السيور الناقلة", value: "SAR 120,000", status: "active" },
];

const MARKET_PULSE = [
  { category: "Sugar (ICUMSA 45)", arCategory: "سكر (ICUMSA 45)", unit: "per MT", avg: 1640, low: 1580, high: 1720, trend: "up", change: "+3.2%" },
  { category: "Sunflower Oil (Food Grade)", arCategory: "زيت عباد الشمس (درجة غذائية)", unit: "per MT", avg: 2450, low: 2310, high: 2580, trend: "down", change: "-1.8%" },
  { category: "Palm Olein", arCategory: "زيت النخيل الأولين", unit: "per MT", avg: 1890, low: 1820, high: 1960, trend: "stable", change: "+0.4%" },
  { category: "PET Bottles (500ml)", arCategory: "عبوات PET (500 مل)", unit: "per 1000 units", avg: 165, low: 148, high: 182, trend: "up", change: "+5.1%" },
];

const STORAGE_KEY = "kalali-prototype-v1";
const SCHEMA_VERSION = 8;
const MAX_AUDIT_ENTRIES = 500;
const LEGACY_AUDIT_ACTIONS = {
  "Request created": "request_created",
  "Bid submitted": "bid_submitted",
  "Bid updated": "bid_updated",
  "Bid withdrawn": "bid_withdrawn",
  "Clarification asked": "clarification_asked",
  "Clarification answered": "clarification_answered",
  "Capacity declared": "capacity_declared",
  "Supplier blacklisted": "supplier_blacklisted",
  "Supplier un-blacklisted": "supplier_unblacklisted",
  "Negotiation started": "negotiation_started",
  "Negotiation closed": "negotiation_closed",
  "Award submitted": "award_submitted",
  "Approval granted": "approval_granted",
};
const dateLocale = (lang) => lang === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US";
const DEMO_EPOCH = "2026-01-01T00:00:00.000Z";
const formatDate = (date, lang = "en") => {
  if (date == null || date === "") return lang === "ar" ? "تاريخ غير صالح" : "Invalid date";
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return lang === "ar" ? "تاريخ غير صالح" : "Invalid date";
  return parsedDate.toLocaleDateString(dateLocale(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};
const demoDateAfterDays = (days) => {
  const base = new Date(DEMO_EPOCH);
  base.setDate(base.getDate() + days);
  return formatDate(base);
};

const dateOffsetISO = (years) => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
};

// Note: dateAfterDays returns an English date string for storage compatibility. Display formatting is handled by formatDate(date, lang) at render time.
const dateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const isValidISODate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
const todayISO = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};
const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date()) / 86400000);

const getCertificateStatus = (certificate) => {
  if (isValidISODate(certificate?.expiryDate) && certificate.expiryDate < todayISO()) return "expired";
  return ["pending", "verified", "expired"].includes(certificate.verificationStatus)
    ? certificate.verificationStatus
    : "pending";
};

const getSupplierCompleteness = (supplier) => {
  const certs = Array.isArray(supplier?.certs) ? supplier.certs : [];
  const items = [
    { key: "cr", label: "Commercial Registration (CR)", done: Boolean(supplier?.crNumber), blocking: true },
    { key: "vat", label: "VAT certificate", done: Boolean(supplier?.vatNumber), blocking: true },
    { key: "sfda", label: "SFDA establishment registration", done: Boolean(supplier?.sfdaEstablishmentNumber), blocking: supplier?.category === "Food & Beverage" },
    { key: "saber", label: "SABER account (SASO)", done: certs.some(certificate => certificate.type === "SASO"), blocking: false },
    { key: "validCert", label: "At least one valid certificate", done: certs.some(certificate => getCertificateStatus(certificate) === "verified"), blocking: true },
    { key: "lcgpa", label: "LCGPA certificate", done: Boolean(supplier?.externalRefs?.lcgpaCertId), blocking: false },
  ];
  return {
    percent: Math.round(items.filter(item => item.done).length / items.length * 100),
    items,
  };
};

const getSupplierProfileBlockMessage = (supplier, lang = "en") => {
  const missing = getSupplierCompleteness(supplier).items
    .filter(item => item.blocking && !item.done)
    .map(item => lang === "ar" ? ({
      cr: "السجل التجاري",
      vat: "شهادة ضريبة القيمة المضافة",
      sfda: "تسجيل منشأة هيئة الغذاء والدواء",
      validCert: "شهادة سارية واحدة على الأقل",
    }[item.key] || item.label) : item.label);
  return missing.length
    ? lang === "ar"
      ? `لا يمكن تقديم عرض: أكمل ملف المورد أولاً (${missing.join("، ")})`
      : `Cannot bid: complete supplier profile first (${missing.join(", ")})`
    : "";
};

const normalizeCertificate = (certificate, supplierId, index) => {
  const type = typeof certificate === "string" ? certificate : certificate?.type;
  const definition = CERT_TYPES[type];
  if (!definition) return null;
  const base = typeof certificate === "string" ? {} : certificate;
  const hasExpiredSample = type === "SFDA" && [3, 5].includes(supplierId);
  const expiryDate = isValidISODate(base.expiryDate) ? base.expiryDate : dateOffsetISO(hasExpiredSample ? -1 : 1);
  const normalized = {
    type,
    issuer: typeof base.issuer === "string" && base.issuer.trim() ? base.issuer.trim() : definition.issuer,
    certificateNumber: typeof base.certificateNumber === "string" && base.certificateNumber.trim()
      ? base.certificateNumber.trim() : `DEMO-${supplierId}-${type}-${index + 1}`,
    issuedDate: isValidISODate(base.issuedDate) ? base.issuedDate : dateOffsetISO(hasExpiredSample ? -2 : -1),
    expiryDate,
    documentUrl: typeof base.documentUrl === "string" && base.documentUrl.trim()
      ? base.documentUrl.trim() : `placeholder://certificates/${supplierId}/${type.toLowerCase()}`,
    verificationStatus: ["pending", "verified", "expired"].includes(base.verificationStatus)
      ? base.verificationStatus : (supplierId === 5 ? "pending" : "verified"),
  };
  if (type === "SASO") {
    const saber = base.saber || {};
    const scoCStatus = ["not_required", "pending", "issued"].includes(saber.scoCStatus)
      ? saber.scoCStatus
      : supplierId === 2 ? "pending" : "issued";
    normalized.saber = {
      pcoCNumber: typeof saber.pcoCNumber === "string" && saber.pcoCNumber.trim()
        ? saber.pcoCNumber.trim() : `PCOC-DEMO-${supplierId}-${type}`,
      pcoCExpiry: /^\d{4}-\d{2}-\d{2}$/.test(saber.pcoCExpiry || "") ? saber.pcoCExpiry : dateOffsetISO(1),
      scoCStatus,
    };
  }
  normalized.verificationStatus = getCertificateStatus(normalized);
  return normalized;
};

const normalizeSupplierCertificates = (supplier, fallback) => {
  const certs = (Array.isArray(supplier.certs) ? supplier.certs : [])
    .map((certificate, index) => normalizeCertificate(certificate, supplier.id, index))
    .filter(Boolean);
  const externalRefs = normalizeExternalRefs(supplier.externalRefs === undefined ? fallback?.externalRefs : supplier.externalRefs);
  const capacityDeclarations = normalizeCapacityDeclarations(supplier.capacityDeclarations);
  const same = certs.every((certificate, index) =>
    typeof supplier.certs[index] !== "string" &&
    JSON.stringify(supplier.certs[index]) === JSON.stringify(certificate)
  ) && certs.length === supplier.certs.length &&
    JSON.stringify(supplier.externalRefs || {}) === JSON.stringify(externalRefs) &&
    Array.isArray(supplier.capacityDeclarations) &&
    JSON.stringify(supplier.capacityDeclarations || []) === JSON.stringify(capacityDeclarations);
  const normalizedSupplier = {
    ...supplier,
    certs,
    externalRefs,
    capacityDeclarations,
    crNumber: supplier.crNumber || fallback?.crNumber,
    vatNumber: supplier.vatNumber || fallback?.vatNumber,
    sfdaEstablishmentNumber: supplier.sfdaEstablishmentNumber || fallback?.sfdaEstablishmentNumber,
    mandatoryListCategory: typeof supplier.mandatoryListCategory === "boolean"
      ? supplier.mandatoryListCategory : fallback?.mandatoryListCategory,
    zatcaIntegrationStatus: ["not_integrated", "sandbox", "production"].includes(supplier.zatcaIntegrationStatus)
      ? supplier.zatcaIntegrationStatus : fallback?.zatcaIntegrationStatus || "not_integrated",
  };
  return same &&
    normalizedSupplier.crNumber === supplier.crNumber &&
    normalizedSupplier.vatNumber === supplier.vatNumber &&
    normalizedSupplier.sfdaEstablishmentNumber === supplier.sfdaEstablishmentNumber &&
    normalizedSupplier.mandatoryListCategory === supplier.mandatoryListCategory &&
    normalizedSupplier.zatcaIntegrationStatus === supplier.zatcaIntegrationStatus &&
    JSON.stringify(normalizedSupplier.capacityDeclarations) === JSON.stringify(supplier.capacityDeclarations || [])
    ? supplier : normalizedSupplier;
};

const normalizeExternalRefs = (externalRefs) => {
  const refs = externalRefs && typeof externalRefs === "object" ? externalRefs : {};
  const normalized = {};
  if (typeof refs.etimadTenderId === "string" && refs.etimadTenderId.trim()) normalized.etimadTenderId = refs.etimadTenderId.trim();
  if (typeof refs.lcgpaCertId === "string" && refs.lcgpaCertId.trim()) normalized.lcgpaCertId = refs.lcgpaCertId.trim();
  return normalized;
};

const certificateLabel = (certificate, lang = "en") => CERT_TYPES[certificate.type]
  ? certLabel(certificate.type, lang)
  : certificate.type;

const ShipmentCertificateStatus = ({ supplier, lang = "en" }) => {
  const t = I18N[lang];
  const sasoCertificate = supplier?.certs.find(certificate => certificate.type === "SASO");
  const saber = sasoCertificate?.saber;
  const issued = saber?.scoCStatus === "issued";
  return (
    <div style={{ background: (issued ? C.greenLight : C.gold) + "11", border: `1px solid ${(issued ? C.greenLight : C.gold) + "33"}`, borderRadius: 6, padding: "7px 9px", marginTop: 7 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: issued ? C.greenLight : C.gold }}>
        {issued ? t.socoIssued : t.socoPending}
      </div>
      {saber?.pcoCNumber && (
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
          {t.saberPcocLabel} <span data-ltr>{saber.pcoCNumber}</span> · {t.expiresLabel} <span data-ltr>{saber.pcoCExpiry}</span>
        </div>
      )}
      {!issued && (
        <div style={{ fontSize: 10, color: C.textDim, marginTop: 3 }}>
          {t.socoExplainer}
        </div>
      )}
    </div>
  );
};

const normalizeScoringWeights = (weights) => {
  const values = {
    price: Number(weights?.price),
    quality: Number(weights?.quality),
    delivery: Number(weights?.delivery),
  };
  if (Object.values(values).some(value => !Number.isFinite(value) || value < 0)) return DEFAULT_SCORING_WEIGHTS;
  const total = values.price + values.quality + values.delivery;
  if (total <= 0) return DEFAULT_SCORING_WEIGHTS;
  const scale = total > 1.001 ? 100 : 1;
  const normalizedTotal = total / scale;
  return {
    price: values.price / scale / normalizedTotal,
    quality: values.quality / scale / normalizedTotal,
    delivery: values.delivery / scale / normalizedTotal,
  };
};

const getBudgetMidpoint = (request) => {
  const min = Number(request.budgetMin);
  const max = Number(request.budgetMax);
  if (Number.isFinite(min) && min > 0 && Number.isFinite(max) && max >= min) return (min + max) / 2;
  const amounts = String(request.budget || "").match(/\d[\d,]*/g)?.map(value => Number(value.replace(/,/g, ""))) || [];
  if (amounts.length >= 2 && amounts[0] > 0 && amounts[1] >= amounts[0]) return (amounts[0] + amounts[1]) / 2;
  return null;
};

const normalizeRequest = (request, fallback) => {
  const merged = { ...fallback, ...request };
  const amounts = String(merged.budget || "").match(/\d[\d,]*/g)?.map(value => Number(value.replace(/,/g, ""))) || [];
  return {
    ...merged,
    titleAr: typeof merged.titleAr === "string" ? merged.titleAr : undefined,
    specsAr: typeof merged.specsAr === "string" ? merged.specsAr : undefined,
    budgetMin: Number.isFinite(Number(merged.budgetMin)) && Number(merged.budgetMin) > 0
      ? Number(merged.budgetMin) : amounts.length >= 2 ? amounts[0] : null,
    budgetMax: Number.isFinite(Number(merged.budgetMax)) && Number(merged.budgetMax) > 0
      ? Number(merged.budgetMax) : amounts.length >= 2 ? amounts[1] : null,
    minimumLocalContent: Number.isFinite(Number(merged.minimumLocalContent)) &&
      Number(merged.minimumLocalContent) >= 0 && Number(merged.minimumLocalContent) <= 100
      ? Number(merged.minimumLocalContent) : 0,
    requiresMandatoryList: merged.requiresMandatoryList === true,
    clarifications: Array.isArray(merged.clarifications)
      ? merged.clarifications
        .filter(item => item && typeof item.id === "string" && typeof item.question === "string" && Number.isFinite(Number(item.supplierId)))
        .map(item => ({
          id: item.id,
          supplierId: Number(item.supplierId),
          question: item.question,
          answer: typeof item.answer === "string" ? item.answer : null,
          answeredBy: typeof item.answeredBy === "string" ? item.answeredBy : null,
          answeredAt: typeof item.answeredAt === "string" ? item.answeredAt : null,
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
        }))
      : [],
    scoringWeights: normalizeScoringWeights(merged.scoringWeights),
    negotiation: {
      round: Number.isInteger(merged.negotiation?.round) && merged.negotiation.round >= 0
        ? merged.negotiation.round : 0,
      status: ["idle", "open", "closed"].includes(merged.negotiation?.status)
        ? merged.negotiation.status : "idle",
      openedAt: typeof merged.negotiation?.openedAt === "string" ? merged.negotiation.openedAt : null,
      closesAt: typeof merged.negotiation?.closesAt === "string" ? merged.negotiation.closesAt : null,
      floorPrice: Number.isFinite(Number(merged.negotiation?.floorPrice)) && Number(merged.negotiation?.floorPrice) > 0
        ? Number(merged.negotiation.floorPrice) : null,
    },
    requiredCerts: Array.isArray(merged.requiredCerts) ? merged.requiredCerts : [],
    externalRefs: normalizeExternalRefs(merged.externalRefs),
    invitedSupplierIds: Array.isArray(merged.invitedSupplierIds)
      ? [...new Set(merged.invitedSupplierIds.map(Number).filter(Number.isFinite))]
      : [],
    involvesShipments: typeof merged.involvesShipments === "boolean"
      ? merged.involvesShipments
      : /\b(shipments?|shipping|tanker|customs)\b/i.test(`${merged.title || ""} ${merged.specs || ""}`),
  };
};

const scoreBid = (bid, request = {}, supplier) => {
  const reasons = [];
  if (!supplier) reasons.push({ key: "supplierUnavailable", params: {} });
  if (supplier?.blacklisted) reasons.push({ key: "supplierBlacklisted", params: {} });
  const quantityMatch = String(request.quantity || "").match(/^\s*([\d,]+(?:\.\d+)?)/);
  const requestedQuantity = quantityMatch ? Number(quantityMatch[1].replace(/,/g, "")) : null;
  const currentDeclaration = supplier?.capacityDeclarations?.find(item => item.period === currentMonthPeriod());
  const uncommittedCapacity = currentDeclaration
    ? Math.max(0, currentDeclaration.declaredCapacity - currentDeclaration.committedCapacity)
    : 0;
  const deliveryCapacityWarning = requestedQuantity !== null && Number.isFinite(requestedQuantity) &&
    requestedQuantity > 0 && supplier && uncommittedCapacity < requestedQuantity
    ? `Capacity overlap: supplier has ${uncommittedCapacity.toLocaleString()} MT uncommitted this month`
    : null;
  if (request.requiresMandatoryList && supplier?.mandatoryListCategory !== true) {
    reasons.push({ key: "mandatoryListNotConfirmed", params: {} });
  }
  const requiredCerts = Array.isArray(request.requiredCerts) ? request.requiredCerts : [];
  requiredCerts.forEach(type => {
    const certificate = supplier?.certs.find(item => item.type === type);
    if (!certificate) {
      reasons.push({ key: "missingCert", params: { name: type } });
    } else if (getCertificateStatus(certificate) === "expired") {
      reasons.push({ key: "expiredCert", params: { name: type } });
    } else if (getCertificateStatus(certificate) !== "verified") {
      reasons.push({ key: "unverifiedCert", params: { name: type } });
    }
  });
  const minimumLocalContent = Number(request.minimumLocalContent) || 0;
  if (minimumLocalContent > 0 && supplier && Number(supplier.saudiContent) < minimumLocalContent) {
    reasons.push({ key: "localContentBelow", params: { actual: supplier.saudiContent, required: minimumLocalContent } });
  }
  if (reasons.length) return { ...bid, status: "disqualified", disqualificationReasons: reasons, totalScore: null, deliveryCapacityWarning };

  const midpoint = getBudgetMidpoint(request);
  const priceScore = midpoint
    ? Math.max(0, Math.min(100, 100 - Math.abs(Number(bid.price) - midpoint) / midpoint * 100))
    : null;
  const qualityScore = Number.isFinite(Number(bid.qualityScore)) ? Number(bid.qualityScore) : Number(supplier.quality) || 0;
  const deliveryScore = Number.isFinite(Number(bid.deliveryScore))
    ? Number(bid.deliveryScore)
    : Math.max(0, Math.min(100, 100 - (Number(bid.deliveryDays) || 0)));
  const weights = normalizeScoringWeights(request.scoringWeights);
  const availableWeight = midpoint ? 1 : weights.quality + weights.delivery;
  const totalScore = availableWeight
    ? ((midpoint ? priceScore * weights.price : 0) + qualityScore * weights.quality + deliveryScore * weights.delivery) / availableWeight
    : 0;
  const { disqualificationReasons, ...eligibleBid } = bid;
  return {
    ...eligibleBid,
    status: "reviewing",
    priceScore: priceScore === null ? null : Number(priceScore.toFixed(1)),
    qualityScore: Number(qualityScore.toFixed(1)),
    deliveryScore: Number(deliveryScore.toFixed(1)),
    totalScore: Number(totalScore.toFixed(1)),
    deliveryCapacityWarning,
  };
};

const createInitialData = () => {
  const requests = REQUESTS.map((request, index) => normalizeRequest({
    ...request,
    deadline: demoDateAfterDays([14, 21, 10, 30][index] || 14),
    status: "open",
    requiredCerts: [["SFDA"], ["SASO"], ["SFDA", "HALAL"], ["SFDA"]][index] || [],
    scoringWeights: DEFAULT_SCORING_WEIGHTS,
  }, request));
  const suppliers = SUPPLIERS.map(supplier => normalizeSupplierCertificates(supplier));
  const bids = SUGAR_BIDS.map((bid, index) => ({
    ...bid,
    id: `seed-${bid.supplierId}`,
    requestId: "KAL-2024-0350",
    deliveryDays: parseInt(bid.delivery, 10) || 0,
  })).map(bid => scoreBid(bid, requests.find(request => request.id === bid.requestId), suppliers.find(supplier => supplier.id === bid.supplierId)));
  return {
    requests,
    bids,
    suppliers,
    contracts: CONTRACTS.map((contract, index) => {
      const daysLeft = [12, 58, 5, 180][index] || 30;
      return {
        ...contract,
        daysLeft,
        expiry: demoDateAfterDays(daysLeft),
        zatcaStatus: suppliers.find(supplier => supplier.name === contract.supplier)?.zatcaIntegrationStatus || "not_integrated",
      };
    }),
    approvalTasks: [],
    notifications: [],
    auditLog: [],
  };
};

const loadInitialData = () => {
  const defaults = createInitialData();
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { data: defaults, warning: "" };
    const stored = JSON.parse(saved);
    // Schema 7 is migrated in place; older versions are reset to the current demo defaults.
    if (Number.isInteger(stored?.schemaVersion) && stored.schemaVersion < 7) {
      return {
        data: createInitialData(),
        warning: "",
        toast: "Prototype data format updated, demo data has been reset.",
      };
    }
    if ((stored?.schemaVersion !== SCHEMA_VERSION && stored?.schemaVersion !== 7) || !stored.data) {
      const warning = stored?.lang === "ar"
        ? `تم تحديث البيانات التجريبية إلى الإصدار ${SCHEMA_VERSION}؛ تمت إعادة تعيين العرض — اضغط على "إعادة تعيين البيانات التجريبية" لمسح هذا التنبيه.`
        : `Prototype data upgraded to schema v${SCHEMA_VERSION}; demo reset. — press "Reset demo data" to clear this notice.`;
      return { data: createInitialData(), warning };
    }
    const parsed = stored.data;
    if (
      !Array.isArray(parsed.requests) ||
      !Array.isArray(parsed.bids) ||
      !Array.isArray(parsed.suppliers) ||
      !Array.isArray(parsed.contracts) ||
      !Array.isArray(parsed.notifications) ||
      !Array.isArray(parsed.auditLog)
    ) {
      return { data: defaults, warning: "Saved prototype data was invalid; a fresh demo has been loaded." };
    }
    const malformedCoreRecords =
      parsed.requests.some(request => !request || typeof request.id !== "string" || typeof request.title !== "string") ||
      parsed.bids.some(bid => !bid || typeof bid.id !== "string" || typeof bid.requestId !== "string" || typeof bid.supplierId === "undefined" || !Number.isFinite(Number(bid.price))) ||
      parsed.suppliers.some(supplier => !supplier || !Number.isFinite(Number(supplier.id)) || typeof supplier.name !== "string") ||
      parsed.contracts.some(contract => !contract || typeof contract.id !== "string" || typeof contract.supplier !== "string") ||
      parsed.auditLog.some(entry => !entry || typeof entry !== "object" || typeof entry.action !== "string");
    if (malformedCoreRecords) {
      return {
        data: defaults,
        warning: stored.lang === "ar"
          ? "بيانات النموذج المحفوظة تالفة؛ تم تحميل بيانات تجريبية جديدة."
          : "Saved prototype data was malformed; a fresh demo has been loaded.",
      };
    }
    const requests = parsed.requests
      .filter(request => request && typeof request.id === "string" && typeof request.title === "string")
      .map(request => normalizeRequest(request, defaults.requests.find(item => item.id === request.id)));
    const suppliers = (parsed.suppliers.filter(supplier => supplier && Number.isFinite(Number(supplier.id)) && typeof supplier.name === "string").length
      ? parsed.suppliers.filter(supplier => supplier && Number.isFinite(Number(supplier.id)) && typeof supplier.name === "string")
      : defaults.suppliers).map(supplier => normalizeSupplierCertificates(
        supplier,
        defaults.suppliers.find(item => item.id === Number(supplier.id))
      ));
    const bids = parsed.bids
      .filter(bid => bid && typeof bid.id === "string" && typeof bid.requestId === "string" && typeof bid.supplierId !== "undefined" && Number.isFinite(Number(bid.price)))
      .filter(bid => !(
        bid.id === "seed-1" &&
        bid.requestId === "KAL-2024-0350" &&
        requests.find(request => request.id === bid.requestId)?.status === "open"
      ))
      .map(bid => {
        const legacyReasonToObject = reason => {
          if (reason && typeof reason === "object" && typeof reason.key === "string") return reason;
          if (typeof reason !== "string") return null;
          if (reason === "Supplier profile is unavailable.") return { key: "supplierUnavailable", params: {} };
          if (reason === "Supplier is blacklisted.") return { key: "supplierBlacklisted", params: {} };
          if (reason.includes("LCGPA Mandatory List")) return { key: "mandatoryListNotConfirmed", params: {} };
          let match = reason.match(/^Missing required (.+) certification\.$/);
          if (match) return { key: "missingCert", params: { name: match[1] } };
          match = reason.match(/^(.+) certification expired\.$/);
          if (match) return { key: "expiredCert", params: { name: match[1] } };
          match = reason.match(/^(.+) certification is not verified\.$/);
          if (match) return { key: "unverifiedCert", params: { name: match[1] } };
          match = reason.match(/^Saudi content (\d+(?:\.\d+)?)% is below the required (\d+(?:\.\d+)?)%\.$/);
          if (match) return { key: "localContentBelow", params: { actual: match[1], required: match[2] } };
          return null;
        };
        const rawReasons = bid.disqualificationReasons;
        const normalizedReasons = Array.isArray(rawReasons) ? rawReasons.map(legacyReasonToObject) : [];
        if (Array.isArray(rawReasons) && normalizedReasons.some(reason => !reason)) {
          throw new Error("Saved bid contained an unsupported disqualification reason.");
        }
        const normalizedBid = {
          ...bid,
          status: ["reviewing", "disqualified"].includes(bid.status) ? bid.status : "reviewing",
          ...(Array.isArray(rawReasons) ? { disqualificationReasons: normalizedReasons } : {}),
        };
        return scoreBid(normalizedBid, requests.find(request => request.id === bid.requestId), suppliers.find(supplier => supplier.id === bid.supplierId));
      });
    const contracts = parsed.contracts.filter(contract => contract && typeof contract.id === "string" && typeof contract.supplier === "string");
    const approvalTasks = Array.isArray(parsed.approvalTasks)
      ? parsed.approvalTasks.filter(task => task && typeof task.id === "string" && typeof task.requestId === "string")
      : [];
    try {
      requests.filter(request => request.status === "pending_approval" && !approvalTasks.some(task => task.requestId === request.id && task.status === "pending"))
        .forEach(request => {
          const bid = bids.find(item => item.id === request.awardedBidId) || bids.find(item => item.requestId === request.id && item.supplierId === request.awardedSupplierId);
          const supplier = suppliers.find(item => item.id === request.awardedSupplierId);
          if (!bid || !supplier) return;
          let contract = contracts.find(item => item.requestId === request.id)
            || contracts.find(item => item.supplier === supplier.name && item.item === request.title);
          if (!contract) {
            contract = {
              id: `CON-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(4, "0")}`,
              supplier: supplier.name,
              item: request.title,
              value: money(bid.price),
              expiry: dateAfterDays(365),
              daysLeft: 365,
              status: "pending",
              requestId: request.id,
              zatcaStatus: suppliers.find(item => item.id === supplier.id)?.zatcaIntegrationStatus || "not_integrated",
            };
            contracts.unshift(contract);
          } else if (!contract.requestId) {
            contract.requestId = request.id;
          }
          approvalTasks.push({
            id: `approval-${request.id}`,
            requestId: request.id,
            contractId: contract.id,
            bidId: bid.id,
            supplierId: supplier.id,
            assignedRole: USER_ROLES.BUYER_APPROVER,
            status: "pending",
            createdAt: new Date().toISOString(),
            awardedBy: "Migrated demo award",
          });
        });
    } catch (error) {
      console.warn("Orphaned approval migration failed:", error);
    }
    return {
      data: {
        ...defaults,
        ...parsed,
        requests,
        bids,
        suppliers,
        contracts,
        approvalTasks,
        notifications: parsed.notifications.filter(notification => notification && typeof notification.id === "string" && typeof notification.message === "string"),
        auditLog: parsed.auditLog.map(entry => {
          if (!entry || typeof entry !== "object") return null;
          const action = LEGACY_AUDIT_ACTIONS[entry.action] || entry.action;
          return {
            ...entry,
            action,
            ...(!entry.detailsKey ? { detailsKey: action, detailsParams: {} } : {}),
          };
        }).filter(Boolean).slice(-MAX_AUDIT_ENTRIES),
      },
      warning: "",
    };
  } catch (error) {
    return {
      data: defaults,
      warning: `Could not load saved prototype data: ${error.message}`,
    };
  }
};

const formatNumber = (value, lang) => Number(value).toLocaleString("en-US");
const formatDateTime = (iso, lang) => {
  if (iso == null || iso === "") return lang === "ar" ? "تاريخ ووقت غير صالحين" : "Invalid date and time";
  const parsedDate = new Date(iso);
  if (Number.isNaN(parsedDate.getTime())) return lang === "ar" ? "تاريخ ووقت غير صالحين" : "Invalid date and time";
  return parsedDate.toLocaleString(dateLocale(lang), {
    dateStyle: "medium",
    timeStyle: "short",
  });
};
const money = (value, lang = "en") => `${lang === "ar" ? "ر.س" : "SAR"} ${formatNumber(value, lang)}`;
const bidsCountLabel = (n, lang) => lang === "ar"
  ? formatMessage(I18N[lang].bidsCount, { n: formatNumber(n, "en") })
  : `${formatNumber(n, "en")} bid${n === 1 ? "" : "s"}`;
const formatMessage = (template, values = {}) => String(template ?? "[missing translation]").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? `{${key}}`);
const renderAuditDetails = (entry, t, lang = "en") => {
  if (entry.detailsKey && t.auditDetails?.[entry.detailsKey]) {
    const params = { ...(entry.detailsParams || {}) };
    if (typeof params.name === "string") params.name = supplierName(params.name, lang);
    return formatMessage(t.auditDetails[entry.detailsKey], params);
  }
  if (entry.details) return entry.details;
  return t.auditActions?.[entry.action] || entry.action;
};
const uid = (prefix) => `${prefix}-${(typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2)}`;
const currentMonthPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};
const normalizeCapacityDeclarations = (declarations) => (Array.isArray(declarations) ? declarations : [])
  .filter(item => item && typeof item.id === "string" && /^\d{4}-\d{2}$/.test(item.period))
  .map(item => ({
    id: item.id,
    period: item.period,
    declaredCapacity: Number.isFinite(Number(item.declaredCapacity)) && Number(item.declaredCapacity) >= 0
      ? Number(item.declaredCapacity) : 0,
    committedCapacity: Number.isFinite(Number(item.committedCapacity)) && Number(item.committedCapacity) >= 0
      ? Number(item.committedCapacity) : 0,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date().toISOString(),
  }));
const createAuditEntry = ({ actor, action, entityType, entityId, detailsKey, detailsParams, createdAt = new Date().toISOString() }) => ({
  id: uid("audit"),
  action,
  actorId: actor.id,
  actorName: actor.name,
  entityType,
  entityId: String(entityId),
  detailsKey,
  detailsParams,
  createdAt,
});
const dateInPast = (dateString) => new Date(dateString).getTime() < new Date().setHours(0, 0, 0, 0);
const statusLabel = (status, lang = "en") => {
  const english = {
    open: "Open",
    disqualified: "Disqualified",
    awarded: "Awarded",
    approved: "Approved",
    pending_approval: "Pending approval",
    active: "Active",
    pending: "Pending approval",
    expiring: "Expiring",
    critical: "Critical",
  };
  const arabic = {
    open: "مفتوح",
    disqualified: "مستبعد",
    awarded: "تمت الترسية",
    approved: "معتمد",
    pending_approval: "بانتظار الموافقة",
    active: "نشط",
    pending: "بانتظار الموافقة",
    expiring: "قارب على الانتهاء",
    critical: "حرج",
  };
  return (lang === "ar" ? arabic : english)[status] || status;
};

const ScoreRing = ({ score, size = 56 }) => {
  const r = (size / 2) - 5;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 90 ? C.greenLight : score >= 80 ? C.gold : C.red;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={4} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4} strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size > 50 ? 14 : 11, fontWeight: 700, color, fontFamily: "monospace" }}>{score}</div>
    </div>
  );
};

const CertBadge = ({ certificate, lang = "en" }) => {
  const definition = CERT_TYPES[certificate.type];
  if (!definition) return null;
  const status = getCertificateStatus(certificate);
  const days = daysUntil(certificate.expiryDate);
  const expiringSoon = status === "verified" && days >= 0 && days <= 30;
  const color = status === "expired" ? C.red : status === "pending" || expiringSoon ? C.gold : definition.color;
  return (
    <span title={expiringSoon ? `${lang === "ar" ? "تنتهي في" : "Expires"} ${certificate.expiryDate}` : undefined} style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {status === "expired" ? `⚠ ${certLabel(certificate.type, lang)} ${lang === "ar" ? "منتهية" : "expired"}` : status === "pending" ? `${certLabel(certificate.type, lang)} ${lang === "ar" ? "قيد التحقق" : "pending"}` : expiringSoon ? `${certLabel(certificate.type, lang)} · ${days}d` : certLabel(certificate.type, lang)}
    </span>
  );
};

const sortCertificatesByExpiry = (certificates) => certificates.slice().sort((a, b) => {
  const priority = certificate => getCertificateStatus(certificate) === "expired" ? 0
    : daysUntil(certificate.expiryDate) <= 30 ? 1 : 2;
  return priority(a) - priority(b);
});

const Badge = ({ children, color = C.gold, small, title }) => (
  <span title={title} style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: small ? "2px 6px" : "3px 10px", fontSize: small ? 10 : 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
);

const Stat = ({ label, value, sub, accent, lang = "en" }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent || C.white, fontFamily: "monospace" }}>{typeof value === "number" ? formatNumber(value, lang) : value}</div>
    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: C.greenLight }}>{sub}</div>}
  </div>
);

const Card = ({ children, style: s, onClick, highlight, warning, id, "aria-labelledby": ariaLabelledBy }) => (
  <div id={id} aria-labelledby={ariaLabelledBy} onClick={onClick} style={{ background: C.bgCard, border: `1px solid ${highlight ? C.gold + "55" : warning ? C.red + "44" : C.border}`, borderRadius: 10, padding: 20, cursor: onClick ? "pointer" : "default", transition: "border-color 0.2s", ...s }}>{children}</div>
);

const SectionTitle = ({ children, id }) => (
  <div id={id} style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>{children}</div>
);

const Input = ({ placeholder, value, onChange, type = "text", id, min, max }) => (
  <input id={id} type={type} min={min} max={max} placeholder={placeholder} value={value} onChange={onChange}
    style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" }} />
);

const Select = ({ value, onChange, options, style: s }) => (
  <select value={value} onChange={onChange} style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", ...s }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Button = ({ children, onClick, variant = "primary", small, disabled, fullWidth, ariaPressed, title, style: customStyle }) => {
  const variants = {
    primary: { background: C.gold, color: C.bg, border: "none" },
    ghost: { background: "transparent", color: C.gold, border: `1px solid ${C.gold}55` },
    subtle: { background: C.bgLight, color: C.textDim, border: `1px solid ${C.border}` },
    teal: { background: C.teal, color: C.white, border: "none" },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.red}44` },
    green: { background: C.green, color: C.white, border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={ariaPressed} title={title} style={{ ...variants[variant], borderRadius: 6, padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit", letterSpacing: "0.02em", whiteSpace: "nowrap", width: fullWidth ? "100%" : "auto", ...customStyle }}>{children}</button>
  );
};

const FilterEmptyState = ({ message, actions }) => (
  <Card style={{ marginBottom: 12 }}>
    <div style={{ color: C.textMuted, fontSize: 13, marginBottom: actions.length ? 10 : 0 }}>{message}</div>
    {actions.length > 0 && (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {actions.map(action => (
          <Button key={action.label} small variant="subtle" onClick={action.onClick}>{action.label}</Button>
        ))}
      </div>
    )}
  </Card>
);

const ScoreBar = ({ label, value, weight }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
      <span style={{ fontSize: 11, color: C.textDim }}>{label} <span style={{ color: C.textMuted }}>({weight}%)</span></span>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{value}</span>
    </div>
    <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
      <div style={{ height: 3, width: `${value}%`, background: value >= 90 ? C.greenLight : value >= 75 ? C.gold : C.red, borderRadius: 2 }} />
    </div>
  </div>
);

const PaymentLabel = ({ term, lang = "en" }) => {
  const color = term === "net30" || term === "net60" ? C.greenLight : term === "prepay_full" ? C.red : term === "negotiable" ? C.gold : C.teal;
  return <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{paymentLabel(term, lang)}</span>;
};

const RiskFlag = ({ msg, children }) => (
  <div style={{ background: C.red + "11", border: `1px solid ${C.red}33`, borderRadius: 6, padding: "6px 10px", fontSize: 11, color: C.red, marginTop: 8 }}>⚠ {children || msg}</div>
);

const ExpiredCertificateWarning = ({ certificate, lang = "en" }) => (
  <RiskFlag>
    {formatMessage(I18N[lang].certificateExpiredWarning, {
      name: certificateLabel(certificate, lang),
      expiryDate: certificate.expiryDate,
      number: certificate.certificateNumber,
    })}
  </RiskFlag>
);

const SupplierModal = ({ supplier, auditLog = [], lang = "en", onClose, onTogglePreferred, onToggleBlacklist }) => {
  const t = I18N[lang];
  const supplierAuditLog = auditLog
    .filter(entry => entry.entityType === "supplier" && entry.entityId === String(supplier.id))
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
  <div className="app-modal-overlay" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
    <div className="app-modal" style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, margin: "auto" }}>
      <div style={{ color: C.gold, fontSize: 11, marginBottom: 12 }}>{lang === "ar" ? "ملف المورد ودرجاته واعتماداته وسجله بيانات توضيحية." : "Sample supplier profile; scores, credentials, and history are illustrative demo data."}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{supplierName(supplier.name, lang)}</span>
            {supplier.preferred && <Badge small color={C.gold}>{lang === "ar" ? "مفضل" : "Preferred"}</Badge>}
            {supplier.blacklisted && <Badge small color={C.red}>{lang === "ar" ? "مدرج بالقائمة السوداء" : "Blacklisted"}</Badge>}
          </div>
          {lang === "ar" && supplierName(supplier.name, "ar") !== supplier.name ? <div style={{ fontSize: 10, color: C.textMuted }}>{supplier.name}</div> : null}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{supplier.certs.filter(certificate => getCertificateStatus(certificate) !== "expired").map(certificate => <CertBadge key={certificate.certificateNumber} certificate={certificate} lang={lang} />)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <ScoreRing score={supplier.score} size={60} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
      </div>
      {supplier.riskFlag && <RiskFlag msg={riskFlagLabel(supplier.riskFlag, lang)} />}
      <div style={{ marginTop: 16 }}>
        <SectionTitle>{lang === "ar" ? "سجلات الشهادات" : "Certificate Records"}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {supplier.certs.map(certificate => {
            const status = getCertificateStatus(certificate);
            return (
              <div key={certificate.certificateNumber} style={{ background: C.bgLight, border: `1px solid ${status === "expired" ? C.red + "66" : C.border}`, borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: C.text, fontSize: 12 }}>{certificateLabel(certificate, lang)}</strong>
                  {status === "expired"
                    ? <ExpiredCertificateWarning certificate={certificate} lang={lang} />
                    : <CertBadge certificate={certificate} lang={lang} />}
                </div>
                <div style={{ color: C.textDim, fontSize: 10, lineHeight: 1.7, marginTop: 5 }}>
                  {lang === "ar" ? "الجهة المصدرة:" : "Issuer:"} {certificate.issuer} · {lang === "ar" ? "الرقم:" : "Number:"} <span data-ltr>{certificate.certificateNumber}</span><br />
                  {lang === "ar" ? "تاريخ الإصدار:" : "Issued:"} {certificate.issuedDate} · {lang === "ar" ? "تاريخ الانتهاء:" : "Expires:"} {certificate.expiryDate}<br />
                  {lang === "ar" ? "المستند:" : "Document:"} {certificate.documentUrl}
                </div>
              </div>
            );
          })}
          {supplier.certs.length === 0 && <div style={{ color: C.textMuted, fontSize: 12 }}>{lang === "ar" ? "لا توجد سجلات شهادات." : "No certificate records."}</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: C.bgLight, borderRadius: 8, padding: "10px 12px", marginTop: 12 }}>
        <span style={{ fontSize: 12, color: C.textDim }}>{lang === "ar" ? "القائمة الإلزامية" : "Mandatory List"}</span>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: supplier.mandatoryListCategory === true ? C.greenLight : supplier.mandatoryListCategory === false ? C.red : C.textMuted,
        }}>
          {supplier.mandatoryListCategory === true ? (lang === "ar" ? "تم تأكيد المنتج المحلي" : "Confirmed domestic") : supplier.mandatoryListCategory === false ? (lang === "ar" ? "غير مؤكد" : "Not confirmed") : (lang === "ar" ? "لا ينطبق" : "Not applicable")}
        </span>
      </div>
      <div style={{ background: C.bgLight, borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: C.textDim }}>{lang === "ar" ? "تكامل هيئة الزكاة والضريبة والجمارك" : "ZATCA Integration"}</span>
          <Badge small color={supplier.zatcaIntegrationStatus === "production" ? C.greenLight : supplier.zatcaIntegrationStatus === "sandbox" ? C.gold : C.textMuted}>
            {supplier.zatcaIntegrationStatus === "production" ? (lang === "ar" ? "بيئة الإنتاج" : "Production") : supplier.zatcaIntegrationStatus === "sandbox" ? (lang === "ar" ? "بيئة الاختبار" : "Sandbox") : (lang === "ar" ? "غير متكامل" : "Not Integrated")}
          </Badge>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.6, marginTop: 6 }}>
          {lang === "ar" ? "تتطلب المرحلة الثانية التخليص الفوري عبر فاتورة؛ ولا يمكن للموردين غير المتكاملين إصدار فواتير أعمال متوافقة." : "Phase 2 requires real-time clearance with ZATCA Fatoora; suppliers without integration cannot issue compliant B2B invoices."}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20, marginTop: 16 }}>
        {[{ l: lang === "ar" ? "السعة" : "Capacity", v: supplier.capacity }, { l: lang === "ar" ? "مدة التوريد" : "Lead Time", v: supplier.leadTime }, { l: lang === "ar" ? "الحد الأدنى للطلب" : "Min. Order", v: supplier.minOrder }].map(r => (
          <div key={r.l} style={{ background: C.bgLight, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 3 }}>{r.v}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{r.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textDim }}>{t.saudiContentLabel}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: supplier.saudiContent >= 60 ? C.gold : C.textMuted, fontFamily: "monospace" }}>{supplier.saudiContent}%</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 8 }}>
          <div style={{ height: 4, width: `${supplier.saudiContent}%`, background: supplier.saudiContent >= 60 ? C.gold : C.textMuted, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{t.vision2030Target}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          <Badge small color={supplier.externalRefs?.lcgpaCertId ? C.greenLight : C.gold}>
            {supplier.externalRefs?.lcgpaCertId ? t.lcgpaVerified : t.selfReported}
          </Badge>
          {supplier.saudiContent < 30 && <Badge small color={C.red}>{t.belowLcgpa30}</Badge>}
          {supplier.externalRefs?.lcgpaCertId && (
            <span style={{ fontSize: 10, color: C.textMuted }}>{lang === "ar" ? "شهادة هيئة المحتوى المحلي:" : "LCGPA certificate:"} {supplier.externalRefs.lcgpaCertId}</span>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <SectionTitle>{lang === "ar" ? "تفصيل التقييم" : "Score Breakdown"}</SectionTitle>
        <ScoreBar label={lang === "ar" ? "تقييم الجودة" : "Quality Rating"} value={supplier.quality} weight={40} />
        <ScoreBar label={lang === "ar" ? "التنافسية السعرية" : "Price Competitiveness"} value={supplier.price} weight={40} />
        <ScoreBar label={lang === "ar" ? "موثوقية التسليم" : "Delivery Reliability"} value={supplier.delivery} weight={20} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
        {[{ l: t.totalBidsStat, v: supplier.bids, color: C.white }, { l: t.completedStat, v: supplier.completed, color: C.greenLight }, { l: t.winRateStat, v: Math.round(supplier.completed / supplier.bids * 100) + "%", color: C.gold }].map(r => (
          <div key={r.l} style={{ background: C.bgLight, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: r.color, fontFamily: "monospace" }}>{r.v}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{r.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <details>
          <summary style={{ cursor: "pointer", listStyle: "none" }}>
            <SectionTitle>{t.decisionAuditTrail} ({supplierAuditLog.length})</SectionTitle>
          </summary>
          <div aria-live="polite" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            {supplierAuditLog.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textMuted }}>
                {lang === "ar" ? "لا يوجد نشاط مسجل لهذا المورد." : "No recorded activity for this supplier."}
              </div>
            ) : (
              <div style={{ marginInlineStart: 5, borderInlineStart: `1px solid ${C.border}` }}>
                {supplierAuditLog.map(entry => (
                  <div key={entry.id} style={{ position: "relative", paddingBlockEnd: 16, paddingInlineStart: 18 }}>
                    <span aria-hidden="true" style={{ position: "absolute", insetInlineStart: -5, top: 3, width: 9, height: 9, borderRadius: "50%", background: C.gold, border: `2px solid ${C.bgCard}` }} />
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 12, color: C.white }}>
                        <strong>{entry.actorName}</strong> <span style={{ color: C.gold }}>{t.auditActions?.[entry.action] || entry.action}</span>
                      </div>
                      <time dateTime={entry.createdAt} style={{ fontSize: 10, color: C.textMuted }}>{formatDateTime(entry.createdAt, lang)}</time>
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                      {renderAuditDetails(entry, t, lang)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button small variant={supplier.preferred ? "ghost" : "teal"} onClick={() => onTogglePreferred(supplier.id)}>
          {supplier.preferred ? (lang === "ar" ? "إزالة التفضيل" : "Remove Preferred") : (lang === "ar" ? "★ تعيين كمفضل" : "★ Mark Preferred")}
        </Button>
        <Button small variant={supplier.blacklisted ? "ghost" : "danger"} onClick={() => onToggleBlacklist(supplier.id)}>
          {supplier.blacklisted ? (lang === "ar" ? "إزالة من القائمة السوداء" : "Remove Blacklist") : (lang === "ar" ? "إدراج بالقائمة السوداء" : "Blacklist")}
        </Button>
        <Button small variant="subtle" onClick={onClose}>{lang === "ar" ? "إغلاق" : "Close"}</Button>
      </div>
    </div>
  </div>
  );
};

const ClarificationAnswer = ({ item, lang = "en", onAnswer }) => {
  const [answer, setAnswer] = useState("");
  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        aria-label={`Answer for ${item.id}`}
        placeholder={lang === "ar" ? "اكتب إجابة عامة..." : "Write a public answer..."}
        value={answer}
        onChange={event => setAnswer(event.target.value)}
        style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", color: C.text, fontSize: 12, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 60, boxSizing: "border-box" }}
      />
      <Button small disabled={!answer.trim()} onClick={() => {
        onAnswer(item.id, answer.trim());
        setAnswer("");
      }}>{I18N[lang].answerQuestion}</Button>
    </div>
  );
};

const ClarificationThread = ({ request, role, lang = "en", onAnswer }) => {
  const t = I18N[lang];
  return (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {request.clarifications.length === 0 && (
      <div style={{ color: C.textMuted, fontSize: 12 }}>{t.emptyNoClarifications}</div>
    )}
    {request.clarifications.map(item => (
      <div key={item.id} style={{ background: C.bgLight, borderRadius: 7, padding: 10 }}>
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
          {t.supplierHashLabel} {item.supplierId} · {formatDateTime(item.createdAt, lang)}
        </div>
        <div style={{ color: C.text, fontSize: 12, whiteSpace: "pre-wrap" }}>{item.question}</div>
        {item.answer ? (
          <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 8, paddingTop: 8 }}>
            <div style={{ fontSize: 10, color: C.tealLight, marginBottom: 4 }}>
              {t.answeredByLabel} {item.answeredBy || t.buyerRoleLabel}{item.answeredAt ? ` · ${formatDateTime(item.answeredAt, lang)}` : ""}
            </div>
            <div style={{ color: C.textDim, fontSize: 12, whiteSpace: "pre-wrap" }}>{item.answer}</div>
          </div>
        ) : role === USER_ROLES.BUYER_ADMIN && (
          <ClarificationAnswer item={item} lang={lang} onAnswer={onAnswer} />
        )}
      </div>
    ))}
  </div>
  );
};

const ClarificationModal = ({ request, role, currentSupplierId, lang = "en", onSubmit, onAnswer, onClose }) => {
  const t = I18N[lang];
  const [question, setQuestion] = useState("");
  return (
    <div className="app-modal-overlay" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div className="app-modal" style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 560, margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
          <div>
            <div data-ltr style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginBottom: 4 }}>{request.id}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{t.qaTitle}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{lang === "ar" ? (request.titleAr || request.title) : request.title}</div>
          </div>
          <button aria-label="Close Q&A" onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
        {role === USER_ROLES.SUPPLIER_SALES && (
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="clarification-question" style={{ display: "block", color: C.textMuted, fontSize: 12, marginBottom: 6 }}>{lang === "ar" ? `اطرح سؤالاً عاماً بصفتك المورد رقم ${currentSupplierId}` : `Ask a public question as Supplier #${currentSupplierId}`}</label>
            <textarea id="clarification-question" placeholder={lang === "ar" ? "أدخل سؤالك..." : "Enter your question..."} value={question} onChange={event => setQuestion(event.target.value)}
              style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 72, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <Button small disabled={!question.trim()} onClick={() => {
                onSubmit(request.id, question.trim());
                setQuestion("");
              }}>{t.askQuestion}</Button>
            </div>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {lang === "ar" ? `الأسئلة والأجوبة (${request.clarifications.length})` : `Questions and answers (${request.clarifications.length})`}
        </div>
        <ClarificationThread request={request} role={role} lang={lang} onAnswer={(id, answer) => onAnswer(request.id, id, answer)} />
      </div>
    </div>
  );
};

const BidModal = ({ req, existingBid, onSubmit, onAnswerClarification, profileCompletenessMessage, role, lang = "en", onClose }) => {
  const t = I18N[lang];
  const [isUpdate] = useState(Boolean(existingBid));
  const [price, setPrice] = useState(existingBid ? String(existingBid.price) : "");
  const [timeline, setTimeline] = useState(existingBid ? existingBid.delivery : "");
  const [notes, setNotes] = useState(existingBid ? existingBid.notes : "");
  const [paymentTerms, setPaymentTerms] = useState(existingBid ? existingBid.paymentTerms : "net30");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [showClarifications, setShowClarifications] = useState(false);
  const bidReadinessChecks = [
    { key: "price", label: t.supplierBidPriceReady, ready: Number(String(price).replace(/,/g, "")) > 0 },
    { key: "delivery", label: t.supplierBidDeliveryReady, ready: Boolean(timeline.trim()) },
    { key: "payment", label: t.supplierBidPaymentReady, ready: Boolean(paymentTerms) },
  ];
  const bidReadinessCount = bidReadinessChecks.filter(item => item.ready).length;
  const handleSubmit = () => {
    if (profileCompletenessMessage) {
      setError(profileCompletenessMessage);
      return;
    }
    const numericPrice = Number(String(price).replace(/,/g, ""));
    if (!Number.isFinite(numericPrice) || numericPrice <= 0 || !timeline.trim()) {
      setError(t.errBidPrice);
      return;
    }
    if (req.negotiation?.status === "open" && req.negotiation.floorPrice !== null &&
      numericPrice < req.negotiation.floorPrice) {
      setError(t.errBelowFloor);
      return;
    }
    const result = onSubmit({
      price: numericPrice,
      delivery: timeline.trim(),
      deliveryDays: parseInt(timeline, 10) || 0,
      notes: notes.trim(),
      paymentTerms,
    });
    if (result === false) return;
    setSubmitted(true);
  };
  return (
    <div className="app-modal-overlay" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div className="app-modal" style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, margin: "auto" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight }}>{isUpdate ? t.bidUpdated : t.bidSubmitted}</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 8 }}>{t.bidSubmittedNote}</div>
            <Button onClick={onClose} style={{ marginTop: 20 }}>{t.done}</Button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div data-ltr style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginBottom: 4 }}>{req.id}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{lang === "ar" ? (req.titleAr || req.title) : req.title}</div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 18, fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
              {lang === "ar" ? (req.specsAr || req.specs) : req.specs} · <span style={{ color: C.gold }}>{req.quantity}</span> · {t.budgetLabel}: <span style={{ color: C.greenLight }}>{req.budget}</span>
              {req.requiredPayment && <div style={{ marginTop: 6 }}>{t.buyerPrefersLabel} <PaymentLabel term={req.requiredPayment} lang={lang} /></div>}
              {req.negotiation?.status === "open" && req.negotiation.floorPrice !== null && (
                <div style={{ marginTop: 6, color: C.red }}>
                  {t.previousBidLabel} {existingBid ? `SAR ${formatNumber(existingBid.price, "en")}` : (lang === "ar" ? "لا يوجد" : "None")} · {t.floorLabel} SAR {formatNumber(req.negotiation.floorPrice, "en")}
                </div>
              )}
            </div>
            <div aria-live="polite" style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                <strong style={{ fontSize: 12, color: C.white }}>{t.supplierBidReadinessTitle}</strong>
                <span style={{ fontSize: 11, color: bidReadinessCount === bidReadinessChecks.length ? C.greenLight : C.gold }}>{formatMessage(t.supplierBidReadinessCount, { ready: bidReadinessCount, total: bidReadinessChecks.length })}</span>
              </div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 8 }}>{t.supplierBidReadinessHint}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {bidReadinessChecks.map(item => <span key={item.key} style={{ fontSize: 11, color: item.ready ? C.greenLight : C.textMuted }}>{item.ready ? "✓" : "○"} {item.label}</span>)}
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "10px 0", marginBottom: 14 }}>
              <button type="button" aria-expanded={showClarifications} onClick={() => setShowClarifications(open => !open)}
                style={{ background: "none", border: "none", color: C.gold, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                {t.qaTitle} ({req.clarifications.length}) · {showClarifications ? (lang === "ar" ? "إخفاء" : "Hide") : (lang === "ar" ? "عرض" : "Show")}
              </button>
              {showClarifications && <div style={{ marginTop: 10 }}><ClarificationThread request={req} role={role} lang={lang} onAnswer={onAnswerClarification} /></div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldYourPrice} *</label><Input type="number" placeholder={t.placeholderBidPrice} value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldDelivery} *</label><Input placeholder={t.placeholderBidDelivery} value={timeline} onChange={e => setTimeline(e.target.value)} /></div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldPaymentTerms} *</label>
                <Select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} options={PAYMENT_TERMS.map(term => ({ ...term, label: paymentLabel(term.value, lang) }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldProposalNotes}</label>
                <textarea placeholder={t.placeholderProposalNotes} value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 72, boxSizing: "border-box" }} />
              </div>
              {error && <div role="alert" style={{ color: C.red, fontSize: 12 }}>{error}</div>}
              {profileCompletenessMessage && <div role="alert" style={{ color: C.red, fontSize: 12 }}>{profileCompletenessMessage}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="subtle" onClick={onClose}>{t.cancel}</Button>
                <Button title={existingBid ? "Updates your existing bid" : "Creates a new bid"} disabled={Boolean(profileCompletenessMessage)} onClick={handleSubmit}>{isUpdate ? t.updateBid : t.submitBid}</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const NewRequestModal = ({ onSubmit, lang = "en", onClose }) => {
  const t = I18N[lang];
  const [form, setForm] = useState({ title: "", titleAr: "", category: "Food & Beverage", quantity: "", budgetMin: "", budgetMax: "", minimumLocalContent: 0, requiresMandatoryList: false, specs: "", specsAr: "", anonymous: true, requiredPayment: "net30", requiredCerts: [], scoringWeights: { price: 40, quality: 40, delivery: 20 } });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCert = (c) => set("requiredCerts", form.requiredCerts.includes(c) ? form.requiredCerts.filter(x => x !== c) : [...form.requiredCerts, c]);
  const handleSubmit = () => {
    const min = form.budgetMin ? Number(form.budgetMin.replace(/,/g, "")) : null;
    const max = form.budgetMax ? Number(form.budgetMax.replace(/,/g, "")) : null;
    if (!form.title.trim() || !form.quantity.trim()) {
      setError(t.errTitleRequired);
      return;
    }
    if (min === null || max === null) {
      setError(t.errBudgetBounds);
      return;
    }
    if ((min !== null && (!Number.isFinite(min) || min <= 0)) || (max !== null && (!Number.isFinite(max) || max <= 0))) {
      setError(t.errBudgetPositive);
      return;
    }
    if (min !== null && max !== null && min > max) {
      setError(t.errBudgetOrder);
      return;
    }
    const minimumLocalContent = Number(form.minimumLocalContent);
    if (!Number.isFinite(minimumLocalContent) || minimumLocalContent < 0 || minimumLocalContent > 100) {
      setError(t.errMinLocalContent);
      return;
    }
    const weightTotal = Object.values(form.scoringWeights).reduce((sum, value) => sum + Number(value), 0);
    if (Object.values(form.scoringWeights).some(value => !Number.isFinite(Number(value)) || Number(value) < 0) || Math.abs(weightTotal - 100) > 0.001) {
      setError(t.errWeightsSum);
      return;
    }
    onSubmit({
      ...form,
      title: form.title.trim(),
      quantity: form.quantity.trim(),
      budgetMin: min,
      budgetMax: max,
      minimumLocalContent,
      scoringWeights: Object.fromEntries(Object.entries(form.scoringWeights).map(([key, value]) => [key, Number(value) / 100])),
    });
    setSubmitted(true);
  };
  return (
    <div className="app-modal-overlay" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div className="app-modal" style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, margin: "auto" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight }}>{t.requestPosted}</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 8 }}>{t.requestPostedNote}</div>
            <Button onClick={onClose} style={{ marginTop: 20 }}>{t.done}</Button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{t.newRequestTitle}</div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldTitle} *</label><Input placeholder={t.placeholderRequestTitle} value={form.title} onChange={e => set("title", e.target.value)} /></div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldTitleArabic}</label><Input dir="rtl" placeholder={t.placeholderTitleArabic} value={form.titleAr} onChange={e => set("titleAr", e.target.value)} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldCategory}</label>
                  <Select value={form.category} onChange={e => set("category", e.target.value)} options={[
                    { value: "Food & Beverage", label: lang === "ar" ? "الأغذية والمشروبات" : "Food & Beverage" }, { value: "Raw Materials", label: lang === "ar" ? "المواد الخام" : "Raw Materials" },
                    { value: "Machinery", label: lang === "ar" ? "الآلات" : "Machinery" }, { value: "Packaging", label: lang === "ar" ? "التعبئة والتغليف" : "Packaging" }, { value: "Industrial", label: lang === "ar" ? "الصناعية" : "Industrial" },
                  ]} /></div>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldQuantity} *</label><Input placeholder={t.placeholderQuantity} value={form.quantity} onChange={e => set("quantity", e.target.value)} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldBudgetMin} *</label><Input placeholder={t.placeholderBudgetMin} value={form.budgetMin} onChange={e => set("budgetMin", e.target.value)} /></div>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldBudgetMax} *</label><Input placeholder={t.placeholderBudgetMax} value={form.budgetMax} onChange={e => set("budgetMax", e.target.value)} /></div>
              </div>
              <div>
                <label htmlFor="minimum-local-content" style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldMinLocalContent}</label>
                <Input id="minimum-local-content" type="number" min="0" max="100" value={form.minimumLocalContent} onChange={e => set("minimumLocalContent", e.target.value)} />
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 5 }}>{lang === "ar" ? "تُستبعد عروض الموردين الذين تقل نسبتهم عن هذا الحد. اترك القيمة 0 لتعطيل الشرط." : "Bids from suppliers below this threshold are disqualified. Leave 0 to disable."}</div>
              </div>
              <div style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="requires-mandatory-list" checked={form.requiresMandatoryList} onChange={event => set("requiresMandatoryList", event.target.checked)} style={{ width: 16, height: 16, accentColor: C.gold, cursor: "pointer" }} />
                  <label htmlFor="requires-mandatory-list" style={{ fontSize: 12, color: C.text, cursor: "pointer" }}>{lang === "ar" ? "هذه الفئة مدرجة في القائمة الإلزامية لهيئة المحتوى المحلي." : "This category is on LCGPA Mandatory List."}</label>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, marginInlineStart: 26, lineHeight: 1.7 }}>
                  {lang === "ar" ? "تتطلب القائمة الإلزامية لهيئة المحتوى المحلي أن يكون المنتج محلياً؛ سيتم استبعاد الموردين غير المؤكدين." : "The LCGPA Mandatory List requires domestic products; suppliers without confirmed status will be disqualified."}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldScoringWeights}</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
                  {["price", "quality", "delivery"].map(key => (
                    <div key={key}>
                      <label htmlFor={`weight-${key}`} style={{ fontSize: 10, color: C.textDim, textTransform: "capitalize" }}>{key === "price" ? t.tablePrice : key === "quality" ? t.tableQuality : t.tableDelivery}</label>
                      <Input id={`weight-${key}`} type="number" min="0" max="100" value={form.scoringWeights[key]} onChange={e => set("scoringWeights", { ...form.scoringWeights, [key]: e.target.value })} />
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: Object.values(form.scoringWeights).reduce((sum, value) => sum + (Number(value) || 0), 0) === 100 ? C.greenLight : C.gold, marginTop: 5 }}>
                  {lang === "ar" ? "الإجمالي" : "Total"}: {Object.values(form.scoringWeights).reduce((sum, value) => sum + (Number(value) || 0), 0)}%
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldRequiredCerts}</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(CERT_TYPES).map(([key, cert]) => (
                    <button key={key} onClick={() => toggleCert(key)} style={{ background: form.requiredCerts.includes(key) ? cert.color + "22" : C.bgLight, border: `1px solid ${form.requiredCerts.includes(key) ? cert.color : C.border}`, color: form.requiredCerts.includes(key) ? cert.color : C.textDim, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{certLabel(key, lang)}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldPaymentTerms}</label>
                <Select value={form.requiredPayment} onChange={e => set("requiredPayment", e.target.value)} options={PAYMENT_TERMS.map(term => ({ ...term, label: paymentLabel(term.value, lang) }))} />
              </div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldSpecs}</label>
                <textarea placeholder={t.placeholderSpecs} value={form.specs} onChange={e => set("specs", e.target.value)}
                  style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 72, boxSizing: "border-box" }} />
              </div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>{t.fieldSpecsArabic}</label>
                <textarea dir="rtl" placeholder={t.placeholderSpecsArabic} value={form.specsAr} onChange={e => set("specsAr", e.target.value)}
                  style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 72, boxSizing: "border-box" }} />
              </div>
              <div style={{ background: form.anonymous ? C.gold + "0d" : C.bgLight, border: `1px solid ${form.anonymous ? C.gold + "44" : C.border}`, borderRadius: 8, padding: 14, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="anon" checked={form.anonymous} onChange={e => set("anonymous", e.target.checked)} style={{ width: 16, height: 16, accentColor: C.gold, cursor: "pointer" }} />
                  <label htmlFor="anon" style={{ fontSize: 13, color: C.text, cursor: "pointer", fontWeight: 600 }}>{t.postAnonymously}</label>
                  {form.anonymous && <Badge small color={C.gold}>{t.recommendedBadge}</Badge>}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, marginInlineStart: 26, lineHeight: 1.7 }}>{t.anonExplainer}</div>
              </div>
              {error && <div role="alert" style={{ color: C.red, fontSize: 12 }}>{error}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="subtle" onClick={onClose}>{t.cancel}</Button>
                <Button onClick={handleSubmit}>{t.post}</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ApprovalModal = ({ request, supplier, bid, lang = "en", onConfirm, onClose }) => {
  const t = I18N[lang];
  const [step, setStep] = useState(1);
  const [rationale, setRationale] = useState("");
  const [rationaleError, setRationaleError] = useState("");
  return (
    <div className="app-modal-overlay" style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="app-modal" style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
        {step === 1 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>{t.purchaseOrderSummary}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>{t.reviewBeforeSubmitting}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                { l: lang === "ar" ? "الطلب" : "Request", v: lang === "ar" ? (request.titleAr || request.title) : request.title, id: request.id },
                { l: lang === "ar" ? "المورد الذي رست عليه" : "Awarded Supplier", v: supplier.name },
                { l: lang === "ar" ? "قيمة العقد" : "Contract Value", v: money(bid.price, lang) },
                { l: lang === "ar" ? "التسليم" : "Delivery", v: bid.delivery },
                { l: lang === "ar" ? "شروط الدفع" : "Payment Terms", v: paymentLabel(bid.paymentTerms, lang) },
                { l: lang === "ar" ? "الشهادات" : "Certifications", v: supplier.certs.map(certificate => certificateLabel(certificate, lang)).join(", ") },
                { l: lang === "ar" ? "المحتوى السعودي" : "Saudi Content", v: `${supplier.saudiContent}%` },
              ].map((r, i) => (
                <div key={r.l} style={{ display: "flex", padding: "10px 14px", background: i % 2 === 0 ? C.bgLight : "transparent", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.textMuted, width: 140, flexShrink: 0 }}>{r.l}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{r.v}{r.id && <> — <span data-ltr>{r.id}</span></>}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="award-rationale" style={{ display: "block", fontSize: 12, color: C.textMuted, marginBottom: 6 }}>{t.awardRationaleLabel}</label>
              <textarea id="award-rationale" dir={lang === "ar" ? "rtl" : "ltr"} value={rationale} onChange={event => { setRationale(event.target.value); if (event.target.value.trim()) setRationaleError(""); }} placeholder={t.awardRationalePlaceholder} aria-invalid={Boolean(rationaleError)} aria-describedby={rationaleError ? "award-rationale-error" : undefined} style={{ background: C.bgLight, border: `1px solid ${rationaleError ? C.red : C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 84, boxSizing: "border-box" }} />
              {rationaleError && <div id="award-rationale-error" role="alert" style={{ color: C.red, fontSize: 11, marginTop: 5 }}>{rationaleError}</div>}
            </div>
            <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: C.textDim }}>
              {t.approvalTaskExplainer}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="subtle" onClick={onClose}>{t.cancel}</Button>
              <Button onClick={() => { if (!rationale.trim()) { setRationaleError(t.awardRationaleRequired); return; } onConfirm(rationale.trim()); setStep(2); }}>{t.submitForApprovalBtn}</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📨</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight, marginBottom: 8 }}>{t.submittedForApprovalTitle}</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20, lineHeight: 1.7 }}>{t.awardSubmittedNote}</div>
            <Button onClick={onClose} fullWidth>{t.done}</Button>
          </div>
        )}
      </div>
    </div>
  );
};
const MarketPulseWidget = ({ lang = "en" }) => {
  const t = I18N[lang];
  const trendColor = (t) => t === "up" ? C.red : t === "down" ? C.greenLight : C.gold;
  const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>{I18N[lang].marketPulseTitle}</SectionTitle>
        <Badge small color={C.gold}>{t.sampleBadge}</Badge>
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>{I18N[lang].marketPulseNote}</div>
      {MARKET_PULSE.map(m => (
        <div key={m.category} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{lang === "ar" ? m.arCategory : m.category}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{m.unit === "per MT" ? t.perMtLabel : t.per1000Label}</div>
            </div>
            <div style={{ textAlign: "end" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>{money(m.avg, lang)}</div>
              <div aria-label={lang === "ar" ? `اتجاه السعر ${t[`trend${m.trend.charAt(0).toUpperCase() + m.trend.slice(1)}`]}` : `Price trend ${m.trend}`} style={{ fontSize: 12, color: trendColor(m.trend), fontWeight: 600 }}><span data-ltr>{trendIcon(m.trend)} {m.change}</span></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textMuted }}>
            <span>{t.lowLabel} <span style={{ color: C.greenLight }}>{money(m.low, lang)}</span></span>
            <span>{t.highLabel} <span style={{ color: C.red }}>{money(m.high, lang)}</span></span>
          </div>
        </div>
      ))}
    </Card>
  );
};

const ContractTracker = ({ contracts, lang = "en", onNewRequest }) => {
  const t = I18N[lang];
  return (
  <Card id="contract-tracker">
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <SectionTitle>{I18N[lang].contractTrackerTitle}</SectionTitle>
      <Badge small color={C.red}>{formatNumber(contracts.filter(contract => contract.daysLeft <= 14 && contract.daysLeft > 0).length, lang)} {I18N[lang].expiringSoon}</Badge>
    </div>
    {contracts.map(c => {
      const color = c.status === "critical" ? C.red : c.status === "expiring" || c.status === "pending" ? C.gold : C.greenLight;
      return (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{lang === "ar" ? (c.itemAr || c.item) : c.item}</span>
              {c.status !== "active" && <Badge small color={color}>{statusLabel(c.status, lang)}</Badge>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", fontSize: 11, color: C.textMuted }}>
              <span>{supplierName(c.supplier, lang)} · {c.value}</span>
              <Badge small color={c.zatcaStatus === "production" ? C.greenLight : c.zatcaStatus === "sandbox" ? C.gold : C.textMuted}>
                {c.zatcaStatus === "production" ? I18N[lang].zatcaReady : c.zatcaStatus === "sandbox" ? I18N[lang].zatcaSandbox : I18N[lang].zatcaNotIntegrated}
              </Badge>
            </div>
          </div>
          <div style={{ textAlign: "end", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{c.daysLeft} {t.daySuffix}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{formatDate(new Date(c.expiry), lang)}</div>
          </div>
          {c.status !== "active" && (
            <Button small variant="ghost" onClick={onNewRequest} style={{ marginInlineStart: 12 }}>{I18N[lang].rebidBtn}</Button>
          )}
        </div>
      );
    })}
  </Card>
  );
};

const BidComparisonView = ({ request, bids: requestBids, suppliers, auditLog = [], lang = "en", onUpdateSuppliers, onToggleBlacklist, onAward, canManageNegotiation, onStartNegotiation, onCloseNegotiation }) => {
  const t = I18N[lang];
  const [certFilter, setCertFilter] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [supplierModal, setSupplierModal] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    try {
      return window.localStorage.getItem("kalali-bid-view-mode") === "table" ? "table" : "cards";
    } catch (error) {
      console.error("Could not load bid comparison view preference:", error);
      return "cards";
    }
  });
  const [floorPrice, setFloorPrice] = useState(request.negotiation?.floorPrice == null ? "" : String(request.negotiation.floorPrice));
  const [floorPriceError, setFloorPriceError] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());
  useEffect(() => {
    try {
      window.localStorage.setItem("kalali-bid-view-mode", viewMode);
    } catch (error) {
      console.error("Could not save bid comparison view preference:", error);
    }
  }, [viewMode]);
  useEffect(() => {
    setFloorPrice(request.negotiation?.floorPrice == null ? "" : String(request.negotiation.floorPrice));
  }, [request.id, request.negotiation?.floorPrice]);
  useEffect(() => {
    if (request.negotiation?.status !== "open" || !request.negotiation.closesAt) return undefined;
    const updateCountdown = () => setCountdownNow(Date.now());
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [request.negotiation?.status, request.negotiation?.closesAt]);
  const toggleCert = (c) => setCertFilter(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);
  const scoreColor = v => v === null ? C.textMuted : v >= 90 ? C.greenLight : v >= 80 ? C.gold : C.red;
  const closesAtTime = request.negotiation?.closesAt ? new Date(request.negotiation.closesAt).getTime() : NaN;
  const remainingSeconds = Number.isFinite(closesAtTime) ? Math.max(0, Math.floor((closesAtTime - countdownNow) / 1000)) : 0;
  const countdown = `${String(Math.floor(remainingSeconds / 3600)).padStart(2, "0")}:${String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const evaluatedBids = requestBids
    .map(b => {
      const supplier = suppliers.find(s => s.id === b.supplierId);
      return scoreBid({ ...b, supplier }, request, supplier);
    });
  const disqualifiedBids = evaluatedBids.filter(bid => bid.status === "disqualified");
  const eligibleBidCount = evaluatedBids.filter(bid => bid.status === "reviewing").length;
  const bids = evaluatedBids
    .filter(bid => bid.status === "reviewing")
    .filter(b => certFilter.length === 0 || certFilter.every(type =>
      b.supplier.certs.some(certificate => certificate.type === type && getCertificateStatus(certificate) === "verified")
    ))
    .filter(b => paymentFilter === "all" || b.paymentTerms === paymentFilter)
    .sort((a, b) => b.totalScore - a.totalScore);
  const comparisonEmptyActions = [
    ...certFilter.map(type => ({
      label: `${lang === "ar" ? "مسح تصفية" : "Clear"} ${CERT_TYPES[type] ? certLabel(type, lang) : type} ${lang === "ar" ? "الشهادة" : "filter"}`,
      onClick: () => setCertFilter(current => current.filter(item => item !== type)),
    })),
    ...(paymentFilter !== "all" ? [{ label: lang === "ar" ? "مسح شروط الدفع" : "Clear payment terms", onClick: () => setPaymentFilter("all") }] : []),
  ];
  const comparisonEmptyMessage = eligibleBidCount === 0
    ? t.emptyNoEligibleBids
    : t.emptyNoBids;
  const disqualificationReasonLabel = reason => {
    if (typeof reason === "string") return reason;
    const template = t.disqualifyReasons?.[reason?.key];
    if (!template) return reason?.key || "";
    const params = { ...(reason.params || {}) };
    if (typeof params.name === "string" && CERT_TYPES[params.name]) {
      params.name = certLabel(params.name, lang);
    }
    return formatMessage(template, params);
  };
  const winner = bids[0];
  const saudiContentColor = value => value >= 60 ? C.greenLight : value >= 30 ? C.gold : C.red;
  const minPrice = bids.length ? Math.min(...bids.map(bid => bid.price)) : 0;
  const maxPrice = bids.length ? Math.max(...bids.map(bid => bid.price)) : 0;
  const priceBarColor = (price) => {
    const ratio = maxPrice === minPrice ? 0 : (price - minPrice) / (maxPrice - minPrice);
    return `hsl(${142 - ratio * 142} 65% 48%)`;
  };
  const awardedId = request.awardedSupplierId;
  const requestAuditLog = auditLog
    .filter(entry => entry.entityId === request.id && entry.entityType !== "supplier")
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const hasWithdrawnBid = requestAuditLog.some(entry => entry.action === "bid_withdrawn");
  const handleTogglePreferred = (id) => onUpdateSuppliers(suppliers.map(s => s.id === id ? { ...s, preferred: !s.preferred } : s));
  const handleToggleBlacklist = (id) => onToggleBlacklist(id, request.id);
  const submitAward = (selectedBid) => {
    if (selectedBid.status === "disqualified") return;
    setApprovalModal({ supplier: selectedBid.supplier, bid: selectedBid });
  };
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 4 }}>{t.compare}</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>{t.compareRankingNote}</div>
        <div style={{ fontSize: 11, color: C.gold, marginTop: 6 }}>{t.compareDisclaimer}</div>
        <div style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.white, marginBottom: 4 }}>{t.buyerDecisionReviewTitle}</div>
          <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>{t.buyerDecisionReviewBody}</div>
        </div>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div data-ltr style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginBottom: 3 }}>{request.id}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.white }}>{lang === "ar" ? (request.titleAr || request.title) : request.title} · {request.quantity}</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>{lang === "ar" ? (request.specsAr || request.specs) : request.specs} · {t.deadlineLabel} {formatDate(new Date(request.deadline), lang)} · {t.paymentLabel} <PaymentLabel term={request.requiredPayment} lang={lang} /></div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
              {lang === "ar" ? "الأوزان" : "Weights"}: {t.tablePrice} {Math.round(request.scoringWeights.price * 100)}% · {t.tableQuality} {Math.round(request.scoringWeights.quality * 100)}% · {t.tableDelivery} {Math.round(request.scoringWeights.delivery * 100)}%.
              {" "}{lang === "ar" ? "تقييم السعر" : "Price score"}: {getBudgetMidpoint(request)
                ? formatMessage(t.priceScoreFormula, { midpoint: formatNumber(getBudgetMidpoint(request), "en") })
                : t.priceScoreUnavailable}
            </div>
            {request.minimumLocalContent > 0 && (
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{t.lcgpaMinimumLabel} {request.minimumLocalContent}%</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={C.gold}>{bidsCountLabel(requestBids.length, lang)}</Badge>
            <Badge color={request.status === "open" ? C.teal : C.gold}>{statusLabel(request.status, lang)}</Badge>
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{t.filterByCert}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(CERT_TYPES).map(([key, cert]) => (
              <button key={key} onClick={() => toggleCert(key)} style={{ background: certFilter.includes(key) ? cert.color + "22" : C.bgLight, border: `1px solid ${certFilter.includes(key) ? cert.color : C.border}`, color: certFilter.includes(key) ? cert.color : C.textDim, borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{certLabel(key, lang)}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{t.filterByPayment}</div>
          <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} options={[{ value: "all", label: t.allTerms }, ...PAYMENT_TERMS.map(term => ({ ...term, label: paymentLabel(term.value, lang) }))]} />
        </div>
      </div>
      {winner && !awardedId && request.status === "open" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: C.gold + "0d", border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span dir={lang === "ar" ? "rtl" : "ltr"} style={{ fontSize: 20 }}>🏆</span>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>{t.recommended} </span>
              <span style={{ fontSize: 13, color: C.text }}>{supplierName(winner.supplier.name, lang)} {t.highestScoreAtLabel} SAR {formatNumber(winner.price, "en")}</span>
            </div>
            <Button small onClick={() => submitAward(winner)}>{t.awardContract}</Button>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>
            {t.winnerSaudiContentLabel}: {winner.supplier.saudiContent}% {request.minimumLocalContent > 0 ? formatMessage(t.winnerSaudiContentThreshold, { n: request.minimumLocalContent }) : ""}
          </div>
        </div>
      )}
      {awardedId && (
        <div style={{ background: C.green + "0d", border: `1px solid ${C.green}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <div style={{ fontSize: 13, color: C.greenLight, fontWeight: 600 }}>{t.awardPendingDemo}{request.awardRationale && <div style={{ color: C.text, fontWeight: 400, marginTop: 8 }}><span style={{ fontWeight: 700 }}>{t.awardRationaleLabel}: </span>{request.awardRationale}</div>}</div>
        </div>
      )}
      {request.status === "open" && (
        <Card style={{ marginBottom: 16, border: `1px solid ${request.negotiation?.status === "open" ? C.gold : C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, color: C.white, fontWeight: 700 }}>{t.negotiationTitle}</div>
              {request.negotiation?.status === "open" ? (
                <div role="timer" aria-live="off" style={{ fontSize: 12, color: C.gold, marginTop: 5 }}>
                  {formatMessage(t.negotiationRoundOpen, { n: request.negotiation.round, time: countdown })}
                  {request.negotiation.floorPrice !== null && ` · Floor SAR ${formatNumber(request.negotiation.floorPrice, "en")}`}
                </div>
              ) : request.negotiation?.status === "closed" ? (
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5 }}>{formatMessage(t.negotiationRoundClosed, { n: request.negotiation.round })}</div>
              ) : (
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 5 }}>{t.negotiationStartHint}</div>
              )}
            </div>
            {canManageNegotiation && (request.negotiation?.status === "open" ? (
              <Button small variant="danger" onClick={() => onCloseNegotiation(request.id)}>{t.closeNegotiation}</Button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <label style={{ fontSize: 11, color: C.textMuted }} htmlFor="negotiation-floor-price">{t.floorPriceLabel}</label>
                <div style={{ width: 120 }}>
                  <Input id="negotiation-floor-price" type="number" min="0" placeholder={t.placeholderFloorPrice} value={floorPrice} onChange={event => { setFloorPrice(event.target.value); setFloorPriceError(""); }} />
                </div>
                <Button small onClick={() => {
                  const parsedFloor = floorPrice.trim() ? Number(floorPrice) : null;
                  if (parsedFloor !== null && (!Number.isFinite(parsedFloor) || parsedFloor <= 0)) {
                    setFloorPriceError(t.errFloorPositive);
                    return;
                  }
                  setFloorPriceError("");
                  onStartNegotiation(request.id, parsedFloor);
                }}>{t.startNegotiation}</Button>
              </div>
            ))}
          </div>
          {floorPriceError && <div role="alert" style={{ color: C.red, fontSize: 11, marginTop: 8 }}>{floorPriceError}</div>}
        </Card>
      )}
      <Card style={{ marginBottom: 16 }}>
        <details aria-labelledby="audit-trail-heading">
          <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", listStyle: "none" }}>
            <SectionTitle id="audit-trail-heading">{t.decisionAuditTrail} ({requestAuditLog.length})</SectionTitle>
          </summary>
          <div aria-live="polite" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
            {requestAuditLog.length === 0 ? (
              <div style={{ fontSize: 12, color: C.textMuted }}>{t.auditTrailEmpty}</div>
            ) : (
              <div style={{ marginInlineStart: 5, borderInlineStart: `1px solid ${C.border}` }}>
                {requestAuditLog.map(entry => (
                  <div key={entry.id} style={{ position: "relative", paddingBlockEnd: 16, paddingInlineStart: 18 }}>
                    <span aria-hidden="true" style={{ position: "absolute", insetInlineStart: -5, top: 3, width: 9, height: 9, borderRadius: "50%", background: C.gold, border: `2px solid ${C.bgCard}` }} />
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 12, color: C.white }}>
                        <strong>{entry.actorName}</strong> <span style={{ color: C.gold }}>{t.auditActions?.[entry.action] || entry.action}</span>
                      </div>
                      <time dateTime={entry.createdAt} style={{ fontSize: 10, color: C.textMuted }}>{formatDateTime(entry.createdAt, lang)}</time>
                    </div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                      {renderAuditDetails(entry, t, lang)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </details>
      </Card>
      <div role="group" aria-label={lang === "ar" ? "طريقة عرض مقارنة العروض" : "Bid comparison view"} style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginBottom: 10 }}>
        <Button small variant={viewMode === "cards" ? "primary" : "subtle"} ariaPressed={viewMode === "cards"} onClick={() => setViewMode("cards")}>{t.viewCards}</Button>
        <Button small variant={viewMode === "table" ? "primary" : "subtle"} ariaPressed={viewMode === "table"} onClick={() => setViewMode("table")}>{t.viewTable}</Button>
      </div>
      {viewMode === "cards" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bids.length === 0 && <FilterEmptyState message={comparisonEmptyMessage} actions={comparisonEmptyActions} />}
        {bids.map((bid, i) => {
          const isWinner = i === 0;
          const isAwarded = awardedId === bid.supplierId;
          const paymentMatch = bid.paymentTerms === "net30" || bid.paymentTerms === "net60" || bid.paymentTerms === "negotiable";
          const sortedCertificates = sortCertificatesByExpiry(bid.supplier.certs);
          return (
            <Card key={bid.supplierId} highlight={isWinner} style={{ position: "relative", overflow: "hidden" }}>
              {isWinner && <div style={{ position: "absolute", insetBlockStart: 0, insetInline: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />}
              {bid.supplier.riskFlag && <div style={{ position: "absolute", top: 0, insetInlineEnd: 0, background: C.red, color: C.white, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderStartStartRadius: 0, borderStartEndRadius: 10, borderEndStartRadius: 6, borderEndEndRadius: 0 }}>{t.riskFlag}</div>}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isWinner ? C.gold : C.textMuted, width: 28, fontFamily: "monospace" }}>#{i + 1}</div>
                  <ScoreRing score={Math.round(bid.totalScore)} size={52} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{supplierName(bid.supplier.name, lang)}</span>
                    {bid.supplier.verified && <Badge small color={C.gold}>{t.sampleVerifiedBadge}</Badge>}
                    {bid.supplier.preferred && <Badge small color={C.gold}>{t.preferredSupplierBadge}</Badge>}
                    {isAwarded && <Badge small color={C.teal}>{t.awardedStatusBadge}</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                    {sortedCertificates.filter(certificate => getCertificateStatus(certificate) !== "expired").map(certificate => <CertBadge key={certificate.certificateNumber} certificate={certificate} lang={lang} />)}
                  </div>
                  {sortedCertificates.filter(certificate => getCertificateStatus(certificate) === "expired").map(certificate => (
                    <ExpiredCertificateWarning key={`expired-${certificate.certificateNumber}`} certificate={certificate} lang={lang} />
                  ))}
                  {request.involvesShipments && <ShipmentCertificateStatus supplier={bid.supplier} lang={lang} />}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{t.paymentLabel}</span>
                    <PaymentLabel term={bid.paymentTerms} lang={lang} />
                    {!paymentMatch && <span style={{ fontSize: 10, color: C.red }}>⚠ {t.paymentMismatch}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{lang === "ar" ? "المحتوى السعودي:" : "Saudi Content:"} <span style={{ color: saudiContentColor(bid.supplier.saudiContent), fontWeight: 600 }}>{bid.supplier.saudiContent}%</span></div>
                  {bid.supplier.riskFlag && <RiskFlag msg={riskFlagLabel(bid.supplier.riskFlag, lang)} />}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, minWidth: 200 }}>
                  {[
                    { label: t.tablePrice, value: bid.priceScore, w: `${Math.round(request.scoringWeights.price * 100)}%` },
                    { label: t.tableQuality, value: bid.qualityScore, w: `${Math.round(request.scoringWeights.quality * 100)}%` },
                    { label: t.tableDelivery, value: bid.deliveryScore, w: `${Math.round(request.scoringWeights.delivery * 100)}%` },
                    { label: lang === "ar" ? "المحتوى السعودي" : "Saudi content", value: `${bid.supplier.saudiContent}%`, color: saudiContentColor(bid.supplier.saudiContent) },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.bgLight, borderRadius: 8, padding: "9px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: s.color || scoreColor(s.value), fontFamily: "monospace" }}>{s.value === null ? "N/A" : s.value}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: C.textMuted }}>{s.w}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 110 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight, fontFamily: "monospace" }}>SAR {formatNumber(bid.price, "en")}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>🚚 {bid.delivery}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Button small variant="ghost" onClick={() => setSupplierModal(bid.supplier)}>{t.viewProfile}</Button>
                    {!awardedId && request.status === "open" && <Button small variant={isWinner ? "primary" : "subtle"} onClick={() => submitAward(bid)}>{t.award}</Button>}
                  </div>
                </div>
              </div>
              {bid.deliveryCapacityWarning && (
                <div role="note" style={{ color: C.gold, fontSize: 11, marginTop: 12, paddingTop: 9, borderTop: `1px solid ${C.border}` }}>
                  ⚠ {bid.deliveryCapacityWarning}
                </div>
              )}
            </Card>
          );
        })}
      </div>
      ) : (
        <Card style={{ marginBottom: 12, padding: 12 }}>
          {bids.length === 0 ? (
            <FilterEmptyState message={comparisonEmptyMessage} actions={comparisonEmptyActions} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000, textAlign: "start" }}>
                <thead>
                  <tr>
                    {["#", t.tableSupplier, t.tablePrice, t.tablePriceBar, t.tableQuality, t.tableDelivery, t.tableTotal, t.tablePayment, lang === "ar" ? "المحتوى" : "Saudi %", t.tableCerts, t.tableActions].map(label => (
                      <th key={label} scope="col" style={{ color: C.textMuted, fontSize: 10, fontWeight: 700, padding: "10px 8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bids.map((bid, i) => {
                    const isAwarded = awardedId === bid.supplierId;
                    const paymentMatch = bid.paymentTerms === "net30" || bid.paymentTerms === "net60" || bid.paymentTerms === "negotiable";
                    const barWidth = maxPrice > 0 ? Math.min(100, bid.price / maxPrice * 100) : 0;
                    const sortedCertificates = sortCertificatesByExpiry(bid.supplier.certs);
                    return (
                      <tr key={bid.supplierId}>
                        <td style={{ color: i === 0 ? C.gold : C.textMuted, padding: "10px 8px", borderBottom: `1px solid ${C.border}`, fontFamily: "monospace" }}>#{i + 1}</td>
                        <td style={{ color: C.white, padding: "10px 8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          {supplierName(bid.supplier.name, lang)}{isAwarded && <span style={{ marginInlineStart: 6 }}><Badge small color={C.teal}>{t.awardedStatusBadge}</Badge></span>}
                        </td>
                        <td style={{ color: C.greenLight, padding: "10px 8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontFamily: "monospace" }}>SAR {formatNumber(bid.price, "en")}</td>
                        <td style={{ minWidth: 100, padding: "10px 8px", borderBottom: `1px solid ${C.border}` }}>
                          <div role="img" aria-label={lang === "ar" ? `شريط السعر ${Math.round(barWidth)} بالمئة` : `Price bar ${Math.round(barWidth)} percent`} style={{ height: 8, width: `${barWidth}%`, minWidth: barWidth > 0 ? 4 : 0, background: priceBarColor(bid.price), borderRadius: 4 }} />
                        </td>
                        <td style={{ color: scoreColor(bid.qualityScore), padding: "10px 8px", borderBottom: `1px solid ${C.border}`, fontFamily: "monospace" }}>{bid.qualityScore}</td>
                        <td style={{ color: scoreColor(bid.deliveryScore), padding: "10px 8px", borderBottom: `1px solid ${C.border}`, fontFamily: "monospace" }}>{bid.deliveryScore}</td>
                        <td style={{ color: scoreColor(bid.totalScore), padding: "10px 8px", borderBottom: `1px solid ${C.border}`, fontFamily: "monospace" }}>{bid.totalScore}</td>
                        <td style={{ padding: "10px 8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          <PaymentLabel term={bid.paymentTerms} lang={lang} />
                          {!paymentMatch && <div style={{ color: C.red, fontSize: 9, marginTop: 3 }}>{t.paymentMismatch}</div>}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                          <span style={{ color: saudiContentColor(bid.supplier.saudiContent), fontWeight: 700, fontFamily: "monospace" }}>{bid.supplier.saudiContent}%</span>
                          {bid.supplier.saudiContent < 30 && <div style={{ marginTop: 4 }}><Badge small color={C.red}>{lang === "ar" ? "أقل من الحد الاسترشادي 30%" : "Below LCGPA 30%"}</Badge></div>}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                            {sortedCertificates.filter(certificate => getCertificateStatus(certificate) !== "expired").map(certificate => <CertBadge key={certificate.certificateNumber} certificate={certificate} lang={lang} />)}
                          </div>
                          {sortedCertificates.filter(certificate => getCertificateStatus(certificate) === "expired").map(certificate => (
                            <ExpiredCertificateWarning key={`expired-${certificate.certificateNumber}`} certificate={certificate} lang={lang} />
                          ))}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <Button small variant="ghost" onClick={() => setSupplierModal(bid.supplier)}>{t.viewProfile}</Button>
                            {!awardedId && request.status === "open" && <Button small variant={i === 0 ? "primary" : "subtle"} onClick={() => submitAward(bid)}>{t.award}</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {disqualifiedBids.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 10 }}>{lang === "ar" ? `العروض المستبعدة (${disqualifiedBids.length})` : `Disqualified bids (${disqualifiedBids.length})`}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {disqualifiedBids.map(bid => (
              <Card key={bid.id} style={{ borderColor: C.red + "66" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>{bid.supplier?.name ? supplierName(bid.supplier.name, lang) : (lang === "ar" ? "مورد غير معروف" : "Unknown supplier")}</div>
                    <div style={{ fontSize: 12, color: C.red, marginTop: 5 }}>{bid.disqualificationReasons.map(disqualificationReasonLabel).join(" ")}</div>
                    {(bid.supplier?.certs || []).filter(certificate => getCertificateStatus(certificate) === "expired").map(certificate => (
                      <ExpiredCertificateWarning key={`expired-${certificate.certificateNumber}`} certificate={certificate} lang={lang} />
                    ))}
                    {request.involvesShipments && <ShipmentCertificateStatus supplier={bid.supplier} lang={lang} />}
                  </div>
                  <Badge small color={C.red}>{t.disqualified}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      {hasWithdrawnBid && (
        <div style={{ color: C.textMuted, fontSize: 11, marginTop: 8 }}>
          {lang === "ar" ? "تم سحب عرض واحد أو أكثر" : "One or more bids were withdrawn."}
        </div>
      )}
      {supplierModal && <SupplierModal supplier={supplierModal} auditLog={auditLog} lang={lang} onClose={() => setSupplierModal(null)} onTogglePreferred={handleTogglePreferred} onToggleBlacklist={handleToggleBlacklist} />}
      {approvalModal && <ApprovalModal
        request={request}
        supplier={approvalModal.supplier}
        bid={approvalModal.bid}
        lang={lang}
        onConfirm={(rationale) => onAward(request, { ...approvalModal, rationale })}
        onClose={() => setApprovalModal(null)}
      />}
    </div>
  );
};

const AnalyticsView = ({ requests, bids, contracts, suppliers, lang = "en" }) => {
  const t = I18N[lang];
  const openRequests = requests.filter(request => request.status === "open" && !dateInPast(request.deadline));
  const participatingSuppliers = new Set(bids.map(bid => bid.supplierId)).size;
  const categoryCounts = requests.reduce((counts, request) => {
    counts[request.category] = (counts[request.category] || 0) + 1;
    return counts;
  }, {});
  const requestsByCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const bidCounts = requests.map(request => ({
    id: request.id,
    title: lang === "ar" ? (request.titleAr || request.title) : request.title,
    count: bids.filter(bid => bid.requestId === request.id).length,
  })).sort((a, b) => b.count - a.count);
  const supplierBidCounts = Object.values(bids.reduce((counts, bid) => {
    const key = bid.supplierId;
    if (!counts[key]) counts[key] = { id: key, name: supplierName(suppliers.find(s => s.id === key)?.name || t.unknownSupplierLabel, lang), count: 0 };
    counts[key].count += 1;
    return counts;
  }, {})).sort((a, b) => b.count - a.count);
  const contractFaceValue = contracts.reduce((sum, contract) => {
    const amount = Number(String(contract.value).replace(/[^\d.]/g, ""));
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const maxCategoryCount = Math.max(1, ...requestsByCategory.map(([, count]) => count));
  const maxBidCount = Math.max(1, ...bidCounts.map(item => item.count));
  const maxSupplierBidCount = Math.max(1, ...supplierBidCounts.map(item => item.count));
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 4 }}>{t.analyticsTitle}</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>{t.analyticsSubtitle}</div>
        <div style={{ fontSize: 11, color: C.gold, marginTop: 6, lineHeight: 1.6 }}>
          {t.analyticsDisclaimer}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: t.statRequestRecords, value: requests.length, accent: C.white },
          { label: t.statOpenRequests, value: openRequests.length, accent: C.gold },
          { label: t.statBidRecords, value: bids.length, accent: C.white },
          { label: t.statSuppliersWithBids, value: participatingSuppliers, accent: C.gold },
          { label: t.statContractRecords, value: contracts.length, accent: C.greenLight },
        ].map(s => <Card key={s.label}><Stat {...s} lang={lang} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>{t.sectionRequestsByCategory}</SectionTitle>
          {requestsByCategory.map(([category, count]) => (
            <div key={category} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{CATEGORIES[category]?.[lang] || category}</span>
                <span style={{ fontSize: 12, color: C.white, fontFamily: "monospace" }}>{count} / {requests.length}</span>
              </div>
              <div style={{ height: 5, background: C.border, borderRadius: 3 }}>
                <div style={{ height: 5, width: `${(count / maxCategoryCount) * 100}%`, background: C.teal, borderRadius: 3 }} />
              </div>
            </div>
          ))}
          {requestsByCategory.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.noRequestRecords}</div>}
        </Card>
        <Card>
          <SectionTitle>{t.sectionBidsByRequest}</SectionTitle>
          {bidCounts.map(item => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{item.title}</span>
                <span style={{ fontSize: 12, color: C.white, fontFamily: "monospace" }}>{item.count}</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                <div style={{ height: 4, width: `${(item.count / maxBidCount) * 100}%`, background: C.gold, borderRadius: 2 }} />
              </div>
            </div>
          ))}
          {bidCounts.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.noBidRecords}</div>}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>{t.sectionBidsBySupplier}</SectionTitle>
          {supplierBidCounts.map(item => (
            <div key={item.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{item.name}</span>
                <span style={{ fontSize: 12, color: C.white, fontFamily: "monospace" }}>{item.count}</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                <div style={{ height: 4, width: `${(item.count / maxSupplierBidCount) * 100}%`, background: C.blue, borderRadius: 2 }} />
              </div>
            </div>
          ))}
          {supplierBidCounts.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.noBidRecords}</div>}
        </Card>
        <Card>
          <SectionTitle>{t.sectionContractRecords}</SectionTitle>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
            {t.recordedFaceValue} {money(contractFaceValue, lang)}. {t.recurringValueDisclaimer}
          </div>
          {contracts.map(contract => (
            <div key={contract.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{lang === "ar" ? (contract.itemAr || contract.item) : contract.item}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{supplierName(contract.supplier, lang)} · <span data-ltr>{contract.id}</span></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: C.white, fontFamily: "monospace" }}>{contract.value}</span>
              </div>
              <Badge small color={contract.status === "active" ? C.greenLight : C.gold}>{statusLabel(contract.status, lang)}</Badge>
            </div>
          ))}
          {contracts.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.noContractRecords}</div>}
        </Card>
      </div>
      <MarketPulseWidget lang={lang} />
    </div>
  );
};
const MarketplaceView = ({ role, supplier, requests, bids, lang = "en", onCreateRequest, onSubmitBid, onBidBlocked, onNavigate, onSubmitClarification, onAnswerClarification }) => {
  const t = I18N[lang];
  const [bidModal, setBidModal] = useState(null);
  const [clarificationRequestId, setClarificationRequestId] = useState(null);
  const [newModal, setNewModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [certFilter, setCertFilter] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [search, setSearch] = useState("");
  const profileCompletenessMessage = role === USER_ROLES.SUPPLIER_SALES
    ? getSupplierProfileBlockMessage(supplier, lang) : "";
  const openBidModal = (req, existingBid) => {
    setBidModal({ req, existingBid });
    if (profileCompletenessMessage) onBidBlocked(profileCompletenessMessage);
  };
  const toggleCert = (c) => setCertFilter(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);
  const filtered = requests.filter(r =>
    r.status === "open" &&
    !dateInPast(r.deadline) &&
    (filter === "all" || r.category === filter) &&
    certFilter.every(cert => (r.requiredCerts || []).includes(cert)) &&
    (paymentFilter === "all" || r.requiredPayment === paymentFilter) &&
    (!search.trim() || `${r.title} ${r.titleAr || ""} ${r.category} ${r.specs} ${r.specsAr || ""}`.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const marketplaceEmptyActions = [
    ...(filter !== "all" ? [{ label: lang === "ar" ? "عرض كل الفئات" : "Show all categories", onClick: () => setFilter("all") }] : []),
    ...certFilter.map(cert => ({
      label: `${lang === "ar" ? "مسح تصفية الشهادة" : "Clear"} ${CERT_TYPES[cert] ? certLabel(cert, lang) : cert} ${lang === "ar" ? "" : "certification filter"}`.trim(),
      onClick: () => setCertFilter(current => current.filter(item => item !== cert)),
    })),
    ...(paymentFilter !== "all" ? [{ label: lang === "ar" ? "مسح شروط الدفع" : "Clear payment terms", onClick: () => setPaymentFilter("all") }] : []),
    ...(search.trim() ? [{ label: lang === "ar" ? "مسح البحث" : "Clear search", onClick: () => setSearch("") }] : []),
  ];
  const hasOpenRequests = requests.some(request => request.status === "open" && !dateInPast(request.deadline));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white }}>{t.openRequestsTitle}</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{formatMessage(t.matchingRequestsCount, { n: formatNumber(filtered.length, lang) })}</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {role === USER_ROLES.BUYER_ADMIN && <Button onClick={() => setNewModal(true)}>{t.postRequest}</Button>}
          <Input placeholder={t.placeholderSearchRequests} value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={filter} onChange={e => setFilter(e.target.value)} options={[
            { value: "all", label: lang === "ar" ? "كل الفئات" : "All Categories" },
            ...[...new Set(requests.map(r => r.category))].map(category => ({ value: category, label: CATEGORIES[category]?.[lang] || category })),
          ]} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{t.requiredCertsFilterLabel}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(CERT_TYPES).map(([key, cert]) => (
              <button key={key} onClick={() => toggleCert(key)} style={{ background: certFilter.includes(key) ? cert.color + "22" : C.bgLight, border: `1px solid ${certFilter.includes(key) ? cert.color : C.border}`, color: certFilter.includes(key) ? cert.color : C.textDim, borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{certLabel(key, lang)}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{t.paymentTermsFilterLabel}</div>
          <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} options={[{ value: "all", label: t.allTerms }, ...PAYMENT_TERMS.map(term => ({ ...term, label: paymentLabel(term.value, lang) }))]} />
        </div>
      </div>
      {filtered.map(req => {
        const requestBids = bids.filter(bid => bid.requestId === req.id);
        const existingBid = requestBids.find(bid => bid.supplierId === CURRENT_SUPPLIER_ID);
        return (
        <Card key={req.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="marketplace-badges-row" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span data-ltr style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{req.id}</span>
                {req.externalRefs?.etimadTenderId && <Badge small color={C.greenLight} title={t.etimadRefTitle}>{t.etimadRefLabel}</Badge>}
                <Badge color={C.teal}>{CATEGORIES[req.category]?.[lang] || req.category}</Badge>
                {req.negotiation?.status === "open" && (
                  <span className="reverse-auction-badge">{formatMessage(t.reverseAuctionChip, { n: req.negotiation.round })}</span>
                )}
                {req.anonymous ? <Badge color={C.textMuted}>{t.anonymousBuyer}</Badge> : <Badge color={C.bgLight}>{req.businessName}</Badge>}
                <PaymentLabel term={req.requiredPayment} lang={lang} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 6 }}>{lang === "ar" ? (req.titleAr || req.title) : req.title}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10, lineHeight: 1.6 }}>{lang === "ar" ? (req.specsAr || req.specs) : req.specs}</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>{t.qtyLabel}: <span style={{ color: C.text }}>{req.quantity}</span></span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{t.deadlineLabel}: <span style={{ color: C.gold }}>{formatDate(new Date(req.deadline), lang)}</span></span>
                <span style={{ fontSize: 12, color: C.textMuted }}>{t.budgetLabel}: <span style={{ color: C.greenLight }}>{req.budget}</span></span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C.textMuted }}>
                {bidsCountLabel(requestBids.length, lang)} · {req.posted}
                <Button small variant="ghost" onClick={() => setClarificationRequestId(req.id)}>Q&amp;A ({req.clarifications.length})</Button>
              </div>
              {role === USER_ROLES.SUPPLIER_SALES ? <Button small onClick={() => openBidModal(req, existingBid)}>{req.negotiation?.status === "open" ? t.counterOffer : existingBid ? t.updateBid : t.submitBid}</Button> : <Button small variant="ghost" onClick={() => onNavigate(req.id)}>{lang === "ar" ? "عرض العروض" : "View Bids"}</Button>}
            </div>
          </div>
        </Card>
      )})}
      {filtered.length === 0 && (
        <FilterEmptyState
          message={hasOpenRequests ? t.emptyNoRequests : (lang === "ar" ? "لا توجد طلبات مفتوحة حالياً." : "No open requests are available right now.")}
          actions={marketplaceEmptyActions}
        />
      )}
      {bidModal && <BidModal
        req={requests.find(request => request.id === bidModal.req.id) || bidModal.req}
        existingBid={bids.find(bid => bid.requestId === bidModal.req.id && bid.supplierId === CURRENT_SUPPLIER_ID) || bidModal.existingBid}
        role={role}
        lang={lang}
        profileCompletenessMessage={profileCompletenessMessage}
        onSubmit={bid => onSubmitBid(bidModal.req, bid)}
        onAnswerClarification={(id, answer) => onAnswerClarification(bidModal.req.id, id, answer)}
        onClose={() => setBidModal(null)}
      />}
      {clarificationRequestId && requests.some(request => request.id === clarificationRequestId) && (
        <ClarificationModal
          request={requests.find(request => request.id === clarificationRequestId)}
          role={role}
          currentSupplierId={CURRENT_SUPPLIER_ID}
          lang={lang}
          onSubmit={onSubmitClarification}
          onAnswer={onAnswerClarification}
          onClose={() => setClarificationRequestId(null)}
        />
      )}
      {newModal && <NewRequestModal onSubmit={onCreateRequest} lang={lang} onClose={() => setNewModal(false)} />}
    </div>
  );
};

const BusinessDashboard = ({ onNavigate, requests, bids, suppliers, contracts, auditLog = [], lang = "en", onCreateRequest, onUpdateSuppliers, onToggleBlacklist }) => {
  const t = I18N[lang];
  const [newModal, setNewModal] = useState(false);
  const [supplierModal, setSupplierModal] = useState(null);
  const activeRequests = requests.filter(request => request.status === "open" && !dateInPast(request.deadline));
  const sugarRequest = requests.find(request => request.id === "KAL-2024-0350") || requests[0];
  const rankedBids = sugarRequest
    ? bids.filter(bid => bid.requestId === sugarRequest.id)
      .map(bid => {
        const supplier = suppliers.find(item => item.id === bid.supplierId);
        return scoreBid({ ...bid, supplier }, sugarRequest, supplier);
      })
      .filter(bid => bid.status === "reviewing" && bid.supplier)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3)
    : [];
  const togglePreferred = (id) => onUpdateSuppliers(suppliers.map(supplier => supplier.id === id ? { ...supplier, preferred: !supplier.preferred } : supplier));
  const toggleBlacklist = (id) => onToggleBlacklist(id, sugarRequest?.id || null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 2 }}>{t.dashboard}</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>{t.companyName} · {t.divisionName}</div>
          <div style={{ fontSize: 11, color: C.gold, marginTop: 6 }}>{t.sampleDataDisclaimerBuyer}</div>
        </div>
        <Button onClick={() => setNewModal(true)}>{lang === "ar" ? "+ طلب جديد" : "+ New Request"}</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: t.activeRequestsStat, value: activeRequests.length, accent: C.gold },
          { label: t.bidRecordsStat, value: bids.length, accent: C.white },
          { label: t.contractsOnRecordStat, value: contracts.length, accent: C.greenLight },
          { label: t.suppliersWithBidsStat, value: new Set(bids.map(bid => bid.supplierId)).size, accent: C.teal, sub: t.localDemoRecords },
        ].map(s => <Card key={s.label}><Stat {...s} lang={lang} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>{lang === "ar" ? "طلباتي" : "My Requests"}</SectionTitle>
          {requests.map(req => {
            const requestBidCount = bids.filter(bid => bid.requestId === req.id).length;
            return (
            <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{lang === "ar" ? (req.titleAr || req.title) : req.title}</span>
                  {req.anonymous && <Badge small color={C.gold}>{t.anonShort}</Badge>}
                </div>
                <div data-ltr style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{req.id}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.white }}>{bidsCountLabel(requestBidCount, lang)}</span>
                <Badge small color={req.status === "open" ? C.greenLight : C.gold}>{statusLabel(req.status, lang)}</Badge>
                {req.status === "open" && <Button small variant="ghost" onClick={() => onNavigate("compare", req.id)}>{t.compareBtn}</Button>}
              </div>
            </div>
          );})}
          {requests.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.noRequestsYet}</div>}
        </Card>
        <MarketPulseWidget lang={lang} />
      </div>
      <ContractTracker contracts={contracts} lang={lang} onNewRequest={() => setNewModal(true)} />
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>{t.topRankedTitle} — {sugarRequest ? (lang === "ar" ? (sugarRequest.titleAr || sugarRequest.title) : sugarRequest.title) : (lang === "ar" ? "العروض" : "Bids")}</SectionTitle>
          <Button small variant="ghost" onClick={() => sugarRequest && onNavigate("compare", sugarRequest.id)}>{t.fullComparison}</Button>
        </div>
        <Card>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>{sugarRequest?.id} · {t.tablePrice} 40% · {t.tableQuality} 40% · {t.tableDelivery} 20%</div>
          {rankedBids.map((bid, i) => {
            const s = bid.supplier;
            return (
              <div key={bid.id} className="top-ranked-bid" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? C.gold : C.textMuted, width: 24, fontFamily: "monospace" }}>#{i + 1}</div>
                <ScoreRing score={Math.round(bid.totalScore)} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{supplierName(s.name, lang)}</span>
                    {s.preferred && <Badge small color={C.gold}>★</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{s.certs.slice(0, 3).map(certificate => <CertBadge key={certificate.certificateNumber} certificate={certificate} lang={lang} />)}</div>
                </div>
                <div style={{ textAlign: "end" }}>
                  <div style={{ fontSize: 14, color: C.greenLight, fontFamily: "monospace", fontWeight: 700 }}>{money(bid.price, lang)}</div>
                  <div style={{ marginTop: 3 }}><PaymentLabel term={bid.paymentTerms} lang={lang} /></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button small variant="ghost" onClick={() => setSupplierModal(s)}>{t.viewProfile}</Button>
                  {i === 0 && <Button small onClick={() => onNavigate("compare", sugarRequest.id)}>{t.compareAndAwardBtn}</Button>}
                </div>
              </div>
            );
          })}
          {rankedBids.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.noEligibleBids}</div>}
        </Card>
      </div>
      {newModal && <NewRequestModal onSubmit={onCreateRequest} lang={lang} onClose={() => setNewModal(false)} />}
      {supplierModal && <SupplierModal supplier={suppliers.find(supplier => supplier.id === supplierModal.id) || supplierModal} auditLog={auditLog} lang={lang} onClose={() => setSupplierModal(null)} onTogglePreferred={togglePreferred} onToggleBlacklist={toggleBlacklist} />}
    </div>
  );
};

const SupplierDashboard = ({ supplier: me, bids, requests, lang = "en", onNavigate, onWithdrawBid, onSubmitBid, onBidBlocked, onSaveCapacityDeclaration }) => {
  const t = I18N[lang];
  const [inviteToQuote, setInviteToQuote] = useState(null);
  const period = currentMonthPeriod();
  const currentDeclaration = me.capacityDeclarations?.find(item => item.period === period);
  const [declaredCapacityInput, setDeclaredCapacityInput] = useState(
    currentDeclaration ? String(currentDeclaration.declaredCapacity) : ""
  );
  const [capacityMessage, setCapacityMessage] = useState("");
  const [capacityError, setCapacityError] = useState("");
  useEffect(() => {
    setDeclaredCapacityInput(currentDeclaration ? String(currentDeclaration.declaredCapacity) : "");
  }, [me.id, period, currentDeclaration?.declaredCapacity]);
  const myBids = bids.filter(bid => bid.supplierId === me.id);
  const completeness = getSupplierCompleteness(me);
  const blockingMessage = getSupplierProfileBlockMessage(me, lang);
  const invitations = requests.filter(request =>
    request.status === "open" &&
    !dateInPast(request.deadline) &&
    request.invitedSupplierIds?.includes(me.id) &&
    !myBids.some(bid => bid.requestId === request.id)
  );
  const statusColor = s => ({ reviewing: C.gold, shortlisted: C.teal, won: C.greenLight }[s] || C.textMuted);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 2 }}>{lang === "ar" ? "لوحة تحكم المورد" : "Supplier Dashboard"}</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>{supplierName(me.name, lang)}</div>
        <div style={{ fontSize: 11, color: C.gold, marginTop: 6 }}>{t.sampleDataDisclaimerSupplier}</div>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{t.profileCompletenessTitle}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "monospace" }}>{completeness.percent}%</div>
        </div>
        <div role="progressbar" aria-label="Supplier profile completeness" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completeness.percent}
          style={{ height: 7, background: C.border, borderRadius: 4, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ height: "100%", width: `${completeness.percent}%`, background: C.greenLight, borderRadius: 4, transition: "width 0.2s" }} />
        </div>
        <div className="supplier-completeness-items" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "9px 16px" }}>
          {completeness.items.map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span aria-hidden="true" style={{ color: item.done ? C.greenLight : C.textMuted, fontSize: 14 }}>{item.done ? "✓" : "○"}</span>
              <span style={{ color: item.done ? C.text : C.textDim, fontSize: 12 }}>{lang === "ar" ? ({
                cr: "السجل التجاري (CR)",
                vat: "شهادة ضريبة القيمة المضافة",
                sfda: "تسجيل منشأة هيئة الغذاء والدواء",
                saber: "حساب سابر (SASO)",
                validCert: "شهادة سارية واحدة على الأقل",
                lcgpa: "شهادة هيئة المحتوى المحلي",
              }[item.key] || item.label) : item.label}</span>
              {!item.done && item.blocking && <Badge small color={C.red}>{lang === "ar" ? "متطلب إلزامي" : "Blocking"}</Badge>}
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ marginBottom: 20 }}>
        <SectionTitle>{t.capacityDeclarationTitle}</SectionTitle>
        <div style={{ color: C.textDim, fontSize: 12, marginBottom: 10 }}>
          {lang === "ar" ? "أعلن عن سعتك الشهرية المتاحة لشهر" : "Declare your available monthly capacity for"} {new Date(`${period}-01T00:00:00`).toLocaleDateString(dateLocale(lang), { month: "long", year: "numeric" })}. {lang === "ar" ? "يُستخدم هذا الإعلان للتنبيه إلى تداخل السعة في العروض." : "This declaration is used to flag capacity overlap on bids."}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <div style={{ width: 220, maxWidth: "100%" }}>
            <label htmlFor="monthly-declared-capacity" style={{ display: "block", color: C.textMuted, fontSize: 11, marginBottom: 5 }}>{t.capacityAvailableLabel}</label>
            <Input id="monthly-declared-capacity" type="number" min="0" value={declaredCapacityInput}
              onChange={event => { setDeclaredCapacityInput(event.target.value); setCapacityError(""); setCapacityMessage(""); }} />
          </div>
          <Button small onClick={() => {
            const value = Number(declaredCapacityInput);
            if (declaredCapacityInput.trim() === "" || !Number.isFinite(value) || value < 0) {
              setCapacityError(t.capacityErr);
              setCapacityMessage("");
              return;
            }
            onSaveCapacityDeclaration(me.id, value);
            setCapacityError("");
            setCapacityMessage(t.capacitySaved);
          }}>{t.capacitySaveBtn}</Button>
          <span style={{ color: C.textMuted, fontSize: 11 }}>
            {currentDeclaration ? formatMessage(t.capacityCommitted, { n: formatNumber(currentDeclaration.committedCapacity, lang) }) : t.capacityNoneCommitted}
          </span>
        </div>
        {capacityError && <div role="alert" style={{ color: C.red, fontSize: 11, marginTop: 8 }}>{capacityError}</div>}
        {capacityMessage && <div role="status" aria-live="polite" style={{ color: C.greenLight, fontSize: 11, marginTop: 8 }}>{capacityMessage}</div>}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: t.trustScoreTitle, value: me.score, accent: C.greenLight },
          { label: lang === "ar" ? "العروض النشطة" : "Active Bids", value: myBids.length, accent: C.gold },
          { label: lang === "ar" ? "الطلبات الفائزة" : "Won Requests", value: myBids.filter(bid => bid.status === "won").length, accent: C.white },
          { label: lang === "ar" ? "قيمة العروض" : "Bid Value", value: money(myBids.reduce((sum, bid) => sum + bid.price, 0), lang), accent: C.white },
        ].map(s => <Card key={s.label}><Stat {...s} lang={lang} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>{lang === "ar" ? "تفصيل درجة الثقة التجريبية" : "Sample Trust Score Breakdown"}</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
            <ScoreRing score={me.score} size={72} />
            <div style={{ flex: 1 }}>
              <ScoreBar label={t.qualityBar} value={me.quality} weight={40} />
              <ScoreBar label={t.priceBar} value={me.price} weight={40} />
              <ScoreBar label={t.deliveryBar} value={me.delivery} weight={20} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{t.saudiContentLabel}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ height: 6, flex: 1, background: C.border, borderRadius: 3 }}>
                <div style={{ height: 6, width: `${me.saudiContent}%`, background: C.gold, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "monospace" }}>{me.saudiContent}%</span>
              {me.saudiContent < 30 && <span style={{ fontSize: 10, color: C.red }}>{t.belowLcgpa30}</span>}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{t.vision2030Target}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <Badge small color={me.externalRefs?.lcgpaCertId ? C.greenLight : C.gold}>
                {me.externalRefs?.lcgpaCertId ? t.lcgpaVerified : t.selfReported}
              </Badge>
              {me.externalRefs?.lcgpaCertId && (
                <span style={{ fontSize: 10, color: C.textMuted }}>{lang === "ar" ? "شهادة هيئة المحتوى المحلي:" : "LCGPA certificate:"} {me.externalRefs.lcgpaCertId}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{me.certs.map(certificate => <CertBadge key={certificate.certificateNumber} certificate={certificate} lang={lang} />)}</div>
        </Card>
        <Card>
          <SectionTitle>{t.performanceTitle}</SectionTitle>
          {[{ label: t.historicalBidsLabel, val: me.bids }, { label: t.historicalContractsLabel, val: me.completed }, { label: t.historicalWinRateLabel, val: `${Math.round(me.completed / me.bids * 100)}%` }, { label: t.locationLabel, val: me.location }, { label: t.capacityLabel, val: me.capacity }].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textMuted }}>{r.label}</span>
              <span style={{ color: C.white, fontFamily: "monospace", fontWeight: 600 }}>{r.val}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <SectionTitle>{t.invitationsTitle} ({formatNumber(invitations.length, lang)})</SectionTitle>
        {invitations.map(request => (
          <div key={request.id} className="invitation-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{lang === "ar" ? (request.titleAr || request.title) : request.title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}><span data-ltr>{request.id}</span> · {request.quantity} · {t.deadlineLabel} {formatDate(new Date(request.deadline), lang)}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>{t.budgetLabel}: {request.budget}</div>
            </div>
            <Button small onClick={() => {
              setInviteToQuote(request);
              if (blockingMessage) onBidBlocked(blockingMessage);
            }}>{lang === "ar" ? "تقديم عرض سعر" : "Quote Now"}</Button>
          </div>
        ))}
        {invitations.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.invitationsEmpty}</div>}
      </Card>
      <Card>
        <SectionTitle>{t.myActiveBidsTitle}</SectionTitle>
        {myBids.map(bid => {
          const request = requests.find(item => item.id === bid.requestId);
          return (
          <div key={bid.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 3 }}>{request?.title || t.removedRequest}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{bid.requestId}</span>
                <PaymentLabel term={bid.paymentTerms} lang={lang} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: C.greenLight, fontFamily: "monospace" }}>{money(bid.price, lang)}</span>
              <Badge color={statusColor(bid.status)}>{statusLabel(bid.status, lang)}</Badge>
              {request?.status === "open" && <Button small variant="ghost" onClick={() => onWithdrawBid(bid.id)}>{t.withdrawBtn}</Button>}
            </div>
          </div>
        );})}
        {myBids.length === 0 && <div style={{ fontSize: 12, color: C.textMuted }}>{t.emptyNoBidsYet} <Button small variant="ghost" onClick={() => onNavigate("marketplace")}>{t.marketplaceSupplier}</Button></div>}
      </Card>
      {inviteToQuote && (
        <BidModal
          req={inviteToQuote}
          existingBid={myBids.find(bid => bid.requestId === inviteToQuote.id)}
          role={USER_ROLES.SUPPLIER_SALES}
          lang={lang}
          profileCompletenessMessage={blockingMessage}
          onSubmit={bid => onSubmitBid(inviteToQuote, bid)}
          onClose={() => setInviteToQuote(null)}
        />
      )}
    </div>
  );
};

const ApprovalInbox = ({ tasks, requests, bids, suppliers, contracts, user, lang = "en", onApprove }) => {
  const t = I18N[lang];
  const assignedTasks = tasks
    .filter(task => task.assignedRole === user.role)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const pendingTasks = assignedTasks.filter(task => task.status === "pending");
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white }}>{t.approvalInbox}</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{formatMessage(t.pendingApprovalsCount, { n: formatNumber(pendingTasks.length, lang) })}</div>
      </div>
      {assignedTasks.length === 0 && (
        <Card><div style={{ fontSize: 13, color: C.textMuted }}>{t.emptyNoApprovals}</div></Card>
      )}
      {assignedTasks.map(task => {
        const request = requests.find(item => item.id === task.requestId);
        const bid = bids.find(item => item.id === task.bidId);
        const supplier = suppliers.find(item => item.id === task.supplierId);
        const contract = contracts.find(item => item.id === task.contractId);
        return (
          <Card key={task.id} aria-labelledby={`approval-title-${task.id}`} style={{ marginBottom: 12, borderColor: task.status === "pending" ? C.gold + "66" : C.border }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                  <span id={`approval-title-${task.id}`} style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{request ? (lang === "ar" ? (request.titleAr || request.title) : request.title) : t.requestUnavailable}</span>
                  <Badge small color={task.status === "pending" ? C.gold : C.greenLight}>{task.status === "pending" ? t.pendingApproval : t.approvedStatus}</Badge>
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}><span data-ltr>{task.requestId}</span> · {t.taskLabel} <span data-ltr>{task.id}</span></div>
                <div style={{ fontSize: 12, color: C.textDim, marginTop: 8 }}>
                  {t.supplierField} {supplier ? supplierName(supplier.name, lang) : t.unavailableLabel} · {t.bidField} {bid ? money(bid.price) : t.unavailableLabel} · {t.contractField} {contract?.id || t.unavailableLabel}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                  {t.submittedByLabel} {task.createdByName || t.buyerAdmin} · {formatDateTime(task.createdAt, lang)}
                  {task.approvedAt && ` · ${t.approvedLabel} ${formatDateTime(task.approvedAt, lang)}`}
                </div>
              </div>
              {task.status === "pending" && (
                <Button small disabled={!request || !bid || !contract} onClick={() => onApprove(task.id)}>{t.approveAward}</Button>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

const AuthScreen = ({ onLogin, lang, onToggleLang, storageWarning = "" }) => {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <Button small variant="ghost" onClick={onToggleLang}>{lang === "en" ? "AR" : "EN"}</Button>
        </div>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}><span data-ltr style={{ display: "inline-block" }}>{I18N[lang].authProductTagline}</span></div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.white, letterSpacing: "0.08em" }}>KA<span style={{ color: C.gold }}>LA</span>LI</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}><span data-ltr style={{ display: "inline-block" }}>{I18N[lang].authSubTagline}</span></div>
          <div style={{ width: 40, height: 2, background: C.gold, margin: "16px auto 0" }} />
        </div>
        {storageWarning && (
          <div role="alert" style={{ background: C.red + "11", border: `1px solid ${C.red}55`, borderRadius: 8, padding: "10px 12px", marginBottom: 16, color: C.red, fontSize: 12, lineHeight: 1.5 }}>
            {storageWarning}
          </div>
        )}
        <div style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.white, textAlign: "center", marginBottom: 8 }}>{I18N[lang].login}</div>
          <div style={{ fontSize: 12, lineHeight: 1.6, color: C.textMuted, textAlign: "center", marginBottom: 20 }}>
            {I18N[lang].authIntro}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button variant="subtle" onClick={() => onLogin(USER_ROLES.BUYER_ADMIN)} fullWidth>{I18N[lang].buyerAdmin}</Button>
            <Button variant="subtle" onClick={() => onLogin(USER_ROLES.BUYER_APPROVER)} fullWidth>{I18N[lang].buyerApprover}</Button>
            <Button variant="subtle" onClick={() => onLogin(USER_ROLES.SUPPLIER_SALES)} fullWidth>{I18N[lang].supplierSales}</Button>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.textMuted }}>
          {I18N[lang].authFooter}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState("en");
  const t = I18N[lang];
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(DEMO_USERS[USER_ROLES.BUYER_ADMIN]);
  const [view, setView] = useState("dashboard");
  const [selectedRequestId, setSelectedRequestId] = useState("KAL-2024-0350");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [initialLoad] = useState(() => loadInitialData());
  const [prototypeData, setPrototypeData] = useState(initialLoad.data);
  const [storageWarning, setStorageWarning] = useState(initialLoad.warning);
  const [loadToast, setLoadToast] = useState(initialLoad.toast || "");
  const { requests, bids, suppliers, contracts, approvalTasks, notifications } = prototypeData;
  const role = user.role;
  const isBuyerAdmin = role === USER_ROLES.BUYER_ADMIN;
  const isBuyerApprover = role === USER_ROLES.BUYER_APPROVER;
  const isSupplierSales = role === USER_ROLES.SUPPLIER_SALES;
  const unreadNotifications = notifications.filter(notification => !notification.read).length;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  useEffect(() => {
    if (!loadToast) return undefined;
    const timeout = window.setTimeout(() => setLoadToast(""), 6000);
    return () => window.clearTimeout(timeout);
  }, [loadToast]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, data: prototypeData }));
      if (!initialLoad.warning) setStorageWarning("");
    } catch (error) {
      setStorageWarning(`${t.storageWarningPrefix} ${error.message}`);
    }
  }, [prototypeData, lang]);

  useEffect(() => {
    const refreshCertificateStatuses = () => {
      setPrototypeData(current => {
        let changed = false;
        const suppliers = current.suppliers.map(supplier => {
          const normalized = normalizeSupplierCertificates(supplier);
          if (normalized !== supplier) changed = true;
          return normalized;
        });
        return changed ? { ...current, suppliers } : current;
      });
    };
    const interval = window.setInterval(refreshCertificateStatuses, 60_000);
    window.addEventListener("focus", refreshCertificateStatuses);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCertificateStatuses);
    };
  }, []);

  const addNotification = (message) => setPrototypeData(current => ({
    ...current,
    notifications: [
      { id: uid("notice"), message, createdAt: new Date().toISOString(), read: false },
      ...current.notifications,
    ].slice(0, 50),
  }));

  const handleBidBlocked = (message) => addNotification(message);

  const handleSubmitClarification = (requestId, question) => {
    if (user.role !== USER_ROLES.SUPPLIER_SALES || !question.trim()) return;
    const clarification = {
      id: window.crypto.randomUUID(),
      supplierId: CURRENT_SUPPLIER_ID,
      question: question.trim(),
      answer: null,
      answeredBy: null,
      answeredAt: null,
      createdAt: new Date().toISOString(),
    };
    setPrototypeData(current => ({
      ...current,
      requests: current.requests.map(request => request.id === requestId
        ? { ...request, clarifications: [...request.clarifications, clarification] }
        : request),
      auditLog: [...current.auditLog, createAuditEntry({
        actor: user,
        action: "clarification_asked",
        entityType: "request",
        entityId: requestId,
        detailsKey: "clarification_asked",
        detailsParams: {},
      })].slice(-MAX_AUDIT_ENTRIES),
    }));
  };

  const handleAnswerClarification = (requestId, clarificationId, answer) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN || !answer.trim()) return;
    setPrototypeData(current => {
      const request = current.requests.find(item => item.id === requestId);
      const clarification = request?.clarifications.find(item => item.id === clarificationId);
      if (!request || !clarification || clarification.answer) return current;
      const answeredAt = new Date().toISOString();
      return {
        ...current,
        requests: current.requests.map(item => item.id === requestId
          ? {
            ...item,
            clarifications: item.clarifications.map(entry => entry.id === clarificationId
              ? { ...entry, answer: answer.trim(), answeredBy: user.name, answeredAt }
              : entry),
          }
          : item),
        notifications: [
          { id: uid("notice"), message: formatMessage(I18N[lang].notifications.clarificationAnsweredNotification, { title: lang === "ar" ? (request.titleAr || request.title) : request.title }), createdAt: answeredAt, read: false },
          ...current.notifications,
        ].slice(0, 50),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "clarification_answered",
          entityType: "request",
          entityId: requestId,
          detailsKey: "clarification_answered",
          detailsParams: {},
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleCreateRequest = (form) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN) return;
    const maxId = requests.reduce((max, request) => {
      const match = request.id.match(/-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const id = `KAL-${new Date().getFullYear()}-${String(maxId + 1).padStart(4, "0")}`;
    const budget = form.budgetMin && form.budgetMax
      ? `${money(form.budgetMin, lang)} – ${money(form.budgetMax, lang)}`
      : form.budgetMax ? `Up to ${money(form.budgetMax, lang)}`
        : form.budgetMin ? `From ${money(form.budgetMin, lang)}` : "Not specified";
    const request = normalizeRequest({
      id,
      title: form.title,
      category: form.category,
      quantity: form.quantity,
      deadline: dateAfterDays(14),
      budget,
      budgetMin: form.budgetMin,
      budgetMax: form.budgetMax,
      externalRefs: normalizeExternalRefs(form.externalRefs),
      anonymous: form.anonymous,
      businessName: form.anonymous ? undefined : "Savola Group",
      bidsCount: 0,
      status: "open",
      posted: "Just now",
      titleAr: form.titleAr.trim(),
      specs: form.specs.trim() || I18N.en.noSpecsProvided,
      specsAr: form.specsAr.trim() || (lang === "ar" && !form.specs.trim() ? I18N.ar.noSpecsProvided : ""),
      requiredPayment: form.requiredPayment,
      requiredCerts: form.requiredCerts,
      requiresMandatoryList: form.requiresMandatoryList,
      scoringWeights: normalizeScoringWeights(form.scoringWeights),
      invitedSupplierIds: Array.isArray(form.invitedSupplierIds) ? form.invitedSupplierIds : [],
    });
    setPrototypeData(current => ({
      ...current,
      requests: [request, ...current.requests],
      auditLog: [...current.auditLog, createAuditEntry({
        actor: user,
        action: "request_created",
        entityType: "request",
        entityId: request.id,
        detailsKey: "request_created",
        detailsParams: { title: request.title },
      })].slice(-MAX_AUDIT_ENTRIES),
    }));
    addNotification(formatMessage(I18N[lang].notifications.requestPostedNotification, { title: lang === "ar" ? (request.titleAr || request.title) : request.title }));
  };

  const handleSubmitBid = (request, bidDetails) => {
    if (user.role !== USER_ROLES.SUPPLIER_SALES) return;
    const existing = bids.find(bid => bid.requestId === request.id && bid.supplierId === CURRENT_SUPPLIER_ID);
    const rejectionMessage = I18N[lang].errBidDuplicate;
    if (existing && bidDetails.id && bidDetails.id !== existing.id) {
      addNotification(rejectionMessage);
      return false;
    }
    const currentSupplier = suppliers.find(supplier => supplier.id === CURRENT_SUPPLIER_ID);
    const blockingMessage = getSupplierProfileBlockMessage(currentSupplier, lang);
    if (blockingMessage) {
      addNotification(blockingMessage);
      return false;
    }
    const deliveryScore = bidDetails.deliveryDays > 0 ? Math.max(50, Math.min(100, 100 - bidDetails.deliveryDays)) : 80;
    const newBid = scoreBid({
      ...bidDetails,
      id: `bid-${request.id}-${CURRENT_SUPPLIER_ID}`,
      requestId: request.id,
      supplierId: CURRENT_SUPPLIER_ID,
      qualityScore: currentSupplier.quality,
      deliveryScore,
      status: "reviewing",
    }, request, currentSupplier);
    setPrototypeData(current => {
      const existing = current.bids.find(bid => bid.requestId === request.id && bid.supplierId === CURRENT_SUPPLIER_ID);
      if (existing && (bidDetails.id || newBid.id) !== existing.id) {
        return {
          ...current,
          notifications: [
            { id: uid("notice"), message: rejectionMessage, createdAt: new Date().toISOString(), read: false },
            ...current.notifications,
          ].slice(0, 50),
        };
      }
      const nextBids = existing
        ? current.bids.map(bid => bid.requestId === request.id && bid.supplierId === CURRENT_SUPPLIER_ID ? newBid : bid)
        : [...current.bids, newBid];
      const actionKey = existing ? "bid_updated" : "bid_submitted";
      return {
        ...current,
        bids: nextBids,
        notifications: [
          { id: uid("notice"), message: formatMessage(
            I18N[lang].notifications[existing ? "bidUpdatedNotification" : "bidSubmittedNotification"],
            { title: lang === "ar" ? (request.titleAr || request.title) : request.title }
          ), createdAt: new Date().toISOString(), read: false },
          ...current.notifications,
        ].slice(0, 50),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: actionKey,
          entityType: "request",
          entityId: request.id,
          detailsKey: actionKey,
          detailsParams: { price: money(newBid.price, lang), score: newBid.totalScore },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleStartNegotiation = (requestId, floorPrice) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN) return;
    if (floorPrice !== null && (!Number.isFinite(floorPrice) || floorPrice <= 0)) return;
    setPrototypeData(current => {
      const request = current.requests.find(item => item.id === requestId);
      if (!request || request.status !== "open" || request.negotiation?.status === "open") return current;
      const openedAt = new Date();
      const round = (request.negotiation?.round || 0) + 1;
      return {
        ...current,
        requests: current.requests.map(item => item.id === requestId
          ? {
            ...item,
            negotiation: {
              round,
              status: "open",
              openedAt: openedAt.toISOString(),
              closesAt: new Date(openedAt.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              floorPrice,
            },
          }
          : item),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "negotiation_started",
          entityType: "request",
          entityId: request.id,
          createdAt: openedAt.toISOString(),
          detailsKey: "negotiation_started",
          detailsParams: {
            round,
            floorContext: floorPrice !== null
              ? formatMessage(I18N[lang].auditDetails.negotiationFloorContext, { price: money(floorPrice, lang) })
              : "",
          },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleCloseNegotiation = (requestId) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN) return;
    setPrototypeData(current => {
      const request = current.requests.find(item => item.id === requestId);
      if (!request || request.negotiation?.status !== "open") return current;
      const createdAt = new Date().toISOString();
      return {
        ...current,
        requests: current.requests.map(item => item.id === requestId
          ? { ...item, negotiation: { ...item.negotiation, status: "closed" } }
          : item),
        notifications: [
          { id: uid("notice"), message: formatMessage(I18N[lang].notifications.negotiationClosedNotification, { title: lang === "ar" ? (request.titleAr || request.title) : request.title }), createdAt, read: false },
          ...current.notifications,
        ].slice(0, 50),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "negotiation_closed",
          entityType: "request",
          entityId: request.id,
          createdAt,
          detailsKey: "negotiation_closed",
          detailsParams: { round: request.negotiation.round },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleWithdrawBid = (bidId) => {
    if (user.role !== USER_ROLES.SUPPLIER_SALES) return;
    const withdrawnBid = bids.find(bid => bid.id === bidId);
    if (!withdrawnBid) return;
    setPrototypeData(current => {
      const bid = current.bids.find(item => item.id === bidId);
      if (!bid) return current;
      const request = current.requests.find(item => item.id === bid.requestId);
      const createdAt = new Date().toISOString();
      return {
        ...current,
        bids: current.bids.filter(item => item.id !== bidId),
        notifications: [
          { id: uid("notice"), message: formatMessage(I18N[lang].notifications.bidWithdrawnNotification, { title: lang === "ar" ? (request?.titleAr || request?.title || bid.requestId) : (request?.title || bid.requestId) }), createdAt, read: false },
          ...current.notifications,
        ].slice(0, 50),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "bid_withdrawn",
          entityType: "request",
          entityId: bid.requestId,
          createdAt,
          detailsKey: "bid_withdrawn",
          detailsParams: { price: money(bid.price, lang) },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleAward = (request, awarded) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN) return;
    setPrototypeData(current => {
      const currentRequest = current.requests.find(item => item.id === request.id);
      if (!currentRequest || currentRequest.status !== "open") return current;
      const currentSupplier = current.suppliers.find(supplier => supplier.id === awarded.bid.supplierId);
      const eligibleBid = scoreBid(awarded.bid, currentRequest, currentSupplier);
      if (eligibleBid.status === "disqualified") return current;
      const createdAt = new Date().toISOString();
      const taskId = uid("approval");
      const contractNumber = current.contracts.length + 1;
      const contract = {
        id: `CON-${new Date().getFullYear()}-${String(contractNumber).padStart(4, "0")}`,
        supplier: awarded.supplier.name,
        item: request.title,
        value: money(awarded.bid.price),
        expiry: dateAfterDays(365),
        daysLeft: 365,
        status: "pending",
        requestId: request.id,
      };
      return {
        ...current,
        requests: current.requests.map(item => item.id === request.id
          ? { ...item, status: "pending_approval", awardedSupplierId: awarded.supplier.id, awardedBidId: awarded.bid.id, awardRationale: awarded.rationale }
          : item),
        contracts: [contract, ...current.contracts],
        approvalTasks: [{
          id: taskId,
          requestId: request.id,
          contractId: contract.id,
          bidId: awarded.bid.id,
          supplierId: awarded.supplier.id,
          assignedRole: USER_ROLES.BUYER_APPROVER,
          status: "pending",
          createdAt,
          createdBy: user.id,
          createdByName: user.name,
        }, ...current.approvalTasks],
        notifications: [
          { id: uid("notice"), message: formatMessage(I18N[lang].notifications.awardApprovalRequestedNotification, {
            title: lang === "ar" ? (request.titleAr || request.title) : request.title,
            supplier: supplierName(awarded.supplier.name, lang),
          }), createdAt, read: false },
          ...current.notifications,
        ].slice(0, 50),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "award_submitted",
          entityType: "request",
          entityId: request.id,
          createdAt,
          detailsKey: "award_submitted",
          detailsParams: {
            name: currentSupplier.name,
            price: money(eligibleBid.price, lang),
            score: eligibleBid.totalScore,
            rationale: awarded.rationale,
          },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleApproveAward = (taskId) => {
    if (user.role !== USER_ROLES.BUYER_APPROVER) return;
    setPrototypeData(current => {
      const task = current.approvalTasks.find(item => item.id === taskId);
      if (!task || task.status !== "pending" || task.assignedRole !== user.role) return current;
      const request = current.requests.find(item => item.id === task.requestId);
      const contract = current.contracts.find(item => item.id === task.contractId);
      if (!request || request.status !== "pending_approval" || !contract || contract.status !== "pending") return current;
      const approvedAt = new Date().toISOString();
      return {
        ...current,
        requests: current.requests.map(item => item.id === request.id ? { ...item, status: "awarded" } : item),
        contracts: current.contracts.map(item => item.id === contract.id ? { ...item, status: "active" } : item),
        approvalTasks: current.approvalTasks.map(item => item.id === task.id
          ? { ...item, status: "approved", approvedAt, approvedBy: user.id, approvedByName: user.name }
          : item),
        notifications: [
          { id: uid("notice"), message: formatMessage(I18N[lang].notifications.awardApprovedNotification, {
            title: lang === "ar" ? (request.titleAr || request.title) : request.title,
            supplier: supplierName(contract.supplier, lang),
          }), createdAt: approvedAt, read: false },
          ...current.notifications,
        ].slice(0, 50),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "approval_granted",
          entityType: "request",
          entityId: request.id,
          createdAt: approvedAt,
          detailsKey: "approval_granted",
          detailsParams: { name: contract.supplier, contractId: contract.id },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };

  const handleCreateRequestFromDashboard = (form) => handleCreateRequest(form);
  const handleUpdateSuppliers = (nextSuppliers) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN) return;
    setPrototypeData(current => ({ ...current, suppliers: nextSuppliers }));
  };
  const handleSaveCapacityDeclaration = (supplierId, declaredCapacity) => {
    if (user.role !== USER_ROLES.SUPPLIER_SALES || supplierId !== CURRENT_SUPPLIER_ID) return;
    const period = currentMonthPeriod();
    const updatedAt = new Date().toISOString();
    setPrototypeData(current => {
      if (!current.suppliers.some(supplier => supplier.id === supplierId)) return current;
      return {
        ...current,
        suppliers: current.suppliers.map(supplier => {
          if (supplier.id !== supplierId) return supplier;
          const declarations = supplier.capacityDeclarations || [];
          const existing = declarations.find(item => item.period === period);
          const declaration = {
            id: existing?.id || uid("capacity"),
            period,
            declaredCapacity,
            committedCapacity: existing?.committedCapacity || 0,
            updatedAt,
          };
          return {
            ...supplier,
            capacityDeclarations: [
              ...declarations.filter(item => item.period !== period),
              declaration,
            ],
          };
        }),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: "capacity_declared",
          entityType: "supplier",
          entityId: supplierId,
          detailsKey: "capacity_declared",
          detailsParams: { capacity: declaredCapacity, period },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };
  const handleToggleSupplierBlacklist = (supplierId, requestId = null) => {
    if (user.role !== USER_ROLES.BUYER_ADMIN) return;
    setPrototypeData(current => {
      const supplier = current.suppliers.find(item => item.id === supplierId);
      if (!supplier) return current;
      const blacklisted = !supplier.blacklisted;
      return {
        ...current,
        suppliers: current.suppliers.map(item => item.id === supplierId ? { ...item, blacklisted } : item),
        auditLog: [...current.auditLog, createAuditEntry({
          actor: user,
          action: blacklisted ? "supplier_blacklisted" : "supplier_unblacklisted",
          entityType: requestId ? "request" : "supplier",
          entityId: requestId || supplierId,
          detailsKey: blacklisted ? "supplier_blacklisted" : "supplier_unblacklisted",
          detailsParams: {
            name: supplierName(supplier.name, lang),
            requestContext: requestId
              ? (lang === "ar" ? ` (الطلب: ${requestId})` : ` (Request: ${requestId})`)
              : "",
          },
        })].slice(-MAX_AUDIT_ENTRIES),
      };
    });
  };
  const handleLogin = (nextRole) => {
    const nextUser = DEMO_USERS[nextRole];
    if (!nextUser) return;
    setUser(nextUser);
    setAuthed(true);
    setView(nextRole === USER_ROLES.BUYER_APPROVER ? "approval-inbox" : "dashboard");
  };
  const handleLogout = () => { setAuthed(false); setView("dashboard"); setNotificationOpen(false); };
  const navigate = (nextView, requestId) => {
    if (requestId) setSelectedRequestId(requestId);
    setView(nextView);
  };
  const resetDemoData = () => {
    setPrototypeData(createInitialData());
    setSelectedRequestId("KAL-2024-0350");
    setView("dashboard");
    setLang("en");
    setStorageWarning("");
    setConfirmReset(false);
    setNotificationOpen(false);
  };

  const loadToastElement = loadToast && (
    <div role="status" aria-live="polite" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 1000, background: C.bgCard, border: `1px solid ${C.gold}66`, borderRadius: 8, padding: "12px 18px", color: C.text, fontSize: 13, boxShadow: "0 8px 24px #0009", textAlign: "center", maxWidth: "calc(100vw - 32px)" }}>
      {loadToast}
    </div>
  );

  if (!authed) return <>{loadToastElement}<AuthScreen lang={lang} onToggleLang={() => setLang(current => current === "en" ? "ar" : "en")} onLogin={handleLogin} storageWarning={storageWarning} /></>;

  const currentSupplier = suppliers.find(supplier => supplier.id === CURRENT_SUPPLIER_ID) || suppliers[0];
  const comparisonRequest = requests.find(request => request.id === selectedRequestId) || requests.find(request => request.id === "KAL-2024-0350") || requests[0];
  const comparisonBids = comparisonRequest ? bids.filter(bid => bid.requestId === comparisonRequest.id) : [];
  const expiringContracts = contracts.filter(contract => contract.daysLeft <= 14 && contract.daysLeft > 0).length;
  const pendingApprovals = approvalTasks.filter(task => task.assignedRole === role && task.status === "pending").length;

  const navItems = isBuyerAdmin
    ? [
      { id: "dashboard", label: I18N[lang].dashboard },
      { id: "marketplace", label: I18N[lang].marketplace },
      { id: "compare", label: I18N[lang].compare },
      { id: "analytics", label: I18N[lang].analytics },
    ]
    : isBuyerApprover
      ? [{ id: "approval-inbox", label: `${I18N[lang].approvalInbox}${pendingApprovals ? ` (${pendingApprovals})` : ""}` }]
      : [{ id: "dashboard", label: I18N[lang].dashboard }, { id: "marketplace", label: I18N[lang].marketplaceSupplier }];

  return (
    <div className="app-root" style={{ minHeight: "100vh", background: C.bg, fontFamily: "inherit", color: C.text }}>
      {loadToastElement}
      <div style={{ background: C.bgMid, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div className="app-nav-shell" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, height: 52, overflowX: "auto" }}>
          <div className="app-brand-wordmark" style={{ fontSize: 16, fontWeight: 900, color: C.white, letterSpacing: "0.1em", flexShrink: 0, marginInlineEnd: 12 }}>
            KA<span style={{ color: C.gold }}>LA</span>LI
          </div>
          <div className="app-nav" style={{ display: "flex", gap: 2, flex: 1 }}>
            {navItems.map(item => (
              <button id={`nav-${item.id}`} key={item.id} onClick={() => navigate(item.id)} style={{ padding: "6px 12px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, background: view === item.id ? C.bgLight : "transparent", color: view === item.id ? C.white : C.textMuted }}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, position: "relative" }}>
            <button aria-label={t.notificationAria} onClick={() => setNotificationOpen(open => !open)} style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: 4 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              {unreadNotifications > 0 && <span data-ltr style={{ position: "absolute", top: 0, insetInlineEnd: 0, background: C.red, color: C.white, borderRadius: "50%", width: 14, height: 14, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{unreadNotifications}</span>}
            </button>
            <Badge color={isSupplierSales ? C.gold : isBuyerApprover ? C.purple : C.teal} small>{role}</Badge>
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{t.logout}</button>
            <Button small variant="ghost" onClick={() => setLang(current => current === "en" ? "ar" : "en")}>{t.langToggle}</Button>
            {notificationOpen && <div className="notification-dropdown" style={{ position: "absolute", top: 44, insetInlineEnd: 0, width: 300, maxHeight: 360, overflowY: "auto", padding: 14, background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 8, zIndex: 100, boxShadow: "0 12px 30px #0009" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <strong style={{ color: C.white, fontSize: 13 }}>{t.notificationsTitle}</strong>
                {unreadNotifications > 0 && <button onClick={() => setPrototypeData(current => ({ ...current, notifications: current.notifications.map(item => ({ ...item, read: true })) }))} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 11 }}>{t.markAllRead}</button>}
              </div>
              {notifications.length === 0 && <div style={{ color: C.textMuted, fontSize: 12 }}>{t.noNotifications}</div>}
              {notifications.map(notification => <div key={notification.id} style={{ borderTop: `1px solid ${C.border}`, padding: "9px 0", color: notification.read ? C.textMuted : C.text, fontSize: 12 }}>{notification.message}<div style={{ color: C.textMuted, fontSize: 10, marginTop: 3 }}>{formatDateTime(notification.createdAt, lang)}</div></div>)}
            </div>}
          </div>
        </div>
      </div>

      {storageWarning && <div role="alert" style={{ background: C.red + "11", borderBottom: `1px solid ${C.red}33`, padding: "8px 16px", color: C.red, fontSize: 12, textAlign: "center" }}>{storageWarning}</div>}
      {isBuyerAdmin && view === "dashboard" && expiringContracts > 0 && (
        <div style={{ background: C.red + "11", borderBottom: `1px solid ${C.red}33`, padding: "8px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", fontSize: 12, color: C.red }}>
            ⚠ {formatMessage(t.expiringContractsBanner, { n: formatNumber(expiringContracts, lang) })} — <a href="#contract-tracker" style={{ color: C.gold, fontSize: 12, textDecoration: "underline" }}>{t.viewContractTracker}</a>
          </div>
        </div>
      )}

      <div className="app-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {view === "dashboard" && isBuyerAdmin && <BusinessDashboard lang={lang} onNavigate={navigate} requests={requests} bids={bids} suppliers={suppliers} contracts={contracts} auditLog={prototypeData.auditLog} onCreateRequest={handleCreateRequestFromDashboard} onUpdateSuppliers={handleUpdateSuppliers} onToggleBlacklist={handleToggleSupplierBlacklist} />}
        {view === "dashboard" && isSupplierSales && <SupplierDashboard lang={lang} supplier={currentSupplier} bids={bids} requests={requests} onNavigate={navigate} onWithdrawBid={handleWithdrawBid} onSubmitBid={handleSubmitBid} onBidBlocked={handleBidBlocked} onSaveCapacityDeclaration={handleSaveCapacityDeclaration} />}
        {view === "marketplace" && <MarketplaceView lang={lang} role={role} supplier={currentSupplier} requests={requests} bids={bids} onCreateRequest={handleCreateRequest} onSubmitBid={handleSubmitBid} onBidBlocked={handleBidBlocked} onNavigate={requestId => navigate("compare", requestId)} onSubmitClarification={handleSubmitClarification} onAnswerClarification={handleAnswerClarification} />}
        {view === "compare" && isBuyerAdmin && comparisonRequest && <BidComparisonView lang={lang} request={comparisonRequest} bids={comparisonBids} suppliers={suppliers} auditLog={prototypeData.auditLog} onUpdateSuppliers={handleUpdateSuppliers} onToggleBlacklist={handleToggleSupplierBlacklist} onAward={handleAward} canManageNegotiation={isBuyerAdmin} onStartNegotiation={handleStartNegotiation} onCloseNegotiation={handleCloseNegotiation} />}
        {view === "analytics" && isBuyerAdmin && <AnalyticsView lang={lang} requests={requests} bids={bids} contracts={contracts} suppliers={suppliers} />}
        {view === "approval-inbox" && isBuyerApprover && <ApprovalInbox lang={lang} tasks={approvalTasks} requests={requests} bids={bids} suppliers={suppliers} contracts={contracts} user={user} onApprove={handleApproveAward} />}
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px 18px", display: "flex", justifyContent: "flex-end" }}>
        {!confirmReset
          ? <Button small variant="ghost" onClick={() => setConfirmReset(true)}>{t.resetDemoData}</Button>
          : <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, color: C.textDim, fontSize: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", marginBottom: 8 }}>
              <span>{t.confirmReset}</span>
              <span style={{ color: C.textMuted }}>{lang === "ar" ? "سيؤدي هذا إلى مسح الطلبات والعروض والعقود ومهام الاعتماد المسجلة محلياً." : "This clears locally stored requests, bids, contracts, and approval tasks."}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button small variant="danger" onClick={resetDemoData}>{t.reset}</Button>
              <Button small variant="subtle" onClick={() => setConfirmReset(false)}>{t.cancel}</Button>
            </div>
          </div>}
      </div>
    </div>
  );
}