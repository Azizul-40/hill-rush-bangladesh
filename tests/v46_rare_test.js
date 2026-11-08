// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node --no-warnings tests/v46_rare_test.js <প্রজেক্ট ফোল্ডার>
const { chromium } = require('playwright');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n);}else{fail++;console.log('FAIL',n,d===undefined?'':JSON.stringify(d));}};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext({viewport:{width:1000,height:600}}).then(c=>c.newPage());const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+process.argv[2]+'/index.html?noshell=1');await p.waitForTimeout(500);
  const r=await p.evaluate(()=>{
    const o={};o.nv=vehiclesV22.length;o.nm=maps.length;
    save.coins=999999;coins=999999;save.trophies=0;persist();renderGarage();
    const cards=[...document.querySelectorAll('#vehicleList .vehicleCard')];const bike=cards[14];o.bikeBtn=bike.querySelector('button').textContent;o.bikeDis=bike.querySelector('button').disabled;
    bike.querySelector('button').click();o.bikeOwnedAfterClick=save.ownedVehicles.includes(14);o.coinsAfter=coins;
    renderMaps();const mc=[...document.querySelectorAll('#mapGrid .mapCard')].find(c=>/AURORA/.test(c.textContent));mc.click();o.auroraOwned=save.ownedMaps.includes(13);o.lock=mc.querySelector('.mapLock')&&mc.querySelector('.mapLock').textContent;
    // ট্রফি
    save.trophies=0;o.start=V46.trophies();V46.add(30);o.t30=V46.trophies();o.phantom=save.ownedVehicles.includes(12);o.gold=save.ownedVehicles.includes(13);
    V46.add(10);o.aurora=save.ownedMaps.includes(13);o.royal=save.ownedMaps.includes(14);
    // লেভেল শেষে ট্রফি
    save.trophies=0;save.trophyLog={};save.completed={};startLevel(5);state="play";levelStart=performance.now()-30000;completeLevel();o.afterLevel=V46.trophies();
    startLevel(5);state="play";levelStart=performance.now()-30000;completeLevel();o.afterRepeat=V46.trophies();
    // রেয়ার গাড়িতে খেলা যায়
    save.selectedVehicle=12;startLevel(1);let n=0;keys.gas=true;keys.right=true;while(state==="play"&&n<200){updatePhysics(1/60);n++;}keys.gas=keys.right=false;o.playOk=Number.isFinite(truck.x)&&truck.x>300;
    save.selectedMap=14;startLevel(1);o.mapPlay=Number.isFinite(terrainY(1000));
    return o;
  });
  console.log(JSON.stringify(r));
  ok('গাড়ি ১৫টা, ম্যাপ ১৫টা',r.nv===15&&r.nm===15,r);
  ok('তালা দেওয়া রেয়ার গাড়ি কেনা যায় না (কয়েন যথেষ্ট থাকলেও)',r.bikeDis&&!r.bikeOwnedAfterClick&&r.coinsAfter===999999,r);
  ok('তালা দেওয়া রেয়ার ম্যাপ ক্লিকে খোলে না',!r.auroraOwned&&/🏆/.test(r.lock||''),r);
  ok('৩০ ট্রফিতে PHANTOM X আনলক, GOLD নয়',r.phantom&&!r.gold,r);
  ok('৪০ ট্রফিতে AURORA PEAK, ROYAL নয়',r.aurora&&!r.royal,r);
  ok('লেভেল প্রথমবার শেষে ট্রফি, আবার খেললে বাড়ে না',r.afterLevel>=1&&r.afterRepeat===r.afterLevel,r);
  ok('রেয়ার গাড়ি/ম্যাপে খেলা চলে',r.playOk&&r.mapPlay,r);
  ok('page error নেই',errs.length===0,errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();process.exit(fail?1:0);
})();
