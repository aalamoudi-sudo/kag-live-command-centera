"use strict";
/**
 * report-pptx.js — KAG Executive PPTX Generator
 * تقرير تنفيذي احترافي بـ PowerPoint
 * يعرض مهام اليوم فقط + KPIs + مخاطر + قرارات
 */
const pptxgen = require("pptxgenjs");

// ─── ثوابت ───────────────────────────────────────────────────
const NAVY   = "0B1F35";
const NAVY2  = "142D48";
const GOLD   = "C9A84C";
const GOLD2  = "8A6E2A";
const WHITE  = "FFFFFF";
const OFF    = "F7F9FC";
const RULE   = "D8DFE8";
const TEXT   = "0E1F2E";
const TEXT2  = "3A4D60";
const TEXT3  = "7A8C9E";
const GREEN  = "166534";
const GREENL = "DCFCE7";
const RED    = "991B1B";
const REDL   = "FEE2E2";
const AMBER  = "92400E";
const AMBERL = "FEF3C7";
const BLUE   = "1E40AF";
const BLUEL  = "DBEAFE";

const TRACK_NAMES = {
  "أ":"التخطيط والتنسيق",
  "ب":"الإعلام والتغطية",
  "ج":"الحفل الرسمي وفعالياته المصاحبة",
  "د":"تجهيز وتفعيل الحديقة"
};
const TRACK_ACCENT = { "أ":"1B4B7A", "ب":"3D2080", "ج":"6B3300", "د":"0D5447" };

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
function todayISO(){ return new Date().toISOString().slice(0,10); }
function todayAr(){
  return new Date().toLocaleDateString("ar-SA",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
function weekNum(){
  const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d-new Date(d.getFullYear(),0,4))/(7*86400000))+1;
}
function statusLabel(s){
  if(!s) return "—";
  if(isDone(s))   return "✓ مكتملة";
  if(isActive(s)) return "⟳ جارية";
  if(isRiskS(s))  return "⚠ متأخرة";
  return s;
}
function statusColor(s){
  if(isDone(s))   return GREEN;
  if(isActive(s)) return BLUE;
  if(isRiskS(s))  return RED;
  return TEXT3;
}
function trackStatusLabel(s){
  if(s==="ضمن المسار")   return "✓ ضمن المسار";
  if(s==="تحت المتابعة") return "⚑ تحت المتابعة";
  if(s==="يحتاج تدخل")  return "⚠ يحتاج تدخل";
  if(s==="معرض للخطر")  return "⚠ معرض للخطر";
  if(s==="حرج")         return "🔴 حرج";
  return s||"—";
}
function trackStatusColor(s){
  if(s==="ضمن المسار")   return GREEN;
  if(s==="تحت المتابعة") return AMBER;
  return RED;
}

// مساعدات رسم
const S  = w => w; // بوصة
const sh = () => ({ type:"outer", color:"000000", blur:5, offset:2, angle:45, opacity:0.10 });

// ─── رسم الغلاف ───────────────────────────────────────────────
function addCoverSlide(pres, title, subtitle, kpis){
  const sl = pres.addSlide();
  sl.background = { color: NAVY };

  // شريط ذهبي علوي
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.06, fill:{ color:GOLD }, line:{ color:GOLD } });

  // شعار / رمز المشروع
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.45, y:0.28, w:0.72, h:0.72,
    fill:{ color:"1C3D5E" }, rectRadius:0.08,
    line:{ color:GOLD, width:1.5 }
  });
  sl.addText("🌿", { x:0.45, y:0.28, w:0.72, h:0.72, fontSize:20, align:"center", valign:"middle", margin:0 });

  // اسم المنظمة
  sl.addText("أمانة منطقة الرياض", {
    x:1.28, y:0.30, w:5, h:0.28,
    fontSize:11, color:"FFFFFF", bold:true, fontFace:"Arial", margin:0
  });
  sl.addText("مشروع حدائق الملك عبدالله العالمية", {
    x:1.28, y:0.58, w:5.5, h:0.22,
    fontSize:9, color:GOLD, fontFace:"Arial", margin:0
  });

  // تاريخ
  sl.addText(todayAr(), {
    x:6.5, y:0.35, w:3.2, h:0.3,
    fontSize:9, color:"FFFFFF", align:"left", fontFace:"Arial",
    transparency:30, margin:0
  });
  sl.addText(`الأسبوع ${weekNum()}`, {
    x:6.5, y:0.62, w:3.2, h:0.22,
    fontSize:9, color:GOLD, align:"left", fontFace:"Arial", margin:0
  });

  // فاصل
  sl.addShape(pres.shapes.LINE, {
    x:0, y:1.08, w:10, h:0,
    line:{ color:"FFFFFF", width:0.5, transparency:80 }
  });

  // العنوان الرئيسي
  sl.addText(title, {
    x:0.45, y:1.3, w:9.1, h:1.1,
    fontSize:34, color:WHITE, bold:true, fontFace:"Cambria",
    align:"right", valign:"middle", margin:0
  });
  sl.addText(subtitle, {
    x:0.45, y:2.38, w:9.1, h:0.4,
    fontSize:13, color:"FFFFFF", fontFace:"Arial",
    align:"right", transparency:25, margin:0
  });

  // فاصل ذهبي
  sl.addShape(pres.shapes.RECTANGLE, {
    x:0.45, y:2.88, w:0.7, h:0.055,
    fill:{ color:GOLD }, line:{ color:GOLD }
  });

  // KPI cards
  if(kpis && kpis.length){
    const cardW = 1.42, gap = 0.13;
    const startX = (10 - (kpis.length * cardW + (kpis.length-1)*gap)) / 2;
    kpis.forEach((k,i)=>{
      const cx = startX + i*(cardW+gap);
      sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x:cx, y:3.15, w:cardW, h:1.68,
        fill:{ color:"1C3D5E" }, rectRadius:0.10,
        line:{ color:GOLD, width:0.8, transparency:60 },
        shadow: sh()
      });
      sl.addText(String(k.value), {
        x:cx, y:3.28, w:cardW, h:0.75,
        fontSize:28, color:k.color||GOLD, bold:true, fontFace:"Cambria",
        align:"center", valign:"middle", margin:0
      });
      sl.addText(k.label, {
        x:cx, y:4.0, w:cardW, h:0.55,
        fontSize:9, color:"FFFFFF", fontFace:"Arial",
        align:"center", transparency:25, margin:0
      });
    });
  }

  // تذييل
  sl.addShape(pres.shapes.RECTANGLE, {
    x:0, y:5.38, w:10, h:0.245,
    fill:{ color:"091929" }, line:{ color:"091929" }
  });
  sl.addText("سري — للاستخدام الداخلي فقط", {
    x:0.45, y:5.40, w:5, h:0.2,
    fontSize:8, color:RED, fontFace:"Arial", margin:0
  });
  sl.addText("PMC — غرفة العمليات المركزية", {
    x:5.0, y:5.40, w:4.6, h:0.2,
    fontSize:8, color:TEXT3, fontFace:"Arial", align:"left", margin:0
  });
}

// ─── رسم شريحة KPIs ──────────────────────────────────────────
function addKpiSlide(pres, tracks, totals){
  const sl = pres.addSlide();
  sl.background = { color: OFF };

  // Header
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.72, fill:{ color:NAVY }, line:{ color:NAVY } });
  sl.addText("مؤشرات الأداء الرئيسية", {
    x:0.4, y:0, w:7, h:0.72,
    fontSize:18, color:WHITE, bold:true, fontFace:"Cambria", valign:"middle", margin:0
  });
  sl.addText(todayAr(), {
    x:6.5, y:0, w:3.2, h:0.72,
    fontSize:9, color:GOLD, fontFace:"Arial", align:"left", valign:"middle", margin:0
  });
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0.72, w:10, h:0.04, fill:{ color:GOLD }, line:{ color:GOLD } });

  // KPI row — 6 بطاقات
  const cards = [
    { val: totals.tasks,   lbl:"إجمالي المهام",   col:NAVY   },
    { val: totals.done,    lbl:"مكتملة",           col:GREEN  },
    { val: totals.active,  lbl:"قيد التنفيذ",      col:BLUE   },
    { val: totals.late,    lbl:"متأخرة",           col:RED    },
    { val: totals.pct+"%", lbl:"نسبة الإنجاز",     col:GOLD2  },
    { val: totals.risks,   lbl:"مخاطر مفتوحة",     col:AMBER  },
  ];
  const cW=1.48, gap=0.06, startX=0.32;
  cards.forEach((c,i)=>{
    const cx = startX + i*(cW+gap);
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:cx, y:0.90, w:cW, h:1.12,
      fill:{ color:WHITE }, rectRadius:0.09, shadow: sh(),
      line:{ color:RULE, width:0.5 }
    });
    sl.addText(String(c.val), {
      x:cx, y:0.96, w:cW, h:0.62,
      fontSize:26, color:c.col, bold:true, fontFace:"Cambria",
      align:"center", valign:"middle", margin:0
    });
    sl.addText(c.lbl, {
      x:cx, y:1.55, w:cW, h:0.38,
      fontSize:9, color:TEXT3, fontFace:"Arial", align:"center", margin:0
    });
  });

  // جدول المسارات
  const tblY = 2.18;
  // header
  sl.addShape(pres.shapes.RECTANGLE, { x:0.32, y:tblY, w:9.36, h:0.38, fill:{ color:NAVY }, line:{ color:NAVY } });
  const hdr = ["المسار","الاسم","الحالة","الإنجاز","المهام","مكتملة","جارية","مخاطر"];
  const cWs = [0.38, 2.8, 1.3, 0.9, 0.72, 0.72, 0.72, 0.72];
  let cx2 = 9.68;
  hdr.forEach((h,i)=>{
    cx2 -= cWs[i];
    sl.addText(h, {
      x:cx2, y:tblY, w:cWs[i], h:0.38,
      fontSize:8.5, color:WHITE, bold:true, fontFace:"Arial",
      align:"center", valign:"middle", margin:0
    });
  });

  tracks.forEach((t,ri)=>{
    const rowY = tblY + 0.38 + ri*0.50;
    const bg   = ri%2===0 ? WHITE : "F3F6FA";
    sl.addShape(pres.shapes.RECTANGLE, { x:0.32, y:rowY, w:9.36, h:0.50, fill:{ color:bg }, line:{ color:RULE, width:0.3 } });

    const ti   = [t.id, t.name||TRACK_NAMES[t.id]||t.id, trackStatusLabel(t.status),
                  (t.progress||0)+"%", String(t.tasks||0), String(t.done||0), String(t.active||0), String(t.risk||0)];
    let cx3 = 9.68;
    ti.forEach((v,i)=>{
      cx3 -= cWs[i];
      const col = i===2 ? trackStatusColor(t.status) : i===3 ? GOLD2 : TEXT;
      sl.addText(v, {
        x:cx3, y:rowY, w:cWs[i], h:0.50,
        fontSize:i<2?9:8.5, color:col, bold:i<2, fontFace:"Arial",
        align:"center", valign:"middle", margin:0
      });
    });

    // شريط تقدم صغير
    const barX = 9.68 - cWs[0] - cWs[1] - cWs[2] - cWs[3];
    const pct  = Math.min(100, t.progress||0);
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:barX+0.05, y:rowY+0.31, w:cWs[3]-0.1, h:0.09,
      fill:{ color:"E5EAF0" }, rectRadius:0.04, line:{ color:"E5EAF0" }
    });
    if(pct>0){
      sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
        x:barX+0.05, y:rowY+0.31, w:(cWs[3]-0.1)*(pct/100), h:0.09,
        fill:{ color:TRACK_ACCENT[t.id]||NAVY }, rectRadius:0.04,
        line:{ color:TRACK_ACCENT[t.id]||NAVY }
      });
    }
  });

}

// ─── شريحة الجدول الزمني (أمس / اليوم / غداً) ────────────────
function addTimelineSlide(pres, items, trackFilter){
  const sl = pres.addSlide();
  sl.background = { color: OFF };

  const label = trackFilter
    ? `الجدول الزمني — مسار ${trackFilter}`
    : "الجدول الزمني اليومي";

  // Header
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.72, fill:{ color:NAVY }, line:{ color:NAVY } });
  sl.addText(label, {
    x:0.4, y:0, w:7, h:0.72,
    fontSize:17, color:WHITE, bold:true, fontFace:"Cambria", valign:"middle", margin:0
  });

  // حساب التواريخ
  const base = new Date(); base.setHours(0,0,0,0);
  const d = n => { const x=new Date(base); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
  const yday = d(-1), today = d(0), tmrw = d(1);

  const fmt = s => { try{ return new Date(s).toLocaleDateString("ar-SA",{month:"2-digit",day:"2-digit"}); }catch{ return s; } };

  sl.addText(`${fmt(yday)}  ←  ${fmt(today)}  ←  ${fmt(tmrw)}`, {
    x:6.0, y:0, w:3.7, h:0.72,
    fontSize:9, color:GOLD, fontFace:"Arial", align:"left", valign:"middle", margin:0
  });
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0.72, w:10, h:0.04, fill:{ color:GOLD }, line:{ color:GOLD } });

  // فلترة المهام حسب المسار
  const allTasks = items.filter(i => !isRiskItem(i) && (!trackFilter || i.track === trackFilter));

  const ydItems  = allTasks.filter(i => i.due && String(i.due).slice(0,10) === yday);
  const tdItems  = allTasks.filter(i => i.due && String(i.due).slice(0,10) === today);
  const tmItems  = allTasks.filter(i => i.due && String(i.due).slice(0,10) === tmrw);

  // إذا لا توجد مهام بتواريخ محددة، نستخدم الحالات
  const ydFinal = ydItems.length ? ydItems : allTasks.filter(i => isDone(i.status)).slice(0,8);
  const tdFinal = tdItems.length ? tdItems : allTasks.filter(i => isActive(i.status)).slice(0,8);
  const tmFinal = tmItems.length ? tmItems : allTasks.filter(i => !isDone(i.status)&&!isActive(i.status)&&i.due)
                    .sort((a,b)=>a.due>b.due?1:-1).slice(0,8);
  const hasExact = ydItems.length||tdItems.length||tmItems.length;

  // ثلاث بطاقات جنباً لجنب
  const cols = [
    { title:`أمس — ${fmt(yday)}`,  bg:GREENL, hdr:GREEN,  items:ydFinal, icon:"✓", hint:"مكتملة / مستحقة أمس" },
    { title:`اليوم — ${fmt(today)}`, bg:"FEF9EC", hdr:GOLD2, items:tdFinal, icon:"⟳", hint:"مجدولة اليوم" },
    { title:`غداً — ${fmt(tmrw)}`,  bg:BLUEL,  hdr:BLUE,  items:tmFinal, icon:"○", hint:"مقبلة غداً" },
  ];

  const colW = 3.0, gap = 0.05, startX = 0.48, cardY = 0.88;
  const cardH = 4.38;

  cols.forEach((col, ci) => {
    const cx = startX + ci*(colW+gap);

    // بطاقة خلفية
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:cx, y:cardY, w:colW, h:cardH,
      fill:{ color:WHITE }, rectRadius:0.10,
      shadow: sh(), line:{ color:RULE, width:0.4 }
    });

    // header البطاقة
    sl.addShape(pres.shapes.RECTANGLE, {
      x:cx, y:cardY, w:colW, h:0.42,
      fill:{ color:col.bg }, line:{ color:col.bg }
    });
    sl.addText(`${col.icon}  ${col.title}`, {
      x:cx+0.1, y:cardY, w:colW-0.2, h:0.42,
      fontSize:9.5, color:col.hdr, bold:true, fontFace:"Arial",
      valign:"middle", margin:0
    });

    if(!col.items.length){
      sl.addText("لا توجد بنود", {
        x:cx+0.1, y:cardY+0.55, w:colW-0.2, h:0.5,
        fontSize:8.5, color:TEXT3, fontFace:"Arial",
        fontItalic:true, margin:0
      });
    } else {
      const maxR = Math.min(col.items.length, 8);
      col.items.slice(0, maxR).forEach((item, ri) => {
        const iy = cardY + 0.48 + ri * 0.46;
        // فاصل خفيف
        if(ri > 0){
          sl.addShape(pres.shapes.LINE, {
            x:cx+0.12, y:iy-0.03, w:colW-0.24, h:0,
            line:{ color:RULE, width:0.3 }
          });
        }
        // نقطة الحالة
        const dot = isDone(item.status) ? GREEN : isRiskS(item.status) ? RED : BLUE;
        sl.addShape(pres.shapes.OVAL, {
          x:cx+0.14, y:iy+0.08, w:0.11, h:0.11,
          fill:{ color:dot }, line:{ color:dot }
        });
        // عنوان المهمة
        sl.addText(item.title||"—", {
          x:cx+0.30, y:iy, w:colW-0.38, h:0.28,
          fontSize:8, color:TEXT, bold:false, fontFace:"Arial",
          valign:"middle", margin:0
        });
        // المسؤول
        if(item.owner){
          sl.addText(item.owner, {
            x:cx+0.30, y:iy+0.27, w:colW-0.38, h:0.18,
            fontSize:7, color:TEXT3, fontFace:"Arial", margin:0
          });
        }
      });
      if(col.items.length > maxR){
        sl.addText(`+${col.items.length-maxR} بنود أخرى`, {
          x:cx+0.1, y:cardY+0.48+maxR*0.46, w:colW-0.2, h:0.28,
          fontSize:7.5, color:TEXT3, fontFace:"Arial", fontItalic:true, margin:0
        });
      }
    }
  });

  // ملاحظة أسفل
  const note = hasExact
    ? `يعرض المهام المجدولة بتواريخ ${fmt(yday)} / ${fmt(today)} / ${fmt(tmrw)} فعلياً`
    : `لا توجد مواعيد محددة — يعرض المكتملة / الجارية / القادمة بالترتيب`;
  sl.addText(`ℹ  ${note}`, {
    x:0.48, y:5.32, w:9.04, h:0.22,
    fontSize:7.5, color:TEXT3, fontFace:"Arial", margin:0
  });

  drawFooter(sl, pres);
}

// ─── شريحة مهام اليوم ────────────────────────────────────────
function addTodayTasksSlide(pres, todayItems, trackFilter){
  const sl = pres.addSlide();
  sl.background = { color: OFF };

  const label = trackFilter
    ? `مهام اليوم — مسار ${trackFilter}: ${TRACK_NAMES[trackFilter]||""}`
    : "مهام اليوم — جميع المسارات";

  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.72, fill:{ color:NAVY }, line:{ color:NAVY } });
  sl.addText(label, {
    x:0.4, y:0, w:7, h:0.72,
    fontSize:17, color:WHITE, bold:true, fontFace:"Cambria", valign:"middle", margin:0
  });
  sl.addText(fmtDate(todayISO()), {
    x:7.2, y:0, w:2.5, h:0.72,
    fontSize:9, color:GOLD, fontFace:"Arial", align:"left", valign:"middle", margin:0
  });
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0.72, w:10, h:0.04, fill:{ color:GOLD }, line:{ color:GOLD } });

  if(!todayItems.length){
    sl.addText("لا توجد مهام مجدولة لهذا اليوم", {
      x:1, y:2.5, w:8, h:1,
      fontSize:14, color:TEXT3, fontFace:"Arial", align:"center", margin:0
    });
    return;
  }

  // جدول
  const showTrack = !trackFilter;
  const cols = showTrack
    ? [{l:"المسار",w:0.95},{l:"المهمة / البند",w:4.2},{l:"المسؤول",w:1.5},{l:"الحالة",w:1.35},{l:"الموعد",w:0.96}]
    : [{l:"المهمة / البند",w:5.1},{l:"المسؤول",w:1.9},{l:"الحالة",w:1.4},{l:"الموعد",w:0.96}];
  const totalW = cols.reduce((s,c)=>s+c.w,0);
  const startX = (10-totalW)/2;
  const hdrY = 0.88;

  sl.addShape(pres.shapes.RECTANGLE, { x:startX, y:hdrY, w:totalW, h:0.36, fill:{ color:NAVY2 }, line:{ color:NAVY2 } });
  let cxH = startX;
  cols.forEach(c=>{
    sl.addText(c.l, { x:cxH, y:hdrY, w:c.w, h:0.36, fontSize:8.5, color:WHITE, bold:true, fontFace:"Arial", align:"center", valign:"middle", margin:0 });
    cxH += c.w;
  });

  const maxRows = Math.min(todayItems.length, 12);
  todayItems.slice(0, maxRows).forEach((item, ri)=>{
    const rowY = hdrY + 0.36 + ri*0.40;
    const bg   = ri%2===0 ? WHITE : "F3F6FA";
    sl.addShape(pres.shapes.RECTANGLE, { x:startX, y:rowY, w:totalW, h:0.40, fill:{ color:bg }, line:{ color:RULE, width:0.3 } });

    let cxR = startX;
    const vals = showTrack
      ? [TRACK_NAMES[item.track]||item.track||"—", item.title||"—", item.owner||"—", statusLabel(item.status), fmtDate(item.due)]
      : [item.title||"—", item.owner||"—", statusLabel(item.status), fmtDate(item.due)];

    vals.forEach((v,ci)=>{
      const w = cols[ci].w;
      const isStatus = showTrack ? ci===3 : ci===2;
      const col = isStatus ? statusColor(item.status) : ci===0&&showTrack ? (TRACK_ACCENT[item.track]||NAVY) : TEXT;
      sl.addText(v, {
        x:cxR, y:rowY, w, h:0.40,
        fontSize:ci===(showTrack?1:0)?8.5:8, color:col,
        bold:ci===(showTrack?1:0), fontFace:"Arial",
        align: ci===(showTrack?1:0) ? "right" : "center",
        valign:"middle", margin:0
      });
      cxR += w;
    });
  });

  if(todayItems.length > maxRows){
    sl.addText(`... و ${todayItems.length-maxRows} مهمة إضافية`, {
      x:startX, y:hdrY+0.36+maxRows*0.40+0.06, w:totalW, h:0.28,
      fontSize:8, color:TEXT3, fontFace:"Arial", align:"center", margin:0
    });
  }

}

// ─── شريحة المخاطر ───────────────────────────────────────────
function addRisksSlide(pres, risks){
  const sl = pres.addSlide();
  sl.background = { color: OFF };

  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.72, fill:{ color:"7F1D1D" }, line:{ color:"7F1D1D" } });
  sl.addText("سجل المخاطر والقضايا المفتوحة", {
    x:0.4, y:0, w:7.5, h:0.72,
    fontSize:17, color:WHITE, bold:true, fontFace:"Cambria", valign:"middle", margin:0
  });
  sl.addText(`${risks.length} مخاطر مفتوحة`, {
    x:7.3, y:0, w:2.4, h:0.72,
    fontSize:10, color:"FCA5A5", fontFace:"Arial", align:"left", valign:"middle", margin:0
  });
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0.72, w:10, h:0.04, fill:{ color:RED }, line:{ color:RED } });

  if(!risks.length){
    sl.addText("✅ لا توجد مخاطر مفتوحة حالياً", {
      x:1, y:2.5, w:8, h:1,
      fontSize:14, color:GREEN, fontFace:"Arial", align:"center", margin:0
    });
    return;
  }

  const cols = [{l:"#",w:0.36},{l:"المخاطرة / القضية",w:3.7},{l:"المسار",w:1.5},{l:"المسؤول",w:1.5},{l:"الموعد",w:1.0},{l:"الحالة",w:1.5}];
  const totalW = cols.reduce((s,c)=>s+c.w,0);
  const startX = (10-totalW)/2;
  const hdrY = 0.88;

  sl.addShape(pres.shapes.RECTANGLE, { x:startX, y:hdrY, w:totalW, h:0.36, fill:{ color:"7F1D1D" }, line:{ color:"7F1D1D" } });
  let cxH = startX;
  cols.forEach(c=>{
    sl.addText(c.l, { x:cxH, y:hdrY, w:c.w, h:0.36, fontSize:8.5, color:WHITE, bold:true, fontFace:"Arial", align:"center", valign:"middle", margin:0 });
    cxH += c.w;
  });

  const maxRows = Math.min(risks.length, 10);
  risks.slice(0, maxRows).forEach((r, ri)=>{
    const rowY = hdrY + 0.36 + ri*0.42;
    sl.addShape(pres.shapes.RECTANGLE, { x:startX, y:rowY, w:totalW, h:0.42, fill:{ color:ri%2===0?WHITE:"FFF5F5" }, line:{ color:"FEE2E2", width:0.3 } });
    const vals = [String(ri+1), r.title||"—", TRACK_NAMES[r.track]||r.track||"—", r.owner||"—", fmtDate(r.due), statusLabel(r.status)];
    let cxR = startX;
    vals.forEach((v,ci)=>{
      const w = cols[ci].w;
      const col = ci===5 ? statusColor(r.status) : ci===1 ? TEXT : TEXT2;
      sl.addText(v, {
        x:cxR, y:rowY, w, h:0.42,
        fontSize:ci===1?8.5:8, color:col,
        bold:ci===1, fontFace:"Arial",
        align:ci===1?"right":"center", valign:"middle", margin:0
      });
      cxR += w;
    });
  });

}

// ─── شريحة القرارات ──────────────────────────────────────────
function addDecisionsSlide(pres, decisions){
  const sl = pres.addSlide();
  sl.background = { color: OFF };

  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.72, fill:{ color:"78350F" }, line:{ color:"78350F" } });
  sl.addText("القرارات المطلوبة والإجراءات العاجلة", {
    x:0.4, y:0, w:7.5, h:0.72,
    fontSize:17, color:WHITE, bold:true, fontFace:"Cambria", valign:"middle", margin:0
  });
  sl.addText(`${decisions.length} قرار معلق`, {
    x:7.3, y:0, w:2.4, h:0.72,
    fontSize:10, color:"FDE68A", fontFace:"Arial", align:"left", valign:"middle", margin:0
  });
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0.72, w:10, h:0.04, fill:{ color:AMBER }, line:{ color:AMBER } });

  if(!decisions.length){
    sl.addText("✅ لا توجد قرارات معلقة حالياً", {
      x:1, y:2.5, w:8, h:1,
      fontSize:14, color:GREEN, fontFace:"Arial", align:"center", margin:0
    });
    return;
  }

  const cardH = 0.82, gap = 0.12, startY = 0.88, startX = 0.32, totalW = 9.36;
  decisions.slice(0, 5).forEach((d,i)=>{
    const cy = startY + i*(cardH+gap);
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:startX, y:cy, w:totalW, h:cardH,
      fill:{ color:WHITE }, rectRadius:0.09, shadow: sh(),
      line:{ color:"FDE68A", width:0.7 }
    });
    // رقم
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:startX+0.14, y:cy+0.16, w:0.42, h:0.42,
      fill:{ color:AMBERL }, rectRadius:0.21, line:{ color:AMBERL }
    });
    sl.addText(String(i+1), {
      x:startX+0.14, y:cy+0.16, w:0.42, h:0.42,
      fontSize:11, color:AMBER, bold:true, fontFace:"Cambria",
      align:"center", valign:"middle", margin:0
    });
    // العنوان
    sl.addText(d.title||"—", {
      x:startX+0.68, y:cy+0.08, w:8.0, h:0.36,
      fontSize:11, color:TEXT, bold:true, fontFace:"Arial", margin:0
    });
    // meta
    const metaParts = [];
    if(TRACK_NAMES[d.track]) metaParts.push(`📌 ${TRACK_NAMES[d.track]}`);
    if(d.owner) metaParts.push(`👤 ${d.owner}`);
    if(d.due)   metaParts.push(`📅 ${fmtDate(d.due)}`);
    if(d.status) metaParts.push(statusLabel(d.status));
    sl.addText(metaParts.join("   "), {
      x:startX+0.68, y:cy+0.46, w:8.0, h:0.26,
      fontSize:8.5, color:TEXT2, fontFace:"Arial", margin:0
    });
  });

}

// ─── شريحة ملخص مسار ────────────────────────────────────────
function addTrackSummarySlide(pres, track, todayTasks, risks){
  const sl = pres.addSlide();
  sl.background = { color: OFF };
  const ac = TRACK_ACCENT[track.id] || NAVY;

  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.72, fill:{ color:ac }, line:{ color:ac } });
  sl.addText(`مسار ${track.id} · ${track.name||TRACK_NAMES[track.id]||track.id}`, {
    x:0.4, y:0, w:7.5, h:0.72,
    fontSize:17, color:WHITE, bold:true, fontFace:"Cambria", valign:"middle", margin:0
  });
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:0.72, w:10, h:0.04, fill:{ color:GOLD }, line:{ color:GOLD } });

  // KPI cards
  const pct = track.progress||0;
  const cards = [
    { val:String(track.tasks||0),  lbl:"إجمالي المهام",  col:NAVY  },
    { val:String(track.done||0),   lbl:"مكتملة",         col:GREEN },
    { val:String(track.active||0), lbl:"جارية",          col:BLUE  },
    { val:String(track.risk||0),   lbl:"مخاطر",          col:AMBER },
    { val:pct+"%",                 lbl:"نسبة الإنجاز",   col:GOLD2 },
  ];
  const cW=1.68, gap=0.1, startX=(10-cards.length*(cW+gap)+gap)/2;
  cards.forEach((c,i)=>{
    const cx = startX + i*(cW+gap);
    sl.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:cx, y:0.88, w:cW, h:1.0, fill:{ color:WHITE },
      rectRadius:0.09, shadow: sh(), line:{ color:RULE, width:0.4 }
    });
    sl.addText(c.val, { x:cx, y:0.94, w:cW, h:0.52, fontSize:24, color:c.col, bold:true, fontFace:"Cambria", align:"center", valign:"middle", margin:0 });
    sl.addText(c.lbl, { x:cx, y:1.44, w:cW, h:0.28, fontSize:8.5, color:TEXT3, fontFace:"Arial", align:"center", margin:0 });
  });

  // شريط تقدم
  const barX=0.4, barY=2.04, barW=9.2, barH=0.18;
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:barX, y:barY, w:barW, h:barH, fill:{ color:"E5EAF0" }, rectRadius:0.09, line:{ color:"E5EAF0" } });
  if(pct>0) sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:barX, y:barY, w:barW*(pct/100), h:barH, fill:{ color:ac }, rectRadius:0.09, line:{ color:ac } });
  sl.addText(`الإنجاز ${pct}%`, { x:barX, y:barY+0.2, w:barW, h:0.22, fontSize:8, color:TEXT3, fontFace:"Arial", align:"center", margin:0 });

  // مهام اليوم (قائمة مختصرة)
  const listY=2.55, listH=2.6, midX=5.1;
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.32, y:listY, w:4.62, h:listH, fill:{ color:WHITE }, rectRadius:0.09, shadow: sh(), line:{ color:RULE, width:0.4 } });
  sl.addShape(pres.shapes.RECTANGLE, { x:0.32, y:listY, w:4.62, h:0.38, fill:{ color:ac }, line:{ color:ac }, rectRadius:0.0 });
  sl.addText("مهام اليوم", { x:0.4, y:listY, w:4.46, h:0.38, fontSize:10, color:WHITE, bold:true, fontFace:"Arial", valign:"middle", margin:0 });
  if(!todayTasks.length){
    sl.addText("لا توجد مهام اليوم", { x:0.4, y:listY+0.45, w:4.46, h:0.5, fontSize:9, color:TEXT3, fontFace:"Arial", margin:0 });
  } else {
    todayTasks.slice(0,5).forEach((t,i)=>{
      const ty = listY+0.44+i*0.42;
      const col = statusColor(t.status);
      sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.36, y:ty, w:0.28, h:0.28, fill:{ color:BLUEL }, rectRadius:0.14, line:{ color:col } });
      sl.addText(i===0?"✓":i===1?"⟳":"○", { x:0.36, y:ty, w:0.28, h:0.28, fontSize:7, color:col, align:"center", valign:"middle", margin:0 });
      sl.addText(t.title||"—", { x:0.72, y:ty, w:4.12, h:0.28, fontSize:8.5, color:TEXT, fontFace:"Arial", valign:"middle", margin:0 });
    });
  }

  // المخاطر
  sl.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:midX, y:listY, w:4.62, h:listH, fill:{ color:WHITE }, rectRadius:0.09, shadow: sh(), line:{ color:RULE, width:0.4 } });
  sl.addShape(pres.shapes.RECTANGLE, { x:midX, y:listY, w:4.62, h:0.38, fill:{ color:"7F1D1D" }, line:{ color:"7F1D1D" } });
  sl.addText(`المخاطر (${risks.length})`, { x:midX+0.08, y:listY, w:4.46, h:0.38, fontSize:10, color:WHITE, bold:true, fontFace:"Arial", valign:"middle", margin:0 });
  if(!risks.length){
    sl.addText("✅ لا توجد مخاطر مفتوحة", { x:midX+0.08, y:listY+0.45, w:4.46, h:0.5, fontSize:9, color:GREEN, fontFace:"Arial", margin:0 });
  } else {
    risks.slice(0,5).forEach((r,i)=>{
      const ry = listY+0.44+i*0.42;
      sl.addText("⚠", { x:midX+0.1, y:ry, w:0.28, h:0.28, fontSize:9, color:RED, align:"center", valign:"middle", margin:0 });
      sl.addText(r.title||"—", { x:midX+0.44, y:ry, w:4.08, h:0.28, fontSize:8.5, color:TEXT, fontFace:"Arial", valign:"middle", margin:0 });
    });
  }

}

// ─── تذييل مشترك ─────────────────────────────────────────────
function drawFooter(sl, pres){
  sl.addShape(pres.shapes.RECTANGLE, { x:0, y:5.38, w:10, h:0.245, fill:{ color:"E8EDF3" }, line:{ color:RULE } });
  sl.addText("أمانة منطقة الرياض · حدائق الملك عبدالله العالمية", {
    x:0.35, y:5.39, w:5.5, h:0.22, fontSize:7.5, color:TEXT2, fontFace:"Arial", margin:0
  });
  sl.addText(`${todayAr()} · الأسبوع ${weekNum()} · سري — للاستخدام الداخلي فقط`, {
    x:5.5, y:5.39, w:4.2, h:0.22, fontSize:7.5, color:TEXT3, fontFace:"Arial", align:"left", margin:0
  });
}

// ════════════════════════════════════════════════════════════
// البناء الرئيسي
// ════════════════════════════════════════════════════════════
async function buildComprehensivePptx(state){
  const pres = new pptxgen();
  pres.layout  = "LAYOUT_16x9";
  pres.rtl     = true;
  pres.author  = "KAG Command Center";
  pres.title   = "التقرير الشامل اليومي";

  const today   = todayISO();
  const tracks  = state.tracks  || [];
  const items   = state.items   || [];
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد");

  const tasks     = items.filter(i=>!isRiskItem(i));
  const risks     = items.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const todayAll  = items.filter(i=>!isRiskItem(i)&&i.due&&String(i.due).slice(0,10)===today);
  const totDone   = tasks.filter(i=>isDone(i.status)).length;
  const totAct    = tasks.filter(i=>isActive(i.status)).length;
  const totLate   = tasks.filter(i=>isRiskS(i.status)).length;
  const ovr       = tracks.length ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;

  const kpis = [
    { value:tasks.length, label:"إجمالي المهام",   color:WHITE  },
    { value:totDone,       label:"مكتملة",         color:"6EE7B7" },
    { value:totAct,        label:"قيد التنفيذ",    color:"93C5FD" },
    { value:totLate,       label:"متأخرة",         color:"FCA5A5" },
    { value:ovr+"%",       label:"نسبة الإنجاز",   color:GOLD    },
    { value:risks.length,  label:"مخاطر مفتوحة",  color:"FDE68A" },
  ];

  // ١. الغلاف
  addCoverSlide(pres, "التقرير الشامل اليومي",
    `المسارات الأربعة · مهام ${fmtDate(today)} · المخاطر · القرارات`, kpis);

  // ٢. KPIs + المسارات
  addKpiSlide(pres, tracks, { tasks:tasks.length, done:totDone, active:totAct, late:totLate, pct:ovr, risks:risks.length });

  // ٣. الجدول الزمني (أمس/اليوم/غداً)
  addTimelineSlide(pres, items, null);

  // ٤. مهام اليوم
  addTodayTasksSlide(pres, todayAll.length ? todayAll : tasks.filter(i=>isActive(i.status)).slice(0,15), null);

  // ٥. المخاطر
  addRisksSlide(pres, risks);

  // ٥. القرارات
  addDecisionsSlide(pres, decisions);

  // تطبيق التذييل على كل الشرائح
  pres.slides.forEach(sl => drawFooter(sl, pres));

  return pres.write({ outputType:"nodebuffer" });
}

async function buildTrackPptx(state, tid){
  const pres = new pptxgen();
  pres.layout  = "LAYOUT_16x9";
  pres.rtl     = true;
  pres.author  = "KAG Command Center";
  pres.title   = `تقرير مسار ${tid}`;

  const today  = todayISO();
  const tracks = state.tracks || [];
  const items  = state.items  || [];
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد"&&(d.track===tid||!d.track));

  const track    = tracks.find(t=>t.id===tid||t.track===tid) ||
    { id:tid, name:TRACK_NAMES[tid], progress:0, status:"—", lead:"—", tasks:0, done:0, active:0, risk:0 };
  const ti       = items.filter(i=>i.track===tid);
  const tTasks   = ti.filter(i=>!isRiskItem(i));
  const tRisks   = ti.filter(i=>isRiskItem(i)&&!isDone(i.status));
  const todayT   = tTasks.filter(i=>i.due&&String(i.due).slice(0,10)===today);
  const displayT = todayT.length ? todayT : tTasks.filter(i=>isActive(i.status)||isRiskS(i.status)).slice(0,15);

  const pct   = track.progress||0;
  const tDone = tTasks.filter(i=>isDone(i.status)).length;
  const tAct  = tTasks.filter(i=>isActive(i.status)).length;

  const kpis = [
    { value:tTasks.length, label:"إجمالي المهام",  color:WHITE  },
    { value:tDone,          label:"مكتملة",        color:"6EE7B7" },
    { value:tAct,           label:"قيد التنفيذ",   color:"93C5FD" },
    { value:tRisks.length,  label:"مخاطر",         color:"FCA5A5" },
    { value:pct+"%",        label:"نسبة الإنجاز",  color:GOLD    },
  ];

  // ١. الغلاف
  addCoverSlide(pres,
    `مسار ${tid} · ${track.name||TRACK_NAMES[tid]||tid}`,
    `${track.focus||""} ${track.lead?`· مدير المسار: ${track.lead}`:""}`,
    kpis);

  // ٢. ملخص المسار + مهام اليوم + مخاطر
  addTrackSummarySlide(pres, track, displayT, tRisks);

  // ٣. الجدول الزمني (أمس/اليوم/غداً)
  addTimelineSlide(pres, ti, tid);

  // ٤. مهام اليوم (جدول كامل)
  addTodayTasksSlide(pres, displayT, tid);

  // ٥. المخاطر
  addRisksSlide(pres, tRisks);

  // ٥. القرارات
  addDecisionsSlide(pres, decisions);

  // تطبيق التذييل
  pres.slides.forEach(sl => drawFooter(sl, pres));

  return pres.write({ outputType:"nodebuffer" });
}

// ─── الدالة الرئيسية ─────────────────────────────────────────
async function generatePptx(type, state){
  if(type==="comprehensive") return buildComprehensivePptx(state);
  if(["أ","ب","ج","د"].includes(type)) return buildTrackPptx(state, type);
  throw new Error("نوع تقرير غير معروف: "+type);
}

module.exports = { generatePptx };
