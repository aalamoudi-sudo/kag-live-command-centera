"use strict";
/**
 * report-generator.js — v6 Executive Edition
 * تصميم حكومي رسمي راقٍ: كحلي عميق / ذهبي / أبيض
 * مناسب للعرض أمام القيادة والجهات الرسمية — PDF جاهز
 */

// ─── ثوابت ───────────────────────────────────────────────────
const TRACK_NAMES = {
  "أ":"التخطيط والتنسيق",
  "ب":"الإعلام والتغطية",
  "ج":"الحفل الرسمي وفعالياته المصاحبة",
  "د":"تجهيز وتفعيل الحديقة"
};
const TRACK_COLORS = {
  "أ":{ bg:"#0E2A45", accent:"#C9A84C", light:"#EDF2F8", bar:"#1B4B7A" },
  "ب":{ bg:"#1E1045", accent:"#9B7FD4", light:"#F0ECFA", bar:"#3D2080" },
  "ج":{ bg:"#2E1500", accent:"#D4872A", light:"#FBF3E8", bar:"#6B3300" },
  "د":{ bg:"#062820", accent:"#2BAE99", light:"#E6F6F4", bar:"#0D5447" }
};
const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];

const isDone     = s => DONE_SET.includes(s);
const isActive   = s => ACTIVE_SET.includes(s);
const isRiskS    = s => RISK_SET.includes(s);
const isRiskItem = i => ["risks","مخاطرة","مخاطر"].includes(i.type);

function fmtDate(s){
  if(!s) return "—";
  try{ const d=new Date(s); return isNaN(d)?s:d.toLocaleDateString("ar-SA",{year:"numeric",month:"2-digit",day:"2-digit"}); }
  catch{ return s; }
}
function todayAr(base){
  return (base||new Date()).toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function weekNum(base){
  const d=base?new Date(base):new Date();
  d.setHours(0,0,0,0); d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d-new Date(d.getFullYear(),0,4))/(7*86400000))+1;
}
function getDateBuckets(reportDate){
  const base=reportDate?new Date(reportDate):new Date();
  base.setHours(0,0,0,0);
  const d=n=>{const x=new Date(base);x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);};
  return{yesterday:d(-1),today:d(0),tomorrow:d(1),base};
}
function bucketItems(items,buckets){
  const{yesterday,today,tomorrow}=buckets;
  const yd=[],td=[],tm=[];
  items.forEach(i=>{
    const due=i.due?String(i.due).slice(0,10):null;
    if(due===yesterday)yd.push(i);
    else if(due===today)td.push(i);
    else if(due===tomorrow)tm.push(i);
  });
  const done  =yd.length?yd:items.filter(i=>isDone(i.status)).slice(0,8);
  const active=td.length?td:items.filter(i=>isActive(i.status)).slice(0,8);
  const next  =tm.length?tm:items.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due)
                              .sort((a,b)=>a.due>b.due?1:-1).slice(0,8);
  return{done,active,next,hasExactDates:yd.length>0||td.length>0||tm.length>0};
}

// ─── CSS الرئيسي ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --navy:      #0B1F35;
  --navy-mid:  #142D48;
  --navy-lt:   #1C3D5E;
  --gold:      #C9A84C;
  --gold-lt:   #F5EDD6;
  --gold-dim:  #8A6E2A;
  --white:     #FFFFFF;
  --off-white: #F7F9FC;
  --rule:      #D8DFE8;
  --text:      #0E1F2E;
  --text-2:    #3A4D60;
  --text-3:    #7A8C9E;
  --green:     #166534;
  --green-lt:  #DCFCE7;
  --red:       #991B1B;
  --red-lt:    #FEE2E2;
  --amber:     #92400E;
  --amber-lt:  #FEF3C7;
  --blue:      #1E40AF;
  --blue-lt:   #DBEAFE;
  --shadow:    0 1px 4px rgba(0,0,0,.07), 0 4px 16px rgba(0,0,0,.05);
}

html { font-size: 13px; }
body {
  font-family: 'Tajawal', 'Arial', sans-serif;
  direction: rtl;
  background: var(--off-white);
  color: var(--text);
  line-height: 1.65;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/* ──────── طباعة / PDF ──────── */
@media print {
  .no-print { display: none !important; }
  body { background: #fff; font-size: 10pt; }
  .page-wrap { padding: 0; max-width: 100%; }
  .cover { border-radius: 0 !important; page-break-after: always; }
  .section { box-shadow: none !important; border: 1px solid #D0D7E0 !important;
             break-inside: avoid; margin-bottom: 12pt !important; }
  .page-break { page-break-before: always; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  @page { margin: 14mm 18mm; size: A4 portrait; }
}

/* ──────── شريط الأدوات ──────── */
.topbar {
  position: fixed; top: 0; right: 0; left: 0; z-index: 999;
  height: 50px; background: var(--navy);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 28px;
  border-bottom: 2px solid var(--gold);
  box-shadow: 0 2px 16px rgba(0,0,0,.3);
}
.topbar-brand { display: flex; align-items: center; gap: 12px; }
.topbar-logo {
  width: 32px; height: 32px; background: var(--gold); border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 900; color: var(--navy);
}
.topbar-name { font-size: .82rem; font-weight: 700; color: rgba(255,255,255,.88); }
.topbar-name span { color: var(--gold); }
.topbar-actions { display: flex; gap: 8px; }
.btn-pdf {
  background: var(--gold); color: var(--navy); border: none;
  height: 34px; padding: 0 20px; border-radius: 6px;
  font-family: inherit; font-size: .82rem; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; gap: 6px;
  transition: opacity .15s;
}
.btn-pdf:hover { opacity: .85; }
.btn-close {
  background: transparent; color: rgba(255,255,255,.6);
  border: 1px solid rgba(255,255,255,.2);
  height: 34px; padding: 0 14px; border-radius: 6px;
  font-family: inherit; font-size: .8rem; cursor: pointer;
}

/* ──────── المحتوى ──────── */
.page-wrap { max-width: 900px; margin: 0 auto; padding: 68px 20px 40px; }

/* ──────── الغلاف ──────── */
.cover {
  background: var(--navy);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 24px;
  position: relative;
}
.cover-top-bar {
  height: 5px;
  background: linear-gradient(90deg, var(--gold) 0%, #e8c96a 50%, var(--gold) 100%);
}
.cover-inner { padding: 48px 52px 40px; }
.cover-logos {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 36px; padding-bottom: 24px;
  border-bottom: 1px solid rgba(255,255,255,.12);
}
.cover-logo-box {
  width: 52px; height: 52px; background: rgba(201,168,76,.15);
  border: 1px solid rgba(201,168,76,.35); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
}
.cover-org {
  flex: 1;
}
.cover-org-name {
  font-size: .95rem; font-weight: 700; color: rgba(255,255,255,.9);
  margin-bottom: 2px;
}
.cover-org-sub { font-size: .78rem; color: var(--gold); font-weight: 500; }
.cover-badge {
  background: rgba(201,168,76,.15); border: 1px solid rgba(201,168,76,.4);
  color: var(--gold); font-size: .72rem; font-weight: 700;
  padding: 4px 12px; border-radius: 20px; white-space: nowrap;
}
.cover-eyebrow {
  font-size: .78rem; font-weight: 600; color: var(--gold);
  letter-spacing: .6px; text-transform: uppercase; margin-bottom: 14px;
}
.cover-title {
  font-size: 2.1rem; font-weight: 900; color: #fff;
  line-height: 1.25; margin-bottom: 10px;
}
.cover-title .accent { color: var(--gold); }
.cover-subtitle {
  font-size: .9rem; color: rgba(255,255,255,.6);
  margin-bottom: 32px; font-weight: 400;
}
.cover-rule {
  height: 2px; background: var(--gold);
  width: 60px; margin-bottom: 28px; border-radius: 2px;
}
.cover-meta {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;
}
.cover-meta-cell {
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 8px; padding: 14px 16px;
}
.cover-meta-label {
  display: block; font-size: .68rem; color: rgba(255,255,255,.5);
  font-weight: 600; margin-bottom: 6px; letter-spacing: .3px;
}
.cover-meta-value {
  display: block; font-size: 1rem; font-weight: 700; color: #fff;
}
.cover-meta-value.gold { color: var(--gold); font-size: 1.15rem; }

/* ──────── شريط KPI ──────── */
.kpi-strip {
  display: grid; grid-template-columns: repeat(6, 1fr);
  gap: 10px; margin-bottom: 20px;
}
.kpi-card {
  background: var(--white); border-radius: 10px;
  padding: 14px 10px; text-align: center;
  border: 1px solid var(--rule);
  box-shadow: var(--shadow);
}
.kpi-num { font-size: 1.45rem; font-weight: 900; margin-bottom: 4px; }
.kpi-label { font-size: .65rem; color: var(--text-3); font-weight: 600; letter-spacing: .2px; }
.k-total .kpi-num { color: var(--navy); }
.k-done  .kpi-num { color: var(--green); }
.k-active .kpi-num { color: var(--blue); }
.k-late  .kpi-num { color: var(--red); }
.k-pct   .kpi-num { color: var(--gold-dim); }
.k-risk  .kpi-num { color: var(--amber); }

/* ──────── الأقسام ──────── */
.section {
  background: var(--white); border-radius: 10px;
  border: 1px solid var(--rule);
  box-shadow: var(--shadow); margin-bottom: 16px; overflow: hidden;
}
.section-head {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 1px solid var(--rule);
  background: var(--off-white);
}
.section-num {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--navy); color: #fff;
  font-size: .72rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.section-title { font-size: .92rem; font-weight: 800; color: var(--navy); flex: 1; }
.section-count {
  background: var(--navy); color: #fff;
  font-size: .68rem; font-weight: 700;
  padding: 2px 9px; border-radius: 20px;
}
.section-body { padding: 18px 20px; }
.section-body-tight { padding: 0; }

/* ──────── بطاقات المسارات ──────── */
.tracks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.track-card { border-radius: 9px; overflow: hidden; border: 1px solid var(--rule); }
.track-head { padding: 16px 18px; display: flex; align-items: center; gap: 12px; }
.track-letter {
  width: 38px; height: 38px; border-radius: 8px;
  background: rgba(255,255,255,.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; font-weight: 900; color: #fff; flex-shrink: 0;
}
.track-info { flex: 1; }
.track-name { font-size: .85rem; font-weight: 800; color: #fff; }
.track-focus { font-size: .68rem; color: rgba(255,255,255,.6); margin-top: 2px; }
.track-body { padding: 14px 18px; }

.t-chip {
  font-size: .68rem; font-weight: 700; padding: 3px 10px;
  border-radius: 20px; white-space: nowrap; flex-shrink: 0;
}
.chip-green { background: var(--green-lt); color: var(--green); }
.chip-amber { background: var(--amber-lt); color: var(--amber); }
.chip-red   { background: var(--red-lt);   color: var(--red);   }
.chip-gray  { background: #F1F3F5; color: var(--text-3); }

.pbar-rail { background: #E5EAF0; border-radius: 99px; height: 7px; overflow: hidden; margin-bottom: 12px; }
.pbar-fill { height: 100%; border-radius: 99px; transition: width .3s; }

.track-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
.ts-box { text-align: center; padding: 8px 4px; border-radius: 6px; }
.ts-num { font-size: 1.1rem; font-weight: 900; }
.ts-lbl { font-size: .6rem; font-weight: 600; margin-top: 2px; }

/* ──────── جدول البيانات ──────── */
.data-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
.data-table thead tr { background: var(--navy); }
.data-table thead th {
  color: #fff; font-weight: 700; padding: 10px 12px;
  text-align: right; font-size: .72rem; letter-spacing: .2px;
  white-space: nowrap;
}
.data-table tbody tr { border-bottom: 1px solid var(--rule); }
.data-table tbody tr:last-child { border-bottom: none; }
.data-table tbody tr:nth-child(even) { background: #FAFBFC; }
.data-table tbody tr:hover { background: #F0F4FA; }
.data-table td { padding: 9px 12px; color: var(--text); vertical-align: middle; }
.col-title { font-weight: 600; max-width: 260px; }
.col-meta  { color: var(--text-2); font-size: .72rem; white-space: nowrap; }
.col-date  { color: var(--text-3); font-size: .72rem; white-space: nowrap; }

/* ──────── جدول المخاطر ──────── */
.risk-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
.risk-table thead tr { background: #7F1D1D; }
.risk-table thead th { color: #fff; font-weight: 700; padding: 10px 12px; text-align: right; font-size: .72rem; }
.risk-table tbody tr { border-bottom: 1px solid #FEE2E2; }
.risk-table tbody tr:last-child { border-bottom: none; }
.risk-table tbody tr:nth-child(even) { background: #FFF5F5; }
.risk-table td { padding: 9px 12px; vertical-align: middle; }

/* ──────── الجدول الزمني ──────── */
.tl-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; }
.tl-col { border-left: 1px solid var(--rule); }
.tl-col:last-child { border-left: none; }
.tl-head {
  padding: 10px 14px; font-size: .75rem; font-weight: 800;
  display: flex; align-items: center; gap: 6px;
  border-bottom: 1px solid var(--rule);
}
.tl-body { padding: 10px 12px; min-height: 60px; }
.tl-item { padding: 7px 8px; border-bottom: 1px solid #F0F2F5; }
.tl-item:last-child { border-bottom: none; }
.tl-item-title { font-size: .75rem; font-weight: 600; color: var(--text); margin-bottom: 4px; }
.tl-item-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.tl-item-meta span { font-size: .64rem; color: var(--text-3); }
.tl-empty { padding: 14px 12px; color: var(--text-3); font-size: .75rem; font-style: italic; }

/* ──────── Badges ──────── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .65rem; font-weight: 700; padding: 2px 8px; border-radius: 20px;
  white-space: nowrap;
}
.badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.b-green { background: var(--green-lt); color: var(--green); }
.b-green .badge-dot { background: var(--green); }
.b-blue  { background: var(--blue-lt);  color: var(--blue);  }
.b-blue  .badge-dot { background: var(--blue); }
.b-red   { background: var(--red-lt);   color: var(--red);   }
.b-red   .badge-dot { background: var(--red); }
.b-amber { background: var(--amber-lt); color: var(--amber); }
.b-amber .badge-dot { background: var(--amber); }
.b-gray  { background: #F1F3F5;         color: var(--text-3); }

/* ──────── القرارات ──────── */
.dec-row {
  display: flex; gap: 14px; padding: 12px 0;
  border-bottom: 1px solid var(--rule);
}
.dec-row:last-child { border-bottom: none; }
.dec-num {
  width: 26px; height: 26px; border-radius: 50%;
  background: var(--amber-lt); color: var(--amber);
  font-size: .72rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  margin-top: 2px;
}
.dec-title { font-size: .82rem; font-weight: 700; color: var(--text); margin-bottom: 5px; }
.dec-meta { display: flex; flex-wrap: wrap; gap: 8px; }
.dec-meta span { font-size: .7rem; color: var(--text-3); }

/* ──────── التذييل ──────── */
.report-footer {
  margin-top: 28px; padding: 16px 20px;
  border-top: 2px solid var(--rule);
  display: flex; justify-content: space-between; align-items: center;
}
.footer-brand { font-size: .72rem; font-weight: 700; color: var(--text-2); }
.footer-brand span { color: var(--gold-dim); }
.footer-meta { display: flex; gap: 16px; }
.footer-meta span { font-size: .68rem; color: var(--text-3); }
.footer-conf { font-size: .68rem; color: var(--red); font-weight: 700; }

/* ──────── معلومة ──────── */
.info-pill {
  margin: 10px 14px 12px; padding: 8px 12px;
  background: var(--blue-lt); color: var(--blue);
  border-radius: 6px; font-size: .72rem; font-weight: 600;
}
.empty-row { padding: 18px 20px; color: var(--text-3); font-size: .8rem; font-style: italic; }

/* ──────── شريط تقدم المشروع ──────── */
.project-progress-bar {
  background: var(--off-white); border: 1px solid var(--rule);
  border-radius: 10px; padding: 16px 20px; margin-bottom: 16px;
}
.ppb-header { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; }
.ppb-title { font-size: .82rem; font-weight: 700; color: var(--navy); }
.ppb-pct { font-size: 1.1rem; font-weight: 900; color: var(--gold-dim); }
.ppb-labels { display: flex; justify-content: space-between; margin-bottom: 4px; }
.ppb-labels span { font-size: .65rem; color: var(--text-3); }
.ppb-tracks { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-top: 12px; }
.ppb-track { }
.ppb-track-name { font-size: .65rem; color: var(--text-2); margin-bottom: 4px; font-weight: 600; }
.ppb-track-bar { background: #E5EAF0; border-radius: 99px; height: 6px; overflow: hidden; }
.ppb-track-fill { height: 100%; border-radius: 99px; }
.ppb-track-pct { font-size: .65rem; color: var(--text-3); margin-top: 3px; }
`;

// ─── مكونات مشتركة ───────────────────────────────────────────
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
  if(s==="يحتاج تدخل")  return `<span class="t-chip chip-red">⚠ يحتاج تدخل</span>`;
  if(s==="معرض للخطر")  return `<span class="t-chip chip-red">⚠ معرض للخطر</span>`;
  if(s==="حرج")         return `<span class="t-chip chip-red">🔴 حرج</span>`;
  return `<span class="t-chip chip-gray">${s||"—"}</span>`;
}
function progressBar(pct, color){
  return `<div class="pbar-rail"><div class="pbar-fill" style="width:${Math.min(100,pct||0)}%;background:${color||"#C9A84C"}"></div></div>`;
}

function topBar(title){
  return `
<div class="topbar no-print">
  <div class="topbar-brand">
    <div class="topbar-logo">ك</div>
    <div class="topbar-name">حدائق الملك عبدالله · <span>${title}</span></div>
  </div>
  <div class="topbar-actions">
    <button class="btn-pdf" onclick="window.print()">⬇ تصدير PDF</button>
    <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
  </div>
</div>`;
}

function reportFooter(base){
  return `
<div class="report-footer no-print">
  <div class="footer-brand">مشروع <span>حدائق الملك عبدالله العالمية</span> · أمانة منطقة الرياض</div>
  <div class="footer-meta">
    <span>الأسبوع ${weekNum(base)}</span>
    <span>${todayAr(base)}</span>
  </div>
  <div class="footer-conf">سري — للاستخدام الداخلي فقط</div>
</div>`;
}

function coverLogos(){
  return `
  <div class="cover-logos">
    <div class="cover-logo-box">🌿</div>
    <div class="cover-org">
      <div class="cover-org-name">أمانة منطقة الرياض</div>
      <div class="cover-org-sub">مشروع حدائق الملك عبدالله العالمية</div>
    </div>
    <div class="cover-badge">PMC — غرفة عمليات</div>
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
<div class="page-wrap">
${bodyHTML}
${reportFooter(base)}
</div>
</body>
</html>`;
}

// ─── جداول البيانات ──────────────────────────────────────────
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
      ${tasks.map(t=>`
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

function riskTable(risks){
  if(!risks.length) return `<div class="empty-row">✅ لا توجد مخاطر مفتوحة حالياً</div>`;
  return `<table class="risk-table">
    <thead><tr>
      <th>#</th><th>المخاطرة / القضية</th><th>المسار</th>
      <th>المسؤول</th><th>الموعد</th><th>الحالة</th>
    </tr></thead>
    <tbody>
      ${risks.map((r,i)=>`
      <tr>
        <td style="color:var(--text-3);font-weight:700;font-size:.7rem">${i+1}</td>
        <td style="font-weight:600">${r.title||"—"}</td>
        <td style="color:var(--text-2);font-size:.72rem">${TRACK_NAMES[r.track]||r.track||"—"}</td>
        <td style="color:var(--text-2);font-size:.72rem">${r.owner||"—"}</td>
        <td style="color:var(--text-3);font-size:.7rem">${fmtDate(r.due)}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

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

  const tasks    = items.filter(i=>!isRiskItem(i));
  const risks    = items.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const totDone  = tasks.filter(i=>isDone(i.status)).length;
  const totAct   = tasks.filter(i=>isActive(i.status)).length;
  const totLate  = tasks.filter(i=>isRiskS(i.status)).length;
  const ovr      = tracks.length
    ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;

  const {done:yd,active:td,next:tm,hasExactDates} = bucketItems(tasks,buckets);
  const criticals = tasks.filter(i=>isRiskS(i.status)).slice(0,20);

  // بطاقات المسارات
  const trackCards = tracks.map(t=>{
    const tc = TRACK_COLORS[t.id]||{bg:"#0B1F35",accent:"#C9A84C",light:"#EDF2F8",bar:"#1C3D5E"};
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
          <div class="track-focus">${t.lead||"—"}</div>
        </div>
        ${trackStatusChip(t.status)}
      </div>
      <div class="track-body">
        ${progressBar(t.progress, tc.accent)}
        <div class="track-stats">
          <div class="ts-box" style="background:#EDF2F8">
            <div class="ts-num" style="color:var(--navy)">${tT.length}</div>
            <div class="ts-lbl" style="color:var(--text-2)">إجمالي</div>
          </div>
          <div class="ts-box" style="background:var(--green-lt)">
            <div class="ts-num" style="color:var(--green)">${tD}</div>
            <div class="ts-lbl" style="color:var(--green)">منجزة</div>
          </div>
          <div class="ts-box" style="background:var(--blue-lt)">
            <div class="ts-num" style="color:var(--blue)">${tA}</div>
            <div class="ts-lbl" style="color:var(--blue)">جارية</div>
          </div>
          <div class="ts-box" style="background:var(--red-lt)">
            <div class="ts-num" style="color:var(--red)">${tLt||tR.length}</div>
            <div class="ts-lbl" style="color:var(--red)">حرجة</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");

  // شريط تقدم المسارات
  const trackBarsHTML = tracks.map(t=>{
    const tc = TRACK_COLORS[t.id]||{accent:"#C9A84C"};
    return `<div class="ppb-track">
      <div class="ppb-track-name">${TRACK_NAMES[t.id]||t.id}</div>
      <div class="ppb-track-bar"><div class="ppb-track-fill" style="width:${t.progress||0}%;background:${tc.accent}"></div></div>
      <div class="ppb-track-pct">${t.progress||0}%</div>
    </div>`;
  }).join("");

  const tlNote = hasExactDates
    ? `بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `يعرض آخر البنود المنجزة والجارية والقادمة`;

  const body = `
  <!-- الغلاف -->
  <div class="cover">
    <div class="cover-top-bar"></div>
    <div class="cover-inner">
      ${coverLogos()}
      <div class="cover-eyebrow">التقرير التنفيذي اليومي</div>
      <h1 class="cover-title">التقرير <span class="accent">الشامل</span></h1>
      <div class="cover-subtitle">المسارات الأربعة · المخاطر · القرارات · الجدول الزمني</div>
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
          <span class="cover-meta-label">نسبة الإنجاز الكلية</span>
          <span class="cover-meta-value gold">${ovr}%</span>
        </div>
        <div class="cover-meta-cell">
          <span class="cover-meta-label">إجمالي المهام</span>
          <span class="cover-meta-value">${tasks.length}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- مؤشرات الأداء -->
  <div class="kpi-strip">
    <div class="kpi-card k-total"><div class="kpi-num">${tasks.length}</div><div class="kpi-label">إجمالي المهام</div></div>
    <div class="kpi-card k-done"><div class="kpi-num">${totDone}</div><div class="kpi-label">مكتملة</div></div>
    <div class="kpi-card k-active"><div class="kpi-num">${totAct}</div><div class="kpi-label">قيد التنفيذ</div></div>
    <div class="kpi-card k-late"><div class="kpi-num">${totLate}</div><div class="kpi-label">متأخرة</div></div>
    <div class="kpi-card k-pct"><div class="kpi-num">${ovr}%</div><div class="kpi-label">نسبة الإنجاز</div></div>
    <div class="kpi-card k-risk"><div class="kpi-num">${risks.length}</div><div class="kpi-label">مخاطر مفتوحة</div></div>
  </div>

  <!-- شريط تقدم المسارات -->
  <div class="project-progress-bar">
    <div class="ppb-header">
      <div class="ppb-title">تقدم المسارات الأربعة</div>
      <div class="ppb-pct">الإنجاز الكلي: ${ovr}%</div>
    </div>
    ${progressBar(ovr, "#C9A84C")}
    <div class="ppb-tracks">${trackBarsHTML}</div>
  </div>

  <!-- المسارات الأربعة -->
  <div class="section">
    <div class="section-head">
      <div class="section-num">١</div>
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
      <div class="section-num">٢</div>
      <h2 class="section-title">الجدول الزمني اليومي</h2>
    </div>
    <div class="section-body-tight">
      <div class="tl-grid">
        <div class="tl-col">
          <div class="tl-head" style="background:var(--green-lt);color:var(--green)">
            ✓ أمس — ${fmtDate(buckets.yesterday)}
          </div>
          <div class="tl-body">${tlRows(yd,true)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--gold-lt);color:var(--gold-dim)">
            ⟳ اليوم — ${fmtDate(buckets.today)}
          </div>
          <div class="tl-body">${tlRows(td,true)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--blue-lt);color:var(--blue)">
            ○ غداً — ${fmtDate(buckets.tomorrow)}
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
    <div class="section-head" style="background:#FFF5F5;border-bottom-color:#FEE2E2">
      <div class="section-num" style="background:var(--red)">٣</div>
      <h2 class="section-title" style="color:var(--red)">البنود الحرجة والمتأخرة</h2>
      <span class="section-count" style="background:var(--red)">${criticals.length}</span>
    </div>
    <div class="section-body-tight">${taskTable(criticals,true)}</div>
  </div>` : ""}

  <!-- سجل المخاطر -->
  <div class="section">
    <div class="section-head" style="background:#FFF5F5;border-bottom-color:#FEE2E2">
      <div class="section-num" style="background:var(--red)">${criticals.length?"٤":"٣"}</div>
      <h2 class="section-title">سجل المخاطر والقضايا المفتوحة</h2>
      <span class="section-count" style="background:var(--red)">${risks.length}</span>
    </div>
    <div class="section-body-tight">${riskTable(risks)}</div>
  </div>

  <!-- القرارات -->
  <div class="section">
    <div class="section-head" style="background:var(--amber-lt);border-bottom-color:#FDE68A">
      <div class="section-num" style="background:var(--amber)">${criticals.length?"٥":"٤"}</div>
      <h2 class="section-title">القرارات المطلوبة والإجراءات العاجلة</h2>
      <span class="section-count" style="background:var(--amber)">${decisions.length}</span>
    </div>
    <div class="section-body">${decisionList(decisions)}</div>
  </div>`;

  return htmlShell("التقرير الشامل اليومي — حدائق الملك عبدالله", body, buckets.base);
}

// ════════════════════════════════════════════════════════════
// تقرير المسار
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
  const tc  = TRACK_COLORS[tid]||{bg:"#0B1F35",accent:"#C9A84C",light:"#EDF2F8",bar:"#1C3D5E"};
  const nm  = track.name||TRACK_NAMES[tid]||tid;
  const pct = track.progress||0;

  const ti       = items.filter(i=>i.track===tid);
  const tT       = ti.filter(i=>!isRiskItem(i));
  const tR       = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const tDone    = tT.filter(i=>isDone(i.status)).length;
  const tActive  = tT.filter(i=>isActive(i.status)).length;
  const tLate    = tT.filter(i=>isRiskS(i.status)).length;

  const {done:yd,active:td,next:tm,hasExactDates} = bucketItems(tT,buckets);
  const activeTasks = tT.filter(i=>isActive(i.status)||isRiskS(i.status)).slice(0,20);
  const allTasks    = tT.slice(0,40);

  const execGrid = latestLog ? `
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:12px">
      <div style="background:var(--green-lt);border-radius:8px;padding:12px 14px">
        <div style="font-size:.68rem;font-weight:700;color:var(--green);margin-bottom:5px">المنجز</div>
        <div style="font-size:.8rem;color:var(--text)">${latestLog.done||"—"}</div>
      </div>
      <div style="background:var(--red-lt);border-radius:8px;padding:12px 14px">
        <div style="font-size:.68rem;font-weight:700;color:var(--red);margin-bottom:5px">المتأخر / العقبات</div>
        <div style="font-size:.8rem;color:var(--text)">${latestLog.delayed||"—"}</div>
      </div>
      <div style="background:var(--amber-lt);border-radius:8px;padding:12px 14px">
        <div style="font-size:.68rem;font-weight:700;color:var(--amber);margin-bottom:5px">المخاطر</div>
        <div style="font-size:.8rem;color:var(--text)">${latestLog.risks||"—"}</div>
      </div>
      <div style="background:var(--blue-lt);border-radius:8px;padding:12px 14px">
        <div style="font-size:.68rem;font-weight:700;color:var(--blue);margin-bottom:5px">القرار المطلوب</div>
        <div style="font-size:.8rem;color:var(--text)">${latestLog.decision||"—"}</div>
      </div>
    </div>` : "";

  const tlNote = hasExactDates
    ? `بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `يعرض آخر البنود المنجزة والجارية والقادمة`;

  const body = `
  <!-- الغلاف -->
  <div class="cover">
    <div class="cover-top-bar" style="background:linear-gradient(90deg,${tc.accent},${tc.bar},${tc.accent})"></div>
    <div class="cover-inner">
      ${coverLogos()}
      <div class="cover-eyebrow">التقرير التنفيذي اليومي · مسار ${tid}</div>
      <h1 class="cover-title"><span class="accent" style="color:${tc.accent}">${tid}</span> · ${nm}</h1>
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
          <span class="cover-meta-value gold" style="color:${tc.accent}">${pct}%</span>
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
    <div class="section-head" style="background:${tc.light};border-bottom-color:${tc.accent}30">
      <div class="section-num" style="background:${tc.bg}">١</div>
      <h2 class="section-title">الوضع التنفيذي للمسار</h2>
      ${trackStatusChip(track.status)}
    </div>
    <div class="section-body">
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;align-items:center">
          <span style="font-size:.8rem;font-weight:700;color:var(--text-2)">نسبة الإنجاز الإجمالية</span>
          <span style="font-weight:900;color:${tc.accent};font-size:1rem">${pct}%</span>
        </div>
        ${progressBar(pct, tc.accent)}
      </div>
      ${execGrid}
      <div class="track-stats" style="margin-top:${execGrid?'12px':'4px'}">
        <div class="ts-box" style="background:${tc.light}">
          <div class="ts-num" style="color:${tc.bg}">${tT.length}</div>
          <div class="ts-lbl" style="color:var(--text-2)">إجمالي</div>
        </div>
        <div class="ts-box" style="background:var(--green-lt)">
          <div class="ts-num" style="color:var(--green)">${tDone}</div>
          <div class="ts-lbl" style="color:var(--green)">مكتملة</div>
        </div>
        <div class="ts-box" style="background:var(--blue-lt)">
          <div class="ts-num" style="color:var(--blue)">${tActive}</div>
          <div class="ts-lbl" style="color:var(--blue)">جارية</div>
        </div>
        <div class="ts-box" style="background:var(--red-lt)">
          <div class="ts-num" style="color:var(--red)">${tLate||tR.length}</div>
          <div class="ts-lbl" style="color:var(--red)">حرجة</div>
        </div>
      </div>
    </div>
  </div>

  <!-- الجدول الزمني -->
  <div class="section">
    <div class="section-head">
      <div class="section-num" style="background:${tc.bg}">٢</div>
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
      <div class="section-num" style="background:${tc.bg}">٣</div>
      <h2 class="section-title">المهام الجارية والمتأخرة</h2>
      <span class="section-count" style="background:${tc.bg}">${activeTasks.length}</span>
    </div>
    <div class="section-body-tight">${taskTable(activeTasks,false)}</div>
  </div>` : ""}

  <!-- جميع المهام -->
  <div class="section">
    <div class="section-head">
      <div class="section-num" style="background:${tc.bg}">${activeTasks.length?"٤":"٣"}</div>
      <h2 class="section-title">سجل المهام الكامل</h2>
      <span class="section-count" style="background:${tc.bg}">${allTasks.length}</span>
    </div>
    <div class="section-body-tight">${taskTable(allTasks,false)}</div>
  </div>

  <!-- المخاطر -->
  <div class="section">
    <div class="section-head" style="background:#FFF5F5;border-bottom-color:#FEE2E2">
      <div class="section-num" style="background:var(--red)">${activeTasks.length?"٥":"٤"}</div>
      <h2 class="section-title">سجل المخاطر والقضايا</h2>
      <span class="section-count" style="background:var(--red)">${tR.length}</span>
    </div>
    <div class="section-body-tight">${riskTable(tR)}</div>
  </div>

  <!-- القرارات -->
  <div class="section">
    <div class="section-head" style="background:var(--amber-lt);border-bottom-color:#FDE68A">
      <div class="section-num" style="background:var(--amber)">${activeTasks.length?"٦":"٥"}</div>
      <h2 class="section-title">القرارات المطلوبة</h2>
      <span class="section-count" style="background:var(--amber)">${decisions.length}</span>
    </div>
    <div class="section-body">${decisionList(decisions)}</div>
  </div>`;

  return htmlShell(`تقرير مسار ${tid}: ${nm} — حدائق الملك عبدالله`, body, buckets.base);
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
