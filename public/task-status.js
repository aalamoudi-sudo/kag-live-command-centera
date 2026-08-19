(function(root, factory){
  const api = factory();
  if(typeof module === "object" && module.exports) module.exports = api;
  else root.PMCTaskStatus = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
  "use strict";

  const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
  const DONE_STATUSES = ["مكتملة","معتمدة","Completed","Cleared","مغلقة"];
  const MANUAL_OVERDUE_STATUSES = ["متأخرة","متاخرة","متأخر","Overdue"];
  const IN_PROGRESS_STATUSES = ["قيد التنفيذ","In Progress"];

  function parseDateParts(value){
    const s = String(value == null ? "" : value).trim();
    let m = s.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)(?:[T\s].*)?$/);
    if(m) return {year:+m[1], month:+m[2], day:+m[3]};
    m = s.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})(?:\s.*)?$/);
    if(m) return {year:+m[3], month:+m[2], day:+m[1]};
    return null;
  }

  function parseTimeParts(value){
    const s = String(value == null ? "" : value).trim()
      .replace(/ص/gi,"AM").replace(/م/gi,"PM").replace(/\s+/g," ");
    if(!s) return null;
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
    if(!m) return null;
    let hour=+m[1], minute=+m[2], second=+(m[3]||0);
    const meridiem=(m[4]||"").toUpperCase();
    if(minute>59 || second>59 || (meridiem ? hour<1 || hour>12 : hour>23)) return null;
    if(meridiem){ if(hour===12) hour=0; if(meridiem==="PM") hour+=12; }
    return {hour, minute, second};
  }

  function taskDueTimestamp(task){
    const date=parseDateParts(task && task.due);
    if(!date) return null;
    let time=parseTimeParts(task && task.dueTime);
    // Existing date-only records remain date-granular: they become late only after that Riyadh day ends.
    if(!time && String(task && task.dueTime || "").trim()) return null;
    if(!time) time={hour:23,minute:59,second:59};
    const timestamp=Date.UTC(date.year,date.month-1,date.day,time.hour,time.minute,time.second)-RIYADH_OFFSET_MS;
    const check=new Date(timestamp+RIYADH_OFFSET_MS);
    if(check.getUTCFullYear()!==date.year || check.getUTCMonth()!==date.month-1 || check.getUTCDate()!==date.day) return null;
    return timestamp;
  }

  function isTaskOverdue(task, now){
    const status=String(task && task.status || "").trim();
    if(DONE_STATUSES.includes(status)) return false;
    if(MANUAL_OVERDUE_STATUSES.includes(status)) return true;
    if(!IN_PROGRESS_STATUSES.includes(status)) return false;
    const due=taskDueTimestamp(task);
    const current=now instanceof Date ? now.getTime() : (typeof now==="number" ? now : Date.now());
    return due !== null && Number.isFinite(current) && current > due;
  }

  function getTaskDisplayStatus(task, now){
    const status=String(task && task.status || "").trim();
    if(DONE_STATUSES.includes(status) || MANUAL_OVERDUE_STATUSES.includes(status)) return status;
    return IN_PROGRESS_STATUSES.includes(status) && isTaskOverdue(task,now) ? "قيد التنفيذ - متأخرة" : status;
  }

  return {isTaskOverdue,getTaskDisplayStatus,taskDueTimestamp,DONE_STATUSES,MANUAL_OVERDUE_STATUSES,IN_PROGRESS_STATUSES};
});
