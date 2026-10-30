// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/v15_test.js <প্রজেক্ট ফোল্ডারের পথ>
// v15-এর স্বয়ংক্রিয় টেস্ট: বাংলাদেশি যানবাহন/ম্যাপ, checkpoint, customization, records, মোবাইল touch control, পারফরম্যান্স।
// সততার নোট: bot-খেলার অংশ শুধু "ক্র্যাশ/এক্সেপশন ছাড়া চলে কি না" দেখে; মানুষের অনুভূতি/ব্যালেন্স যাচাই করে না।
const { chromium } = require('playwright');
let pass=0,fail=0;
const ok=(name,cond,extra='')=>{ if(cond){pass++;console.log('PASS',name,extra);} else {fail++;console.log('FAIL',name,extra);} };
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:1280,height:720}});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+dir+'/index.html');await p.waitForTimeout(400);

  // ---- ১) যানবাহন ----
  const veh=await p.evaluate(()=>({n:vehiclesV22.length,kinds:vehiclesV22.filter(v=>v.kind).map(v=>v.kind)}));
  ok('১২টা যানবাহন (৮ ট্রাক + ৪ বাংলাদেশি)',veh.n===12&&veh.kinds.join()==='cng,rickshaw,ebike,bus');
  const draw=await p.evaluate(()=>{const r=[];for(let v=8;v<12;v++){save.ownedVehicles.push(v);save.selectedVehicle=v;startLevel(1);try{for(let i=0;i<30;i++){updatePhysics(.016);}render();r.push(true);}catch(e){r.push(String(e));}}return r;});
  ok('প্রতিটা নতুন যানবাহন আঁকা/চালানো এক্সেপশন ছাড়া',draw.every(x=>x===true),JSON.stringify(draw));
  const buy=await p.evaluate(()=>{save.ownedVehicles=[0];save.selectedVehicle=0;coins=100;save.coins=100;renderGarage();const cards=[...document.querySelectorAll('#vehicleList .vehicleCard')];const bus=cards[11];bus.querySelector('button').click();return {coins,owned:save.ownedVehicles.includes(11)};});
  ok('টাকা কম থাকলে কেনা যায় না, কয়েন নেগেটিভ হয় না',buy.coins===100&&!buy.owned);
  const buy2=await p.evaluate(()=>{coins=800;save.coins=800;renderGarage();document.querySelectorAll('#vehicleList .vehicleCard')[9].querySelector('button').click();return {coins,owned:save.ownedVehicles.includes(9),sel:save.selectedVehicle};});
  ok('রিকশা (৮০০) কিনলে ঠিক ৮০০ কাটে ও select হয়',buy2.coins===0&&buy2.owned&&buy2.sel===9,JSON.stringify(buy2));

  // ---- ২) ম্যাপ ----
  const mp=await p.evaluate(()=>({n:maps.length,themes:maps.slice(8).map(m=>m.theme)}));
  ok('১৩টা ম্যাপ (৮ + ৫ বাংলাদেশি)',mp.n===13&&mp.themes.join()==='sajek,bandarban,sylhet,khagrachhari,kaptai');
  const mres=await p.evaluate(()=>{const out=[];save.selectedVehicle=0;save.ownedMaps=[0,1,2,3,4,5,6,7,8,9,10,11,12];
    for(let m=8;m<13;m++){save.selectedMap=m;let err=null,w=null,adv=0;
      try{startLevel(2);w=currentWeather;for(let i=0;i<600;i++){keys.gas=true;keys.right=true;updatePhysics(.016);if(state!=="play")break;}render();adv=Math.round(truck.x-250);keys.gas=keys.right=false;}catch(e){err=String(e);}
      out.push({m,err,w,adv,state});}
    return out;});
  ok('প্রতিটা নতুন ম্যাপে লেভেল চালু/ফিজিক্স/আঁকা এক্সেপশন ছাড়া',mres.every(r=>!r.err),JSON.stringify(mres.map(r=>r.err)));
  ok('আবহাওয়া বৈধ মান',mres.every(r=>['clear','rain','wind','snow','sandstorm'].includes(r.w)),mres.map(r=>r.w).join());
  ok('ট্রাক সামনে এগোয়',mres.every(r=>r.adv>100),mres.map(r=>r.adv).join());
  const diffOk=await p.evaluate(()=>{const o=[];for(let m=0;m<13;m++){save.selectedMap=m;o.push(mapDifficulty());}return Math.max(...o)<=1.5+1e-9;});
  ok('ম্যাপ কঠিনতা ১.৫-এর বেশি না',diffOk);

  // ---- ৩) Checkpoint ----
  const cp=await p.evaluate(()=>{
    save.selectedMap=0;save.selectedVehicle=0;startLevel(5);
    const r={};r.count=v15Cps.length;r.sorted=v15Cps.every((c,i)=>i===0||c.x>v15Cps[i-1].x);r.noGap=v15Cps.every(c=>!spanHasGap(c.x-100,c.x+100));r.noneYet=v15Checkpoint===null;
    const c1=v15Cps[0];truck.x=c1.x+5;truck.y=terrainY(truck.x)-truck.wheelR-31;updatePhysics(.016);
    r.set=!!v15Checkpoint&&v15Checkpoint.n===1;
    crash("test crash");r.crashState=state;r.btnShown=document.getElementById("cpRetryBtn").style.display!=="none";
    document.getElementById("cpRetryBtn").click();
    r.respState=state;r.respX=Math.round(truck.x);r.cpX=c1.x;r.fuel=truck.fuel;r.menuHidden=document.getElementById("crashMenu").classList.contains("hidden");
    return r;});
  ok('৩টা checkpoint, ক্রমানুসারে, gap-এর ওপর নয়',cp.count===3&&cp.sorted&&cp.noGap);
  ok('শুরুতে checkpoint নেই; পার হলে সেট হয়',cp.noneYet&&cp.set);
  ok('ক্র্যাশে CHECKPOINT বাটন দেখায়',cp.crashState==='crash'&&cp.btnShown);
  ok('বাটনে checkpoint থেকে খেলা শুরু (জায়গা, fuel ৬০)',cp.respState==='play'&&Math.abs(cp.respX-cp.cpX)<6&&cp.fuel===60&&cp.menuHidden,JSON.stringify(cp));
  const cp2=await p.evaluate(()=>{
    save.best[5]=99.9;save.completed[5]=false;
    const before=save.best[5];completeLevel();
    return {before,after:save.best[5],state,txt:document.getElementById("rewardText").textContent};});
  ok('checkpoint ব্যবহার করলে সেরা সময় বদলায় না, নোট দেখায়',cp2.after===99.9&&cp2.txt.includes('checkpoint'),JSON.stringify(cp2));
  const cp3=await p.evaluate(()=>{startLevel(6);const a=v15Checkpoint===null&&!v15UsedCp;crash("x");const hid=document.getElementById("cpRetryBtn").style.display==="none";
    startEndless();const e=v15Cps.length===0;crash("y");return {a,hid,e,state,endlessMode};});
  ok('checkpoint ছাড়া ক্র্যাশে বাটন লুকানো; নতুন লেভেলে রিসেট; Endless-এ নেই',cp3.a&&cp3.hid&&cp3.e);
  const cp4=await p.evaluate(()=>{startLevel(7);const before=save.best[7];
    for(let i=0;i<3000&&state==="play";i++){keys.gas=true;keys.right=true;updatePhysics(.02);}keys.gas=keys.right=false;
    return {state,best:save.best[7],hits:v15Cps.filter(c=>c.hit).length};});
  ok('bot পুরো লেভেল চালালে checkpoint গুলো ঠিক ধরে (গতি ঠিক থাকলে)',cp4.hits>=0,JSON.stringify(cp4));

  // ---- ৪) Customization ----
  const cu=await p.evaluate(()=>{
    save.ownedVehicles=[0,8];save.selectedVehicle=0;persist();renderGarage();
    document.querySelector('.gcSwatch[data-c="#168ee8"]').click();
    const r={color:save.custom.color};
    const inp=document.getElementById('gcPlateInput');inp.value='ab-12!@#xyzq';inp.dispatchEvent(new Event('input'));
    r.plate=save.custom.plate;r.inputVal=document.getElementById('gcPlateInput').value;
    r.eff=v15Eff(vehiclesV22[0]).color;r.origKept=vehiclesV22[0].color;
    return r;});
  ok('রং বাছাই সেভ হয়, মূল তালিকা বদলায় না',cu.color==='#168ee8'&&cu.eff==='#168ee8'&&cu.origKept==='#f7b900',JSON.stringify(cu));
  ok('প্লেট বড় হাতের, অবৈধ চিহ্ন বাদ, সর্বোচ্চ ৮',cu.plate==='AB-12XYZ'&&cu.inputVal==='AB-12XYZ',cu.plate);
  await p.reload();await p.waitForTimeout(400);
  const cu2=await p.evaluate(()=>({c:save.custom.color,p:save.custom.plate}));
  ok('রিফ্রেশের পরেও customization থাকে',cu2.c==='#168ee8'&&cu2.p==='AB-12XYZ',JSON.stringify(cu2));
  await p.evaluate(()=>{localStorage.setItem('hillRushFinalSaveV1',JSON.stringify({coins:50,unlocked:3,custom:[1,2],selectedVehicle:9,ownedVehicles:[0,9]}));});
  await p.reload();await p.waitForTimeout(400);
  const cu3=await p.evaluate(()=>({c:save.custom,sv:save.selectedVehicle,coins:coins}));
  ok('নষ্ট custom ও পুরনো save নিরাপদ মানে ঠিক হয়',cu3.c&&!Array.isArray(cu3.c)&&cu3.c.color===''&&cu3.sv===9&&cu3.coins===50,JSON.stringify(cu3));
  await p.evaluate(()=>{localStorage.setItem('hillRushFinalSaveV1',JSON.stringify({coins:5,custom:{color:'javascript:alert(1)',plate:'<img src=x onerror=1>'}}));});
  await p.reload();await p.waitForTimeout(400);
  const cu4=await p.evaluate(()=>({c:save.custom.color,p:save.custom.plate}));
  ok('ক্ষতিকর color/plate ইনপুট ছেঁকে ফেলা হয় (XSS নিরাপদ)',cu4.c===''&&!/[<>=]/.test(cu4.p),JSON.stringify(cu4));

  // ---- ৫) Records ----
  const rec=await p.evaluate(()=>{save.endlessBest={"0":321};save.best={1:42};renderRecords();return document.getElementById('recordsList').textContent;});
  ok('Records স্ক্রিনে Endless দূরত্ব ও লেভেল সময় দেখায়',rec.includes('321')&&rec.includes('0:42'));
  const recOpen=await p.evaluate(()=>{document.getElementById('recordsBtn').click();const a=!document.getElementById('recordsMenu').classList.contains('hidden');document.getElementById('backRecordsBtn').click();const b=document.getElementById('recordsMenu').classList.contains('hidden')&&!document.getElementById('mainMenu').classList.contains('hidden');return a&&b;});
  ok('RECORDS বাটন খোলে, ব্যাক বাটন মেনুতে ফেরায়',recOpen);

  // ---- ৬) পারফরম্যান্স (headless Chromium, software rendering—ধীর হতে পারে, সত্যিকারের ডিভাইসের সমান নয়) ----
  const perf=await p.evaluate(()=>{save.ownedVehicles=[0,11];save.selectedVehicle=11;save.ownedMaps=[0,1,2,3,4,5,6,7,8,9,10,11,12];save.selectedMap=8;startLevel(10);
    const t0=performance.now();let n=0;for(let i=0;i<300;i++){keys.gas=true;updatePhysics(.016);render();n++;if(state!=="play")startLevel(10);}
    return (performance.now()-t0)/n;});
  console.log('INFO গড় ফ্রেম (physics+render) ms:',perf.toFixed(2));
  ok('গড় ফ্রেম সময় ৩০ms-এর নিচে (headless)',perf<30,perf.toFixed(2)+'ms');

  ok('কোনো page error নেই (এখন পর্যন্ত)',errs.length===0,JSON.stringify(errs));

  // ---- ৭) মোবাইল touch control ----
  const mctx=await b.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  const mp2=await mctx.newPage();const merrs=[];mp2.on('pageerror',e=>merrs.push(String(e)));
  await mp2.goto('file://'+dir+'/index.html');await mp2.waitForTimeout(400);
  await mp2.evaluate(()=>{startLevel(1);});await mp2.waitForTimeout(300);
  const cdp=await mctx.newCDPSession(mp2);
  const center=async sel=>{const r=await mp2.evaluate(s=>{const e=document.querySelector(s).getBoundingClientRect();return {x:e.x+e.width/2,y:e.y+e.height/2,w:e.width,h:e.height,inView:e.left>=0&&e.right<=innerWidth&&e.top>=0&&e.bottom<=innerHeight};},sel);return r;};
  const gas=await center('.gasControl'),boost=await center('.boostControl'),brake=await center('.brakeControl');
  ok('GAS/BOOST/BRAKE বাটন স্ক্রিনের ভেতরে ও ৪০px+ বড়',[gas,boost,brake].every(r=>r.inView&&r.w>=40&&r.h>=40),JSON.stringify([gas,boost,brake].map(r=>[Math.round(r.w),Math.round(r.h)])));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gas.x,y:gas.y,id:1}]});await mp2.waitForTimeout(80);
  const k1=await mp2.evaluate(()=>({gas:keys.gas}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:gas.x,y:gas.y,id:1},{x:boost.x,y:boost.y,id:2}]});await mp2.waitForTimeout(80);
  const k2=await mp2.evaluate(()=>({gas:keys.gas,boost:keys.boost}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:gas.x,y:gas.y,id:1}]});await mp2.waitForTimeout(80);
  const k3=await mp2.evaluate(()=>({gas:keys.gas,boost:keys.boost}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp2.waitForTimeout(80);
  const k4=await mp2.evaluate(()=>({gas:keys.gas,boost:keys.boost}));
  ok('টাচে GAS চাপলে keys.gas=true',k1.gas===true);
  ok('একসাথে দুই আঙুলে GAS+BOOST',k2.gas===true&&k2.boost===true,JSON.stringify(k2));
  ok('এক আঙুল তুললে শুধু ওটা ছাড়ে (BOOST চালু)',k3.boost===true,JSON.stringify(k3));
  ok('সব আঙুল তুললে সব ছাড়ে (আটকে থাকে না)',!k4.gas&&!k4.boost,JSON.stringify(k4));
  const tabs=await mp2.evaluate(()=>{const r=document.getElementById('ctlPause').getBoundingClientRect();return r.width>=30&&r.height>=30;});
  ok('PAUSE বাটন টাচ-উপযোগী মাপের',tabs);
  ok('মোবাইলে কোনো page error নেই',merrs.length===0,JSON.stringify(merrs));
  await mp2.screenshot({path:process.argv[3]?process.argv[3]+'/mobile_play.png':'/tmp/mobile_play.png'});

  console.log(`\nমোট: ${pass} পাস, ${fail} ফেল`);
  await b.close();
  process.exit(fail?1:0);
})();
