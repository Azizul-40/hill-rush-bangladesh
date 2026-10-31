// Hill Rush Bangladesh — ২D গেমের জন্য আসল ৩D মনস্টার ট্রাক।
// মডেল: "Free Monster Truck" — Steel Cyclone Studios (Gumroad, $0, বাণিজ্যিক/অবাণিজ্যিক ব্যবহারের অনুমতি)।
// FBX থেকে GLB-তে রূপান্তর ও ~১.৮ লাখ থেকে ~২৭ হাজার ত্রিভুজে হালকা করা হয়েছে (models/monster_truck.glb)।
// কাজ: ছোট একটা অফস্ক্রিন WebGL ক্যানভাসে ট্রাকটা পাশ থেকে (একটু উপর-সামনে থেকে) আঁকা হয়, চাকা ঘোরে ও সাসপেনশনে
// ওঠানামা করে, তারপর ২D গেম সেই ছবিটা ট্রাকের জায়গায় বসায়। WebGL না থাকলে বা লোড না হলে আগের ২D ট্রাকই দেখায়।
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const T = { ready:false };
window.V3DTruck = T;

const CW = 300, CH = 210;                 // CSS px — ক্যানভাসের মাপ
let renderer, scene, camera, model, pivots = [], paints = [], curColor = null, map = null, DPRr = 1;

function init(){
  const c = document.createElement('canvas');
  renderer = new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:true, preserveDrawingBuffer:true, powerPreference:'low-power' });
  DPRr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(DPRr); renderer.setSize(CW, CH, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x6a5a48, 1.25));
  const sun = new THREE.DirectionalLight(0xffffff, 2.4); sun.position.set(-3, 6, 5); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xbfd8ff, .7); rim.position.set(4, 2, -4); scene.add(rim);
  new GLTFLoader().load('models/monster_truck.glb', g => { try{ setup(g.scene); }catch(e){ console.warn('3D truck setup failed', e); } }, undefined, e => console.warn('3D truck load failed', e));
}

function setup(root){
  model = new THREE.Group(); scene.add(model);
  root.rotation.y = Math.PI/2;              // মডেলের সামনে (+z) → গেমের সামনে (+x)
  model.add(root); model.updateMatrixWorld(true);
  // মাপ ঠিক করা: পুরো দৈর্ঘ্য = ১ একক
  let box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
  const s = 1 / size.x; root.scale.setScalar(s); model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root); const ctr = box.getCenter(new THREE.Vector3());
  root.position.sub(ctr); model.updateMatrixWorld(true);
  // উপাদান: নরমাল আবার হিসাব (হালকা করার সময় বাদ দেওয়া হয়েছিল), রংয়ের অংশ চেনা
  const meshes = [];
  root.traverse(o => { if(!o.isMesh) return; meshes.push(o);
    if(!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => { if(!m) return; m.flatShading = false; m.side = THREE.FrontSide;
      const n = (m.name||'');
      if(/0024_Ora|Color_B0|TrunkBed:Color_C0/.test(n)){ if(!paints.includes(m)){ paints.push(m); m.roughness = .35; m.metalness = .35; } }
      else { if(m.roughness===undefined||m.roughness>.9) m.roughness = .7; }
      m.needsUpdate = true; }); });
  // চাকা: "Tire" নামের ৪টা মেশ; প্রতিটার চারপাশের রিম/হাব একই পিভটে
  model.updateMatrixWorld(true);
  // "Tire" নামের অংশগুলোকে কেন্দ্র অনুযায়ী ৪টা চাকায় ভাগ করা হয় (প্রতিটা চাকায় টায়ার + রিমের কয়েকটা অংশ)
  const tireParts = meshes.filter(m => /Tire/.test(m.name)).map(m => { const b = new THREE.Box3().setFromObject(m); return { m, b, c: b.getCenter(new THREE.Vector3()), R: (b.max.y-b.min.y)/2 }; });
  const clusters = [];
  for(const t of tireParts){ let cl = clusters.find(c => Math.hypot(c.c.x-t.c.x, c.c.y-t.c.y) < .05 && Math.abs(c.c.z-t.c.z) < .09); if(!cl){ cl = { c:t.c.clone(), parts:[], R:0, box:new THREE.Box3() }; clusters.push(cl); }
    cl.parts.push(t); cl.box.union(t.b); if(t.R > cl.R){ cl.R = t.R; cl.c.copy(t.c); } }
  for(const cl of clusters){
    const pv = new THREE.Group(); pv.position.copy(cl.c); model.add(pv); model.updateMatrixWorld(true);
    const grow = cl.box.clone().expandByScalar(.004);
    for(const m of meshes){ if(m.userData.wheel!==undefined) continue; const bb = new THREE.Box3().setFromObject(m);
      if(cl.parts.some(t=>t.m===m) || (grow.containsBox(bb) && !/Knuckle|Shock|Group\d|Axle|Link|Sway/.test(m.name))){ m.userData.wheel = 1; pv.attach(m); } }
    pivots.push({ pv, c: cl.c, R: cl.R, front: cl.c.x > 0, near: cl.c.z > 0, baseY: cl.c.y });
  }
  // ক্যামেরা: পাশ থেকে, একটু সামনে-উপরে (৩/৪ ভাব), অর্থোগ্রাফিক যাতে মাপ সহজে মেলে
  const half = .62, aspect = CW/CH;
  camera = new THREE.OrthographicCamera(-half, half, half/aspect, -half/aspect, .1, 20);
  camera.position.set(.55, .62, 3.2); camera.lookAt(0, -.02, 0); camera.updateMatrixWorld(true); camera.updateProjectionMatrix();
  // ২D-র সাথে মেলানো: কাছের দুই চাকার কেন্দ্র ক্যানভাসের কোথায় পড়ে
  const near = pivots.filter(p => p.near), rear = near.find(p => !p.front), front = near.find(p => p.front);
  const proj = v => { const q = v.clone().project(camera); return [ (q.x+1)/2*CW, (1-q.y)/2*CH ]; };
  const pr = proj(rear.c), pf = proj(front.c), Rpx = rear.R * (CH / (2*half/aspect));
  const top = proj(new THREE.Vector3(box.max.x - .02, box.min.y + (box.max.y-box.min.y)*.62 - ctr.y, .12));
  map = { pr, pf, Rpx, lamp: top };
  T.map = map; T.pivots = pivots.map(p=>({c:p.c.toArray().map(v=>+v.toFixed(3)),R:+p.R.toFixed(3),front:p.front,near:p.near}));
  T.ready = true;
}

// opts: {color:"#rrggbb", spin, rs, fs, wb(পিক্সেলে কাঙ্ক্ষিত হুইলবেস), rc:[x,y] (২D-তে পেছনের চাকার কেন্দ্র)}
T.render = function(opts){
  if(!T.ready) return null;
  if(opts.color && opts.color !== curColor){ curColor = opts.color; const col = new THREE.Color(opts.color); paints.forEach(m => m.color.copy(col)); }
  // ২D পিক্সেল → ৩D একক
  const f = opts.wb / Math.hypot(map.pf[0]-map.pr[0], map.pf[1]-map.pr[1]);   // ক্যানভাস px → ২D px
  const unitPx = (CH / (2*.62/(CW/CH))) * f;                                  // ৩D একক → ২D px
  for(const p of pivots){
    p.pv.rotation.z = -(opts.spin||0);
    const off = (p.front ? opts.fs : opts.rs) || 0;
    p.pv.position.y = p.baseY - off/unitPx;
  }
  renderer.render(scene, camera);
  const [rx, ry] = opts.rc;
  return { canvas: renderer.domElement, dx: rx - map.pr[0]*f, dy: ry - map.pr[1]*f, dw: CW*f, dh: CH*f, lamp:[rx+(map.lamp[0]-map.pr[0])*f, ry+(map.lamp[1]-map.pr[1])*f], R: map.Rpx*f };
};


// ============================================================
// v27 — বাংলাদেশি যানবাহনের আসল ৩D মডেল (CNG, রিকশা, ইজি বাইক, বাস)। ক্রেডিট: docs/ASSET_CREDITS.md
// মডেলগুলো আগে থেকেই প্রস্তুত: সামনে +x, উপরে +y, মাটি y=0; চাকা আলাদা নোডে (wheel_rear / wheel_front),
// নোডের extras-এ চাকার কেন্দ্র, ব্যাসার্ধ, হেডলাইটের জায়গা, রং বদলের নিয়ম।
// প্রথমবার দরকার হলে লোড হয়; লোড না হওয়া পর্যন্ত গেম আগের ২D ছবিই দেখায়।
// ============================================================
// lamp = হেডলাইটের আসল জায়গা (মডেল-একক, x সামনে, y মাটি থেকে উপরে) — পাশ থেকে গ্রিড-রেন্ডার মেপে বসানো।
// রিকশায় আসল বাতি নেই, তাই হ্যান্ডেলের সামনে একটা ছোট বাতি (bulb) বসানো হয়।
const VEH = {
  cng:      { file:'models/cng.glb',      Rt:14, lamp:[0.99, 0.84] },   // Rt = পেছনের চাকার ব্যাসার্ধ, গেমের পিক্সেলে (এটাই মাপ ঠিক করে)
  rickshaw: { file:'models/rickshaw.glb', Rt:23, lamp:[1.56, 2.58], bulb:0.07 },
  ebike:    { file:'models/ebike.glb',    Rt:17, lamp:[1.17, 1.09] },
  bus:      { file:'models/bus.glb',      Rt:10, lamp:[11.15, 3.2] }
};
const vrec = {};
const VDIR = new THREE.Vector3(.17, .2, 1).normalize();   // ক্যামেরা: পাশ থেকে, একটু সামনে-উপরে
const PAINT_GLSL = `
vec3 v27hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1e-6; return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x); }
vec3 v27rgb(vec3 c){ vec3 p=abs(fract(c.xxx+vec3(1.,2./3.,1./3.))*6.-3.); return c.z*mix(vec3(1.),clamp(p-1.,0.,1.),c.y); }
`;
function hexHSV(hex){ const c=new THREE.Color(hex); const o={}; c.getHSL(o); const r=c.r,g=c.g,b=c.b; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); return new THREE.Vector3(o.h, mx>0?(mx-mn)/mx:0, mx); }
function addPaint(m, rule, U){
  m.onBeforeCompile = sh => {
    sh.uniforms.uPaintOn = U.on; sh.uniforms.uPaint = U.hsv; sh.uniforms.uPaintRgb = U.rgb;
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uPaintOn; uniform vec3 uPaint; uniform vec3 uPaintRgb;\n'+PAINT_GLSL+'void main() {')
      .replace('#include <color_fragment>', `#include <color_fragment>
      if(uPaintOn>.5){ vec3 sc=pow(max(diffuseColor.rgb,vec3(0.)),vec3(1./2.2)); vec3 h=v27hsv(sc); vec3 o=sc;
        ${rule.white
          ? `float w=smoothstep(.55,.72,h.z)*(1.-smoothstep(.10,.24,h.y)); o=mix(sc, pow(uPaintRgb,vec3(1./2.2))*h.z*1.05, w);`
          : `float dh=abs(h.x-${(+rule.h).toFixed(3)}); dh=min(dh,1.-dh); float w=(1.-smoothstep(${(rule.r*.6).toFixed(3)},${(+rule.r).toFixed(3)},dh))*smoothstep(.16,.32,h.y);
             vec3 n=v27rgb(vec3(uPaint.x, clamp(mix(h.y,uPaint.y,.7),0.,1.), clamp(h.z*mix(1.,uPaint.z/.8,.7),0.,1.))); o=mix(sc,n,w);`}
        diffuseColor.rgb=pow(o,vec3(2.2)); }`);
  };
  m.customProgramCacheKey = () => 'v27paint'+JSON.stringify(rule);
  m.needsUpdate = true;
}
function loadVeh(kind){
  if(vrec[kind]) return vrec[kind];
  const cfg = VEH[kind]; if(!cfg || !renderer) return null;
  const rec = vrec[kind] = { ready:false, failed:false };
  new GLTFLoader().load(cfg.file, g => { try{ setupVeh(rec, cfg, g.scene); }catch(e){ rec.failed = true; console.warn('3D '+kind+' setup failed', e); } },
    undefined, e => { rec.failed = true; console.warn('3D '+kind+' load failed', e); });
  return rec;
}
function setupVeh(rec, cfg, root){
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xeef4ff, 0x6a5a48, 1.45));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3); sun.position.set(-3, 6, 5); sc.add(sun);
  const rim = new THREE.DirectionalLight(0xbfd8ff, .6); rim.position.set(4, 2, -4); sc.add(rim);
  const veh = root.getObjectByName('veh') || root; const ex = veh.userData || {};
  if(!ex.wheels || !ex.wheels.rear || !ex.wheels.front) throw new Error('model extras missing');
  const s = cfg.Rt / ex.wheels.rear.R;                    // ১ মডেল-একক = s গেম-পিক্সেল
  const midX = (ex.wheels.rear.c[0] + ex.wheels.front.c[0]) / 2;
  const holder = new THREE.Group(); holder.scale.setScalar(s); holder.position.x = -midX*s; holder.add(root); sc.add(holder);
  const U = { on:{value:0}, hsv:{value:new THREE.Vector3()}, rgb:{value:new THREE.Color()} };
  root.traverse(o => { if(!o.isMesh) return;
    if(!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach(m => { if(!m) return; m.side = THREE.DoubleSide; if(m.roughness===undefined||m.roughness>.85) m.roughness = .75; m.metalness = Math.min(m.metalness||0, .3);
      if(m.map) m.map.anisotropy = 4;
      if(ex.paint) addPaint(m, ex.paint, U); }); });
  const piv = n => { const o = root.getObjectByName(n); return o ? { o, baseY:o.position.y } : null; };
  const wr = piv('wheel_rear'), wf = piv('wheel_front');
  // ক্যামেরা: ১ গেম-পিক্সেল = ১ ক্যানভাস CSS পিক্সেল
  const cam = new THREE.OrthographicCamera(-CW/2, CW/2, CH/2, -CH/2, 1, 4000);
  const tgt = new THREE.Vector3(0, ex.height*s*.42, 0);
  cam.position.copy(tgt).addScaledVector(VDIR, 1500); cam.lookAt(tgt); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
  const proj = (x,y,z) => { const q = new THREE.Vector3(x,y,z).project(cam); return [ (q.x+1)/2*CW, (1-q.y)/2*CH ]; };
  const g0 = proj(0,0,0);                                   // চাকার মাঝখানের নিচে মাটি
  const LP = cfg.lamp || ex.lamp;
  if(cfg.bulb){ // ছোট বাতি: কালো খোল + সামনে উজ্জ্বল কাচ
    const bm = new THREE.Mesh(new THREE.SphereGeometry(cfg.bulb, 12, 8), new THREE.MeshStandardMaterial({ color:0x222222, roughness:.5, metalness:.4 }));
    const gl = new THREE.Mesh(new THREE.CircleGeometry(cfg.bulb*.8, 14), new THREE.MeshBasicMaterial({ color:0xfff3c4 }));
    gl.position.set(cfg.bulb*1.01, 0, 0); gl.rotation.y = Math.PI/2; bm.add(gl);
    bm.position.set(LP[0]-cfg.bulb*.6, LP[1], 0); root.add(bm);
  }
  const lamp = proj((LP[0]-midX)*s, LP[1]*s, 0);
  const tail = proj((-ex.len/2-midX)*s+3, Math.min(LP[1], ex.height*.45)*s, 0);
  Object.assign(rec, { sc, cam, s, U, wr, wf, g0, lamp, tail, R: cfg.Rt, len: ex.len*s, ready:true, color:null });
}
// opts: {color, base(মূল রং), spin, rs, fs, gy (গাড়ির কেন্দ্র থেকে মাটির দূরত্ব, পিক্সেলে)}
T.renderVeh = function(kind, opts){
  const rec = loadVeh(kind); if(!rec || !rec.ready) return null;
  if(opts.color !== rec.color){ rec.color = opts.color;
    const on = !!(opts.color && opts.base && opts.color.toLowerCase() !== opts.base.toLowerCase());
    rec.U.on.value = on ? 1 : 0; if(on){ rec.U.hsv.value.copy(hexHSV(opts.color)); rec.U.rgb.value.set(opts.color); } }
  if(rec.wr){ rec.wr.o.rotation.z = -(opts.spin||0); rec.wr.o.position.y = rec.wr.baseY - (opts.rs||0)/rec.s; }
  if(rec.wf){ rec.wf.o.rotation.z = -(opts.spin||0); rec.wf.o.position.y = rec.wf.baseY - (opts.fs||0)/rec.s; }
  renderer.render(rec.sc, rec.cam);
  const dx = -rec.g0[0], dy = (opts.gy||58) - rec.g0[1];
  return { canvas: renderer.domElement, dx, dy, dw: CW, dh: CH, lamp:[rec.lamp[0]+dx, rec.lamp[1]+dy], tail:[rec.tail[0]+dx, rec.tail[1]+dy], R: rec.R, len: rec.len };
};
T.has = kind => !!VEH[kind];
T.preload = kind => { loadVeh(kind); };

try{ init(); }catch(e){ console.warn('3D truck unavailable', e); }
