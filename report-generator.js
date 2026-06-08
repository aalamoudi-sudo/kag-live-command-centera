"use strict";
/**
 * report-generator.js v4 — pptxgenjs فقط، بدون Python
 * يولّد تقارير PPTX مباشرة من Node.js باستخدام مكتبة pptxgenjs
 * Colors: تيل=#1C8D82، ذهبي=#C9A24A، أخضر=#2FA65A، كحلي=#08283B، رمادي=#243746
 */

const PptxGenJS = require("pptxgenjs");
const path = require("path");

// =========================================================
// ثوابت التصميم
// =========================================================
const C = {
  teal:   "1C8D82",
  gold:   "C9A24A",
  green:  "2FA65A",
  navy:   "08283B",
  dark:   "243746",
  white:  "FFFFFF",
  red:    "D64D3F",
  yellow: "F5A623",
  bg:     "F4F6F8",
  line:   "116A66",
};

const W = 13.33, H = 7.5;

// =========================================================
// أدوات مساعدة
// =========================================================
function today() {
  const d = new Date();
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const days   = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function weekNum() {
  const d = new Date(); d.setHours(0,0,0,0);
  d.setDate(d.getDate()+3-(d.getDay()+6)%7);
  return Math.round((d-new Date(d.getFullYear(),0,4))/(7*86400000))+1;
}
function fmtDate(s) {
  if (!s) return "";
  try { const d=new Date(s); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`; }
  catch { return s; }
}
function statusLabel(s) {
  if (!s) return "—";
  const m = { "مكتملة":"أخضر ✓","مكتمل":"أخضر ✓","معتمدة":"أخضر ✓","معتمد":"أخضر ✓","Completed":"أخضر ✓","Cleared":"أخضر ✓",
               "قيد التنفيذ":"أصفر","In Progress":"أصفر","تحت المتابعة":"أصفر","Watch":"أصفر",
               "معرضة للخطر":"أحمر ✗","معرض للخطر":"أحمر ✗","At Risk":"أحمر ✗","متأخرة":"أحمر ✗","متأخر":"أحمر ✗" };
  return m[s] || s;
}
function statusColor(s) {
  const sl = statusLabel(s);
  if (sl.includes("أخضر")) return C.green;
  if (sl.includes("أصفر")) return C.yellow;
  if (sl.includes("أحمر")) return C.red;
  return C.dark;
}
function getTrack(tracks, id) { return tracks.find(t=>t.track===id||t.id===id) || {}; }
function isDone(s)   { return ["مكتملة","مكتمل","معتمدة","معتمد","Completed","Cleared"].includes(s); }
function isActive(s) { return ["قيد التنفيذ","In Progress","تحت المتابعة"].includes(s); }
function isRisk(i)   { return ["risks","مخاطرة","مخاطر"].includes(i.type); }

// =========================================================
// بناء شرائح مشتركة
// =========================================================

/** شريحة الغلاف */
function addCoverSlide(prs, title, subtitle) {
  const slide = prs.addSlide();
  slide.background = { color: C.navy };

  // شريط ذهبي
  slide.addShape(prs.ShapeType.rect, { x:0, y:6.8, w:W, h:0.7, fill:{color:C.gold} });

  // عنوان
  slide.addText(title, {
    x:1.5, y:2.0, w:10.3, h:1.0,
    color:C.white, bold:true, fontSize:24, align:"center", fontFace:"Arial",
    rtlMode:true
  });
  // تاريخ
  slide.addText(`الأسبوع ${weekNum()} — ${new Date().getFullYear()} | ${today()}`, {
    x:1.5, y:3.2, w:10.3, h:0.5,
    color:C.gold, fontSize:14, align:"center", fontFace:"Arial", rtlMode:true
  });
  // وصف
  if (subtitle) slide.addText(subtitle, {
    x:1.5, y:3.9, w:10.3, h:0.6,
    color:"AAAAAA", fontSize:11, align:"center", fontFace:"Arial", rtlMode:true
  });

  // أقسام المسارات
  const tracks = [
    {label:"تجهيز وتفعيل الحديقة",    color:C.gold},
    {label:"الفعاليات والأنشطة المصاحبة",color:C.teal},
    {label:"التواصل والتسويق",          color:C.green},
    {label:"التخطيط والتنسيق",          color:C.navy},
  ];
  tracks.forEach((t,i)=>{
    const x = 0.5 + i*3.2;
    slide.addShape(prs.ShapeType.rect, { x, y:5.0, w:3.0, h:0.5, fill:{color:t.color} });
    slide.addText(t.label, { x, y:5.0, w:3.0, h:0.5, color:C.white, fontSize:8, align:"center", fontFace:"Arial", rtlMode:true });
  });
  return slide;
}

/** شريط الرأس لكل شريحة */
function addHeader(prs, slide, pageLabel, title) {
  slide.addShape(prs.ShapeType.rect, { x:0, y:0, w:W, h:0.72, fill:{color:C.navy} });
  slide.addShape(prs.ShapeType.rect, { x:0, y:0.72, w:W, h:0.04, fill:{color:C.gold} });
  slide.addText("تقرير يومي", { x:0.3, y:0.15, w:2.5, h:0.3, color:C.gold, fontSize:8, bold:true, fontFace:"Arial", rtlMode:true });
  slide.addText(title, { x:2.5, y:0.08, w:9.5, h:0.5, color:C.white, fontSize:18, bold:true, align:"right", fontFace:"Arial", rtlMode:true });
  slide.addText(pageLabel, { x:0.3, y:0.85, w:0.5, h:0.3, color:C.dark, fontSize:9, bold:true, fontFace:"Arial" });
}

/** شريحة الشكر */
function addThankSlide(prs) {
  const slide = prs.addSlide();
  slide.background = { color: C.navy };
  slide.addText("شكراً لكم ..", {
    x:0, y:2.8, w:W, h:1.5, color:C.gold, bold:true, fontSize:36,
    align:"center", fontFace:"Arial", rtlMode:true
  });
}

// =========================================================
// شرائح التقرير الشامل
// =========================================================

function buildComprehensive(prs, state) {
  const tracks = state.tracks || [];
  const items  = state.items  || [];

  const allDone   = items.filter(i=>isDone(i.status));
  const allActive = items.filter(i=>isActive(i.status));
  const allRisks  = items.filter(i=>isRisk(i) && !isDone(i.status));
  const overall   = tracks.length ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;
  const worstColor= tracks.some(t=>["معرض للخطر","معرضة للخطر","At Risk"].includes(t.status)) ? C.red :
                    tracks.some(t=>["تحت المتابعة"].includes(t.status)) ? C.yellow : C.green;
  const worstLabel= worstColor===C.red?"أحمر":worstColor===C.yellow?"أصفر":"أخضر";

  // ——— Slide 1: الغلاف ———
  addCoverSlide(prs, "تقرير يومي — مشروع افتتاح حدائق الملك عبدالله العالمية",
    "نموذج تنفيذي لمتابعة التقدم والمسارات الأربعة والمخاطر والقرارات");

  // ——— Slide 2: الملخص التنفيذي ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٢", "الملخص التنفيذي اليومي");

    // بطاقة الحالة
    slide.addShape(prs.ShapeType.rect, { x:0.55, y:1.1, w:3.2, h:1.65, fill:{color:C.white}, line:{color:C.line,pt:1} });
    slide.addText("حالة اليوم", { x:0.69, y:1.2, w:2.88, h:0.3, color:C.dark, fontSize:10, bold:true, fontFace:"Arial", rtlMode:true });
    slide.addShape(prs.ShapeType.rect, { x:1.0, y:1.55, w:2.0, h:0.35, fill:{color:worstColor} });
    slide.addText(worstLabel, { x:1.0, y:1.55, w:2.0, h:0.35, color:C.white, fontSize:12, bold:true, align:"center", fontFace:"Arial", rtlMode:true });
    slide.addText(`نسبة الإنجاز الكلية: ${overall}%`, { x:0.7, y:2.05, w:2.8, h:0.4, color:C.dark, fontSize:9, fontFace:"Arial", rtlMode:true });

    // ما تم أمس
    slide.addShape(prs.ShapeType.rect, { x:3.98, y:1.1, w:4.3, h:1.65, fill:{color:C.white}, line:{color:C.green,pt:1} });
    slide.addText("✓ ما تم إنجازه", { x:4.12, y:1.2, w:3.98, h:0.3, color:C.green, fontSize:10, bold:true, fontFace:"Arial", rtlMode:true });
    const doneList = allDone.slice(0,3).map(i=>`• ${i.title}`).join("\n") || "• لا يوجد إنجازات مسجلة";
    slide.addText(doneList, { x:4.2, y:1.52, w:3.8, h:1.0, color:C.dark, fontSize:9, fontFace:"Arial", rtlMode:true, valign:"top" });

    // ما يتم اليوم
    slide.addShape(prs.ShapeType.rect, { x:8.5, y:1.1, w:4.3, h:1.65, fill:{color:C.white}, line:{color:C.gold,pt:1} });
    slide.addText("◎ جاري تنفيذه", { x:8.64, y:1.2, w:3.98, h:0.3, color:C.gold, fontSize:10, bold:true, fontFace:"Arial", rtlMode:true });
    const activeList = allActive.slice(0,3).map(i=>`• ${i.title}`).join("\n") || "• لا يوجد أنشطة جارية";
    slide.addText(activeList, { x:8.72, y:1.52, w:3.8, h:1.0, color:C.dark, fontSize:9, fontFace:"Arial", rtlMode:true, valign:"top" });

    // جدول القضايا الحرجة
    slide.addShape(prs.ShapeType.rect, { x:6.99, y:3.05, w:5.95, h:2.7, fill:{color:C.white}, line:{color:C.red,pt:1} });
    slide.addText("⚠ القضايا الحرجة والتصعيد", { x:6.99, y:3.15, w:5.6, h:0.3, color:C.red, fontSize:10, bold:true, fontFace:"Arial", rtlMode:true });

    // رؤوس الجدول
    const tableHdr = ["القضية","الإجراء","المالك","الموعد"];
    const tableW   = [1.8,1.8,1.0,1.2];
    let tx = 7.1;
    slide.addShape(prs.ShapeType.rect, { x:7.1, y:3.58, w:5.7, h:0.32, fill:{color:C.navy} });
    tableHdr.forEach((h,i)=>{ slide.addText(h,{x:tx,y:3.64,w:tableW[i],h:0.16,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true}); tx+=tableW[i]; });

    allRisks.slice(0,3).forEach((r,ri)=>{
      tx=7.1; const ty=4.0+ri*0.45;
      const bg = ri%2===0?"F9F9F9":C.white;
      slide.addShape(prs.ShapeType.rect,{x:7.1,y:ty-0.05,w:5.7,h:0.42,fill:{color:bg}});
      [r.title||"—","متابعة عاجلة",r.owner||"—",fmtDate(r.due)].forEach((val,i)=>{
        slide.addText(val,{x:tx,y:ty,w:tableW[i],h:0.32,color:C.dark,fontSize:6.5,fontFace:"Arial",rtlMode:true}); tx+=tableW[i];
      });
    });

    // ملاحظات
    slide.addShape(prs.ShapeType.rect, { x:0.55, y:3.05, w:6.05, h:2.7, fill:{color:C.white}, line:{color:C.line,pt:1} });
    slide.addText("أهم ملاحظات اليوم", { x:0.69, y:3.15, w:5.5, h:0.3, color:C.line, fontSize:10, bold:true, fontFace:"Arial", rtlMode:true });
    const notes = items.filter(i=>!isDone(i.status)).slice(0,4).map(i=>`• ${i.title} [${i.track||""}]`).join("\n") || "لا ملاحظات";
    slide.addText(notes, { x:0.69, y:3.55, w:5.7, h:2.0, color:C.dark, fontSize:8.5, fontFace:"Arial", rtlMode:true, valign:"top" });
  }

  // ——— Slide 3: حالة المسارات ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٣", "حالة المسارات الأربعة");

    const trackDefs = [
      {id:"أ", name:"التخطيط والتنسيق",          color:C.navy},
      {id:"ب", name:"التواصل والتسويق",            color:C.green},
      {id:"ج", name:"الفعاليات والأنشطة المصاحبة", color:C.teal},
      {id:"د", name:"تجهيز وتفعيل الحديقة",       color:C.gold},
    ];

    // رأس الجدول
    const cols = [{w:2.25,label:"المسار"},{w:0.95,label:"إنجاز أمس"},{w:2.1,label:"خطة اليوم"},{w:2.1,label:"خطة الغد"},{w:2.1,label:"الحالة"},{w:2.45,label:"الدعم المطلوب"}];
    let tx=0.55;
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.65,w:12.25,h:0.32,fill:{color:C.navy}});
    cols.forEach(c=>{ slide.addText(c.label,{x:tx,y:1.70,w:c.w,h:0.16,color:C.white,fontSize:7.5,bold:true,fontFace:"Arial",rtlMode:true}); tx+=c.w; });

    trackDefs.forEach((td,ri)=>{
      const t     = getTrack(tracks, td.id);
      const ti    = items.filter(i=>i.track===td.id);
      const tdone = ti.filter(i=>isDone(i.status));
      const tact  = ti.filter(i=>isActive(i.status));
      const tnext = ti.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1);
      const trisks= ti.filter(i=>isRisk(i)&&!isDone(i.status));
      const ty    = 1.97 + ri*0.65;
      const bg    = ri%2===0?"FAFAFA":C.white;

      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty,w:12.25,h:0.62,fill:{color:bg}});
      slide.addShape(prs.ShapeType.rect,{x:10.55,y:ty,w:2.25,h:0.62,fill:{color:td.color}});
      slide.addText(td.name,{x:10.58,y:ty+0.05,w:2.18,h:0.52,color:C.white,fontSize:8,bold:true,fontFace:"Arial",rtlMode:true,valign:"middle"});

      const row=[
        tdone[0]?.title||"—",
        tact[0]?.title||"—",
        tnext[0]?.title||"—",
        statusLabel(t.status||""),
        trisks.length?`${trisks.length} مخاطر`:"لا يوجد",
      ];
      let rx=0.85;
      [0.95,2.1,2.1,2.1,2.45].forEach((cw,ci)=>{
        slide.addText(row[ci],{x:rx,y:ty+0.05,w:cw,h:0.52,color:C.dark,fontSize:7.5,fontFace:"Arial",rtlMode:true,valign:"middle"});
        rx+=cw;
      });
    });
  }

  // ——— Slide 4: السلامة والجودة ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٤", "السلامة والجودة اليومية");
    slide.addText("يُملأ من مسؤولي المسارات — لا تتوفر بيانات السلامة والجودة في Google Sheet حالياً",{
      x:1,y:3,w:11.3,h:1,color:C.dark,fontSize:12,align:"center",fontFace:"Arial",rtlMode:true
    });
  }

  // ——— Slide 5: المخاطر والقرارات ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٥", "المخاطر والقضايا والقرارات اليومية");

    // جدول المخاطر
    slide.addText("أهم المخاطر", { x:0.55, y:1.0, w:6, h:0.3, color:C.dark, fontSize:11, bold:true, fontFace:"Arial", rtlMode:true });
    const rHdr=["الحالة","الوصف","التوصية","المالك","آخر موعد"];
    const rW  =[1.0,     2.8,    2.2,       1.3,    1.2];
    let rx=0.55;
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.35,w:8.5,h:0.3,fill:{color:C.navy}});
    rHdr.forEach((h,i)=>{ slide.addText(h,{x:rx,y:1.41,w:rW[i],h:0.16,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true}); rx+=rW[i]; });

    const sortedRisks = [...allRisks].sort((a,b)=>{
      const pri={"معرضة للخطر":0,"معرض للخطر":0,"At Risk":0,"تحت المتابعة":1,"قيد التنفيذ":2};
      return (pri[a.status]??3)-(pri[b.status]??3);
    });
    sortedRisks.slice(0,5).forEach((r,ri)=>{
      rx=0.55; const ty=1.70+ri*0.45;
      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty-0.05,w:8.5,h:0.42,fill:{color:ri%2?"F9F9F9":C.white}});
      [statusLabel(r.status),r.title||"—","متابعة عاجلة",r.owner||"—",fmtDate(r.due)].forEach((v,i)=>{
        slide.addText(v,{x:rx,y:ty,w:rW[i],h:0.32,color:i===0?statusColor(r.status):C.dark,fontSize:6.5,bold:i===0,fontFace:"Arial",rtlMode:true});
        rx+=rW[i];
      });
    });

    // إحصائيات سريعة
    const totalItems = items.length;
    const doneCount  = allDone.length;
    const riskCount  = allRisks.length;
    const pct        = totalItems?Math.round(doneCount/totalItems*100):0;
    const stats=[{label:"إجمالي البنود",val:totalItems,c:C.teal},{label:"مكتملة",val:doneCount,c:C.green},{label:"مخاطر مفتوحة",val:riskCount,c:C.red},{label:"نسبة الإنجاز",val:`${pct}%`,c:C.gold}];
    stats.forEach((s,i)=>{
      const bx=9.3+i*0, by=1.1+i*1.1;
      slide.addShape(prs.ShapeType.rect,{x:9.3,y:by,w:3.5,h:0.9,fill:{color:s.c}});
      slide.addText(s.label,{x:9.3,y:by+0.05,w:3.5,h:0.35,color:C.white,fontSize:8,align:"center",fontFace:"Arial",rtlMode:true});
      slide.addText(String(s.val),{x:9.3,y:by+0.38,w:3.5,h:0.45,color:C.white,fontSize:20,bold:true,align:"center",fontFace:"Arial"});
    });
  }

  // ——— Slide 6: الجدول الزمني ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٦", "الجدول الزمني اليومي");
    slide.addText("أمس = ما تم إنجازه | اليوم = ما يتم إنجازه الآن | غداً = ما سيتم إنجازه",{
      x:0.5,y:0.85,w:12.3,h:0.25,color:C.dark,fontSize:8,align:"center",fontFace:"Arial",rtlMode:true
    });

    const cols2=[
      {label:"مكتمل ✓ — أمس",  color:C.green,  items:allDone.slice(0,3)},
      {label:"جاري ⟳ — اليوم", color:C.gold,   items:allActive.slice(0,3)},
      {label:"مخطط ○ — غداً",   color:C.teal,   items:items.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1).slice(0,3)},
    ];
    cols2.forEach((col,ci)=>{
      const cx=0.55+ci*4.2;
      slide.addShape(prs.ShapeType.rect,{x:cx,y:1.2,w:4.0,h:0.5,fill:{color:col.color}});
      slide.addText(col.label,{x:cx,y:1.25,w:4.0,h:0.4,color:C.white,fontSize:11,bold:true,align:"center",fontFace:"Arial",rtlMode:true});
      slide.addShape(prs.ShapeType.rect,{x:cx,y:1.7,w:4.0,h:3.8,fill:{color:C.white},line:{color:col.color,pt:1}});
      const listText = col.items.map(i=>`• ${i.title}`).join("\n") || "• لا يوجد";
      slide.addText(listText,{x:cx+0.1,y:1.8,w:3.8,h:3.5,color:C.dark,fontSize:9,fontFace:"Arial",rtlMode:true,valign:"top"});
    });
  }

  // ——— Slide 7: التوصيات ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٧", "التوصيات المقترحة وخطة الغد");

    const pending = items.filter(i=>!isDone(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1).slice(0,4);
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.1,w:12.25,h:0.35,fill:{color:C.navy}});
    ["#","التوصية","المبرر","القرار/الإجراء","المالك","موعد الحسم"].forEach((h,i)=>{
      const ws=[0.4,3.2,2.5,2.5,1.5,1.5];
      const xs=[0.55,0.95,4.15,6.65,9.15,10.65];
      slide.addText(h,{x:xs[i],y:1.17,w:ws[i],h:0.2,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true});
    });
    pending.forEach((item,ri)=>{
      const ty=1.55+ri*0.65;
      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty,w:12.25,h:0.6,fill:{color:ri%2?"FAFAFA":C.white}});
      [String(ri+1),item.title||"—","ضمن الجدول الزمني للمشروع","متابعة وتنفيذ",item.owner||"—",fmtDate(item.due)].forEach((v,i)=>{
        const ws=[0.4,3.2,2.5,2.5,1.5,1.5];
        const xs=[0.55,0.95,4.15,6.65,9.15,10.65];
        slide.addText(v,{x:xs[i],y:ty+0.05,w:ws[i],h:0.5,color:C.dark,fontSize:8,fontFace:"Arial",rtlMode:true,valign:"middle"});
      });
    });
    slide.addText("صور اليوم • محضر الاجتماع الصباحي • سجل القرارات • سجل القضايا • روابط الأدلة والاعتمادات",{
      x:0.55,y:4.7,w:12.25,h:0.4,color:C.dark,fontSize:8,fontFace:"Arial",rtlMode:true,italic:true
    });
  }

  // ——— Slide 8: الشكر ———
  addThankSlide(prs);
}

// =========================================================
// شرائح تقرير المسار
// =========================================================

const trackNames = {
  "أ": {name:"التخطيط والتنسيق",          num:"٠١", color:C.navy},
  "ب": {name:"التواصل والتسويق",            num:"٠٢", color:C.green},
  "ج": {name:"الفعاليات والأنشطة المصاحبة", num:"٠٣", color:C.teal},
  "د": {name:"تجهيز وتفعيل الحديقة",       num:"٠٤", color:C.gold},
};

function buildTrack(prs, state, trackId) {
  const tracks = state.tracks || [];
  const items  = state.items  || [];
  const td     = trackNames[trackId] || {name:trackId,num:"٠١",color:C.teal};
  const track  = getTrack(tracks, trackId);
  const ti     = items.filter(i=>i.track===trackId);
  const tdone  = ti.filter(i=>isDone(i.status));
  const tact   = ti.filter(i=>isActive(i.status));
  const tnext  = ti.filter(i=>!isDone(i.status)&&!isActive(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1);
  const trisks = ti.filter(i=>isRisk(i)&&!isDone(i.status));
  const all8   = [...tdone,...tact,...tnext].slice(0,8);

  // ——— Slide 1: غلاف المسار ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.navy };
    slide.addShape(prs.ShapeType.rect,{x:0,y:6.8,w:W,h:0.7,fill:{color:td.color}});
    slide.addText(`المسار ${td.num}`,{x:1,y:1.5,w:11.3,h:0.8,color:td.color,bold:true,fontSize:28,align:"center",fontFace:"Arial",rtlMode:true});
    slide.addText(`نموذج التقرير اليومي — ${td.name}`,{x:1,y:2.5,w:11.3,h:0.6,color:C.white,fontSize:16,align:"center",fontFace:"Arial",rtlMode:true});
    slide.addText("مشروع افتتاح حدائق الملك عبدالله العالمية",{x:1,y:3.2,w:11.3,h:0.4,color:"AAAAAA",fontSize:11,align:"center",fontFace:"Arial",rtlMode:true});
    slide.addText(`الأسبوع ${weekNum()} | ${today()}`,{x:1,y:4.0,w:11.3,h:0.4,color:td.color,fontSize:12,align:"center",fontFace:"Arial",rtlMode:true});
  }

  // ——— Slide 2: الملخص ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٢", `ملخص يومي لمسار ${td.name}`);

    // الحالة
    const sColor = statusColor(track.status||"");
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.1,w:3.2,h:1.65,fill:{color:C.white},line:{color:sColor,pt:2}});
    slide.addText("حالة المسار اليوم",{x:0.69,y:1.2,w:2.88,h:0.3,color:C.dark,fontSize:10,bold:true,fontFace:"Arial",rtlMode:true});
    slide.addShape(prs.ShapeType.rect,{x:1.0,y:1.55,w:2.0,h:0.4,fill:{color:sColor}});
    slide.addText(statusLabel(track.status||""),{x:1.0,y:1.55,w:2.0,h:0.4,color:C.white,fontSize:12,bold:true,align:"center",fontFace:"Arial",rtlMode:true});
    slide.addText(`نسبة الإنجاز: ${track.progress||0}%`,{x:0.7,y:2.05,w:2.8,h:0.4,color:C.dark,fontSize:9,fontFace:"Arial",rtlMode:true});

    // الإنجازات
    slide.addShape(prs.ShapeType.rect,{x:3.98,y:1.1,w:4.3,h:1.65,fill:{color:C.white},line:{color:C.green,pt:1}});
    slide.addText("✓ ملخص الإنجاز",{x:4.12,y:1.2,w:3.98,h:0.3,color:C.green,fontSize:10,bold:true,fontFace:"Arial",rtlMode:true});
    slide.addText(tdone.slice(0,3).map(i=>`• ${i.title}`).join("\n")||"• لا يوجد",{x:4.2,y:1.52,w:3.8,h:1.0,color:C.dark,fontSize:9,fontFace:"Arial",rtlMode:true,valign:"top"});

    // الدعم المطلوب
    slide.addShape(prs.ShapeType.rect,{x:8.5,y:1.1,w:4.3,h:1.65,fill:{color:C.white},line:{color:C.red,pt:1}});
    slide.addText("⚠ الدعم المطلوب من PMO",{x:8.64,y:1.2,w:3.98,h:0.3,color:C.red,fontSize:10,bold:true,fontFace:"Arial",rtlMode:true});
    const support = trisks[0]?`${trisks[0].title}\nآخر موعد: ${fmtDate(trisks[0].due)}`:"لا يوجد طلبات دعم حالياً";
    slide.addText(support,{x:8.72,y:1.52,w:3.8,h:1.0,color:C.dark,fontSize:9,fontFace:"Arial",rtlMode:true,valign:"top"});

    // جدول التحديث التفصيلي
    slide.addText("التحديث التفصيلي اليومي",{x:0.55,y:3.0,w:12.25,h:0.3,color:C.dark,fontSize:11,bold:true,fontFace:"Arial",rtlMode:true});
    const detHdr=["البند","أمس (منجز)","اليوم (جاري)","غداً (مخطط)","الحالة","ملاحظات"];
    const detW  =[2.2,      2.2,         2.2,            2.2,          1.3,     1.8];
    let dx=0.55;
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:3.35,w:12.25,h:0.32,fill:{color:td.color}});
    detHdr.forEach((h,i)=>{ slide.addText(h,{x:dx,y:3.41,w:detW[i],h:0.16,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true}); dx+=detW[i]; });

    const rowGroups=[
      {label:"أنشطة رئيسية",    items:ti.filter(i=>i.type==="tasks"||i.type==="مهمة")},
      {label:"مخرجات/اعتمادات", items:ti.filter(i=>i.type==="milestones"||i.type==="معلم رئيسي")},
      {label:"تنسيق مع جهات",   items:ti.filter(i=>i.type==="permits"||i.type==="تصريح")},
      {label:"مخاطر وقضايا",    items:trisks},
    ];
    rowGroups.forEach((grp,ri)=>{
      dx=0.55; const ty=3.73+ri*0.6;
      const bg=ri%2?"FAFAFA":C.white;
      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty,w:12.25,h:0.55,fill:{color:bg}});
      const d=grp.items.filter(i=>isDone(i.status))[0]?.title||"—";
      const a=grp.items.filter(i=>isActive(i.status))[0]?.title||"—";
      const n=grp.items.filter(i=>!isDone(i.status)&&!isActive(i.status))[0]?.title||"—";
      const s=grp.items[0]?statusLabel(grp.items[0].status):"—";
      [grp.label,d,a,n,s,"—"].forEach((v,ci)=>{
        slide.addText(v,{x:dx,y:ty+0.05,w:detW[ci],h:0.45,color:C.dark,fontSize:7.5,fontFace:"Arial",rtlMode:true,valign:"middle"});
        dx+=detW[ci];
      });
    });
  }

  // ——— Slide 3: الأنشطة التفصيلية ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٣", `تفاصيل أنشطة مسار ${td.name}`);
    slide.addText("قائمة أعمال المسار اليومية",{x:0.55,y:1.0,w:12.25,h:0.3,color:C.dark,fontSize:11,bold:true,fontFace:"Arial",rtlMode:true});

    const tblHdr=["#","النشاط/المخرج","المالك","البداية","النهاية","الحالة","نسبة الإنجاز","الاعتماد"];
    const tblW  =[0.35,3.2,          1.4,    1.2,     1.2,    1.3,    1.1,             2.0];
    let thx=0.55;
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.35,w:12.25,h:0.32,fill:{color:td.color}});
    tblHdr.forEach((h,i)=>{ slide.addText(h,{x:thx,y:1.41,w:tblW[i],h:0.16,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true}); thx+=tblW[i]; });

    all8.forEach((item,ri)=>{
      thx=0.55; const ty=1.72+ri*0.52;
      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty-0.03,w:12.25,h:0.48,fill:{color:ri%2?"F5F7F9":C.white}});
      [String(ri+1),item.title||"—",item.owner||"—","—",fmtDate(item.due),statusLabel(item.status),`${item.progress||0}%`,"—"].forEach((v,ci)=>{
        slide.addText(v,{x:thx,y:ty,w:tblW[ci],h:0.4,color:ci===5?statusColor(item.status):C.dark,fontSize:ci===1?8:7,bold:ci===5,fontFace:"Arial",rtlMode:true,valign:"middle"});
        thx+=tblW[ci];
      });
    });
    if(all8.length===0){
      slide.addText("لا توجد بنود مسجلة لهذا المسار في Google Sheet",{x:1,y:3,w:11.3,h:1,color:C.dark,fontSize:12,align:"center",fontFace:"Arial",rtlMode:true});
    }
  }

  // ——— Slide 4: المخاطر ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٤", `المخاطر والقضايا — مسار ${td.name}`);

    const rHdr=["الحالة","الوصف","التوصية","المالك","آخر موعد"];
    const rW  =[1.2,    3.5,    2.5,      1.5,    1.5];
    let rx2=0.55;
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.1,w:10.2,h:0.35,fill:{color:C.navy}});
    rHdr.forEach((h,i)=>{ slide.addText(h,{x:rx2,y:1.17,w:rW[i],h:0.2,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true}); rx2+=rW[i]; });

    if(trisks.length===0){
      slide.addText("✓ لا توجد مخاطر مفتوحة لهذا المسار",{x:1,y:2.5,w:11.3,h:0.6,color:C.green,fontSize:14,align:"center",bold:true,fontFace:"Arial",rtlMode:true});
    }
    trisks.slice(0,6).forEach((r,ri)=>{
      rx2=0.55; const ty=1.55+ri*0.55;
      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty-0.05,w:10.2,h:0.5,fill:{color:ri%2?"F9F9F9":C.white}});
      [statusLabel(r.status),r.title||"—","متابعة عاجلة",r.owner||"—",fmtDate(r.due)].forEach((v,i)=>{
        slide.addText(v,{x:rx2,y:ty,w:rW[i],h:0.4,color:i===0?statusColor(r.status):C.dark,fontSize:7,bold:i===0,fontFace:"Arial",rtlMode:true,valign:"middle"});
        rx2+=rW[i];
      });
    });

    // إحصائيات المسار
    const statBox=[
      {l:"إجمالي بنود المسار",v:ti.length,       c:C.teal},
      {l:"بنود مكتملة",       v:tdone.length,    c:C.green},
      {l:"بنود جارية",        v:tact.length,     c:C.gold},
      {l:"مخاطر مفتوحة",     v:trisks.length,   c:C.red},
    ];
    statBox.forEach((s,i)=>{
      slide.addShape(prs.ShapeType.rect,{x:10.8,y:1.1+i*1.05,w:2.2,h:0.9,fill:{color:s.c}});
      slide.addText(s.l,{x:10.8,y:1.15+i*1.05,w:2.2,h:0.3,color:C.white,fontSize:7,align:"center",fontFace:"Arial",rtlMode:true});
      slide.addText(String(s.v),{x:10.8,y:1.45+i*1.05,w:2.2,h:0.45,color:C.white,fontSize:22,bold:true,align:"center",fontFace:"Arial"});
    });
  }

  // ——— Slide 5: السلامة والجودة ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٥", `السلامة والجودة — مسار ${td.name}`);
    slide.addText("يُملأ من مسؤول المسار — لا تتوفر بيانات السلامة في Google Sheet",{
      x:1,y:3,w:11.3,h:1,color:C.dark,fontSize:12,align:"center",fontFace:"Arial",rtlMode:true
    });
  }

  // ——— Slide 6: الجدول الزمني ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٦", `الجدول الزمني — مسار ${td.name}`);
    slide.addText("أمس = ما تم إنجازه | اليوم = ما يتم تنفيذه الآن | غداً = ما سيتم تنفيذه",{x:0.5,y:0.85,w:12.3,h:0.25,color:C.dark,fontSize:8,align:"center",fontFace:"Arial",rtlMode:true});

    const cols3=[
      {label:"مكتمل ✓ — أمس",  color:C.green, items:tdone.slice(0,4)},
      {label:"جاري ⟳ — اليوم", color:td.color,items:tact.slice(0,4)},
      {label:"مخطط ○ — غداً",  color:C.teal,  items:tnext.slice(0,4)},
    ];
    cols3.forEach((col,ci)=>{
      const cx=0.55+ci*4.2;
      slide.addShape(prs.ShapeType.rect,{x:cx,y:1.2,w:4.0,h:0.5,fill:{color:col.color}});
      slide.addText(col.label,{x:cx,y:1.25,w:4.0,h:0.4,color:C.white,fontSize:11,bold:true,align:"center",fontFace:"Arial",rtlMode:true});
      slide.addShape(prs.ShapeType.rect,{x:cx,y:1.7,w:4.0,h:4.0,fill:{color:C.white},line:{color:col.color,pt:1}});
      slide.addText(col.items.map(i=>`• ${i.title}`).join("\n")||"• لا يوجد",{x:cx+0.1,y:1.8,w:3.8,h:3.7,color:C.dark,fontSize:9,fontFace:"Arial",rtlMode:true,valign:"top"});
    });
  }

  // ——— Slide 7: التوصيات ———
  {
    const slide = prs.addSlide();
    slide.background = { color: C.bg };
    addHeader(prs, slide, "٠٧", `مرفقات وتوصيات — مسار ${td.name}`);

    const pending2 = ti.filter(i=>!isDone(i.status)&&i.due).sort((a,b)=>a.due>b.due?1:-1).slice(0,4);
    slide.addShape(prs.ShapeType.rect,{x:0.55,y:1.1,w:12.25,h:0.35,fill:{color:C.navy}});
    ["#","التوصية","القرار المطلوب","المالك","موعد الحسم"].forEach((h,i)=>{
      const ws=[0.4,4.5,3.5,1.8,1.8]; const xs=[0.55,0.95,5.45,8.95,10.75];
      slide.addText(h,{x:xs[i],y:1.17,w:ws[i],h:0.2,color:C.white,fontSize:7,bold:true,fontFace:"Arial",rtlMode:true});
    });
    pending2.forEach((item,ri)=>{
      const ty=1.55+ri*0.7;
      slide.addShape(prs.ShapeType.rect,{x:0.55,y:ty,w:12.25,h:0.65,fill:{color:ri%2?"FAFAFA":C.white}});
      [String(ri+1),item.title||"—","متابعة وتنفيذ",item.owner||"—",fmtDate(item.due)].forEach((v,i)=>{
        const ws=[0.4,4.5,3.5,1.8,1.8]; const xs=[0.55,0.95,5.45,8.95,10.75];
        slide.addText(v,{x:xs[i],y:ty+0.05,w:ws[i],h:0.55,color:C.dark,fontSize:8,fontFace:"Arial",rtlMode:true,valign:"middle"});
      });
    });
    slide.addText(`مشروع افتتاح حدائق الملك عبدالله العالمية | نموذج التقرير اليومي للمسار | المسار ${td.num}`,{
      x:0.2,y:6.9,w:12.9,h:0.35,color:C.dark,fontSize:7,align:"center",fontFace:"Arial",rtlMode:true
    });
  }

  // ——— Slide 8: الشكر ———
  addThankSlide(prs);
}

// =========================================================
// الدالة الرئيسية
// =========================================================
async function generateReport(type, state) {
  const prs = new PptxGenJS();
  prs.layout = "LAYOUT_WIDE";
  prs.rtl = true;

  if (type === "comprehensive") {
    buildComprehensive(prs, state);
  } else if (["أ","ب","ج","د"].includes(type)) {
    buildTrack(prs, state, type);
  } else {
    throw new Error("نوع تقرير غير معروف: " + type);
  }

  const buf = await prs.write({ outputType: "nodebuffer" });
  return buf;
}

module.exports = { generateReport };
