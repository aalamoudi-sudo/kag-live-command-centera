const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("schedule variance uses the requested user-facing name and description", () => {
  const html = read("public/index.html");
  assert.match(html, /data-page="schedule-variance" data-protected="true">انحرافات الجدول الزمني<\/button>/);
  assert.match(html, /<h2>انحرافات الجدول الزمني<\/h2>/);
  assert.match(html, /رصد ومتابعة الانحرافات في تواريخ البداية والنهاية مقارنةً بالجدول الزمني المعتمد\./);
  assert.doesNotMatch(html, /تحليل الانحرافات عن الجدول الزمني/);
});

test("schedule variance is absent from dashboard KPIs and guarded in UI and server", () => {
  const script = read("public/script.js");
  const css = read("public/style.css");
  const server = read("server.js");
  const renderKpis = script.slice(script.indexOf("function renderKpis"), script.indexOf("let varianceFiltersBound"));

  assert.doesNotMatch(renderKpis, /انحرافات الجدول الزمني/);
  assert.match(script, /if\(!page \|\| !isAdminUnlocked\(\)\) return;/);
  assert.match(script, /pageButton\?\.dataset\.protected === "true" && !isAdminUnlocked\(\)/);
  assert.match(css, /\.nav-btn\[data-page="schedule-variance"\]\{display:none\}/);
  assert.match(server, /url==="\/schedule-variance"[\s\S]*?!isAdmin\(req\)[\s\S]*?403/);
});
