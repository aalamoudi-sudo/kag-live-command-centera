"use strict";
/**
 * report-generator.js — PDF-Ready HTML Reports v4
 * تقارير HTML احترافية قابلة للطباعة والتصدير كـ PDF
 * - PDF فقط — لا PPTX، لا Python، لا dependencies خارجية
 * - تصميم احترافي مناسب للعرض الرسمي والطباعة
 * - جداول محسّنة وتقليل الفراغات
 * - جميع البيانات مسحوبة مباشرة من liveState
 */

// ─── ثوابت ─────────────────────────────────────────────────
const TRACK_NAMES = {
  "أ":"التخطيط والتنسيق",
  "ب":"التواصل والتسويق",
  "ج":"الفعاليات والأنشطة المصاحبة",
  "د":"تجهيز وتفعيل الحديقة"
};
const TRACK_ACCENTS = {"أ":"#4F46E5","ب":"#7C3AED","ج":"#B45309","د":"#0F766E"};
const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];

const isDone   = s => DONE_SET.includes(s);
const isActive = s => ACTIVE_SET.includes(s);
const isRiskS  = s => RISK_SET.includes(s);
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
    const due = i.due?String(i.due).slice(0,10):null;
    if(due===yesterday) yd.push(i);
    else if(due===today) td.push(i);
    else if(due===tomorrow) tm.push(i);
  });
  const done   = yd.length?yd:items.filter(i=>isDone(i.status)).slice(0,8);
  const active = td.length?td:items.filter(i=>isActive(i.status)).slice(0,8);
  const next   = tm.length?tm:items.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due)
                                   .sort((a,b)=>a.due>b.due?1:-1).slice(0,8);
  return {done,active,next,hasExactDates:yd.length>0||td.length>0||tm.length>0};
}

function fmtDate(s){
  if(!s) return "—";
  try{ const d=new Date(s); return isNaN(d)?s:d.toLocaleDateString("ar-SA",{year:"numeric",month:"2-digit",day:"2-digit"}); }
  catch{ return s; }
}
function todayAr(base){
  return (base||new Date()).toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function weekNum(base){
  const d=base?new Date(base):new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d-new Date(d.getFullYear(),0,4))/(7*86400000))+1;
}

function badge(s){
  if(!s) return `<span class="b gray">—</span>`;
  if(isDone(s))   return `<span class="b green">✓ ${s}</span>`;
  if(isActive(s)) return `<span class="b yellow">${s}</span>`;
  if(isRiskS(s))  return `<span class="b red">⚠ ${s}</span>`;
  return `<span class="b gray">${s}</span>`;
}
function tBadge(s){
  if(s==="ضمن المسار")   return `<span class="b green">✓ ${s}</span>`;
  if(s==="تحت المتابعة") return `<span class="b yellow">${s}</span>`;
  if(s==="معرض للخطر")  return `<span class="b red">⚠ ${s}</span>`;
  return `<span class="b gray">${s||"—"}</span>`;
}
function pbar(pct,col){
  const p=Math.min(100,Math.max(0,pct||0)), c=col||"#4F46E5";
  return `<div class="pb-row"><div class="pb-track"><div class="pb-fill" style="width:${p}%;background:${c}"></div></div><span class="pb-num" style="color:${c}">${p}%</span></div>`;
}

// ─── CSS الاحترافي المحسّن ───────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#0B2A3B;--teal:#1A7A6E;--gold:#C49A2A;--green:#1E8C45;
  --red:#C0392B;--yellow:#D97706;--gray:#6B7280;
  --light:#F7F8FA;--border:#DDE1E7;--text:#1A2332;--text2:#4A5568;
  --white:#FFFFFF;--shadow:0 1px 4px rgba(0,0,0,.08)
}
html{font-size:13px}
body{font-family:'Tajawal',sans-serif;direction:rtl;background:var(--light);color:var(--text);line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}

/* ── طباعة / PDF ── */
@media print{
  .no-print{display:none!important}
  body{background:#fff;font-size:10.5px;margin:0}
  .page-wrap{padding:0}
  .card{box-shadow:none!important;border:1px solid #ccc!important;break-inside:avoid;margin-bottom:12px!important}
  .kpi-grid{grid-template-columns:repeat(6,1fr)!important}
  .track-grid{grid-template-columns:1fr 1fr!important}
  .tl-grid{grid-template-columns:1fr 1fr 1fr!important}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  @page{margin:12mm 15mm;size:A4}
  h1{font-size:1.5rem!important}
  .report-header{padding:20px 24px 18px!important}
}

/* ── شريط الأدوات ── */
.toolbar{
  position:fixed;top:0;right:0;left:0;z-index:999;
  background:var(--navy);display:flex;align-items:center;
  justify-content:space-between;padding:9px 20px;gap:12px;
  box-shadow:0 2px 10px rgba(0,0,0,.25)
}
.toolbar-title{font-size:.95rem;font-weight:700;color:var(--gold)}
.toolbar-actions{display:flex;gap:8px;align-items:center}
.btn-pdf{
  background:var(--gold);color:var(--navy);border:none;
  padding:7px 18px;border-radius:6px;font-family:inherit;
  font-size:.85rem;font-weight:700;cursor:pointer;
  display:flex;align-items:center;gap:5px;
  transition:opacity .2s
}
.btn-pdf:hover{opacity:.85}
.btn-close{
  background:rgba(255,255,255,.1);color:#fff;
  border:1px solid rgba(255,255,255,.2);
  padding:7px 13px;border-radius:6px;
  font-family:inherit;font-size:.85rem;cursor:pointer
}

/* ── لفافة الصفحة ── */
.page-wrap{max-width:1020px;margin:52px auto 32px;padding:0 16px}

/* ── رأس التقرير ── */
.report-header{
  background:linear-gradient(135deg,var(--navy) 0%,#0e3348 60%,#0a4a40 100%);
  color:#fff;border-radius:14px;padding:26px 32px 22px;
  margin-bottom:18px;position:relative;overflow:hidden
}
.report-header::before{
  content:'';position:absolute;left:-80px;bottom:-80px;
  width:300px;height:300px;border-radius:50%;
  background:radial-gradient(circle,rgba(196,154,42,.12) 0%,transparent 65%)
}
.rh-label{font-size:.75rem;color:rgba(255,255,255,.5);margin-bottom:4px;letter-spacing:.5px}
.rh-title{font-size:1.65rem;font-weight:900;color:var(--gold);margin-bottom:4px;line-height:1.2}
.rh-sub{color:rgba(255,255,255,.6);font-size:.8rem;margin-bottom:14px}
.rh-meta{display:flex;gap:24px;flex-wrap:wrap}
.rh-meta-item{display:flex;flex-direction:column;gap:1px}
.rh-meta-label{font-size:.68rem;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.4px}
.rh-meta-value{font-size:.85rem;font-weight:600;color:rgba(255,255,255,.88)}

/* ── KPI شبكة ── */
.kpi-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px}
@media(max-width:860px){.kpi-grid{grid-template-columns:repeat(3,1fr)}}
.kpi-card{
  background:var(--white);border-radius:10px;padding:13px 10px 11px;
  box-shadow:var(--shadow);border-top:3px solid var(--border);text-align:center
}
.kpi-val{font-size:1.9rem;font-weight:900;line-height:1;margin-bottom:3px}
.kpi-lbl{font-size:.68rem;color:var(--text2);line-height:1.3;font-weight:500}
.kpi-card.c-navy{border-top-color:var(--navy)}.kpi-card.c-navy .kpi-val{color:var(--navy)}
.kpi-card.c-green{border-top-color:var(--green)}.kpi-card.c-green .kpi-val{color:var(--green)}
.kpi-card.c-yellow{border-top-color:var(--yellow)}.kpi-card.c-yellow .kpi-val{color:var(--yellow)}
.kpi-card.c-red{border-top-color:var(--red)}.kpi-card.c-red .kpi-val{color:var(--red)}
.kpi-card.c-gold{border-top-color:var(--gold)}.kpi-card.c-gold .kpi-val{color:var(--gold)}
.kpi-card.c-teal{border-top-color:var(--teal)}.kpi-card.c-teal .kpi-val{color:var(--teal)}

/* ── بطاقة عامة ── */
.card{background:var(--white);border-radius:12px;box-shadow:var(--shadow);margin-bottom:14px;overflow:hidden}
.card-head{
  padding:11px 16px;display:flex;align-items:center;gap:8px;
  border-bottom:1px solid var(--border);background:var(--white)
}
.card-icon{font-size:.95rem}
.card-title{font-size:.88rem;font-weight:700;flex:1}
.card-body{padding:14px 16px}
.card-body-compact{padding:10px 16px}

/* ── المسارات ── */
.track-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.track-card{border-radius:10px;overflow:hidden;border:1px solid var(--border)}
.track-head{padding:11px 14px;display:flex;align-items:center;gap:8px}
.track-name{font-weight:700;font-size:.85rem;flex:1;color:#fff}
.track-body{padding:12px 14px;background:var(--white)}
.track-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.t-kpi{text-align:center;padding:6px 4px;background:var(--light);border-radius:7px}
.t-kpi .v{font-size:1.25rem;font-weight:900;line-height:1}
.t-kpi .l{font-size:.65rem;color:var(--gray);margin-top:2px}

/* ── جدول المهام ── */
.task-table{width:100%;border-collapse:collapse;font-size:.78rem}
.task-table th{
  background:var(--navy);color:#fff;padding:7px 10px;
  text-align:right;font-weight:600;font-size:.73rem;white-space:nowrap
}
.task-table td{padding:6px 10px;border-bottom:1px solid var(--border);vertical-align:top}
.task-table tr:last-child td{border-bottom:none}
.task-table tr:hover td{background:var(--light)}
.task-table tr:nth-child(even) td{background:#FAFBFC}
.task-table tr:nth-child(even):hover td{background:var(--light)}
.task-title-cell{font-weight:600;max-width:280px}
.task-owner-cell{color:var(--text2);white-space:nowrap}
.task-date-cell{color:var(--gray);white-space:nowrap;font-size:.72rem}

/* ── الجدول الزمني ── */
.tl-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.tl-col{border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.tl-head{padding:9px 13px;font-weight:700;font-size:.78rem;color:#fff}
.tl-body{padding:10px 13px;background:var(--light);flex:1}
.tl-item{padding:7px 0;border-bottom:1px dashed var(--border)}
.tl-item:last-child{border-bottom:none}
.tl-item-title{font-weight:600;font-size:.78rem;margin-bottom:2px;line-height:1.3}
.tl-item-meta{font-size:.68rem;color:var(--gray);display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-top:2px}
.tl-empty{color:var(--gray);font-size:.75rem;padding:4px 0;font-style:italic}
.tl-note{font-size:.7rem;color:var(--gray);text-align:center;padding:5px 0;margin-top:8px;border-top:1px solid var(--border);font-style:italic}

/* ── شريط التقدم ── */
.pb-row{display:flex;align-items:center;gap:8px}
.pb-track{flex:1;height:7px;background:var(--border);border-radius:4px;overflow:hidden}
.pb-fill{height:100%;border-radius:4px}
.pb-num{font-size:.78rem;font-weight:700;min-width:32px;text-align:left}

/* ── Badges ── */
.b{display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:14px;font-size:.68rem;font-weight:600;white-space:nowrap}
.b.green{background:#DCFCE7;color:#166534}
.b.yellow{background:#FEF3C7;color:#92400E}
.b.red{background:#FEE2E2;color:#991B1B}
.b.gray{background:#F3F4F6;color:#6B7280}

/* ── المخاطر ── */
.risk-row{display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid var(--border)}
.risk-row:last-child{border-bottom:none}
.risk-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:5px}
.risk-content{flex:1}
.risk-title{font-weight:600;font-size:.82rem;margin-bottom:2px}
.risk-meta{font-size:.7rem;color:var(--gray);display:flex;gap:8px;flex-wrap:wrap}

/* ── القرارات ── */
.dec-item{
  padding:9px 12px;border-radius:8px;
  border-right:3px solid var(--yellow);
  background:var(--light);margin-bottom:7px
}
.dec-item:last-child{margin-bottom:0}
.dec-item.open-dec{border-right-color:var(--red)}
.dec-title{font-weight:700;font-size:.82rem;margin-bottom:3px}
.dec-meta{font-size:.7rem;color:var(--gray);display:flex;gap:8px;flex-wrap:wrap;align-items:center}

/* ── الملخص التنفيذي ── */
.exec-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.exec-item{padding:10px 12px;background:var(--light);border-radius:8px}
.exec-lbl{font-size:.7rem;color:var(--gray);margin-bottom:2px}
.exec-val{font-size:.85rem;font-weight:700;line-height:1.4}

/* ── تذييل ── */
.report-footer{
  text-align:center;padding:16px;color:var(--gray);
  font-size:.72rem;margin-top:12px;
  border-top:1px solid var(--border)
}
.report-footer strong{color:var(--navy)}

/* ── الفاصل ── */
.section-divider{height:1px;background:var(--border);margin:4px 0 12px}
.empty-state{color:var(--gray);font-size:.78rem;padding:6px 0;font-style:italic}
@media(max-width:700px){.track-grid,.tl-grid,.exec-grid{grid-template-columns:1fr}.rh-title{font-size:1.3rem}}
`;

// ─── مكونات مشتركة ──────────────────────────────────────────
function toolbar(title){
  return `<div class="toolbar no-print">
    <span class="toolbar-title">📋 ${title}</span>
    <div class="toolbar-actions">
      <button class="btn-pdf" onclick="window.print()">⬇ تصدير PDF / طباعة</button>
      <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>`;
}

function reportFooter(base){
  return `<div class="report-footer">
    <strong>مشروع افتتاح حدائق الملك عبدالله العالمية</strong>
    &nbsp;·&nbsp; ${todayAr(base)}
    &nbsp;·&nbsp; الأسبوع ${weekNum(base)}
    &nbsp;·&nbsp; سري — للاستخدام الداخلي
  </div>`;
}

function tlRows(arr, showTrack){
  if(!arr.length) return `<div class="tl-empty">لا توجد بنود مجدولة</div>`;
  return arr.map(i=>`
    <div class="tl-item">
      <div class="tl-item-title">${i.title||"—"}</div>
      <div class="tl-item-meta">
        ${showTrack&&i.track?`<span>📌 ${TRACK_NAMES[i.track]||i.track}</span>`:""}
        ${i.owner?`<span>👤 ${i.owner}</span>`:""}
        ${i.due?`<span>📅 ${fmtDate(i.due)}</span>`:""}
        ${badge(i.status)}
      </div>
    </div>`).join("");
}

function renderTasksTable(tasks, showTrack){
  if(!tasks.length) return `<div class="empty-state">✅ لا توجد مهام لعرضها</div>`;
  const rows = tasks.map(t=>`
    <tr>
      ${showTrack?`<td style="white-space:nowrap;color:var(--text2);font-size:.72rem">${TRACK_NAMES[t.track]||t.track||"—"}</td>`:""}
      <td class="task-title-cell">${t.title||"—"}</td>
      <td class="task-owner-cell">${t.owner||"—"}</td>
      <td class="task-date-cell">${fmtDate(t.due)}</td>
      <td>${badge(t.status)}</td>
    </tr>`).join("");
  return `<table class="task-table">
    <thead><tr>
      ${showTrack?`<th>المسار</th>`:""}
      <th>المهمة / البند</th>
      <th>المسؤول</th>
      <th>التاريخ</th>
      <th>الحالة</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderRisks(risks){
  if(!risks.length) return `<div class="empty-state">✅ لا توجد مخاطر مفتوحة</div>`;
  return risks.map(r=>`
    <div class="risk-row">
      <div class="risk-dot" style="background:${isRiskS(r.status)?'var(--red)':isDone(r.status)?'var(--green)':'var(--yellow)'}"></div>
      <div class="risk-content">
        <div class="risk-title">${r.title||"—"}</div>
        <div class="risk-meta">
          ${r.owner?`<span>👤 ${r.owner}</span>`:""}
          ${r.due?`<span>📅 ${fmtDate(r.due)}</span>`:""}
          ${r.track?`<span>📌 ${TRACK_NAMES[r.track]||r.track}</span>`:""}
        </div>
      </div>
      ${badge(r.status)}
    </div>`).join("");
}

function renderDecisions(decisions){
  if(!decisions.length) return `<div class="empty-state">✅ لا توجد قرارات مفتوحة</div>`;
  return decisions.map(d=>`
    <div class="dec-item ${d.status==='مفتوح'?'open-dec':''}">
      <div class="dec-title">${d.title||"—"}</div>
      <div class="dec-meta">
        ${TRACK_NAMES[d.track]?`<span>📌 ${TRACK_NAMES[d.track]}</span>`:""}
        ${d.owner?`<span>👤 ${d.owner}</span>`:""}
        ${d.due?`<span>📅 ${fmtDate(d.due)}</span>`:""}
        ${badge(d.status)}
      </div>
    </div>`).join("");
}

function htmlShell(title, bodyContent, base){
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${todayAr(base)}</title>
<style>${CSS}</style>
</head><body>
${toolbar(title)}
<div class="page-wrap">
${bodyContent}
${reportFooter(base)}
</div>
</body></html>`;
}

// ══════════════════════════════════════════════════════════════
// التقرير الشامل
// ══════════════════════════════════════════════════════════════
function buildComprehensive(state, reportDate){
  const buckets   = getDateBuckets(reportDate);
  const tracks    = state.tracks   || [];
  const items     = state.items    || [];
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد");

  const tasks  = items.filter(i=>!isRiskItem(i));
  const risks  = items.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const totDone= tasks.filter(i=>isDone(i.status)).length;
  const totAct = tasks.filter(i=>isActive(i.status)).length;
  const totLate= tasks.filter(i=>isRiskS(i.status)).length;
  const ovr    = tracks.length?Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length):0;
  const {done:yd,active:td,next:tm,hasExactDates} = bucketItems(tasks,buckets);

  // بطاقات المسارات
  const trackCards = tracks.map(t=>{
    const ti = items.filter(i=>i.track===t.id);
    const tT = ti.filter(i=>!isRiskItem(i));
    const tR = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
    const tD = tT.filter(i=>isDone(i.status)).length;
    const tA = tT.filter(i=>isActive(i.status)).length;
    const ac = TRACK_ACCENTS[t.id]||"var(--teal)";
    return `<div class="track-card">
      <div class="track-head" style="background:${ac}">
        <span class="track-name">${t.name||TRACK_NAMES[t.id]||t.id}</span>
        ${tBadge(t.status)}
      </div>
      <div class="track-body">
        ${pbar(t.progress,ac)}
        <div class="track-kpis">
          <div class="t-kpi"><div class="v" style="color:var(--navy)">${tT.length}</div><div class="l">إجمالي</div></div>
          <div class="t-kpi"><div class="v" style="color:var(--green)">${tD}</div><div class="l">منجزة</div></div>
          <div class="t-kpi"><div class="v" style="color:var(--yellow)">${tA}</div><div class="l">جارية</div></div>
          <div class="t-kpi"><div class="v" style="color:var(--red)">${tR.length}</div><div class="l">مخاطر</div></div>
        </div>
      </div>
    </div>`;
  }).join("");

  const tlNote = hasExactDates
    ? `يعرض البنود المجدولة بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `لا توجد بنود بتواريخ محددة — يعرض آخر البنود المنجزة والجارية والقادمة`;

  // المهام الحرجة (متأخرة أو معرضة للخطر)
  const criticalTasks = tasks.filter(i=>isRiskS(i.status)).slice(0,15);

  const body = `
  <div class="report-header">
    <div class="rh-label">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1 class="rh-title">التقرير الشامل اليومي</h1>
    <div class="rh-sub">نموذج تنفيذي — المسارات الأربعة · المخاطر · القرارات · الجدول الزمني</div>
    <div class="rh-meta">
      <div class="rh-meta-item"><span class="rh-meta-label">التاريخ</span><span class="rh-meta-value">${todayAr(buckets.base)}</span></div>
      <div class="rh-meta-item"><span class="rh-meta-label">الأسبوع</span><span class="rh-meta-value">${weekNum(buckets.base)}</span></div>
      <div class="rh-meta-item"><span class="rh-meta-label">نسبة الإنجاز الكلية</span><span class="rh-meta-value" style="color:var(--gold)">${ovr}%</span></div>
      <div class="rh-meta-item"><span class="rh-meta-label">مجموع المهام</span><span class="rh-meta-value">${tasks.length}</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card c-navy"><div class="kpi-val">${tasks.length}</div><div class="kpi-lbl">إجمالي المهام</div></div>
    <div class="kpi-card c-green"><div class="kpi-val">${totDone}</div><div class="kpi-lbl">منجزة ✓</div></div>
    <div class="kpi-card c-yellow"><div class="kpi-val">${totAct}</div><div class="kpi-lbl">قيد التنفيذ</div></div>
    <div class="kpi-card c-red"><div class="kpi-val">${totLate}</div><div class="kpi-lbl">متأخرة ⚠</div></div>
    <div class="kpi-card c-gold"><div class="kpi-val">${ovr}%</div><div class="kpi-lbl">نسبة الإنجاز</div></div>
    <div class="kpi-card c-teal"><div class="kpi-val">${risks.length}</div><div class="kpi-lbl">مخاطر مفتوحة</div></div>
  </div>

  <!-- المسارات الأربعة -->
  <div class="card">
    <div class="card-head"><span class="card-icon">🗂</span><h2 class="card-title">حالة المسارات الأربعة</h2></div>
    <div class="card-body"><div class="track-grid">${trackCards}</div></div>
  </div>

  <!-- الجدول الزمني -->
  <div class="card">
    <div class="card-head"><span class="card-icon">📅</span><h2 class="card-title">الجدول الزمني اليومي</h2></div>
    <div class="card-body-compact">
      <div class="tl-grid">
        <div class="tl-col">
          <div class="tl-head" style="background:var(--green)">✓ أمس — ${fmtDate(buckets.yesterday)}</div>
          <div class="tl-body">${tlRows(yd,true)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--gold)">⟳ اليوم — ${fmtDate(buckets.today)}</div>
          <div class="tl-body">${tlRows(td,true)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--teal)">○ غداً — ${fmtDate(buckets.tomorrow)}</div>
          <div class="tl-body">${tlRows(tm,true)}</div>
        </div>
      </div>
      <div class="tl-note">${tlNote}</div>
    </div>
  </div>

  <!-- البنود الحرجة -->
  ${criticalTasks.length?`
  <div class="card">
    <div class="card-head"><span class="card-icon">🔴</span><h2 class="card-title">البنود الحرجة والمتأخرة</h2></div>
    <div class="card-body-compact">${renderTasksTable(criticalTasks,true)}</div>
  </div>`:""}

  <!-- المخاطر -->
  <div class="card">
    <div class="card-head"><span class="card-icon">⚠️</span><h2 class="card-title">المخاطر والقضايا المفتوحة (${risks.length})</h2></div>
    <div class="card-body">${renderRisks(risks)}</div>
  </div>

  <!-- القرارات -->
  <div class="card">
    <div class="card-head"><span class="card-icon">⚖️</span><h2 class="card-title">القرارات المطلوبة (${decisions.length})</h2></div>
    <div class="card-body">${renderDecisions(decisions)}</div>
  </div>`;

  return htmlShell("التقرير الشامل اليومي", body, buckets.base);
}

// ══════════════════════════════════════════════════════════════
// تقرير المسار
// ══════════════════════════════════════════════════════════════
function buildTrack(state, tid, reportDate){
  const buckets   = getDateBuckets(reportDate);
  const tracks    = state.tracks   || [];
  const items     = state.items    || [];
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد"&&(d.track===tid||!d.track));
  const logs      = (state.dailyLogs||[]).filter(l=>l.track===tid);
  const latestLog = logs[0]||null;

  const track = tracks.find(t=>t.id===tid||t.track===tid)||
    {id:tid,name:TRACK_NAMES[tid],progress:0,tasks:0,status:"—",lead:"—",focus:"—"};
  const ac  = TRACK_ACCENTS[tid]||"var(--teal)";
  const nm  = track.name||TRACK_NAMES[tid]||tid;
  const pct = track.progress||0;

  const ti      = items.filter(i=>i.track===tid);
  const tT      = ti.filter(i=>!isRiskItem(i));
  const tR      = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const tDone   = tT.filter(i=>isDone(i.status)).length;
  const tActive = tT.filter(i=>isActive(i.status)).length;
  const tLate   = tT.filter(i=>isRiskS(i.status)).length;

  const {done:yd,active:td,next:tm,hasExactDates} = bucketItems(tT,buckets);
  const tlNote = hasExactDates
    ? `يعرض البنود المجدولة بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `لا توجد بنود بتواريخ محددة — يعرض آخر البنود المنجزة والجارية والقادمة`;

  const execGrid = latestLog?`
    <div class="exec-grid">
      <div class="exec-item"><div class="exec-lbl">📌 المنجز</div><div class="exec-val">${latestLog.done||"—"}</div></div>
      <div class="exec-item"><div class="exec-lbl">⏱ المتأخر</div><div class="exec-val">${latestLog.delayed||"—"}</div></div>
      <div class="exec-item"><div class="exec-lbl">⚠ المخاطر</div><div class="exec-val">${latestLog.risks||"—"}</div></div>
      <div class="exec-item"><div class="exec-lbl">⚖ القرار المطلوب</div><div class="exec-val">${latestLog.decision||"—"}</div></div>
    </div>`:"";

  // المهام الجارية وقيد التنفيذ للجدول
  const activeTasks = tT.filter(i=>isActive(i.status)||isRiskS(i.status)).slice(0,20);

  const body = `
  <div class="report-header">
    <div class="rh-label">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1 class="rh-title" style="color:${ac}">${nm}</h1>
    <div class="rh-sub">${track.focus||""} ${track.lead?`· ${track.lead}`:""}</div>
    <div class="rh-meta">
      <div class="rh-meta-item"><span class="rh-meta-label">التاريخ</span><span class="rh-meta-value">${todayAr(buckets.base)}</span></div>
      <div class="rh-meta-item"><span class="rh-meta-label">الحالة</span><span class="rh-meta-value">${track.status||"—"}</span></div>
      <div class="rh-meta-item"><span class="rh-meta-label">نسبة الإنجاز</span><span class="rh-meta-value" style="color:${ac}">${pct}%</span></div>
      <div class="rh-meta-item"><span class="rh-meta-label">إجمالي المهام</span><span class="rh-meta-value">${tT.length}</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card c-navy"><div class="kpi-val">${tT.length}</div><div class="kpi-lbl">إجمالي المهام</div></div>
    <div class="kpi-card c-green"><div class="kpi-val">${tDone}</div><div class="kpi-lbl">منجزة ✓</div></div>
    <div class="kpi-card c-yellow"><div class="kpi-val">${tActive}</div><div class="kpi-lbl">قيد التنفيذ</div></div>
    <div class="kpi-card c-red"><div class="kpi-val">${tLate}</div><div class="kpi-lbl">متأخرة ⚠</div></div>
    <div class="kpi-card c-gold"><div class="kpi-val">${pct}%</div><div class="kpi-lbl">نسبة الإنجاز</div></div>
    <div class="kpi-card c-teal"><div class="kpi-val">${tR.length}</div><div class="kpi-lbl">مخاطر مفتوحة</div></div>
  </div>

  <!-- الوضع التنفيذي -->
  <div class="card">
    <div class="card-head" style="background:${ac}18;border-bottom-color:${ac}30">
      <span class="card-icon">📊</span>
      <h2 class="card-title">الوضع التنفيذي للمسار</h2>
    </div>
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;font-size:.9rem">${nm}</span>${tBadge(track.status)}
      </div>
      <div style="margin-bottom:${execGrid?'14px':'6px'}">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:.82rem;color:var(--text2)">نسبة الإنجاز الإجمالية</span>
          <span style="font-weight:900;color:${ac}">${pct}%</span>
        </div>
        <div class="pb-track" style="height:10px"><div class="pb-fill" style="width:${pct}%;background:${ac};height:10px"></div></div>
      </div>
      ${execGrid}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">
        <div style="padding:9px;background:var(--light);border-radius:8px;text-align:center">
          <div style="font-size:1.35rem;font-weight:900;color:var(--green)">${tDone}</div>
          <div style="font-size:.68rem;color:var(--gray)">مكتملة ✓</div>
        </div>
        <div style="padding:9px;background:var(--light);border-radius:8px;text-align:center">
          <div style="font-size:1.35rem;font-weight:900;color:var(--yellow)">${tActive}</div>
          <div style="font-size:.68rem;color:var(--gray)">جارية ⟳</div>
        </div>
        <div style="padding:9px;background:var(--light);border-radius:8px;text-align:center">
          <div style="font-size:1.35rem;font-weight:900;color:var(--red)">${tLate}</div>
          <div style="font-size:.68rem;color:var(--gray)">متأخرة ⚠</div>
        </div>
        <div style="padding:9px;background:var(--light);border-radius:8px;text-align:center">
          <div style="font-size:1.35rem;font-weight:900;color:var(--teal)">${tR.length}</div>
          <div style="font-size:.68rem;color:var(--gray)">مخاطر</div>
        </div>
      </div>
    </div>
  </div>

  <!-- الجدول الزمني -->
  <div class="card">
    <div class="card-head"><span class="card-icon">📅</span><h2 class="card-title">الجدول الزمني اليومي</h2></div>
    <div class="card-body-compact">
      <div class="tl-grid">
        <div class="tl-col">
          <div class="tl-head" style="background:var(--green)">✓ أمس — ${fmtDate(buckets.yesterday)}</div>
          <div class="tl-body">${tlRows(yd,false)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:${ac}">⟳ اليوم — ${fmtDate(buckets.today)}</div>
          <div class="tl-body">${tlRows(td,false)}</div>
        </div>
        <div class="tl-col">
          <div class="tl-head" style="background:var(--teal)">○ غداً — ${fmtDate(buckets.tomorrow)}</div>
          <div class="tl-body">${tlRows(tm,false)}</div>
        </div>
      </div>
      <div class="tl-note">${tlNote}</div>
    </div>
  </div>

  <!-- المهام الجارية -->
  ${activeTasks.length?`
  <div class="card">
    <div class="card-head"><span class="card-icon">⟳</span><h2 class="card-title">المهام الجارية والمتأخرة</h2></div>
    <div class="card-body-compact">${renderTasksTable(activeTasks,false)}</div>
  </div>`:""}

  <!-- المخاطر -->
  <div class="card">
    <div class="card-head"><span class="card-icon">⚠️</span><h2 class="card-title">المخاطر والقضايا (${tR.length})</h2></div>
    <div class="card-body">${renderRisks(tR)}</div>
  </div>

  <!-- القرارات -->
  <div class="card">
    <div class="card-head"><span class="card-icon">⚖️</span><h2 class="card-title">القرارات المطلوبة (${decisions.length})</h2></div>
    <div class="card-body">${renderDecisions(decisions)}</div>
  </div>`;

  return htmlShell(`تقرير مسار: ${nm}`, body, buckets.base);
}

// ─── الدالة الرئيسية ─────────────────────────────────────────
async function generateReport(type, state){
  const reportDate = state.reportDate || null;
  let html;
  if(type==="comprehensive") html=buildComprehensive(state, reportDate);
  else if(["أ","ب","ج","د"].includes(type)) html=buildTrack(state, type, reportDate);
  else throw new Error("نوع تقرير غير معروف: "+type);
  return Buffer.from(html,"utf-8");
}

module.exports = { generateReport };
