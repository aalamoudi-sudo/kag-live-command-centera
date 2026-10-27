'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {mkdtemp,writeFile,rm}=require('node:fs/promises');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {randomBytes}=require('node:crypto');
const {setTimeout:delay}=require('node:timers/promises');

test('server refresh restores unstarred tasks and report routes work with environment-only credentials',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'kag-held-'));
  const csv=path.join(dir,'tasks.csv');
  const header='track,type,title,owner,status,due\n';
  await writeFile(csv,header+'أ,tasks,SERVER_HELD*,PMC,مكتملة,2026-10-01\nأ,risks,RISK_ROW*,PMC,تحت المتابعة,2026-10-01\n');
  const password=randomBytes(24).toString('hex');
  const child=spawn(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:'0',LOCAL_CSV:csv,ADMIN_PASSWORD:password,VIEWER_PASSWORD:password,SHEET_REFRESH_MS:'3600000'},stdio:['ignore','pipe','pipe']});
  let logs='';child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);
  t.after(async()=>{child.kill();await rm(dir,{recursive:true,force:true});});
  // PORT=0 lets the OS choose a free port for this test process.
  let port;
  for(let i=0;i<100&&!port;i++){
    await delay(50);
    if(child.exitCode!==null)throw Error('Server exited before readiness');
    port=logs.match(/http:\/\/localhost:(\d+)/)?.[1];
  }
  assert(port,'server must listen');const base=`http://127.0.0.1:${port}`;
  assert.equal((await fetch(base+'/api/health')).status,200);
  assert.equal((await fetch(base+'/api/state')).status,401);
  const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:process.env.ADMIN_USERNAME||'MAYADEEN',password})});
  assert.equal(login.status,200);const headers={cookie:login.headers.get('set-cookie').split(';')[0]};
  let data=await(await fetch(base+'/api/state',{headers})).json();
  assert.equal(data.sync.ok,true);assert.equal(data.state.tracks[0].held,1);assert.equal(data.state.tracks[0].progress,0);assert.equal(data.state.tracks[0].done,0);
  assert.equal(data.state.items[0].status,'مكتملة');assert.equal(data.state.tracks[0].risk,1);
  assert.equal((await fetch(base+'/server.js',{headers})).status,404);
  for(const format of ['html','pptx']){
    const res=await fetch(base+'/api/report',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({format})});
    assert.equal(res.status,200);const b=Buffer.from(await res.arrayBuffer());
    if(format==='pptx')assert.equal(b.subarray(0,2).toString(),'PK');else {assert(b.toString().includes('SERVER_HELD*'));assert(b.toString().includes('معلقة'));}
  }
  await writeFile(csv,header+'أ,tasks,SERVER_HELD,PMC,مكتملة,2026-10-01\nأ,risks,RISK_ROW*,PMC,تحت المتابعة,2026-10-01\n');
  assert.equal((await fetch(base+'/api/refresh',{method:'POST',headers})).status,200);
  data=await(await fetch(base+'/api/state',{headers})).json();
  assert.equal(data.state.tracks[0].held,0);assert.equal(data.state.tracks[0].done,1);assert.equal(data.state.tracks[0].progress,100);
  assert(!logs.includes(password));
});

for(const missing of ['ADMIN_PASSWORD','VIEWER_PASSWORD']){
  test(`server refuses startup when ${missing} is missing without logging secrets`,()=>{
    const {spawnSync}=require('node:child_process');
    const password=randomBytes(24).toString('hex');
    const childEnv={...process.env,ADMIN_PASSWORD:password,VIEWER_PASSWORD:password};
    delete childEnv[missing];
    const result=spawnSync(process.execPath,['server.js'],{cwd:path.join(__dirname,'..'),env:childEnv,encoding:'utf8',timeout:5000});
    assert.notEqual(result.status,0);assert(result.stderr.includes(`${missing} must be configured`));
    assert(!result.stdout.includes(password));assert(!result.stderr.includes(password));
  });
}
