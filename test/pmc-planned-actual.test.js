"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const metrics=require("../public/pmc-planned-actual");

const task=(due,status="قيد التنفيذ",extra={})=>({type:"tasks",track:"أ",due,status,...extra});

test("held tasks are excluded from planned and actual numerator and denominator",()=>{
  const result=metrics.summarize([
    task("2026-10-01","مكتملة",{title:"منجزة *"}),
    task("2026-10-01","قيد التنفيذ*",{title:"نشطة"})
  ],{measurementDate:"2026-10-27"});
  assert.equal(result.denominator,0);
  assert.equal(result.planned,0);
  assert.equal(result.actual,0);
  assert.equal(result.excludedCount,2);
});

test("held task changes do not affect metrics until its star is removed",()=>{
  const baseline=metrics.summarize([task("2026-10-20","مكتملة")],{measurementDate:"2026-10-27"});
  const variance=result=>result.planned?Math.round(((result.actual/result.planned)-1)*100):(result.actual?100:0);
  for(const held of [
    task("2026-10-01","مكتملة",{title:"معلقة *"}),
    task("2026-12-30","قيد التنفيذ*",{title:"معلقة"}),
    task("2026-12-31","مكتملة*",{title:"معلقة",startDate:"2025-01-01"})
  ]){
    const result=metrics.summarize([task("2026-10-20","مكتملة"),held],{measurementDate:"2026-10-27"});
    assert.equal(result.planned,baseline.planned);
    assert.equal(result.actual,baseline.actual);
    assert.equal(variance(result),variance(baseline));
  }
  const restored=metrics.summarize([
    task("2026-10-20","مكتملة"),task("2026-10-01","قيد التنفيذ",{title:"معلقة"})
  ],{measurementDate:"2026-10-27"});
  assert.equal(restored.denominator,2);
  assert.equal(restored.planned,100);
  assert.equal(restored.actual,50);
});

test("December 30 is included and December 31 is excluded using the existing due field",()=>{
  const result=metrics.summarize([task("2026-12-30","مكتملة"),task("2026-12-31","مكتملة")],{measurementDate:"2026-12-30"});
  assert.equal(result.endDateField,"due");
  assert.equal(result.total,2);
  assert.equal(result.excludedCount,1);
  assert.equal(result.denominator,1);
  assert.equal(result.planned,100);
  assert.equal(result.actual,100);
});

test("a task crossing the cutoff is wholly excluded from both percentages",()=>{
  const result=metrics.summarize([task("2026-12-31","مكتملة",{startDate:"2026-10-01"})],{measurementDate:"2026-12-30"});
  assert.equal(result.denominator,0);
  assert.equal(result.planned,0);
  assert.equal(result.actual,0);
});

test("all held or post-target tasks produce zero planned actual and variance",()=>{
  const result=metrics.summarize([
    task("2026-12-01","مكتملة*"),task("2026-12-31","مكتملة")
  ],{measurementDate:"2026-12-30"});
  assert.equal(result.denominator,0);
  assert.equal(result.planned,0);
  assert.equal(result.actual,0);
  const variance=result.planned?Math.round(((result.actual/result.planned)-1)*100):(result.actual?100:0);
  assert.equal(variance,0);
});

test("a completed post-cutoff task remains in source data but not actual",()=>{
  const items=[task("2026-10-20","قيد التنفيذ"),task("2026-12-31","مكتملة")];
  const before=structuredClone(items);
  const result=metrics.summarize(items,{measurementDate:"2026-12-30"});
  assert.equal(items.filter(item=>item.status==="مكتملة").length,1);
  assert.equal(result.actualCount,0);
  assert.equal(result.actual,0);
  assert.deepEqual(items,before);
});

test("missing and invalid end dates retain their former denominator and completion behavior",()=>{
  const result=metrics.summarize([task("","مكتملة"),task("not-a-date","قيد التنفيذ")],{measurementDate:"2026-11-01"});
  assert.equal(result.excludedCount,0);
  assert.equal(result.denominator,2);
  assert.equal(result.plannedCount,0);
  assert.equal(result.actualCount,1);
  assert.equal(result.actual,50);
});

test("results are identical to the former method when no task ends after cutoff",()=>{
  const items=[task("2026-10-01","مكتملة"),task("2026-11-01"),task("bad","مكتملة")];
  const result=metrics.summarize(items,{measurementDate:"2026-10-15"});
  const oldPlanned=Math.round(items.filter(item=>metrics.dateKey(item.due)&&metrics.dateKey(item.due)<="2026-10-15").length/items.length*100);
  const oldActual=Math.round(items.filter(item=>metrics.DONE_STATUSES.has(item.status)).length/items.length*100);
  assert.equal(result.planned,oldPlanned);
  assert.equal(result.actual,oldActual);
});

test("project counts equal the sum of track counts without changing task totals",()=>{
  const items=[task("2026-10-01","مكتملة"),task("2026-11-02","مكتملة"),task("2026-10-15","قيد التنفيذ",{track:"ب"})];
  const project=metrics.summarize(items,{measurementDate:"2026-11-01"});
  const tracks=["أ","ب"].map(trackId=>metrics.summarize(items,{trackId,measurementDate:"2026-11-01"}));
  for(const key of ["total","excludedCount","denominator","plannedCount","actualCount"]){
    assert.equal(project[key],tracks.reduce((sum,track)=>sum+track[key],0),key);
  }
  assert.equal(project.total,items.length);
});

test("Riyadh calendar dates include the entire cutoff day",()=>{
  assert.equal(metrics.dateKey("2026-12-30T20:59:59Z"),"2026-12-30");
  assert.equal(metrics.dateKey("2026-12-30T21:00:00Z"),"2026-12-31");
});

test("extending the project target does not make planned progress 100 percent",()=>{
  const result=metrics.summarize([
    task("2026-10-20","مكتملة"),task("2026-12-15"),task("2026-12-30")
  ],{measurementDate:"2026-10-27"});
  assert.equal(result.denominator,3);
  assert.equal(result.plannedCount,1);
  assert.equal(result.planned,33);
});

test("the existing relative variance formula and zero handling are unchanged",()=>{
  const script=fs.readFileSync(path.join(__dirname,"../public/script.js"),"utf8");
  const source=script.match(/function paCompliance\(planned, actual\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const context={};
  vm.runInNewContext(`${source};this.paCompliance=paCompliance`,context);
  assert.deepEqual({...context.paCompliance(50,25)},{actual:25,ratio:-50});
  assert.deepEqual({...context.paCompliance(0,30)},{actual:30,ratio:100});
  assert.deepEqual({...context.paCompliance(0,0)},{actual:0,ratio:0});
});
