"use strict";
/**
 * report-generator.js — HTML Daily Reports v3
 * - الجدول الزمني مبني على تاريخ التقرير (أمس/اليوم/غداً)
 * - ارتفاع الأقسام يتكيف مع المحتوى
 * - رسائل واضحة عند غياب البيانات
 * - PDF جاهز عبر window.print()
 * - لا PPTX، لا Python، لا dependencies
 */

const TRACK_NAMES = {
  "أ":"التخطيط والتنسيق","ب":"التواصل والتسويق",
  "ج":"الفعاليات والأنشطة المصاحبة","د":"تجهيز وتفعيل الحديقة"
};
const TRACK_ACCENTS = {"أ":"#7E6BFF","ب":"#A98BFF","ج":"#D9B86C","د":"#6454C8"};
const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];

const isDone   = s => DONE_SET.includes(s);
const isActive = s => ACTIVE_SET.includes(s);
const isRiskS  = s => RISK_SET.includes(s);
const isRiskItem = i => ["risks","مخاطرة","مخاطر"].includes(i.type);

// ── تحديد الحواجز الزمنية بناءً على تاريخ التقرير ─────────
function getDateBuckets(reportDate) {
  const base = reportDate ? new Date(reportDate) : new Date();
  base.setHours(0,0,0,0);
  const d = n => { const x = new Date(base); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  return { yesterday: d(-1), today: d(0), tomorrow: d(1), base };
}

function bucketItems(items, buckets) {
  const {yesterday, today, tomorrow} = buckets;
  const yd=[], td=[], tm=[];
  items.forEach(i => {
    const due = i.due ? String(i.due).slice(0,10) : null;
    if(due === yesterday) yd.push(i);
    else if(due === today)    td.push(i);
    else if(due === tomorrow) tm.push(i);
  });
  // fallback على الحالة إذا لا توجد بنود بتاريخ محدد
  const done   = yd.length ? yd : items.filter(i=>isDone(i.status)).slice(0,6);
  const active = td.length ? td : items.filter(i=>isActive(i.status)).slice(0,6);
  const next   = tm.length ? tm : items.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due)
                                       .sort((a,b)=>a.due>b.due?1:-1).slice(0,6);
  return {done, active, next, hasExactDates: yd.length>0||td.length>0||tm.length>0};
}

// ── مساعدات ─────────────────────────────────────────────────
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
  if(!s) return `<span class="b bg">—</span>`;
  if(isDone(s))   return `<span class="b gn">✓ ${s}</span>`;
  if(isActive(s)) return `<span class="b yw">${s}</span>`;
  if(isRiskS(s))  return `<span class="b rd">⚠ ${s}</span>`;
  return `<span class="b bg">${s}</span>`;
}
function tBadge(s){
  if(s==="ضمن المسار")   return `<span class="b gn">✓ ${s}</span>`;
  if(s==="تحت المتابعة") return `<span class="b yw">${s}</span>`;
  if(s==="معرض للخطر")  return `<span class="b rd">⚠ ${s}</span>`;
  return `<span class="b bg">${s||"—"}</span>`;
}
function pbar(pct,col){
  const p=Math.min(100,Math.max(0,pct||0)), c=col||"#7E6BFF";
  return `<div class="pbw"><div class="pbb"><div class="pbf" style="width:${p}%;background:${c}"></div></div><span class="pbl" style="color:${c}">${p}%</span></div>`;
}

// ── CSS ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--nv:#08283B;--tl:#1C8D82;--gd:#C9A24A;--gn:#2FA65A;--rd:#D64D3F;--yw:#F0A500;--gr:#6B7280;--lt:#F4F6F8;--br:#E5E7EB;--tx:#1F2937;--t2:#4B5563}
html{font-size:14px}
body{font-family:'Tajawal',sans-serif;direction:rtl;background:var(--lt);color:var(--tx);line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{
  body{background:#fff;font-size:11px}
  .np{display:none!important}
  .card{box-shadow:none!important;border:1px solid #ddd!important;break-inside:avoid}
  .tg{grid-template-columns:1fr 1fr 1fr}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  @page{margin:15mm;size:A4}
}
/* شريط الأدوات */
.bar{position:fixed;top:0;right:0;left:0;z-index:1000;background:var(--nv);color:#fff;
  display:flex;align-items:center;justify-content:space-between;padding:10px 24px;gap:12px;
  box-shadow:0 2px 8px rgba(0,0,0,.3)}
.bar .t{font-size:1rem;font-weight:700;color:var(--gd)}
.bar .ax{display:flex;gap:8px}
.bp{background:var(--gd);color:var(--nv);border:none;padding:7px 20px;border-radius:6px;
  font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px}
.bp:hover{opacity:.85}
.bc{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);
  padding:7px 14px;border-radius:6px;font-family:inherit;font-size:.9rem;cursor:pointer}
/* هيكل الصفحة */
.wrap{max-width:1050px;margin:60px auto 40px;padding:0 20px}
/* رأس التقرير */
.rh{background:linear-gradient(135deg,var(--nv) 0%,#0d3547 100%);color:#fff;
  border-radius:16px;padding:32px 36px 28px;margin-bottom:24px;position:relative;overflow:hidden}
.rh::after{content:'';position:absolute;left:-60px;top:-60px;width:280px;height:280px;
  background:radial-gradient(circle,rgba(201,162,74,.15) 0%,transparent 70%);pointer-events:none}
.rh .pj{font-size:.82rem;color:rgba(255,255,255,.55);margin-bottom:5px}
.rh h1{font-size:1.8rem;font-weight:900;color:var(--gd);margin-bottom:6px}
.rh .sub{color:rgba(255,255,255,.65);font-size:.85rem;margin-bottom:12px}
.rh .mt{display:flex;gap:20px;flex-wrap:wrap}
.rh .mi{display:flex;flex-direction:column}
.rh .ml{font-size:.72rem;color:rgba(255,255,255,.45)}
.rh .mv{font-size:.9rem;font-weight:600;color:rgba(255,255,255,.9)}
/* بطاقات */
.card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.07),0 4px 12px rgba(0,0,0,.04);
  margin-bottom:18px;overflow:hidden}
.ch{padding:14px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--br)}
.ch .ic{font-size:1rem}.ch h2{font-size:.95rem;font-weight:700;flex:1}
.cb{padding:18px}
/* KPIs */
.kg{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px}
@media(max-width:900px){.kg{grid-template-columns:repeat(3,1fr)}}
.kc{background:#fff;border-radius:10px;padding:14px 12px;box-shadow:0 1px 3px rgba(0,0,0,.07);
  border-top:3px solid var(--br);text-align:center}
.kv{font-size:2rem;font-weight:900;line-height:1;margin-bottom:3px}
.kl{font-size:.72rem;color:var(--t2);line-height:1.3}
.kc.gn{border-top-color:var(--gn)}.kc.gn .kv{color:var(--gn)}
.kc.yw{border-top-color:var(--yw)}.kc.yw .kv{color:var(--yw)}
.kc.rd{border-top-color:var(--rd)}.kc.rd .kv{color:var(--rd)}
.kc.bl{border-top-color:var(--tl)}.kc.bl .kv{color:var(--tl)}
.kc.gd{border-top-color:var(--gd)}.kc.gd .kv{color:var(--gd)}
.kc.nv{border-top-color:var(--nv)}.kc.nv .kv{color:var(--nv)}
/* الجدول الزمني */
.tg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
.tc{border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
.tch{padding:10px 14px;font-weight:700;font-size:.83rem;color:#fff;flex-shrink:0}
.tcb{padding:12px 14px;background:var(--lt);flex:1}
/* بنود الجدول الزمني */
.ti{padding:8px 0;border-bottom:1px dashed var(--br)}
.ti:last-child{border-bottom:none}
.ti .tn{font-weight:600;font-size:.83rem;margin-bottom:3px}
.ti .tm2{font-size:.73rem;color:var(--gr);display:flex;gap:6px;flex-wrap:wrap;align-items:center}
/* رسالة "لا يوجد" */
.empty{color:var(--gr);font-size:.82rem;padding:6px 0;font-style:italic}
/* شريط التقدم */
.pbw{display:flex;align-items:center;gap:8px}
.pbb{flex:1;height:8px;background:var(--br);border-radius:4px;overflow:hidden;min-width:50px}
.pbf{height:100%;border-radius:4px}
.pbl{font-size:.8rem;font-weight:700;min-width:34px;text-align:left}
/* Badges */
.b{display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:16px;font-size:.72rem;font-weight:600;white-space:nowrap}
.gn{background:#D1FAE5;color:#065F46}.yw{background:#FEF3C7;color:#92400E}
.rd{background:#FEE2E2;color:#991B1B}.bg{background:#F3F4F6;color:#6B7280}
/* المسارات في الشامل */
.trg{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.tm{border-radius:10px;overflow:hidden;border:1px solid var(--br)}
.tmh{padding:12px 14px;display:flex;align-items:center;gap:8px}
.tmn{font-weight:700;font-size:.88rem;flex:1}
.tmb{padding:14px;background:#fff}
.tmk{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.tk{text-align:center}.tk .v{font-size:1.3rem;font-weight:900}.tk .l{font-size:.68rem;color:var(--gr)}
/* المخاطر */
.rr{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid var(--br)}
.rr:last-child{border-bottom:none}
.rdot{width:9px;height:9px;border-radius:50%;flex-shrink:0;margin-top:4px}
/* القرارات */
.dc{padding:11px 14px;border-radius:8px;border-right:4px solid var(--yw);background:var(--lt);margin-bottom:8px}
.dc:last-child{margin-bottom:0}
.dc.open{border-right-color:var(--rd)}
.dc .dt{font-weight:700;font-size:.85rem;margin-bottom:3px}
.dc .dm{font-size:.75rem;color:var(--gr);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
/* الملخص التنفيذي */
.eg{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px}
.ei{padding:12px 14px;background:var(--lt);border-radius:8px}
.ei .el{font-size:.73rem;color:var(--gr);margin-bottom:3px}
.ei .ev{font-size:.9rem;font-weight:700}
/* تذييل الجدول الزمني */
.tl-note{font-size:.73rem;color:var(--gr);text-align:center;padding:6px 0;margin-top:8px;
  border-top:1px solid var(--br);font-style:italic}
/* تذييل التقرير */
.ft{text-align:center;padding:20px;color:var(--gr);font-size:.77rem;margin-top:16px;
  border-top:1px solid var(--br)}
.ft strong{color:var(--nv)}
@media(max-width:700px){.trg,.tg,.eg{grid-template-columns:1fr}.rh h1{font-size:1.4rem}}
`;

// ── مكونات مشتركة ──────────────────────────────────────────
function printBar(title){
  return `<div class="bar np">
    <span class="t">📋 ${title}</span>
    <div class="ax">
      <button class="bp" onclick="window.print()">⬇ تصدير PDF / طباعة</button>
      <button class="bc" onclick="window.close()">✕</button>
    </div>
  </div>`;
}

function footer(base){
  return `<div class="ft">
    <strong>مشروع افتتاح حدائق الملك عبدالله العالمية</strong>
    &nbsp;·&nbsp; تقرير يومي بتاريخ ${todayAr(base)}
    &nbsp;·&nbsp; الأسبوع ${weekNum(base)}
  </div>`;
}

function tlItems(arr, showTrack){
  if(!arr.length) return `<div class="empty">لا توجد بنود مجدولة لهذا اليوم</div>`;
  return arr.map(i=>`
    <div class="ti">
      <div class="tn">${i.title||"—"}</div>
      <div class="tm2">
        ${showTrack?`<span>📌 ${TRACK_NAMES[i.track]||i.track}</span>`:""}
        <span>👤 ${i.owner||"—"}</span>
        <span>📅 ${fmtDate(i.due)}</span>
        ${badge(i.status)}
      </div>
    </div>`).join("");
}

function renderRisks(risks){
  if(!risks.length) return `<div class="empty">✅ لا توجد مخاطر مفتوحة</div>`;
  return risks.map(r=>`
    <div class="rr">
      <div class="rdot" style="background:${isRiskS(r.status)?'var(--rd)':isDone(r.status)?'var(--gn)':'var(--yw)'}"></div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.85rem">${r.title||"—"}</div>
        <div style="font-size:.74rem;color:var(--gr);margin-top:2px">
          ${r.owner?`👤 ${r.owner}`:""} ${r.due?`· 📅 ${fmtDate(r.due)}`:""}
        </div>
      </div>
      ${badge(r.status)}
    </div>`).join("");
}

function renderDecisions(decisions){
  if(!decisions.length) return `<div class="empty">✅ لا توجد قرارات مطلوبة</div>`;
  return decisions.map(d=>`
    <div class="dc ${d.status==='مفتوح'?'open':''}">
      <div class="dt">${d.title||"—"}</div>
      <div class="dm">
        ${TRACK_NAMES[d.track]||d.trackName?`<span>📌 ${TRACK_NAMES[d.track]||d.trackName||d.track}</span>`:""}
        ${d.owner?`<span>👤 ${d.owner}</span>`:""}
        ${d.due?`<span>📅 ${fmtDate(d.due)}</span>`:""}
        ${badge(d.status)}
      </div>
    </div>`).join("");
}

// ══════════════════════════════════════════════════════════════
// التقرير الشامل
// ══════════════════════════════════════════════════════════════
function buildComprehensive(state, reportDate){
  const buckets  = getDateBuckets(reportDate);
  const tracks   = state.tracks   || [];
  const items    = state.items    || [];
  const decisions= (state.decisions||[]).filter(d=>d.status!=="معتمد");

  const tasks  = items.filter(i=>!isRiskItem(i));
  const risks  = items.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const totDone= tasks.filter(i=>isDone(i.status)).length;
  const totAct = tasks.filter(i=>isActive(i.status)).length;
  const totLate= tasks.filter(i=>isRiskS(i.status)).length;
  const ovr    = tracks.length?Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length):0;

  const {done:yd, active:td, next:tm, hasExactDates} = bucketItems(tasks, buckets);

  const trackCards = tracks.map(t=>{
    const ti=items.filter(i=>i.track===t.id);
    const tT=ti.filter(i=>!isRiskItem(i)), tR=ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
    const tD=tT.filter(i=>isDone(i.status)).length, tA=tT.filter(i=>isActive(i.status)).length;
    const ac=TRACK_ACCENTS[t.id]||"var(--tl)";
    return `<div class="tm">
      <div class="tmh" style="background:${ac}">
        <span class="tmn" style="color:#fff">${t.name||TRACK_NAMES[t.id]}</span>${tBadge(t.status)}
      </div>
      <div class="tmb">
        ${pbar(t.progress,ac)}
        <div class="tmk">
          <div class="tk"><div class="v" style="color:var(--nv)">${t.tasks||0}</div><div class="l">الإجمالي</div></div>
          <div class="tk"><div class="v" style="color:var(--gn)">${tD}</div><div class="l">منجزة</div></div>
          <div class="tk"><div class="v" style="color:var(--yw)">${tA}</div><div class="l">جارية</div></div>
          <div class="tk"><div class="v" style="color:var(--rd)">${tR.length}</div><div class="l">مخاطر</div></div>
        </div>
      </div></div>`;
  }).join("");

  const tlNote = hasExactDates
    ? `يعرض البنود المجدولة بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `لا توجد بنود بتواريخ محددة لهذه الفترة — يعرض آخر البنود المنجزة والجارية والقادمة`;

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>التقرير الشامل — ${todayAr(buckets.base)}</title>
<style>${CSS}</style></head><body>
${printBar("التقرير الشامل اليومي")}
<div class="wrap">

  <div class="rh">
    <div class="pj">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1>التقرير الشامل اليومي</h1>
    <div class="sub">نموذج تنفيذي — المسارات الأربعة · المخاطر · القرارات</div>
    <div class="mt">
      <div class="mi"><span class="ml">التاريخ</span><span class="mv">${todayAr(buckets.base)}</span></div>
      <div class="mi"><span class="ml">الأسبوع</span><span class="mv">${weekNum(buckets.base)}</span></div>
      <div class="mi"><span class="ml">إجمالي الإنجاز</span><span class="mv" style="color:var(--gd)">${ovr}%</span></div>
    </div>
  </div>

  <div class="kg">
    <div class="kc nv"><div class="kv">${tasks.length}</div><div class="kl">إجمالي المهام</div></div>
    <div class="kc gn"><div class="kv">${totDone}</div><div class="kl">منجزة</div></div>
    <div class="kc yw"><div class="kv">${totAct}</div><div class="kl">قيد التنفيذ</div></div>
    <div class="kc rd"><div class="kv">${totLate}</div><div class="kl">متأخرة</div></div>
    <div class="kc gd"><div class="kv">${ovr}%</div><div class="kl">نسبة الإنجاز</div></div>
    <div class="kc bl"><div class="kv">${risks.length}</div><div class="kl">مخاطر مفتوحة</div></div>
  </div>

  <div class="card">
    <div class="ch"><span class="ic">🗂</span><h2>حالة المسارات الأربعة</h2></div>
    <div class="cb"><div class="trg">${trackCards}</div></div>
  </div>

  <div class="card">
    <div class="ch"><span class="ic">📅</span><h2>الجدول الزمني اليومي</h2></div>
    <div class="cb">
      <div class="tg">
        <div class="tc">
          <div class="tch" style="background:var(--gn)">✓ أمس — ${fmtDate(buckets.yesterday)}</div>
          <div class="tcb">${tlItems(yd, true)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:var(--gd)">⟳ اليوم — ${fmtDate(buckets.today)}</div>
          <div class="tcb">${tlItems(td, true)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:var(--tl)">○ غداً — ${fmtDate(buckets.tomorrow)}</div>
          <div class="tcb">${tlItems(tm, true)}</div>
        </div>
      </div>
      <div class="tl-note">${tlNote}</div>
    </div>
  </div>

  <div class="card">
    <div class="ch"><span class="ic">⚠️</span><h2>المخاطر والقضايا المفتوحة</h2></div>
    <div class="cb">${renderRisks(risks)}</div>
  </div>

  <div class="card">
    <div class="ch"><span class="ic">⚖️</span><h2>القرارات المطلوبة</h2></div>
    <div class="cb">${renderDecisions(decisions)}</div>
  </div>

  ${footer(buckets.base)}
</div></body></html>`;
}

// ══════════════════════════════════════════════════════════════
// تقرير مسار
// ══════════════════════════════════════════════════════════════
function buildTrack(state, tid, reportDate){
  const buckets  = getDateBuckets(reportDate);
  const tracks   = state.tracks   || [];
  const items    = state.items    || [];
  const decisions= (state.decisions||[]).filter(d=>d.status!=="معتمد"&&(d.track===tid||!d.track));
  const logs     = (state.dailyLogs||[]).filter(l=>l.track===tid);
  const latestLog= logs[0]||null;

  const track = tracks.find(t=>t.id===tid||t.track===tid)||
    {id:tid,name:TRACK_NAMES[tid],progress:0,tasks:0,done:0,active:0,risk:0,status:"—",lead:"—",focus:"—"};
  const ac  = TRACK_ACCENTS[tid]||"var(--tl)";
  const nm  = track.name||TRACK_NAMES[tid]||tid;
  const pct = track.progress||0;

  const ti      = items.filter(i=>i.track===tid);
  const tT      = ti.filter(i=>!isRiskItem(i));
  const tR      = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const tDone   = tT.filter(i=>isDone(i.status)).length;
  const tActive = tT.filter(i=>isActive(i.status)).length;
  const tLate   = tT.filter(i=>isRiskS(i.status)).length;

  const {done:yd, active:td, next:tm, hasExactDates} = bucketItems(tT, buckets);

  const tlNote = hasExactDates
    ? `يعرض البنود المجدولة بتاريخ ${fmtDate(buckets.yesterday)} / ${fmtDate(buckets.today)} / ${fmtDate(buckets.tomorrow)}`
    : `لا توجد بنود بتواريخ محددة لهذه الفترة — يعرض آخر البنود المنجزة والجارية والقادمة`;

  // الملخص التنفيذي من آخر تحديث يومي
  const execGrid = latestLog ? `
    <div class="eg">
      <div class="ei"><div class="el">📌 المنجز</div><div class="ev">${latestLog.done||"—"}</div></div>
      <div class="ei"><div class="el">⏱ المتأخر</div><div class="ev">${latestLog.delayed||"—"}</div></div>
      <div class="ei"><div class="el">⚠ المخاطر</div><div class="ev">${latestLog.risks||"—"}</div></div>
      <div class="ei"><div class="el">⚖ القرار المطلوب</div><div class="ev">${latestLog.decision||"—"}</div></div>
    </div>` : "";

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>مسار ${nm} — ${todayAr(buckets.base)}</title>
<style>${CSS}</style></head><body>
${printBar(`تقرير مسار: ${nm}`)}
<div class="wrap">

  <div class="rh">
    <div class="pj">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1 style="color:${ac}">${nm}</h1>
    <div class="sub">${track.focus||""} ${track.lead?`· ${track.lead}`:""}</div>
    <div class="mt">
      <div class="mi"><span class="ml">التاريخ</span><span class="mv">${todayAr(buckets.base)}</span></div>
      <div class="mi"><span class="ml">الحالة</span><span class="mv">${track.status||"—"}</span></div>
      <div class="mi"><span class="ml">نسبة الإنجاز</span><span class="mv" style="color:${ac}">${pct}%</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kg">
    <div class="kc nv"><div class="kv">${tT.length}</div><div class="kl">إجمالي المهام</div></div>
    <div class="kc gn"><div class="kv">${tDone}</div><div class="kl">منجزة</div></div>
    <div class="kc yw"><div class="kv">${tActive}</div><div class="kl">قيد التنفيذ</div></div>
    <div class="kc rd"><div class="kv">${tLate}</div><div class="kl">متأخرة</div></div>
    <div class="kc gd"><div class="kv">${pct}%</div><div class="kl">نسبة الإنجاز</div></div>
    <div class="kc bl"><div class="kv">${tR.length}</div><div class="kl">مخاطر مفتوحة</div></div>
  </div>

  <!-- الوضع التنفيذي -->
  <div class="card">
    <div class="ch" style="background:${ac}12;border-bottom-color:${ac}25">
      <span class="ic">📊</span><h2>الوضع التنفيذي للمسار</h2>
    </div>
    <div class="cb">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700">${nm}</span>${tBadge(track.status)}
      </div>
      <div style="margin-bottom:${execGrid?'14px':'0'}">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:.85rem">نسبة الإنجاز الإجمالية</span>
          <span style="font-weight:900;color:${ac}">${pct}%</span>
        </div>
        <div class="pbb" style="height:12px"><div class="pbf" style="width:${pct}%;background:${ac};height:12px"></div></div>
      </div>
      ${execGrid}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:${execGrid?'0':'14px'}">
        <div style="padding:10px;background:var(--lt);border-radius:8px;text-align:center">
          <div style="font-size:1.4rem;font-weight:900;color:var(--gn)">${tDone}</div>
          <div style="font-size:.73rem;color:var(--gr)">مكتملة ✓</div>
        </div>
        <div style="padding:10px;background:var(--lt);border-radius:8px;text-align:center">
          <div style="font-size:1.4rem;font-weight:900;color:var(--yw)">${tActive}</div>
          <div style="font-size:.73rem;color:var(--gr)">جارية ⟳</div>
        </div>
        <div style="padding:10px;background:var(--lt);border-radius:8px;text-align:center">
          <div style="font-size:1.4rem;font-weight:900;color:var(--rd)">${tLate}</div>
          <div style="font-size:.73rem;color:var(--gr)">متأخرة ⚠</div>
        </div>
      </div>
    </div>
  </div>

  <!-- الجدول الزمني اليومي -->
  <div class="card">
    <div class="ch"><span class="ic">📅</span><h2>الجدول الزمني اليومي</h2></div>
    <div class="cb">
      <div class="tg">
        <div class="tc">
          <div class="tch" style="background:var(--gn)">✓ أمس — ${fmtDate(buckets.yesterday)}</div>
          <div class="tcb">${tlItems(yd, false)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:${ac}">⟳ اليوم — ${fmtDate(buckets.today)}</div>
          <div class="tcb">${tlItems(td, false)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:var(--tl)">○ غداً — ${fmtDate(buckets.tomorrow)}</div>
          <div class="tcb">${tlItems(tm, false)}</div>
        </div>
      </div>
      <div class="tl-note">${tlNote}</div>
    </div>
  </div>

  <!-- المخاطر -->
  <div class="card">
    <div class="ch"><span class="ic">⚠️</span><h2>المخاطر والقضايا</h2></div>
    <div class="cb">${renderRisks(tR)}</div>
  </div>

  <!-- القرارات -->
  <div class="card">
    <div class="ch"><span class="ic">⚖️</span><h2>القرارات المطلوبة</h2></div>
    <div class="cb">${renderDecisions(decisions)}</div>
  </div>

  ${footer(buckets.base)}
</div></body></html>`;
}

// ── الدالة الرئيسية ──────────────────────────────────────────
async function generateReport(type, state){
  // تاريخ التقرير: يأتي من state.reportDate إذا أُرسل، وإلا اليوم
  const reportDate = state.reportDate || null;
  let html;
  if(type==="comprehensive") html=buildComprehensive(state, reportDate);
  else if(["أ","ب","ج","د"].includes(type)) html=buildTrack(state, type, reportDate);
  else throw new Error("نوع تقرير غير معروف: "+type);
  return Buffer.from(html,"utf-8");
}

module.exports = { generateReport };
