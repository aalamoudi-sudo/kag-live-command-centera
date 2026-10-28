"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("project target and all runtime countdown fallbacks use December 30, 2026",()=>{
  for(const file of ["script.js","public/script.js","server.js","public/server.js","pptx-generator.js"]){
    const source=read(file);
    assert.match(source,/2026-12-30/,`${file} must contain the current target`);
    assert.doesNotMatch(source,/2026-(?:09-27|11-01)/,`${file} contains an obsolete target`);
  }
});

test("planned and actual cutoff matches the inclusive project target",()=>{
  assert.match(read("public/pmc-planned-actual.js"),/CUTOFF_DATE="2026-12-30"/);
});
