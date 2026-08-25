"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {variance,analyzeTasks,calendarDay}=require("../public/schedule-variance");

const task=(overrides={})=>({type:"tasks",title:"مهمة",status:"قيد التنفيذ",approvedStartDate:"2026-09-10",startDate:"2026-09-10",approvedEndDate:"2026-09-10",due:"2026-09-10",...overrides});

test("equal approved and current end dates have no variance",()=>assert.equal(variance("2026-09-10","2026-09-10").changed,false));
test("later end date is a five calendar-day delay",()=>assert.deepEqual(variance("2026-09-10","2026-09-15"),{days:5,changed:true,reason:null}));
test("earlier start date is a three calendar-day advance",()=>assert.equal(variance("10/09/2026","07/09/2026").days,-3));
test("a task with start and end changes remains one result and increments both dimensions",()=>{
  const rows=analyzeTasks([task({startDate:"2026-09-12",due:"2026-09-15"})]);
  assert.equal(rows.length,1); assert.equal(rows.filter(i=>i.hasVariance).length,1);
  assert.equal(rows.filter(i=>i.startVariance.changed).length,1); assert.equal(rows.filter(i=>i.endVariance.changed).length,1);
});
test("completion status does not suppress schedule variance",()=>assert.equal(analyzeTasks([task({status:"مكتملة",due:"2026-09-11"})])[0].hasVariance,true));
test("an unchanged dataset safely produces zero changed tasks",()=>assert.equal(analyzeTasks([task()]).filter(i=>i.hasVariance).length,0));
test("missing baseline does not create an imaginary difference",()=>assert.deepEqual(variance("","2026-09-15"),{days:null,changed:false,reason:"missing-baseline"}));
test("missing current date is safe",()=>assert.deepEqual(variance("2026-09-10",""),{days:null,changed:false,reason:"missing-current"}));
test("comparison always uses approved baseline rather than a prior weekly value",()=>assert.equal(variance("2026-10-01","2026-10-08").days,7));
test("a future current date can vary independently of overdue logic",()=>assert.equal(analyzeTasks([task({approvedEndDate:"2026-09-30",due:"2026-10-05"})])[0].endVariance.days,5));
test("Google Sheets serials and date-only strings normalize to calendar days",()=>assert.equal(calendarDay(45910),calendarDay("2025-09-10")));
