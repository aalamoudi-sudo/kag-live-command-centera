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
  for(const file of ["public/task-status.js", "public/task-date.js", "public/schedule-variance.js", "public/script.js"]){
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

test("the PMC page requests fresh versions of the date formatter and render bundle", () => {
  const html = read("public/index.html");
  assert.match(html, /src="task-date\.js\?v=3"/);
  assert.match(html, /src="schedule-variance\.js\?v=1"/);
  assert.match(html, /src="script\.js\?v=8"/);
});
