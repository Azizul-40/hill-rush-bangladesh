// Hill Rush Bangladesh — 3D ভার্সনের লেভেল + ফিজিক্স (কোনো গ্রাফিক্স নেই, তাই Node-এও টেস্ট করা যায়)।
// একক: মিটার, সেকেন্ড। দুনিয়া x (সামনে) ও y (ওপরে) সমতলে; z শুধু ছবির গভীরতা।
// ফিজিক্স নিজের লেখা সরল rigid-body (দুই চাকা, spring+damper, ঘর্ষণ); কোনো বাইরের ফিজিক্স লাইব্রেরি নেই।

export const G = 14;           // আর্কেড-গ্র্যাভিটি (বাস্তবের চেয়ে একটু বেশি, যাতে লাফ সতেজ লাগে)
export const COIN_VALUE_3D = 10;

// গাড়ির ধরন: wb চাকার দূরত্ব, R চাকার ব্যাসার্ধ, power চালনা-বল (প্রতি চাকা), vmax সর্বোচ্চ গতি, grip ঘর্ষণ-গুণক,
// roof = [x,y] ছাদের বিন্দুগুলো (গাড়ির নিজস্ব কাঠামোয়), gapScale গ্যাপ-প্রস্থ গুণক (বড় গাড়ির জন্য)
export const VEHICLES3D = [
  { id:"truck",    name:"RED RAMPAGE",   desc:"পোস্টারের লাল মনস্টার ট্রাক — শক্তিশালী, বড় চাকা।",  wb:3.4, R:.95, power:7.0, vmax:19, grip:1.05, mass:1.0, hub:.55, roof:[[-.7,2.15],[.9,2.15]], gapScale:1.0 },
  { id:"bus",      name:"MURIR TIN BUS", desc:"ঢাকা–চট্টগ্রাম বাস — ভারী, স্থির, ধীরে ওঠে।",       wb:5.2, R:.66, power:6.2, vmax:16, grip:1.18, mass:1.0, hub:.50, roof:[[-2.2,2.9],[2.2,2.9]], gapScale:1.3 },
  { id:"cng",      name:"CNG AUTO",      desc:"সবুজ সিএনজি — হালকা ও চটপটে।",                         wb:2.3, R:.40, power:5.6, vmax:17, grip:1.00, mass:1.0, hub:.40, roof:[[-.6,1.75],[.7,1.75]], gapScale:1.0 },
  { id:"rickshaw", name:"RICKSHAW",      desc:"রঙিন রিকশা — ধীর কিন্তু ভালো গ্রিপ।",                  wb:2.0, R:.44, power:4.6, vmax:12, grip:1.22, mass:1.0, hub:.42, roof:[[-.5,1.9],[.45,1.9]], gapScale:1.0 },
];

// ম্যাপ: 0 সাজেক, 1 সিলেট, 2 বান্দরবান, 3 রাঙামাটি-কাপ্তাই, 4 খাগড়াছড়ি
export const MAPS3D = [
  { id:"sajek",       name:"SAJEK VALLEY",      desc:"মেঘের রাজ্য — টিনের কটেজ আর কুয়াশা।",        diff:1.00, grip:1.00 },
  { id:"sylhet",      name:"SYLHET TEA HILLS",  desc:"চা-বাগানের সারি আর দূরের ঝর্ণা।",            diff:0.90, grip:0.95 },
  { id:"bandarban",   name:"BANDARBAN NILGIRI", desc:"পাইনের বন, কুয়াশা আর সোনালি স্তূপ।",        diff:1.12, grip:1.00 },
  { id:"kaptai",      name:"RANGAMATI KAPTAI",  desc:"কাপ্তাই হ্রদ, ঝুলন্ত সেতু আর নৌকা।",          diff:0.95, grip:1.00 },
  { id:"khagrachhari",name:"KHAGRACHHARI",      desc:"বাঁশবন, মাচাঘর আর লাল মাটির পথ।",             diff:1.05, grip:0.92 },
];

const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };

export function levelLength(level){ return 260 + level*4; }

// ---------- লেভেল তৈরি ----------
export function makeLevel(level, mapIdx, vehIdx){
  const veh = VEHICLES3D[vehIdx] || VEHICLES3D[0];
  const map = MAPS3D[mapIdx] || MAPS3D[0];
  const levelD = Math.min(1, (level-1)/99);
  const seed = level*13.7 + mapIdx*97.3;
  const L = levelLength(level);
  const mapD = map.diff;

  // গ্যাপ: লেভেল বাড়লে সংখ্যা ও প্রস্থ বাড়ে; বড় গাড়ির জন্য প্রস্থ গুণ হয় (গাড়ি চোখে "সেতু" না হয়ে যায়)
  const gapN = Math.min(5, 2 + Math.floor(level/22));
  const gaps = [];
  for(let k=0;k<gapN;k++){
    const gx = L*(0.16 + 0.62*k/Math.max(1,gapN-1)) + ((k*37+level*11)%17);
    const w = (4.0 + 1.5*levelD + 0.25*k) * veh.gapScale;
    gaps.push([Math.round(gx), +w.toFixed(2)]);
  }
  const LIFT = 2.3, RAMP = 9, LAND = 9;

  function base(x){
    let y = 2.3*(1+0.5*levelD)*mapD*Math.sin((x+seed)*0.052)
          + 1.0*(1+0.4*levelD)*mapD*Math.sin((x+seed*2)*0.121)
          + 0.25*Math.sin(x*0.31+seed);
    const sec = Math.floor(x/46), loc = ((x%46)+46)%46;
    if(loc>6 && loc<24){ y += (2.6+levelD*1.6+(sec%3)*.4)*mapD*Math.sin((loc-6)/18*Math.PI); }
    else if(loc>=24 && loc<40){ y += (1.3+levelD*.9)*mapD*Math.sin((loc-24)/16*Math.PI); }
    // শুরু সমতল; শেষে সমতল
    y *= smooth((x-8)/26);
    y *= 1 - smooth((x-(L-26))/22)*0.85;
    return y;
  }
  function gapAt(x){ for(const g of gaps){ if(x>=g[0] && x<=g[0]+g[1]) return g; } return null; }
  function lipOf(g){ return base(g[0]) + LIFT; }
  function hgt(x){
    let y = base(x);
    for(const g of gaps){
      const gs=g[0], ge=g[0]+g[1];
      if(x<=gs && x>=gs-RAMP){ y += LIFT*smooth((x-(gs-RAMP))/RAMP); break; }
      if(x>ge && x<=ge+LAND){
        const lip = lipOf(g);
        if(y>lip){ const t=smooth((x-ge)/LAND); y = lip*(1-t)+y*t; }
        break;
      }
    }
    return y;
  }
  function slope(x){ const e=.25; return (hgt(x+e)-hgt(x-e))/(2*e); }
  function isGap(x){ return !!gapAt(x); }

  // কয়েন, ফুয়েল, চেকপয়েন্ট
  const coins=[]; for(let x=22;x<L-30;x+=7){ if(gaps.some(g=>x>g[0]-6&&x<g[0]+g[1]+3)) continue; coins.push({x, y:hgt(x)+1.5+Math.sin(x*.3)*.35, taken:false}); }
  const cans=[]; for(let x=70;x<L-40;x+=78){ if(gaps.some(g=>x>g[0]-12&&x<g[0]+g[1]+6)) continue; cans.push({x, y:hgt(x)+1.3, taken:false}); }
  const cps=[.25,.5,.75].map(f=>{ let x=Math.round(L*f); for(let i=0;i<40&&gaps.some(g=>x>g[0]-14&&x<g[0]+g[1]+10);i++) x+=3; return {x, hit:false}; });

  return { level, mapIdx, vehIdx, veh, map, L, gaps, hgt, slope, isGap, gapAt, coins, cans, cps, finishX:L, seed, levelD };
}

// ---------- গাড়ির অবস্থা ----------
export function makeState(lv, atX){
  const v = lv.veh, x = atX ?? 5;
  return { x, y: lv.hgt(x)+v.R+v.hub+.3, vx:0, vy:0, ang:Math.atan(lv.slope(x)), av:0,
    fuel:100, boostE:100, boosting:0, grounded:false, airT:0, airRot:0, crashed:false, reason:"",
    wheels:[{pen:0,on:false,spin:0,hub:[0,0],gy:0},{pen:0,on:false,spin:0,hub:[0,0],gy:0}], t:0, maxX:x, flips:0, noFuelT:0 };
}

const INERTIA = 1.3;
const K_SPRING = 62, C_DAMP = 7.5, MAXPEN = 1.0;

function stepOnce(lv, S, inp, dt){
  const v = lv.veh;
  const c = Math.cos(S.ang), s = Math.sin(S.ang);
  const gripMul = v.grip * lv.map.grip;
  let fx = 0, fy = -G*v.mass, torque = 0, any = 0;
  const boostOn = inp.boost && S.boostE>0;
  const pw = v.power * (boostOn ? 1.6 : 1);
  const vmax = v.vmax * (boostOn ? 1.25 : 1);
  const hasFuel = S.fuel>0;
  const gas = inp.gas && hasFuel ? 1 : 0;

  const hubs = [-v.wb/2, v.wb/2];
  for(let i=0;i<2;i++){
    const W = S.wheels[i];
    const rx = hubs[i]*c - (-v.hub)*s, ry = hubs[i]*s + (-v.hub)*c;   // গাড়ির কাঠামোর (hubs[i], -hub) বিন্দুর ঘূর্ণিত অবস্থান
    const px = S.x + rx, py = S.y + ry;
    W.hub = [px, py];
    const gapHere = lv.isGap(px) && lv.isGap(px - v.R*.3*(i?-1:1)) ;   // চাকার কেন্দ্র গ্যাপের ভেতরে থাকলে মাটি নেই
    const gy = gapHere ? -1e9 : lv.hgt(px);
    W.gy = gy;
    const pen = gy + v.R - py;
    if(pen > 0 && pen < 3){
      const d = lv.slope(px), nl = Math.hypot(d,1), nx = -d/nl, ny = 1/nl, tx = 1/nl, ty = d/nl;
      const vpx = S.vx - S.av*ry, vpy = S.vy + S.av*rx;
      const vn = vpx*nx + vpy*ny, vt = vpx*tx + vpy*ty;
      const p = Math.min(pen, MAXPEN);
      let Fn = K_SPRING*p - C_DAMP*vn; if(Fn < 0) Fn = 0;
      let Ft = 0;
      const mu = 1.15*gripMul;
      if(gas){
        const room = Math.max(0, 1 - Math.max(0,vt)/vmax);
        Ft += pw*room;
        if(vt < 0) Ft += pw*.8;               // পেছনে গড়ালে গ্যাস দ্রুত থামায়
      }
      if(inp.brake){
        if(vt > .6) Ft -= pw*1.0;              // ব্রেক
        else if(hasFuel){ const room = Math.max(0, 1 - Math.max(0,-vt)/(vmax*.45)); Ft -= pw*.75*room; }  // রিভার্স
        else Ft -= Math.sign(vt)*Math.min(Math.abs(vt)*6, pw);
      }
      if(!gas && !inp.brake) Ft -= vt*.9;       // গড়ানোর সময় সামান্য রোলিং-রেজিস্ট্যান্স
      const lim = mu*Fn + 0.6; if(Ft > lim) Ft = lim; if(Ft < -lim) Ft = -lim;
      const Fxw = Fn*nx + Ft*tx, Fyw = Fn*ny + Ft*ty;
      fx += Fxw; fy += Fyw;
      // চালনা-বল শরীরকে ঘোরায় না (নইলে চড়াইয়ে গাড়ি উল্টে ওঠে); শুধু spring-এর (normal) বল torque দেয়
      torque += rx*(Fn*ny) - ry*(Fn*nx);
      W.on = true; W.pen = p; W.spin = vt/v.R;
      any++;
    } else { W.on = false; W.pen = 0; W.spin *= .995; }
  }

  // মাটিতে থাকলে শরীর ঢালের দিকে ধীরে মেলে (আর্কেড-সহায়তা; নইলে ঢালে ধাক্কা খেয়ে গাড়ি অবিরাম ঘুরতে থাকে)
  if(any>0){
    let target;
    if(S.wheels[0].on && S.wheels[1].on) target = Math.atan2(S.wheels[1].gy - S.wheels[0].gy, v.wb);
    else { const W = S.wheels[0].on ? S.wheels[0] : S.wheels[1]; target = Math.atan(lv.slope(W.hub[0])); }
    let err = target - S.ang; err = Math.atan2(Math.sin(err), Math.cos(err));
    torque += (any===2 ? 16 : 7) * err;
  }
  // বাতাসে/মাটিতে টিল্ট-কন্ট্রোল
  const tiltIn = (inp.tiltBack?1:0) - (inp.tiltFwd?1:0);
  if(tiltIn){
    // ang বাড়লে গাড়ির নাক ওপরে ওঠে; tiltBack = নাক ওপরে
    if(any===0) torque += tiltIn*9.0;
    else        torque += tiltIn*2.2;
  }
  // বাতাসে গ্যাস/ব্রেক দিয়েও ঘোরানো (কিবোর্ডে সহজ): গ্যাস = নাক ওপরে, ব্রেক = নাক নিচে
  if(any===0 && !tiltIn){ torque += ((inp.gas?1:0) - (inp.brake?1:0)) * 6.0; }

  // বুস্ট সামনে ঠেলা
  if(boostOn){ fx += c*4.5; fy += s*4.5; }

  const ax = fx/v.mass, ay = fy/v.mass;
  S.vx += ax*dt; S.vy += ay*dt;
  S.av += (torque/INERTIA)*dt;
  S.av *= (1 - (any?3.2:.35)*dt);
  S.x += S.vx*dt; S.y += S.vy*dt; S.ang += S.av*dt;

  S.grounded = any>0;
  if(S.grounded){ S.airT = 0; S.airRot = 0; } else { S.airT += dt; S.airRot += S.av*dt; }

  // ফুয়েল ও বুস্ট
  const useF = (inp.gas?1.35:.3)*(boostOn?1.6:1);
  S.fuel = Math.max(0, S.fuel - useF*dt);
  if(boostOn){ S.boostE = Math.max(0, S.boostE - 34*dt); } else { S.boostE = Math.min(100, S.boostE + 4*dt); }
  S.t += dt; if(S.x > S.maxX) S.maxX = S.x;
}

// প্রতি ফ্রেমে ১/১২০ সেকেন্ডের ধাপে ফিজিক্স
export function step(lv, S, inp, dt){
  if(S.crashed) return;
  const n = Math.max(1, Math.ceil(dt/(1/120)));
  const h = dt/n;
  for(let i=0;i<n;i++){
    const wasAir = !S.grounded, rot = S.airRot;
    stepOnce(lv,S,inp,h);
    if(wasAir && S.grounded){
      const flips = Math.floor(Math.abs(rot)/(Math.PI*2)+.0001);
      if(flips>=1) S.flips += flips;
    }
    // ক্র্যাশ: ছাদ মাটি ছুঁলে / গ্যাপে পড়লে / খাদে পড়লে / তেল শেষ হয়ে থেমে গেলে
    const c=Math.cos(S.ang), s=Math.sin(S.ang);
    for(const [rx0,ry0] of lv.veh.roof){
      const rx = rx0*c - ry0*s, ry = rx0*s + ry0*c;
      const px=S.x+rx, py=S.y+ry;
      if(!lv.isGap(px) && py < lv.hgt(px)+0.05){ S.crashed=true; S.reason="Rolled over!"; return; }
    }
    if(lv.isGap(S.x) && S.y < lv.hgt(lv.gapAt(S.x)[0]) - 5.5){ S.crashed=true; S.reason="You fell into the gap!"; return; }
    if(S.y < -45){ S.crashed=true; S.reason="You fell off the mountain!"; return; }
    if(S.fuel<=0 && S.grounded && Math.abs(S.vx)<.4){ S.noFuelT += h; if(S.noFuelT>1.5){ S.crashed=true; S.reason="Out of fuel!"; return; } } else S.noFuelT=0;
  }
}

// কয়েন/ফুয়েল/চেকপয়েন্ট সংগ্রহ; ফেরত: ঘটনার তালিকা
export function collect(lv, S){
  const ev=[];
  for(const c of lv.coins){ if(!c.taken && Math.abs(c.x-S.x)<2.0 && Math.abs(c.y-(S.y+.6))<2.2){ c.taken=true; ev.push({type:"coin",item:c}); } }
  for(const c of lv.cans){ if(!c.taken && Math.abs(c.x-S.x)<2.2 && Math.abs(c.y-(S.y+.4))<2.4){ c.taken=true; S.fuel=Math.min(100,S.fuel+45); ev.push({type:"fuel",item:c}); } }
  lv.cps.forEach((cp,i)=>{ if(!cp.hit && S.x>=cp.x){ cp.hit=true; ev.push({type:"cp",item:cp,n:i+1}); } });
  if(S.x>=lv.finishX) ev.push({type:"finish"});
  return ev;
}

// checkpoint-এ নতুন করে বসানো
export function respawnAt(lv, S, cpX){
  const n=makeState(lv,cpX);
  Object.assign(S,n); S.fuel=70; S.boostE=60;
}
