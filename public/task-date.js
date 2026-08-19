"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  if(root) root.PMCTaskDates=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  function formatTaskStartDate(value){
    const raw=String(value==null?"":value).trim();
    if(!raw) return "—";
    let match=raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if(match) return `${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}-${match[3]}`;
    match=raw.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if(match) return `${match[3].padStart(2,"0")}-${match[2].padStart(2,"0")}-${match[1]}`;
    return raw;
  }
  return {formatTaskStartDate};
});
