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
    items:[item],
    feed:[], dailyLogs:[], decisions:[], snapshots:[]
  }));
  for(const file of ["public/task-status.js", "public/task-date.js", "public/schedule-variance.js", "public/schedule-completeness.js", "public/script.js"]){
    window.eval(read(file));
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

test("Google Sheet mapping uses the existing Arabic notes column", () => {
  const server = read("server.js");
  assert.match(server, /replace\("الملاحظات","notes"\)/);
  assert.match(server, /notes:\s*map\.notes>=0\s*\?\s*clean\(r\[map\.notes\]/);
});

test("the PMC page requests fresh versions of the date formatter and render bundle", () => {
  const html = read("public/index.html");
  assert.match(html, /src="task-date\.js\?v=3"/);
  assert.match(html, /src="schedule-variance\.js\?v=1"/);
  assert.match(html, /src="schedule-completeness\.js\?v=1"/);
  assert.match(html, /href="style\.css\?v=5"/);
  assert.match(html, /src="script\.js\?v=11"/);
});
