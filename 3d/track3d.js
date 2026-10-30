// Hill Rush Bangladesh — আসল 3D ট্র্যাক + গাড়ির ফিজিক্স (কোনো গ্রাফিক্স নেই, তাই Node-এ টেস্ট করা যায়)।
// একক: মিটার, সেকেন্ড, রেডিয়ান। দুনিয়া: x, z সমতল; y ওপরে।
// ট্র্যাক = ঘুরে ঘুরে চলা পাহাড়ি মাটির রাস্তা (centerline) + তার চারপাশের উচ্চতা-গ্রিড (heightfield)।
// গাড়ির ফিজিক্স = আর্কেড (bicycle স্টিয়ারিং, spring সাসপেনশন, ঢালে গড়ানো, লাফ/ল্যান্ডিং, উল্টানো)।
// নিজের লেখা সরল মডেল; আসল গাড়ির ফিজিক্স নয়।

export const G = 14;
export const COIN_VALUE_3D = 10;

// গাড়ি: wb চাকার দূরত্ব, R চাকার ব্যাসার্ধ, hub অ্যাক্সেল COM-এর কত নিচে, power চালনা, vmax সর্বোচ্চ গতি, grip ঘর্ষণ, tw পাশের চাকার অর্ধ-দূরত্ব
export const VEHICLES3D = [
  { id:"truck",    name:"RED RAMPAGE",   desc:"পোস্টারের লাল মনস্টার ট্রাক — শক্তিশালী, বড় চাকা।",  wb:3.4, R:.95, power:9.5, vmax:21, grip:1.00, hub:.55, gapScale:1.0, tw:1.25 },
  { id:"bus",      name:"MURIR TIN BUS", desc:"ঢাকা–চট্টগ্রাম বাস — ভারী, স্থির, ধীরে ওঠে।",       wb:5.2, R:.66, power:8.0, vmax:17, grip:1.10, hub:.50, gapScale:1.3, tw:1.15 },
  { id:"cng",      name:"CNG AUTO",      desc:"সবুজ সিএনজি — হালকা ও চটপটে।",                         wb:2.3, R:.40, power:8.2, vmax:19, grip:.95,  hub:.40, gapScale:1.0, tw:.65 },
  { id:"rickshaw", name:"RICKSHAW",      desc:"রঙিন রিকশা — ধীর কিন্তু ভালো গ্রিপ।",                  wb:2.0, R:.44, power:7.0, vmax:13, grip:1.15, hub:.42, gapScale:1.0, tw:.6 },
];

// ম্যাপ: twist = রাস্তার বাঁকের পরিমাণ, diff = উঁচু-নিচুর পরিমাণ
export const MAPS3D = [
  { id:"sajek",       name:"SAJEK VALLEY",      desc:"মেঘের রাজ্য — টিনের কটেজ আর কুয়াশা।",        diff:1.00, grip:1.00, twist:1.0 },
  { id:"sylhet",      name:"SYLHET TEA HILLS",  desc:"চা-বাগানের সারি আর দূরের ঝর্ণা।",            diff:.90,  grip:.95,  twist:.9 },
  { id:"bandarban",   name:"BANDARBAN NILGIRI", desc:"পাইনের বন, কুয়াশা আর সোনালি স্তূপ।",        diff:1.12, grip:1.00, twist:1.2 },
  { id:"kaptai",      name:"RANGAMATI KAPTAI",  desc:"কাপ্তাই হ্রদ, ঝুলন্ত সেতু আর নৌকা।",          diff:.95,  grip:1.00, twist:1.1 },
  { id:"khagrachhari",name:"KHAGRACHHARI",      desc:"বাঁশবন, মাচাঘর আর লাল মাটির পথ।",             diff:1.05, grip:.92,  twist:1.15 },
];

export const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
const hash = (x,z)=>{ const s=Math.sin(x*127.1+z*311.7)*43758.5453; return s-Math.floor(s); };
function vnoise(x,z){ const xi=Math.floor(x), zi=Math.floor(z), xf=x-xi, zf=z-zi; const u=xf*xf*(3-2*xf), v=zf*zf*(3-2*zf);
  return (hash(xi,zi)*(1-u)+hash(xi+1,zi)*u)*(1-v)+(hash(xi,zi+1)*(1-u)+hash(xi+1,zi+1)*u)*v; }
export function fbm(x,z,o=4){ let a=.5,f=1,s=0; for(let i=0;i<o;i++){ s+=a*vnoise(x*f,z*f); f*=2.03; a*=.5; } return s; }

export const ROAD_HALF = 3.5;      // রাস্তার অর্ধ-প্রস্থ (৭ মিটার চওড়া)
export const trackLength = level => 320 + level*5;

// ================================================================
// ট্র্যাক তৈরি
// ================================================================
export function makeTrack(level, mapIdx, vehIdx){
  const veh = VEHICLES3D[vehIdx] || VEHICLES3D[0];
  const map = MAPS3D[mapIdx] || MAPS3D[0];
  const levelD = Math.min(1,(level-1)/99), mapD = map.diff;
  const seed = level*13.7 + mapIdx*97.3;
  const L = trackLength(level);
  const ph1 = (seed*.37)%6.28, ph2 = (seed*.61)%6.28, ph3=(seed*.23)%6.28;

  // ---- গ্যাপ ----
  const gapN = Math.min(5, 2 + Math.floor(level/22));
  const gaps = [];
  for(let k=0;k<gapN;k++){
    const gs = L*(0.16 + 0.62*k/Math.max(1,gapN-1)) + ((k*37+level*11)%17);
    gaps.push({ s0:Math.round(gs), w:+((4.2 + 1.5*levelD + 0.25*k)*veh.gapScale).toFixed(2) });
  }
  const LIFT = 2.3, RAMP = 10, LAND = 10;
  const inGapS = s => { for(const g of gaps) if(s>=g.s0 && s<=g.s0+g.w) return g; return null; };

  // ---- রাস্তার উচ্চতা (s ধরে) ----
  function baseH(s){
    let y = 7.0*(1+0.45*levelD)*mapD*Math.sin((s+seed)*0.034)
          + 1.7*(1+0.4*levelD)*mapD*Math.sin((s+seed*2)*0.105)
          + 0.25*Math.sin(s*0.31+seed);
    const sec = Math.floor(s/46), loc = ((s%46)+46)%46;
    if(loc>6 && loc<24) y += (2.6+levelD*1.6+(sec%3)*.4)*mapD*Math.sin((loc-6)/18*Math.PI);
    else if(loc>=24 && loc<40) y += (1.3+levelD*.9)*mapD*Math.sin((loc-24)/16*Math.PI);
    y *= smooth((s-8)/26);
    y *= 1 - smooth((s-(L-26))/22)*0.85;
    return y;
  }
  function roadH(s){
    let y = baseH(s);
    for(const g of gaps){
      const gs=g.s0, ge=g.s0+g.w;
      if(s<=gs && s>=gs-RAMP){ y += LIFT*smooth((s-(gs-RAMP))/RAMP); break; }
      if(s>ge && s<=ge+LAND){ const lip=baseH(gs)+LIFT; if(y>lip){ const t=smooth((s-ge)/LAND); y=lip*(1-t)+y*t; } break; }
    }
    return y;
  }

  // ---- centerline (প্রতি ১ মিটারে একটা বিন্দু) ----
  const N = Math.ceil(L)+120, cx=new Float32Array(N+1), cz=new Float32Array(N+1), cpsi=new Float32Array(N+1), ch=new Float32Array(N+1);
  let x=0,z=0,psi=0; const tw = map.twist*(0.7+0.5*levelD);
  for(let i=0;i<=N;i++){
    cx[i]=x; cz[i]=z; cpsi[i]=psi; ch[i]=roadH(i);
    const k = tw*(0.020*Math.sin(i*.021+ph1) + 0.012*Math.sin(i*.049+ph2) + 0.006*Math.sin(i*.09+ph3)) * smooth((i-30)/40);
    psi += k; x += Math.cos(psi); z += Math.sin(psi);
  }
  const at = s => { const i=clamp(Math.floor(s),0,N-1), f=clamp(s-i,0,1); return { x:cx[i]+(cx[i+1]-cx[i])*f, z:cz[i]+(cz[i+1]-cz[i])*f, psi:cpsi[i]+(cpsi[i+1]-cpsi[i])*f, h:ch[i]+(ch[i+1]-ch[i])*f }; };

  // ---- উচ্চতা-গ্রিড ----
  const CELL = 2.0, PAD = 110;
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9; for(let i=0;i<=N;i++){ minX=Math.min(minX,cx[i]); maxX=Math.max(maxX,cx[i]); minZ=Math.min(minZ,cz[i]); maxZ=Math.max(maxZ,cz[i]); }
  minX-=PAD; minZ-=PAD; maxX+=PAD; maxZ+=PAD;
  const nx=Math.ceil((maxX-minX)/CELL)+1, nz=Math.ceil((maxZ-minZ)/CELL)+1;
  // প্রতিটি গ্রিড-নোডের কাছের রাস্তার বিন্দু (centerline index) — একবারই হিসাব (দ্রুত)
  const nodeIdx=new Int32Array(nx*nz).fill(-1), nodeD=new Float32Array(nx*nz).fill(1e9), RADN=Math.ceil(125/CELL);
  for(let i=0;i<=N;i++){ const ci=Math.round((cx[i]-minX)/CELL), cj=Math.round((cz[i]-minZ)/CELL);
    for(let j=Math.max(0,cj-RADN);j<=Math.min(nz-1,cj+RADN);j++){ const pz=minZ+j*CELL, dz=pz-cz[i], row=j*nx;
      for(let q=Math.max(0,ci-RADN);q<=Math.min(nx-1,ci+RADN);q++){ const dx=minX+q*CELL-cx[i], d=dx*dx+dz*dz; if(d<nodeD[row+q]){ nodeD[row+q]=d; nodeIdx[row+q]=i; } } } }
  for(let k=0;k<nodeD.length;k++) nodeD[k]=Math.sqrt(nodeD[k]);
  const field = new Float32Array(nx*nz);
  const sideSign = s => Math.sin(s*0.011+seed*.7);      // কোন পাশে পাহাড় উঠবে (+ = বাঁ দিক)
  const gapFloor = new Map(); for(const g of gaps) gapFloor.set(g, roadH(g.s0-1)-15);
  function heightAtNode(px,pz,k){
    const i=nodeIdx[k]; if(i<0) return -60;
    const dx=px-cx[i], dz=pz-cz[i], d=Math.hypot(dx,dz);
    const tx=Math.cos(cpsi[i]), tz=Math.sin(cpsi[i]);
    const lat = dx*(-tz) + dz*tx;         // রাস্তার ডান দিক = (-sinψ, cosψ), তাই lat>0 ডান দিকে
    const ad = Math.abs(lat);
    const hr = ch[i];
    const sA = sideSign(i);
    const RR = smooth(.5+.9*sA), RL = smooth(.5-.9*sA);
    const R = lat>0 ? RR : RL;
    const e = Math.max(0, ad-ROAD_HALF-.8);
    const n = fbm(px*.03+3.1, pz*.03, 4);
    const rise = .62*Math.pow(e,1.22)*(.5+1.0*n);
    const fall = .75*Math.pow(e,1.08)*(.8+.5*fbm(px*.04,pz*.04,3));
    let h = hr + R*rise - (1-R)*Math.min(fall,48);
    h += (fbm(px*.08,pz*.08,3)-.4)*5*smooth((ad-6)/10);
    const g = inGapS(i);
    if(g){ const w = 1 - smooth((d-34)/14); h = h*(1-w) + (gapFloor.get(g))*w; }
    return h;
  }
  for(let j=0;j<nz;j++) for(let i=0;i<nx;i++) field[j*nx+i] = heightAtNode(minX+i*CELL, minZ+j*CELL, j*nx+i);

  // ---- উচ্চতা/ঢাল প্রশ্ন (ত্রিভুজ-ইন্টারপোলেশন; মেশের সাথে হুবহু এক বিভাজন) ----
  function hAt(px,pz){
    const u=(px-minX)/CELL, v=(pz-minZ)/CELL; const i=Math.floor(u), j=Math.floor(v);
    if(i<0||j<0||i>=nx-1||j>=nz-1) return -100;
    const fx=u-i, fz=v-j, h00=field[j*nx+i], h10=field[j*nx+i+1], h01=field[(j+1)*nx+i], h11=field[(j+1)*nx+i+1];
    return fz<=fx ? h00+(h10-h00)*fx+(h11-h10)*fz : h00+(h11-h01)*fx+(h01-h00)*fz;
  }

  // ---- কয়েন, ফুয়েল ক্যান, চেকপয়েন্ট ----
  const off=(p,o)=>({x:p.x-Math.sin(p.psi)*o, z:p.z+Math.cos(p.psi)*o});
  const coins=[]; for(let s=24;s<L-30;s+=7){ if(gaps.some(g=>s>g.s0-RAMP-4&&s<g.s0+g.w+3)) continue; const p=at(s), q=off(p,Math.sin(s*.17)*1.6); coins.push({s,x:q.x,z:q.z,y:hAt(q.x,q.z)+1.4,taken:false}); }
  const cans=[]; for(let s=70;s<L-40;s+=78){ if(gaps.some(g=>s>g.s0-RAMP-12&&s<g.s0+g.w+6)) continue; const p=at(s+3), q=off(p,(s%2?-1:1)*1.8); cans.push({s,x:q.x,z:q.z,y:hAt(q.x,q.z)+1.2,taken:false}); }
  const cps=[.25,.5,.75].map(f=>{ let s=Math.round(L*f); for(let i=0;i<40&&gaps.some(g=>s>g.s0-RAMP-14&&s<g.s0+g.w+LAND+4);i++) s+=3; return {s,hit:false}; });

  return { level,mapIdx,vehIdx,veh,map,L,levelD,seed,gaps,LIFT,RAMP,LAND,N,cx,cz,cpsi,ch,at,roadH,field,nx,nz,CELL,minX,minZ,maxX,maxZ,hAt,nodeIdx,nodeD,inGapS,coins,cans,cps,gapFloor,sideSign,off };
}

// ================================================================
// গাড়ির অবস্থা ও ফিজিক্স
// ================================================================
export function makeState(tr, s0=6){
  const v=tr.veh, p=tr.at(s0), ride=v.hub+v.R;
  return { x:p.x, z:p.z, y:tr.hAt(p.x,p.z)+ride+.2, vx:0, vy:0, vz:0, psi:p.psi, pitch:0, roll:0, pav:0,
    fuel:100, boostE:100, grounded:false, airT:0, airRot:0, crashed:false, reason:"", t:0,
    s:s0, lat:0, dist:0, flips:0, noFuelT:0, pen:0, spin:0, vf:0, steerV:0, wasAir:false, landed:0 };
}

const K_SPRING=64, C_DAMP=8.5;
function stepOnce(tr,S,inp,dt){
  const v=tr.veh, ride=v.hub+v.R;
  const cy=Math.cos(S.psi), sy=Math.sin(S.psi);
  const fx=cy, fz=sy, rx=-sy, rz=cy;                       // সামনে, ডান
  const boostOn = inp.boost && S.boostE>0;
  const hasFuel = S.fuel>0, gas = (inp.gas&&hasFuel)?1:0;
  const P = v.power*(boostOn?1.5:1), vmax=v.vmax*(boostOn?1.28:1);
  const hw=v.wb/2, tw=v.tw;
  S.steerV += (((inp.right?1:0)-(inp.left?1:0)) - S.steerV)*Math.min(1,dt*9);
  const gC=tr.hAt(S.x,S.z), gF=tr.hAt(S.x+fx*hw,S.z+fz*hw), gB=tr.hAt(S.x-fx*hw,S.z-fz*hw), gR=tr.hAt(S.x+rx*tw,S.z+rz*tw), gL=tr.hAt(S.x-rx*tw,S.z-rz*tw);
  const sf=(gF-gB)/v.wb, sr=(gR-gL)/(2*tw);
  const gMean=(gC*2+gF+gB+gR+gL)/6;
  const gx=sf*fx+sr*rx, gz=sf*fz+sr*rz;                    // ঢালের উপরমুখী গ্র্যাডিয়েন্ট (x,z)
  const d=S.y-gMean, pen=ride-d;
  const contact = pen>-0.12;
  let ax=0, ay=-G, az=0;
  const vf=S.vx*fx+S.vz*fz, vl=S.vx*rx+S.vz*rz;
  S.vf=vf;
  if(contact){
    const Fn = Math.max(0, K_SPRING*Math.max(0,pen) - C_DAMP*(S.vy - (gx*S.vx+gz*S.vz)));
    ay += Fn;
    const gm=Math.hypot(gx,gz);
    if(gm>1e-4){ const k=G*gm/(1+gm*gm); ax += -k*gx/gm; az += -k*gz/gm; }   // ঢাল বেয়ে গড়ানো
    const steep = Math.hypot(sf,sr), climbOK = steep<1.35 ? 1 : .08;
    const grip = v.grip*tr.map.grip;
    let aF=0;
    if(gas){ aF += P*Math.max(0,1-Math.max(0,vf)/vmax)*climbOK; if(vf<0) aF+=P*.8; }
    if(inp.brake){ if(vf>.6) aF -= P*1.2; else if(hasFuel) aF -= P*.7*Math.max(0,1-Math.abs(Math.min(0,vf))/(vmax*.4)); else aF -= Math.sign(vf)*Math.min(Math.abs(vf)*6,P); }
    if(!gas&&!inp.brake) aF -= vf*.16;
    aF -= vf*.035;
    if(boostOn) aF += 4.0;
    ax += aF*fx; az += aF*fz;
    const aL = clamp(-vl*8*grip, -12*grip, 12*grip);       // পাশের ঘর্ষণ (সামান্য ড্রিফট)
    ax += aL*rx; az += aL*rz;
    S.pen = clamp(pen,0,.9);
    const delta = S.steerV*.52/(1+.055*Math.abs(vf));
    S.psi += vf*Math.tan(delta)/v.wb*dt;
    const tp=Math.atan(sf), tr_=Math.atan(sr), k=Math.min(1,dt*9);
    if(S.wasAir){
      let dp=S.pitch-tp; dp=Math.atan2(Math.sin(dp),Math.cos(dp)); const dr=S.roll-tr_;
      if(Math.abs(dp)>1.25 || Math.abs(dr)>1.25){ S.crashed=true; S.reason="Rolled over!"; return; }
      S.landed=Math.abs(S.vy);
      const flips=Math.floor(Math.abs(S.airRot)/(Math.PI*2)+.0001); if(flips>=1) S.flips+=flips;
    }
    let dp=tp-S.pitch; dp=Math.atan2(Math.sin(dp),Math.cos(dp)); S.pitch += dp*k; S.roll += (tr_-S.roll)*k; S.pav=0;
    S.grounded=true; S.wasAir=false; S.airT=0; S.airRot=0;
    if(Math.abs(tr_)>1.1){ S.crashed=true; S.reason="Rolled over!"; return; }
  } else {
    const tilt=(inp.tiltBack?1:0)-(inp.tiltFwd?1:0);
    S.pav += tilt*7.5*dt; S.pav *= (1-.25*dt);
    S.pitch += S.pav*dt; S.airRot += S.pav*dt;
    S.roll *= (1-.8*dt);
    S.grounded=false; S.wasAir=true; S.airT+=dt; S.pen=0;
    S.psi += S.steerV*.4*dt;
    ax += -S.vx*.02; az += -S.vz*.02;
  }
  S.vx+=ax*dt; S.vy+=ay*dt; S.vz+=az*dt;
  S.x+=S.vx*dt; S.y+=S.vy*dt; S.z+=S.vz*dt;
  const g2=tr.hAt(S.x,S.z)+ride*.55; if(S.y<g2){ S.y=g2; if(S.vy<0) S.vy*=-.05; }
  S.spin=vf/v.R;
  const useF=(inp.gas?1.35:.3)*(boostOn?1.6:1); S.fuel=Math.max(0,S.fuel-useF*dt);
  if(boostOn) S.boostE=Math.max(0,S.boostE-34*dt); else S.boostE=Math.min(100,S.boostE+4*dt);
  S.t+=dt;
}

function progress(tr,S){
  let best=Math.floor(S.s), bd=1e18; const lo=Math.max(0,best-40), hi=Math.min(tr.N,best+60);
  for(let i=lo;i<=hi;i++){ const dx=S.x-tr.cx[i], dz=S.z-tr.cz[i], dd=dx*dx+dz*dz; if(dd<bd){ bd=dd; best=i; } }
  S.s=best; const tx=Math.cos(tr.cpsi[best]), tz=Math.sin(tr.cpsi[best]); S.lat=(S.x-tr.cx[best])*(-tz)+(S.z-tr.cz[best])*tx; S.dist=Math.sqrt(bd);
}

export function step(tr,S,inp,dt){
  if(S.crashed) return;
  const n=Math.max(1,Math.ceil(dt/(1/120))), h=dt/n;
  for(let i=0;i<n;i++){
    stepOnce(tr,S,inp,h); if(S.crashed) return;
    progress(tr,S);
    if(S.dist>46){ S.crashed=true; S.reason="Off the track!"; return; }
    const g=tr.inGapS(S.s);
    if(g && S.y < tr.gapFloor.get(g)+7){ S.crashed=true; S.reason="You fell into the gap!"; return; }
    if(S.y < -80){ S.crashed=true; S.reason="You fell off the mountain!"; return; }
    if(S.fuel<=0 && S.grounded && Math.hypot(S.vx,S.vz)<.4){ S.noFuelT+=h; if(S.noFuelT>1.5){ S.crashed=true; S.reason="Out of fuel!"; return; } } else S.noFuelT=0;
  }
}

export function collect(tr,S){
  const ev=[];
  for(const c of tr.coins){ if(!c.taken && Math.abs(c.s-S.s)<8){ const dx=c.x-S.x, dz=c.z-S.z, dy=c.y-(S.y+.5); if(dx*dx+dz*dz+dy*dy<2.6*2.6){ c.taken=true; ev.push({type:"coin",item:c}); } } }
  for(const c of tr.cans){ if(!c.taken && Math.abs(c.s-S.s)<8){ const dx=c.x-S.x, dz=c.z-S.z, dy=c.y-(S.y+.5); if(dx*dx+dz*dz+dy*dy<2.8*2.8){ c.taken=true; S.fuel=Math.min(100,S.fuel+45); ev.push({type:"fuel",item:c}); } } }
  tr.cps.forEach((cp,i)=>{ if(!cp.hit && S.s>=cp.s){ cp.hit=true; ev.push({type:"cp",item:cp,n:i+1}); } });
  if(S.s>=tr.L-1) ev.push({type:"finish"});
  return ev;
}

export function respawnAt(tr,S,cpS){ const n=makeState(tr,cpS); Object.assign(S,n); S.fuel=70; S.boostE=60; }
