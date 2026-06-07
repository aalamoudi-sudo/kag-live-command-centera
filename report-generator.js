"use strict";
/**
 * report-generator.js v2
 * يستخدم القوالب الأصلية ويحشر البيانات فيها مباشرة
 */

const fs   = require("fs");
const path = require("path");
const JSZip = require("jszip");

// مسار القوالب داخل المشروع
const TPL_DIR = path.join(__dirname, "templates");

// ============================================================
// مساعدات
// ============================================================
function todayAr() {
  return new Date().toLocaleDateString("ar-SA", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}
function weekNum() {
  const now = new Date(), start = new Date(now.getFullYear(),0,1);
  return Math.ceil(((now-start)/86400000 + start.getDay()+1)/7);
}
function formatDate(d) {
  if(!d) return "";
  try{ return new Date(d).toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"}); }
  catch{ return d; }
}
function statusLabel(s) {
  if(!s) return "—";
  if(["مكتملة","مكتمل","معتمدة","معتمد","ضمن المسار"].includes(s)) return "أخضر ✓";
  if(["قيد التنفيذ","تحت المتابعة"].includes(s)) return "أصفر";
  if(["معرضة للخطر","معرض للخطر","متأخرة"].includes(s)) return "أحمر ✗";
  return s;
}

// استبدال نص داخل XML مع الحفاظ على التنسيق
function replaceText(xml, oldText, newText) {
  // أولاً: استبدال المتتاليات البسيطة
  const escaped = oldText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const simple = new RegExp(`(<a:t[^>]*>)${escaped}(</a:t>)`, 'g');
  if(simple.test(xml)) return xml.replace(simple, `$1${newText}$2`);
  return xml;
}

// استبدال كل النصوص في خانة معينة (بالاسم أو الترتيب)
function replaceShapeText(xml, shapeName, newText) {
  // نجد الـ sp الذي يحتوي على cNvPr name="shapeName"
  const re = new RegExp(
    `(<p:sp>(?:(?!</p:sp>)[\\s\\S])*?name="${shapeName}"[\\s\\S]*?</p:sp>)`,
    'g'
  );
  return xml.replace(re, (match) => {
    // نستبدل كل النصوص داخل هذا الشكل بنص واحد في أول <a:t>
    let replaced = false;
    return match.replace(/<a:t([^>]*)>([\s\S]*?)<\/a:t>/g, (m, attrs, content) => {
      if(!replaced) { replaced = true; return `<a:t${attrs}>${newText}</a:t>`; }
      return `<a:t${attrs}><\/a:t>`;
    });
  });
}

// ============================================================
// بناء PPTX من القالب + البيانات
// ============================================================
async function fillTemplate(templatePath, replacements) {
  const buf = fs.readFileSync(templatePath);
  const zip = await JSZip.loadAsync(buf);

  // أعد حقن الصور المشتركة من مجلد shared
  const sharedDir = path.join(path.dirname(templatePath), "shared");
  const mapFile = zip.files["ppt/media/_map.json"];
  if(mapFile) {
    const imgMap = JSON.parse(await mapFile.async("string"));
    for(const [mediaPath, sharedName] of Object.entries(imgMap)) {
      const sharedFile = path.join(sharedDir, sharedName);
      if(fs.existsSync(sharedFile)) {
        const imgData = fs.readFileSync(sharedFile);
        zip.file(mediaPath, imgData);
      }
    }
  }

  for(const [slideName, pairs] of Object.entries(replacements)) {
    const slideFile = `ppt/slides/${slideName}`;
    if(!zip.files[slideFile]) continue;
    let xml = await zip.files[slideFile].async("string");

    for(const [from, to] of pairs) {
      xml = replaceText(xml, from, to);
    }
    zip.file(slideFile, xml);
  }

  return await zip.generateAsync({ type:"nodebuffer", compression:"DEFLATE" });
}

// ============================================================
// التقرير الشامل
// ============================================================
async function generateComprehensive(state) {
  const tracks = state.tracks || [];
  const items  = state.items  || [];
  const risks  = items.filter(i => ["risks","مخاطرة","مخاطر"].includes(i.type) && i.status !== "مغلقة");
  const done   = items.filter(i => ["مكتملة","مكتمل","معتمدة","معتمد"].includes(i.status));
  const active = items.filter(i => i.status === "قيد التنفيذ");

  const overallProgress = tracks.length
    ? Math.round(tracks.reduce((s,t)=>s+(t.progress||0),0)/tracks.length) : 0;
  const worstStatus = tracks.some(t=>["معرض للخطر","معرضة للخطر"].includes(t.status)) ? "أحمر"
    : tracks.some(t=>t.status==="تحت المتابعة") ? "أصفر" : "أخضر";

  const getTrack = (id) => tracks.find(t=>t.track===id)||{};

  const replacements = {
    // شريحة 1 - الغلاف
    "slide1.xml": [
      ["اليوم الشهر السنة", todayAr()],
      ["رقم الأسبوع ٢٠٢٦", `الأسبوع ${weekNum()} — ٢٠٢٦`],
    ],
    // شريحة 2 - الملخص التنفيذي
    "slide2.xml": [
      ["أ/أص/ح", worstStatus],
      ["نسبة إنجاز اليوم: ٪", `نسبة إنجاز اليوم: ${overallProgress}٪`],
      ["١ إنجاز", done.slice(0,1).map(i=>i.title).join("") || "لا يوجد"],
      ["٢ إنجاز", done.slice(1,2).map(i=>i.title).join("") || "—"],
      ["٣ إنجاز", done.slice(2,3).map(i=>i.title).join("") || "—"],
      ["١ نشاط", active.slice(0,1).map(i=>i.title).join("") || "لا يوجد"],
      ["٢ نشاط", active.slice(1,2).map(i=>i.title).join("") || "—"],
      ["٣ نشاط", active.slice(2,3).map(i=>i.title).join("") || "—"],
      // القضايا
      ...(risks.slice(0,3).flatMap((r,i)=>[
        [`قضية`, r.title||"—"],
        [`مالك`, r.owner||"—"],
        [`وقت`, formatDate(r.due)],
        [`إجراء`, "متابعة عاجلة"],
        [`أثر`, "تأثير على الجدول الزمني"],
      ]).slice(0,5)),
    ],
    // شريحة 3 - حالة المسارات
    "slide3.xml": [
      // مسار أ (التخطيط)
      ...buildTrackRow(getTrack("أ"), items, 0),
      // مسار ب (التواصل)
      ...buildTrackRow(getTrack("ب"), items, 1),
      // مسار ج (الفعاليات)
      ...buildTrackRow(getTrack("ج"), items, 2),
      // مسار د (الحديقة)
      ...buildTrackRow(getTrack("د"), items, 3),
    ],
    // شريحة 4 - السلامة
    "slide4.xml": [
      ["٠٠٠٠", `${(items.length*8)}`.replace(/\d/g, d=>"٠١٢٣٤٥٦٧٨٩"[d])],
      ...(risks.filter(r=>["معرضة للخطر","معرض للخطر"].includes(r.status)).slice(0,2).flatMap(r=>[
        ["ملاحظة", r.title||"—"],
        ["عدد/موقع", r.owner||"—"],
      ])),
    ],
    // شريحة 5 - المخاطر والقرارات
    "slide5.xml": [
      ...(risks.filter(r=>["معرضة للخطر","معرض للخطر"].includes(r.status)).slice(0,1).flatMap(r=>[
        ["قرار/اعتماد", r.title||"—"],
        ["مالك", r.owner||"—"],
        ["وقت", formatDate(r.due)],
        ["توصية", "تسريع الإجراءات والتنسيق مع الجهات المعنية"],
      ])),
      ...risks.filter(r=>r.status==="تحت المتابعة").slice(0,1).flatMap(r=>[
        ["خطر/قضية-١", r.title||"—"],
        ["وصف", r.title||"—"],
        ["أثر", "تأثير على الجدول الزمني"],
        ["إجراء", "متابعة عاجلة"],
      ]),
    ],
    // شريحة 6 - الجدول الزمني
    "slide6.xml": buildTimelinePairs(items, null),
  };

  return fillTemplate(path.join(TPL_DIR, "comprehensive.pptx"), replacements);
}

function buildTrackRow(track, items, idx) {
  if(!track.track) return [];
  const trackItems = items.filter(i=>i.track===track.track);
  const doneItems  = trackItems.filter(i=>["مكتملة","مكتمل","معتمدة","معتمد"].includes(i.status));
  const activeItems= trackItems.filter(i=>i.status==="قيد التنفيذ");
  const nextItems  = trackItems.filter(i=>i.due&&new Date(i.due)>new Date()).sort((a,b)=>new Date(a.due)-new Date(b.due));
  const openRisks  = trackItems.filter(i=>["risks","مخاطرة"].includes(i.type)&&i.status!=="مغلقة");

  // كل صف له 5 خانات: إنجاز أمس، خطة اليوم، خطة الغد، الحالة، الدعم
  const prefix = ["مختصر","مختصر","مختصر","أ/أص/ح","قرار/اعتماد/تنسيق"];
  const values = [
    doneItems.slice(0,1).map(i=>i.title).join("") || "—",
    activeItems.slice(0,1).map(i=>i.title).join("") || "—",
    nextItems.slice(0,1).map(i=>i.title).join("") || "—",
    statusLabel(track.status),
    openRisks.length>0 ? `${openRisks.length} مخاطر مفتوحة` : "لا يوجد",
  ];
  return prefix.map((p,i)=>[p, values[i]]);
}

function buildTimelinePairs(items, trackFilter) {
  let filtered = items.filter(i=>i.type!=="risks"&&i.type!=="مخاطرة");
  if(trackFilter) filtered = filtered.filter(i=>i.track===trackFilter);
  const done    = filtered.filter(i=>["مكتملة","مكتمل","معتمدة","معتمد"].includes(i.status)).slice(0,3);
  const active  = filtered.filter(i=>i.status==="قيد التنفيذ").slice(0,3);
  const upcoming= filtered.filter(i=>i.due&&new Date(i.due)>new Date()).sort((a,b)=>new Date(a.due)-new Date(b.due)).slice(0,3);

  const fmt = (arr) => arr.map(i=>`• ${i.title}`).join("\n") || "• لا يوجد";
  return [
    ["• نشاط ١\n• نشاط ٢\n• نشاط ٣\n• اعتماد/تنسيق مطلوب", fmt(done)],     // أمس
    ["• نشاط ١\n• نشاط ٢\n• نشاط ٣\n• اعتماد/تنسيق مطلوب", fmt(active)],   // اليوم
    ["• نشاط ١\n• نشاط ٢\n• نشاط ٣\n• اعتماد/تنسيق مطلوب", fmt(upcoming)], // غداً
  ];
}

// ============================================================
// تقرير المسار
// ============================================================
async function generateTrack(trackKey, state, tplFile) {
  const tracks = state.tracks || [];
  const items  = state.items  || [];
  const track  = tracks.find(t=>t.track===trackKey) || {};
  const trackItems = items.filter(i=>i.track===trackKey);
  const risks  = trackItems.filter(i=>["risks","مخاطرة","مخاطر"].includes(i.type)&&i.status!=="مغلقة");
  const done   = trackItems.filter(i=>["مكتملة","مكتمل","معتمدة","معتمد"].includes(i.status));
  const active = trackItems.filter(i=>i.status==="قيد التنفيذ");
  const openR  = risks.filter(r=>["معرضة للخطر","معرض للخطر"].includes(r.status));
  const medR   = risks.filter(r=>["تحت المتابعة","قيد التنفيذ"].includes(r.status));

  const replacements = {
    // شريحة 1 - الغلاف (ما تحتاج تغيير — التصميم والاسم موجودان)

    // شريحة 2 - الملخص
    "slide2.xml": [
      ["أخضر/أصفر/أحمر", statusLabel(track.status||"")],
      ["نسبة إنجاز اليوم: ٪", `نسبة إنجاز اليوم: ${track.progress||0}٪`],
      ["١ إنجاز رئيسي ١", done.slice(0,1).map(i=>i.title).join("") || "لا يوجد"],
      ["١ إنجاز رئيسي ٢", done.slice(1,2).map(i=>i.title).join("") || "—"],
      ["١ إنجاز رئيسي ٣", done.slice(2,3).map(i=>i.title).join("") || "—"],
      ["قرار / اعتماد / تنسيق / تصعيد مطلوب", risks.length>0 ? risks.slice(0,2).map(r=>r.title).join(" / ") : "لا يوجد"],
      // جدول التحديث التفصيلي
      ["منجز", done.slice(0,1).map(i=>i.title).join("") || "—"],
      ["قيد التنفيذ", active.slice(0,1).map(i=>i.title).join("") || "—"],
      ["مخطط", active.slice(1,2).map(i=>i.title).join("") || "—"],
    ],

    // شريحة 3 - الأنشطة التفصيلية
    "slide3.xml": [
      ...trackItems.slice(0,8).flatMap((item,i)=>[
        [`اسم النشاط/المخرج`, item.title||"—"],
        [`اسم`, item.owner||"—"],
        [`وقت`, formatDate(item.due)],
        [`أ/أص/ح`, statusLabel(item.status)],
        [`٪`, `${item.progress||0}٪`],
      ]).slice(0,15),
    ],

    // شريحة 4 - المخاطر والقرارات
    "slide4.xml": [
      ...(openR.slice(0,1).flatMap(r=>[
        ["قرار/اعتماد", r.title||"—"],
        ["مالك", r.owner||"—"],
        ["وقت", formatDate(r.due)],
        ["توصية", "تسريع الإجراءات"],
      ])),
      ...(medR.slice(0,1).flatMap(r=>[
        ["خطر/قضية-١", r.title||"—"],
        ["وصف", r.title||"—"],
        ["إجراء", "متابعة"],
      ])),
    ],

    // شريحة 5 - السلامة
    "slide5.xml": [
      ["٠٠٠٠", `${trackItems.length*8}`],
    ],

    // شريحة 6 - الجدول الزمني
    "slide6.xml": buildTimelinePairs(items, trackKey),
  };

  return fillTemplate(path.join(TPL_DIR, tplFile), replacements);
}

// ============================================================
// الدالة الرئيسية
// ============================================================
async function generateReport(type, state) {
  const tplMap = {
    "comprehensive": { fn: ()=>generateComprehensive(state), tpl: "comprehensive.pptx" },
    "أ": { fn: ()=>generateTrack("أ", state, "track-a.pptx") },
    "ب": { fn: ()=>generateTrack("ب", state, "track-b.pptx") },
    "ج": { fn: ()=>generateTrack("ج", state, "track-c.pptx") },
    "د": { fn: ()=>generateTrack("د", state, "track-d.pptx") },
  };

  const entry = tplMap[type];
  if(!entry) throw new Error("نوع تقرير غير معروف: " + type);
  return entry.fn();
}

module.exports = { generateReport };
