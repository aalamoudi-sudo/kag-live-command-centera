"use strict";
/**
 * report-generator.js — HTML Daily Reports
 * تقارير يومية تنفيذية مبنية على بيانات النظام الحالية
 * الجدول الزمني: أمس/اليوم/غداً بحسب تاريخ due
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
const isRisk   = s => RISK_SET.includes(s);
const isRiskItem = i => ["risks","مخاطرة","مخاطر"].includes(i.type);

// ── تحديد اليوم وأمس وغداً ──────────────────────────────
function dateOnly(d){ return d.toISOString().slice(0,10); }
const TODAY     = dateOnly(new Date());
const YESTERDAY = dateOnly(new Date(Date.now() - 86400000));
const TOMORROW  = dateOnly(new Date(Date.now() + 86400000));

function dueBucket(due){
  if(!due) return null;
  const d = String(due).slice(0,10);
  if(d === TODAY)     return "today";
  if(d === YESTERDAY) return "yesterday";
  if(d === TOMORROW)  return "tomorrow";
  return null;
}

// فلتر أنشطة اليوم/أمس/غداً
function bucketItems(items){
  const yd=[], td=[], tm=[];
  items.forEach(i=>{
    const b = dueBucket(i.due);
    if(b==="yesterday") yd.push(i);
    else if(b==="today")    td.push(i);
    else if(b==="tomorrow") tm.push(i);
  });
  // إذا كانت الفلاتر فارغة نعتمد على الحالة
  const done   = yd.length ? yd : items.filter(i=>isDone(i.status)).slice(0,5);
  const active = td.length ? td : items.filter(i=>isActive(i.status)).slice(0,5);
  const next   = tm.length ? tm : items.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due)
                                       .sort((a,b)=>a.due>b.due?1:-1).slice(0,5);
  return {done, active, next};
}

function fmtDate(s){
  if(!s) return "—";
  try{ const d=new Date(s); return isNaN(d)?s:d.toLocaleDateString("ar-SA",{year:"numeric",month:"2-digit",day:"2-digit"}); }
  catch{ return s; }
}
function todayAr(){
  return new Date().toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function weekNum(){
  const d=new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d-new Date(d.getFullYear(),0,4))/(7*86400000))+1;
}

function badge(s){
  if(!s) return `<span class="b bg">—</span>`;
  if(isDone(s))   return `<span class="b gn">✓ ${s}</span>`;
  if(isActive(s)) return `<span class="b yw">${s}</span>`;
  if(isRisk(s))   return `<span class="b rd">⚠ ${s}</span>`;
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

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--nv:#08283B;--tl:#1C8D82;--gd:#C9A24A;--gn:#2FA65A;--rd:#D64D3F;--yw:#F0A500;--gr:#6B7280;--lt:#F4F6F8;--wh:#FFF;--br:#E5E7EB;--tx:#1F2937;--t2:#4B5563}
html{font-size:14px}
body{font-family:'Tajawal',sans-serif;direction:rtl;background:var(--lt);color:var(--tx);line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{
  body{background:#fff}.np{display:none!important}.pb{page-break-before:always}
  .card{box-shadow:none;border:1px solid var(--br)}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
.bar{position:fixed;top:0;right:0;left:0;z-index:1000;background:var(--nv);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 24px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.bar .t{font-size:1rem;font-weight:700;color:var(--gd)}
.bar .ax{display:flex;gap:8px}
.bp{background:var(--gd);color:var(--nv);border:none;padding:7px 18px;border-radius:6px;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer}.bp:hover{opacity:.85}
.bc{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);padding:7px 14px;border-radius:6px;font-family:inherit;font-size:.9rem;cursor:pointer}
.wrap{max-width:1100px;margin:60px auto 40px;padding:0 20px}
.rh{background:linear-gradient(135deg,var(--nv) 0%,#0d3547 100%);color:#fff;border-radius:16px;padding:36px 40px 32px;margin-bottom:28px;position:relative;overflow:hidden}
.rh::after{content:'';position:absolute;left:-60px;top:-60px;width:300px;height:300px;background:radial-gradient(circle,rgba(201,162,74,.15) 0%,transparent 70%);pointer-events:none}
.rh .pj{font-size:.85rem;color:rgba(255,255,255,.6);margin-bottom:6px}
.rh h1{font-size:2rem;font-weight:900;color:var(--gd);margin-bottom:8px}
.rh h1.accent{color:inherit}
.rh .mt{display:flex;gap:24px;flex-wrap:wrap;margin-top:16px}
.rh .mi{display:flex;flex-direction:column}
.rh .ml{font-size:.75rem;color:rgba(255,255,255,.5)}
.rh .mv{font-size:.95rem;font-weight:600;color:rgba(255,255,255,.9)}
.card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04);margin-bottom:20px;overflow:hidden}
.ch{padding:16px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--br)}
.ch .ic{font-size:1.1rem}.ch h2{font-size:1rem;font-weight:700;flex:1}
.cb{padding:20px}
.kg{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:20px}
.kc{background:#fff;border-radius:10px;padding:18px 16px;box-shadow:0 1px 3px rgba(0,0,0,.08);border-top:3px solid var(--br);text-align:center}
.kv{font-size:2.2rem;font-weight:900;line-height:1;margin-bottom:4px}.kl{font-size:.78rem;color:var(--t2)}
.kc.gn{border-top-color:var(--gn)}.kc.gn .kv{color:var(--gn)}
.kc.yw{border-top-color:var(--yw)}.kc.yw .kv{color:var(--yw)}
.kc.rd{border-top-color:var(--rd)}.kc.rd .kv{color:var(--rd)}
.kc.bl{border-top-color:var(--tl)}.kc.bl .kv{color:var(--tl)}
.kc.gd{border-top-color:var(--gd)}.kc.gd .kv{color:var(--gd)}
.kc.nv{border-top-color:var(--nv)}.kc.nv .kv{color:var(--nv)}
table{width:100%;border-collapse:collapse;font-size:.85rem}
th{background:var(--nv);color:#fff;padding:10px 12px;text-align:right;font-weight:600;font-size:.8rem;white-space:nowrap}
td{padding:9px 12px;border-bottom:1px solid var(--br);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--lt)}
.num{color:var(--gr);font-size:.8rem}
.pbw{display:flex;align-items:center;gap:8px}
.pbb{flex:1;height:8px;background:var(--br);border-radius:4px;overflow:hidden;min-width:60px}
.pbf{height:100%;border-radius:4px}
.pbl{font-size:.8rem;font-weight:700;min-width:36px;text-align:left}
.b{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:20px;font-size:.75rem;font-weight:600;white-space:nowrap}
.gn{background:#D1FAE5;color:#065F46}.yw{background:#FEF3C7;color:#92400E}
.rd{background:#FEE2E2;color:#991B1B}.bg{background:#F3F4F6;color:#6B7280}
/* الجدول الزمني */
.tg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.tc{border-radius:10px;overflow:hidden}
.tch{padding:12px 16px;font-weight:700;font-size:.85rem;color:#fff}
.tcb{padding:12px 16px;background:var(--lt);min-height:80px}
.ti{padding:8px 0;border-bottom:1px dashed var(--br)}
.ti:last-child{border-bottom:none}
.ti .tn{font-weight:600;font-size:.85rem}
.ti .tm{font-size:.75rem;color:var(--gr);margin-top:2px;display:flex;gap:8px;flex-wrap:wrap}
.no-items{color:var(--gr);font-size:.82rem;padding:8px 0}
/* المسارات في الشامل */
.trg{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.tm2{border-radius:10px;overflow:hidden;border:1px solid var(--br)}
.tmh{padding:14px 16px;display:flex;align-items:center;gap:10px}
.tmn{font-weight:700;font-size:.9rem;flex:1}
.tmb{padding:16px;background:#fff}
.tmk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.tk{text-align:center}.tk .v{font-size:1.4rem;font-weight:900}.tk .l{font-size:.7rem;color:var(--gr)}
/* المخاطر */
.rr{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--br)}
.rr:last-child{border-bottom:none}
.rdot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px}
/* القرارات */
.dcard{padding:12px 16px;border-radius:8px;border-right:4px solid var(--yw);background:var(--lt);margin-bottom:10px}
.dcard.open{border-right-color:var(--rd)}
.dcard .dt{font-weight:700;font-size:.87rem;margin-bottom:4px}
.dcard .dm{font-size:.78rem;color:var(--gr);display:flex;gap:12px;flex-wrap:wrap}
/* الملخص التنفيذي */
.exec-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.exec-item{padding:14px 16px;background:var(--lt);border-radius:8px}
.exec-item .el{font-size:.78rem;color:var(--gr);margin-bottom:4px}
.exec-item .ev{font-size:.95rem;font-weight:700}
/* تحذير الجدول الزمني */
.tl-note{font-size:.78rem;color:var(--gr);text-align:center;padding:6px;border-top:1px solid var(--br);margin-top:8px}
.ft{text-align:center;padding:24px;color:var(--gr);font-size:.8rem;margin-top:20px}
.ft strong{color:var(--nv)}
@media(max-width:700px){.trg,.tg,.exec-grid{grid-template-columns:1fr}.kg{grid-template-columns:repeat(3,1fr)}.rh h1{font-size:1.4rem}}
`;

function printBar(t){
  return `<div class="bar np"><span class="t">📊 ${t}</span><div class="ax"><button class="bp" onclick="window.print()">🖨️ طباعة / PDF</button><button class="bc" onclick="window.close()">✕</button></div></div>`;
}
function footer(){
  return `<div class="ft"><strong>مشروع افتتاح حدائق الملك عبدالله العالمية</strong> · تقرير مولّد تلقائياً · ${todayAr()} · الأسبوع ${weekNum()}</div>`;
}

function tlItems(arr, showTrack){
  if(!arr.length) return `<div class="no-items">لا يوجد بنود مجدولة</div>`;
  return arr.map(i=>`
    <div class="ti">
      <div class="tn">${i.title||"—"}</div>
      <div class="tm">
        ${showTrack?`<span>📌 ${TRACK_NAMES[i.track]||i.track}</span>`:""}
        <span>👤 ${i.owner||"—"}</span>
        <span>📅 ${fmtDate(i.due)}</span>
        ${badge(i.status)}
      </div>
    </div>`).join("");
}

function riskRows(risks){
  if(!risks.length) return `<div class="no-items">✅ لا توجد مخاطر مفتوحة</div>`;
  return risks.map(r=>`
    <div class="rr">
      <div class="rdot" style="background:${isRisk(r.status)?'var(--rd)':isDone(r.status)?'var(--gn)':'var(--yw)'}"></div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:.87rem">${r.title||"—"}</div>
        <div style="font-size:.78rem;color:var(--gr);margin-top:2px">
          ${r.owner?`👤 ${r.owner}`:""} ${r.due?`· 📅 ${fmtDate(r.due)}`:""}
        </div>
      </div>
      ${badge(r.status)}
    </div>`).join("");
}

function decisionCards(decisions){
  if(!decisions.length) return `<div class="no-items">لا توجد قرارات مفتوحة</div>`;
  return decisions.map(d=>`
    <div class="dcard ${d.status==='مفتوح'?'open':''}">
      <div class="dt">${d.title||"—"}</div>
      <div class="dm">
        <span>📌 ${TRACK_NAMES[d.track]||d.trackName||d.track||""}</span>
        ${d.owner?`<span>👤 ${d.owner}</span>`:""}
        ${d.due?`<span>📅 ${fmtDate(d.due)}</span>`:""}
        ${badge(d.status)}
      </div>
    </div>`).join("");
}

// ═══════════════════════════════════════════════════════════
// التقرير الشامل
// ═══════════════════════════════════════════════════════════
function buildComprehensive(state){
  const tracks   = state.tracks   || [];
  const items    = state.items    || [];
  const decisions= (state.decisions||[]).filter(d=>d.status!=="معتمد");
  const allLogs  = state.dailyLogs || [];

  const tasks   = items.filter(i=>!isRiskItem(i));
  const risks   = items.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const totDone = tasks.filter(i=>isDone(i.status)).length;
  const totAct  = tasks.filter(i=>isActive(i.status)).length;
  const totLate = tasks.filter(i=>isRisk(i.status)).length;
  const ovr     = tracks.length?Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length):0;

  // الجدول الزمني الكلي
  const {done:yd, active:td, next:tm} = bucketItems(tasks);

  // بطاقات المسارات
  const trackCards = tracks.map(t=>{
    const ti=items.filter(i=>i.track===t.id);
    const tT=ti.filter(i=>!isRiskItem(i)), tR=ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
    const tD=tT.filter(i=>isDone(i.status)).length, tA=tT.filter(i=>isActive(i.status)).length;
    const ac=TRACK_ACCENTS[t.id]||"var(--tl)";
    return `<div class="tm2">
      <div class="tmh" style="background:${ac}">
        <span class="tmn" style="color:#fff">${t.name||TRACK_NAMES[t.id]}</span>${tBadge(t.status)}
      </div>
      <div class="tmb">
        ${pbar(t.progress,ac)}
        <div class="tmk" style="margin-top:12px">
          <div class="tk"><div class="v" style="color:var(--nv)">${t.tasks||0}</div><div class="l">الإجمالي</div></div>
          <div class="tk"><div class="v" style="color:var(--gn)">${tD}</div><div class="l">منجزة</div></div>
          <div class="tk"><div class="v" style="color:var(--yw)">${tA}</div><div class="l">جارية</div></div>
          <div class="tk"><div class="v" style="color:var(--rd)">${tR.length}</div><div class="l">مخاطر</div></div>
        </div>
      </div></div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>التقرير الشامل اليومي — KAGA</title>
<style>${CSS}</style></head><body>
${printBar("التقرير الشامل اليومي")}
<div class="wrap">

  <div class="rh">
    <div class="pj">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1>التقرير الشامل اليومي</h1>
    <p style="color:rgba(255,255,255,.7);font-size:.88rem">نموذج تنفيذي — المسارات الأربعة · المخاطر · القرارات</p>
    <div class="mt">
      <div class="mi"><span class="ml">التاريخ</span><span class="mv">${todayAr()}</span></div>
      <div class="mi"><span class="ml">الأسبوع</span><span class="mv">${weekNum()}</span></div>
      <div class="mi"><span class="ml">الإنجاز الكلي</span><span class="mv" style="color:var(--gd)">${ovr}%</span></div>
    </div>
  </div>

  <!-- KPIs -->
  <div class="kg">
    <div class="kc nv"><div class="kv">${tasks.length}</div><div class="kl">إجمالي المهام</div></div>
    <div class="kc gn"><div class="kv">${totDone}</div><div class="kl">منجزة</div></div>
    <div class="kc yw"><div class="kv">${totAct}</div><div class="kl">قيد التنفيذ</div></div>
    <div class="kc rd"><div class="kv">${totLate}</div><div class="kl">متأخرة</div></div>
    <div class="kc gd"><div class="kv">${ovr}%</div><div class="kl">نسبة الإنجاز</div></div>
    <div class="kc bl"><div class="kv">${risks.length}</div><div class="kl">مخاطر مفتوحة</div></div>
  </div>

  <!-- المسارات -->
  <div class="card">
    <div class="ch"><span class="ic">🗂</span><h2>حالة المسارات الأربعة</h2></div>
    <div class="cb"><div class="trg">${trackCards}</div></div>
  </div>

  <!-- الجدول الزمني اليومي -->
  <div class="card">
    <div class="ch"><span class="ic">📅</span><h2>الجدول الزمني اليومي</h2></div>
    <div class="cb">
      <div class="tg">
        <div class="tc">
          <div class="tch" style="background:var(--gn)">✓ أمس — ما تم إنجازه</div>
          <div class="tcb">${tlItems(yd, true)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:var(--gd)">⟳ اليوم — جاري التنفيذ</div>
          <div class="tcb">${tlItems(td, true)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:var(--tl)">○ غداً — مخطط</div>
          <div class="tcb">${tlItems(tm, true)}</div>
        </div>
      </div>
      <div class="tl-note">يعرض البنود المجدولة بتاريخ أمس / اليوم / غداً — أو آخر البنود المنجزة والجارية إذا لم توجد تواريخ محددة</div>
    </div>
  </div>

  <!-- المخاطر -->
  <div class="card">
    <div class="ch"><span class="ic">⚠️</span><h2>المخاطر والقضايا المفتوحة</h2></div>
    <div class="cb">${riskRows(risks)}</div>
  </div>

  <!-- القرارات -->
  <div class="card">
    <div class="ch"><span class="ic">⚖️</span><h2>القرارات المطلوبة</h2></div>
    <div class="cb">${decisionCards(decisions)}</div>
  </div>

  ${footer()}
</div></body></html>`;
}

// ═══════════════════════════════════════════════════════════
// تقرير مسار
// ═══════════════════════════════════════════════════════════
function buildTrack(state, tid){
  const tracks   = state.tracks   || [];
  const items    = state.items    || [];
  const decisions= (state.decisions||[]).filter(d=>d.status!=="معتمد"&&(d.track===tid||!d.track));
  const logs     = (state.dailyLogs||[]).filter(l=>l.track===tid);
  const latestLog= logs[0] || null;

  const track = tracks.find(t=>t.id===tid||t.track===tid)||
                {id:tid,name:TRACK_NAMES[tid],progress:0,tasks:0,done:0,active:0,risk:0,status:"—",lead:"—",focus:"—"};
  const ac  = TRACK_ACCENTS[tid]||"var(--tl)";
  const nm  = track.name||TRACK_NAMES[tid]||tid;
  const pct = track.progress||0;

  const ti     = items.filter(i=>i.track===tid);
  const tT     = ti.filter(i=>!isRiskItem(i));
  const tR     = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const tDone  = tT.filter(i=>isDone(i.status)).length;
  const tActive= tT.filter(i=>isActive(i.status)).length;
  const tLate  = tT.filter(i=>isRisk(i.status)).length;

  // الجدول الزمني للمسار
  const {done:yd, active:td, next:tm} = bucketItems(tT);

  // الملخص من آخر تحديث يومي
  const execSummary = latestLog ? [
    {l:"المنجز", v: latestLog.done||"—"},
    {l:"المتأخر", v: latestLog.delayed||"—"},
    {l:"المخاطر", v: latestLog.risks||"—"},
    {l:"القرار المطلوب", v: latestLog.decision||"—"},
  ] : null;

  const execGrid = execSummary ? `
    <div class="exec-grid">
      ${execSummary.map(e=>`<div class="exec-item"><div class="el">${e.l}</div><div class="ev">${e.v}</div></div>`).join("")}
    </div>` : "";

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>تقرير مسار ${nm} — KAGA</title>
<style>${CSS}</style></head><body>
${printBar(`تقرير مسار: ${nm}`)}
<div class="wrap">

  <div class="rh">
    <div class="pj">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1 style="color:${ac}">${nm}</h1>
    <p style="color:rgba(255,255,255,.7);font-size:.88rem">
      ${track.focus||""} ${track.lead?`· ${track.lead}`:""}
    </p>
    <div class="mt">
      <div class="mi"><span class="ml">التاريخ</span><span class="mv">${todayAr()}</span></div>
      <div class="mi"><span class="ml">الحالة</span><span class="mv">${track.status||"—"}</span></div>
      <div class="mi"><span class="ml">الإنجاز</span><span class="mv" style="color:${ac}">${pct}%</span></div>
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
    <div class="ch" style="background:${ac}15;border-bottom-color:${ac}30">
      <span class="ic">📊</span><h2>الوضع التنفيذي للمسار</h2>
    </div>
    <div class="cb">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-weight:700;font-size:1rem">${nm}</span>
        ${tBadge(track.status)}
      </div>
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px">
          <span>نسبة الإنجاز</span>
          <span style="font-weight:900;color:${ac}">${pct}%</span>
        </div>
        <div class="pbb" style="height:14px"><div class="pbf" style="width:${pct}%;background:${ac};height:14px"></div></div>
      </div>
      ${execGrid}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px;text-align:center">
        <div style="padding:10px;background:var(--lt);border-radius:8px">
          <div style="font-size:1.4rem;font-weight:900;color:var(--gn)">${tDone}</div>
          <div style="font-size:.75rem;color:var(--gr)">مكتملة ✓</div>
        </div>
        <div style="padding:10px;background:var(--lt);border-radius:8px">
          <div style="font-size:1.4rem;font-weight:900;color:var(--yw)">${tActive}</div>
          <div style="font-size:.75rem;color:var(--gr)">جارية ⟳</div>
        </div>
        <div style="padding:10px;background:var(--lt);border-radius:8px">
          <div style="font-size:1.4rem;font-weight:900;color:var(--rd)">${tLate}</div>
          <div style="font-size:.75rem;color:var(--gr)">متأخرة ⚠</div>
        </div>
      </div>
    </div>
  </div>

  <!-- الجدول الزمني اليومي -->
  <div class="card">
    <div class="ch"><span class="ic">📅</span><h2>الجدول الزمني اليومي للمسار</h2></div>
    <div class="cb">
      <div class="tg">
        <div class="tc">
          <div class="tch" style="background:var(--gn)">✓ أمس — ما تم إنجازه</div>
          <div class="tcb">${tlItems(yd, false)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:${ac}">⟳ اليوم — جاري التنفيذ</div>
          <div class="tcb">${tlItems(td, false)}</div>
        </div>
        <div class="tc">
          <div class="tch" style="background:var(--tl)">○ غداً — مخطط</div>
          <div class="tcb">${tlItems(tm, false)}</div>
        </div>
      </div>
      <div class="tl-note">يعرض البنود المجدولة بتاريخ أمس / اليوم / غداً — أو آخر البنود المنجزة والجارية إذا لم توجد تواريخ محددة</div>
    </div>
  </div>

  <!-- المخاطر -->
  <div class="card">
    <div class="ch"><span class="ic">⚠️</span><h2>المخاطر والقضايا</h2></div>
    <div class="cb">${riskRows(tR)}</div>
  </div>

  <!-- القرارات -->
  <div class="card">
    <div class="ch"><span class="ic">⚖️</span><h2>القرارات المطلوبة</h2></div>
    <div class="cb">${decisionCards(decisions)}</div>
  </div>

  ${footer()}
</div></body></html>`;
}

// ─── الدالة الرئيسية ──────────────────────────────────────
async function generateReport(type, state){
  let html;
  if(type==="comprehensive") html=buildComprehensive(state);
  else if(["أ","ب","ج","د"].includes(type)) html=buildTrack(state,type);
  else throw new Error("نوع تقرير غير معروف: "+type);
  return Buffer.from(html,"utf-8");
}

module.exports = { generateReport };
