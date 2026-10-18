// চালানোর নিয়ম: node tests/save_test.js <প্রজেক্ট ফোল্ডারের পথ>   (Playwright + Chromium লাগে)
const { chromium } = require('playwright');
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const ctx=await b.newContext({viewport:{width:1280,height:720}});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const url='file://'+dir+'/index.html';
  const K='hillRushFinalSaveV1';
  const res=[];
  const ok=(n,c,x)=>res.push((c?'PASS ':'FAIL ')+n+(x!==undefined?' → '+x:''));
  // 1: old save without lastLevel, unlocked 7
  await p.goto(url); await p.evaluate(([K])=>localStorage.setItem(K,JSON.stringify({coins:620,unlocked:7,selectedVehicle:0,ownedVehicles:[0],upgrades:{},best:{},collected:{},completed:{},dailyClaimed:false,dayKey:"",coinPackClaims:0})),[K]);
  await p.reload(); await p.waitForTimeout(300);
  let cl=await p.evaluate(()=>currentLevel); ok('পুরনো save (unlocked 7) → রিফ্রেশে level 7',cl===7,cl);
  let cn=await p.evaluate(()=>coins); ok('coins অক্ষত 620',cn===620,cn);
  // 2: play level 3, refresh
  await p.evaluate(()=>startLevel(3)); await p.waitForTimeout(200);
  await p.reload(); await p.waitForTimeout(300);
  cl=await p.evaluate(()=>currentLevel); ok('level 3 খেলে রিফ্রেশ → level 3',cl===3,cl);
  const u=await p.evaluate(()=>save.unlocked); ok('unlocked কমেনি (7)',u===7,u);
  await p.click('#playBtn'); await p.waitForTimeout(300);
  cl=await p.evaluate(()=>currentLevel); const st=await p.evaluate(()=>state); ok('PLAY চাপলে level 3 শুরু',cl===3&&st==='play',cl+'/'+st);
  // 3: complete level -> next, reward once
  const before=await p.evaluate(()=>coins);
  await p.evaluate(()=>{completeLevel();completeLevel();});
  const after=await p.evaluate(()=>coins); const ll=await p.evaluate(()=>save.lastLevel);
  ok('level শেষে reward একবারই',after-before===75+9,after-before); ok('শেষে lastLevel = 4',ll===4,ll);
  await p.reload(); await p.waitForTimeout(300);
  cl=await p.evaluate(()=>currentLevel); const c2=await p.evaluate(()=>coins);
  ok('রিফ্রেশ → level 4, coins সেভ',cl===4&&c2===after,cl+'/'+c2);
  // 4: corrupt JSON
  await p.evaluate(([K])=>localStorage.setItem(K,'{bad json'),[K]); await p.reload(); await p.waitForTimeout(300);
  cl=await p.evaluate(()=>currentLevel); cn=await p.evaluate(()=>coins); ok('নষ্ট save → crash নেই, level 1 ও coins 250',cl===1&&cn===250,cl+'/'+cn);
  // 5: garbage values
  await p.evaluate(([K])=>localStorage.setItem(K,JSON.stringify({coins:"abc",unlocked:999,lastLevel:-5,ownedVehicles:"x",upgrades:5})),[K]); await p.reload(); await p.waitForTimeout(300);
  const g=await p.evaluate(()=>[coins,save.unlocked,currentLevel,JSON.stringify(save.ownedVehicles),typeof save.upgrades[0]]); ok('ভুল মান ঠিক হয়ে নিরাপদ',g[0]===250&&g[1]===100&&g[2]===1,JSON.stringify(g));
  // 6: storage throws
  await p.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('quota');};});
  await p.evaluate(()=>startLevel(1)); const st2=await p.evaluate(()=>state); ok('storage বন্ধ হলেও গেম চলে',st2==='play',st2);
  ok('কোনো page error নেই',errs.length===0,errs.join('|'));
  console.log(res.join('\n')); await b.close();
})();
