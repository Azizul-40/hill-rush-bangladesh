// চালানোর নিয়ম: node tests/economy_measure.js <প্রজেক্ট ফোল্ডারের পথ>
// এটা coin economy মাপার helper script—bot পুরো throttle চেপে কয়েকটা লেভেল খেলে কত কয়েন/সময় লাগে দেখায়।
// সতর্কতা: এটা মানুষের মতো সতর্ক ড্রাইভিং নয়, তাই ফলাফল হলো একটা upper-bound (air/flip বোনাসসহ), বাস্তব গড় আয়ের চেয়ে বেশি দেখাতে পারে।
const { chromium } = require('playwright');
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext().then(c=>c.newPage());
  await p.goto('file://'+dir+'/index.html');await p.waitForTimeout(300);
  await p.evaluate(()=>{save.coins=0;coins=0;save.coinPackClaims=0;save.dailyClaimed=true;});
  const results=[];
  for(const lvl of [1,10,25,50]){
    const r=await p.evaluate((lvl)=>{
      startLevel(lvl);
      const c0=coins;const t0=performance.now();
      keys.gas=true;let steps=0;
      while(state==="play"&&steps<20000){updatePhysics(0.033);steps++;}
      keys.gas=false;
      return {lvl,timeSec:+(steps*0.033).toFixed(1),coinsGained:coins-c0,finished:state==="complete"};
    },lvl);
    results.push(r);
  }
  const totalCoinsAfter4=await p.evaluate(()=>coins);
  console.log(JSON.stringify(results,null,2));
  console.log('total coins after levels 1,10,25,50:',totalCoinsAfter4);
  console.log('প্রথম upgrade (150 coin) কিনতে লাগবে level1-এর মতো আয়ে প্রায়:',(150/(results[0].coinsGained||1)).toFixed(1),'টা level');
  await b.close();
})();
