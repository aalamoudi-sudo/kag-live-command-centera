"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {JSDOM} = require("jsdom");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

function loadPMC(item){
  const dom = new JSDOM(read("public/index.html"), {
    url: "http://localhost/",
    runScripts: "outside-only"
  });
  const {window} = dom;
  window.structuredClone = global.structuredClone;
  window.fetch = async () => ({ok:false, json:async () => ({})});
  window.alert = () => {};
  window.confirm = () => false;
  window.setInterval = () => 0;
  window.setTimeout = () => 0;
  window.localStorage.setItem("kagV6BulkImport", JSON.stringify({
    project:{title:"PMC", openingDate:"2026-11-01"},
    tracks:[{id:"أ", slug:"track-a", name:"المسار", ar:"Track", sub:"", status:"ضمن المسار", progress:0, tasks:1, done:0, active:1, risk:0, lead:"PMC", focus:""}],
    items:Array.isArray(item) ? item : [item],
    feed:[], dailyLogs:[], decisions:[], snapshots:[]
  }));
  for(const file of ["public/task-status.js", "public/task-date.js", "public/schedule-variance.js", "public/schedule-completeness.js", "public/pmc-planned-actual.js", "public/script.js"]){
    window.eval(read(file)+(file==="public/script.js"?"\nwindow.testState=()=>state;":""));
  }
  return dom;
}

test("the actual task details card renders its start date through the formatter", () => {
  const dom = loadPMC({
    track:"أ", type:"tasks", title:"مهمة اختبار", owner:"PMC",
    status:"قيد التنفيذ", startDate:"2026-07-16", due:"2026-08-19"
  });
  try{
    dom.window.showDetails("tasks", "أ");
    const text = dom.window.document.querySelector(".detail-item-card").textContent.replace(/\s+/g, " ");
    assert.match(text, /تاريخ البداية:\s*16-07-2026/);
    assert.match(text, /الاستحقاق:\s*19-08-2026/);
    assert.doesNotMatch(text, /تاريخ البداية:\s*2026-07-16/);
  }finally{
    dom.window.close();
  }
});

test("every visible startDate interpolation in the PMC script uses formatTaskDate", () => {
  const renderInterpolations = read("public/script.js").match(/\$\{[^}\n]*\.startDate[^}\n]*\}/g) || [];
  assert.ok(renderInterpolations.length > 0, "expected startDate render paths to be present");
  for(const interpolation of renderInterpolations){
    assert.match(interpolation, /formatTaskDate\([^)]*\.startDate\)/);
  }
});

test("track table dates have a non-wrapping, sufficiently wide date cell", () => {
  const script = read("public/script.js");
  const css = read("public/style.css");
  assert.match(script, /class="track-date-cell">تاريخ البداية:/);
  assert.match(css, /\.data-row \.track-date-cell\{[^}]*min-width:180px[^}]*white-space:nowrap!important[^}]*overflow-wrap:normal!important[^}]*\}/);
});

test("task notes render independently only when they contain meaningful text", () => {
  const values = [undefined, null, "", "   ", "-", "N/A", "لا يوجد"];
  for(const notes of values){
    const dom = loadPMC({track:"أ", type:"tasks", title:"مهمة بلا ملاحظة", owner:"PMC", status:"قيد التنفيذ", notes});
    try{
      dom.window.showDetails("tasks", "أ");
      assert.equal(dom.window.document.querySelector(".task-notes"), null, `unexpected notes row for ${String(notes)}`);
    }finally{ dom.window.close(); }
  }

  const dom = loadPMC({track:"أ", type:"tasks", title:"مهمة بملاحظة", owner:"PMC", status:"قيد التنفيذ", notes:"  بانتظار اعتماد النسخة النهائية من العميل  "});
  try{
    dom.window.showDetails("tasks", "أ");
    const notesRow = dom.window.document.querySelector(".task-notes");
    assert.ok(notesRow);
    assert.match(notesRow.textContent, /الملاحظات:\s*بانتظار اعتماد النسخة النهائية من العميل/);
  }finally{ dom.window.close(); }
});

test("task details show date warnings only for the missing date combinations", () => {
  const tasks = [
    {track:"أ", type:"tasks", title:"مكتملة التواريخ", startDate:"2026-09-10", due:"2026-09-15"},
    {track:"أ", type:"tasks", title:"بداية ناقصة", startDate:"", due:"2026-09-15"},
    {track:"أ", type:"tasks", title:"نهاية ناقصة", startDate:"2026-09-10", due:""},
    {track:"أ", type:"tasks", title:"التاريخان ناقصان", startDate:"", due:""}
  ];
  const dom = loadPMC(tasks);
  try{
    dom.window.showDetails("tasks", "أ");
    const cards = [...dom.window.document.querySelectorAll(".detail-item-card")];
    assert.equal(cards[0].querySelector(".schedule-date-warning"), null);
    assert.equal(cards[1].querySelector(".schedule-date-warning").textContent.trim(), "⚠ تاريخ البداية مفقود");
    assert.equal(cards[2].querySelector(".schedule-date-warning").textContent.trim(), "⚠ تاريخ النهاية مفقود");
    assert.equal(cards[3].querySelector(".schedule-date-warning").textContent.trim(), "⚠ تاريخ البداية والنهاية مفقودان");
    assert.doesNotMatch(dom.window.document.getElementById("detailModalList").textContent, /التواريخ مكتملة/);
  }finally{ dom.window.close(); }
});

test("task details show a compact summary only when incomplete dates exist", () => {
  const incomplete = [1, 2, 3].map(n=>({track:"أ", type:"tasks", title:`مهمة ${n}`, startDate:"", due:"2026-09-15"}));
  const dom = loadPMC(incomplete);
  try{
    dom.window.showDetails("tasks", "أ");
    assert.equal(dom.window.document.querySelector(".schedule-completeness-summary").textContent.trim(), "⚠ 3 مهام بتواريخ غير مكتملة");
  }finally{ dom.window.close(); }

  const completeDom = loadPMC({track:"أ", type:"tasks", title:"مهمة مكتملة التواريخ", startDate:"2026-09-10", due:"2026-09-15"});
  try{
    completeDom.window.showDetails("tasks", "أ");
    assert.equal(completeDom.window.document.querySelector(".schedule-completeness-summary"), null);
  }finally{ completeDom.window.close(); }
});

test("track cards no longer render the schedule completeness box", () => {
  const script = read("public/script.js");
  assert.doesNotMatch(script, /scheduleCompletenessHtml\(t\.id\)/);
  assert.doesNotMatch(script, /اكتمال بيانات الجدول الزمني/);
});

test("Google Sheet mapping uses the existing Arabic notes column", () => {
  const server = read("server.js");
  assert.match(server, /replace\("الملاحظات","notes"\)/);
  assert.match(server, /notes:\s*map\.notes>=0\s*\?\s*clean\(r\[map\.notes\]/);
});

test("the PMC page requests fresh versions of the date formatter and render bundle", () => {
  const html = read("public/index.html");
  assert.match(html, /src="task-status\.js\?v=4"/);
  assert.match(html, /src="task-date\.js\?v=3"/);
  assert.match(html, /src="schedule-variance\.js\?v=1"/);
  assert.match(html, /src="schedule-completeness\.js\?v=1"/);
  assert.match(html, /href="style\.css\?v=6"/);
  assert.match(html, /src="script\.js\?v=14"/);
});

test("held-task card opens matching details while full task list retains held tasks",()=>{
  const dom=loadPMC([
    {type:"tasks",track:"أ",title:"HELD_ROW*",status:"مكتملة",due:"2026-10-01"},
    {type:"tasks",track:"أ",title:"ACTIVE_ROW",status:"قيد التنفيذ",due:"2026-10-01"},
    {type:"risks",track:"أ",title:"RISK_ROW*",status:"تحت المتابعة"}
  ]);
  try{
    const w=dom.window;
    const button=w.document.querySelector('#tracksSummary [onclick*="tasks-held"]');
    assert.ok(button);assert.match(button.textContent,/1.*المهام المعلقة/s);
    button.onclick=w.Function("event",button.getAttribute("onclick"));
    button.click();
    assert.match(w.document.getElementById('detailModalList').textContent,/HELD_ROW.*معلقة/s);
    assert(!w.document.getElementById('detailModalList').textContent.includes('ACTIVE_ROW'));
    w.showDetails('tasks','أ');assert.match(w.document.getElementById('detailModalList').textContent,/HELD_ROW/);
    w.showDetails('tasks-done','أ');assert(!w.document.getElementById('detailModalList').textContent.includes('HELD_ROW'));
    w.showDetails('risks','أ');assert.match(w.document.getElementById('detailModalList').textContent,/RISK_ROW/);
    w.testState().items[0].title="HELD_ROW"; w.renderAll();
    w.showDetails('tasks-done','أ');assert.match(w.document.getElementById('detailModalList').textContent,/HELD_ROW/);
    w.testState().items[0].title="HELD_ROW*"; w.testState().items[1].title="ACTIVE_ROW*"; w.renderAll();
    assert.equal(w.testState().tracks[0].progress,0);
    assert.equal(w.projectActual(),0);
  }finally{dom.window.close();}
});
