"use strict";
/**
 * report-generator.js — HTML Reports (بدون PPTX أو Python)
 * يولّد تقارير HTML احترافية قابلة للطباعة مباشرة من Node.js
 */

const TRACK_NAMES = {
  "أ": "التخطيط والتنسيق",
  "ب": "التواصل والتسويق",
  "ج": "الفعاليات والأنشطة المصاحبة",
  "د": "تجهيز وتفعيل الحديقة",
};
const TRACK_ACCENTS = { "أ":"#7E6BFF","ب":"#A98BFF","ج":"#D9B86C","د":"#6454C8" };
const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];

const isDone   = s => DONE_SET.includes(s);
const isActive = s => ACTIVE_SET.includes(s);
const isRisk   = s => RISK_SET.includes(s);
const isRiskItem = i => ["risks","مخاطرة","مخاطر"].includes(i.type);

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
:root{--nv:#08283B;--tl:#1C8D82;--gd:#C9A24A;--gn:#2FA65A;--rd:#D64D3F;--yw:#F0A500;--gr:#6B7280;--lt:#F4F6F8;--wh:#FFFFFF;--br:#E5E7EB;--tx:#1F2937;--t2:#4B5563}
html{font-size:14px}
body{font-family:'Tajawal',sans-serif;direction:rtl;background:var(--lt);color:var(--tx);line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@media print{
  body{background:#fff}
  .np{display:none!important}
  .pb{page-break-before:always}
  .card{box-shadow:none;border:1px solid var(--br)}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
.bar{position:fixed;top:0;right:0;left:0;z-index:1000;background:var(--nv);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 24px;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)}
.bar .t{font-size:1rem;font-weight:700;color:var(--gd)}
.bar .ax{display:flex;gap:8px}
.bp{background:var(--gd);color:var(--nv);border:none;padding:7px 18px;border-radius:6px;font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer}
.bp:hover{opacity:.85}
.bc{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2);padding:7px 14px;border-radius:6px;font-family:inherit;font-size:.9rem;cursor:pointer}
.wrap{max-width:1100px;margin:60px auto 40px;padding:0 20px}
.rh{background:linear-gradient(135deg,var(--nv) 0%,#0d3547 100%);color:#fff;border-radius:16px;padding:36px 40px 32px;margin-bottom:28px;position:relative;overflow:hidden}
.rh::after{content:'';position:absolute;left:-60px;top:-60px;width:300px;height:300px;background:radial-gradient(circle,rgba(201,162,74,.15) 0%,transparent 70%);pointer-events:none}
.rh .pj{font-size:.85rem;color:rgba(255,255,255,.6);margin-bottom:6px}
.rh h1{font-size:2rem;font-weight:900;color:var(--gd);margin-bottom:8px}
.rh .mt{display:flex;gap:24px;flex-wrap:wrap;margin-top:16px}
.rh .mi{display:flex;flex-direction:column}
.rh .ml{font-size:.75rem;color:rgba(255,255,255,.5)}
.rh .mv{font-size:.95rem;font-weight:600;color:rgba(255,255,255,.9)}
.card{background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.04);margin-bottom:20px;overflow:hidden}
.ch{padding:16px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--br)}
.ch .ic{font-size:1.1rem}
.ch h2{font-size:1rem;font-weight:700;flex:1}
.cb{padding:20px}
.kg{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:14px;margin-bottom:20px}
.kc{background:#fff;border-radius:10px;padding:18px 16px;box-shadow:0 1px 3px rgba(0,0,0,.08);border-top:3px solid var(--br);text-align:center}
.kv{font-size:2.2rem;font-weight:900;line-height:1;margin-bottom:4px}
.kl{font-size:.78rem;color:var(--t2)}
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
.tg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.tc{border-radius:10px;overflow:hidden}
.tch{padding:12px 16px;font-weight:700;font-size:.85rem;color:#fff}
.tcb{padding:12px 16px;background:var(--lt);min-height:80px}
.ti{padding:6px 0;border-bottom:1px dashed var(--br);font-size:.83rem}
.ti:last-child{border-bottom:none}
.tio{font-size:.75rem;color:var(--gr)}
.trg{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.tm{border-radius:10px;overflow:hidden;border:1px solid var(--br)}
.tmh{padding:14px 16px;display:flex;align-items:center;gap:10px}
.tmn{font-weight:700;font-size:.9rem;flex:1}
.tmb{padding:16px;background:#fff}
.tmk{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
.tk .v{font-size:1.4rem;font-weight:900}.tk .l{font-size:.7rem;color:var(--gr)}
.rr{display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--br)}
.rr:last-child{border-bottom:none}
.rd2{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px}
.ft{text-align:center;padding:24px;color:var(--gr);font-size:.8rem;margin-top:20px}
.ft strong{color:var(--nv)}
@media(max-width:700px){.trg,.tg{grid-template-columns:1fr}.kg{grid-template-columns:repeat(3,1fr)}.rh h1{font-size:1.4rem}}
`;

function printBar(title){
  return `<div class="bar np"><span class="t">📊 ${title}</span><div class="ax"><button class="bp" onclick="window.print()">🖨️ طباعة / PDF</button><button class="bc" onclick="window.close()">✕</button></div></div>`;
}

function footer(){
  return `<div class="ft"><strong>مشروع افتتاح حدائق الملك عبدالله العالمية</strong> · تقرير مولّد تلقائياً · ${todayAr()} · الأسبوع ${weekNum()}</div>`;
}

function tlItems(arr){
  if(!arr.length) return `<div style="color:var(--gr);font-size:.82rem;padding:8px 0">لا يوجد بنود</div>`;
  return arr.map(i=>`<div class="ti"><div>${i.title}</div><div class="tio">${i.owner||""}</div></div>`).join("");
}

// ─── التقرير الشامل ───────────────────────────────────────
function buildComprehensive(state){
  const tracks=state.tracks||[], items=state.items||[];
  const tasks=items.filter(i=>!isRiskItem(i)), risks=items.filter(i=>isRiskItem(i));
  const totDone=tasks.filter(i=>isDone(i.status)).length;
  const totAct =tasks.filter(i=>isActive(i.status)).length;
  const totRisk=tasks.filter(i=>isRisk(i.status)).length+risks.filter(i=>!isDone(i.status)).length;
  const ovr=tracks.length?Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length):0;

  const taskRows=tasks.map((item,i)=>`
    <tr><td class="num">${i+1}</td>
    <td>${TRACK_NAMES[item.track]||item.track||"—"}</td>
    <td><strong>${item.title||"—"}</strong></td>
    <td>${item.owner||"—"}</td>
    <td>${fmtDate(item.due)}</td>
    <td>${pbar(item.progress,TRACK_ACCENTS[item.track])}</td>
    <td>${badge(item.status)}</td></tr>`).join("");

  const riskRows=[...risks,...tasks.filter(i=>isRisk(i.status))].map(r=>`
    <div class="rr">
      <div class="rd2" style="background:${isRisk(r.status)?'var(--rd)':isDone(r.status)?'var(--gn)':'var(--yw)'}"></div>
      <div style="flex:1"><div style="font-weight:600;font-size:.87rem">${r.title||"—"}</div>
      <div style="font-size:.78rem;color:var(--gr);margin-top:2px">${TRACK_NAMES[r.track]||""} · ${r.owner||"—"} · ${fmtDate(r.due)}</div></div>
      ${badge(r.status)}</div>`).join("");

  const trackCards=tracks.map(t=>{
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
        <div class="tmk" style="margin-top:12px">
          <div class="tk" style="text-align:center"><div class="v" style="color:var(--nv)">${t.tasks||0}</div><div class="l">الإجمالي</div></div>
          <div class="tk" style="text-align:center"><div class="v" style="color:var(--gn)">${tD}</div><div class="l">منجزة</div></div>
          <div class="tk" style="text-align:center"><div class="v" style="color:var(--yw)">${tA}</div><div class="l">جارية</div></div>
          <div class="tk" style="text-align:center"><div class="v" style="color:var(--rd)">${tR.length}</div><div class="l">مخاطر</div></div>
        </div>
      </div></div>`;
  }).join("");

  const yd=tasks.filter(i=>isDone(i.status)).slice(0,6);
  const td2=tasks.filter(i=>isActive(i.status)).slice(0,6);
  const tm=tasks.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1).slice(0,6);

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>التقرير الشامل اليومي — KAGA</title>
<style>${CSS}</style></head><body>
${printBar("التقرير الشامل اليومي")}
<div class="wrap">
  <div class="rh">
    <div class="pj">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1>التقرير الشامل اليومي</h1>
    <p style="color:rgba(255,255,255,.7);font-size:.88rem">نموذج تنفيذي لمتابعة التقدم والمسارات الأربعة والمخاطر والقرارات</p>
    <div class="mt">
      <div class="mi"><span class="ml">التاريخ</span><span class="mv">${todayAr()}</span></div>
      <div class="mi"><span class="ml">الأسبوع</span><span class="mv">${weekNum()}</span></div>
      <div class="mi"><span class="ml">الإنجاز الكلي</span><span class="mv" style="color:var(--gd)">${ovr}%</span></div>
    </div>
  </div>
  <div class="kg">
    <div class="kc nv"><div class="kv">${tasks.length}</div><div class="kl">إجمالي المهام</div></div>
    <div class="kc gn"><div class="kv">${totDone}</div><div class="kl">منجزة</div></div>
    <div class="kc yw"><div class="kv">${totAct}</div><div class="kl">قيد التنفيذ</div></div>
    <div class="kc rd"><div class="kv">${totRisk}</div><div class="kl">معرضة للخطر</div></div>
    <div class="kc gd"><div class="kv">${ovr}%</div><div class="kl">نسبة الإنجاز</div></div>
    <div class="kc bl"><div class="kv">${risks.filter(r=>!isDone(r.status)).length}</div><div class="kl">مخاطر مفتوحة</div></div>
  </div>
  <div class="card">
    <div class="ch"><span class="ic">🗂</span><h2>حالة المسارات الأربعة</h2></div>
    <div class="cb"><div class="trg">${trackCards}</div></div>
  </div>
  <div class="card">
    <div class="ch"><span class="ic">📅</span><h2>الجدول الزمني اليومي</h2></div>
    <div class="cb">
      <div class="tg">
        <div class="tc"><div class="tch" style="background:var(--gn)">✓ أمس — ما تم إنجازه</div><div class="tcb">${tlItems(yd)}</div></div>
        <div class="tc"><div class="tch" style="background:var(--gd)">⟳ اليوم — جاري التنفيذ</div><div class="tcb">${tlItems(td2)}</div></div>
        <div class="tc"><div class="tch" style="background:var(--tl)">○ غداً — مخطط</div><div class="tcb">${tlItems(tm)}</div></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="ch"><span class="ic">📋</span><h2>قائمة المهام والأنشطة الكاملة</h2></div>
    <div class="cb" style="overflow-x:auto">
      <table><thead><tr><th>#</th><th>المسار</th><th>النشاط</th><th>المسؤول</th><th>الموعد</th><th>الإنجاز</th><th>الحالة</th></tr></thead>
      <tbody>${taskRows||'<tr><td colspan="7" style="text-align:center;color:var(--gr);padding:24px">لا توجد مهام مسجّلة</td></tr>'}</tbody></table>
    </div>
  </div>
  ${riskRows?`<div class="card"><div class="ch"><span class="ic">⚠️</span><h2>المخاطر والقضايا</h2></div><div class="cb">${riskRows}</div></div>`:""}
  ${footer()}
</div></body></html>`;
}

// ─── تقرير مسار ───────────────────────────────────────────
function buildTrack(state, tid){
  const tracks=state.tracks||[], items=state.items||[];
  const track=tracks.find(t=>t.id===tid||t.track===tid)||{id:tid,name:TRACK_NAMES[tid],progress:0,tasks:0,done:0,active:0,risk:0};
  const ac=TRACK_ACCENTS[tid]||"var(--tl)", nm=track.name||TRACK_NAMES[tid]||tid;
  const ti=items.filter(i=>i.track===tid);
  const tT=ti.filter(i=>!isRiskItem(i)), tR=ti.filter(i=>isRiskItem(i));
  const tD=tT.filter(i=>isDone(i.status)), tA=tT.filter(i=>isActive(i.status));
  const tRk=tT.filter(i=>isRisk(i.status));
  const tN=tT.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1);
  const pct=track.progress||0;

  const taskRows=tT.map((item,i)=>`
    <tr><td class="num">${i+1}</td>
    <td><strong>${item.title||"—"}</strong></td>
    <td>${item.owner||"—"}</td>
    <td>${fmtDate(item.due)}</td>
    <td>${pbar(item.progress,ac)}</td>
    <td>${badge(item.status)}</td></tr>`).join("");

  const riskRows=[...tR,...tRk].map(r=>`
    <div class="rr">
      <div class="rd2" style="background:${isRisk(r.status)?'var(--rd)':isDone(r.status)?'var(--gn)':'var(--yw)'}"></div>
      <div style="flex:1"><div style="font-weight:600;font-size:.87rem">${r.title||"—"}</div>
      <div style="font-size:.78rem;color:var(--gr);margin-top:2px">${r.owner||"—"} · ${fmtDate(r.due)}</div></div>
      ${badge(r.status)}</div>`).join("");

  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>تقرير مسار ${nm} — KAGA</title>
<style>${CSS}</style></head><body>
${printBar(`تقرير مسار: ${nm}`)}
<div class="wrap">
  <div class="rh">
    <div class="pj">مشروع افتتاح حدائق الملك عبدالله العالمية</div>
    <h1 style="color:${ac}">مسار ${nm}</h1>
    <p style="color:rgba(255,255,255,.7);font-size:.88rem">التقرير اليومي للمسار</p>
    <div class="mt">
      <div class="mi"><span class="ml">التاريخ</span><span class="mv">${todayAr()}</span></div>
      <div class="mi"><span class="ml">الحالة</span><span class="mv">${track.status||"—"}</span></div>
      <div class="mi"><span class="ml">الإنجاز</span><span class="mv" style="color:${ac}">${pct}%</span></div>
    </div>
  </div>
  <div class="kg">
    <div class="kc nv"><div class="kv">${tT.length}</div><div class="kl">إجمالي المهام</div></div>
    <div class="kc gn"><div class="kv">${tD.length}</div><div class="kl">منجزة</div></div>
    <div class="kc yw"><div class="kv">${tA.length}</div><div class="kl">قيد التنفيذ</div></div>
    <div class="kc rd"><div class="kv">${tRk.length+tR.filter(r=>!isDone(r.status)).length}</div><div class="kl">مخاطر / متأخرة</div></div>
    <div class="kc gd"><div class="kv">${pct}%</div><div class="kl">نسبة الإنجاز</div></div>
    <div class="kc bl"><div class="kv">${tN.length}</div><div class="kl">قادمة</div></div>
  </div>
  <div class="card">
    <div class="ch" style="background:${ac}20;border-bottom-color:${ac}40"><span class="ic">📊</span><h2>الوضع التنفيذي للمسار</h2></div>
    <div class="cb">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:600">نسبة الإنجاز الكلية</span>
        <span style="font-weight:900;color:${ac};font-size:1.2rem">${pct}%</span>
      </div>
      <div class="pbb" style="height:16px"><div class="pbf" style="width:${pct}%;background:${ac};height:16px"></div></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;text-align:center">
        <div style="padding:12px;background:var(--lt);border-radius:8px"><div style="font-size:1.5rem;font-weight:900;color:var(--gn)">${tD.length}</div><div style="font-size:.78rem;color:var(--gr)">مكتملة ✓</div></div>
        <div style="padding:12px;background:var(--lt);border-radius:8px"><div style="font-size:1.5rem;font-weight:900;color:var(--yw)">${tA.length}</div><div style="font-size:.78rem;color:var(--gr)">جارية ⟳</div></div>
        <div style="padding:12px;background:var(--lt);border-radius:8px"><div style="font-size:1.5rem;font-weight:900;color:var(--rd)">${tRk.length}</div><div style="font-size:.78rem;color:var(--gr)">متأخرة ⚠</div></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="ch"><span class="ic">📅</span><h2>الجدول الزمني للمسار</h2></div>
    <div class="cb">
      <div class="tg">
        <div class="tc"><div class="tch" style="background:var(--gn)">✓ أمس — ما تم إنجازه</div><div class="tcb">${tlItems(tD.slice(0,5))}</div></div>
        <div class="tc"><div class="tch" style="background:${ac}">⟳ اليوم — جاري التنفيذ</div><div class="tcb">${tlItems(tA.slice(0,5))}</div></div>
        <div class="tc"><div class="tch" style="background:var(--tl)">○ غداً — مخطط</div><div class="tcb">${tlItems(tN.slice(0,5))}</div></div>
      </div>
    </div>
  </div>
  <div class="card">
    <div class="ch"><span class="ic">📋</span><h2>تفاصيل الأنشطة والمهام</h2></div>
    <div class="cb" style="overflow-x:auto">
      <table><thead><tr><th>#</th><th>النشاط / المخرج</th><th>المسؤول</th><th>الموعد</th><th>الإنجاز</th><th>الحالة</th></tr></thead>
      <tbody>${taskRows||'<tr><td colspan="6" style="text-align:center;color:var(--gr);padding:24px">لا توجد مهام مسجّلة لهذا المسار</td></tr>'}</tbody></table>
    </div>
  </div>
  ${riskRows?`<div class="card"><div class="ch"><span class="ic">⚠️</span><h2>المخاطر والقضايا</h2></div><div class="cb">${riskRows}</div></div>`:""}
  ${footer()}
</div></body></html>`;
}

async function generateReport(type, state){
  let html;
  if(type==="comprehensive") html=buildComprehensive(state);
  else if(["أ","ب","ج","د"].includes(type)) html=buildTrack(state,type);
  else throw new Error("نوع تقرير غير معروف: "+type);
  return Buffer.from(html,"utf-8");
}

module.exports = { generateReport };
