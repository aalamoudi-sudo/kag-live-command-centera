"use strict";
/**
 * report-generator.js — v5 Professional Edition
 * قالب احترافي مستوحى من التقارير الحكومية الرسمية السعودية
 * تصميم: ذهبي / كحلي عميق / أبيض — مناسب للعرض أمام القيادة والجهات الرسمية
 */

// ─── ثوابت ───────────────────────────────────────────────────
const TRACK_NAMES = {
  "أ":"التخطيط والتنسيق",
  "ب":"التواصل والتسويق",
  "ج":"الفعاليات والأنشطة المصاحبة",
  "د":"تجهيز وتفعيل الحديقة"
};
const TRACK_COLORS = {
  "أ":{ bg:"#1B3A5C", accent:"#C9A84C", light:"#EEF3F9" },
  "ب":{ bg:"#2D1F5E", accent:"#9B7FD4", light:"#F2EFF9" },
  "ج":{ bg:"#3D2200", accent:"#D4872A", light:"#FBF4EC" },
  "د":{ bg:"#0D3B35", accent:"#2BAE99", light:"#EBF8F6" }
};
const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];

const isDone     = s => DONE_SET.includes(s);
const isActive   = s => ACTIVE_SET.includes(s);
const isRiskS    = s => RISK_SET.includes(s);
const isRiskItem = i => ["risks","مخاطرة","مخاطر"].includes(i.type);

function getDateBuckets(reportDate){
  const base = reportDate ? new Date(reportDate) : new Date();
  base.setHours(0,0,0,0);
  const d = n => { const x=new Date(base); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  return { yesterday:d(-1), today:d(0), tomorrow:d(1), base };
}
function bucketItems(items, buckets){
  const {yesterday,today,tomorrow} = buckets;
  const yd=[],td=[],tm=[];
  items.forEach(i=>{
    const due = i.due ? String(i.due).slice(0,10) : null;
    if(due===yesterday) yd.push(i);
    else if(due===today) td.push(i);
    else if(due===tomorrow) tm.push(i);
  });
  const done   = yd.length ? yd : items.filter(i=>isDone(i.status)).slice(0,8);
  const active = td.length ? td : items.filter(i=>isActive(i.status)).slice(0,8);
  const next   = tm.length ? tm : items.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due)
                                       .sort((a,b)=>a.due>b.due?1:-1).slice(0,8);
  return { done, active, next, hasExactDates: yd.length>0||td.length>0||tm.length>0 };
}

function fmtDate(s){
  if(!s) return "—";
  try{
    const d = new Date(s);
    return isNaN(d) ? s : d.toLocaleDateString("ar-SA",{year:"numeric",month:"2-digit",day:"2-digit"});
  }catch{ return s; }
}
function todayAr(base){
  return (base||new Date()).toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function weekNum(base){
  const d = base ? new Date(base) : new Date();
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d - new Date(d.getFullYear(),0,4)) / (7*86400000)) + 1;
}

function statusBadge(s){
  if(!s) return `<span class="badge b-gray">—</span>`;
  if(isDone(s))   return `<span class="badge b-green"><span class="badge-dot"></span>${s}</span>`;
  if(isActive(s)) return `<span class="badge b-blue"><span class="badge-dot"></span>${s}</span>`;
  if(isRiskS(s))  return `<span class="badge b-red"><span class="badge-dot"></span>${s}</span>`;
  return `<span class="badge b-gray">${s}</span>`;
}
function trackStatusChip(s){
  if(s==="ضمن المسار")   return `<span class="t-chip chip-green">✓ ضمن المسار</span>`;
  if(s==="تحت المتابعة") return `<span class="t-chip chip-amber">⚑ تحت المتابعة</span>`;
  if(s==="معرض للخطر")  return `<span class="t-chip chip-red">⚠ معرض للخطر</span>`;
  return `<span class="t-chip chip-gray">${s||"—"}</span>`;
}
function progressBar(pct, color){
  const p = Math.min(100, Math.max(0, pct||0));
  return `<div class="pbar-wrap">
    <div class="pbar-rail"><div class="pbar-fill" style="width:${p}%;background:${color||"#C9A84C"}"></div></div>
    <span class="pbar-label" style="color:${color||"#C9A84C"}">${p}%</span>
  </div>`;
}

// ════════════════════════════════════════════════════════════
// CSS — تصميم حكومي احترافي
// ════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:       #0E1F2E;
  --navy:      #102840;
  --navy-mid:  #1A3A52;
  --gold:      #C9A84C;
  --gold-lt:   #F5EDD6;
  --gold-dim:  #8A6E2A;
  --white:     #FFFFFF;
  --off-white: #F8F9FB;
  --rule:      #DDE2E8;
  --text:      #1A2635;
  --text-2:    #4A5668;
  --text-3:    #7A8899;
  --green:     #1B7A45;
  --green-lt:  #E6F5EE;
  --red:       #B53028;
  --red-lt:    #FDECEA;
  --amber:     #C47A10;
  --amber-lt:  #FEF3DC;
  --blue:      #1557A0;
  --blue-lt:   #E8F0FA;
  --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 2px 8px rgba(0,0,0,.04);
  --shadow-md: 0 2px 8px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.05);
}

html { font-size: 13px; }
body {
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
  background: var(--off-white);
  color: var(--text);
  line-height: 1.6;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ── طباعة / PDF ────────────────────────────────────── */
@media print {
  .no-print { display: none !important; }
  body { background: #fff; font-size: 10pt; }
  .report-wrap { padding: 0; max-width: 100%; }
  .section { box-shadow: none !important; border: 1px solid #d0d5dd !important; break-inside: avoid; margin-bottom: 10pt !important; }
  .cover { border-radius: 0 !important; margin: 0 !important; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { margin: 15mm 18mm; size: A4; }
  h1 { font-size: 18pt !important; }
  .kpi-strip { grid-template-columns: repeat(6, 1fr) !important; }
  .tracks-grid { grid-template-columns: 1fr 1fr !important; }
  .tl-grid { grid-template-columns: 1fr 1fr 1fr !important; }
}

/* ── شريط الأدوات ────────────────────────────────────── */
.topbar {
  position: fixed; top: 0; right: 0; left: 0; z-index: 999;
  height: 48px;
  background: var(--navy);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px;
  border-bottom: 2px solid var(--gold);
  box-shadow: 0 2px 12px rgba(0,0,0,.25);
}
.topbar-brand {
  display: flex; align-items: center; gap: 10px;
}
.topbar-logo {
  width: 28px; height: 28px;
  background: var(--gold);
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: var(--navy); font-weight: 900;
}
.topbar-name {
  font-size: .82rem; font-weight: 700; color: rgba(255,255,255,.9);
  letter-spacing: .3px;
}
.topbar-name span { color: var(--gold); }
.topbar-actions { display: flex; gap: 8px; }
.btn-export {
  background: var(--gold);
  color: var(--navy);
  border: none;
  height: 32px; padding: 0 16px;
  border-radius: 5px;
  font-family: inherit; font-size: .8rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 5px;
  transition: opacity .15s;
}
.btn-export:hover { opacity: .85; }
.btn-close {
  background: transparent; color: rgba(255,255,255,.65);
  border: 1px solid rgba(255,255,255,.2);
  height: 32px; padding: 0 12px;
  border-radius: 5px;
  font-family: inherit; font-size: .8rem; cursor: pointer;
}

/* ── لفافة ────────────────────────────────────────────── */
.report-wrap {
  max-width: 1020px;
  margin: 64px auto 40px;
  padding: 0 20px;
}

/* ── غلاف التقرير ────────────────────────────────────── */
.cover {
  position: relative;
  background: var(--navy);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
  padding: 0;
}
.cover-inner {
  position: relative; z-index: 2;
  padding: 32px 36px 28px;
}
/* خط ذهبي علوي */
.cover::before {
  content: '';
  position: absolute; top: 0; right: 0; left: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--gold) 0%, #E8C96A 50%, var(--gold) 100%);
}
/* زخرفة هندسية */
.cover::after {
  content: '';
  position: absolute; left: -120px; bottom: -120px;
  width: 400px; height: 400px; border-radius: 50%;
  background: radial-gradient(circle, rgba(201,168,76,.08) 0%, transparent 65%);
  pointer-events: none;
}
.cover-eyebrow {
  font-size: .72rem; font-weight: 500;
  color: var(--gold);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 8px;
  opacity: .85;
}
.cover-title {
  font-size: 1.75rem; font-weight: 900;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 6px;
}
.cover-title .accent { color: var(--gold); }
.cover-subtitle {
  font-size: .82rem; color: rgba(255,255,255,.5);
  margin-bottom: 20px;
}
.cover-rule {
  width: 48px; height: 2px;
  background: var(--gold);
  margin-bottom: 20px;
  opacity: .7;
}
.cover-meta {
  display: flex; gap: 0;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
}
.cover-meta-cell {
  padding: 10px 20px;
  border-left: 1px solid rgba(255,255,255,.1);
  display: flex; flex-direction: column; gap: 2px;
}
.cover-meta-cell:first-child { border-left: none; }
.cover-meta-label {
  font-size: .65rem; font-weight: 500;
  color: rgba(255,255,255,.4);
  letter-spacing: .8px;
  text-transform: uppercase;
}
.cover-meta-value {
  font-size: .85rem; font-weight: 700;
  color: rgba(255,255,255,.9);
}
.cover-meta-value.gold { color: var(--gold); }

/* ── شريط KPI ────────────────────────────────────────── */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}
@media(max-width:860px){ .kpi-strip { grid-template-columns: repeat(3,1fr); } }

.kpi-card {
  background: var(--white);
  border-radius: 8px;
  padding: 14px 12px 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--rule);
  position: relative;
  overflow: hidden;
  text-align: center;
}
.kpi-card::after {
  content: '';
  position: absolute; bottom: 0; right: 0; left: 0;
  height: 3px;
}
.kpi-card.k-total::after  { background: var(--navy); }
.kpi-card.k-done::after   { background: var(--green); }
.kpi-card.k-active::after { background: var(--blue); }
.kpi-card.k-late::after   { background: var(--red); }
.kpi-card.k-pct::after    { background: var(--gold); }
.kpi-card.k-risk::after   { background: var(--amber); }

.kpi-num {
  font-size: 2rem; font-weight: 900;
  line-height: 1;
  margin-bottom: 4px;
}
.k-total .kpi-num  { color: var(--navy); }
.k-done  .kpi-num  { color: var(--green); }
.k-active .kpi-num { color: var(--blue); }
.k-late  .kpi-num  { color: var(--red); }
.k-pct   .kpi-num  { color: var(--gold-dim); }
.k-risk  .kpi-num  { color: var(--amber); }

.kpi-label {
  font-size: .68rem; font-weight: 500;
  color: var(--text-3);
  line-height: 1.3;
}

/* ── قسم عام (section card) ─────────────────────────── */
.section {
  background: var(--white);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--rule);
  margin-bottom: 14px;
  overflow: hidden;
}
.section-head {
  display: flex; align-items: center; gap: 10px;
  padding: 11px 18px;
  border-bottom: 1px solid var(--rule);
  background: var(--off-white);
}
.section-icon {
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem; flex-shrink: 0;
}
.section-title {
  font-size: .88rem; font-weight: 700;
  color: var(--text); flex: 1;
}
.section-count {
  font-size: .72rem; font-weight: 600;
  color: var(--text-3);
  background: var(--rule);
  padding: 2px 8px; border-radius: 10px;
}
.section-body  { padding: 16px 18px; }
.section-body-tight { padding: 12px 18px; }

/* ── بطاقات المسارات ─────────────────────────────────── */
.tracks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.track-card {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--rule);
  box-shadow: var(--shadow-sm);
}
.track-head {
  padding: 13px 16px;
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px;
}
.track-letter {
  width: 34px; height: 34px; border-radius: 6px;
  background: rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 900; color: #fff;
  flex-shrink: 0;
}
.track-info { flex: 1; }
.track-name { font-size: .85rem; font-weight: 700; color: #fff; margin-bottom: 2px; }
.track-focus { font-size: .7rem; color: rgba(255,255,255,.55); }
.track-body { padding: 12px 16px; background: var(--white); }
.track-kpi-row {
  display: grid; grid-template-columns: repeat(4,1fr);
  gap: 6px; margin-top: 10px;
}
.t-kpi { text-align: center; padding: 7px 4px; border-radius: 6px; background: var(--off-white); }
.t-kpi .tv { font-size: 1.2rem; font-weight: 900; line-height: 1; }
.t-kpi .tl { font-size: .63rem; color: var(--text-3); margin-top: 2px; }

/* ── جدول المهام ─────────────────────────────────────── */
.data-table {
  width: 100%; border-collapse: collapse;
  font-size: .77rem;
}
.data-table thead tr {
  background: var(--navy);
}
.data-table th {
  padding: 8px 12px;
  text-align: right; font-weight: 600; font-size: .72rem;
  color: rgba(255,255,255,.9); white-space: nowrap;
}
.data-table th:first-child { border-radius: 0 6px 0 0; }
.data-table th:last-child  { border-radius: 6px 0 0 0; }
.data-table tbody tr:nth-child(even) td { background: #FAFBFC; }
.data-table tbody tr:hover td { background: var(--blue-lt); }
.data-table td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--rule);
  vertical-align: middle;
  color: var(--text);
}
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table .col-title { font-weight: 600; }
.data-table .col-meta  { color: var(--text-2); white-space: nowrap; }
.data-table .col-date  { color: var(--text-3); white-space: nowrap; font-size: .7rem; }

/* ── الجدول الزمني ───────────────────────────────────── */
.tl-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.tl-col { border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--rule); }
.tl-head {
  padding: 9px 14px;
  font-size: .75rem; font-weight: 700;
  display: flex; align-items: center; gap: 6px;
}
.tl-body { padding: 0; flex: 1; background: var(--white); }
.tl-item {
  padding: 9px 14px;
  border-bottom: 1px solid var(--rule);
  display: flex; flex-direction: column; gap: 3px;
}
.tl-item:last-child { border-bottom: none; }
.tl-item-title { font-size: .78rem; font-weight: 600; color: var(--text); line-height: 1.35; }
.tl-item-meta {
  display: flex; gap: 6px; flex-wrap: wrap; align-items: center;
  font-size: .67rem; color: var(--text-3);
}
.tl-empty {
  padding: 14px;
  font-size: .75rem; color: var(--text-3); font-style: italic;
  text-align: center;
}
.tl-note {
  font-size: .68rem; color: var(--text-3);
  text-align: center; padding: 6px 0 2px;
  font-style: italic;
  border-top: 1px solid var(--rule);
  margin-top: 4px;
}

/* ── شريط التقدم ─────────────────────────────────────── */
.pbar-wrap { display: flex; align-items: center; gap: 8px; }
.pbar-rail {
  flex: 1; height: 6px;
  background: var(--rule);
  border-radius: 3px; overflow: hidden;
}
.pbar-fill { height: 100%; border-radius: 3px; }
.pbar-label { font-size: .75rem; font-weight: 700; min-width: 30px; text-align: left; }

/* ── Badges / Chips ──────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 8px; border-radius: 4px;
  font-size: .68rem; font-weight: 600; white-space: nowrap;
}
.badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.b-green { background: var(--green-lt); color: var(--green); }
.b-green .badge-dot { background: var(--green); }
.b-blue  { background: var(--blue-lt);  color: var(--blue); }
.b-blue  .badge-dot { background: var(--blue); }
.b-red   { background: var(--red-lt);   color: var(--red); }
.b-red   .badge-dot { background: var(--red); }
.b-amber { background: var(--amber-lt); color: var(--amber); }
.b-gray  { background: #F0F2F5; color: var(--text-3); }

.t-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 4px;
  font-size: .68rem; font-weight: 700; white-space: nowrap;
}
.chip-green { background: var(--green-lt); color: var(--green); }
.chip-amber { background: var(--amber-lt); color: var(--amber); }
.chip-red   { background: var(--red-lt);   color: var(--red); }
.chip-gray  { background: #F0F2F5; color: var(--text-3); }

/* ── سجل المخاطر ─────────────────────────────────────── */
.risk-table { width:100%; border-collapse:collapse; font-size:.77rem; }
.risk-table th {
  padding:7px 12px; text-align:right;
  font-weight:600; font-size:.71rem;
  color:rgba(255,255,255,.9);
  background: #5A1A1A;
  white-space:nowrap;
}
.risk-table td { padding:7px 12px; border-bottom:1px solid var(--rule); vertical-align:middle; }
.risk-table tbody tr:last-child td { border-bottom:none; }
.risk-table tbody tr:nth-child(even) td { background:#FFF8F8; }
.risk-sev {
  display:inline-block; width:10px; height:10px;
  border-radius:50%; flex-shrink:0;
}

/* ── سجل القرارات ────────────────────────────────────── */
.dec-row {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--rule);
  padding: 10px 0;
}
.dec-row:last-child { border-bottom: none; }
.dec-num {
  width: 28px; flex-shrink: 0;
  font-size: .75rem; font-weight: 700;
  color: var(--text-3); padding-top: 1px;
}
.dec-body { flex: 1; }
.dec-title { font-size: .82rem; font-weight: 700; color: var(--text); margin-bottom: 4px; }
.dec-meta {
  display: flex; gap: 10px; flex-wrap: wrap;
  font-size: .68rem; color: var(--text-3);
  align-items: center;
}

/* ── الملخص التنفيذي ─────────────────────────────────── */
.exec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
.exec-cell {
  padding: 11px 14px;
  border-radius: 6px;
  background: var(--off-white);
  border: 1px solid var(--rule);
}
.exec-label { font-size: .67rem; font-weight: 600; color: var(--text-3); margin-bottom: 3px; letter-spacing:.3px; text-transform:uppercase; }
.exec-val { font-size: .83rem; font-weight: 600; color: var(--text); line-height: 1.4; }

/* ── حالات فارغة ─────────────────────────────────────── */
.empty-row {
  padding: 14px 0; text-align: center;
  font-size: .78rem; color: var(--text-3); font-style: italic;
}

/* ── فاصل قسمي ───────────────────────────────────────── */
.divider { height: 1px; background: var(--rule); margin: 4px 0 14px; }

/* ── تذييل ───────────────────────────────────────────── */
.report-footer {
  margin-top: 16px;
  padding: 14px 20px;
  border-top: 1px solid var(--rule);
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 8px;
}
.footer-brand { font-size: .75rem; font-weight: 700; color: var(--navy); }
.footer-meta  { font-size: .7rem; color: var(--text-3); display: flex; gap: 14px; }
.footer-conf  { font-size: .68rem; color: var(--text-3); font-style: italic; }

/* ── رسائل الحالة للتواريخ ───────────────────────────── */
.info-pill {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: .68rem; color: var(--text-3);
  background: var(--off-white); border: 1px solid var(--rule);
  padding: 3px 10px; border-radius: 20px; margin-top: 6px;
}

@media(max-width:700px){
  .tracks-grid, .tl-grid, .exec-grid { grid-template-columns: 1fr; }
  .cover-title { font-size: 1.3rem; }
  .kpi-strip { grid-template-columns: repeat(3,1fr); }
}
`;

// ════════════════════════════════════════════════════════════
// مكونات مشتركة
// ════════════════════════════════════════════════════════════
function topBar(title){
  return `<div class="topbar no-print">
    <div class="topbar-brand">
      <div class="topbar-logo">ح</div>
      <span class="topbar-name">حدائق الملك عبدالله &nbsp;·&nbsp; <span>${title}</span></span>
    </div>
    <div class="topbar-actions">
      <button class="btn-export" onclick="window.print()">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 6H3a2 2 0 0 0-2 2v4h3v3h8v-3h3V8a2 2 0 0 0-2-2zm-3 7H6v-3h4v3zm3-6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM12 1H4v4h8V1z" fill="currentColor"/>
        </svg>
        تصدير PDF / طباعة
      </button>
      <button class="btn-close" onclick="window.close()">✕</button>
    </div>
  </div>`;
}

function reportFooter(base, type){
  return `<div class="report-footer">
    <span class="footer-brand">مشروع افتتاح حدائق الملك عبدالله العالمية</span>
    <span class="footer-meta">
      <span>${todayAr(base)}</span>
      <span>الأسبوع ${weekNum(base)}</span>
    </span>
    <span class="footer-conf">سري — للاستخدام الداخلي فقط</span>
  </div>`;
}

function htmlShell(pageTitle, bodyHTML, base){
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${pageTitle}</title>
  <style>${CSS}</style>
</head>
<body>
${topBar(pageTitle)}
<div class="report-wrap">
${bodyHTML}
${reportFooter(base)}
</div>
</body>
</html>`;
}

// ── جدول الجدول الزمني ──────────────────────────────────────
function tlRows(arr, showTrack){
  if(!arr.length) return `<div class="tl-empty">لا توجد بنود مجدولة</div>`;
  return arr.map(i=>`
    <div class="tl-item">
      <div class="tl-item-title">${i.title||"—"}</div>
      <div class="tl-item-meta">
        ${showTrack&&i.track?`<span>📌 ${TRACK_NAMES[i.track]||i.track}</span>`:""}
        ${i.owner?`<span>👤 ${i.owner}</span>`:""}
        ${i.due?`<span>📅 ${fmtDate(i.due)}</span>`:""}
        ${statusBadge(i.status)}
      </div>
    </div>`).join("");
}

// ── جدول مهام ──────────────────────────────────────────────
function taskTable(tasks, showTrack){
  if(!tasks.length) return `<div class="empty-row">✅ لا توجد بنود لعرضها</div>`;
  return `<table class="data-table">
    <thead><tr>
      ${showTrack?`<th>المسار</th>`:""}
      <th>المهمة / البند</th>
      <th>المسؤول</th>
      <th>الموعد</th>
      <th>الحالة</th>
    </tr></thead>
    <tbody>
      ${tasks.map((t,idx)=>`
      <tr>
        ${showTrack?`<td class="col-meta">${TRACK_NAMES[t.track]||t.track||"—"}</td>`:""}
        <td class="col-title">${t.title||"—"}</td>
        <td class="col-meta">${t.owner||"—"}</td>
        <td class="col-date">${fmtDate(t.due)}</td>
        <td>${statusBadge(t.status)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

// ── جدول المخاطر ────────────────────────────────────────────
function riskTable(risks){
  if(!risks.length) return `<div class="empty-row">✅ لا توجد مخاطر مفتوحة حالياً</div>`;
  return `<table class="risk-table">
    <thead><tr>
      <th>#</th>
      <th>المخاطرة / القضية</th>
      <th>المسار</th>
      <th>المسؤول</th>
      <th>الموعد</th>
      <th>الحالة</th>
    </tr></thead>
    <tbody>
      ${risks.map((r,i)=>`
      <tr>
        <td style="color:var(--text-3);font-weight:700">${i+1}</td>
        <td style="font-weight:600">${r.title||"—"}</td>
        <td style="color:var(--text-2)">${TRACK_NAMES[r.track]||r.track||"—"}</td>
        <td style="color:var(--text-2)">${r.owner||"—"}</td>
        <td style="color:var(--text-3);font-size:.7rem">${fmtDate(r.due)}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

// ── قرارات ─────────────────────────────────────────────────
function decisionList(decisions){
  if(!decisions.length) return `<div class="empty-row">✅ لا توجد قرارات مطلوبة</div>`;
  return decisions.map((d,i)=>`
    <div class="dec-row">
      <div class="dec-num">${i+1}</div>
      <div class="dec-body">
        <div class="dec-title">${d.title||"—"}</div>
        <div class="dec-meta">
          ${TRACK_NAMES[d.track]?`<span>📌 ${TRACK_NAMES[d.track]}</span>`:""}
          ${d.owner?`<span>👤 ${d.owner}</span>`:""}
          ${d.due?`<span>📅 ${fmtDate(d.due)}</span>`:""}
          ${statusBadge(d.status)}
        </div>
      </div>
    </div>`).join("");
}

// ════════════════════════════════════════════════════════════
// التقرير الشامل
// ════════════════════════════════════════════════════════════
function buildComprehensive(state, reportDate){
  const buckets   = getDateBuckets(reportDate);
  const tracks    = state.tracks   || [];
  const items     = state.items    || [];
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد");

  const tasks   = items.filter(i=>!isRiskItem(i));
  const risks   = items.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const totDone = tasks.filter(i=>isDone(i.status)).length;
  const totAct  = tasks.filter(i=>isActive(i.status)).length;
  const totLate = tasks.filter(i=>isRiskS(i.status)).length;
  const ovr     = tracks.length
    ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;

  const {done:yd,active:td,next:tm,hasExactDates} = bucketItems(tasks,buckets);
  const criticals = tasks.filter(i=>isRiskS(i.status)).slice(0,15);

  // بطاقات المسارات
  const trackCards = tracks.map(t=>{
    const tc = TRACK_COLORS[t.id] || {bg:"#1A3A52",accent:"#C9A84C",light:"#EEF3F9"};
    const ti  = items.filter(i=>i.track===t.id);
    const tT  = ti.filter(i=>!isRiskItem(i));
    const tR  = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
    const tD  = tT.filter(i=>isDone(i.status)).length;
    const tA  = tT.filter(i=>isActive(i.status)).length;
    const tLt = tT.filter(i=>isRiskS(i.status)).length;
    return `<div class="track-card">
      <div class="track-head" style="background:${tc.bg}">
        <div class="track-letter">${t.id||""}</div>
        <div class="track-info">
          <div class="track-name">${t.name||TRACK_NAMES[t.id]||t.id}</div>
          <div class="track-focus">${t.focus||t.lead||"—"}</div>
        </div>
        ${trackStatusChip(t.status)}
      </div>
      <div class="track-body">
        ${progressBar(t.progress, tc.accent)}
        <div class="track-kpi-row">
          <div class="t-kpi"><div class="tv" style="color:var(--navy)">${tT.length}</div><div class="tl">إجمالي</div></div>
          <div class="t-kpi"><div class="tv" style="color:var(--green)">${tD}</div><div class="tl">منجزة</div></div>
          <div class="t-kpi"><div class="tv" style="color:var(--blue)">${tA}</div><div class="tl">جارية</div></div>
          <div class="t-kpi"><div class="tv" style="color:var(--red)">${tLt||tR.length}</div><div class="tl">حرجة</div></div>
        </div>
      </div>
    </div>`;
  }).join("");

  const tlNote = hasExactDates
    ? `بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `يعرض آخر البنود المنجزة والجارية والقادمة (لا توجد بنود مجدولة بتواريخ محددة)`;

  const body = `
  <!-- الغلاف -->
  <div class="cover">
    <div class="cover-inner">
      <div class="cover-eyebrow">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
      <h1 class="cover-title">التقرير <span class="accent">الشامل</span> اليومي</h1>
      <div class="cover-subtitle">نموذج تنفيذي — المسارات الأربعة · المخاطر · القرارات · الجدول الزمني</div>
      <div class="cover-rule"></div>
      <div class="cover-meta">
        <div class="cover-meta-cell">
          <span class="cover-meta-label">التاريخ</span>
          <span class="cover-meta-value">${todayAr(buckets.base)}</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">الأسبوع</span>
          <span class="cover-meta-value">الأسبوع ${weekNum(buckets.base)}</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">نسبة الإنجاز</span>
          <span class="cover-meta-value gold">${ovr}%</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">المهام الكلية</span>
          <span class="cover-meta-value">${tasks.length}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- مؤشرات الأداء -->
  <div class="kpi-strip">
    <div class="kpi-card k-total"><div class="kpi-num">${tasks.length}</div><div class="kpi-label">إجمالي المهام</div></div>
    <div class="kpi-card k-done"> <div class="kpi-num">${totDone}</div><div class="kpi-label">مكتملة</div></div>
    <div class="kpi-card k-active"><div class="kpi-num">${totAct}</div><div class="kpi-label">قيد التنفيذ</div></div>
    <div class="kpi-card k-late"><div class="kpi-num">${totLate}</div><div class="kpi-label">متأخرة</div></div>
    <div class="kpi-card k-pct"> <div class="kpi-num">${ovr}%</div><div class="kpi-label">نسبة الإنجاز</div></div>
    <div class="kpi-card k-risk"><div class="kpi-num">${risks.length}</div><div class="kpi-label">مخاطر مفتوحة</div></div>
  </div>

  <!-- المسارات الأربعة -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:#EEF3F9">🗂</div>
      <h2 class="section-title">حالة المسارات الأربعة</h2>
      <span class="section-count">${tracks.length} مسارات</span>
    </div>
    <div class="section-body">
      <div class="tracks-grid">${trackCards}</div>
    </div>
  </div>

  <!-- الجدول الزمني -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:#E8F0FA">📅</div>
      <h2 class="section-title">الجدول الزمني اليومي</h2>
    </div>
    <div class="section-body-tight">
      <div class="tl-grid">
        <div class="tl-col">
          <div class="tl-head" style="background:var(--green-lt);color:var(--green)">
            <span>✓</span> أمس &nbsp;—&nbsp; ${fmtDate(buckets.yesterday)}
          </div>
          <div class="tl-body">${tlRows(yd,true)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--gold-lt);color:var(--gold-dim)">
            <span>⟳</span> اليوم &nbsp;—&nbsp; ${fmtDate(buckets.today)}
          </div>
          <div class="tl-body">${tlRows(td,true)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--blue-lt);color:var(--blue)">
            <span>○</span> غداً &nbsp;—&nbsp; ${fmtDate(buckets.tomorrow)}
          </div>
          <div class="tl-body">${tlRows(tm,true)}</div>
        </div>
      </div>
      <div class="info-pill">ℹ ${tlNote}</div>
    </div>
  </div>

  <!-- البنود الحرجة -->
  ${criticals.length ? `
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--red-lt)">🔴</div>
      <h2 class="section-title">البنود الحرجة والمتأخرة</h2>
      <span class="section-count">${criticals.length}</span>
    </div>
    <div class="section-body-tight">${taskTable(criticals,true)}</div>
  </div>` : ""}

  <!-- سجل المخاطر -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--red-lt)">⚠️</div>
      <h2 class="section-title">سجل المخاطر والقضايا المفتوحة</h2>
      <span class="section-count">${risks.length}</span>
    </div>
    <div class="section-body-tight">${riskTable(risks)}</div>
  </div>

  <!-- القرارات -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--amber-lt)">⚖️</div>
      <h2 class="section-title">القرارات المطلوبة</h2>
      <span class="section-count">${decisions.length}</span>
    </div>
    <div class="section-body">${decisionList(decisions)}</div>
  </div>`;

  return htmlShell("التقرير الشامل اليومي", body, buckets.base);
}

// ════════════════════════════════════════════════════════════
// تقرير مسار
// ════════════════════════════════════════════════════════════
function buildTrack(state, tid, reportDate){
  const buckets   = getDateBuckets(reportDate);
  const tracks    = state.tracks   || [];
  const items     = state.items    || [];
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد"&&(d.track===tid||!d.track));
  const logs      = (state.dailyLogs||[]).filter(l=>l.track===tid);
  const latestLog = logs[0] || null;

  const track = tracks.find(t=>t.id===tid||t.track===tid) ||
    {id:tid,name:TRACK_NAMES[tid],progress:0,status:"—",lead:"—",focus:"—"};
  const tc  = TRACK_COLORS[tid] || {bg:"#1A3A52",accent:"#C9A84C",light:"#EEF3F9"};
  const nm  = track.name || TRACK_NAMES[tid] || tid;
  const pct = track.progress || 0;

  const ti      = items.filter(i=>i.track===tid);
  const tT      = ti.filter(i=>!isRiskItem(i));
  const tR      = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const tDone   = tT.filter(i=>isDone(i.status)).length;
  const tActive = tT.filter(i=>isActive(i.status)).length;
  const tLate   = tT.filter(i=>isRiskS(i.status)).length;

  const {done:yd,active:td,next:tm,hasExactDates} = bucketItems(tT,buckets);
  const activeTasks = tT.filter(i=>isActive(i.status)||isRiskS(i.status)).slice(0,20);
  const tlNote = hasExactDates
    ? `بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `يعرض آخر البنود المنجزة والجارية والقادمة`;

  const execGrid = latestLog ? `
    <div class="exec-grid">
      <div class="exec-cell"><div class="exec-label">المنجز</div><div class="exec-val">${latestLog.done||"—"}</div></div>
      <div class="exec-cell"><div class="exec-label">المتأخر</div><div class="exec-val">${latestLog.delayed||"—"}</div></div>
      <div class="exec-cell"><div class="exec-label">المخاطر</div><div class="exec-val">${latestLog.risks||"—"}</div></div>
      <div class="exec-cell"><div class="exec-label">القرار المطلوب</div><div class="exec-val">${latestLog.decision||"—"}</div></div>
    </div>` : "";

  const body = `
  <!-- الغلاف -->
  <div class="cover">
    <div class="cover-inner">
      <div class="cover-eyebrow">مشروع افتتاح حدائق الملك عبدالله العالمية · التقرير اليومي</div>
      <h1 class="cover-title"><span class="accent">مسار ${tid}</span> · ${nm}</h1>
      <div class="cover-subtitle">${track.focus||""} ${track.lead?`· مدير المسار: ${track.lead}`:""}</div>
      <div class="cover-rule" style="background:${tc.accent}"></div>
      <div class="cover-meta">
        <div class="cover-meta-cell">
          <span class="cover-meta-label">التاريخ</span>
          <span class="cover-meta-value">${todayAr(buckets.base)}</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">الحالة</span>
          <span class="cover-meta-value">${track.status||"—"}</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">نسبة الإنجاز</span>
          <span class="cover-meta-value gold">${pct}%</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">إجمالي المهام</span>
          <span class="cover-meta-value">${tT.length}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-strip">
    <div class="kpi-card k-total"><div class="kpi-num">${tT.length}</div><div class="kpi-label">إجمالي المهام</div></div>
    <div class="kpi-card k-done"><div class="kpi-num">${tDone}</div><div class="kpi-label">مكتملة</div></div>
    <div class="kpi-card k-active"><div class="kpi-num">${tActive}</div><div class="kpi-label">قيد التنفيذ</div></div>
    <div class="kpi-card k-late"><div class="kpi-num">${tLate}</div><div class="kpi-label">متأخرة</div></div>
    <div class="kpi-card k-pct"><div class="kpi-num">${pct}%</div><div class="kpi-label">نسبة الإنجاز</div></div>
    <div class="kpi-card k-risk"><div class="kpi-num">${tR.length}</div><div class="kpi-label">مخاطر مفتوحة</div></div>
  </div>

  <!-- الوضع التنفيذي -->
  <div class="section">
    <div class="section-head" style="background:${tc.light}; border-bottom-color:${tc.accent}30">
      <div class="section-icon" style="background:${tc.accent}20">📊</div>
      <h2 class="section-title">الوضع التنفيذي للمسار</h2>
      ${trackStatusChip(track.status)}
    </div>
    <div class="section-body">
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:.82rem;font-weight:600;color:var(--text-2)">نسبة الإنجاز الإجمالية</span>
          <span style="font-weight:900;color:${tc.accent};font-size:.9rem">${pct}%</span>
        </div>
        <div class="pbar-rail" style="height:9px">
          <div class="pbar-fill" style="width:${pct}%;background:${tc.accent};height:9px"></div>
        </div>
      </div>
      ${execGrid}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:${execGrid?'0':'8px'}">
        <div style="padding:9px 8px;background:var(--green-lt);border-radius:7px;text-align:center">
          <div style="font-size:1.3rem;font-weight:900;color:var(--green)">${tDone}</div>
          <div style="font-size:.65rem;color:var(--green);margin-top:2px">مكتملة</div>
        </div>
        <div style="padding:9px 8px;background:var(--blue-lt);border-radius:7px;text-align:center">
          <div style="font-size:1.3rem;font-weight:900;color:var(--blue)">${tActive}</div>
          <div style="font-size:.65rem;color:var(--blue);margin-top:2px">جارية</div>
        </div>
        <div style="padding:9px 8px;background:var(--red-lt);border-radius:7px;text-align:center">
          <div style="font-size:1.3rem;font-weight:900;color:var(--red)">${tLate}</div>
          <div style="font-size:.65rem;color:var(--red);margin-top:2px">متأخرة</div>
        </div>
        <div style="padding:9px 8px;background:var(--amber-lt);border-radius:7px;text-align:center">
          <div style="font-size:1.3rem;font-weight:900;color:var(--amber)">${tR.length}</div>
          <div style="font-size:.65rem;color:var(--amber);margin-top:2px">مخاطر</div>
        </div>
      </div>
    </div>
  </div>

  <!-- الجدول الزمني -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--blue-lt)">📅</div>
      <h2 class="section-title">الجدول الزمني اليومي</h2>
    </div>
    <div class="section-body-tight">
      <div class="tl-grid">
        <div class="tl-col">
          <div class="tl-head" style="background:var(--green-lt);color:var(--green)">✓ أمس — ${fmtDate(buckets.yesterday)}</div>
          <div class="tl-body">${tlRows(yd,false)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:${tc.light};color:${tc.accent}">⟳ اليوم — ${fmtDate(buckets.today)}</div>
          <div class="tl-body">${tlRows(td,false)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--blue-lt);color:var(--blue)">○ غداً — ${fmtDate(buckets.tomorrow)}</div>
          <div class="tl-body">${tlRows(tm,false)}</div>
        </div>
      </div>
      <div class="info-pill">ℹ ${tlNote}</div>
    </div>
  </div>

  <!-- المهام الجارية والحرجة -->
  ${activeTasks.length ? `
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--blue-lt)">⟳</div>
      <h2 class="section-title">المهام الجارية والمتأخرة</h2>
      <span class="section-count">${activeTasks.length}</span>
    </div>
    <div class="section-body-tight">${taskTable(activeTasks,false)}</div>
  </div>` : ""}

  <!-- المخاطر -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--red-lt)">⚠️</div>
      <h2 class="section-title">سجل المخاطر والقضايا</h2>
      <span class="section-count">${tR.length}</span>
    </div>
    <div class="section-body-tight">${riskTable(tR)}</div>
  </div>

  <!-- القرارات -->
  <div class="section">
    <div class="section-head">
      <div class="section-icon" style="background:var(--amber-lt)">⚖️</div>
      <h2 class="section-title">القرارات المطلوبة</h2>
      <span class="section-count">${decisions.length}</span>
    </div>
    <div class="section-body">${decisionList(decisions)}</div>
  </div>`;

  return htmlShell(`تقرير مسار ${tid}: ${nm}`, body, buckets.base);
}

// ─── الدالة الرئيسية ─────────────────────────────────────────
async function generateReport(type, state){
  const reportDate = state.reportDate || null;
  let html;
  if(type==="comprehensive") html = buildComprehensive(state, reportDate);
  else if(["أ","ب","ج","د"].includes(type)) html = buildTrack(state, type, reportDate);
  else throw new Error("نوع تقرير غير معروف: "+type);
  return Buffer.from(html, "utf-8");
}

module.exports = { generateReport };
