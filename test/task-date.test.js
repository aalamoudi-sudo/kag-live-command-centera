"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {formatTaskStartDate}=require("../public/task-date");

test("formats the sheet start date in the PMC day-month-year display",()=>{
  assert.equal(formatTaskStartDate("06/06/2026"),"06-06-2026");
  assert.equal(formatTaskStartDate("2026-06-07"),"07-06-2026");
  assert.equal(formatTaskStartDate("2026-08-19"),"19-08-2026");
  assert.equal(formatTaskStartDate("2026-12-25"),"25-12-2026");
});

test("shows an em dash when the sheet start date is empty",()=>{
  assert.equal(formatTaskStartDate(""),"—");
  assert.equal(formatTaskStartDate(null),"—");
  assert.equal(formatTaskStartDate(undefined),"—");
});
