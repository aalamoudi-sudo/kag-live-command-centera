(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.PMCMetrics=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  // The single, approved PMC reporting boundary. Date-only comparisons make the
  // whole project-local calendar day inclusive and avoid host timezone drift.
  const SCOPE_END_DATE="2026-11-01";
  const PROJECT_TIME_ZONE="Asia/Riyadh";
  const DONE_STATUSES=new Set(["مكتملة","معتمدة","Completed","Cleared"]);

  function dateKey(value){
    const text=String(value==null?"":value).trim();
    let match=text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if(match) return validKey(+match[1],+match[2],+match[3]);
    match=text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if(match) return validKey(+match[3],+match[2],+match[1]);
    return null;
  }
  function validKey(year,month,day){
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day) return null;
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }
  function projectDateKey(now){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:PROJECT_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now||new Date());
    const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }
  function summarize(items,options){
    const opts=options||{};
    const measurement=dateKey(opts.measurementDate)||projectDateKey(opts.now);
    const effectiveMeasurement=measurement<SCOPE_END_DATE?measurement:SCOPE_END_DATE;
    const tasks=(items||[]).filter(item=>item&&item.type==="tasks"&&(!opts.trackId||item.track===opts.trackId));
    const invalid=[];
    const eligible=[];
    const excluded=[];
    tasks.forEach(item=>{
      const approvedEnd=dateKey(item.approvedEndDate);
      if(!approvedEnd){ invalid.push(item); return; }
      if(approvedEnd<=SCOPE_END_DATE) eligible.push({item,approvedEnd});
      else excluded.push(item);
    });
    const denominator=eligible.length;
    const plannedCount=eligible.filter(entry=>entry.approvedEnd<=effectiveMeasurement).length;
    const actualCount=eligible.filter(entry=>DONE_STATUSES.has(String(entry.item.status||"").trim())).length;
    return {
      scopeEndDate:SCOPE_END_DATE, measurementDate:effectiveMeasurement,
      denominator, plannedCount, actualCount,
      planned:denominator?Math.round(plannedCount/denominator*100):null,
      actual:denominator?Math.round(actualCount/denominator*100):null,
      invalid, excluded
    };
  }
  return {SCOPE_END_DATE,PROJECT_TIME_ZONE,DONE_STATUSES,dateKey,projectDateKey,summarize};
});
