import React from "react";
import "./style.css";

import { useState, useEffect } from "react";

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
  SFDA: { label: "SFDA", color: C.green },
  HALAL: { label: "Halal", color: C.teal },
  ISO: { label: "ISO 22000", color: C.blue },
  SASO: { label: "SASO", color: C.purple },
  SAUDI_CONTENT: { label: "Saudi Content", color: C.gold },
  IKTVA: { label: "IKTVA", color: "#e05c00" },
};

const PAYMENT_TERMS = [
  { value: "prepay_full", label: "100% Prepayment" },
  { value: "partial_50", label: "50% Upfront / 50% on Delivery" },
  { value: "partial_30", label: "30% Upfront / 70% on Delivery" },
  { value: "net30", label: "Net-30 Post Delivery" },
  { value: "net60", label: "Net-60 Post Delivery" },
  { value: "negotiable", label: "Negotiable" },
];

const SUPPLIERS = [
  { id: 1, name: "Al-Marai Supply Co.", score: 94, price: 88, quality: 98, delivery: 97, verified: true, preferred: true, blacklisted: false, category: "Food & Beverage", location: "Riyadh", bids: 142, completed: 138, certs: ["SFDA","HALAL","ISO","SAUDI_CONTENT","IKTVA"], capacity: "500 MT/month", leadTime: "7-10 days", minOrder: "20 MT", saudiContent: 78, riskFlag: null },
  { id: 2, name: "Eastern Provisions Ltd.", score: 91, price: 84, quality: 96, delivery: 94, verified: true, preferred: false, blacklisted: false, category: "Food & Beverage", location: "Al Khobar", bids: 203, completed: 198, certs: ["SFDA","HALAL","ISO","SASO"], capacity: "800 MT/month", leadTime: "10-14 days", minOrder: "50 MT", saudiContent: 62, riskFlag: null },
  { id: 3, name: "Gulf Industrial Partners", score: 87, price: 92, quality: 85, delivery: 83, verified: true, preferred: false, blacklisted: false, category: "Industrial", location: "Jeddah", bids: 89, completed: 81, certs: ["SFDA","ISO"], capacity: "300 MT/month", leadTime: "12-15 days", minOrder: "10 MT", saudiContent: 45, riskFlag: "2 late deliveries reported this month" },
  { id: 4, name: "Najd Equipment Group", score: 79, price: 95, quality: 74, delivery: 71, verified: true, preferred: false, blacklisted: false, category: "Machinery", location: "Dammam", bids: 56, completed: 47, certs: ["SASO"], capacity: "200 MT/month", leadTime: "20-25 days", minOrder: "5 MT", saudiContent: 33, riskFlag: null },
  { id: 5, name: "Hejaz Raw Materials", score: 83, price: 89, quality: 81, delivery: 80, verified: false, preferred: false, blacklisted: true, category: "Raw Materials", location: "Mecca", bids: 34, completed: 29, certs: ["SFDA","HALAL"], capacity: "150 MT/month", leadTime: "14-18 days", minOrder: "25 MT", saudiContent: 51, riskFlag: "Certification expired - SFDA renewal pending" },
];

const SUGAR_BIDS = [
  { supplierId: 1, price: 334000, delivery: "9 days", notes: "ICUMSA 45 certified, bulk tanker fleet, own logistics network across KSA", priceScore: 92, qualityScore: 98, deliveryScore: 97, totalScore: 95.6, paymentTerms: "partial_30" },
  { supplierId: 2, price: 318000, delivery: "13 days", notes: "Premium grade, phytosanitary cert included, flexible payment terms available", priceScore: 97, qualityScore: 96, deliveryScore: 88, totalScore: 94.8, paymentTerms: "net30" },
  { supplierId: 3, price: 351000, delivery: "11 days", notes: "ISO 22000 facility, can split delivery across two weeks if needed", priceScore: 85, qualityScore: 85, deliveryScore: 92, totalScore: 86.8, paymentTerms: "prepay_full" },
  { supplierId: 5, price: 328000, delivery: "16 days", notes: "Competitive pricing, strong trade references, new to platform", priceScore: 94, qualityScore: 81, deliveryScore: 72, totalScore: 84.4, paymentTerms: "partial_50" },
];

const REQUESTS = [
  { id: "KAL-2024-0441", title: "Refined Sunflower Oil — Production Grade", category: "Food & Beverage", quantity: "80 MT/month", deadline: "Mar 15, 2025", budget: "SAR 180,000 – 220,000", anonymous: true, bidsCount: 7, status: "open", posted: "2 days ago", specs: "Food-grade, max 0.1% acidity, SFDA certified, tanker delivery to Jeddah Industrial City", requiredPayment: "net30" },
  { id: "KAL-2024-0389", title: "Industrial Conveyor Belt System", category: "Machinery", quantity: "3 units", deadline: "Apr 1, 2025", budget: "SAR 95,000 – 140,000", anonymous: false, businessName: "Saudi Foods Manufacturing", bidsCount: 4, status: "open", posted: "5 days ago", specs: "Heavy-duty PVC belt, 15m length, load capacity 500kg/m, food-safe materials", requiredPayment: "negotiable" },
  { id: "KAL-2024-0350", title: "Sugar (Refined White) — Bulk", category: "Food & Beverage", quantity: "200 MT", deadline: "Mar 20, 2025", budget: "SAR 310,000 – 380,000", anonymous: true, bidsCount: 11, status: "open", posted: "1 week ago", specs: "ICUMSA 45, 50kg bags or bulk tanker, phytosanitary certificate required", requiredPayment: "net30" },
  { id: "KAL-2024-0298", title: "Packaging Materials — PET Bottles", category: "Packaging", quantity: "500,000 units", deadline: "Mar 30, 2025", budget: "SAR 75,000 – 95,000", anonymous: false, businessName: "Savola Group", bidsCount: 9, status: "open", posted: "2 weeks ago", specs: "500ml PET, food-grade, custom mold available, must pass drop test", requiredPayment: "partial_30" },
];

const MY_REQUESTS = [
  { id: "KAL-2024-0441", title: "Refined Sunflower Oil", bids: 7, status: "open", posted: "2 days ago", anonymous: true, expiryDate: "Mar 15, 2025", daysLeft: 8 },
  { id: "KAL-2024-0350", title: "Sugar (Refined White)", bids: 11, status: "open", posted: "1 week ago", anonymous: true, expiryDate: "Mar 20, 2025", daysLeft: 13 },
  { id: "KAL-2024-0201", title: "Palm Olein — Fractionated", bids: 5, status: "awarded", posted: "1 month ago", anonymous: false, expiryDate: "Apr 10, 2025", daysLeft: 34 },
];

const CONTRACTS = [
  { id: "CON-2023-0089", supplier: "Al-Marai Supply Co.", item: "Refined Sunflower Oil", value: "SAR 195,000/mo", expiry: "Apr 30, 2025", daysLeft: 12, status: "expiring" },
  { id: "CON-2023-0071", supplier: "Eastern Provisions Ltd.", item: "Palm Olein", value: "SAR 440,000", expiry: "Jun 15, 2025", daysLeft: 58, status: "active" },
  { id: "CON-2023-0055", supplier: "Gulf Industrial Partners", item: "Packaging Materials", value: "SAR 82,000", expiry: "Mar 28, 2025", daysLeft: 5, status: "critical" },
  { id: "CON-2022-0198", supplier: "Najd Equipment Group", item: "Conveyor Systems", value: "SAR 120,000", expiry: "Dec 31, 2025", daysLeft: 180, status: "active" },
];

const MARKET_PULSE = [
  { category: "Sugar (ICUMSA 45)", unit: "per MT", avg: 1640, low: 1580, high: 1720, trend: "up", change: "+3.2%" },
  { category: "Sunflower Oil (Food Grade)", unit: "per MT", avg: 2450, low: 2310, high: 2580, trend: "down", change: "-1.8%" },
  { category: "Palm Olein", unit: "per MT", avg: 1890, low: 1820, high: 1960, trend: "stable", change: "+0.4%" },
  { category: "PET Bottles (500ml)", unit: "per 1000 units", avg: 165, low: 148, high: 182, trend: "up", change: "+5.1%" },
];

const MY_BIDS = [
  { requestId: "KAL-2024-0441", title: "Refined Sunflower Oil", submitted: "1 day ago", price: "SAR 195,000", status: "reviewing", rank: 2, totalBids: 7, paymentTerms: "net30" },
  { requestId: "KAL-2024-0298", title: "PET Bottles", submitted: "3 days ago", price: "SAR 82,500", status: "shortlisted", rank: 1, totalBids: 9, paymentTerms: "partial_30" },
  { requestId: "KAL-2024-0189", title: "Wheat Flour — Industrial", submitted: "2 weeks ago", price: "SAR 440,000", status: "won", rank: 1, totalBids: 6, paymentTerms: "net30" },
];

const ANALYTICS_MONTHLY = [
  { month: "Oct", spend: 1.24, requests: 4, suppliers: 3, savings: 11 },
  { month: "Nov", spend: 1.67, requests: 6, suppliers: 5, savings: 13 },
  { month: "Dec", spend: 1.41, requests: 5, suppliers: 4, savings: 12 },
  { month: "Jan", spend: 2.1, requests: 8, suppliers: 6, savings: 15 },
  { month: "Feb", spend: 1.88, requests: 7, suppliers: 5, savings: 14 },
  { month: "Mar", spend: 2.34, requests: 9, suppliers: 7, savings: 17 },
];

const CATEGORY_SPEND = [
  { name: "Sugar & Sweeteners", pct: 38, color: C.gold },
  { name: "Edible Oils", pct: 27, color: C.teal },
  { name: "Packaging", pct: 18, color: C.blue },
  { name: "Machinery", pct: 11, color: C.purple },
  { name: "Other", pct: 6, color: C.textMuted },
];
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

const CertBadge = ({ type }) => {
  const cert = CERT_TYPES[type];
  if (!cert) return null;
  return <span style={{ background: cert.color + "18", color: cert.color, border: `1px solid ${cert.color}33`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{cert.label}</span>;
};

const Badge = ({ children, color = C.gold, small }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: small ? "2px 6px" : "3px 10px", fontSize: small ? 10 : 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{children}</span>
);

const Stat = ({ label, value, sub, accent }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <div style={{ fontSize: 22, fontWeight: 700, color: accent || C.white, fontFamily: "monospace" }}>{value}</div>
    <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: C.greenLight }}>{sub}</div>}
  </div>
);

const Card = ({ children, style: s, onClick, highlight, warning }) => (
  <div onClick={onClick} style={{ background: C.bgCard, border: `1px solid ${highlight ? C.gold + "55" : warning ? C.red + "44" : C.border}`, borderRadius: 10, padding: 20, cursor: onClick ? "pointer" : "default", transition: "border-color 0.2s", ...s }}>{children}</div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>{children}</div>
);

const Input = ({ placeholder, value, onChange, type = "text" }) => (
  <input type={type} placeholder={placeholder} value={value} onChange={onChange}
    style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", boxSizing: "border-box" }} />
);

const Select = ({ value, onChange, options, style: s }) => (
  <select value={value} onChange={onChange} style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", ...s }}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Button = ({ children, onClick, variant = "primary", small, disabled, fullWidth }) => {
  const variants = {
    primary: { background: C.gold, color: C.bg, border: "none" },
    ghost: { background: "transparent", color: C.gold, border: `1px solid ${C.gold}55` },
    subtle: { background: C.bgLight, color: C.textDim, border: `1px solid ${C.border}` },
    teal: { background: C.teal, color: C.white, border: "none" },
    danger: { background: "transparent", color: C.red, border: `1px solid ${C.red}44` },
    green: { background: C.green, color: C.white, border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...variants[variant], borderRadius: 6, padding: small ? "6px 14px" : "10px 20px", fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "inherit", letterSpacing: "0.02em", whiteSpace: "nowrap", width: fullWidth ? "100%" : "auto" }}>{children}</button>
  );
};

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

const PaymentLabel = ({ term }) => {
  const t = PAYMENT_TERMS.find(p => p.value === term);
  const color = term === "net30" || term === "net60" ? C.greenLight : term === "prepay_full" ? C.red : term === "negotiable" ? C.gold : C.teal;
  return <span style={{ background: color + "18", color, border: `1px solid ${color}33`, borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{t ? t.label : term}</span>;
};

const RiskFlag = ({ msg }) => (
  <div style={{ background: C.red + "11", border: `1px solid ${C.red}33`, borderRadius: 6, padding: "6px 10px", fontSize: 11, color: C.red, marginTop: 8 }}>⚠ {msg}</div>
);

const SupplierModal = ({ supplier, onClose, onTogglePreferred, onToggleBlacklist }) => (
  <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
    <div style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.white }}>{supplier.name}</span>
            {supplier.preferred && <Badge small color={C.gold}>Preferred</Badge>}
            {supplier.blacklisted && <Badge small color={C.red}>Blacklisted</Badge>}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{supplier.certs.map(c => <CertBadge key={c} type={c} />)}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <ScoreRing score={supplier.score} size={60} />
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>
      </div>
      {supplier.riskFlag && <RiskFlag msg={supplier.riskFlag} />}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20, marginTop: 16 }}>
        {[{ l: "Capacity", v: supplier.capacity }, { l: "Lead Time", v: supplier.leadTime }, { l: "Min. Order", v: supplier.minOrder }].map(r => (
          <div key={r.l} style={{ background: C.bgLight, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 3 }}>{r.v}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{r.l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: C.textDim }}>Saudi Content (IKTVA)</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: supplier.saudiContent >= 60 ? C.gold : C.textMuted, fontFamily: "monospace" }}>{supplier.saudiContent}%</span>
        </div>
        <div style={{ height: 4, background: C.border, borderRadius: 2, marginTop: 8 }}>
          <div style={{ height: 4, width: `${supplier.saudiContent}%`, background: supplier.saudiContent >= 60 ? C.gold : C.textMuted, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>Vision 2030 target: 60% local content</div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <SectionTitle>Score Breakdown</SectionTitle>
        <ScoreBar label="Quality Rating" value={supplier.quality} weight={40} />
        <ScoreBar label="Price Competitiveness" value={supplier.price} weight={40} />
        <ScoreBar label="Delivery Reliability" value={supplier.delivery} weight={20} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        {[{ l: "Total Bids", v: supplier.bids, color: C.white }, { l: "Completed", v: supplier.completed, color: C.greenLight }, { l: "Win Rate", v: Math.round(supplier.completed / supplier.bids * 100) + "%", color: C.gold }].map(r => (
          <div key={r.l} style={{ background: C.bgLight, borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: r.color, fontFamily: "monospace" }}>{r.v}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{r.l}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button small variant={supplier.preferred ? "ghost" : "teal"} onClick={() => onTogglePreferred(supplier.id)}>
          {supplier.preferred ? "Remove Preferred" : "★ Mark Preferred"}
        </Button>
        <Button small variant={supplier.blacklisted ? "ghost" : "danger"} onClick={() => onToggleBlacklist(supplier.id)}>
          {supplier.blacklisted ? "Remove Blacklist" : "Blacklist"}
        </Button>
        <Button small variant="subtle" onClick={onClose}>Close</Button>
      </div>
    </div>
  </div>
);

const BidModal = ({ req, onClose }) => {
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net30");
  const [submitted, setSubmitted] = useState(false);
  const handleSubmit = () => { if (!price || !timeline) return; setSubmitted(true); setTimeout(onClose, 1800); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 500, margin: "auto" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight }}>Bid Submitted</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 8 }}>The buyer will review your proposal shortly.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginBottom: 4 }}>{req.id}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{req.title}</div>
              </div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 18, fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
              {req.specs} · <span style={{ color: C.gold }}>{req.quantity}</span> · Budget: <span style={{ color: C.greenLight }}>{req.budget}</span>
              {req.requiredPayment && <div style={{ marginTop: 6 }}>Buyer prefers: <PaymentLabel term={req.requiredPayment} /></div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Your Price (SAR) *</label><Input placeholder="e.g. 334,000" value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Delivery Timeline *</label><Input placeholder="e.g. 9 days from award" value={timeline} onChange={e => setTimeline(e.target.value)} /></div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Payment Terms *</label>
                <Select value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} options={PAYMENT_TERMS} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Proposal Notes</label>
                <textarea placeholder="Certifications, capacity, references, special conditions..." value={notes} onChange={e => setNotes(e.target.value)}
                  style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 72, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="subtle" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!price || !timeline}>Submit Bid</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const NewRequestModal = ({ onClose }) => {
  const [form, setForm] = useState({ title: "", category: "Food & Beverage", quantity: "", budgetMin: "", budgetMax: "", specs: "", anonymous: true, requiredPayment: "net30", requiredCerts: [] });
  const [submitted, setSubmitted] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleCert = (c) => set("requiredCerts", form.requiredCerts.includes(c) ? form.requiredCerts.filter(x => x !== c) : [...form.requiredCerts, c]);
  const handleSubmit = () => { if (!form.title || !form.quantity) return; setSubmitted(true); setTimeout(onClose, 1800); };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 580, margin: "auto" }}>
        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight }}>Request Posted</div>
            <div style={{ fontSize: 13, color: C.textDim, marginTop: 8 }}>Verified suppliers matching your criteria will be notified.</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 22 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.white }}>Post Supply Request</div>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 22, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Request Title *</label><Input placeholder="e.g. Sugar (Refined White) — Bulk" value={form.title} onChange={e => set("title", e.target.value)} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Category</label>
                  <Select value={form.category} onChange={e => set("category", e.target.value)} options={[
                    { value: "Food & Beverage", label: "Food & Beverage" }, { value: "Raw Materials", label: "Raw Materials" },
                    { value: "Machinery", label: "Machinery" }, { value: "Packaging", label: "Packaging" }, { value: "Industrial", label: "Industrial" },
                  ]} /></div>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Quantity *</label><Input placeholder="e.g. 200 metric tons" value={form.quantity} onChange={e => set("quantity", e.target.value)} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Budget Min (SAR)</label><Input placeholder="310,000" value={form.budgetMin} onChange={e => set("budgetMin", e.target.value)} /></div>
                <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Budget Max (SAR)</label><Input placeholder="380,000" value={form.budgetMax} onChange={e => set("budgetMax", e.target.value)} /></div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Required Certifications</label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(CERT_TYPES).map(([key, cert]) => (
                    <button key={key} onClick={() => toggleCert(key)} style={{ background: form.requiredCerts.includes(key) ? cert.color + "22" : C.bgLight, border: `1px solid ${form.requiredCerts.includes(key) ? cert.color : C.border}`, color: form.requiredCerts.includes(key) ? cert.color : C.textDim, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{cert.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Payment Terms Preference</label>
                <Select value={form.requiredPayment} onChange={e => set("requiredPayment", e.target.value)} options={PAYMENT_TERMS} />
              </div>
              <div><label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 6 }}>Specifications</label>
                <textarea placeholder="Grade, delivery location, compliance standards..." value={form.specs} onChange={e => set("specs", e.target.value)}
                  style={{ background: C.bgLight, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none", width: "100%", fontFamily: "inherit", resize: "vertical", minHeight: 72, boxSizing: "border-box" }} />
              </div>
              <div style={{ background: form.anonymous ? C.gold + "0d" : C.bgLight, border: `1px solid ${form.anonymous ? C.gold + "44" : C.border}`, borderRadius: 8, padding: 14, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="checkbox" id="anon" checked={form.anonymous} onChange={e => set("anonymous", e.target.checked)} style={{ width: 16, height: 16, accentColor: C.gold, cursor: "pointer" }} />
                  <label htmlFor="anon" style={{ fontSize: 13, color: C.text, cursor: "pointer", fontWeight: 600 }}>Post Anonymously</label>
                  {form.anonymous && <Badge small color={C.gold}>Recommended</Badge>}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 8, marginLeft: 26, lineHeight: 1.7 }}>Your company identity is hidden from all suppliers. Prevents competitors from mapping your supply chain.</div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <Button variant="subtle" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={!form.title || !form.quantity}>Post Request</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const ApprovalModal = ({ supplier, bid, onClose }) => {
  const [step, setStep] = useState(1);
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000dd", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: "100%", maxWidth: 480 }}>
        {step === 1 && (
          <>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.white, marginBottom: 4 }}>Purchase Order Summary</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>Review before submitting for internal approval</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
              {[
                { l: "Request", v: "Sugar (Refined White) — KAL-2024-0350" },
                { l: "Awarded Supplier", v: supplier.name },
                { l: "Contract Value", v: `SAR ${bid.price.toLocaleString()}` },
                { l: "Delivery", v: bid.delivery },
                { l: "Payment Terms", v: PAYMENT_TERMS.find(p => p.value === bid.paymentTerms)?.label },
                { l: "Certifications", v: supplier.certs.join(", ") },
                { l: "Saudi Content", v: `${supplier.saudiContent}%` },
              ].map((r, i) => (
                <div key={r.l} style={{ display: "flex", padding: "10px 14px", background: i % 2 === 0 ? C.bgLight : "transparent", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.textMuted, width: 140, flexShrink: 0 }}>{r.l}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{r.v}</span>
                </div>
              ))}
            </div>
            <div style={{ background: C.bgLight, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 12, color: C.textDim }}>
              📤 This PO will be submitted to <strong style={{ color: C.text }}>Director of Procurement</strong> for approval. Once approved, it can be exported to your ERP system.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Button variant="subtle" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep(2)}>Submit for Approval</Button>
            </div>
          </>
        )}
        {step === 2 && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📨</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight, marginBottom: 8 }}>Submitted for Approval</div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 20, lineHeight: 1.7 }}>Your Director of Procurement has been notified. You will receive confirmation once approved. The PO will then be ready for ERP export.</div>
            <Button onClick={onClose} fullWidth>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
};
const MarketPulseWidget = () => {
  const trendColor = (t) => t === "up" ? C.red : t === "down" ? C.greenLight : C.gold;
  const trendIcon = (t) => t === "up" ? "↑" : t === "down" ? "↓" : "→";
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <SectionTitle>Market Pulse — Live Pricing</SectionTitle>
        <Badge small color={C.greenLight}>Live</Badge>
      </div>
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>Anonymized average from platform transactions — updated daily</div>
      {MARKET_PULSE.map(m => (
        <div key={m.category} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{m.category}</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>SAR {m.unit}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "monospace" }}>SAR {m.avg.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: trendColor(m.trend), fontWeight: 600 }}>{trendIcon(m.trend)} {m.change}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textMuted }}>
            <span>Low: <span style={{ color: C.greenLight }}>SAR {m.low.toLocaleString()}</span></span>
            <span>High: <span style={{ color: C.red }}>SAR {m.high.toLocaleString()}</span></span>
          </div>
        </div>
      ))}
    </Card>
  );
};

const ContractTracker = ({ onNewRequest }) => (
  <Card>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <SectionTitle>Contract Expiry Tracker</SectionTitle>
      <Badge small color={C.red}>2 Expiring Soon</Badge>
    </div>
    {CONTRACTS.map(c => {
      const color = c.status === "critical" ? C.red : c.status === "expiring" ? C.gold : C.greenLight;
      return (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{c.item}</span>
              {c.status !== "active" && <Badge small color={color}>{c.status === "critical" ? "Critical" : "Expiring"}</Badge>}
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{c.supplier} · {c.value}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "monospace" }}>{c.daysLeft}d</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{c.expiry}</div>
          </div>
          {c.status !== "active" && (
            <Button small variant="ghost" onClick={onNewRequest} style={{ marginLeft: 12 }}>Rebid</Button>
          )}
        </div>
      );
    })}
  </Card>
);

const BidComparisonView = ({ suppliers, onUpdateSuppliers }) => {
  const [certFilter, setCertFilter] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [awardedId, setAwardedId] = useState(null);
  const [supplierModal, setSupplierModal] = useState(null);
  const [approvalModal, setApprovalModal] = useState(null);
  const toggleCert = (c) => setCertFilter(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);
  const scoreColor = v => v >= 90 ? C.greenLight : v >= 80 ? C.gold : C.red;
  const bids = SUGAR_BIDS
    .map(b => ({ ...b, supplier: suppliers.find(s => s.id === b.supplierId) }))
    .filter(b => !b.supplier.blacklisted)
    .filter(b => certFilter.length === 0 || certFilter.every(c => b.supplier.certs.includes(c)))
    .filter(b => paymentFilter === "all" || b.paymentTerms === paymentFilter)
    .sort((a, b) => b.totalScore - a.totalScore);
  const winner = bids[0];
  const handleTogglePreferred = (id) => onUpdateSuppliers(suppliers.map(s => s.id === id ? { ...s, preferred: !s.preferred } : s));
  const handleToggleBlacklist = (id) => onUpdateSuppliers(suppliers.map(s => s.id === id ? { ...s, blacklisted: !s.blacklisted } : s));
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 4 }}>Bid Comparison</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>Side-by-side evaluation with weighted trust scoring</div>
      </div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", marginBottom: 3 }}>KAL-2024-0350</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.white }}>Sugar (Refined White) — Bulk · 200 Metric Tons</div>
            <div style={{ fontSize: 12, color: C.textDim, marginTop: 4 }}>ICUMSA 45 · Phytosanitary cert required · Deadline Mar 20, 2025 · Buyer prefers: <PaymentLabel term="net30" /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={C.gold}>{SUGAR_BIDS.length} bids</Badge>
            <Badge color={C.teal}>Open</Badge>
          </div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Filter by certification:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(CERT_TYPES).map(([key, cert]) => (
              <button key={key} onClick={() => toggleCert(key)} style={{ background: certFilter.includes(key) ? cert.color + "22" : C.bgLight, border: `1px solid ${certFilter.includes(key) ? cert.color : C.border}`, color: certFilter.includes(key) ? cert.color : C.textDim, borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{cert.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Filter by payment terms:</div>
          <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} options={[{ value: "all", label: "All Terms" }, ...PAYMENT_TERMS]} />
        </div>
      </div>
      {winner && !awardedId && (
        <div style={{ background: C.gold + "0d", border: `1px solid ${C.gold}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 700 }}>Recommended: </span>
            <span style={{ fontSize: 13, color: C.text }}>{winner.supplier.name} — highest overall score at SAR {winner.price.toLocaleString()}</span>
          </div>
          <Button small onClick={() => { setAwardedId(winner.supplierId); setApprovalModal({ supplier: winner.supplier, bid: winner }); }}>Award Contract</Button>
        </div>
      )}
      {awardedId && !approvalModal && (
        <div style={{ background: C.green + "0d", border: `1px solid ${C.green}33`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>✓</span>
          <span style={{ fontSize: 13, color: C.greenLight, fontWeight: 600 }}>Contract awarded — PO submitted for director approval and ready for ERP export.</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {bids.map((bid, i) => {
          const isWinner = i === 0;
          const isAwarded = awardedId === bid.supplierId;
          const paymentMatch = bid.paymentTerms === "net30" || bid.paymentTerms === "net60" || bid.paymentTerms === "negotiable";
          return (
            <Card key={bid.supplierId} highlight={isWinner} style={{ position: "relative", overflow: "hidden" }}>
              {isWinner && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})` }} />}
              {bid.supplier.riskFlag && <div style={{ position: "absolute", top: 0, right: 0, background: C.red, color: C.white, fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: "0 10px 0 6px" }}>RISK FLAG</div>}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: isWinner ? C.gold : C.textMuted, width: 28, fontFamily: "monospace" }}>#{i + 1}</div>
                  <ScoreRing score={Math.round(bid.totalScore)} size={52} />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{bid.supplier.name}</span>
                    {bid.supplier.verified && <Badge small color={C.greenLight}>Verified</Badge>}
                    {bid.supplier.preferred && <Badge small color={C.gold}>★ Preferred</Badge>}
                    {isAwarded && <Badge small color={C.teal}>Awarded</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>{bid.supplier.certs.map(c => <CertBadge key={c} type={c} />)}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: C.textMuted }}>Payment:</span>
                    <PaymentLabel term={bid.paymentTerms} />
                    {!paymentMatch && <span style={{ fontSize: 10, color: C.red }}>⚠ May not match policy</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim }}>Saudi Content: <span style={{ color: bid.supplier.saudiContent >= 60 ? C.gold : C.textMuted, fontWeight: 600 }}>{bid.supplier.saudiContent}%</span></div>
                  {bid.supplier.riskFlag && <RiskFlag msg={bid.supplier.riskFlag} />}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, minWidth: 200 }}>
                  {[{ label: "Price", value: bid.priceScore, w: "40%" }, { label: "Quality", value: bid.qualityScore, w: "40%" }, { label: "Delivery", value: bid.deliveryScore, w: "20%" }].map(s => (
                    <div key={s.label} style={{ background: C.bgLight, borderRadius: 8, padding: "9px 6px", textAlign: "center" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: scoreColor(s.value), fontFamily: "monospace" }}>{s.value}</div>
                      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 9, color: C.textMuted }}>{s.w}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 110 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, color: C.greenLight, fontFamily: "monospace" }}>SAR {bid.price.toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>🚚 {bid.delivery}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Button small variant="ghost" onClick={() => setSupplierModal(bid.supplier)}>Profile</Button>
                    {!awardedId && <Button small variant={isWinner ? "primary" : "subtle"} onClick={() => { setAwardedId(bid.supplierId); setApprovalModal({ supplier: bid.supplier, bid }); }}>Award</Button>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {supplierModal && <SupplierModal supplier={supplierModal} onClose={() => setSupplierModal(null)} onTogglePreferred={handleTogglePreferred} onToggleBlacklist={handleToggleBlacklist} />}
      {approvalModal && <ApprovalModal supplier={approvalModal.supplier} bid={approvalModal.bid} onClose={() => setApprovalModal(null)} />}
    </div>
  );
};

const AnalyticsView = () => {
  const maxSpend = Math.max(...ANALYTICS_MONTHLY.map(m => m.spend));
  const maxSavings = Math.max(...ANALYTICS_MONTHLY.map(m => m.savings));
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 4 }}>Procurement Analytics</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>Savola Group · Sugar Division · Oct 2024 – Mar 2025</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Spend (6mo)", value: "SAR 10.6M", accent: C.white },
          { label: "Avg. Savings vs. Direct", value: "13.7%", accent: C.greenLight, sub: "SAR 1.47M saved" },
          { label: "Requests Posted", value: "39", accent: C.white },
          { label: "Unique Suppliers", value: "12", accent: C.gold },
        ].map(s => <Card key={s.label}><Stat {...s} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>Monthly Spend (SAR M)</SectionTitle>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {ANALYTICS_MONTHLY.map((m, i) => {
              const h = (m.spend / maxSpend) * 100;
              const isLast = i === ANALYTICS_MONTHLY.length - 1;
              return (
                <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 10, color: isLast ? C.gold : C.textMuted, fontFamily: "monospace" }}>{m.spend}M</div>
                  <div style={{ width: "100%", height: `${h}%`, background: isLast ? C.gold : C.bgLight, border: `1px solid ${isLast ? C.gold : C.border}`, borderRadius: "4px 4px 0 0", minHeight: 8 }} />
                  <div style={{ fontSize: 10, color: C.textMuted }}>{m.month}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionTitle>Spend by Category</SectionTitle>
          {CATEGORY_SPEND.map(cat => (
            <div key={cat.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textDim }}>{cat.name}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: cat.color, fontFamily: "monospace" }}>{cat.pct}%</span>
              </div>
              <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                <div style={{ height: 4, width: `${cat.pct}%`, background: cat.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>Savings vs. Direct Contracts (%)</SectionTitle>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
            {ANALYTICS_MONTHLY.map((m) => {
              const h = (m.savings / maxSavings) * 100;
              return (
                <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{ fontSize: 10, color: C.greenLight, fontFamily: "monospace" }}>{m.savings}%</div>
                  <div style={{ width: "100%", height: `${h}%`, background: C.green + "33", border: `1px solid ${C.greenLight}55`, borderRadius: "4px 4px 0 0", minHeight: 6 }} />
                  <div style={{ fontSize: 10, color: C.textMuted }}>{m.month}</div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <SectionTitle>Supplier Concentration Risk</SectionTitle>
          {[
            { name: "Al-Marai Supply Co.", share: 34, risk: "medium" },
            { name: "Eastern Provisions Ltd.", share: 28, risk: "low" },
            { name: "Gulf Industrial Partners", share: 19, risk: "low" },
            { name: "Others (9 suppliers)", share: 19, risk: "low" },
          ].map(s => (
            <div key={s.name} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: C.textDim }}>{s.name}</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {s.risk === "medium" && <Badge small color={C.gold}>Watch</Badge>}
                  <span style={{ fontSize: 11, color: C.white, fontFamily: "monospace" }}>{s.share}%</span>
                </div>
              </div>
              <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
                <div style={{ height: 3, width: `${s.share}%`, background: s.risk === "medium" ? C.gold : C.teal, borderRadius: 2 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 10, background: C.gold + "0d", border: `1px solid ${C.gold}33`, borderRadius: 6, padding: "8px 12px", fontSize: 11, color: C.gold }}>
            ⚠ Al-Marai share above 30% — consider diversifying
          </div>
        </Card>
      </div>
      <MarketPulseWidget />
    </div>
  );
};
const MarketplaceView = ({ role }) => {
  const [bidModal, setBidModal] = useState(null);
  const [newModal, setNewModal] = useState(false);
  const [filter, setFilter] = useState("all");
  const [certFilter, setCertFilter] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const toggleCert = (c) => setCertFilter(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);
  const filtered = REQUESTS.filter(r => filter === "all" || r.category === filter);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white }}>Open Requests</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{filtered.length} active procurement requests</div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {role === "business" && <Button onClick={() => setNewModal(true)}>+ Post Request</Button>}
          <Select value={filter} onChange={e => setFilter(e.target.value)} options={[
            { value: "all", label: "All Categories" }, { value: "Food & Beverage", label: "Food & Beverage" },
            { value: "Machinery", label: "Machinery" }, { value: "Packaging", label: "Packaging" },
          ]} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Required certifications:</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(CERT_TYPES).map(([key, cert]) => (
              <button key={key} onClick={() => toggleCert(key)} style={{ background: certFilter.includes(key) ? cert.color + "22" : C.bgLight, border: `1px solid ${certFilter.includes(key) ? cert.color : C.border}`, color: certFilter.includes(key) ? cert.color : C.textDim, borderRadius: 6, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{cert.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Payment terms:</div>
          <Select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} options={[{ value: "all", label: "All Terms" }, ...PAYMENT_TERMS]} />
        </div>
      </div>
      {filtered.map(req => (
        <Card key={req.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{req.id}</span>
                <Badge color={C.teal}>{req.category}</Badge>
                {req.anonymous ? <Badge color={C.textMuted}>Anonymous Buyer</Badge> : <Badge color={C.bgLight}>{req.businessName}</Badge>}
                <PaymentLabel term={req.requiredPayment} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 6 }}>{req.title}</div>
              <div style={{ fontSize: 12, color: C.textDim, marginBottom: 10, lineHeight: 1.6 }}>{req.specs}</div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>Qty: <span style={{ color: C.text }}>{req.quantity}</span></span>
                <span style={{ fontSize: 12, color: C.textMuted }}>Deadline: <span style={{ color: C.gold }}>{req.deadline}</span></span>
                <span style={{ fontSize: 12, color: C.textMuted }}>Budget: <span style={{ color: C.greenLight }}>{req.budget}</span></span>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: C.textMuted }}>{req.bidsCount} bids</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>{req.posted}</div>
              {role === "supplier" ? <Button small onClick={() => setBidModal(req)}>Submit Bid</Button> : <Button small variant="ghost">View Bids</Button>}
            </div>
          </div>
        </Card>
      ))}
      {bidModal && <BidModal req={bidModal} onClose={() => setBidModal(null)} />}
      {newModal && <NewRequestModal onClose={() => setNewModal(false)} />}
    </div>
  );
};

const BusinessDashboard = ({ onNavigate, suppliers }) => {
  const [newModal, setNewModal] = useState(false);
  const [supplierModal, setSupplierModal] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 2 }}>Procurement Dashboard</div>
          <div style={{ fontSize: 13, color: C.textMuted }}>Savola Group · Sugar Division</div>
        </div>
        <Button onClick={() => setNewModal(true)}>+ New Request</Button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Active Requests", value: "2", accent: C.gold },
          { label: "Bids Received", value: "18", accent: C.white, sub: "+6 this week" },
          { label: "Suppliers Awarded", value: "12", accent: C.greenLight },
          { label: "Avg. Savings", value: "13.7%", accent: C.teal, sub: "vs. direct contracts" },
        ].map(s => <Card key={s.label}><Stat {...s} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>My Requests</SectionTitle>
          {MY_REQUESTS.map(req => (
            <div key={req.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{req.title}</span>
                  {req.anonymous && <Badge small color={C.gold}>Anon</Badge>}
                </div>
                <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{req.id}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: C.white }}>{req.bids} bids</span>
                <Badge small color={req.status === "open" ? C.greenLight : C.textMuted}>{req.status}</Badge>
                {req.status === "open" && <Button small variant="ghost" onClick={() => onNavigate("compare")}>Compare</Button>}
              </div>
            </div>
          ))}
        </Card>
        <MarketPulseWidget />
      </div>
      <ContractTracker onNewRequest={() => setNewModal(true)} />
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>Top Ranked — Sugar (Refined White)</SectionTitle>
          <Button small variant="ghost" onClick={() => onNavigate("compare")}>Full Comparison →</Button>
        </div>
        <Card>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14 }}>KAL-2024-0350 · Price 40% · Quality 40% · Delivery 20%</div>
          {SUGAR_BIDS.slice(0, 3).map((bid, i) => {
            const s = suppliers.find(x => x.id === bid.supplierId);
            return (
              <div key={bid.supplierId} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: i === 0 ? C.gold : C.textMuted, width: 24, fontFamily: "monospace" }}>#{i + 1}</div>
                <ScoreRing score={Math.round(bid.totalScore)} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{s.name}</span>
                    {s.preferred && <Badge small color={C.gold}>★</Badge>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{s.certs.slice(0, 3).map(c => <CertBadge key={c} type={c} />)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, color: C.greenLight, fontFamily: "monospace", fontWeight: 700 }}>SAR {bid.price.toLocaleString()}</div>
                  <div style={{ marginTop: 3 }}><PaymentLabel term={bid.paymentTerms} /></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button small variant="ghost" onClick={() => setSupplierModal(s)}>Profile</Button>
                  {i === 0 && <Button small onClick={() => onNavigate("compare")}>Award</Button>}
                </div>
              </div>
            );
          })}
        </Card>
      </div>
      {newModal && <NewRequestModal onClose={() => setNewModal(false)} />}
      {supplierModal && <SupplierModal supplier={supplierModal} onClose={() => setSupplierModal(null)} onTogglePreferred={() => {}} onToggleBlacklist={() => {}} />}
    </div>
  );
};

const SupplierDashboard = () => {
  const me = SUPPLIERS[0];
  const statusColor = s => ({ reviewing: C.gold, shortlisted: C.teal, won: C.greenLight }[s] || C.textMuted);
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.white, marginBottom: 2 }}>Supplier Dashboard</div>
        <div style={{ fontSize: 13, color: C.textMuted }}>Al-Marai Supply Co.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Trust Score", value: "94", accent: C.greenLight, sub: "Top 5% of suppliers" },
          { label: "Active Bids", value: "7", accent: C.gold },
          { label: "Won This Month", value: "3", accent: C.white },
          { label: "Est. Revenue", value: "SAR 1.2M", accent: C.white },
        ].map(s => <Card key={s.label}><Stat {...s} /></Card>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card>
          <SectionTitle>Trust Score Breakdown</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 14 }}>
            <ScoreRing score={94} size={72} />
            <div style={{ flex: 1 }}>
              <ScoreBar label="Quality" value={98} weight={40} />
              <ScoreBar label="Price" value={88} weight={40} />
              <ScoreBar label="Delivery" value={97} weight={20} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Saudi Content (IKTVA)</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{ height: 6, flex: 1, background: C.border, borderRadius: 3 }}>
                <div style={{ height: 6, width: `${me.saudiContent}%`, background: C.gold, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: "monospace" }}>{me.saudiContent}%</span>
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Vision 2030 target: 60%</div>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{me.certs.map(c => <CertBadge key={c} type={c} />)}</div>
        </Card>
        <Card>
          <SectionTitle>Performance</SectionTitle>
          {[{ label: "Total Bids", val: "142" }, { label: "Contracts Fulfilled", val: "138" }, { label: "Win Rate", val: "97.2%" }, { label: "Avg Response Time", val: "4.2 hrs" }, { label: "Monthly Capacity", val: "500 MT" }].map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textMuted }}>{r.label}</span>
              <span style={{ color: C.white, fontFamily: "monospace", fontWeight: 600 }}>{r.val}</span>
            </div>
          ))}
        </Card>
      </div>
      <Card>
        <SectionTitle>My Active Bids</SectionTitle>
        {MY_BIDS.map(bid => (
          <div key={bid.requestId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.white, marginBottom: 3 }}>{bid.title}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{bid.requestId}</span>
                <PaymentLabel term={bid.paymentTerms} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 13, color: C.greenLight, fontFamily: "monospace" }}>{bid.price}</span>
              <Badge color={statusColor(bid.status)}>{bid.status}</Badge>
              <span style={{ fontSize: 11, color: C.textMuted }}>#{bid.rank}/{bid.totalBids}</span>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

const AuthScreen = ({ onLogin }) => {
  const [tab, setTab] = useState("login");
  const [role, setRole] = useState("business");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Procurement Intelligence Platform</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: C.white, letterSpacing: "0.08em" }}>KA<span style={{ color: C.gold }}>LA</span>LI</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 8 }}>B2B Supply Chain Marketplace · KSA</div>
          <div style={{ width: 40, height: 2, background: C.gold, margin: "16px auto 0" }} />
        </div>
        <div style={{ background: C.bgMid, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28 }}>
          <div style={{ display: "flex", marginBottom: 24, background: C.bgLight, borderRadius: 8, padding: 3 }}>
            {["login", "register"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? C.bgMid : "transparent", color: tab === t ? C.white : C.textMuted, fontFamily: "inherit" }}>
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "register" && (
              <div>
                <label style={{ fontSize: 12, color: C.textMuted, display: "block", marginBottom: 8 }}>I am a</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {["business", "supplier"].map(r => (
                    <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "10px 0", border: `1px solid ${role === r ? C.gold : C.border}`, borderRadius: 6, background: role === r ? C.gold + "11" : "transparent", color: role === r ? C.gold : C.textMuted, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize" }}>{r}</button>
                  ))}
                </div>
              </div>
            )}
            {tab === "register" && <Input placeholder="Company Name" value="" onChange={() => {}} />}
            <Input placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <Input placeholder="Password" type="password" value={pass} onChange={e => setPass(e.target.value)} />
            <Button onClick={() => onLogin(role)}>{tab === "login" ? "Sign In" : "Create Account"}</Button>
          </div>
          {tab === "login" && (
            <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, textAlign: "center" }}>Quick demo access</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="subtle" small onClick={() => onLogin("business")} fullWidth>Business Demo</Button>
                <Button variant="subtle" small onClick={() => onLogin("supplier")} fullWidth>Supplier Demo</Button>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: C.textMuted }}>
          The Al-Kalali family · Est. procurement intelligence for KSA
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState("business");
  const [view, setView] = useState("dashboard");
  const [notifications, setNotifications] = useState(4);
  const [suppliers, setSuppliers] = useState(SUPPLIERS);

  const handleLogin = (r) => { setRole(r); setAuthed(true); setView("dashboard"); };
  const handleLogout = () => { setAuthed(false); setView("dashboard"); setNotifications(4); };

  if (!authed) return <AuthScreen onLogin={handleLogin} />;

  const navItems = role === "business"
    ? [{ id: "dashboard", label: "Dashboard" }, { id: "marketplace", label: "Marketplace" }, { id: "compare", label: "Bid Comparison" }, { id: "analytics", label: "Analytics" }]
    : [{ id: "dashboard", label: "Dashboard" }, { id: "marketplace", label: "Browse Requests" }];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: C.text }}>
      <div style={{ background: C.bgMid, borderBottom: `1px solid ${C.border}`, padding: "0 16px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, height: 52, overflowX: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: C.white, letterSpacing: "0.1em", flexShrink: 0, marginRight: 12 }}>
            KA<span style={{ color: C.gold }}>LA</span>LI
          </div>
          <div style={{ display: "flex", gap: 2, flex: 1 }}>
            {navItems.map(item => (
              <button key={item.id} onClick={() => setView(item.id)} style={{ padding: "6px 12px", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0, background: view === item.id ? C.bgLight : "transparent", color: view === item.id ? C.white : C.textMuted }}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setNotifications(0)} style={{ background: "none", border: "none", cursor: "pointer", position: "relative", padding: 4 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              {notifications > 0 && <span style={{ position: "absolute", top: 0, right: 0, background: C.red, color: C.white, borderRadius: "50%", width: 14, height: 14, fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{notifications}</span>}
            </button>
            <Badge color={role === "business" ? C.teal : C.gold} small>{role}</Badge>
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Out</button>
          </div>
        </div>
      </div>

      {role === "business" && view === "dashboard" && (
        <div style={{ background: C.red + "11", borderBottom: `1px solid ${C.red}33`, padding: "8px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", fontSize: 12, color: C.red }}>
            ⚠ 2 contracts expiring within 14 days — <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 12, fontFamily: "inherit", textDecoration: "underline" }}>View Contract Tracker</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
        {view === "dashboard" && role === "business" && <BusinessDashboard onNavigate={setView} suppliers={suppliers} />}
        {view === "dashboard" && role === "supplier" && <SupplierDashboard />}
        {view === "marketplace" && <MarketplaceView role={role} />}
        {view === "compare" && role === "business" && <BidComparisonView suppliers={suppliers} onUpdateSuppliers={setSuppliers} />}
        {view === "analytics" && role === "business" && <AnalyticsView />}
      </div>
    </div>
  );
}

