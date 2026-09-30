(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.PMCPlannedActual=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const CUTOFF_DATE="2026-11-01";
  const PROJECT_TIME_ZONE="Asia/Riyadh";
  const DONE_STATUSES=new Set(["مكتملة","معتمدة","Completed","Cleared"]);

  function validDateKey(year,month,day){
    const date=new Date(Date.UTC(year,month-1,day));
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day) return null;
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function dateKey(value){
    const text=String(value==null?"":value).trim();
    if(!text) return null;
    let match=text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
    if(match) return validDateKey(+match[1],+match[2],+match[3]);
    match=text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if(match) return validDateKey(+match[3],+match[2],+match[1]);
    const date=new Date(text);
    if(Number.isNaN(date.getTime())) return null;
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:PROJECT_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
    const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  function measurementDateKey(now){
    return dateKey(now||new Date());
  }

  // `due` is deliberately the same end-date source used by the existing planned calculation.
  // Missing and invalid dates remain eligible, preserving their existing denominator/status behavior.
  function summarize(items,options){
    const opts=options||{};
    const measurement=dateKey(opts.measurementDate)||measurementDateKey(opts.now);
    const tasks=(items||[]).filter(item=>item&&item.type==="tasks"&&(!opts.trackId||item.track===opts.trackId));
    const eligible=[];
    const excluded=[];
    tasks.forEach(item=>{
      const endDate=dateKey(item.due);
      if(endDate&&endDate>CUTOFF_DATE) excluded.push(item);
      else eligible.push({item,endDate});
    });
    const denominator=eligible.length;
    const plannedCount=eligible.filter(entry=>entry.endDate&&entry.endDate<=measurement).length;
    const actualCount=eligible.filter(entry=>DONE_STATUSES.has(String(entry.item.status||"").trim())).length;
    return {
      endDateField:"due",cutoffDate:CUTOFF_DATE,measurementDate:measurement,
      total:tasks.length,excludedCount:excluded.length,denominator,plannedCount,actualCount,
      planned:denominator?Math.round(plannedCount/denominator*100):0,
      actual:denominator?Math.round(actualCount/denominator*100):0,
      eligible:eligible.map(entry=>entry.item),excluded
    };
  }

  return {CUTOFF_DATE,PROJECT_TIME_ZONE,DONE_STATUSES,dateKey,measurementDateKey,summarize};
});
