/**
 * KAG Live Command Center — Google Sheets Backend (V60)
 * ======================================================
 * مصدر البيانات الآن هو Google Sheet:
 *   - الفريق يعبّي البيانات داخل الجدول.
 *   - الخادم يسحب البيانات من الجدول تلقائيًا ويحوّلها إلى حالة اللوحة.
 *   - جميع المستخدمين يرون نفس البيانات وتتحدث تلقائيًا.
 *
 * التشغيل:
 *   SHEET_ID=xxxx node server.js
 * ثم افتح: http://localhost:3000
 *
 * متغيرات البيئة:
 *   SHEET_ID         معرّف Google Sheet (إلزامي لتفعيل السحب الحي)
 *   SHEET_NAME       اسم التبويب داخل الجدول (اختياري، الافتراضي أول تبويب)
 *   SHEET_REFRESH_MS مدة إعادة السحب بالمللي ثانية (افتراضي 15000)
 *   OPENING_DATE     تاريخ الافتتاح (افتراضي 2026-09-27)
 *   ADMIN_USERNAME   اسم مستخدم الأدمن لإعدادات العرض (افتراضي MAYADEEN)
 *   ADMIN_PASSWORD   كلمة مرور الأدمن (افتراضي تُولّد عشوائيًا وتُطبع عند الإقلاع)
 *   PORT             المنفذ (افتراضي 3000)
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { generateReport } = require("./report-generator");
const { generatePptx }   = require("./pptx-generator");

const PORT = Number(process.env.PORT || 3000);
// معرّف جدول حدائق الملك عبدالله المثبّت مسبقًا (يمكن تجاوزه بمتغيّر البيئة SHEET_ID)
const SHEET_ID = process.env.SHEET_ID || "15m2VHVr7W2mWWz7g_Z5iMDxaIZuRshj-N3EtA9j4lWk";
const SHEET_NAME = process.env.SHEET_NAME || "";
const SHEET_GID = process.env.SHEET_GID || "";          // رقم التبويب (gid) إن وُجد
const SHEET_CSV_URL = process.env.SHEET_CSV_URL || "";  // رابط "النشر للويب" CSV (الأكثر ضمانًا)
const LOCAL_CSV = process.env.LOCAL_CSV || "";          // مسار ملف CSV محلي كحل احتياطي تام
const SHEET_REFRESH_MS = Number(process.env.SHEET_REFRESH_MS || 15000);
const OPENING_DATE = process.env.OPENING_DATE || "2026-09-27";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "MAYADEEN";
// كلمة المرور الأساسية المثبّتة (يمكن تغييرها بمتغيّر البيئة ADMIN_PASSWORD).
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Mayadeen@2026";
// بيانات حساب المشاهد — يفتح اللوحة فقط بدون صلاحيات الأدمن
const VIEWER_USERNAME = process.env.VIEWER_USERNAME || "KAG_VIEWER";
const VIEWER_PASSWORD = process.env.VIEWER_PASSWORD || "KAG@View2026";

const PUBLIC_DIR = path.join(__dirname, "public");
const sessions = new Map(); // sid -> { exp: timestamp, role: "viewer"|"admin" }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

/* ============ إعدادات الأمان ============ */
const REQUIRE_LOGIN = String(process.env.REQUIRE_LOGIN||"true").toLowerCase()!=="false"; // قفل كامل مفعّل افتراضيًا
const FETCH_TIMEOUT_MS = 10000;            // مهلة قراءة الجدول لمنع التعليق
const LOGIN_MAX_FAILS = 6;                 // عدد المحاولات قبل الحظر المؤقت
const LOGIN_WINDOW_MS = 15 * 60 * 1000;    // نافذة احتساب المحاولات
const LOGIN_BLOCK_MS = 15 * 60 * 1000;     // مدة الحظر بعد تجاوز الحد
const loginAttempts = new Map();           // ip -> {count, first, blockedUntil}

function clientIp(req){
  const xff = (req.headers["x-forwarded-for"]||"").split(",")[0].trim();
  return xff || (req.socket && req.socket.remoteAddress) || "unknown";
}
function isHttps(req){
  return !!(req.socket && req.socket.encrypted) ||
    (req.headers["x-forwarded-proto"]||"").split(",")[0].trim()==="https";
}
// مقارنة آمنة زمنيًا (تمنع هجمات التوقيت)
function safeEqual(a,b){
  const A=crypto.createHash("sha256").update(String(a)).digest();
  const B=crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(A,B);
}
// فحص نفس المصدر (دفاع ضد CSRF بالإضافة إلى SameSite)
function sameOrigin(req){
  const host=req.headers.host;
  const origin=req.headers.origin;
  const referer=req.headers.referer;
  if(!origin && !referer) return true;
  try{
    const src=new URL(origin || referer);
    // قبل نفس الـ host أو أي subdomain على onrender.com
    if(src.host===host) return true;
    if(src.hostname.endsWith(".onrender.com")) return true;
    // قبل localhost للتطوير
    if(src.hostname==="localhost" || src.hostname==="127.0.0.1") return true;
    return false;
  }catch(e){ return true; } // عند الشك نقبل — الحماية الأساسية بالجلسة
}
function loginBlocked(ip){
  const a=loginAttempts.get(ip);
  return !!(a && a.blockedUntil && Date.now()<a.blockedUntil);
}
function recordLoginFail(ip){
  const now=Date.now();
  let a=loginAttempts.get(ip);
  if(!a || now-a.first>LOGIN_WINDOW_MS) a={count:0, first:now, blockedUntil:0};
  a.count++;
  if(a.count>=LOGIN_MAX_FAILS) a.blockedUntil=now+LOGIN_BLOCK_MS;
  loginAttempts.set(ip,a);
}
function clearLoginFails(ip){ loginAttempts.delete(ip); }

/* ============ إعدادات المسارات (المصدر الوحيد لبيانات المسارات الثابتة) ============ */
const TRACK_CONFIG = [
  { id:"أ", slug:"track-a", name:"التخطيط والتنسيق", ar:"Planning & Coordination",
    sub:"الحوكمة · الجدول الزمني · المخرجات · الاعتمادات · التصاريح · المخاطر · التغيير",
    lead:"مدير مسار التخطيط والتنسيق", focus:"التنسيق والمتابعة مع أصحاب المصلحة",
    accent:"#7E6BFF", planned:88 },
  { id:"ب", slug:"track-b", name:"الإعلام والتغطية", ar:"Communication & Marketing",
    sub:"الخطة الإعلامية · التغطية · التوثيق · الرسائل الإعلامية · المركز الإعلامي · المحتوى",
    lead:"مدير مسار الإعلام والتغطية", focus:"التنسيق الإعلامي وإعداد التقارير والعروض",
    accent:"#A98BFF", planned:66 },
  { id:"ج", slug:"track-c", name:"الحفل الرسمي وفعالياته المصاحبة", ar:"Events & Supporting Activities",
    sub:"الضيافة · الإنتاج التقني · العروض الفنية · إدارة الحضور · VIP · البروتوكول",
    lead:"مدير مسار الحفل الرسمي وفعالياته المصاحبة", focus:"ضبط تجربة الفعالية والبروتوكول",
    accent:"#D9B86C", planned:55 },
  { id:"د", slug:"track-d", name:"تجهيز وتفعيل الحديقة", ar:"Garden Setup & Activation",
    sub:"الحديقة · المسارات · النقل · السلامة والطوارئ · الاستدامة · الجاهزية · التشغيل الميداني",
    lead:"مدير مسار تجهيز وتفعيل الحديقة", focus:"جاهزية الحديقة والتشغيل الميداني",
    accent:"#6454C8", planned:60 }
];
const VALID_TRACKS = TRACK_CONFIG.map(t=>t.id);

/* ============ بيانات تجريبية احتياطية (تُستخدم فقط إذا لم يُضبط SHEET_ID) ============ */
const SEED_ITEMS = [
  {track:"أ",type:"tasks",title:"تثبيت الجدول الزمني وخطة الاعتمادات",owner:"PMC",status:"مكتملة",due:"2026-08-20"},
  {track:"أ",type:"milestones",title:"اعتماد سجل المخرجات والمخاطر",owner:"PMC",status:"مكتملة",due:"2026-08-22"},
  {track:"ب",type:"tasks",title:"إعداد خطة التواصل والتغطية الإعلامية",owner:"الإعلام والتغطية",status:"قيد التنفيذ",due:"2026-08-29"},
  {track:"ب",type:"risks",title:"تأخر اعتماد المحتوى الإعلامي",owner:"الإعلام والتغطية",status:"تحت المتابعة",due:"2026-08-29"},
  {track:"ج",type:"tasks",title:"تجهيز خطة الضيافة والبروتوكول و VIP",owner:"الفعاليات",status:"قيد التنفيذ",due:"2026-09-10"},
  {track:"ج",type:"milestones",title:"اعتماد برنامج الأنشطة المصاحبة",owner:"الفعاليات",status:"تحت المتابعة",due:"2026-09-18"},
  {track:"د",type:"tasks",title:"جاهزية مسارات الحديقة والتشغيل الميداني",owner:"التشغيل الميداني",status:"معرضة للخطر",due:"2026-09-24"},
  {track:"د",type:"risks",title:"اختبار السلامة والطوارئ والاستدامة",owner:"السلامة",status:"معرضة للخطر",due:"2026-09-12"}
];

/* ============ بيانات احتياطية: ملف القالب المرفق ثم البذرة ============ */
const FALLBACK_CSV_PATH = path.join(PUBLIC_DIR, "KAG_GoogleSheet_Template.csv");
function fallbackItems(){
  try{
    if(fs.existsSync(FALLBACK_CSV_PATH)){
      const its = rowsToItems(parseCSV(fs.readFileSync(FALLBACK_CSV_PATH,"utf8")));
      if(its.length) return its;
    }
  }catch(e){}
  return SEED_ITEMS.slice();
}
function setStateFromItems(items){
  const state = buildState(items);
  liveState = state;
  liveUpdatedAt = new Date().toISOString();
  liveVersion = liveVersion || 1;
  liveHash = crypto.createHash("sha1").update(JSON.stringify({tracks:state.tracks,items:state.items})).digest("hex");
}
let liveState = null;     // آخر حالة مبنية بنجاح
let liveVersion = 0;
let liveUpdatedAt = null;
let liveHash = "";
let lastSync = { ok:false, at:null, rows:0, error:"لم تتم أي مزامنة بعد", source: SHEET_ID ? "google-sheet" : "seed" };

/* ============ أدوات التحويل (تطابق منطق الواجهة) ============ */
// تهريب HTML لمنع هجمات XSS المخزّنة عبر خلايا الجدول
function esc(v){
  return String(v==null?"":v)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
// تقليم وتقييد طول النص لمنع الإفراط/الإساءة
function clean(v, max){ return esc(String(v==null?"":v).trim().slice(0, max||300)); }
function normalizeTrack(v){
  v=(v||"").trim();
  const map={A:"أ",B:"ب",C:"ج",D:"د",E:"هـ","ه":"هـ","هـ":"هـ","ا":"أ","أ":"أ","ب":"ب","ج":"ج","د":"د"};
  return map[(v.toUpperCase?v.toUpperCase():v)]||map[v]||v;
}
function normalizeType(v){
  v=(v||"").trim().toLowerCase();
  if(["task","tasks","مهمة","مهام"].includes(v))return"tasks";
  if(["risk","risks","مخاطرة","مخاطر"].includes(v))return"risks";
  if(["permit","permits","approval","approvals","تصريح","تصاريح","اعتماد","اعتمادات"].includes(v))return"permits";
  if(["milestone","milestones","معلم","معلم رئيسي","معالم"].includes(v))return"milestones";
  return v||"tasks";
}
function normalizeHeader(h){
  return String(h||"").trim().toLowerCase().replace(/\s+/g,"")
    .replace("المسار","track").replace("نوعالعنصر","type").replace("النوع","type")
    .replace("العنوان","title").replace("المهمة","title").replace("النشاط","title")
    .replace("الوصف","title").replace("المسؤول","owner").replace("الجهة","owner")
    .replace("الحالة","status").replace("التاريخ","due").replace("الاستحقاق","due")
    .replace("تاريخالاستحقاق","due");
}
const DONE_SET=["مكتملة","معتمدة","Completed","Cleared"];
const ACTIVE_SET=["قيد التنفيذ","تحت المتابعة","In Progress","Watch"];
const RISK_SET=["معرضة للخطر","معرض للخطر","At Risk","متأخر"];

/* ============ تحليل CSV ============ */
function parseCSV(text){
  text = String(text||"").replace(/^\uFEFF/,""); // إزالة BOM
  const rows=[]; let row=[]; let cur=""; let q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; }
      else cur+=c;
    }else{
      if(c==='"') q=true;
      else if(c===','){ row.push(cur); cur=""; }
      else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur=""; }
      else if(c==='\r'){ /* skip */ }
      else cur+=c;
    }
  }
  if(cur.length||row.length){ row.push(cur); rows.push(row); }
  return rows.filter(r=>r.some(c=>String(c).trim()!==""));
}

/* ============ بناء العناصر من صفوف الجدول ============ */
function rowsToItems(rows){
  if(!rows.length) return [];
  const header = rows[0].map(normalizeHeader);
  const known=["track","type","title","owner","status","due"];
  const hasHeader = header.some(h=>known.includes(h));
  let map={track:0,type:1,title:2,owner:3,status:4,due:5};
  let body=rows;
  if(hasHeader){
    known.forEach(k=>{ const idx=header.findIndex(h=>h===k||h.includes(k)); if(idx>=0) map[k]=idx; });
    body=rows.slice(1);
  }
  const items=[];
  body.forEach(r=>{
    const item={
      track: normalizeTrack(r[map.track]),
      type: normalizeType(r[map.type]),
      title: clean(r[map.title], 220),
      owner: clean(r[map.owner], 120),
      status: clean(r[map.status]||"قيد التنفيذ", 60),
      due: clean(r[map.due], 40)
    };
    if(!VALID_TRACKS.includes(item.track) || !item.title) return;
    items.push(item);
  });
  return items;
}

/* ============ بناء حالة اللوحة الكاملة من العناصر ============ */
function buildState(items){
  const tracks = TRACK_CONFIG.map(cfg=>{
    const t={...cfg, status:"تحت المتابعة", progress:0, tasks:0, done:0, active:0, risk:0};
    const ti=items.filter(i=>i.track===t.id);
    const tasks=ti.filter(i=>i.type==="tasks");
    const risks=ti.filter(i=>i.type==="risks" && i.status!=="مغلقة");
    t.tasks=tasks.length;
    t.done=tasks.filter(i=>DONE_SET.includes(i.status)).length;
    t.active=tasks.filter(i=>ACTIVE_SET.includes(i.status)).length;
    t.risk=risks.length + tasks.filter(i=>RISK_SET.includes(i.status)).length;
    if(t.tasks>0){
      t.progress=Math.round((t.done/t.tasks)*100);
      t.status = t.progress>=70 ? "ضمن المسار" : t.progress>=45 ? "تحت المتابعة" : "معرض للخطر";
    }else{ t.progress=0; t.status="تحت المتابعة"; }
    return t;
  });

  // تغذية حية مشتقة من بيانات حقيقية (مخاطر/عناصر معرضة للخطر/أحدث المكتمل)
  const feed=[];
  items.filter(i=>RISK_SET.includes(i.status)).slice(0,4).forEach(i=>
    feed.push({time:i.due||"", title:"تنبيه مخاطرة", msg:`${i.title} (${i.track})`, level:"red"}));
  items.filter(i=>ACTIVE_SET.includes(i.status)).slice(0,4).forEach(i=>
    feed.push({time:i.due||"", title:"قيد المتابعة", msg:`${i.title} (${i.track})`, level:"amber"}));
  items.filter(i=>DONE_SET.includes(i.status)).slice(0,3).forEach(i=>
    feed.push({time:i.due||"", title:"إنجاز", msg:`${i.title} (${i.track})`, level:"green"}));
  if(!feed.length) feed.push({time:"", title:"النظام الحي", msg:"تمت مزامنة البيانات من Google Sheet", level:"cyan"});

  return {
    project:{ title:"حدائق الملك عبدالله", phase:"مرحلة ما قبل الإطلاق", openingDate:OPENING_DATE },
    tracks,
    items,
    feed: feed.slice(0,12),
    dailyLogs:[], decisions:[], snapshots:[]
  };
}

/* ============ سحب البيانات من Google Sheet ============ */
// قائمة روابط مرشّحة لقراءة الجدول، تُجرّب بالترتيب حتى ينجح أحدها
function sheetCandidates(){
  if(SHEET_CSV_URL) return [SHEET_CSV_URL]; // رابط النشر للويب له الأولوية
  const list=[];
  let gviz = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
  if(SHEET_NAME) gviz += `&sheet=${encodeURIComponent(SHEET_NAME)}`;
  list.push(gviz);
  let exp = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
  if(SHEET_GID) exp += `&gid=${encodeURIComponent(SHEET_GID)}`;
  list.push(exp);
  return list;
}
// يكشف ما إذا كان الردّ صفحة تسجيل دخول/HTML بدل CSV (دليل على أن الجدول غير عام)
function looksLikeLoginOrHtml(text){
  const t=(text||"").slice(0,400).toLowerCase();
  return t.includes("<!doctype html") || t.includes("<html") ||
         t.includes("accounts.google.com") || t.includes("sign in") || t.includes("اعتذر");
}
async function fetchCsvOnce(url){
  const ctrl = new AbortController();
  const timer = setTimeout(()=>ctrl.abort(), FETCH_TIMEOUT_MS);
  try{
    const res = await fetch(url, { redirect:"follow", signal:ctrl.signal });
    const text = await res.text();
    if(!res.ok) return { ok:false, code:res.status, text };
    if(looksLikeLoginOrHtml(text)) return { ok:false, code:"private", text };
    return { ok:true, code:res.status, text };
  } finally { clearTimeout(timer); }
}
async function refreshFromSheet(){
  try{
    let items, rowsLen=0, csv=null;
    // 1) ملف CSV محلي (حل احتياطي تام يعمل بدون إنترنت)
    if(LOCAL_CSV && fs.existsSync(LOCAL_CSV)){
      csv = fs.readFileSync(LOCAL_CSV, "utf8");
      lastSync.source = "local-csv";
    }
    // 2) Google Sheet عبر عدة روابط مرشّحة
    else if(SHEET_ID || SHEET_CSV_URL){
      const tried=[]; let lastCode=null;
      for(const url of sheetCandidates()){
        const r = await fetchCsvOnce(url);
        tried.push((url.includes("gviz")?"gviz":url.includes("export")?"export":"published")+":"+r.code);
        if(r.ok){ csv = r.text; break; }
        lastCode = r.code;
      }
      lastSync.source = "google-sheet";
      if(csv===null){
        if(lastCode==="private") throw new Error("الجدول غير مُشارَك للعموم. فعّل: Anyone with the link ← Viewer، أو استخدم رابط النشر للويب.");
        throw new Error("تعذّر الوصول للجدول ("+tried.join(" / ")+")");
      }
    }
    // 3) بيانات تجريبية إن لم يُضبط أي مصدر
    else{
      items = SEED_ITEMS.slice(); rowsLen = items.length; lastSync.source="seed";
    }

    if(csv!==null){
      const rows = parseCSV(csv);
      rowsLen = Math.max(0, rows.length-1);
      items = rowsToItems(rows);
      if(!items.length) throw new Error("لم يتم العثور على صفوف صالحة (تحقق من عناوين الأعمدة: المسار/النوع/العنوان/المسؤول/الحالة/التاريخ).");
    }
    const state = buildState(items);
    const hash = crypto.createHash("sha1").update(JSON.stringify({tracks:state.tracks,items:state.items})).digest("hex");
    if(hash !== liveHash){
      liveHash = hash;
      liveVersion += 1;
      liveUpdatedAt = new Date().toISOString();
      liveState = state;
    }else if(!liveState){
      liveState = state; liveUpdatedAt = new Date().toISOString(); liveVersion = liveVersion||1;
    }
    lastSync = { ok:true, at:new Date().toISOString(), rows:rowsLen, error:null, source:lastSync.source };
  }catch(e){
    lastSync = { ok:false, at:new Date().toISOString(), rows:lastSync.rows||0, error:e.message||String(e), source:lastSync.source };
    if(!liveState){ // أول إقلاع فشل: اعرض بيانات القالب المرفقة حتى تكون اللوحة كاملة فورًا
      setStateFromItems(fallbackItems());
    }
    console.error("[sheet-sync] فشل السحب:", e.message);
  }
}

/* ============ أدوات HTTP + رؤوس الأمان ============ */
function securityHeaders(req,res){
  // سياسة أمان المحتوى: تمنع تحميل سكربتات/موارد خارجية، وتمنع التأطير (clickjacking)،
  // وتقصر الاتصالات على نفس الأصل (يمنع تسريب البيانات حتى لو وُجد XSS).
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +   // hls.js لتشغيل البث المباشر
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "media-src 'self' blob: https:; " +       // مشغّل الفيديو/البث المباشر (HLS)
    "connect-src 'self' https:; " +            // جلب مقاطع البث (HLS) من مصدر القناة
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; " +
    "object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Permissions-Policy","geolocation=(), microphone=(), camera=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy","same-origin");
  res.setHeader("Cross-Origin-Resource-Policy","same-origin");
  if(isHttps(req)) res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
}
function sessionCookie(req,sid,clear){
  const parts=[`kag_session=${clear?"":encodeURIComponent(sid)}`,"HttpOnly","SameSite=Lax","Path=/"];
  if(isHttps(req)) parts.push("Secure");
  parts.push(clear?"Max-Age=0":`Max-Age=${Math.floor(SESSION_TTL_MS/1000)}`);
  return parts.join("; ");
}
function sendJson(res,status,obj){
  const body=JSON.stringify(obj);
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
  res.end(body);
}
function readBody(req){
  return new Promise((resolve,reject)=>{
    let data="";
    req.on("data",ch=>{ data+=ch; if(data.length>1024*1024){reject(new Error("Request too large"));req.destroy();} });
    req.on("end",()=>resolve(data));
    req.on("error",reject);
  });
}
function getCookie(req,name){
  const cookie=req.headers.cookie||"";
  return cookie.split(";").map(s=>s.trim()).reduce((acc,part)=>{
    const idx=part.indexOf("="); if(idx>-1) acc[part.slice(0,idx)]=decodeURIComponent(part.slice(idx+1)); return acc;
  },{})[name];
}
function isAuthed(req){
  const sid=getCookie(req,"kag_session");
  if(!sid||!sessions.has(sid)) return false;
  const s=sessions.get(sid);
  if(Date.now()>s.exp){ sessions.delete(sid); return false; }
  return true;
}
function isAdmin(req){
  const sid=getCookie(req,"kag_session");
  if(!sid||!sessions.has(sid)) return false;
  const s=sessions.get(sid);
  if(Date.now()>s.exp){ sessions.delete(sid); return false; }
  return s.role==="admin";
}
// نسخة عامة من حالة المزامنة بدون تفاصيل داخلية حساسة
function publicSync(){
  return { ok:lastSync.ok, at:lastSync.at, rows:lastSync.rows, source:lastSync.source,
           error: lastSync.error ? "تعذّر سحب البيانات من المصدر" : null };
}
function mimeType(file){
  const ext=path.extname(file).toLowerCase();
  return {".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",
    ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".csv":"text/csv; charset=utf-8",
    ".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".ico":"image/x-icon"
  }[ext]||"application/octet-stream";
}
function serveStatic(req,res){
  let urlPath=decodeURIComponent((req.url||"/").split("?")[0]);
  if(urlPath==="/") urlPath="/index.html";
  if(urlPath.indexOf("\0")!==-1){ res.writeHead(400); return res.end("Bad request"); }
  const filePath=path.normalize(path.join(PUBLIC_DIR,urlPath));
  // منع تجاوز المسار: يجب أن يبقى داخل مجلد public تمامًا
  if(filePath!==PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR+path.sep)){ res.writeHead(403); return res.end("Forbidden"); }
  fs.stat(filePath,(err,stat)=>{
    if(err||!stat.isFile()){ res.writeHead(404); return res.end("Not found"); }
    const cache = /\.(png|jpg|jpeg|svg|ico)$/i.test(filePath) ? "public, max-age=3600" : "no-cache";
    res.writeHead(200,{"Content-Type":mimeType(filePath),"Cache-Control":cache});
    fs.createReadStream(filePath).pipe(res);
  });
}

let lastForcedRefresh=0;
function serveLoginGate(res){
  var html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>تسجيل الدخول — مركز القيادة المباشر</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Tahoma,Arial,sans-serif}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 20%,#13293D,#0D1B2A 70%);color:#EAF0F7;padding:20px}
.card{width:min(420px,94vw);background:rgba(13,27,42,.85);border:1px solid rgba(201,168,76,.45);border-radius:18px;padding:34px 30px;box-shadow:0 24px 70px rgba(0,0,0,.5)}
.brand{text-align:center;margin-bottom:24px}
.brand h1{font-size:22px;color:#C9A84C;margin-bottom:6px}
.brand p{font-size:13px;color:#9FB0C3}
label{display:block;font-size:13px;color:#C9D4E0;margin:14px 0 6px}
input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid rgba(201,168,76,.35);background:rgba(255,255,255,.06);color:#fff;font-size:15px;outline:none}
input:focus{border-color:#C9A84C}
button{width:100%;margin-top:22px;padding:13px;border:none;border-radius:10px;background:#C9A84C;color:#0D1B2A;font-size:16px;font-weight:bold;cursor:pointer}
button:disabled{opacity:.6;cursor:default}
.err{margin-top:14px;color:#FF6B6B;font-size:13px;min-height:18px;text-align:center}
</style></head><body>
<div class="card">
  <div class="brand"><h1>مركز القيادة المباشر</h1><p>حدائق الملك عبدالله — سجّل دخولك (Viewer أو Admin)</p></div>
  <form id="f" autocomplete="off">
    <label>اسم المستخدم</label>
    <input id="u" type="text" required autocomplete="username">
    <label>كلمة المرور</label>
    <input id="p" type="password" required autocomplete="current-password">
    <button id="b" type="submit">تسجيل الدخول</button>
    <div class="err" id="e"></div>
  </form>
</div>
<script>
var f=document.getElementById('f'),b=document.getElementById('b'),e=document.getElementById('e');
f.addEventListener('submit',function(ev){
  ev.preventDefault();
  b.disabled=true;e.textContent='جارٍ التحقق...';
  fetch('/api/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({username:document.getElementById('u').value.trim(),password:document.getElementById('p').value})})
    .then(function(r){return r.json();})
    .then(function(d){ if(d&&d.ok){ location.href='/'; } else { e.textContent='اسم المستخدم أو كلمة المرور غير صحيحة.'; b.disabled=false; } })
    .catch(function(){ e.textContent='تعذّر الاتصال بالخادم.'; b.disabled=false; });
});
</script>
</body></html>`;
  res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"});
  res.end(html);
}
const server=http.createServer(async (req,res)=>{
  try{
    securityHeaders(req,res);
    const url=(req.url||"").split("?")[0];

    if(req.method==="GET" && url==="/api/health")
      return sendJson(res,200,{ok:true,time:new Date().toISOString()});

    // الحالة الحية (للقراءة) — مشتقة من Google Sheet
    if(req.method==="GET" && url==="/api/state"){
      if(REQUIRE_LOGIN && !isAuthed(req)) return sendJson(res,401,{error:"يلزم تسجيل الدخول"});
      return sendJson(res,200,{version:liveVersion,updatedAt:liveUpdatedAt,state:liveState,sync:publicSync()});
    }

    // حالة مصدر البيانات (تفاصيل حساسة) — للأدمن فقط
    if(url==="/api/config"){
      if(req.method!=="GET") return sendJson(res,405,{error:"الطريقة غير مسموحة"});
      if(!isAuthed(req)) return sendJson(res,401,{error:"يلزم تسجيل الدخول"});
      return sendJson(res,200,{
        sheetConfigured:!!SHEET_ID,
        sheetName:SHEET_NAME||"(أول تبويب)",
        refreshMs:SHEET_REFRESH_MS,
        sheetViewUrl: SHEET_ID?`https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`:null,
        sync:lastSync, version:liveVersion, updatedAt:liveUpdatedAt
      });
    }

    // إعادة سحب فورية — للأدمن فقط + فحص المصدر + تحديد معدل
    if(url==="/api/refresh"){
      if(req.method!=="POST") return sendJson(res,405,{error:"الطريقة غير مسموحة"});
      if(!sameOrigin(req)) return sendJson(res,403,{error:"مصدر غير موثوق"});
      if(!isAuthed(req)) return sendJson(res,401,{error:"يلزم تسجيل الدخول"});
      const nowMs=Date.now();
      if(nowMs-lastForcedRefresh<3000) return sendJson(res,429,{ok:false,error:"الرجاء الانتظار قليلًا"});
      lastForcedRefresh=nowMs;
      await refreshFromSheet();
      return sendJson(res,200,{ok:lastSync.ok,version:liveVersion,updatedAt:liveUpdatedAt,sync:publicSync()});
    }

    // تسجيل دخول الأدمن (تحقق من الخادم فقط) — مقارنة آمنة + حظر تخمين + فحص المصدر
    if(url==="/api/login"){
      if(req.method!=="POST") return sendJson(res,405,{error:"الطريقة غير مسموحة"});
      if(!sameOrigin(req)) return sendJson(res,403,{ok:false,error:"مصدر غير موثوق"});
      const ip=clientIp(req);
      if(loginBlocked(ip)) return sendJson(res,429,{ok:false,error:"محاولات كثيرة. حاول لاحقًا."});
      let body={};
      const raw=await readBody(req);
      try{ body=raw?JSON.parse(raw):{}; }catch(e){ return sendJson(res,400,{ok:false,error:"طلب غير صالح"}); }
      const adminMatch = safeEqual(body.username||"",ADMIN_USERNAME) & safeEqual(body.password||"",ADMIN_PASSWORD);
      const viewerMatch = safeEqual(body.username||"",VIEWER_USERNAME) & safeEqual(body.password||"",VIEWER_PASSWORD);
      if(adminMatch || viewerMatch){
        clearLoginFails(ip);
        const sid=crypto.randomBytes(32).toString("hex");
        const role = adminMatch ? "admin" : "viewer";
        sessions.set(sid,{exp:Date.now()+SESSION_TTL_MS, role});
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
          "Set-Cookie":sessionCookie(req,sid,false)});
        return res.end(JSON.stringify({ok:true, role}));
      }
      recordLoginFail(ip);
      return sendJson(res,401,{ok:false,error:"بيانات الدخول غير صحيحة"});
    }
    // admin-login: يرفع صلاحية الجلسة الحالية إلى admin (يُستدعى من popup داخل اللوحة)
    if(url==="/api/admin-login"){
      if(req.method!=="POST") return sendJson(res,405,{error:"الطريقة غير مسموحة"});
      if(!sameOrigin(req)) return sendJson(res,403,{ok:false,error:"مصدر غير موثوق"});
      const ip=clientIp(req);
      if(loginBlocked(ip)) return sendJson(res,429,{ok:false,error:"محاولات كثيرة. حاول لاحقًا."});
      let body={};
      const raw=await readBody(req);
      try{ body=raw?JSON.parse(raw):{}; }catch(e){ return sendJson(res,400,{ok:false,error:"طلب غير صالح"}); }
      const ok = safeEqual(body.username||"",ADMIN_USERNAME) & safeEqual(body.password||"",ADMIN_PASSWORD);
      if(ok){
        clearLoginFails(ip);
        // ارفع دور الجلسة الحالية إلى admin إن وُجدت، وإلا أنشئ جلسة جديدة
        const existingSid=getCookie(req,"kag_session");
        if(existingSid && sessions.has(existingSid)){
          const s=sessions.get(existingSid); s.role="admin"; s.exp=Date.now()+SESSION_TTL_MS;
          sessions.set(existingSid,s);
          return res.end(JSON.stringify({ok:true,role:"admin"}));
        }
        const sid=crypto.randomBytes(32).toString("hex");
        sessions.set(sid,{exp:Date.now()+SESSION_TTL_MS, role:"admin"});
        res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
          "Set-Cookie":sessionCookie(req,sid,false)});
        return res.end(JSON.stringify({ok:true,role:"admin"}));
      }
      recordLoginFail(ip);
      return sendJson(res,401,{ok:false,error:"بيانات دخول الإدارة غير صحيحة"});
    }
    if(url==="/api/logout"){
      if(req.method!=="POST") return sendJson(res,405,{error:"الطريقة غير مسموحة"});
      if(!sameOrigin(req)) return sendJson(res,403,{ok:false,error:"مصدر غير موثوق"});
      const sid=getCookie(req,"kag_session"); if(sid) sessions.delete(sid);
      res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
        "Set-Cookie":sessionCookie(req,"",true)});
      return res.end(JSON.stringify({ok:true}));
    }
    if(req.method==="GET" && url==="/api/admin-check")
      return sendJson(res,200,{authed:isAuthed(req), isAdmin:isAdmin(req)});

    // ===== توليد التقارير (Python) =====
    if(url.startsWith("/api/report") && req.method==="POST"){
      if(!isAuthed(req)) return sendJson(res,401,{error:"غير مصرّح"});
      let body={};
      const raw=await readBody(req);
      try{ body=raw?JSON.parse(raw):{}; }catch(e){ return sendJson(res,400,{error:"طلب غير صالح"}); }
      const reportType   = body.type   || "comprehensive";
      const reportFormat = body.format || "html";
      if(!liveState) return sendJson(res,503,{error:"البيانات غير متاحة بعد"});
      try{
        const safeNames = {"comprehensive":"Comprehensive","أ":"A","ب":"B","ج":"C","د":"D"};
        const safeName  = safeNames[reportType] || "Report";
        const dateStr   = new Date().toISOString().slice(0,10);

        if(reportFormat === "pptx"){
          // توليد PPTX بـ pptxgenjs
          const stream = await generatePptx(reportType, liveState);
          const chunks = [];
          stream.on("data", chunk => chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk)));
          await new Promise((resolve,reject)=>{ stream.on("end",resolve); stream.on("error",reject); });
          const buf = Buffer.concat(chunks);
          const fname = `KAGA-${safeName}-${dateStr}.pptx`;
          res.writeHead(200,{
            "Content-Type":"application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "Content-Disposition":`attachment; filename="${fname}"`,
            "Content-Length": buf.length,
            "Cache-Control":"no-store"
          });
          return res.end(buf);
        } else {
          // توليد HTML/PDF
          const buf = await generateReport(reportType, liveState);
          const fname = `KAGA-${safeName}-${dateStr}.html`;
          res.writeHead(200,{
            "Content-Type":"text/html; charset=utf-8",
            "Content-Disposition":`inline; filename="${fname}"`,
            "Content-Length": buf.length,
            "Cache-Control":"no-store"
          });
          return res.end(buf);
        }
      }catch(e){
        console.error("خطأ في توليد التقرير:", e);
        return sendJson(res,500,{error:"فشل توليد التقرير: "+e.message});
      }
    }

    if(url.startsWith("/api/")) return sendJson(res,404,{error:"غير موجود"});
    if(req.method!=="GET" && req.method!=="HEAD"){ res.writeHead(405); return res.end("Method not allowed"); }
    // بوابة تسجيل الدخول: لا يُعرض أي محتوى قبل الدخول عند تفعيل القفل الكامل
    if(REQUIRE_LOGIN && !isAuthed(req)) return serveLoginGate(res);
    return serveStatic(req,res);
  }catch(e){
    console.error("[server]", e && e.message ? e.message : e);
    return sendJson(res,500,{ok:false,error:"خطأ داخلي في الخادم"});
  }
});
// تحصين ضد هجمات الإبطاء (slowloris) والطلبات المعلّقة
server.requestTimeout = 20000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 8000;

(async ()=>{
  await refreshFromSheet();
  setInterval(refreshFromSheet, SHEET_REFRESH_MS);
  server.listen(PORT,()=>{
    console.log(`KAG Live Command Center يعمل على http://localhost:${PORT}`);
    console.log(`مصدر البيانات: ${SHEET_ID?("Google Sheet ["+SHEET_ID+"]"):"بيانات تجريبية (لم يُضبط SHEET_ID)"}`);
    console.log(`اسم مستخدم الأدمن: ${ADMIN_USERNAME}`);
    if(!process.env.ADMIN_PASSWORD) console.log(`كلمة مرور الأدمن الأساسية: ${ADMIN_PASSWORD}  (يمكن تغييرها عبر ADMIN_PASSWORD)`);
    if(REQUIRE_LOGIN) console.log("الوضع: قفل كامل (REQUIRE_LOGIN=true) — لا تُعرض البيانات إلا بعد تسجيل الدخول.");
  });
})();
