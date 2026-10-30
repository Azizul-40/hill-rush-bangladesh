// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/v15_bot_playability.js <প্রজেক্ট ফোল্ডারের পথ>
// নতুন ৪ যানবাহন × নতুন ৫ ম্যাপ × লেভেল ১/২৫/৬০-এ full-throttle bot চালিয়ে দেখে: লেভেল শেষ হয় কি না ও কত সময় লাগে।
// সতর্কতা: bot মানুষ নয়—সে শুধু গ্যাস চেপে ধরে। "শেষ হয়নি" মানে লেভেল অসম্ভব নয়; "শেষ হয়েছে" মানে অন্তত একভাবে পার হওয়া সম্ভব।
const { chromium } = require('playwright');
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext().then(c=>c.newPage());
  await p.goto('file://'+dir+'/index.html');await p.waitForTimeout(300);
  const res=await p.evaluate(()=>{
    save.ownedMaps=[0,1,2,3,4,5,6,7,8,9,10,11,12];save.ownedVehicles=[0,8,9,10,11];
    const out=[];
    for(const v of [8,9,10,11])for(const m of [8,9,10,11,12])for(const lvl of [1,25,60]){
      save.selectedVehicle=v;save.selectedMap=m;startLevel(lvl);
      let steps=0;keys.gas=true;keys.right=true;
      while(state==="play"&&steps<30000){updatePhysics(.02);steps++;}
      keys.gas=keys.right=false;
      out.push({v,m,lvl,finished:state==="complete",sec:+(steps*.02).toFixed(1)});
    }
    return out;
  });
  const fin=res.filter(r=>r.finished).length;
  console.log('শেষ হয়েছে:',fin,'/',res.length);
  const byV={};res.forEach(r=>{(byV[r.v]=byV[r.v]||[]).push(r.finished?1:0);});
  for(const v in byV)console.log('যানবাহন index',v,'→ শেষ',byV[v].reduce((a,c)=>a+c,0),'/',byV[v].length);
  res.filter(r=>!r.finished).forEach(r=>console.log('শেষ হয়নি:',JSON.stringify(r)));
  await b.close();
})();
