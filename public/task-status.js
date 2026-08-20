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
  const EARLY_COMPLETION_STATUSES = ["مكتملة","Completed"];

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

  function dateKey(value){
    const date=parseDateParts(value);
    if(!date) return null;
    const key=Date.UTC(date.year,date.month-1,date.day);
    const check=new Date(key);
    if(check.getUTCFullYear()!==date.year || check.getUTCMonth()!==date.month-1 || check.getUTCDate()!==date.day) return null;
    return key;
  }

  function riyadhTodayKey(now){
    const current=now instanceof Date ? now.getTime() : (typeof now==="number" ? now : Date.now());
    if(!Number.isFinite(current)) return null;
    const inRiyadh=new Date(current+RIYADH_OFFSET_MS);
    return Date.UTC(inRiyadh.getUTCFullYear(),inRiyadh.getUTCMonth(),inRiyadh.getUTCDate());
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
    // Display-only enrichment: the original task and its sheet-backed status are never changed.
    if(DONE_STATUSES.includes(status)){
      const completed=dateKey(task && task.actualCompletionDate);
      const plannedEnd=dateKey(task && task.due);
      if(EARLY_COMPLETION_STATUSES.includes(status) && completed!==null && plannedEnd!==null && completed<plannedEnd){
        return status==="Completed" ? "Completed (Early)" : "مكتملة (منجزة مبكرًا)";
      }
      return status;
    }
    if(MANUAL_OVERDUE_STATUSES.includes(status)) return status;
    if(!IN_PROGRESS_STATUSES.includes(status)) return status;
    if(isTaskOverdue(task,now)) return status==="In Progress" ? "In Progress - Overdue" : "قيد التنفيذ - متأخرة";
    const start=dateKey(task && task.startDate);
    const today=riyadhTodayKey(now);
    if(start!==null && today!==null && today<start){
      return status==="In Progress" ? "In Progress (Ahead of Schedule)" : "قيد التنفيذ (متقدم عن المسار)";
    }
    return status;
  }

  return {isTaskOverdue,getTaskDisplayStatus,taskDueTimestamp,DONE_STATUSES,MANUAL_OVERDUE_STATUSES,IN_PROGRESS_STATUSES};
});
