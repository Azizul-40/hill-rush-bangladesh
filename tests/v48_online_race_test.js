// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node --no-warnings tests/v48_online_race_test.js <প্রজেক্ট ফোল্ডার> [স্ক্রিনশট-ফোল্ডার]
// আসল functions/api/*.js + নকল D1 (node:sqlite) লোকাল সার্ভার; দুটো আলাদা ব্রাউজার কনটেক্সট = দুই খেলোয়াড়।
const http=require('http'),fs=require('fs'),path=require('path');const { DatabaseSync }=require('node:sqlite');const { chromium }=require('playwright');
const dir=process.argv[2],shots=process.argv[3]||'/tmp';let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n);}else{fail++;console.log('FAIL',n,d===undefined?'':JSON.stringify(d));}};
(async()=>{
  const H={};for(const n of ['register','race','submit','leaderboard'])H[n]=await import('file://'+path.join(dir,'functions/api',n+'.js'));
  const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(dir,'db/schema.sql'),'utf8'));
  const mk=(a)=>({async run(){db.prepare(a.sql).run(...a.args);return{success:true};},async first(){return db.prepare(a.sql).get(...a.args)||null;},async all(){return{results:db.prepare(a.sql).all(...a.args)};}});
  const env={DB:{prepare(sql){const m=mk({sql,args:[]});return{...m,bind(...args){return mk({sql,args});}};}}};
  const srv=http.createServer(async(req,res)=>{
    const u=new URL(req.url,'http://x');
    if(u.pathname.startsWith('/api/')){
      const n=u.pathname.slice(5);const h=H[n];if(!h){res.writeHead(404);return res.end();}
      const body=await new Promise(r=>{let t='';req.on('data',c=>t+=c);req.on('end',()=>r(t));});
      const rq=new Request('http://x'+req.url,{method:req.method,body:req.method==='POST'?body:undefined});
      const out=await (req.method==='POST'?h.onRequestPost:h.onRequestGet)({request:rq,env});
      res.writeHead(out.status,{'content-type':'application/json'});return res.end(await out.text());
    }
    let f=path.join(dir,u.pathname==='/'?'index.html':u.pathname);
    fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}const ext=path.extname(f);res.writeHead(200,{'content-type':{'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.json':'application/json'}[ext]||'application/octet-stream'});res.end(d);});
  });
  await new Promise(r=>srv.listen(0,r));const base='http://127.0.0.1:'+srv.address().port;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const mkPage=async()=>{const c=await b.newContext({viewport:{width:1000,height:600}});const p=await c.newPage();p.__errs=[];p.on('pageerror',e=>p.__errs.push(String(e)));await p.goto(base+'/index.html?noshell=1');await p.waitForTimeout(500);await p.evaluate(()=>localStorage.setItem('hillrush_lang','bn'));return p;};
  const A=await mkPage(),B=await mkPage();
  // A: রুম বানায়
  await A.click('#raceBtn');await A.waitForTimeout(300);
  ok('সেটআপে অনলাইন অংশ',await A.isVisible('#v48Quick')&&await A.isVisible('#v48Create')&&await A.isVisible('#v48Join'));
  await A.screenshot({path:shots+'/v48_setup.png'});
  await A.click('#v48Create');await A.waitForTimeout(900);
  const code=await A.evaluate(()=>V47.O.code);ok('রুম বানানো, ৫ অক্ষরের কোড',/^[A-Z]{5}$/.test(code),code);
  ok('লবি দেখায়',await A.isVisible('#v48Pop .v48List'));
  {const tt=await A.textContent('#v48St');ok('একা থাকলে বটের বাটন নেই, "খুঁজছি" বার্তা',!(await A.$('#v48Bots'))&&/খুঁজছি|Searching/.test(tt),tt);}
  ok('একা থাকলে শুরু বাটন নেই',!(await A.isVisible('#v48Start')));
  // B: কোড দিয়ে যোগ
  await B.evaluate(()=>{save.selectedVehicle=3;save.custom={color:'#e53935',plate:''};});
  await B.click('#raceBtn');await B.waitForTimeout(300);
  await B.fill('#v48Code',code.toLowerCase());await B.click('#v48Join');await B.waitForTimeout(1500);
  ok('B লবিতে ঢুকেছে (২ জন)',(await B.locator('#v48Pop .v48P').count())===2);
  await A.waitForTimeout(1500);
  ok('A-র লবিতে ২ জন + হোস্ট শুরু বাটন',(await A.locator('#v48Pop .v48P').count())===2&&await A.isVisible('#v48Start'));
  await A.screenshot({path:shots+'/v48_lobby.png'});
  ok('B-র হোস্ট শুরু বাটন নেই',!(await B.isVisible('#v48Start')));
  await A.click('#v48Start');
  await A.waitForTimeout(1800);await B.waitForTimeout(500);
  const sA=await A.evaluate(()=>({on:V47.on,online:V47.online,phase:V47.phase,racers:V47.racers.map(r=>r.name),state}));
  const sB=await B.evaluate(()=>({on:V47.on,online:V47.online,phase:V47.phase,racers:V47.racers.map(r=>r.name),state}));
  ok('দুজনেরই রেস শুরু (কাউন্টডাউন), অন্যের নাম দেখা যায়',sA.on&&sB.on&&sA.phase==='count'&&sB.phase==='count'&&sA.racers.length===1&&sB.racers.length===1&&/^Guest-/.test(sA.racers[0]),[sA,sB]);
  const vb=await A.evaluate(()=>({veh:V47.racers[0].veh,col:V47.racers[0].col}));ok('অন্যের বাছা গাড়ি আর রং A-র কাছে পৌঁছায়',vb.veh===3&&vb.col==='#e53935',vb);
  await A.screenshot({path:shots+'/v48_count.png'});
  await A.waitForTimeout(4200);
  ok('GO-র পর দুজনেই চলছে',(await A.evaluate(()=>V47.phase))==='go'&&(await B.evaluate(()=>V47.phase))==='go');
  // B গ্যাস দেয়, A দাঁড়িয়ে — A দেখবে B এগোচ্ছে
  await B.evaluate(()=>{keys.gas=true;keys.right=true;});
  await A.waitForTimeout(3500);
  const seen=await A.evaluate(()=>({bx:V47.racers[0].x,tx:V47.racers[0].tx,pos:V47.pos()}));
  ok('A, B-র এগোনো দেখছে (অবস্থান সিঙ্ক)',seen.tx>200&&seen.bx>150,seen);
  ok('A (দাঁড়িয়ে) পজিশন ২',seen.pos===2,seen);
  await A.screenshot({path:shots+'/v48_race.png'});
  // B ফিনিশে পৌঁছায়
  await B.evaluate(()=>{truck.x=finishX()-5;truck.y=terrainY(truck.x)-60;truck.vx=300;});
  await B.waitForTimeout(1800);
  const rb=await B.evaluate(()=>V47.result&&({place:V47.result.place,total:V47.result.total,tro:V47.result.trophies}));
  ok('B ফিনিশ করে প্রথম, ট্রফি +৫',rb&&rb.place===1&&rb.total===2&&rb.tro===5,rb);
  await B.screenshot({path:shots+'/v48_result_B.png'});
  await A.waitForTimeout(1000);
  const aSees=await A.evaluate(()=>V47.racers[0].fin);ok('A জানে B শেষ করেছে (সময় সহ)',aSees>0,aSees);
  // A ফিনিশ
  await A.evaluate(()=>{keys.gas=false;truck.x=finishX()-5;truck.y=terrainY(truck.x)-60;truck.vx=300;});
  await A.waitForTimeout(1800);
  const ra=await A.evaluate(()=>V47.result&&({place:V47.result.place,total:V47.result.total,names:V47.result.rows.map(r=>r.name)}));
  ok('A ২য়, তালিকায় দুজনের নাম',ra&&ra.place===2&&ra.total===2&&ra.names.length===2,ra);
  await A.screenshot({path:shots+'/v48_result_A.png'});
  const selMap=await A.evaluate(()=>save.selectedMap);ok('রেসের পর নিজের ম্যাপ-নির্বাচন ফেরত',selMap===0,selMap);
  // দ্রুত ম্যাচ: দুজন নতুন, অটো-স্টার্ট (১০ সেকেন্ড)
  const C=await mkPage(),D=await mkPage();
  for(const P of [C,D]){await P.click('#raceBtn');await P.waitForTimeout(300);await P.click('#v48Quick');await P.waitForTimeout(1200);}
  ok('দ্রুত ম্যাচ: দুজন একই রুমে',(await C.evaluate(()=>V47.O.code))===(await D.evaluate(()=>V47.O.code))&&(await C.evaluate(()=>V47.O.code)).length===5);
  await C.waitForTimeout(12500);
  ok('২ জন হলে নিজে থেকেই কাউন্টডাউন শুরু',(await C.evaluate(()=>V47.on&&V47.online))&&(await D.evaluate(()=>V47.on&&V47.online)));
  // বটের ফলব্যাক: একা বসে থাকা
  const E=await mkPage();await E.click('#raceBtn');await E.waitForTimeout(300);await E.click('#v48Quick');await E.waitForTimeout(1200);
  await E.waitForTimeout(11500);
  ok('একা থাকলে রেস শুরু হয় না (বট আসে না)',!(await E.evaluate(()=>V47.on))&&await E.isVisible('#v48Pop'));
  // ত্রুটি: সার্ভার/ভুল কোড
  const F=await mkPage();await F.click('#raceBtn');await F.waitForTimeout(300);await F.fill('#v48Code','ZZZZZ');await F.click('#v48Join');await F.waitForTimeout(3000);
  ok('ভুল কোডে বার্তা দেখায়',!!(await F.textContent('#v48Err')).match(/রুম নেই|No room with this code/),await F.textContent('#v48Err'));
  for(const [n,P] of Object.entries({A,B,C,D,E,F}))ok('page error নেই '+n,P.__errs.length===0,P.__errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();srv.close();process.exit(fail?1:0);
})();
