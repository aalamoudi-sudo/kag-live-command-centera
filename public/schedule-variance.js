"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.PMCScheduleVariance=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const DAY_MS=86400000;

  function calendarDay(value){
    if(value instanceof Date && !isNaN(value)) return Date.UTC(value.getFullYear(),value.getMonth(),value.getDate())/DAY_MS;
    if(typeof value==="number" && isFinite(value)) return Math.floor(value-25569);
    const raw=String(value==null?"":value).trim();
    if(!raw) return null;
    if(/^\d+(?:\.\d+)?$/.test(raw)) return Math.floor(Number(raw)-25569);
    let m=raw.match(/^(\d{4})[-\/]([0-1]?\d)[-\/]([0-3]?\d)(?:[T\s].*)?$/);
    if(m) return validDay(+m[1],+m[2],+m[3]);
    m=raw.match(/^([0-3]?\d)[-\/]([0-1]?\d)[-\/](\d{4})$/);
    if(m) return validDay(+m[3],+m[2],+m[1]);
    const parsed=new Date(raw);
    return isNaN(parsed)?null:Date.UTC(parsed.getUTCFullYear(),parsed.getUTCMonth(),parsed.getUTCDate())/DAY_MS;
  }
  function validDay(year,month,day){
    const stamp=Date.UTC(year,month-1,day), d=new Date(stamp);
    return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day?stamp/DAY_MS:null;
  }
  function variance(approved,current){
    const baselineDay=calendarDay(approved), currentDay=calendarDay(current);
    if(baselineDay===null) return {days:null,changed:false,reason:"missing-baseline"};
    if(currentDay===null) return {days:null,changed:false,reason:"missing-current"};
    const days=currentDay-baselineDay;
    return {days,changed:days!==0,reason:null};
  }
  function analyzeTask(task){
    const start=variance(task.approvedStartDate,task.startDate);
    const end=variance(task.approvedEndDate,task.due);
    return {...task,startVariance:start,endVariance:end,hasVariance:start.changed||end.changed};
  }
  function analyzeTasks(items){ return (items||[]).filter(i=>i&&i.type==="tasks"&&i.title).map(analyzeTask); }
  function formatDays(days){ return days===null||days===undefined?"—":`${days>0?"+":""}${days} أيام`; }
  return {calendarDay,variance,analyzeTask,analyzeTasks,formatDays};
});
