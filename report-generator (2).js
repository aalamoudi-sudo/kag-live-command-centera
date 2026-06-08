"use strict";
/**
 * report-generator.js v6 — HTML Reports
 * يولّد تقارير HTML احترافية قابلة للطباعة بدون أي مكتبات خارجية
 * لا PPTX، لا Python، لا dependencies — Node.js فقط
 */

// =========================================================
// ثوابت
// =========================================================
const TRACK_NAMES = {
  "أ": "التخطيط والتنسيق",
  "ب": "التواصل والتسويق",
  "ج": "الفعاليات والأنشطة المصاحبة",
  "د": "تجهيز وتفعيل الحديقة",
};
const TRACK_ACCENTS = {
  "أ": "#7E6BFF", "ب": "#A98BFF", "ج": "#D9B86C", "د": "#6454C8",
};
const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];

function isDone(s)   { return DONE_SET.includes(s); }
function isActive(s) { return ACTIVE_SET.includes(s); }
function isRisk(s)   { return RISK_SET.includes(s); }
function isRiskItem(i){ return ["risks","مخاطرة","مخاطر"].includes(i.type); }

function fmtDate(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d)) return s;
    return d.toLocaleDateString("ar-SA", {year:"numeric",month:"2-digit",day:"2-digit"});
  } catch { return s; }
}

function todayAr() {
  return new Date().toLocaleDateString("ar-SA", {weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

function weekNum() {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d-new Date(d.getFullYear(),0,4))/(7*86400000))+1;
}

function statusBadge(s) {
  if (!s) return `<span class="badge badge-gray">—</span>`;
  if (isDone(s))   return `<span class="badge badge-green">✓ ${s}</span>`;
  if (isActive(s)) return `<span class="badge badge-yellow">${s}</span>`;
  if (isRisk(s))   return `<span class="badge badge-red">⚠ ${s}</span>`;
  return `<span class="badge badge-gray">${s}</span>`;
}

function trackStatusBadge(s) {
  if (s === "ضمن المسار")    return `<span class="badge badge-green">✓ ${s}</span>`;
  if (s === "تحت المتابعة")  return `<span class="badge badge-yellow">${s}</span>`;
  if (s === "معرض للخطر")   return `<span class="badge badge-red">⚠ ${s}</span>`;
  return `<span class="badge badge-gray">${s||"—"}</span>`;
}

function progressBar(pct, color) {
  const c = color || "#7E6BFF";
  const p = Math.min(100, Math.max(0, pct||0));
  return `
    <div class="progress-wrap">
      <div class="progress-bar" style="width:${p}%;background:${c}"></div>
      <span class="progress-label">${p}%</span>
    </div>`;
}

// =========================================================
// CSS المشترك
// =========================================================
const COMMON_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --navy:   #08283B;
    --teal:   #1C8D82;
    --gold:   #C9A24A;
    --green:  #2FA65A;
    --red:    #D64D3F;
    --yellow: #F0A500;
    --gray:   #6B7280;
    --light:  #F4F6F8;
    --white:  #FFFFFF;
    --border: #E5E7EB;
    --text:   #1F2937;
    --text2:  #4B5563;
  }

  html { font-size: 14px; }
  body {
    font-family: 'Tajawal', sans-serif;
    direction: rtl;
    background: var(--light);
    color: var(--text);
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ===== طباعة ===== */
  @media print {
    body { background: white; }
    .no-print { display: none !important; }
    .page-break { page-break-before: always; }
    .card { box-shadow: none; border: 1px solid var(--border); }
    .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  /* ===== شريط الطباعة ===== */
  .print-bar {
    position: fixed; top: 0; right: 0; left: 0; z-index: 1000;
    background: var(--navy); color: white;
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 24px; gap: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
  }
  .print-bar .title { font-size: 1rem; font-weight: 700; color: var(--gold); }
  .print-bar .actions { display: flex; gap: 8px; }
  .btn-print {
    background: var(--gold); color: var(--navy); border: none;
    padding: 7px 18px; border-radius: 6px; font-family: inherit;
    font-size: .9rem; font-weight: 700; cursor: pointer;
    transition: opacity .2s;
  }
  .btn-print:hover { opacity: .85; }
  .btn-close {
    background: rgba(255,255,255,.1); color: white; border: 1px solid rgba(255,255,255,.2);
    padding: 7px 14px; border-radius: 6px; font-family: inherit;
    font-size: .9rem; cursor: pointer;
  }

  /* ===== المحتوى ===== */
  .report-wrap { max-width: 1100px; margin: 60px auto 40px; padding: 0 20px; }

  /* ===== رأس التقرير ===== */
  .report-header {
    background: linear-gradient(135deg, var(--navy) 0%, #0d3547 100%);
    color: white; border-radius: 16px; padding: 36px 40px 32px;
    margin-bottom: 28px; position: relative; overflow: hidden;
  }
  .report-header::after {
    content: ''; position: absolute; left: -60px; top: -60px;
    width: 300px; height: 300px;
    background: radial-gradient(circle, rgba(201,162,74,.15) 0%, transparent 70%);
    pointer-events: none;
  }
  .report-header .project { font-size: .85rem; color: rgba(255,255,255,.6); margin-bottom: 6px; }
  .report-header h1 { font-size: 2rem; font-weight: 900; color: var(--gold); margin-bottom: 8px; }
  .report-header .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 16px; }
  .report-header .meta-item { display: flex; flex-direction: column; }
  .report-header .meta-item .lbl { font-size: .75rem; color: rgba(255,255,255,.5); }
  .report-header .meta-item .val { font-size: .95rem; font-weight: 600; color: rgba(255,255,255,.9); }

  /* ===== البطاقات ===== */
  .card {
    background: white; border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 4px 16px rgba(0,0,0,.04);
    margin-bottom: 20px; overflow: hidden;
  }
  .card-header {
    padding: 16px 20px; display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border);
  }
  .card-header .icon { font-size: 1.1rem; }
  .card-header h2 { font-size: 1rem; font-weight: 700; flex: 1; }
  .card-body { padding: 20px; }

  /* ===== KPI Grid ===== */
  .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .kpi-card {
    background: white; border-radius: 10px; padding: 18px 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08);
    border-top: 3px solid var(--border);
    text-align: center;
  }
  .kpi-card .kpi-val { font-size: 2.2rem; font-weight: 900; line-height: 1; margin-bottom: 4px; }
  .kpi-card .kpi-lbl { font-size: .78rem; color: var(--text2); }
  .kpi-card.green  { border-top-color: var(--green); }
  .kpi-card.green  .kpi-val { color: var(--green); }
  .kpi-card.yellow { border-top-color: var(--yellow); }
  .kpi-card.yellow .kpi-val { color: var(--yellow); }
  .kpi-card.red    { border-top-color: var(--red); }
  .kpi-card.red    .kpi-val { color: var(--red); }
  .kpi-card.blue   { border-top-color: var(--teal); }
  .kpi-card.blue   .kpi-val { color: var(--teal); }
  .kpi-card.gold   { border-top-color: var(--gold); }
  .kpi-card.gold   .kpi-val { color: var(--gold); }
  .kpi-card.navy   { border-top-color: var(--navy); }
  .kpi-card.navy   .kpi-val { color: var(--navy); }

  /* ===== جدول ===== */
  .data-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
  .data-table th {
    background: var(--navy); color: white; padding: 10px 12px;
    text-align: right; font-weight: 600; font-size: .8rem; white-space: nowrap;
  }
  .data-table td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:hover td { background: var(--light); }
  .data-table .num { color: var(--gray); font-size: .8rem; }

  /* ===== شرائط التقدم ===== */
  .progress-wrap { display: flex; align-items: center; gap: 8px; }
  .progress-bg { flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; min-width: 60px; }
  .progress-bar { height: 100%; border-radius: 4px; transition: width .3s; }
  .progress-label { font-size: .8rem; font-weight: 700; min-width: 36px; text-align: left; }

  /* ===== Badges ===== */
  .badge { display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 20px; font-size: .75rem; font-weight: 600; white-space: nowrap; }
  .badge-green  { background: #D1FAE5; color: #065F46; }
  .badge-yellow { background: #FEF3C7; color: #92400E; }
  .badge-red    { background: #FEE2E2; color: #991B1B; }
  .badge-gray   { background: #F3F4F6; color: #6B7280; }
  .badge-blue   { background: #DBEAFE; color: #1E40AF; }

  /* ===== مسارات الجدول الزمني ===== */
  .timeline-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .timeline-col { border-radius: 10px; overflow: hidden; }
  .timeline-col-header { padding: 12px 16px; font-weight: 700; font-size: .85rem; color: white; }
  .timeline-col-body { padding: 12px 16px; background: var(--light); min-height: 80px; }
  .timeline-item { padding: 6px 0; border-bottom: 1px dashed var(--border); font-size: .83rem; }
  .timeline-item:last-child { border-bottom: none; }
  .timeline-item .ti-owner { font-size: .75rem; color: var(--gray); }

  /* ===== المسارات الأربعة (الشامل) ===== */
  .tracks-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .track-mini { border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
  .track-mini-header { padding: 14px 16px; display: flex; align-items: center; gap: 10px; }
  .track-mini-header .t-name { font-weight: 700; font-size: .9rem; flex: 1; }
  .track-mini-body { padding: 16px; background: white; }
  .track-mini-kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 12px; }
  .t-kpi { text-align: center; }
  .t-kpi .v { font-size: 1.4rem; font-weight: 900; }
  .t-kpi .l { font-size: .7rem; color: var(--gray); }

  /* ===== قسم المخاطر ===== */
  .risk-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .risk-row:last-child { border-bottom: none; }
  .risk-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }

  /* ===== تذييل ===== */
  .report-footer { text-align: center; padding: 24px; color: var(--gray); font-size: .8rem; margin-top: 20px; }
  .report-footer strong { color: var(--navy); }

  @media (max-width: 700px) {
    .tracks-grid, .timeline-grid { grid-template-columns: 1fr; }
    .kpi-grid { grid-template-columns: repeat(3,1fr); }
    .report-header h1 { font-size: 1.4rem; }
  }
`;

// =========================================================
// مكونات مشتركة
// =========================================================
function printBar(title) {
  return `
  <div class="print-bar no-print">
    <span class="title">📊 ${title}</span>
    <div class="actions">
      <button class="btn-print" onclick="window.print()">🖨️ طباعة / PDF</button>
      <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
    </div>
  </div>`;
}

function reportFooter() {
  return `
  <div class="report-footer">
    <strong>مشروع افتتاح حدائق الملك عبدالله العالمية</strong> &nbsp;·&nbsp;
    تقرير مولّد تلقائياً بتاريخ ${todayAr()} &nbsp;·&nbsp;
    الأسبوع ${weekNum()}
  </div>`;
}

function progressCell(pct, color) {
  const p = Math.min(100, Math.max(0, pct||0));
  const c = color || "var(--teal)";
  return `<div class="progress-wrap">
    <div class="progress-bg"><div class="progress-bar" style="width:${p}%;background:${c}"></div></div>
    <span class="progress-label" style="color:${c}">${p}%</span>
  </div>`;
}

// =========================================================
// التقرير الشامل
// =========================================================
function buildComprehensive(state) {
  const tracks = state.tracks || [];
  const items  = state.items  || [];

  const allTasks  = items.filter(i => !isRiskItem(i));
  const allRisks  = items.filter(i => isRiskItem(i));
  const totalDone  = allTasks.filter(i => isDone(i.status)).length;
  const totalActive= allTasks.filter(i => isActive(i.status)).length;
  const totalRisk  = allTasks.filter(i => isRisk(i.status)).length + allRisks.filter(i => !isDone(i.status)).length;
  const overallPct = tracks.length ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;

  // جدول المهام الكامل
  const taskRows = allTasks.map((item,i) => `
    <tr>
      <td class="num">${i+1}</td>
      <td>${TRACK_NAMES[item.track]||item.track||"—"}</td>
      <td><strong>${item.title||"—"}</strong></td>
      <td>${item.owner||"—"}</td>
      <td>${fmtDate(item.due)}</td>
      <td>${progressCell(item.progress, TRACK_ACCENTS[item.track])}</td>
      <td>${statusBadge(item.status)}</td>
    </tr>`).join("");

  const riskRows = [...allRisks, ...allTasks.filter(i=>isRisk(i.status))].map((r,i)=>`
    <div class="risk-row">
      <div class="risk-dot" style="background:${isRisk(r.status)?'var(--red)':isDone(r.status)?'var(--green)':'var(--yellow)'}"></div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.87rem">${r.title||"—"}</div>
        <div style="font-size:.78rem;color:var(--gray);margin-top:2px">
          ${TRACK_NAMES[r.track]||""} · المسؤول: ${r.owner||"—"} · الموعد: ${fmtDate(r.due)}
        </div>
      </div>
      ${statusBadge(r.status)}
    </div>`).join("");

  // بطاقات المسارات
  const trackCards = tracks.map(t => {
    const ti     = items.filter(i=>i.track===t.id);
    const tTasks = ti.filter(i=>!isRiskItem(i));
    const tRisks = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
    const tDone  = tTasks.filter(i=>isDone(i.status)).length;
    const tActiv = tTasks.filter(i=>isActive(i.status)).length;
    const acc    = TRACK_ACCENTS[t.id]||"var(--teal)";
    return `
    <div class="track-mini">
      <div class="track-mini-header" style="background:${acc}">
        <span class="t-name" style="color:white">${t.name||TRACK_NAMES[t.id]}</span>
        ${trackStatusBadge(t.status)}
      </div>
      <div class="track-mini-body">
        ${progressCell(t.progress, acc)}
        <div class="track-mini-kpis" style="margin-top:12px">
          <div class="t-kpi"><div class="v" style="color:var(--navy)">${t.tasks||0}</div><div class="l">الإجمالي</div></div>
          <div class="t-kpi"><div class="v" style="color:var(--green)">${tDone}</div><div class="l">منجزة</div></div>
          <div class="t-kpi"><div class="v" style="color:var(--yellow)">${tActiv}</div><div class="l">جارية</div></div>
          <div class="t-kpi"><div class="v" style="color:var(--red)">${tRisks.length}</div><div class="l">مخاطر</div></div>
        </div>
      </div>
    </div>`;
  }).join("");

  // الجدول الزمني
  const yesterday = allTasks.filter(i=>isDone(i.status)).slice(0,5);
  const today     = allTasks.filter(i=>isActive(i.status)).slice(0,5);
  const tomorrow  = allTasks.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1).slice(0,5);

  function timelineItems(arr) {
    if (!arr.length) return `<div style="color:var(--gray);font-size:.82rem;padding:8px 0">لا يوجد بنود</div>`;
    return arr.map(i=>`
      <div class="timeline-item">
        <div>${i.title}</div>
        <div class="ti-owner">${TRACK_NAMES[i.track]||""} · ${i.owner||""}</div>
      </div>`).join("");
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>التقرير الشامل اليومي — KAGA</title>
<style>${COMMON_CSS}</style>
</head>
<body>
${printBar("التقرير الشامل اليومي")}

<div class="report-wrap">
  <!-- رأس التقرير -->
  <div class="report-header">
    <div class="project">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1>التقرير الشامل اليومي</h1>
    <p style="color:rgba(255,255,255,.7);font-size:.88rem">نموذج تنفيذي لمتابعة التقدم والمسارات الأربعة والمخاطر والقرارات</p>
    <div class="meta">
      <div class="meta-item"><span class="lbl">التاريخ</span><span class="val">${todayAr()}</span></div>
      <div class="meta-item"><span class="lbl">الأسبوع</span><span class="val">${weekNum()}</span></div>
      <div class="meta-item"><span class="lbl">الإنجاز الكلي</span><span class="val" style="color:var(--gold)">${overallPct}%</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card navy"><div class="kpi-val">${allTasks.length}</div><div class="kpi-lbl">إجمالي المهام</div></div>
    <div class="kpi-card green"><div class="kpi-val">${totalDone}</div><div class="kpi-lbl">مهام منجزة</div></div>
    <div class="kpi-card yellow"><div class="kpi-val">${totalActive}</div><div class="kpi-lbl">قيد التنفيذ</div></div>
    <div class="kpi-card red"><div class="kpi-val">${totalRisk}</div><div class="kpi-lbl">معرضة للخطر</div></div>
    <div class="kpi-card gold"><div class="kpi-val">${overallPct}%</div><div class="kpi-lbl">نسبة الإنجاز</div></div>
    <div class="kpi-card blue"><div class="kpi-val">${allRisks.filter(r=>!isDone(r.status)).length}</div><div class="kpi-lbl">مخاطر مفتوحة</div></div>
  </div>

  <!-- حالة المسارات -->
  <div class="card">
    <div class="card-header"><span class="icon">🗂</span><h2>حالة المسارات الأربعة</h2></div>
    <div class="card-body">
      <div class="tracks-grid">${trackCards}</div>
    </div>
  </div>

  <!-- الجدول الزمني -->
  <div class="card">
    <div class="card-header"><span class="icon">📅</span><h2>الجدول الزمني اليومي</h2></div>
    <div class="card-body">
      <div class="timeline-grid">
        <div class="timeline-col">
          <div class="timeline-col-header" style="background:var(--green)">✓ أمس — ما تم إنجازه</div>
          <div class="timeline-col-body">${timelineItems(yesterday)}</div>
        </div>
        <div class="timeline-col">
          <div class="timeline-col-header" style="background:var(--gold)">⟳ اليوم — جاري التنفيذ</div>
          <div class="timeline-col-body">${timelineItems(today)}</div>
        </div>
        <div class="timeline-col">
          <div class="timeline-col-header" style="background:var(--teal)">○ غداً — مخطط</div>
          <div class="timeline-col-body">${timelineItems(tomorrow)}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- قائمة المهام الكاملة -->
  <div class="card">
    <div class="card-header"><span class="icon">📋</span><h2>قائمة المهام والأنشطة</h2></div>
    <div class="card-body" style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          <th>#</th><th>المسار</th><th>النشاط</th><th>المسؤول</th><th>الموعد</th><th>الإنجاز</th><th>الحالة</th>
        </tr></thead>
        <tbody>${taskRows || '<tr><td colspan="7" style="text-align:center;color:var(--gray);padding:24px">لا توجد مهام مسجّلة</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <!-- المخاطر -->
  <div class="card">
    <div class="card-header"><span class="icon">⚠️</span><h2>المخاطر والقضايا</h2></div>
    <div class="card-body">
      ${riskRows || '<div style="color:var(--gray);padding:12px 0">لا توجد مخاطر مسجّلة</div>'}
    </div>
  </div>

  ${reportFooter()}
</div>
</body></html>`;
}

// =========================================================
// تقرير مسار
// =========================================================
function buildTrack(state, trackId) {
  const tracks = state.tracks || [];
  const items  = state.items  || [];
  const track  = tracks.find(t=>t.id===trackId||t.track===trackId) || {id:trackId,name:TRACK_NAMES[trackId],progress:0,tasks:0,done:0,active:0,risk:0};
  const acc    = TRACK_ACCENTS[trackId] || "var(--teal)";
  const tName  = track.name || TRACK_NAMES[trackId] || trackId;

  const ti     = items.filter(i=>i.track===trackId);
  const tTasks = ti.filter(i=>!isRiskItem(i));
  const tRisks = ti.filter(i=>isRiskItem(i));
  const tDone  = tTasks.filter(i=>isDone(i.status));
  const tActiv = tTasks.filter(i=>isActive(i.status));
  const tRisk  = tTasks.filter(i=>isRisk(i.status));
  const tNext  = tTasks.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1);
  const pct    = track.progress||0;

  const taskRows = tTasks.map((item,i) => `
    <tr>
      <td class="num">${i+1}</td>
      <td><strong>${item.title||"—"}</strong></td>
      <td>${item.owner||"—"}</td>
      <td>${fmtDate(item.due)}</td>
      <td>${progressCell(item.progress, acc)}</td>
      <td>${statusBadge(item.status)}</td>
    </tr>`).join("");

  const riskRows = [...tRisks, ...tRisk].map(r=>`
    <div class="risk-row">
      <div class="risk-dot" style="background:${isRisk(r.status)?'var(--red)':isDone(r.status)?'var(--green)':'var(--yellow)'}"></div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.87rem">${r.title||"—"}</div>
        <div style="font-size:.78rem;color:var(--gray);margin-top:2px">المسؤول: ${r.owner||"—"} · الموعد: ${fmtDate(r.due)}</div>
      </div>
      ${statusBadge(r.status)}
    </div>`).join("");

  function timelineItems(arr) {
    if (!arr.length) return `<div style="color:var(--gray);font-size:.82rem;padding:8px 0">لا يوجد بنود</div>`;
    return arr.map(i=>`
      <div class="timeline-item">
        <div>${i.title}</div>
        <div class="ti-owner">${i.owner||""}</div>
      </div>`).join("");
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>تقرير مسار ${tName} — KAGA</title>
<style>${COMMON_CSS}</style>
</head>
<body>
${printBar(`تقرير مسار: ${tName}`)}

<div class="report-wrap">
  <!-- رأس -->
  <div class="report-header">
    <div class="project">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1 style="color:${acc}">مسار ${tName}</h1>
    <p style="color:rgba(255,255,255,.7);font-size:.88rem">التقرير اليومي للمسار</p>
    <div class="meta">
      <div class="meta-item"><span class="lbl">التاريخ</span><span class="val">${todayAr()}</span></div>
      <div class="meta-item"><span class="lbl">الحالة</span><span class="val">${track.status||"—"}</span></div>
      <div class="meta-item"><span class="lbl">الإنجاز</span><span class="val" style="color:${acc}">${pct}%</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kpi-grid">
    <div class="kpi-card navy"><div class="kpi-val">${tTasks.length}</div><div class="kpi-lbl">إجمالي المهام</div></div>
    <div class="kpi-card green"><div class="kpi-val">${tDone.length}</div><div class="kpi-lbl">منجزة</div></div>
    <div class="kpi-card yellow"><div class="kpi-val">${tActiv.length}</div><div class="kpi-lbl">قيد التنفيذ</div></div>
    <div class="kpi-card red"><div class="kpi-val">${tRisk.length+tRisks.filter(r=>!isDone(r.status)).length}</div><div class="kpi-lbl">معرضة للخطر / مخاطر</div></div>
    <div class="kpi-card gold"><div class="kpi-val">${pct}%</div><div class="kpi-lbl">نسبة الإنجاز</div></div>
    <div class="kpi-card blue"><div class="kpi-val">${tNext.length}</div><div class="kpi-lbl">مهام قادمة</div></div>
  </div>

  <!-- شريط الإنجاز -->
  <div class="card">
    <div class="card-header" style="background:${acc}20;border-bottom-color:${acc}40">
      <span class="icon">📊</span><h2>الوضع التنفيذي للمسار</h2>
    </div>
    <div class="card-body">
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span style="font-weight:600">نسبة الإنجاز الكلية</span>
          <span style="font-weight:900;color:${acc};font-size:1.2rem">${pct}%</span>
        </div>
        <div class="progress-bg" style="height:16px">
          <div class="progress-bar" style="width:${pct}%;background:${acc};height:16px"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;text-align:center">
        <div style="padding:12px;background:var(--light);border-radius:8px">
          <div style="font-size:1.5rem;font-weight:900;color:var(--green)">${tDone.length}</div>
          <div style="font-size:.78rem;color:var(--gray)">مكتملة ✓</div>
        </div>
        <div style="padding:12px;background:var(--light);border-radius:8px">
          <div style="font-size:1.5rem;font-weight:900;color:var(--yellow)">${tActiv.length}</div>
          <div style="font-size:.78rem;color:var(--gray)">جارية ⟳</div>
        </div>
        <div style="padding:12px;background:var(--light);border-radius:8px">
          <div style="font-size:1.5rem;font-weight:900;color:var(--red)">${tRisk.length}</div>
          <div style="font-size:.78rem;color:var(--gray)">متأخرة ⚠</div>
        </div>
      </div>
    </div>
  </div>

  <!-- الجدول الزمني -->
  <div class="card">
    <div class="card-header"><span class="icon">📅</span><h2>الجدول الزمني للمسار</h2></div>
    <div class="card-body">
      <div class="timeline-grid">
        <div class="timeline-col">
          <div class="timeline-col-header" style="background:var(--green)">✓ أمس — ما تم إنجازه</div>
          <div class="timeline-col-body">${timelineItems(tDone.slice(0,5))}</div>
        </div>
        <div class="timeline-col">
          <div class="timeline-col-header" style="background:${acc}">⟳ اليوم — جاري التنفيذ</div>
          <div class="timeline-col-body">${timelineItems(tActiv.slice(0,5))}</div>
        </div>
        <div class="timeline-col">
          <div class="timeline-col-header" style="background:var(--teal)">○ غداً — مخطط</div>
          <div class="timeline-col-body">${timelineItems(tNext.slice(0,5))}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- قائمة المهام -->
  <div class="card">
    <div class="card-header"><span class="icon">📋</span><h2>تفاصيل الأنشطة والمهام</h2></div>
    <div class="card-body" style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          <th>#</th><th>النشاط / المخرج</th><th>المسؤول</th><th>الموعد</th><th>الإنجاز</th><th>الحالة</th>
        </tr></thead>
        <tbody>${taskRows || '<tr><td colspan="6" style="text-align:center;color:var(--gray);padding:24px">لا توجد مهام مسجّلة لهذا المسار</td></tr>'}</tbody>
      </table>
    </div>
  </div>

  <!-- المخاطر -->
  ${(riskRows) ? `
  <div class="card">
    <div class="card-header"><span class="icon">⚠️</span><h2>المخاطر والقضايا</h2></div>
    <div class="card-body">${riskRows}</div>
  </div>` : ""}

  ${reportFooter()}
</div>
</body></html>`;
}

// =========================================================
// الدالة الرئيسية
// =========================================================
async function generateReport(type, state) {
  let html;
  if (type === "comprehensive") {
    html = buildComprehensive(state);
  } else if (["أ","ب","ج","د"].includes(type)) {
    html = buildTrack(state, type);
  } else {
    throw new Error("نوع تقرير غير معروف: " + type);
  }
  return Buffer.from(html, "utf-8");
}

module.exports = { generateReport };
