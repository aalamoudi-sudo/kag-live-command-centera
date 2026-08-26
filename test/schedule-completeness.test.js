"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const api=require("../public/schedule-completeness.js");

test("classifies the four current-date combinations and counts each task once",()=>{
  const tasks=[
    {startDate:"2026-09-10",due:"2026-09-15"},
    {startDate:"",due:"2026-09-15"},
    {startDate:"2026-09-10",due:null},
    {startDate:"",due:""}
  ];
  assert.deepEqual(api.inspectTask(tasks[0]),{missingStart:false,missingEnd:false,incomplete:false});
  assert.deepEqual(api.inspectTask(tasks[1]),{missingStart:true,missingEnd:false,incomplete:true});
  assert.deepEqual(api.inspectTask(tasks[2]),{missingStart:false,missingEnd:true,incomplete:true});
  assert.deepEqual(api.inspectTask(tasks[3]),{missingStart:true,missingEnd:true,incomplete:true});
  assert.equal(api.summarize(tasks).incomplete,3);
});

test("treats whitespace, placeholders, invalid values, null and undefined as missing",()=>{
  ["   ","—","-","not-a-date",null,undefined,new Date("invalid")].forEach(value=>assert.equal(api.isValidScheduleDate(value),false));
});

test("reports all-complete and 70 of 75 scenarios",()=>{
  const complete={startDate:"2026-09-10",due:"2026-09-15"};
  assert.deepEqual(api.summarize(Array(6).fill(complete)),{total:6,complete:6,incomplete:0,incompleteTasks:[]});
  const result=api.summarize([...Array(70).fill(complete),...Array(5).fill({startDate:"",due:"2026-09-15"})]);
  assert.equal(result.complete,70);
  assert.equal(result.total,75);
  assert.equal(result.incomplete,5);
});

test("ignores status and approved dates",()=>{
  assert.equal(api.inspectTask({status:"مكتملة",startDate:"2026-09-10",due:""}).incomplete,true);
  assert.equal(api.inspectTask({status:"",startDate:"2026-09-10",due:"2026-09-15"}).incomplete,false);
  assert.equal(api.inspectTask({approvedStartDate:"",approvedEndDate:"",startDate:"2026-09-10",due:"2026-09-15"}).incomplete,false);
});
