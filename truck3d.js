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

try{ init(); }catch(e){ console.warn('3D truck unavailable', e); }
