// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node --no-warnings tests/v44_timer_test.js <প্রজেক্ট ফোল্ডার>
// সময়-সীমা, চেকপয়েন্ট বোনাস, টাইম ক্যাপসুল, বাকি-সময়ের কয়েন, সময় শেষে ক্র্যাশ।
const { chromium } = require('playwright');
let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n);}else{fail++;console.log('FAIL',n,d===undefined?'':JSON.stringify(d));}};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newContext({viewport:{width:1000,height:560}}).then(c=>c.newPage());
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+process.argv[2]+'/index.html?noshell=1');await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{
    const o={};
    startLevel(2);o.t2=V44.timed;startLevel(3);o.t3=V44.timed;o.limit=V44.limit;o.caps=V44.capsules.length;
    // টাইম ক্যাপসুল
    const c=V44.capsules[0];truck.x=c.x;truck.y=terrainY(c.x)-70;const l0=V44.left;updatePhysics(.016);o.capGain=+(V44.left-l0).toFixed(2);o.capTaken=c.taken;
    // চেকপয়েন্ট
    startLevel(3);const cp=v15Cps[0];truck.x=cp.x+5;truck.y=terrainY(truck.x)-60;const l1=V44.left;updatePhysics(.016);o.cpGain=+(V44.left-l1).toFixed(2);
    // সময় শেষ
    startLevel(3);V44.left=.01;truck.x=400;truck.y=terrainY(400)-60;updatePhysics(.05);o.stateAfter=state;o.crashText=document.getElementById("crashText").textContent;
    // বাকি সময়ের কয়েন
    startLevel(3);V44.left=40;const c0=coins;completeLevel();o.bonus=coins-c0;o.rt=document.getElementById("rewardText").textContent;o.stars=document.getElementById("resultStars").textContent;
    // আনটাইমড লেভেল
    startLevel(4);o.t4=V44.timed;o.noTimerState=state;
    // কঠিনতা
    currentLevel=1;const r1=V44.roll();currentLevel=100;const r100=V44.roll();currentLevel=1;o.roll=[+r1.toFixed(2),+r100.toFixed(2)];
    // রেন্ডার ক্র্যাশ করে না
    startLevel(3);render();o.rendered=true;
    return o;
  });
  console.log(JSON.stringify(r));
  ok('লেভেল ২ টাইমড নয়, ৩ টাইমড',r.t2===false&&r.t3===true,r);
  ok('সময়-সীমা যুক্তিসঙ্গত (২০–১২০ সেকেন্ড)',r.limit>=20&&r.limit<=120,r.limit);
  ok('টাইম ক্যাপসুল +৪',r.capTaken&&r.capGain>3.9&&r.capGain<4.1,r);
  ok('চেকপয়েন্টে +১০',r.cpGain>9.9&&r.cpGain<10.1,r.cpGain);
  ok('সময় শেষে ক্র্যাশ',r.stateAfter==='crash'&&/Time|সময়/.test(r.crashText),r);
  ok('বাকি সময়ে বাড়তি কয়েন (৪০s → +২০)',r.bonus>=20+40,r);
  ok('লেভেল ৪ টাইমড নয়',r.t4===false);
  ok('কঠিনতা: উল্টে যাওয়ার সীমা কমে',r.roll[0]>r.roll[1],r.roll);
  ok('render কাজ করে',r.rendered);
  ok('কোনো page error নেই',errs.length===0,errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();process.exit(fail?1:0);
})();
