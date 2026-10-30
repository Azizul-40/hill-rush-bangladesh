// Hill Rush Bangladesh 3D — গাড়ির 3D মডেল (সব কোডে বানানো; কোনো বাইরের মডেল নেই)।
// মডেল +x দিকে মুখ করা, চাকার অক্ষ z। গ্রুপের মূল বিন্দু = ফিজিক্সের COM; চাকা COM-এর (±wb/2, -hub) জায়গায়।
import * as THREE from 'three';
import { VEHICLES3D } from './physics3d.js';

// ---------- ছোট সাহায্যকারী ----------
const mat = (color, o={}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness:.6, metalness:.1 }, o));
const paint = (color, o={}) => new THREE.MeshPhysicalMaterial(Object.assign({ color, roughness:.32, metalness:.55, clearcoat:.8, clearcoatRoughness:.25 }, o));
const glass = () => new THREE.MeshPhysicalMaterial({ color:0x0b1620, roughness:.05, metalness:.2, clearcoat:1, envMapIntensity:1.6 });
const emissive = (c, i=2) => new THREE.MeshStandardMaterial({ color:c, emissive:c, emissiveIntensity:i, roughness:.3 });

function box(w,h,d,m,x=0,y=0,z=0){ const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); o.position.set(x,y,z); o.castShadow=true; o.receiveShadow=true; return o; }
function cyl(rt,rb,h,m,seg=24){ const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m); o.castShadow=true; o.receiveShadow=true; return o; }
// z-অক্ষ বরাবর সিলিন্ডার
function zcyl(r,len,m,seg=28){ const o=cyl(r,r,len,m,seg); o.rotation.x=Math.PI/2; return o; }

// পাশ থেকে দেখা আকার (x,y বিন্দু) থেকে ঘন বস্তু, z-এ depth, bevel সহ
function extrudeProfile(pts, depth, m, bevel=.1){
  const sh = new THREE.Shape(); pts.forEach((p,i)=> i? sh.lineTo(p[0],p[1]) : sh.moveTo(p[0],p[1])); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: depth-2*bevel, bevelEnabled:true, bevelThickness:bevel, bevelSize:bevel, bevelSegments:3, curveSegments:8 });
  g.translate(0,0,-(depth-2*bevel)/2);
  const o = new THREE.Mesh(g,m); o.castShadow=true; o.receiveShadow=true; return o;
}
// পাশের জানালার সমতল আকার (z-তে সামান্য বাইরে)
function sidePanel(pts, z, m){
  const sh = new THREE.Shape(); pts.forEach((p,i)=> i? sh.lineTo(p[0],p[1]) : sh.moveTo(p[0],p[1])); sh.closePath();
  const o = new THREE.Mesh(new THREE.ShapeGeometry(sh), m); o.position.z = z; if(z<0) o.rotation.y = Math.PI; return o;
}

function labelTexture(text, w=512, h=128, bg="#0a3d1c", fg="#ffffff", font="bold 64px 'Noto Sans Bengali','Siyam Rupali',Arial,sans-serif"){
  const c=document.createElement("canvas"); c.width=w; c.height=h; const g=c.getContext("2d");
  g.fillStyle=bg; g.fillRect(0,0,w,h); g.fillStyle=fg; g.font=font; g.textAlign="center"; g.textBaseline="middle"; g.fillText(text,w/2,h/2+4);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=4; return t;
}

// ---------- চাকা ----------
const tireMat = mat(0x14171a,{roughness:.95,metalness:0});
const rimMat = mat(0xb9c2c9,{roughness:.3,metalness:.9});
function monsterWheel(R, width){
  const g=new THREE.Group();
  const tire=zcyl(R*.93,width,tireMat,36); g.add(tire);
  // বড় ট্রেড-লাগ (কাদা-টায়ারের মতো)
  const lugGeo=new THREE.BoxGeometry(R*.2,R*.16,width*1.02);
  const n=22;
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const l=new THREE.Mesh(lugGeo,tireMat); l.position.set(Math.cos(a)*R*.95,Math.sin(a)*R*.95,0); l.rotation.z=a; l.castShadow=true; g.add(l); }
  const rim=zcyl(R*.52,width*1.04,rimMat,28); g.add(rim);
  const hub=zcyl(R*.2,width*1.12,mat(0x555d63,{metalness:.9,roughness:.3}),16); g.add(hub);
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; const b=zcyl(R*.035,width*1.16,rimMat,8); b.position.set(Math.cos(a)*R*.33,Math.sin(a)*R*.33,0); g.add(b); }
  // কাদার ছোপ (গাঢ় বাদামি রিং)
  const mud=zcyl(R*.96,width*.2,mat(0x4a3320,{roughness:1}),24); mud.position.z=width*.38; g.add(mud);
  return g;
}
function plainWheel(R, width, hubColor=0xd8dde0){
  const g=new THREE.Group();
  g.add(zcyl(R,width,tireMat,32));
  const rim=zcyl(R*.62,width*1.05,mat(hubColor,{metalness:.8,roughness:.35}),24); g.add(rim);
  const cap=zcyl(R*.2,width*1.12,mat(0x7a838a,{metalness:.9,roughness:.3}),12); g.add(cap);
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; const s=box(R*.5,R*.07,width*1.08,mat(0x333a40,{metalness:.7})); s.position.set(Math.cos(a)*R*.3,Math.sin(a)*R*.3,0); s.rotation.z=a; g.add(s); }
  return g;
}
function spokeWheel(R){
  const g=new THREE.Group();
  const tire=new THREE.Mesh(new THREE.TorusGeometry(R,R*.07,10,40),tireMat); tire.castShadow=true; g.add(tire);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(R*.9,R*.025,6,36),rimMat); g.add(rim);
  const sp=mat(0xcfd6db,{metalness:.9,roughness:.3});
  for(let i=0;i<24;i++){ const a=i/24*Math.PI*2; const s=cyl(R*.006,R*.006,R*.9,sp,4); s.position.set(Math.cos(a)*R*.45,Math.sin(a)*R*.45,0); s.rotation.z=a+Math.PI/2; g.add(s); }
  g.add(zcyl(R*.07,R*.14,mat(0x888f94,{metalness:.9}),10));
  return g;
}

// ---------- মনস্টার ট্রাক (পোস্টারের লাল ট্রাকের ধাঁচে) ----------
function buildTruck(color){
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body);
  const P=paint(color), dark=mat(0x1b1f23,{roughness:.55,metalness:.4}), chrome=mat(0xcfd5da,{metalness:1,roughness:.2});
  const prof=[[-2.3,0],[2.35,0],[2.5,.45],[2.46,1.05],[1.35,1.2],[.82,1.28],[.2,2.02],[-.95,2.06],[-1.08,1.3],[-1.12,1.1],[-2.3,1.1]];
  body.add(extrudeProfile(prof,2.1,P,.12));
  // চেসিস, নিচের কালো প্যানেল, রোল-বার
  body.add(box(4.6,.28,1.5,dark,.0,.0,0));
  const rb=mat(0x20262c,{metalness:.6}); for(const z of [-.85,.85]){ const bar=cyl(.05,.05,1.3,rb,8); bar.position.set(-1.9,1.75,z); bar.rotation.z=.12; body.add(bar); }
  const topbar=zcyl(.05,1.8,rb,8); topbar.position.set(-1.98,2.38,0); body.add(topbar);
  // জানালা
  const gm=glass();
  body.add(sidePanel([[.62,1.34],[.18,1.9],[-.2,1.9],[-.2,1.34]],1.17,gm));
  body.add(sidePanel([[-.3,1.34],[-.3,1.9],[-.88,1.92],[-.98,1.34]],1.17,gm));
  body.add(sidePanel([[.62,1.34],[.18,1.9],[-.2,1.9],[-.2,1.34]],-1.17,gm));
  body.add(sidePanel([[-.3,1.34],[-.3,1.9],[-.88,1.92],[-.98,1.34]],-1.17,gm));
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.78),gm); ws.position.set(.52,1.67,0); ws.rotation.set(0,Math.PI/2,0); ws.rotation.order="YXZ"; ws.rotateX(0);
  ws.rotation.set(0,Math.PI/2,0); const wsPivot=new THREE.Group(); wsPivot.position.set(.5,1.66,0); wsPivot.rotation.z=-.92; ws.position.set(0,0,0); wsPivot.add(ws); ws.rotation.set(0,Math.PI/2,0); body.add(wsPivot);
  // সামনে: গ্রিল, বাম্পার, বুল-বার, হেডলাইট
  body.add(box(.12,.55,1.75,dark,2.52,.62,0));
  body.add(box(.34,.26,2.1,chrome,2.62,.25,0));
  const bull=mat(0x15191c,{metalness:.7,roughness:.4});
  for(const z of [-.7,.7]){ const b=cyl(.06,.06,.9,bull,8); b.position.set(2.78,.7,z); body.add(b); }
  const bar=zcyl(.07,1.7,bull,8); bar.position.set(2.8,1.12,0); body.add(bar);
  for(const z of [-.78,.78]){ const h=emissive(0xfff4cf,3); const hl=box(.1,.22,.42,h,2.54,.9,z); body.add(hl); const ring=box(.06,.3,.5,chrome,2.52,.9,z); body.add(ring); }
  // ছাদে লাইট-বার
  const lb=box(.28,.16,1.8,dark,.25,2.2,0); lb.position.set(.2,2.15,0); body.add(lb);
  for(let i=0;i<6;i++){ body.add(box(.1,.1,.22,emissive(0xffffff,3),.34,2.15,-.7+i*.28)); }
  // পেছনে লাইট ও এক্সহস্ট
  for(const z of [-.85,.85]){ body.add(box(.08,.22,.3,emissive(0xff2020,1.5),-2.32,.85,z)); }
  for(const z of [-1.12,1.12]){ const ex=cyl(.07,.07,1.1,chrome,10); ex.position.set(-.95,1.7,z); body.add(ex); }
  // সাইড মিরর, ফেন্ডার-ফ্লেয়ার
  for(const z of [-1.3,1.3]){ body.add(box(.12,.2,.08,dark,.5,1.5,z)); }
  const flare=mat(0x15191c,{roughness:.8});
  for(const x of [-1.7,1.7]) for(const z of [-1.1,1.1]) body.add(box(1.5,.1,.3,flare,x,.35,z));
  // নম্বর প্লেট (পেছনে)
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.7,.26),new THREE.MeshStandardMaterial({map:labelTexture("HR-BD",256,96,"#f5f2e8","#111","bold 54px Arial")})); plate.position.set(-2.4,.55,0); plate.rotation.y=-Math.PI/2; body.add(plate);
  body.position.y=.05;
  // সাসপেনশন-শক (দেখনদারি)
  const shock=mat(0xe0a020,{metalness:.8,roughness:.3});
  for(const x of [-1.7,1.7]) for(const z of [-.7,.7]){ const s=cyl(.06,.06,.7,shock,8); s.position.set(x,-.2,z); body.add(s); }
  return { root, body, makeWheel:()=>monsterWheel(.95,.95), wheelZ:[1.25], single:false };
}

// ---------- বাস (ঢাকা–চট্টগ্রাম ধাঁচে সাদা-সবুজ) ----------
function buildBus(color){
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body);
  const white=paint(0xf1f4f2,{metalness:.2,roughness:.45}), green=paint(0x0f8a3f,{metalness:.3}), red=paint(0xc8202a), dark=mat(0x1a1d20,{roughness:.6});
  const L=9.0, Hh=2.95;
  const prof=[[-L/2,.1],[L/2-.2,.1],[L/2+.05,.5],[L/2+.05,1.9],[L/2-.5,2.9],[L/2-1.0,Hh],[-L/2+.2,Hh],[-L/2,2.8]];
  body.add(extrudeProfile(prof,2.5,white,.14));
  // সবুজ ডোরা ও লাল ডোরা
  for(const z of [-1.27,1.27]){ body.add(box(L-.4,.42,.04,green,-.1,.85,z)); body.add(box(L-.4,.12,.04,red,-.1,1.18,z)); }
  // জানালা-সারি
  const gm=glass();
  for(const z of [-1.27,1.27]){ body.add(box(L-2.0,.95,.03,gm,-.55,1.95,z)); for(let i=0;i<9;i++) body.add(box(.07,.95,.05,white,-4.4+ i*.98,1.95,z+(z>0?.01:-.01))); }
  // সামনের কাঁচ + গন্তব্য-বোর্ড
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.15),gm); ws.position.set(L/2-.18,2.2,0); ws.rotation.y=Math.PI/2; ws.rotation.x=0;
  const wp=new THREE.Group(); wp.position.set(L/2-.1,2.2,0); wp.rotation.z=-.22; ws.position.set(0,0,0); wp.add(ws); body.add(wp);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.34),new THREE.MeshStandardMaterial({map:labelTexture("ঢাকা–চট্টগ্রাম",512,100,"#111","#ffcc33","bold 56px 'Noto Sans Bengali','Siyam Rupali',Arial,sans-serif"),emissive:0x332200,emissiveIntensity:.6})); board.position.set(L/2+.0,2.82,0); board.rotation.y=Math.PI/2; board.rotation.z=0; board.rotation.x=0;
  const bp=new THREE.Group(); bp.position.set(L/2-.55,2.78,0); bp.add(board); board.position.set(.56,0,0); body.add(bp);
  // পাশের নাম
  for(const z of [-1.27,1.27]){ const t=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.4),new THREE.MeshStandardMaterial({map:labelTexture("মুড়ির টিন",512,100,"#0f8a3f","#fff","bold 64px 'Noto Sans Bengali','Siyam Rupali',Arial,sans-serif")})); t.position.set(-.5,.85,z+(z>0?.03:-.03)); if(z<0)t.rotation.y=Math.PI; body.add(t); }
  // সামনের বাম্পার, লাইট, বড় সাইড-মিরর
  body.add(box(.3,.34,2.5,dark,L/2+.15,.35,0));
  for(const z of [-.9,.9]) body.add(box(.1,.28,.5,emissive(0xfff4cf,2.5),L/2+.07,.95,z));
  for(const z of [-1.5,1.5]){ body.add(box(.1,.5,.12,dark,L/2-.9,2.0,z)); }
  for(const z of [-.9,.9]) body.add(box(.08,.26,.4,emissive(0xff2020,1.4),-L/2-.02,.9,z));
  // ছাদের মালপত্র ও র‍্যাক
  const rack=mat(0x333,{metalness:.5}); body.add(box(5,.05,2,rack,-.8,Hh+.3,0));
  const lug=[[0x7a5a3a,1.2,.6,1.0,-2.6],[0x3a6a8a,1.0,.5,.9,-1.2],[0x9a3a3a,1.4,.7,1.1,.4],[0xb59a50,1.0,.5,1.0,1.8]];
  lug.forEach(([c,w,h,d,x])=>body.add(box(w,h,d,mat(c,{roughness:.9}),x,Hh+.6,0)));
  // নম্বর প্লেট
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.8,.28),new THREE.MeshStandardMaterial({map:labelTexture("DHAKA-METRO",256,96,"#f5f2e8","#111","bold 36px Arial")})); plate.position.set(L/2+.31,.62,0); plate.rotation.y=Math.PI/2; body.add(plate);
  body.position.y=.45;
  return { root, body, makeWheel:()=>plainWheel(.66,.5), wheelZ:[1.1], single:false, dual:true };
}

// ---------- সিএনজি অটোরিকশা (সবুজ) ----------
function buildCNG(color){
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body);
  const green=paint(0x1f9d55,{metalness:.3}), yel=paint(0xffd23a,{metalness:.3}), dark=mat(0x1b1f23,{roughness:.6}), gm=glass();
  const prof=[[-1.5,.15],[1.4,.15],[1.55,.55],[1.1,1.1],[.7,1.25],[.6,1.7],[-1.35,1.75],[-1.5,1.2]];
  body.add(extrudeProfile(prof,1.5,green,.1));
  body.add(box(2.7,.28,1.52,yel,-.1,.55,0));                 // হলুদ ডোরা
  // ছাদ (ক্যানভাস/টিন) — সামান্য বাইরে ঝুঁকে
  body.add(box(2.35,.1,1.62,mat(0x14532d,{roughness:.8}),-.35,1.78,0));
  // খাঁচার গ্রিল (পাশে)
  const grille=mat(0x222,{metalness:.7});
  for(const z of [-.8,.8]) for(let i=0;i<7;i++) body.add(box(.03,.62,.03,grille,-1.15+i*.28,1.35,z));
  for(const z of [-.8,.8]) body.add(box(1.9,.03,.03,grille,-.2,1.62,z));
  // সামনের কাঁচ ও হেডলাইট
  const ws=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.6),gm); const wp=new THREE.Group(); wp.position.set(.65,1.48,0); wp.rotation.z=-.3; ws.rotation.y=Math.PI/2; wp.add(ws); body.add(wp);
  body.add(box(.08,.2,.3,emissive(0xfff4cf,3),1.58,.7,0));
  body.add(box(.12,.18,.9,mat(0xcccccc,{metalness:1,roughness:.25}),1.62,.3,0));
  // পেছনের লাইট, নম্বর প্লেট
  for(const z of [-.6,.6]) body.add(box(.06,.18,.2,emissive(0xff2020,1.4),-1.52,.65,z));
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(.55,.2),new THREE.MeshStandardMaterial({map:labelTexture("HR-BD",256,96,"#f5f2e8","#111","bold 50px Arial")})); plate.position.set(-1.53,.4,0); plate.rotation.y=-Math.PI/2; body.add(plate);
  body.position.y=.55;
  return { root, body, makeWheel:()=>plainWheel(.4,.26,0xd9dde0), wheelZ:[.62], single:false, front1:true };
}

// ---------- রিকশা (রঙিন হুড) ----------
function buildRickshaw(color){
  const root=new THREE.Group(), body=new THREE.Group(); root.add(body);
  const pink=paint(0xe53b6a,{metalness:.2}), yel=paint(0xffd23a,{metalness:.2}), blue=paint(0x2a6fdb,{metalness:.2}), dark=mat(0x1b1f23,{roughness:.6});
  const frame=mat(0x2b2b2b,{metalness:.7,roughness:.4});
  // বসার জায়গা (সীট) ও পেছনের কাঠামো
  body.add(box(1.1,.16,1.0,pink,-.45,.62,0));
  body.add(box(.12,.7,1.0,pink,-.98,.98,0));
  // হুড (আধা-সিলিন্ডার, নকশা-করা)
  const hoodTex=(()=>{ const c=document.createElement("canvas"); c.width=256;c.height=128;const g=c.getContext("2d"); const cols=["#e53b6a","#ffd23a","#2a6fdb","#1f9d55"]; for(let i=0;i<16;i++){ g.fillStyle=cols[i%4]; g.fillRect(i*16,0,16,128);} g.fillStyle="rgba(255,255,255,.7)"; for(let i=0;i<8;i++){ g.beginPath(); g.arc(i*32+16,64,9,0,6.3); g.fill(); } const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t; })();
  const hood=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1.2,28,1,true,Math.PI/2,Math.PI),new THREE.MeshStandardMaterial({map:hoodTex,side:THREE.DoubleSide,roughness:.6}));
  hood.rotation.x=Math.PI/2; hood.position.set(-.5,.75,0); hood.castShadow=true; body.add(hood);
  // হুডের দুই পাশের ঢাকনা (রঙিন অর্ধবৃত্ত)
  for(const z of [-.6,.6]){ const cap=new THREE.Mesh(new THREE.CircleGeometry(.8,24,0,Math.PI),new THREE.MeshStandardMaterial({color:0xe53b6a,side:THREE.DoubleSide,roughness:.6})); cap.position.set(-.5,.75,z); body.add(cap); }
  // সামনের প্যানেল ও ফ্রেম
  body.add(box(.1,.5,1.05,yel,.15,.85,0));
  const fr=cyl(.035,.035,1.8,frame,8); fr.rotation.z=Math.PI/2-.12; fr.position.set(.55,.55,0); body.add(fr);
  const fork=cyl(.03,.03,.9,frame,8); fork.position.set(1.0,.7,0); fork.rotation.z=-.3; body.add(fork);
  const hb=zcyl(.025,.8,frame,8); hb.position.set(.85,1.15,0); body.add(hb);
  // হেডলাইট ও ঘণ্টা
  body.add(box(.08,.12,.2,emissive(0xfff4cf,2.5),1.12,.95,0));
  // পেছনের রঙিন ঝালর
  body.add(box(.05,.5,1.0,mat(0xff8a1f,{roughness:.8}),-1.05,.55,0));
  body.position.y=.25;
  return { root, body, makeWheel:()=>spokeWheel(.44), wheelZ:[.55], single:false, front1:true };
}

const BUILDERS = { truck:buildTruck, bus:buildBus, cng:buildCNG, rickshaw:buildRickshaw };

// ---------- গাড়ি তৈরি: { group, setPose(S), dispose } ----------
export function createVehicle(vehIdx, colorOverride){
  const spec = VEHICLES3D[vehIdx] || VEHICLES3D[0];
  const b = BUILDERS[spec.id](colorOverride ?? 0xd8262b);
  const group = new THREE.Group(); group.add(b.root);
  const wheels = [new THREE.Group(), new THREE.Group()]; // [পেছন, সামনে]; প্রতিটার ভেতরে z-বরাবর কয়েকটা চাকা থাকতে পারে
  const spinners = [[],[]];
  const mkSet = (i, zs, R) => {
    for(const z of zs){ const w = b.makeWheel(); w.position.z = z; wheels[i].add(w); spinners[i].push(w); }
    wheels[i].position.set((i? 1:-1)*spec.wb/2, -spec.hub, 0);
    group.add(wheels[i]);
  };
  const zs = b.wheelZ;
  if(b.front1){ mkSet(0, zs.flatMap(z=>[z,-z]), spec.R); mkSet(1, [0], spec.R); }
  else mkSet(0, zs.flatMap(z=>[z,-z]), spec.R), mkSet(1, zs.flatMap(z=>[z,-z]), spec.R);
  // ছায়াসহ অ্যাক্সেল-রড দেখনদারি
  const axleMat = mat(0x202428,{metalness:.7,roughness:.5});
  for(let i=0;i<2;i++){ const ax=zcyl(.06,(b.front1&&i===1)?.2:(zs[0]*2),axleMat,8); wheels[i].add(ax); }

  let spin=[0,0];
  function setPose(S, dt){
    group.position.set(S.x, S.y, 0); group.rotation.z = S.ang;
    for(let i=0;i<2;i++){
      const W = S.wheels[i];
      spin[i] -= W.spin*dt; // সামনে চললে চাকা ঘড়ির কাঁটার দিকে
      for(const w of spinners[i]) w.rotation.z = spin[i];
      wheels[i].position.y = -spec.hub + Math.min(.6, W.pen); // spring-এ ঢুকলে চাকা ওপরে ওঠে (সাসপেনশন)
    }
  }
  function dispose(){ group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); if(o.material){ const m=Array.isArray(o.material)?o.material:[o.material]; m.forEach(x=>{ if(x.map) x.map.dispose(); x.dispose(); }); } }); }
  return { group, setPose, dispose, spec, body: b.body, wheels, spinners };
}

// ঐচ্ছিক: 3d/models/<id>.glb থাকলে সেটা কোডে-বানানো শরীরের বদলে বসে (চাকা আলাদা না থাকলে ঘোরে না)।
// সাবধান: এই পথটা এখনো কোনো আসল .glb দিয়ে পরীক্ষা করা হয়নি।
export async function tryLoadGLB(vehicle, vehIdx){
  const spec = VEHICLES3D[vehIdx]; const url = `./3d/models/${spec.id}.glb`;
  try{
    const head = await fetch(url, { method:"HEAD" }); if(!head.ok) return false;
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const gltf = await new GLTFLoader().loadAsync(url);
    const m = gltf.scene; const bb = new THREE.Box3().setFromObject(m); const size = bb.getSize(new THREE.Vector3());
    const targetLen = spec.wb + spec.R*2 + 1.2; const k = targetLen / Math.max(size.x, size.z);
    m.scale.setScalar(k); const bb2 = new THREE.Box3().setFromObject(m); const c = bb2.getCenter(new THREE.Vector3());
    m.position.set(-c.x, -(spec.hub+spec.R) - bb2.min.y + (bb2.min.y - bb2.min.y), -c.z); m.position.y = -(spec.hub+spec.R) - bb2.min.y;
    m.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
    vehicle.group.children.slice().forEach(ch=>vehicle.group.remove(ch)); vehicle.group.add(m);
    return true;
  }catch(e){ return false; }
}
