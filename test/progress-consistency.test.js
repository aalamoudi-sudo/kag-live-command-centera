"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const metrics = require("../public/pmc-planned-actual");

const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("track ring and actual label render the same shared metric", () => {
  const source = read("public/script.js");
  const trackCardStart = source.lastIndexOf("function trackCard(t)");
  const trackCard = source.slice(trackCardStart, source.indexOf("function renderOverview()", trackCardStart));
  const trackPage = source.slice(source.indexOf("function renderTrackPages()"), source.indexOf("// ===== V20"));

  assert.match(trackCard, /const actual = PMCPlannedActual\.summarize\(state\.items\|\|\[\],\{trackId:t\.id\}\)\.actual/);
  assert.match(trackCard, /--value:\$\{actual\}/);
  assert.match(trackCard, /class="ring"><b>\$\{actual\}%/);
  assert.match(trackCard, /paHtml\(planned, actual\)/);
  assert.doesNotMatch(trackCard, /class="ring"><b>\$\{t\.progress\}%/);
  assert.match(trackPage, /class="ring"><b>\$\{actual\}%/);
});

test("shared eligibility keeps held and post-cutoff tasks out of every percentage", () => {
  const base = [
    {type:"tasks", track:"ب", title:"مكتملة", status:"مكتملة", due:"2026-12-30"},
    {type:"tasks", track:"ب", title:"جارية", status:"قيد التنفيذ", due:"2026-12-29"}
  ];
  const expected = metrics.summarize(base, {trackId:"ب", measurementDate:"2026-12-29"});
  const heldVariants = [
    {...base[0], title:"مهمة معلقة *", status:"مكتملة", due:"2026-01-01"},
    {...base[0], title:"مهمة معلقة", status:"قيد التنفيذ *", due:"2026-12-30"},
    {...base[0], title:"مهمة معلقة *", status:"مكتملة", due:"2027-12-31"}
  ];

  for (const held of heldVariants) {
    const result = metrics.summarize([...base, held], {trackId:"ب", measurementDate:"2026-12-29"});
    assert.deepEqual(
      {planned:result.planned, actual:result.actual, denominator:result.denominator},
      {planned:expected.planned, actual:expected.actual, denominator:expected.denominator}
    );
  }

  const unheld = metrics.summarize([...base, {...heldVariants[0], title:"مهمة عادت", status:"مكتملة"}], {
    trackId:"ب", measurementDate:"2026-12-29"
  });
  assert.equal(unheld.denominator, expected.denominator + 1);
  assert.notEqual(unheld.actual, expected.actual);

  const afterCutoff = metrics.summarize([...base, {
    type:"tasks", track:"ب", title:"بعد الحد", status:"مكتملة", due:"2026-12-31"
  }], {trackId:"ب", measurementDate:"2026-12-29"});
  assert.equal(afterCutoff.denominator, expected.denominator);
  assert.equal(afterCutoff.actual, expected.actual);
});

test("server and report paths consume the same planned-actual helper", () => {
  for (const file of ["server.js", "public/server.js", "report-generator.js", "pptx-generator.js"]) {
    const source = read(file);
    assert.match(source, /PMCPlannedActual\.summarize\(/, `${file} must use the shared calculation`);
  }
});
