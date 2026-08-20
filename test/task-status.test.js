"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {isTaskOverdue,getTaskDisplayStatus,taskDueTimestamp}=require("../public/task-status");

const task=(status,due,dueTime)=>({type:"tasks",status,due,dueTime});
const atRiyadh=(isoLocal)=>Date.parse(isoLocal+"+03:00");

test("future in-progress task remains in progress",()=>{
  const t=task("قيد التنفيذ","20/08/2026","3:00 PM");
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-19T20:00:00")),false);
  assert.equal(getTaskDisplayStatus(t,atRiyadh("2026-08-19T20:00:00")),"قيد التنفيذ");
});

test("in-progress task started before its planned start is ahead of schedule",()=>{
  const t={...task("قيد التنفيذ","25/08/2026",""),startDate:"25/08/2026"};
  assert.equal(getTaskDisplayStatus(t,atRiyadh("2026-08-21T12:00:00")),"قيد التنفيذ (متقدم عن المسار)");
  assert.equal(t.status,"قيد التنفيذ");
});

test("in-progress task within its planned date range has no extra description",()=>{
  const t={...task("قيد التنفيذ","25/08/2026",""),startDate:"21/08/2026"};
  assert.equal(getTaskDisplayStatus(t,atRiyadh("2026-08-21T00:00:00")),"قيد التنفيذ");
});

test("task due at 9 PM is not late at 8 PM",()=>{
  assert.equal(isTaskOverdue(task("قيد التنفيذ","19/08/2026","9:00 PM"),atRiyadh("2026-08-19T20:00:00")),false);
});

test("task becomes late one minute after its due time",()=>{
  const t=task("قيد التنفيذ","19/08/2026","3:00 PM");
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-19T15:00:00")),false);
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-19T15:01:00")),true);
  assert.equal(getTaskDisplayStatus(t,atRiyadh("2026-08-19T15:01:00")),"قيد التنفيذ - متأخرة");
});

test("yesterday's in-progress task is late",()=>{
  assert.equal(isTaskOverdue(task("قيد التنفيذ","18/08/2026","11:59 PM"),atRiyadh("2026-08-19T00:01:00")),true);
});

test("manual overdue status remains overdue and unchanged",()=>{
  const t=task("متأخرة","20/08/2026","3:00 PM");
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-19T12:00:00")),true);
  assert.equal(getTaskDisplayStatus(t),"متأخرة");
  assert.equal(t.status,"متأخرة");
});

test("completed task is never late",()=>{
  const t=task("مكتملة","18/08/2026","3:00 PM");
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-19T12:00:00")),false);
  assert.equal(getTaskDisplayStatus(t),"مكتملة");
});

test("completed task is early only when its actual completion predates its planned end",()=>{
  const early={...task("مكتملة","25/08/2026",""),actualCompletionDate:"24/08/2026"};
  const onTime={...task("مكتملة","25/08/2026",""),actualCompletionDate:"25/08/2026"};
  assert.equal(getTaskDisplayStatus(early,atRiyadh("2026-08-20T12:00:00")),"مكتملة (منجزة مبكرًا)");
  assert.equal(getTaskDisplayStatus(onTime,atRiyadh("2026-08-20T12:00:00")),"مكتملة");
});

test("completed task without an actual completion date is not inferred early from today",()=>{
  const t=task("مكتملة","25/08/2026","");
  assert.equal(getTaskDisplayStatus(t,atRiyadh("2026-08-20T12:00:00")),"مكتملة");
});

test("automatic display status never mutates the sheet status value",()=>{
  const t=task("قيد التنفيذ","19/08/2026","3:00 PM");
  assert.equal(getTaskDisplayStatus(t,atRiyadh("2026-08-19T15:01:00")),"قيد التنفيذ - متأخرة");
  assert.equal(t.status,"قيد التنفيذ");
});

test("invalid dates/times do not create false overdue tasks",()=>{
  assert.equal(isTaskOverdue(task("قيد التنفيذ","31/02/2026","3:00 PM"),atRiyadh("2026-08-19T15:01:00")),false);
  assert.equal(isTaskOverdue(task("قيد التنفيذ","19/08/2026","25:00"),atRiyadh("2026-08-19T15:01:00")),false);
});

test("date-only compatibility uses the end of the Riyadh due day",()=>{
  const t=task("قيد التنفيذ","19/08/2026","");
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-19T23:59:00")),false);
  assert.equal(isTaskOverdue(t,atRiyadh("2026-08-20T00:00:00")),true);
});

test("due timestamp is independent of the process or browser timezone",()=>{
  assert.equal(taskDueTimestamp(task("قيد التنفيذ","19/08/2026","3:00 PM")),Date.parse("2026-08-19T12:00:00Z"));
});

test("manual and automatic overdue tasks share one aggregate/filter predicate",()=>{
  const now=atRiyadh("2026-08-19T15:01:00");
  const items=[
    ...Array.from({length:5},()=>task("متأخرة","20/08/2026","3:00 PM")),
    ...Array.from({length:3},()=>task("قيد التنفيذ","19/08/2026","3:00 PM")),
    task("مكتملة","18/08/2026","3:00 PM")
  ];
  assert.equal(items.filter(i=>isTaskOverdue(i,now)).length,8);
});
