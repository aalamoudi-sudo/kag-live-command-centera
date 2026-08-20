"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.PMCTaskDates=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function isCalendarDate(day,month,year){
    const daysInMonth=[31,(year%4===0&&year%100!==0)||year%400===0?29:28,31,30,31,30,31,31,30,31,30,31];
    return month>=1&&month<=12&&day>=1&&day<=daysInMonth[month-1];
  }
  function formatTaskDate(value){
    const raw=String(value==null?"":value).trim();
    if(!raw) return "—";
    // Read date-only components directly: Date/UTC conversion can shift the day.
    let match=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if(match&&isCalendarDate(Number(match[3]),Number(match[2]),Number(match[1]))) return `${match[3].padStart(2,"0")}-${match[2].padStart(2,"0")}-${match[1]}`;
    match=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if(match&&isCalendarDate(Number(match[1]),Number(match[2]),Number(match[3]))) return `${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}-${match[3]}`;
    match=raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if(match&&isCalendarDate(Number(match[1]),Number(match[2]),Number(match[3]))) return `${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}-${match[3]}`;
    return raw;
  }
  const formatTaskStartDate=formatTaskDate;
  return {formatTaskDate,formatTaskStartDate};
});
