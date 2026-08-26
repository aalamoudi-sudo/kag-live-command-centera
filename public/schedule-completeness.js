"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.PMCScheduleCompleteness=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const EMPTY_PLACEHOLDERS=new Set(["-","—","–"]);

  function isValidScheduleDate(value){
    if(value instanceof Date) return !Number.isNaN(value.getTime());
    if(typeof value!=="string"&&typeof value!=="number") return false;
    const raw=String(value).trim();
    if(!raw||EMPTY_PLACEHOLDERS.has(raw)) return false;
    if(/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw)>0;
    const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    const dmy=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    const parts=iso?[Number(iso[1]),Number(iso[2]),Number(iso[3])]:dmy?[Number(dmy[3]),Number(dmy[2]),Number(dmy[1])]:null;
    if(!parts) return !Number.isNaN(Date.parse(raw));
    const [year,month,day]=parts;
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
  }

  function inspectTask(task){
    const missingStart=!isValidScheduleDate(task&&task.startDate);
    const missingEnd=!isValidScheduleDate(task&&task.due);
    return {missingStart,missingEnd,incomplete:missingStart||missingEnd};
  }

  function summarize(tasks){
    const inspected=(tasks||[]).map(task=>({task,...inspectTask(task)}));
    const incompleteTasks=inspected.filter(item=>item.incomplete);
    return {total:inspected.length,complete:inspected.length-incompleteTasks.length,incomplete:incompleteTasks.length,incompleteTasks};
  }

  return {isValidScheduleDate,inspectTask,summarize};
});
