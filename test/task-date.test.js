"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {formatTaskDate,formatTaskStartDate}=require("../public/task-date");

test("formats the sheet start date in the PMC day-month-year display",()=>{
  assert.equal(formatTaskStartDate("06/06/2026"),"06-06-2026");
  assert.equal(formatTaskStartDate("2026-06-08"),"08-06-2026");
  assert.equal(formatTaskStartDate("2026-06-09"),"09-06-2026");
  assert.equal(formatTaskStartDate("2026-07-16"),"16-07-2026");
  assert.equal(formatTaskStartDate("2026-08-19"),"19-08-2026");
  assert.equal(formatTaskStartDate("2026-12-25"),"25-12-2026");
  assert.equal(formatTaskStartDate("19-08-2026"),"19-08-2026");
  assert.equal(formatTaskStartDate("2026-06-09T00:00:00.000Z"),"09-06-2026");
});

test("uses the same calendar formatter for start and due dates",()=>{
  assert.equal(formatTaskDate("2026-07-16"),"16-07-2026");
  assert.equal(formatTaskDate("19-08-2026"),"19-08-2026");
});

test("shows an em dash when the sheet start date is empty",()=>{
  assert.equal(formatTaskStartDate(""),"—");
  assert.equal(formatTaskStartDate(null),"—");
  assert.equal(formatTaskStartDate(undefined),"—");
});
