const test=require("node:test");
const assert=require("node:assert/strict");
const metrics=require("../public/pmc-metrics");

const task=(approvedEndDate,status="قيد التنفيذ",extra={})=>({type:"tasks",track:"أ",approvedEndDate,status,...extra});

test("includes approved ends before and on the inclusive November 1 cutoff",()=>{
  const result=metrics.summarize([task("2026-10-31"),task("2026-11-01")],{measurementDate:"2026-11-01"});
  assert.equal(result.denominator,2);
  assert.equal(result.planned,100);
});

test("excludes a task wholly after cutoff and a crossing task ending after cutoff",()=>{
  const after=task("2026-11-02","مكتملة");
  const crossing=task("2026-11-10","مكتملة",{approvedStartDate:"2026-10-20"});
  const result=metrics.summarize([task("2026-11-01"),after,crossing],{measurementDate:"2026-11-20"});
  assert.equal(result.denominator,1);
  assert.deepEqual(result.excluded,[after,crossing]);
});

test("uses approved end so a delayed current end remains eligible",()=>{
  const delayed=task("2026-10-25","قيد التنفيذ",{due:"2026-12-01"});
  const result=metrics.summarize([delayed],{measurementDate:"2026-11-20"});
  assert.equal(result.denominator,1);
  assert.equal(result.planned,100);
  assert.equal(result.actual,0);
});

test("freezes plan after cutoff while later completion updates actual",()=>{
  const items=[task("2026-10-20","قيد التنفيذ"),task("2026-11-01","قيد التنفيذ")];
  const atCutoff=metrics.summarize(items,{measurementDate:"2026-11-01"});
  items[0].status="مكتملة";
  const after=metrics.summarize(items,{measurementDate:"2027-01-01"});
  assert.equal(atCutoff.planned,after.planned);
  assert.equal(atCutoff.actual,0);
  assert.equal(after.actual,50);
});

test("returns unavailable percentages for a track with no eligible work",()=>{
  const result=metrics.summarize([task("2026-11-02")],{trackId:"أ",measurementDate:"2026-11-01"});
  assert.equal(result.denominator,0);
  assert.equal(result.planned,null);
  assert.equal(result.actual,null);
});

test("project aggregation uses eligible task counts and matches track totals",()=>{
  const items=[task("2026-10-01","مكتملة"),task("2026-10-01","قيد التنفيذ"),task("2026-10-01","مكتملة",{track:"ب"}),task("2026-12-01","مكتملة",{track:"ب"})];
  const project=metrics.summarize(items,{measurementDate:"2026-11-01"});
  const a=metrics.summarize(items,{trackId:"أ",measurementDate:"2026-11-01"});
  const b=metrics.summarize(items,{trackId:"ب",measurementDate:"2026-11-01"});
  assert.equal(project.denominator,a.denominator+b.denominator);
  assert.equal(project.actual,67);
});

test("quarantines missing and invalid approved ends without falling back to due",()=>{
  const missing=task("","مكتملة",{due:"2026-10-01"});
  const invalid=task("2026-02-30","مكتملة",{due:"2026-10-01"});
  const result=metrics.summarize([missing,invalid],{measurementDate:"2026-11-01"});
  assert.equal(result.invalid.length,2);
  assert.equal(result.denominator,0);
  assert.equal(result.actual,null);
});
