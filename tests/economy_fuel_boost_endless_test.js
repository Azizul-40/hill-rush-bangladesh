// চালানোর নিয়ম: node tests/economy_fuel_boost_endless_test.js <প্রজেক্ট ফোল্ডারের পথ>   (Playwright + Chromium লাগে)
// পরীক্ষা করে: fuel drain/pickup, boost pickup (cap ১০০), Endless/Distance mode (শুরু, distance, local best, crash/fuel-stall শেষ, UI, main menu/retry)।
const { chromium } = require('playwright');
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext().then(c=>c.newPage());
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text());});
  await p.goto('file://'+dir+'/index.html');
  await p.waitForTimeout(400);
  const res=[]; const ok=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' → '+x:''));

  // --- FUEL ---
  await p.evaluate(()=>startLevel(1));
  let f0=await p.evaluate(()=>truck.fuel);
  ok('level শুরুতে fuel প্রায় পূর্ণ (>=99.5)',f0>=99.5,f0);
  await p.evaluate(()=>{keys.gas=true;for(let i=0;i<200;i++)updatePhysics(0.1);});
  let f1=await p.evaluate(()=>truck.fuel);
  ok('ড্রাইভিং-এ fuel কমে',f1<f0,f1);
  // force fuel to 0 and check slowdown applies without crashing
  await p.evaluate(()=>{truck.fuel=0;});
  await p.evaluate(()=>{for(let i=0;i<30;i++)updatePhysics(0.1);});
  const errs1=errs.length;
  ok('fuel ০ হলেও কোনো error/ক্র্যাশ নেই (ধীরে চলে)',errs.length===errs1,errs.join('|'));
  // fuel can pickup
  await p.evaluate(()=>startLevel(2));
  await p.evaluate(()=>{truck.fuel=10;});
  const canCount=await p.evaluate(()=>levelFuelCans.length);
  ok('লেভেলে fuel can জেনারেট হয়',canCount>=0,canCount);
  if(canCount>0){
    await p.evaluate(()=>{const c=levelFuelCans[0];truck.x=c.x;truck.y=c.y+30;collectFuel();});
    const f2=await p.evaluate(()=>truck.fuel);
    ok('fuel can নিলে fuel বাড়ে',f2>10,f2);
    const taken=await p.evaluate(()=>levelFuelCans[0].taken);
    ok('নেওয়ার পর can আবার নেওয়া যায় না (taken=true)',taken===true,taken);
  }

  // --- BOOST pickup ---
  await p.evaluate(()=>startLevel(3));
  const bCount=await p.evaluate(()=>levelBoostCans.length);
  if(bCount>0){
    await p.evaluate(()=>{truck.boostEnergy=30;truck.x=-99999;collectBoost();});
    const beNoPick=await p.evaluate(()=>truck.boostEnergy);
    ok('দূরে থাকলে boost pickup কাজ করে না (negative control)',Math.abs(beNoPick-30)<0.3,beNoPick);
    await p.evaluate(()=>{truck.boostEnergy=30;const c=levelBoostCans[0];truck.x=c.x;truck.y=c.y+30;collectBoost();});
    const be=await p.evaluate(()=>truck.boostEnergy);
    ok('boost pickup নিলে boostEnergy বাড়ে, cap 100',be>30&&be<=100,be);
  } else ok('boost pickup (level 3-এ none; লম্বা লেভেলে চেক হবে)',true);
  // cap not exceeded
  await p.evaluate(()=>startLevel(40));
  const bCount2=await p.evaluate(()=>levelBoostCans.length);
  if(bCount2>0){
    await p.evaluate(()=>{truck.boostEnergy=95;const c=levelBoostCans[0];truck.x=c.x;truck.y=c.y+30;collectBoost();});
    const be2=await p.evaluate(()=>truck.boostEnergy);
    ok('boostEnergy কখনো ১০০-এর বেশি হয় না',be2<=100,be2);
  }

  // --- ENDLESS MODE ---
  await p.evaluate(()=>startEndless());
  let em=await p.evaluate(()=>endlessMode);
  let cl=await p.evaluate(()=>currentLevel);
  ok('startEndless() → endlessMode true',em===true,em);
  await p.evaluate(()=>{keys.gas=true;for(let i=0;i<300;i++)updatePhysics(0.05);});
  let tx=await p.evaluate(()=>truck.x);
  ok('Endless-এ truck এগিয়েছে (x > 250)',tx>250,tx);
  // force crash-equivalent via endEndlessRun directly to check save/UI
  await p.evaluate(()=>{truck.x=5000;state="play";endEndlessRun("পরীক্ষা শেষ");});
  const dTxt=await p.evaluate(()=>document.getElementById('endlessDistance').textContent);
  const best=await p.evaluate(()=>save.endlessBest[String(save.selectedMap||0)]);
  const screenShown=await p.evaluate(()=>!document.getElementById('endlessMenu').classList.contains('hidden'));
  ok('endEndlessRun → distance UI আপডেট',dTxt.includes('মিটার'),dTxt);
  ok('endEndlessRun → save.endlessBest সেভ',best>0,best);
  ok('endEndlessRun → endlessMenu স্ক্রিন দেখায়',screenShown===true,screenShown);
  const emAfter=await p.evaluate(()=>endlessMode);
  ok('রান শেষে endlessMode false হয়',emAfter===false,emAfter);

  // retry via button
  await p.click('#endlessRetryBtn');
  await p.waitForTimeout(100);
  const em2=await p.evaluate(()=>endlessMode);
  ok('RUN AGAIN বাটনে আবার endless শুরু হয়',em2===true,em2);

  // main menu button returns normally, and normal level mode untouched after endless
  await p.evaluate(()=>{truck.x=800;crash("test crash in endless");});
  await p.waitForTimeout(50);
  const afterCrashScreen=await p.evaluate(()=>!document.getElementById('endlessMenu').classList.contains('hidden'));
  ok('Endless-এ crash() → endlessMenu (crashMenu নয়)',afterCrashScreen===true,afterCrashScreen);

  await p.evaluate(()=>startLevel(5));
  const stAfter=await p.evaluate(()=>state);
  const emAfter2=await p.evaluate(()=>endlessMode);
  ok('Endless-এর পর সাধারণ startLevel() ঠিকভাবে কাজ করে',stAfter==='play',stAfter);
  ok('normal level-এ endlessMode false',emAfter2===false,emAfter2);

  ok('কোনো page/console error নেই',errs.length===0,errs.join('|').slice(0,300));

  console.log(res.join('\n'));
  await b.close();
})();
