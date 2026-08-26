"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const script = fs.readFileSync(path.join(__dirname, "../public/script.js"), "utf8");
const functionSource = script.match(/function overviewTrackStatus\(variance\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(functionSource, "overview-only track status classifier must exist");

const context = {};
vm.runInNewContext(`${functionSource};this.overviewTrackStatus=overviewTrackStatus`, context);

test("overview track badges use the requested variance boundaries", () => {
  const cases = new Map([
    [0, "ضمن المسار"],
    [-9, "ضمن المسار"],
    [-10, "ضمن المسار"],
    [-11, "يحتاج متابعة"],
    [-20, "يحتاج متابعة"],
    [-21, "معرض للخطر"],
    [-23, "معرض للخطر"],
    [-43, "معرض للخطر"],
    [-57, "معرض للخطر"]
  ]);

  for(const [variance, expected] of cases){
    assert.equal(context.overviewTrackStatus(variance).label, expected, `${variance}%`);
  }
});

test("overview badge classification stays local to the overview track card", () => {
  assert.match(script, /const displayTrackStatus = overviewTrackStatus\(variance\)/);
  assert.match(script, /overview-track-status--\$\{displayTrackStatus\.tone\}/);
  assert.match(script, /\$\{displayTrackStatus\.label\}/);
  assert.match(script, /\$\{paHtml\(planned, Number\(t\.progress\|\|0\)\)\}/);
});
