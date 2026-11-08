// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node --no-warnings tests/v47_race_test.js <প্রজেক্ট ফোল্ডার>
const { chromium } = require('playwright');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n);}else{fail++;console.log('FAIL',n,d===undefined?'':JSON.stringify(d));}};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext({viewport:{width:1000,height:600}}).then(c=>c.newPage());const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+process.argv[2]+'/index.html?noshell=1');await p.waitForTimeout(500);
  ok('RACE বাটন আছে',await p.isVisible('#raceBtn'));
  await p.click('#raceBtn');await p.waitForTimeout(300);
  ok('সেটআপ পপআপ খোলে',await p.isVisible('#v47Pop'));
  ok('সেটআপে বট/START বাটন নেই',!(await p.$('#v47Go'))&&!(await p.$('.v47Chip[data-k="n"]')));
  await p.evaluate(()=>{V47.n=6;});await p.waitForTimeout(150);
  ok('জনসংখ্যা ৬ বাছা হয়',(await p.evaluate(()=>V47.n))===6);
  await p.evaluate(()=>{document.getElementById('v47Pop').classList.add('hidden');V47.start();});await p.waitForTimeout(300);
  const r=await p.evaluate(()=>({on:V47.on,phase:V47.phase,bots:V47.racers.length,state}));
  ok('রেস শুরু: ৫ বট, কাউন্টডাউন',r.on&&r.bots===5&&r.phase==='count'&&r.state==='play',r);
  // কাউন্টডাউনে গাড়ি নড়ে না
  const x0=await p.evaluate(()=>{keys.gas=true;keys.right=true;return truck.x;});await p.waitForTimeout(800);
  ok('কাউন্টডাউনে গাড়ি দাঁড়িয়ে',Math.abs((await p.evaluate(()=>truck.x))-x0)<2);
  await p.screenshot({path:process.argv[3]||'/tmp/v47_count.png'});
  await p.waitForTimeout(3000);
  ok('GO-র পর রেস চলে',(await p.evaluate(()=>V47.phase))==='go');
  await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>({x:truck.x,bots:V47.racers.map(r=>Math.round(r.x)),pos:V47.pos()}));
  ok('বটরা এগোয়, পজিশন ১..৬',m.bots.every(x=>x>400)&&m.pos>=1&&m.pos<=6,m);
  await p.screenshot({path:(process.argv[3]||'/tmp/v47_count.png').replace('.png','_go.png')});
  // জিতলে/শেষে ফলাফল: খেলোয়াড়কে ফিনিশে বসিয়ে দেওয়া
  const res=await p.evaluate(async()=>{ V47.racers.forEach(r=>{r.x=finishX()-3000;}); truck.x=finishX()-5;truck.y=terrainY(truck.x)-60;truck.vx=300; await new Promise(r=>setTimeout(r,1500)); return {over:V47.over,res:!!V47.result,place:V47.result&&V47.result.place,rows:V47.result&&V47.result.rows.length,tro:V47.result&&V47.result.trophies}; });
  ok('ফিনিশে ফলাফল আসে (৬ সারি)',res.res&&res.rows===6,res);
  ok('১ম হলে ট্রফি +৫',res.place===1&&res.tro===5,res);
  ok('ফলাফল পপআপ দেখায়',await p.isVisible('#v47Pop .v47Tab'));
  await p.screenshot({path:(process.argv[3]||'/tmp/v47_count.png').replace('.png','_res.png')});
  const sv=await p.evaluate(()=>({rp:save.raceRP,wins:save.raceWins,tro:save.trophies}));
  ok('RP, জয়, ট্রফি জমা',sv.rp===25&&sv.wins===1&&sv.tro>=5,sv);
  // মরলে বাদ নয়: চেকপয়েন্ট/শুরু থেকে আবার চালু, সময় থামে না
  await p.click('#v47Again');await p.waitForTimeout(200);await p.evaluate(()=>{document.getElementById('v47Pop').classList.add('hidden');V47.start();});await p.waitForTimeout(4600);
  await p.evaluate(()=>{crash("test");});await p.waitForTimeout(400);
  ok('ক্র্যাশের পর রেস বাদ হয় না',await p.evaluate(()=>!V47.over&&V47.on));
  await p.waitForTimeout(1500);
  const rs=await p.evaluate(()=>({state,x:Math.round(truck.x),deaths:V47.deaths}));ok('১ সেকেন্ড পর আবার চালু (শুরু থেকে), মৃত্যু গোনা হয়',rs.state==='play'&&rs.x<=260&&rs.deaths===1,rs);
  await p.evaluate(()=>{v15Checkpoint={x:2500,n:2};crash("test2");});await p.waitForTimeout(1600);
  const rs2=await p.evaluate(()=>({state,x:Math.round(truck.x)}));ok('চেকপয়েন্ট থাকলে সেখান থেকে চালু',rs2.state==='play'&&Math.abs(rs2.x-2500)<30,rs2);
  const lt=await p.evaluate(()=>({fin:finishX(),on:V47.longTrack}));ok('রেসের ট্র্যাক লম্বা',lt.on&&lt.fin>6000,lt);
  const bd=await p.evaluate(()=>V47.board().length);ok('পজিশন তালিকায় সবাই (৬ জন)',bd===6,bd);
  const vv=await p.evaluate(()=>V47.racers.every(r=>Number.isInteger(r.veh)&&r.col));ok('সব বটের গাড়ি/রং আছে',vv);
  await p.evaluate(()=>{V47.finish(true);});await p.waitForTimeout(500);
  const d=await p.evaluate(()=>V47.result);ok('বাদ (DNF) ফলাফল ঠিক আছে (শুধু বেরিয়ে গেলে)',d&&d.dnf&&d.place===d.total&&(await p.evaluate(()=>save.raceRP))>=0,d&&d.place);
  await p.click('#v47Menu');await p.waitForTimeout(300);
  ok('মেনুতে ফেরা, রেস বন্ধ',!(await p.evaluate(()=>V47.on)));
  ok('page error নেই',errs.length===0,errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();process.exit(fail?1:0);
})();
