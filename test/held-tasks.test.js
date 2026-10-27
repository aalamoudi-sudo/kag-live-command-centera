'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {isTaskHeld,isTaskOverdue,getTaskDisplayStatus}=require('../public/task-status');
const metrics=require('../public/pmc-planned-actual');
const {generateReport}=require('../report-generator');
const {generatePptx}=require('../pptx-generator');
const JSZip=require('jszip');
const task=(extra={})=>({type:'tasks',track:'أ',title:'Task',status:'مكتملة',due:'2026-10-01',...extra});

test('stars anywhere in task title or status hold tasks without mutating sheet data',()=>{
  for(const extra of [{title:'*Task'},{title:'Ta*sk'},{title:'Task*'},{status:'مكتملة *'},{status:'*قيد التنفيذ'}]){
    const t=task(extra),before=structuredClone(t);
    assert.equal(isTaskHeld(t),true);
    assert.equal(getTaskDisplayStatus(t),'معلقة');
    assert.equal(isTaskOverdue(t,Date.parse('2026-11-01')),false);
    assert.deepEqual(t,before);
  }
  assert.equal(isTaskHeld(task({type:'risks',title:'Risk*'})),false);
});

test('held tasks never affect completion, planned, active or overdue counts',()=>{
  const items=[task(),task({title:'Held completed*'}),task({title:'Held active*',status:'قيد التنفيذ'}),task({status:'متأخرة*'}),task({title:'Active',status:'قيد التنفيذ'})];
  const m=metrics.summarize(items,{measurementDate:'2026-11-01'});
  assert.equal(m.denominator,2);assert.equal(m.actualCount,1);assert.equal(m.plannedCount,2);
  assert.equal(m.actual,50);assert.equal(m.planned,100);
  const c=metrics.trackCounters(items,'أ');
  assert.equal(c.tasks,5);assert.equal(c.held,3);assert.equal(c.done,1);assert.equal(c.active,1);
  assert.equal(c.late,1);assert.equal(c.progress,50);
});

test('all-held and empty tracks produce zero, with no stale completion',()=>{
  for(const items of [[],[task({title:'Held*'})]]){
    const c=metrics.trackCounters(items,'أ');
    assert.equal(c.progress,0);assert.equal(c.planned,0);assert.equal(c.done,0);
    assert.equal(metrics.summarize(items).denominator,0);
  }
});

test('removing stars restores original status and leaves cutoff and risk records intact',()=>{
  const held=task({title:'Task*'}),risk=task({type:'risks',title:'Risk*',status:'قيد التنفيذ'});
  const items=[held,task({due:'2026-11-01'}),task({due:'2026-11-02'}),risk];
  assert.equal(metrics.summarize(items).denominator,1);
  held.title='Task';
  assert.equal(getTaskDisplayStatus(held),'مكتملة');
  const m=metrics.summarize(items,{measurementDate:'2026-11-01'});
  assert.equal(m.denominator,2);assert.equal(m.actualCount,2);assert.equal(m.excludedCount,1);
  assert.equal(risk.status,'قيد التنفيذ');
});

test('HTML and PowerPoint reports retain held tasks and compute progress from eligible tasks',async()=>{
  const state={project:{openingDate:'2026-11-01'},tracks:[{id:'أ',name:'Test',progress:99}],items:[task({title:'HELD_MARKER*'}),task({title:'ACTIVE_MARKER',status:'قيد التنفيذ'}),task({title:'EXCLUDED_MARKER',due:'2026-11-02'}),task({type:'risks',title:'RISK_MARKER*',status:'تحت المتابعة'})]};
  for(const type of ['comprehensive','أ']){
    const html=(await generateReport(type,state)).toString();
    assert(html.includes('HELD_MARKER*'));assert(html.includes('معلقة'));assert(html.includes('RISK_MARKER*'));
    assert(!html.includes('99%'));
    const zip=await JSZip.loadAsync(await generatePptx(type,state));
    const slides=await Promise.all(Object.values(zip.files).filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f.name)).map(f=>f.async('string')));
    const xml=slides.join('');assert(xml.includes('HELD_MARKER*'));assert(xml.includes('معلقة'));assert(xml.includes('RISK_MARKER*'));assert(!xml.includes('99%'));
  }
});
