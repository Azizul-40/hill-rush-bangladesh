// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/v16_test.js <প্রজেক্ট ফোল্ডার>
// v16: বাসের গ্যাপ প্রস্থ, কয়েন-ব্যালান্স ধ্রুবক, ক্যানভাস স্বয়ংক্রিয় resize-ঠিক-করা।
const { chromium } = require('playwright');
let pass=0,fail=0;const ok=(n,c,x)=>{c?pass++:fail++;console.log((c?'PASS':'FAIL')+': '+n+(c?'':'  ← '+JSON.stringify(x)));};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const pg=await b.newPage({viewport:{width:1200,height:700}});const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto('file://'+process.argv[2]+'/index.html');await pg.waitForTimeout(300);
  const r=await pg.evaluate(()=>{
    save.ownedVehicles=[0,8,9,10,11];save.selectedMap=0;
    save.selectedVehicle=0;startLevel(5);const g0=getGaps().map(g=>g[1]);
    save.selectedVehicle=11;startLevel(5);const g1=getGaps().map(g=>g[1]);
    save.selectedVehicle=8;startLevel(5);const g2=getGaps().map(g=>g[1]);
    return {g0,g1,g2,cv:COIN_VALUE,cp:COIN_PACK_AMOUNT};
  });
  ok('বাসে প্রতিটা গ্যাপ ~১.৩ গুণ',r.g0.every((w,i)=>Math.abs(r.g1[i]-Math.round(w*1.3))<=1),r);
  ok('CNG-তে গ্যাপ অপরিবর্তিত',JSON.stringify(r.g0)===JSON.stringify(r.g2),r);
  ok('কয়েনের মান ৪, প্যাক ১০০ (v42 ব্যালেন্স)',r.cv===4&&r.cp===100,r);
  // কয়েন তুললে ঠিক COIN_VALUE বাড়ে
  const dc=await pg.evaluate(()=>{save.selectedVehicle=0;startLevel(1);levelCoins.forEach((q,i)=>{if(i>0)q.taken=true;});const c=levelCoins[0];truck.x=c.x;truck.y=c.y+30;truck.airTime=0;truck.airRotation=0;checkAchievements();const b=coins;collectCoins();return coins-b;});
  ok('একটা কয়েনে +৪',dc===4,dc);
  // ক্যানভাস: viewport বদলে resize ইভেন্ট ছাড়াই (শুধু render চালিয়ে) মাপ ঠিক হয়
  await pg.setViewportSize({width:1500,height:800});await pg.waitForTimeout(200);
  const s1=await pg.evaluate(()=>({iw:innerWidth,cw:canvas.clientWidth,bw:canvas.width,W,dpr:Math.min(devicePixelRatio,2)}));
  ok('viewport ১৫০০ হলে canvas মাপ মেলে',s1.cw===1500&&s1.W===1500&&s1.bw===Math.floor(1500*s1.dpr),s1);
  // জোর করে ভুল মাপ বসিয়ে দিলে পরের ফ্রেমে নিজে ঠিক হয়
  const s2=await pg.evaluate(async()=>{canvas.width=900;canvas.height=500;await new Promise(r=>setTimeout(r,250));return {bw:canvas.width,bh:canvas.height,W,H,dpr:DPR};});
  ok('ভুল canvas মাপ নিজে ঠিক হয়',s2.bw===Math.floor(s2.W*s2.dpr)&&s2.bh===Math.floor(s2.H*s2.dpr),s2);
  ok('পেজে এরর নেই',errs.length===0,errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();process.exit(fail?1:0);
})();
