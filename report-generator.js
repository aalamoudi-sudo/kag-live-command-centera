"use strict";
/**
 * report-generator.js
 * يُولِّد تقارير PPTX من بيانات liveState
 * لا يُعدِّل أي جزء آخر من النظام
 */

const pptxgen = require("pptxgenjs");

// ============================================================
// ثوابت التصميم — مستوحاة من القوالب الأصلية
// ============================================================
const C = {
  navy:    "1A2C5B",
  teal:    "0A7368",
  gold:    "C4972A",
  white:   "FFFFFF",
  offWhite:"F4F6F9",
  gray:    "64748B",
  lightGray:"E2E8F0",
  red:     "DC2626",
  amber:   "D97706",
  green:   "16A34A",
  darkText:"1E293B",
  headerBg:"1A2C5B",
};

const FONT = "Arial";

// خريطة المسارات
const TRACK_MAP = {
  "أ": { label:"التخطيط والتنسيق",         num:"٠١", scope:"الحوكمة، الجدول الزمني، الاعتمادات، التصاريح، المخاطر" },
  "ب": { label:"التواصل والتسويق",           num:"٠٢", scope:"الخطة الإعلامية، التغطية، التوثيق، المحتوى" },
  "ج": { label:"الفعاليات والأنشطة المصاحبة",num:"٠٣", scope:"البروتوكول، الضيافة، الإنتاج التقني، إدارة الحشود" },
  "د": { label:"تجهيز وتفعيل الحديقة",      num:"٠٤", scope:"الحديقة والمسارات، السلامة، الاستدامة، الجاهزية" },
};

// حالة → لون
function statusColor(s) {
  if (!s) return C.gray;
  if (["مكتملة","مكتمل","معتمدة","معتمد","ضمن المسار"].includes(s)) return C.green;
  if (["قيد التنفيذ","تحت المتابعة"].includes(s)) return C.amber;
  if (["معرضة للخطر","معرض للخطر","متأخرة"].includes(s)) return C.red;
  return C.gray;
}

function statusLabel(s) {
  if (!s) return "غير محدد";
  if (["مكتملة","مكتمل","معتمدة","معتمد","ضمن المسار"].includes(s)) return "أخضر";
  if (["قيد التنفيذ","تحت المتابعة"].includes(s)) return "أصفر";
  if (["معرضة للخطر","معرض للخطر","متأخرة"].includes(s)) return "أحمر";
  return s;
}

// تنسيق التاريخ عربي
function formatDate(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("ar-SA", { year:"numeric", month:"long", day:"numeric" });
  } catch { return d; }
}

function todayAr() {
  return new Date().toLocaleDateString("ar-SA", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

function weekNum() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
}

// ============================================================
// مساعدات رسم مشتركة
// ============================================================
function addHeader(slide, pres, title, pageNum) {
  // شريط علوي
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:0.55,
    fill:{ color: C.navy }, line:{ color: C.navy }
  });
  slide.addText("مشروع افتتاح حدائق الملك عبدالله العالمية", {
    x:0.15, y:0, w:7, h:0.55,
    fontFace:FONT, fontSize:11, color:C.white,
    align:"right", valign:"middle", rtlMode:true
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:8.3, y:0, w:1.7, h:0.55,
    fill:{ color: C.teal }, line:{ color: C.teal }
  });
  slide.addText(pageNum, {
    x:8.3, y:0, w:1.7, h:0.55,
    fontFace:FONT, fontSize:13, color:C.white, bold:true,
    align:"center", valign:"middle"
  });
  // عنوان الشريحة
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0.55, w:10, h:0.5,
    fill:{ color: C.offWhite }, line:{ color: C.lightGray, width:0.5 }
  });
  slide.addText(title, {
    x:0.2, y:0.55, w:9.6, h:0.5,
    fontFace:FONT, fontSize:14, color:C.navy, bold:true,
    align:"right", valign:"middle", rtlMode:true
  });
}

function addFooter(slide, pres, trackLabel) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:5.35, w:10, h:0.28,
    fill:{ color: C.navy }, line:{ color: C.navy }
  });
  slide.addText(trackLabel + " | " + todayAr(), {
    x:0.2, y:5.35, w:9.6, h:0.28,
    fontFace:FONT, fontSize:8, color:C.white,
    align:"right", valign:"middle", rtlMode:true
  });
}

function sectionTitle(slide, pres, text, x, y, w, h) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h:h||0.3,
    fill:{ color: C.teal }, line:{ color: C.teal }
  });
  slide.addText(text, {
    x, y, w, h:h||0.3,
    fontFace:FONT, fontSize:10, color:C.white, bold:true,
    align:"right", valign:"middle", rtlMode:true, margin:4
  });
}

function statusBadge(slide, pres, status, x, y) {
  const col = statusColor(status);
  const lbl = statusLabel(status);
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w:1.1, h:0.28, rectRadius:0.05,
    fill:{ color: col }, line:{ color: col }
  });
  slide.addText(lbl, {
    x, y, w:1.1, h:0.28,
    fontFace:FONT, fontSize:9, color:C.white, bold:true,
    align:"center", valign:"middle", rtlMode:true
  });
}

// ============================================================
// شريحة الغلاف — الشامل
// ============================================================
function buildCoverSlide(pres, date) {
  const slide = pres.addSlide();

  // خلفية
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:5.625,
    fill:{ color: C.navy }, line:{ color: C.navy }
  });
  // شريط ذهبي
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:2.4, w:10, h:0.06,
    fill:{ color: C.gold }, line:{ color: C.gold }
  });

  slide.addText("تقرير يومي", {
    x:0.5, y:0.5, w:9, h:0.8,
    fontFace:FONT, fontSize:13, color:C.gold, bold:false,
    align:"center", valign:"middle", rtlMode:true
  });
  slide.addText("مشروع افتتاح حدائق الملك عبدالله العالمية", {
    x:0.5, y:1.1, w:9, h:1,
    fontFace:FONT, fontSize:22, color:C.white, bold:true,
    align:"center", valign:"middle", rtlMode:true
  });

  const wk = weekNum();
  slide.addText(`الأسبوع ${wk} | ${date}`, {
    x:0.5, y:2.55, w:9, h:0.5,
    fontFace:FONT, fontSize:12, color:"CADCFC",
    align:"center", valign:"middle", rtlMode:true
  });

  // المسارات الأربعة
  const tracks = ["تجهيز وتفعيل الحديقة","الفعاليات والأنشطة المصاحبة","التواصل والتسويق","التخطيط والتنسيق"];
  tracks.forEach((t, i) => {
    const x = 0.5 + i * 2.25;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y:3.2, w:2.1, h:0.7,
      fill:{ color: C.teal }, line:{ color: C.teal }
    });
    slide.addText(t, {
      x, y:3.2, w:2.1, h:0.7,
      fontFace:FONT, fontSize:9, color:C.white, bold:true,
      align:"center", valign:"middle", rtlMode:true
    });
  });

  slide.addText("نموذج تنفيذي مرتب لمتابعة التقدم، المسارات الأربعة، المخاطر، القرارات، والسلامة والجودة", {
    x:0.5, y:4.1, w:9, h:0.5,
    fontFace:FONT, fontSize:9, color:"94A3B8",
    align:"center", valign:"middle", rtlMode:true
  });
}

// ============================================================
// شريحة الملخص التنفيذي — الشامل (شريحة 02)
// ============================================================
function buildSummarySlide(pres, state) {
  const slide = pres.addSlide();
  addHeader(slide, pres, "ملخص يومي تنفيذي", "٠٢");

  const tracks = state.tracks || [];
  const overallProgress = tracks.length
    ? Math.round(tracks.reduce((s, t) => s + (t.progress || 0), 0) / tracks.length)
    : 0;
  const worstStatus = tracks.some(t => ["معرض للخطر","معرضة للخطر"].includes(t.status))
    ? "معرضة للخطر"
    : tracks.some(t => t.status === "تحت المتابعة") ? "تحت المتابعة" : "ضمن المسار";

  // بطاقة الحالة
  sectionTitle(slide, pres, "حالة اليوم", 0.2, 1.15, 4.5);

  const statusCol = statusColor(worstStatus);
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.2, y:1.5, w:4.5, h:1.4,
    fill:{ color: "F8FAFC" }, line:{ color: C.lightGray, width:0.5 }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.2, y:1.5, w:0.08, h:1.4,
    fill:{ color: statusCol }, line:{ color: statusCol }
  });
  slide.addText(statusLabel(worstStatus), {
    x:0.35, y:1.55, w:2, h:0.45,
    fontFace:FONT, fontSize:18, color:statusCol, bold:true,
    align:"right", valign:"middle", rtlMode:true
  });
  slide.addText(`نسبة الإنجاز الكلية: ${overallProgress}٪`, {
    x:0.35, y:2.05, w:4, h:0.35,
    fontFace:FONT, fontSize:11, color:C.darkText,
    align:"right", valign:"middle", rtlMode:true
  });
  // شريط إنجاز
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.35, y:2.45, w:3.8, h:0.18,
    fill:{ color: C.lightGray }, line:{ color: C.lightGray }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.35, y:2.45, w: Math.max(0.05, 3.8 * overallProgress / 100), h:0.18,
    fill:{ color: statusCol }, line:{ color: statusCol }
  });

  // القضايا الحرجة
  sectionTitle(slide, pres, "القضايا الحرجة والتصعيد", 5.0, 1.15, 4.8);

  const risks = (state.items || []).filter(i =>
    ["risks","مخاطرة","مخاطر"].includes(i.type) && i.status !== "مغلقة"
  ).slice(0, 3);

  const riskHeaders = [["القضية","الأثر","الإجراء","المالك","موعد الإجراء"]];
  const riskRows = risks.length
    ? risks.map(r => [r.title||"", "—", "متابعة", r.owner||"—", formatDate(r.due)])
    : [["لا توجد قضايا حرجة","—","—","—","—"]];

  slide.addTable([...riskHeaders, ...riskRows], {
    x:5.0, y:1.5, w:4.8, h:1.4,
    fontFace:FONT, fontSize:8, rtlMode:true,
    align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH: 0.28,
    headerRowH: 0.3,
    color: C.darkText,
    bold: false,
    fill: C.white,
    colW:[2.2, 0.6, 0.9, 0.8, 0.9],
  });

  // إنجازات المسارات
  sectionTitle(slide, pres, "ملخص المسارات", 0.2, 3.05, 9.6);

  const tRows = tracks.map(t => [
    t.name || t.track || "",
    `${t.progress || 0}٪`,
    statusLabel(t.status),
    `${t.done || 0}/${t.tasks || 0}`,
    `${t.risk || 0}`,
  ]);
  slide.addTable([["المسار","نسبة الإنجاز","الحالة","المهام المكتملة","المخاطر المفتوحة"], ...tRows
  ], {
    x:0.2, y:3.4, w:9.6, h:1.8,
    fontFace:FONT, fontSize:9, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.32, color:C.darkText, fill:C.white,
    colW:[3.5, 1.5, 1.5, 2, 1.6],
  });

  addFooter(slide, pres, "التقرير اليومي الشامل");
}

// ============================================================
// شريحة حالة المسارات الأربعة — الشامل (03)
// ============================================================
function buildTracksSlide(pres, state) {
  const slide = pres.addSlide();
  addHeader(slide, pres, "حالة المسارات الأربعة", "٠٣");

  const tracks = state.tracks || [];
  sectionTitle(slide, pres, "حالة المسارات اليومية", 0.2, 1.15, 9.6);

  const headers = [["المسار","إنجاز أمس","خطة اليوم","خطة الغد","الحالة","الدعم المطلوب"]];
  const rows = tracks.map(t => {
    const done = (state.items||[])
      .filter(i => i.track===t.track && ["مكتملة","مكتمل","معتمدة","معتمد"].includes(i.status))
      .slice(0,2).map(i => i.title).join(" / ") || "—";
    const active = (state.items||[])
      .filter(i => i.track===t.track && ["قيد التنفيذ"].includes(i.status))
      .slice(0,2).map(i => i.title).join(" / ") || "—";
    const upcoming = (state.items||[])
      .filter(i => i.track===t.track && i.due && new Date(i.due) > new Date())
      .sort((a,b) => new Date(a.due)-new Date(b.due))
      .slice(0,2).map(i => i.title).join(" / ") || "—";
    return [
      t.name || t.track || "",
      done,
      active,
      upcoming,
      statusLabel(t.status),
      t.risk > 0 ? `${t.risk} مخاطر مفتوحة` : "لا يوجد"
    ];
  });

  slide.addTable([...headers, ...rows], {
    x:0.2, y:1.5, w:9.6, h:3.6,
    fontFace:FONT, fontSize:8.5, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.65, color:C.darkText, fill:C.white,
    colW:[2.2, 1.8, 1.8, 1.8, 1, 1.2],
  });

  addFooter(slide, pres, "التقرير اليومي الشامل");
}

// ============================================================
// شريحة السلامة والجودة — الشامل (04)
// ============================================================
function buildSafetySlide(pres, state) {
  const slide = pres.addSlide();
  addHeader(slide, pres, "السلامة والجودة اليومية", "٠٤");

  const risks = (state.items||[]).filter(i =>
    ["risks","مخاطرة","مخاطر"].includes(i.type)
  );
  const openRisks = risks.filter(r => r.status !== "مغلقة");
  const closedRisks = risks.filter(r => r.status === "مغلقة");
  const critical = risks.filter(r => ["معرضة للخطر","معرض للخطر"].includes(r.status));

  // مؤشرات السلامة
  sectionTitle(slide, pres, "مؤشرات السلامة اليومية", 0.2, 1.15, 9.6);

  const kpis = [
    { label:"ساعات العمل", val:"٠٠٠٠" },
    { label:"شبه حادث", val: String(critical.length) },
    { label:"حوادث مسجلة", val:"٠" },
    { label:"إيقافات سلامة", val:"٠" },
  ];
  kpis.forEach((k, i) => {
    const x = 0.2 + i * 2.4;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y:1.5, w:2.2, h:0.9,
      fill:{ color: i === 1 && critical.length > 0 ? "FEF2F2" : C.offWhite },
      line:{ color: i === 1 && critical.length > 0 ? C.red : C.lightGray, pt:0.5 }
    });
    slide.addText(k.val, {
      x, y:1.5, w:2.2, h:0.5,
      fontFace:FONT, fontSize:20, color: i === 1 && critical.length > 0 ? C.red : C.navy,
      bold:true, align:"center", valign:"middle"
    });
    slide.addText(k.label, {
      x, y:2.0, w:2.2, h:0.4,
      fontFace:FONT, fontSize:9, color:C.gray,
      align:"center", valign:"middle", rtlMode:true
    });
  });

  // جدول المخاطر المفتوحة
  sectionTitle(slide, pres, "أبرز المخاطر المفتوحة", 0.2, 2.6, 9.6);
  const riskRows = openRisks.slice(0,4).map(r => [
    r.title||"", r.owner||"—", formatDate(r.due), statusLabel(r.status)
  ]);
  if (!riskRows.length) riskRows.push(["لا توجد مخاطر مفتوحة","—","—","أخضر"]);

  slide.addTable([["الوصف","المالك","آخر موعد","الحالة"], ...riskRows
  ], {
    x:0.2, y:2.95, w:9.6, h:1.6,
    fontFace:FONT, fontSize:8.5, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.35, color:C.darkText, fill:C.white,
    colW:[5.5, 1.5, 1.5, 1.1],
  });

  // الجودة
  sectionTitle(slide, pres, "الجودة والجاهزية", 0.2, 4.65, 9.6);
  slide.addText([
    { text:`ملاحظات عدم المطابقة المفتوحة: ${openRisks.length}     `, options:{} },
    { text:`ملاحظات عدم المطابقة المغلقة: ${closedRisks.length}`, options:{} },
  ], {
    x:0.2, y:5.0, w:9.6, h:0.3,
    fontFace:FONT, fontSize:9, color:C.darkText,
    align:"right", rtlMode:true
  });

  addFooter(slide, pres, "التقرير اليومي الشامل");
}

// ============================================================
// شريحة المخاطر والقرارات — الشامل (05)
// ============================================================
function buildRisksSlide(pres, state) {
  const slide = pres.addSlide();
  addHeader(slide, pres, "المخاطر والقضايا والقرارات اليومية", "٠٥");

  const risks = (state.items||[]).filter(i =>
    ["risks","مخاطرة","مخاطر"].includes(i.type) && i.status !== "مغلقة"
  );
  const critical = risks.filter(r => ["معرضة للخطر","معرض للخطر"].includes(r.status));
  const medium   = risks.filter(r => ["تحت المتابعة","قيد التنفيذ"].includes(r.status));
  const low      = risks.filter(r => !["معرضة للخطر","معرض للخطر","تحت المتابعة","قيد التنفيذ"].includes(r.status));

  sectionTitle(slide, pres, "أهم المخاطر", 0.2, 1.15, 9.6);

  const buckets = [
    { label:"أحمر", items: critical, color: C.red },
    { label:"أصفر", items: medium,   color: C.amber },
    { label:"أخضر", items: low,      color: C.green },
  ];

  buckets.forEach((b, bi) => {
    const y = 1.5 + bi * 0.7;
    slide.addShape(pres.shapes.RECTANGLE, {
      x:0.2, y, w:0.7, h:0.55,
      fill:{ color: b.color }, line:{ color: b.color }
    });
    slide.addText(b.label, {
      x:0.2, y, w:0.7, h:0.55,
      fontFace:FONT, fontSize:9, color:C.white, bold:true,
      align:"center", valign:"middle"
    });
    const item = b.items[0];
    slide.addShape(pres.shapes.RECTANGLE, {
      x:0.95, y, w:9.05, h:0.55,
      fill:{ color: C.offWhite }, line:{ color: C.lightGray, pt:0.5 }
    });
    slide.addText(item ? `${item.title} | المالك: ${item.owner||"—"} | موعد: ${formatDate(item.due)}` : "لا يوجد",{
      x:1.0, y, w:8.9, h:0.55,
      fontFace:FONT, fontSize:9, color:C.darkText,
      align:"right", valign:"middle", rtlMode:true
    });
  });

  sectionTitle(slide, pres, "قرارات واعتمادات مطلوبة اليوم", 0.2, 3.7, 9.6);

  const decRows = risks.slice(0, 3).map((r,i) => [
    `خطر/قضية-${i+1}`, r.title||"", "متابعة عاجلة", r.owner||"—"
  ]);
  if (!decRows.length) decRows.push(["—","لا توجد قرارات عاجلة","—","—"]);

  slide.addTable([["الرمز","الوصف","الإجراء","المالك"], ...decRows
  ], {
    x:0.2, y:4.05, w:9.6, h:1.0,
    fontFace:FONT, fontSize:8.5, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.28, color:C.darkText, fill:C.white,
    colW:[1.6, 4.5, 2, 1.5],
  });

  addFooter(slide, pres, "التقرير اليومي الشامل");
}

// ============================================================
// شريحة الجدول الزمني — الشامل (06)
// ============================================================
function buildTimelineSlide(pres, state, trackFilter) {
  const slide = pres.addSlide();
  const isTrack = !!trackFilter;
  addHeader(slide, pres, isTrack ? "الجدول الزمني اليومي للمسار" : "الجدول الزمني اليومي",
    isTrack ? "٠٦" : "٠٦");

  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const tomorrow  = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);

  let items = (state.items||[]).filter(i => i.type !== "risks" && i.type !== "مخاطرة");
  if (trackFilter) items = items.filter(i => i.track === trackFilter);

  const done = items.filter(i => ["مكتملة","مكتمل","معتمدة","معتمد"].includes(i.status)).slice(0,4);
  const active = items.filter(i => ["قيد التنفيذ"].includes(i.status)).slice(0,4);
  const upcoming = items.filter(i => i.due && new Date(i.due) >= tomorrow).sort((a,b)=>new Date(a.due)-new Date(b.due)).slice(0,4);

  const cols = [
    { title:"١\nمكتمل\nأمس", label:"ما تم إنجازه أمس", items:done, statusColor:C.green },
    { title:"٢\nجاري العمل\nاليوم", label:"ما يتم إنجازه اليوم", items:active, statusColor:C.amber },
    { title:"٣\nمستقبلي\nغداً", label:"ما سيتم إنجازه غداً", items:upcoming, statusColor:C.teal },
  ];

  cols.forEach((col, i) => {
    const x = 0.2 + i * 3.25;
    // رأس العمود
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y:1.15, w:3.1, h:0.6,
      fill:{ color: col.statusColor }, line:{ color: col.statusColor }
    });
    slide.addText(col.label, {
      x, y:1.15, w:3.1, h:0.6,
      fontFace:FONT, fontSize:10, color:C.white, bold:true,
      align:"center", valign:"middle", rtlMode:true
    });
    // المحتوى
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y:1.78, w:3.1, h:3.4,
      fill:{ color: C.offWhite }, line:{ color: C.lightGray, pt:0.5 }
    });

    if (col.items.length) {
      const textItems = col.items.map(item => ({
        text: `• ${item.title}${item.due ? "\n  " + formatDate(item.due) : ""}`,
        options: { breakLine:true, paraSpaceAfter:4 }
      }));
      slide.addText(textItems, {
        x:x+0.08, y:1.85, w:2.94, h:3.25,
        fontFace:FONT, fontSize:8.5, color:C.darkText,
        align:"right", valign:"top", rtlMode:true
      });
    } else {
      slide.addText("لا يوجد", {
        x, y:3.1, w:3.1, h:0.5,
        fontFace:FONT, fontSize:9, color:C.gray,
        align:"center", valign:"middle", rtlMode:true
      });
    }
  });

  addFooter(slide, pres, isTrack ? (TRACK_MAP[trackFilter]?.label||trackFilter) : "التقرير اليومي الشامل");
}

// ============================================================
// شريحة التوصيات — فارغة للتعبئة اليدوية (07)
// ============================================================
function buildRecommendationsSlide(pres, isTrack) {
  const slide = pres.addSlide();
  addHeader(slide, pres, isTrack ? "مرفقات وصور اليوم" : "التوصيات المقترحة وخطة الغد", "٠٧");

  sectionTitle(slide, pres, "التوصيات المقترحة", 0.2, 1.15, 9.6);

  const headers = [["#","التوصية","السبب","القرار/الإجراء المطلوب","المالك","موعد الحسم"]];
  const rows = [
    ["١","","","","",""],
    ["٢","","","","",""],
    ["٣","","","","",""],
  ];
  slide.addTable([...headers, ...rows], {
    x:0.2, y:1.5, w:9.6, h:2.5,
    fontFace:FONT, fontSize:9, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.55, color:C.darkText, fill:C.white,
    colW:[0.4, 2.8, 2.2, 2.0, 1.2, 1.0],
  });

  if (isTrack) {
    sectionTitle(slide, pres, "صور / أدلة ميدانية", 0.2, 4.15, 9.6);
    slide.addShape(pres.shapes.RECTANGLE, {
      x:0.2, y:4.5, w:9.6, h:0.65,
      fill:{ color: C.offWhite }, line:{ color: C.lightGray, pt:0.5 }
    });
    slide.addText("ضع هنا روابط الأدلة أو صور قبل/بعد من الموقع", {
      x:0.3, y:4.5, w:9.4, h:0.65,
      fontFace:FONT, fontSize:9, color:C.gray,
      align:"right", valign:"middle", rtlMode:true
    });
  } else {
    sectionTitle(slide, pres, "مرفقات التقرير اليومي", 0.2, 4.15, 9.6);
    slide.addText("صور اليوم  •  محضر الاجتماع الصباحي  •  سجل القرارات  •  سجل القضايا  •  روابط الأدلة والاعتمادات", {
      x:0.2, y:4.5, w:9.6, h:0.5,
      fontFace:FONT, fontSize:9, color:C.gray,
      align:"right", valign:"middle", rtlMode:true
    });
  }

  addFooter(slide, pres, isTrack ? "التقرير اليومي للمسار" : "التقرير اليومي الشامل");
}

// ============================================================
// شريحة الختام
// ============================================================
function buildThankYouSlide(pres) {
  const slide = pres.addSlide();
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:5.625,
    fill:{ color: C.navy }, line:{ color: C.navy }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:2.55, w:10, h:0.06,
    fill:{ color: C.gold }, line:{ color: C.gold }
  });
  slide.addText("شكراً لكم", {
    x:1, y:1.8, w:8, h:1,
    fontFace:FONT, fontSize:32, color:C.white, bold:true,
    align:"center", valign:"middle", rtlMode:true
  });
  slide.addText("مشروع افتتاح حدائق الملك عبدالله العالمية", {
    x:1, y:3.0, w:8, h:0.5,
    fontFace:FONT, fontSize:11, color:"94A3B8",
    align:"center", valign:"middle", rtlMode:true
  });
}

// ============================================================
// شريحة غلاف المسار
// ============================================================
function buildTrackCoverSlide(pres, trackKey, date) {
  const track = TRACK_MAP[trackKey] || { label: trackKey, num:"٠١", scope:"" };
  const slide = pres.addSlide();

  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:5.625,
    fill:{ color: C.navy }, line:{ color: C.navy }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0, y:2.3, w:10, h:0.06,
    fill:{ color: C.gold }, line:{ color: C.gold }
  });

  slide.addText(`المسار ${track.num}`, {
    x:0.5, y:0.6, w:9, h:0.5,
    fontFace:FONT, fontSize:13, color:C.gold, bold:false,
    align:"center", valign:"middle", rtlMode:true
  });
  slide.addText(`نموذج التقرير اليومي – ${track.label}`, {
    x:0.5, y:1.0, w:9, h:0.9,
    fontFace:FONT, fontSize:20, color:C.white, bold:true,
    align:"center", valign:"middle", rtlMode:true
  });
  slide.addText("مشروع افتتاح حدائق الملك عبدالله العالمية", {
    x:0.5, y:1.9, w:9, h:0.45,
    fontFace:FONT, fontSize:11, color:"CADCFC",
    align:"center", valign:"middle", rtlMode:true
  });
  slide.addText(date, {
    x:0.5, y:2.45, w:9, h:0.4,
    fontFace:FONT, fontSize:10, color:"94A3B8",
    align:"center", valign:"middle", rtlMode:true
  });

  if (track.scope) {
    slide.addShape(pres.shapes.RECTANGLE, {
      x:1.5, y:3.1, w:7, h:0.6,
      fill:{ color: C.teal }, line:{ color: C.teal }
    });
    slide.addText(`نطاق المسار: ${track.scope}`, {
      x:1.5, y:3.1, w:7, h:0.6,
      fontFace:FONT, fontSize:9, color:C.white,
      align:"center", valign:"middle", rtlMode:true
    });
  }

  slide.addText("يرسل يومياً من مسؤول المسار إلى مدير مكتب إدارة المشروع", {
    x:0.5, y:4.0, w:9, h:0.35,
    fontFace:FONT, fontSize:9, color:"64748B",
    align:"center", valign:"middle", rtlMode:true
  });
}

// ============================================================
// شريحة ملخص المسار (02)
// ============================================================
function buildTrackSummarySlide(pres, trackKey, state) {
  const track = TRACK_MAP[trackKey] || { label: trackKey, num:"٠١" };
  const slide = pres.addSlide();
  addHeader(slide, pres, `ملخص يومي لمسار ${track.label}`, "٠٢");

  const trackData = (state.tracks||[]).find(t => t.track === trackKey) || {};
  const items = (state.items||[]).filter(i => i.track === trackKey);
  const progress = trackData.progress || 0;
  const status = trackData.status || "قيد التنفيذ";

  // حالة المسار
  sectionTitle(slide, pres, "حالة المسار اليوم", 0.2, 1.15, 4.5);
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.2, y:1.5, w:4.5, h:1.6,
    fill:{ color: C.offWhite }, line:{ color: C.lightGray, pt:0.5 }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.2, y:1.5, w:0.08, h:1.6,
    fill:{ color: statusColor(status) }, line:{ color: statusColor(status) }
  });
  statusBadge(slide, pres, status, 0.35, 1.58);
  slide.addText(`نسبة إنجاز اليوم: ${progress}٪`, {
    x:0.35, y:1.95, w:4, h:0.35,
    fontFace:FONT, fontSize:11, color:C.darkText,
    align:"right", valign:"middle", rtlMode:true
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.35, y:2.35, w:4.0, h:0.18,
    fill:{ color: C.lightGray }, line:{ color: C.lightGray }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x:0.35, y:2.35, w:Math.max(0.05, 4.0*progress/100), h:0.18,
    fill:{ color: statusColor(status) }, line:{ color: statusColor(status) }
  });
  slide.addText(`المهام الكلية: ${trackData.tasks||0}  |  مكتملة: ${trackData.done||0}  |  مخاطر: ${trackData.risk||0}`, {
    x:0.35, y:2.6, w:4, h:0.35,
    fontFace:FONT, fontSize:9, color:C.gray,
    align:"right", valign:"middle", rtlMode:true
  });

  // الدعم المطلوب
  sectionTitle(slide, pres, "الدعم المطلوب من مكتب إدارة المشروع", 5.0, 1.15, 4.8);
  const openRisks = items.filter(i => ["risks","مخاطرة"].includes(i.type) && i.status !== "مغلقة");
  slide.addShape(pres.shapes.RECTANGLE, {
    x:5.0, y:1.5, w:4.8, h:1.6,
    fill:{ color: C.offWhite }, line:{ color: C.lightGray, pt:0.5 }
  });
  slide.addText(
    openRisks.length
      ? openRisks.slice(0,3).map(r => `• ${r.title}`).join("\n")
      : "• لا يوجد دعم عاجل مطلوب",
    {
      x:5.1, y:1.55, w:4.6, h:1.5,
      fontFace:FONT, fontSize:9, color:C.darkText,
      align:"right", valign:"top", rtlMode:true
    }
  );

  // التحديث التفصيلي
  sectionTitle(slide, pres, "التحديث التفصيلي اليومي", 0.2, 3.2, 9.6);

  const cats = ["أنشطة رئيسية","مخرجات/اعتمادات","تنسيق مع جهات","موردين/أطراف"];
  const tableRows = cats.map(cat => {
    const rel = items.filter(i => (i.owner||"").includes(cat.split("/")[0])).slice(0,1);
    return [cat, "منجز", "قيد التنفيذ", "مخطط", statusLabel(rel[0]?.status||""), "—"];
  });

  slide.addTable([["البند","أمس","اليوم","غداً","الحالة","ملاحظات"], ...tableRows
  ], {
    x:0.2, y:3.55, w:9.6, h:1.7,
    fontFace:FONT, fontSize:8.5, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.3, color:C.darkText, fill:C.white,
    colW:[2.2, 1.3, 1.5, 1.3, 1.3, 2.0],
  });

  addFooter(slide, pres, `التقرير اليومي — المسار ${track.num}`);
}

// ============================================================
// شريحة تفاصيل الأنشطة — المسار (03)
// ============================================================
function buildTrackActivitiesSlide(pres, trackKey, state) {
  const track = TRACK_MAP[trackKey] || { label: trackKey, num:"٠١" };
  const slide = pres.addSlide();
  addHeader(slide, pres, "تفاصيل الأنشطة اليومية", "٠٣");

  const items = (state.items||[])
    .filter(i => i.track === trackKey && i.type !== "risks" && i.type !== "مخاطرة")
    .slice(0, 8);

  sectionTitle(slide, pres, "قائمة أعمال المسار اليومية", 0.2, 1.15, 9.6);

  const rows = items.map((item, i) => [
    String(i+1),
    item.title || "—",
    item.owner || "—",
    formatDate(item.due) || "—",
    formatDate(item.due) || "—",
    statusLabel(item.status),
    `${item.progress||0}٪`,
    "—"
  ]);
  if (!rows.length) rows.push(["—","لا توجد أنشطة مسجلة","—","—","—","—","—","—"]);

  slide.addTable([["#","النشاط / المخرج","المالك","بداية","نهاية","الحالة","نسبة الإنجاز","الاعتماد/الدليل"], ...rows
  ], {
    x:0.2, y:1.5, w:9.6, h:3.8,
    fontFace:FONT, fontSize:8, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.38, color:C.darkText, fill:C.white,
    colW:[0.35, 2.8, 1.2, 1.0, 1.0, 0.9, 1.15, 1.2],
  });

  addFooter(slide, pres, `التقرير اليومي — المسار ${track.num}`);
}

// ============================================================
// شريحة مخاطر المسار (04)
// ============================================================
function buildTrackRisksSlide(pres, trackKey, state) {
  const track = TRACK_MAP[trackKey] || { label: trackKey, num:"٠١" };
  const slide = pres.addSlide();
  addHeader(slide, pres, "المخاطر والقضايا والتصعيد", "٠٤");

  const risks = (state.items||[]).filter(i =>
    i.track === trackKey && ["risks","مخاطرة","مخاطر"].includes(i.type) && i.status !== "مغلقة"
  );
  const critical = risks.filter(r => ["معرضة للخطر","معرض للخطر"].includes(r.status));
  const medium   = risks.filter(r => ["تحت المتابعة","قيد التنفيذ"].includes(r.status));
  const low      = risks.filter(r => !critical.includes(r) && !medium.includes(r));

  sectionTitle(slide, pres, "المخاطر", 0.2, 1.15, 9.6);

  const buckets = [
    { col:"ح", items:critical, color:C.red },
    { col:"أص", items:medium,  color:C.amber },
    { col:"أ",  items:low,     color:C.green },
  ];

  buckets.forEach((b, bi) => {
    const y = 1.5 + bi * 0.62;
    slide.addShape(pres.shapes.RECTANGLE, {
      x:0.2, y, w:0.5, h:0.52,
      fill:{ color: b.color }, line:{ color: b.color }
    });
    slide.addText(b.col, {
      x:0.2, y, w:0.5, h:0.52,
      fontFace:FONT, fontSize:9, color:C.white, bold:true,
      align:"center", valign:"middle"
    });
    const item = b.items[0];
    slide.addShape(pres.shapes.RECTANGLE, {
      x:0.75, y, w:9.05, h:0.52,
      fill:{ color: C.offWhite }, line:{ color: C.lightGray, pt:0.5 }
    });
    slide.addText(item
      ? `${item.title}  |  المالك: ${item.owner||"—"}  |  الموعد: ${formatDate(item.due)}`
      : "لا يوجد",{
      x:0.85, y, w:8.85, h:0.52,
      fontFace:FONT, fontSize:8.5, color:C.darkText,
      align:"right", valign:"middle", rtlMode:true
    });
  });

  // القرارات
  sectionTitle(slide, pres, "القرارات", 0.2, 3.45, 9.6);

  const decRows = risks.slice(0, 3).map((r, i) => [
    `خطر/قضية-${i+1}`, r.title||"—", "متابعة", r.owner||"—"
  ]);
  if (!decRows.length) decRows.push(["—","لا توجد قرارات","—","—"]);

  slide.addTable([["الرمز","الوصف","الإجراء","المالك"], ...decRows
  ], {
    x:0.2, y:3.8, w:9.6, h:1.0,
    fontFace:FONT, fontSize:8.5, rtlMode:true, align:"right",
    border:{ type:"solid", color:C.lightGray, pt:0.5 },
    rowH:0.28, color:C.darkText, fill:C.white,
    colW:[1.6, 4.5, 2.0, 1.5],
  });

  // ملاحظات
  sectionTitle(slide, pres, "الملاحظات", 0.2, 4.9, 9.6);
  slide.addText([
    { text:"• أي تأثير على التقرير اليومي الشامل أو على مسارات أخرى يتم الإشارة إليه هنا", options:{ breakLine:true } },
  ], {
    x:0.2, y:5.0, w:9.6, h:0.28,
    fontFace:FONT, fontSize:8, color:C.gray,
    align:"right", rtlMode:true
  });

  addFooter(slide, pres, `التقرير اليومي — المسار ${track.num}`);
}

// ============================================================
// الدالة الرئيسية: بناء التقرير
// ============================================================
async function generateReport(type, state) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.rtlMode = true;
  pres.author = "مكتب إدارة مشروع KAGA";
  pres.title = "تقرير يومي — حدائق الملك عبدالله";

  const date = todayAr();

  if (type === "comprehensive") {
    buildCoverSlide(pres, date);
    buildSummarySlide(pres, state);
    buildTracksSlide(pres, state);
    buildSafetySlide(pres, state);
    buildRisksSlide(pres, state);
    buildTimelineSlide(pres, state, null);
    buildRecommendationsSlide(pres, false);
    buildThankYouSlide(pres);
  } else if (["أ","ب","ج","د"].includes(type)) {
    buildTrackCoverSlide(pres, type, date);
    buildTrackSummarySlide(pres, type, state);
    buildTrackActivitiesSlide(pres, type, state);
    buildTrackRisksSlide(pres, type, state);
    buildSafetySlide(pres, state);
    buildTimelineSlide(pres, state, type);
    buildRecommendationsSlide(pres, true);
    buildThankYouSlide(pres);
  } else {
    throw new Error("نوع تقرير غير معروف: " + type);
  }

  // إرجاع Buffer
  return await pres.write({ outputType:"nodebuffer" });
}

module.exports = { generateReport };
