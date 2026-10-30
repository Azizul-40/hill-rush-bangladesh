// চালানোর নিয়ম: node tests/physics3d_bot.js   (শুধু Node; কোনো ব্রাউজার লাগে না)
// 3D ফিজিক্সের সরল বট: গ্যাস চেপে ধরে, বাতাসে ঢাল মেলাতে টিল্ট করে, গ্যাপের আগে বুস্ট দেয়।
// সতর্কতা: বট মানুষ নয়। "শেষ হয়েছে" = অন্তত একভাবে পার হওয়া সম্ভব; কঠিনতা/মজা প্রমাণ করে না।
import { makeLevel, makeState, step, collect, VEHICLES3D, MAPS3D } from '../3d/physics3d.js';
function run(level,map,veh,smart){
  const lv=makeLevel(level,map,veh), S=makeState(lv); let t=0, ev, cpUsed=0, lastCp=null, maxSlope=0;
  while(t<400 && !S.crashed){
    const sl=Math.atan(lv.slope(S.x));
    const inp={gas:true,brake:false,boost:false,tiltBack:false,tiltFwd:false};
    if(!S.grounded){
      const err=sl-S.ang;
      if(smart){ inp.tiltBack=err>.12; inp.tiltFwd=err<-.12; }
    } 
    const g=lv.gaps.find(g=>S.x>g[0]-14&&S.x<g[0]+1);
    if(g && S.grounded) inp.boost=true;
    step(lv,S,inp,1/60); t+=1/60;
    maxSlope=Math.max(maxSlope,Math.abs(sl));
    ev=collect(lv,S);
    if(ev.some(e=>e.type==="cp")){ lastCp=S.x; }
    if(ev.some(e=>e.type==="finish")) return {ok:true,t:+t.toFixed(1),coins:lv.coins.filter(c=>c.taken).length+"/"+lv.coins.length,fuel:+S.fuel.toFixed(0),maxSlopeDeg:+(maxSlope*57.3).toFixed(0)};
  }
  return {ok:false,reason:S.reason||"time",x:+S.x.toFixed(0),L:lv.L,maxSlopeDeg:+(maxSlope*57.3).toFixed(0)};
}
let tot=0,okc=0;
for(const veh of [0,1,2,3]) for(const map of [0,1,2,3,4]) for(const lvl of [1,10,30,60,100]){
  const r=run(lvl,map,veh,true); tot++; if(r.ok) okc++;
  if(!r.ok || process.argv[2]==="-v") console.log(VEHICLES3D[veh].id,MAPS3D[map].id,"L"+lvl,JSON.stringify(r));
}
console.log("শেষ করেছে:",okc,"/",tot);
