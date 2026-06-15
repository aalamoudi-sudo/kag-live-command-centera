"use strict";
/**
 * pptx-generator.js
 * مولّد PowerPoint رسمي — حدائق الملك عبدالله
 * يعتمد على pptxgenjs فقط، بدون قوالب خارجية
 */

const PptxGenJS = require("pptxgenjs");

const TRACK_NAMES = {
  "أ": "التخطيط والتنسيق",
  "ب": "الإعلام والتغطية",
  "ج": "الحفل الرسمي وفعالياته المصاحبة",
  "د": "تجهيز وتفعيل الحديقة"
};
const TRACK_COLORS_HEX = {
  "أ": { bg: "0E2A45", accent: "C9A84C" },
  "ب": { bg: "1E1045", accent: "9B7FD4" },
  "ج": { bg: "2E1500", accent: "D4872A" },
  "د": { bg: "062820", accent: "2BAE99" }
};
const NAVY   = "0B1F35";
const GOLD   = "C9A84C";
const WHITE  = "FFFFFF";
const OFFWHT = "F7F9FC";
const GREEN  = "166534";
const RED    = "991B1B";
const AMBER  = "92400E";
const BLUE   = "1E40AF";
const GRAY   = "6B7280";

const DONE_SET   = ["مكتملة","معتمدة","Completed","Cleared","مكتمل","معتمد"];
const ACTIVE_SET = ["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET   = ["معرضة للخطر","معرض للخطر","At Risk","متأخر","متأخرة"];
const isDone   = s => DONE_SET.includes(s);
const isActive = s => ACTIVE_SET.includes(s);
const isRiskS  = s => RISK_SET.includes(s);
const isRisk   = i => ["risks","مخاطرة","مخاطر"].includes(i.type);

function fmtDate(s) {
  if (!s) return "—";
  try { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString("ar-SA"); }
  catch { return s; }
}
function todayStr() {
  return new Date().toLocaleDateString("ar-SA", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}
function daysToOpen(openingDate) {
  const d = new Date(openingDate || "2026-11-01");
  const n = new Date();
  return Math.max(0, Math.ceil((d - n) / (1000*60*60*24)));
}
function statusColor(s) {
  if (isDone(s))   return GREEN;
  if (isActive(s)) return BLUE;
  if (isRiskS(s))  return RED;
  return GRAY;
}

// ─── الشريحة الأساسية: إعداد الخلفية والهيدر ───────────────
function addHeader(slide, title, subtitle, bgColor) {
  const bg = bgColor || NAVY;
  slide.background = { color: bg };

  // شريط ذهبي علوي
  slide.addShape(pptxgenjs_rect(), {
    x: 0, y: 0, w: "100%", h: 0.08,
    fill: { color: GOLD }, line: { color: GOLD }
  });

  // عنوان رئيسي
  slide.addText(title, {
    x: 0.4, y: 0.15, w: 8.5, h: 0.55,
    fontSize: 24, bold: true, color: WHITE,
    rtlMode: true, fontFace: "Arial"
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.4, y: 0.7, w: 8.5, h: 0.3,
      fontSize: 11, color: GOLD,
      rtlMode: true, fontFace: "Arial"
    });
  }

  // شعار المشروع (نص)
  slide.addText("حدائق الملك عبدالله العالمية · أمانة منطقة الرياض", {
    x: 0.4, y: 6.8, w: 9, h: 0.25,
    fontSize: 8, color: "888888",
    rtlMode: true, fontFace: "Arial",
    align: "right"
  });
  slide.addText(todayStr(), {
    x: 0.4, y: 7.05, w: 9, h: 0.2,
    fontSize: 7.5, color: "555555",
    rtlMode: true, fontFace: "Arial",
    align: "right"
  });

  // شريط ذهبي سفلي
  slide.addShape(pptxgenjs_rect(), {
    x: 0, y: 7.3, w: "100%", h: 0.05,
    fill: { color: GOLD }, line: { color: GOLD }
  });
}

function pptxgenjs_rect() { return "rect"; }

// ─── شريحة الغلاف ───────────────────────────────────────────
function addCoverSlide(pptx, reportTitle, subtitle, stats) {
  const slide = pptx.addSlide();
  slide.background = { color: NAVY };

  // شريط ذهبي علوي سميك
  slide.addShape("rect", { x:0, y:0, w:"100%", h:0.12, fill:{color:GOLD}, line:{color:GOLD} });

  // اسم المنظمة
  slide.addText("أمانة منطقة الرياض", {
    x:0.5, y:0.25, w:9, h:0.35,
    fontSize:13, color:GOLD, bold:true, rtlMode:true, fontFace:"Arial", align:"right"
  });
  slide.addText("مشروع حدائق الملك عبدالله العالمية · غرفة عمليات PMC", {
    x:0.5, y:0.58, w:9, h:0.25,
    fontSize:9.5, color:"AAAAAA", rtlMode:true, fontFace:"Arial", align:"right"
  });

  // خط فاصل ذهبي
  slide.addShape("rect", { x:0.5, y:0.9, w:8.9, h:0.015, fill:{color:GOLD}, line:{color:GOLD} });

  // عنوان التقرير
  slide.addText(reportTitle, {
    x:0.5, y:1.1, w:9, h:1.1,
    fontSize:32, bold:true, color:WHITE, rtlMode:true, fontFace:"Arial", align:"right"
  });
  slide.addText(subtitle, {
    x:0.5, y:2.15, w:9, h:0.4,
    fontSize:13, color:"CCCCCC", rtlMode:true, fontFace:"Arial", align:"right"
  });

  // خط ذهبي قصير
  slide.addShape("rect", { x:7.5, y:2.65, w:2, h:0.04, fill:{color:GOLD}, line:{color:GOLD} });

  // بطاقات الإحصائيات
  if (stats && stats.length) {
    const cardW = 2.0;
    const startX = 0.5;
    const y = 3.0;
    stats.forEach((s, i) => {
      const x = startX + i * (cardW + 0.15);
      slide.addShape("rect", {
        x, y, w: cardW, h: 1.1,
        fill: { color: "12304A" }, line: { color: GOLD, pt: 0.5 },
        rectRadius: 0.05
      });
      slide.addText(String(s.value), {
        x, y: y + 0.1, w: cardW, h: 0.55,
        fontSize: 26, bold: true, color: GOLD,
        rtlMode: true, fontFace: "Arial", align: "center"
      });
      slide.addText(s.label, {
        x, y: y + 0.65, w: cardW, h: 0.35,
        fontSize: 9, color: "AAAAAA",
        rtlMode: true, fontFace: "Arial", align: "center"
      });
    });
  }

  // شريط سفلي
  slide.addShape("rect", { x:0, y:7.3, w:"100%", h:0.08, fill:{color:GOLD}, line:{color:GOLD} });
  slide.addText("سري — للاستخدام الداخلي فقط", {
    x:0.3, y:7.38, w:9, h:0.2,
    fontSize:7, color:"888888", rtlMode:true, fontFace:"Arial", align:"center"
  });
}

// ─── شريحة KPIs ─────────────────────────────────────────────
function addKpiSlide(pptx, kpis, title) {
  const slide = pptx.addSlide();
  slide.background = { color: OFFWHT };
  addHeader(slide, title || "مؤشرات الأداء الرئيسية", "نظرة عامة على حالة المشروع", NAVY);

  const cardW = 2.7;
  const cardH = 1.4;
  const cols = 3;
  const startX = 0.35;
  const startY = 1.1;

  kpis.forEach((k, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * (cardW + 0.25);
    const y = startY + row * (cardH + 0.2);
    slide.addShape("rect", {
      x, y, w: cardW, h: cardH,
      fill: { color: WHITE }, line: { color: "D8DFE8", pt: 1 },
      shadow: { type:"outer", color:"00000015", blur:4, offset:2, angle:45 }
    });
    // خط ملوّن علوي
    slide.addShape("rect", { x, y, w: cardW, h: 0.05, fill:{color: k.color || GOLD}, line:{color: k.color || GOLD} });
    slide.addText(String(k.value), {
      x, y: y + 0.15, w: cardW, h: 0.7,
      fontSize: 28, bold: true, color: k.color || NAVY,
      fontFace: "Arial", align: "center"
    });
    slide.addText(k.label, {
      x, y: y + 0.85, w: cardW, h: 0.4,
      fontSize: 10, color: GRAY,
      rtlMode: true, fontFace: "Arial", align: "center"
    });
  });
}

// ─── شريحة المسارات ─────────────────────────────────────────
function addTracksSlide(pptx, tracks) {
  const slide = pptx.addSlide();
  slide.background = { color: OFFWHT };
  addHeader(slide, "حالة المسارات الأربعة", "ملخص تنفيذي شامل", NAVY);

  const cardW = 4.3;
  const cardH = 2.5;
  const startX = 0.3;
  const startY = 1.0;

  tracks.forEach((t, i) => {
    const tc = TRACK_COLORS_HEX[t.id] || { bg: NAVY, accent: GOLD };
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (cardW + 0.45);
    const y = startY + row * (cardH + 0.2);

    // بطاقة خلفية
    slide.addShape("rect", { x, y, w: cardW, h: cardH, fill:{color:WHITE}, line:{color:"D8DFE8",pt:1} });
    // هيدر ملوّن
    slide.addShape("rect", { x, y, w: cardW, h: 0.7, fill:{color:tc.bg}, line:{color:tc.bg} });

    // حرف المسار
    slide.addShape("rect", { x: x+0.1, y: y+0.12, w: 0.46, h: 0.46, fill:{color:tc.accent+"30"}, line:{color:tc.accent,pt:1} });
    slide.addText(t.id, {
      x: x+0.1, y: y+0.14, w: 0.46, h: 0.4,
      fontSize: 14, bold: true, color: tc.accent,
      fontFace: "Arial", align: "center"
    });

    // اسم المسار
    slide.addText(t.name || TRACK_NAMES[t.id] || t.id, {
      x: x+0.65, y: y+0.08, w: cardW-0.75, h: 0.35,
      fontSize: 11, bold: true, color: WHITE,
      rtlMode: true, fontFace: "Arial", align: "right"
    });
    slide.addText(t.lead || "—", {
      x: x+0.65, y: y+0.4, w: cardW-0.75, h: 0.22,
      fontSize: 8, color: tc.accent,
      rtlMode: true, fontFace: "Arial", align: "right"
    });

    // شريط التقدم
    const barY = y + 0.85;
    slide.addText("نسبة الإنجاز", { x: x+0.15, y: barY-0.02, w:2, h:0.22, fontSize:8, color:GRAY, rtlMode:true, fontFace:"Arial" });
    slide.addText(`${t.progress || 0}%`, { x: x+cardW-0.7, y: barY-0.02, w:0.55, h:0.22, fontSize:9, bold:true, color:tc.accent, fontFace:"Arial", align:"center" });
    slide.addShape("rect", { x: x+0.15, y: barY+0.2, w: cardW-0.3, h: 0.1, fill:{color:"E5EAF0"}, line:{color:"E5EAF0"} });
    const fillW = Math.max(0.05, (cardW-0.3) * (t.progress||0) / 100);
    slide.addShape("rect", { x: x+0.15, y: barY+0.2, w: fillW, h: 0.1, fill:{color:tc.accent}, line:{color:tc.accent} });

    // إحصائيات
    const statsY = y + 1.45;
    const statW = (cardW - 0.3) / 4;
    const statData = [
      { label:"إجمالي", val: t.tasks||0, color: NAVY },
      { label:"مكتملة", val: t.done||0,  color: GREEN },
      { label:"جارية",  val: t.active||0, color: BLUE },
      { label:"حرجة",   val: t.risk||0,   color: RED }
    ];
    statData.forEach((s, si) => {
      const sx = x + 0.15 + si * statW;
      slide.addShape("rect", { x: sx, y: statsY, w: statW-0.05, h: 0.7, fill:{color:s.color+"15"}, line:{color:s.color+"40",pt:0.5} });
      slide.addText(String(s.val), { x: sx, y: statsY+0.05, w: statW-0.05, h: 0.35, fontSize:14, bold:true, color:s.color, fontFace:"Arial", align:"center" });
      slide.addText(s.label, { x: sx, y: statsY+0.42, w: statW-0.05, h: 0.2, fontSize:7.5, color:GRAY, rtlMode:true, fontFace:"Arial", align:"center" });
    });

    // الحالة
    const stColor = t.status==="ضمن المسار" ? GREEN : t.status==="تحت المتابعة" ? AMBER : RED;
    slide.addShape("rect", { x: x+cardW-1.3, y: y+1.38, w:1.15, h:0.22, fill:{color:stColor+"20"}, line:{color:stColor,pt:0.5} });
    slide.addText(t.status||"—", { x: x+cardW-1.3, y: y+1.39, w:1.15, h:0.2, fontSize:8, bold:true, color:stColor, rtlMode:true, fontFace:"Arial", align:"center" });
  });
}

// ─── شريحة جدول بيانات ──────────────────────────────────────
function addTableSlide(pptx, title, items, columns, headerBg) {
  const slide = pptx.addSlide();
  slide.background = { color: OFFWHT };
  addHeader(slide, title, `${items.length} بند`, NAVY);

  if (!items.length) {
    slide.addText("✅ لا توجد بنود لعرضها", {
      x:0.5, y:2.5, w:9, h:0.5,
      fontSize:13, color:GRAY, rtlMode:true, fontFace:"Arial", align:"center"
    });
    return;
  }

  const maxRows = 18;
  const shown = items.slice(0, maxRows);

  const colWidths = columns.map(c => c.w || 2);
  const totalW = colWidths.reduce((a,b)=>a+b,0);
  const scaleX = 9.2 / totalW;

  const tableData = [
    // صف الهيدر
    columns.map(c => ({
      text: c.label,
      options: { bold:true, color:WHITE, fill:{color: headerBg||NAVY}, fontSize:9, rtlMode:true, fontFace:"Arial", align:"center" }
    })),
    ...shown.map(item => columns.map(c => {
      const val = c.get(item);
      const color = c.colorFn ? c.colorFn(item) : "363636";
      return {
        text: val || "—",
        options: { fontSize:8.5, color, rtlMode:true, fontFace:"Arial", align:"right" }
      };
    }))
  ];

  slide.addTable(tableData, {
    x: 0.3, y: 1.05, w: 9.3,
    rowH: 0.28,
    border: { type:"solid", color:"D8DFE8", pt:0.5 },
    fill: WHITE,
    autoPage: false
  });

  if (items.length > maxRows) {
    slide.addText(`... و${items.length - maxRows} بند إضافي`, {
      x:0.3, y:6.9, w:9, h:0.25,
      fontSize:8, color:GRAY, rtlMode:true, fontFace:"Arial", align:"center"
    });
  }
}

// ─── شريحة المخاطر ──────────────────────────────────────────
function addRisksSlide(pptx, risks) {
  addTableSlide(pptx, "سجل المخاطر والقضايا المفتوحة", risks, [
    { label:"#",         w:0.35, get:(_,i)=>String(i+1) },
    { label:"المخاطرة",  w:3.2,  get:r=>r.title },
    { label:"المسار",    w:1.5,  get:r=>TRACK_NAMES[r.track]||r.track||"—" },
    { label:"المسؤول",   w:1.5,  get:r=>r.owner||"—" },
    { label:"الموعد",    w:1.0,  get:r=>fmtDate(r.due), colorFn:()=>RED },
    { label:"الحالة",    w:1.2,  get:r=>r.status||"—", colorFn:r=>statusColor(r.status) }
  ], "7F1D1D");
}

// ─── شريحة المهام ───────────────────────────────────────────
function addTasksSlide(pptx, tasks, title, trackId) {
  const cols = trackId ? [
    { label:"المهمة",   w:4.0, get:t=>t.title },
    { label:"المسؤول", w:2.0, get:t=>t.owner||"—" },
    { label:"الموعد",  w:1.2, get:t=>fmtDate(t.due) },
    { label:"الحالة",  w:1.5, get:t=>t.status||"—", colorFn:t=>statusColor(t.status) }
  ] : [
    { label:"المسار",   w:1.4, get:t=>t.track||"—" },
    { label:"المهمة",   w:3.4, get:t=>t.title },
    { label:"المسؤول", w:1.6, get:t=>t.owner||"—" },
    { label:"الموعد",  w:1.0, get:t=>fmtDate(t.due) },
    { label:"الحالة",  w:1.3, get:t=>t.status||"—", colorFn:t=>statusColor(t.status) }
  ];
  const bg = trackId ? (TRACK_COLORS_HEX[trackId]?.bg || NAVY) : NAVY;
  addTableSlide(pptx, title, tasks, cols, bg);
}

// ════════════════════════════════════════════════════════════
// التقرير الشامل
// ════════════════════════════════════════════════════════════
async function buildComprehensivePptx(state) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = true;
  pptx.title   = "التقرير الشامل — حدائق الملك عبدالله";
  pptx.author  = "غرفة عمليات PMC";

  const tracks  = state.tracks  || [];
  const items   = state.items   || [];
  const tasks   = items.filter(i=>!isRisk(i));
  const risks   = items.filter(i=>isRisk(i)&&!isDone(i.status));
  const totDone = tasks.filter(i=>isDone(i.status)).length;
  const totAct  = tasks.filter(i=>isActive(i.status)).length;
  const totLate = tasks.filter(i=>isRiskS(i.status)).length;
  const ovr     = tracks.length ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;
  const days    = daysToOpen(state.project?.openingDate);

  // 1. الغلاف
  addCoverSlide(pptx, "التقرير الشامل", "المسارات الأربعة · المخاطر · القرارات · الجدول الزمني", [
    { value: `${ovr}%`,       label: "نسبة الإنجاز الكلية" },
    { value: tasks.length,    label: "إجمالي المهام" },
    { value: totDone,         label: "المهام المكتملة" },
    { value: `${days}`,       label: "يوم على الافتتاح" }
  ]);

  // 2. KPIs
  addKpiSlide(pptx, [
    { value: tasks.length, label: "إجمالي المهام",    color: NAVY  },
    { value: totDone,      label: "مكتملة",           color: GREEN },
    { value: totAct,       label: "قيد التنفيذ",      color: BLUE  },
    { value: totLate,      label: "متأخرة",           color: RED   },
    { value: `${ovr}%`,    label: "نسبة الإنجاز",     color: AMBER },
    { value: risks.length, label: "مخاطر مفتوحة",     color: RED   }
  ], "مؤشرات الأداء الرئيسية");

  // 3. المسارات
  addTracksSlide(pptx, tracks);

  // 4. المهام الجارية والمتأخرة
  const criticals = tasks.filter(i=>isRiskS(i.status)||isActive(i.status)).slice(0,30);
  if (criticals.length) addTasksSlide(pptx, criticals, "المهام الجارية والمتأخرة", null);

  // 5. المخاطر
  addRisksSlide(pptx, risks);

  // 6. القرارات
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد");
  if (decisions.length) {
    addTableSlide(pptx, "القرارات المطلوبة والإجراءات العاجلة", decisions, [
      { label:"القرار",   w:4.0, get:d=>d.title },
      { label:"المسار",   w:1.5, get:d=>TRACK_NAMES[d.track]||d.track||"—" },
      { label:"المسؤول", w:1.8, get:d=>d.owner||"—" },
      { label:"الموعد",  w:1.2, get:d=>fmtDate(d.due) },
      { label:"الحالة",  w:1.2, get:d=>d.status||"—" }
    ], AMBER);
  }

  return await pptx.stream();
}

// ════════════════════════════════════════════════════════════
// تقرير مسار واحد
// ════════════════════════════════════════════════════════════
async function buildTrackPptx(state, tid) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.rtlMode = true;
  const tc   = TRACK_COLORS_HEX[tid] || { bg: NAVY, accent: GOLD };
  const nm   = TRACK_NAMES[tid] || tid;
  pptx.title = `تقرير مسار ${tid}: ${nm}`;

  const tracks  = state.tracks || [];
  const items   = state.items  || [];
  const track   = tracks.find(t=>t.id===tid) || { id:tid, name:nm, progress:0, status:"—", lead:"—" };
  const ti      = items.filter(i=>i.track===tid);
  const tTasks  = ti.filter(i=>!isRisk(i));
  const tRisks  = ti.filter(i=>isRisk(i)&&!isDone(i.status));
  const tDone   = tTasks.filter(i=>isDone(i.status)).length;
  const tAct    = tTasks.filter(i=>isActive(i.status)).length;
  const tLate   = tTasks.filter(i=>isRiskS(i.status)).length;
  const days    = daysToOpen(state.project?.openingDate);

  // 1. الغلاف
  addCoverSlide(pptx, `مسار ${tid}: ${nm}`, track.focus || track.lead || "", [
    { value: `${track.progress||0}%`, label: "نسبة الإنجاز" },
    { value: tTasks.length,           label: "إجمالي المهام" },
    { value: tDone,                   label: "مكتملة" },
    { value: `${days}`,               label: "يوم على الافتتاح" }
  ]);

  // 2. KPIs المسار
  addKpiSlide(pptx, [
    { value: tTasks.length,   label: "إجمالي المهام",  color: tc.bg    },
    { value: tDone,           label: "مكتملة",         color: GREEN    },
    { value: tAct,            label: "قيد التنفيذ",    color: BLUE     },
    { value: tLate,           label: "متأخرة",         color: RED      },
    { value: `${track.progress||0}%`, label: "الإنجاز", color: tc.accent },
    { value: tRisks.length,   label: "مخاطر مفتوحة",  color: RED      }
  ], `مؤشرات مسار ${tid}: ${nm}`);

  // 3. المهام الجارية
  const activeTasks = tTasks.filter(i=>isActive(i.status)||isRiskS(i.status));
  if (activeTasks.length) addTasksSlide(pptx, activeTasks, "المهام الجارية والمتأخرة", tid);

  // 4. سجل المهام الكامل
  addTasksSlide(pptx, tTasks, "سجل المهام الكامل", tid);

  // 5. المخاطر
  addRisksSlide(pptx, tRisks);

  // 6. القرارات
  const decisions = (state.decisions||[]).filter(d=>d.status!=="معتمد"&&(d.track===tid||!d.track));
  if (decisions.length) {
    addTableSlide(pptx, "القرارات المطلوبة", decisions, [
      { label:"القرار",   w:4.5, get:d=>d.title },
      { label:"المسؤول", w:2.0, get:d=>d.owner||"—" },
      { label:"الموعد",  w:1.3, get:d=>fmtDate(d.due) },
      { label:"الحالة",  w:1.2, get:d=>d.status||"—" }
    ], AMBER);
  }

  return await pptx.stream();
}

// ─── الدالة الرئيسية ─────────────────────────────────────────
async function generatePptx(type, state) {
  if (type === "comprehensive") return await buildComprehensivePptx(state);
  if (["أ","ب","ج","د"].includes(type)) return await buildTrackPptx(state, type);
  throw new Error("نوع تقرير غير معروف: " + type);
}

module.exports = { generatePptx };
