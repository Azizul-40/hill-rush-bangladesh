// Hill Rush Bangladesh 3D — মূল গেম: রেন্ডার, ইনপুট, মেনু, HUD, সেভ।
import * as THREE from 'three';
import { VEHICLES3D, MAPS3D, makeTrack, makeState, step, collect, respawnAt, COIN_VALUE_3D } from './track3d.js';
import { createVehicle, tryLoadGLB } from './vehicles3d.js';
import { buildWorld } from './world3d.js';

const $ = id => document.getElementById(id);
const SAVE_KEY = "hillrush3d_v1";

// ---------- সেভ (শুধু এই 3D পেজের; 2D গেমের সেভে হাত দেয় না) ----------
let save = { coins:0, unlocked:1, best:{}, vehicle:0, map:0 };
try{ const s = JSON.parse(localStorage.getItem(SAVE_KEY)||"null"); if(s && typeof s==="object"){ save = Object.assign(save, s); } }catch(e){}
save.unlocked = Math.max(1, Math.min(100, Number(save.unlocked)||1)); save.coins = Math.max(0, Number(save.coins)||0);
save.vehicle = Math.max(0, Math.min(VEHICLES3D.length-1, Number(save.vehicle)||0)); save.map = Math.max(0, Math.min(MAPS3D.length-1, Number(save.map)||0));
if(typeof save.best!=="object"||!save.best) save.best={};
const persist = () => { try{ localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }catch(e){} };

// ---------- রেন্ডারার ----------
const canvas = $("c3d");
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:"high-performance" }); }
catch(e){ document.body.classList.add("nogl"); $("noGL").style.display="flex"; throw e; }
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, .3, 2400);
function resize(){
  const w=innerWidth, h=innerHeight, dpr=Math.min(devicePixelRatio||1, 1.75);
  renderer.setPixelRatio(dpr); renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix();
}
addEventListener("resize",resize); resize();
// মিস-হওয়া resize ইভেন্টের সুরক্ষা (2D গেমে যে সমস্যা হয়েছিল)
setInterval(()=>{ if(canvas.width!==Math.floor(innerWidth*Math.min(devicePixelRatio||1,1.75))) resize(); },700);

// ---------- অবস্থা ----------
let state = "menu";        // menu | play | pause | crash | complete
let lv=null, S=null, world=null, veh=null, envTex=null, pmrem=null;
let simT=0, camX=0, camY=0, camZ=0, camPsi=0, shake=0, levelStart=0, usedCp=false, cpS=null, curLevel=1;
let coinsThisRun=0;
const input = { gas:false, brake:false, left:false, right:false, tiltBack:false, tiltFwd:false, boost:false };
const keys = {};
window.__h3d = { get S(){return S;}, get lv(){return lv;}, get tr(){return lv;}, get state(){return state;}, input, save, scene, camera, renderer, startLevel:(a,b,c)=>startLevel(a,b,c), get world(){return world;} };
const NOINP = ()=>({gas:false,brake:false,left:false,right:false,boost:false,tiltBack:false,tiltFwd:false});
function handleEvents(evs){ for(const e of evs){ if(e.type==="coin") coinsThisRun++; else if(e.type==="cp"){ cpS=e.item.s; toast("📍 CHECKPOINT "+e.n); } else if(e.type==="finish"&&state==="play"){ onComplete(); break; } } }
function snapCam(){ camPsi=S.psi; camX=S.x; camY=S.y; camZ=S.z; }
// টেস্টের জন্য: রেন্ডার ছাড়া নির্দিষ্ট সময় ফিজিক্স চালানো (ধীর সফটওয়্যার-GL-এ ফ্রেম কম বলে)
window.__h3d.__step=(i)=>{ if(!S||!lv) return; step(lv,S,Object.assign(NOINP(),i||{}),1/60); handleEvents(collect(lv,S)); if(S.crashed&&state==="play") onCrash(); };
window.__h3d.advance=(sec,inp)=>{ if(!S||!lv) return; const i=Object.assign(NOINP(),inp||{}); for(let t=0;t<sec&&!S.crashed;t+=1/60){ step(lv,S,typeof inp==="function"?inp(S,lv):i,1/60); collect(lv,S); } snapCam(); };
// ---------- ধুলো ----------
const dustN=140, dustPos=new Float32Array(dustN*3), dustLife=new Float32Array(dustN), dustVel=new Float32Array(dustN*3);
dustPos.fill(1e4);
const dustGeo=new THREE.BufferGeometry(); dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dustTex=(()=>{ const c=document.createElement("canvas"); c.width=c.height=64; const g=c.getContext("2d"); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,"rgba(255,255,255,.9)"); gr.addColorStop(1,"rgba(255,255,255,0)"); g.fillStyle=gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();
const dustMat=new THREE.PointsMaterial({ size:1.7, map:dustTex, transparent:true, opacity:.5, depthWrite:false, color:0xb89a78 });
const dust=new THREE.Points(dustGeo,dustMat); dust.frustumCulled=false; scene.add(dust);
let dustI=0;
function emitDust(x,y,z,speed,n=1){ for(let k=0;k<n;k++){ const i=dustI++%dustN; dustPos[i*3]=x+(Math.random()-.5)*.8; dustPos[i*3+1]=y+Math.random()*.3; dustPos[i*3+2]=z+(Math.random()-.5)*.8; dustVel[i*3]=(Math.random()-.5)*1.6; dustVel[i*3+1]=.8+Math.random()*1.8; dustVel[i*3+2]=(Math.random()-.5)*1.6; dustLife[i]=1; } }
function updateDust(dt){ for(let i=0;i<dustN;i++){ if(dustLife[i]<=0){ dustPos[i*3+1]=-1e4; continue; } dustLife[i]-=dt*1.3; dustPos[i*3]+=dustVel[i*3]*dt; dustPos[i*3+1]+=dustVel[i*3+1]*dt; dustPos[i*3+2]+=dustVel[i*3+2]*dt; dustVel[i*3+1]*=.98; } dustGeo.attributes.position.needsUpdate=true; }

// ---------- লেভেল শুরু ----------
async function startLevel(level, mapIdx, vehIdx){
  curLevel = level; save.map = mapIdx; save.vehicle = vehIdx; persist();
  // পুরনো দুনিয়া মুছে ফেলা
  if(world){ scene.remove(world.group); scene.remove(world.sky); world.dispose(); world=null; }
  if(veh){ scene.remove(veh.group); veh.dispose(); veh=null; }
  lv = makeTrack(level, mapIdx, vehIdx); S = makeState(lv); usedCp=false; cpS=null; coinsThisRun=0;
  const mapId = MAPS3D[mapIdx].id;
  world = buildWorld(lv, mapId);
  scene.add(world.group); scene.add(world.sky);
  world.applyExternalTextures(); loadSkyHDR(world);
  scene.fog = new THREE.FogExp2(world.theme.fog, world.theme.fogD);
  scene.background = null;
  // আকাশ থেকে পরিবেশ-প্রতিফলন (ধাতব/চকচকে অংশের জন্য)
  if(!pmrem) pmrem = new THREE.PMREMGenerator(renderer);
  if(envTex) envTex.dispose();
  const es = new THREE.Scene(); const skyClone = world.sky.clone(); skyClone.position.set(0,0,0); es.add(skyClone);
  envTex = pmrem.fromScene(es, 0, .1, 2000).texture; scene.environment = envTex; scene.environmentIntensity = .85;
  veh = createVehicle(vehIdx); scene.add(veh.group);
  tryLoadGLB(veh, vehIdx);
  snapCam();
  setAllUI(); showOnly(null); $("hud").classList.remove("hidden"); $("controls").classList.remove("hidden");
  state = "play"; levelStart = performance.now(); simT = 0;
  updateHUD();
}

// ঐচ্ছিক আকাশ: 3d/textures/sky.hdr থাকলে আকাশ ও প্রতিফলন সেটা থেকে আসে (RGBE .hdr, equirectangular)
async function loadSkyHDR(w){
  try{ const h=await fetch("./3d/textures/sky.hdr",{method:"HEAD"}); if(!h.ok) return;
    const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js');
    const tex = await new RGBELoader().loadAsync("./3d/textures/sky.hdr"); tex.mapping=THREE.EquirectangularReflectionMapping;
    if(world!==w) return; scene.background=tex; w.sky.visible=false; if(envTex) envTex.dispose(); envTex=pmrem.fromEquirectangular(tex).texture; scene.environment=envTex; scene.environmentIntensity=1;
  }catch(e){}
}
// ---------- ইনপুট ----------
const KEYMAP = { ArrowUp:"gas", KeyW:"gas", ArrowDown:"brake", KeyS:"brake", ArrowLeft:"left", KeyA:"left", ArrowRight:"right", KeyD:"right", Space:"boost", ShiftLeft:"boost", ShiftRight:"boost", KeyE:"tiltBack", KeyQ:"tiltFwd" };
addEventListener("keydown",e=>{ if(e.code==="Escape"||e.code==="KeyP"){ togglePause(); e.preventDefault(); return; } const k=KEYMAP[e.code]; if(k){ keys[k]=true; e.preventDefault(); } });
addEventListener("keyup",e=>{ const k=KEYMAP[e.code]; if(k){ keys[k]=false; e.preventDefault(); } });
addEventListener("blur",()=>{ for(const k in keys) keys[k]=false; for(const k in touch) touch[k]=false; });
const touch = {};
function bindBtn(id, key){ const el=$(id); if(!el) return; const on=e=>{ e.preventDefault(); touch[key]=true; el.classList.add("on"); }, off=e=>{ e.preventDefault(); touch[key]=false; el.classList.remove("on"); };
  el.addEventListener("pointerdown",on); el.addEventListener("pointerup",off); el.addEventListener("pointercancel",off); el.addEventListener("pointerleave",off); el.addEventListener("contextmenu",e=>e.preventDefault()); }
bindBtn("bGas","gas"); bindBtn("bBrake","brake"); bindBtn("bBoost","boost"); bindBtn("bTiltB","tiltBack"); bindBtn("bTiltF","tiltFwd"); bindBtn("bLeft","left"); bindBtn("bRight","right");
function readInput(){ for(const k of ["gas","brake","left","right","tiltBack","tiltFwd","boost"]) input[k] = !!(keys[k]||touch[k]); }

// ---------- মেনু ----------
function showOnly(id){ for(const el of document.querySelectorAll(".screen")) el.classList.toggle("hidden", el.id!==id); }
function setAllUI(){ $("mapName").textContent = MAPS3D[save.map].name; $("lvlName").textContent = "LEVEL "+curLevel; }
function renderMenu(){
  const vs=$("vehList"); vs.innerHTML="";
  VEHICLES3D.forEach((v,i)=>{ const b=document.createElement("button"); b.className="card"+(i===save.vehicle?" sel":""); b.innerHTML=`<b>${v.name}</b><span>${v.desc}</span>`; b.onclick=()=>{ save.vehicle=i; persist(); renderMenu(); }; vs.appendChild(b); });
  const ms=$("mapList"); ms.innerHTML="";
  MAPS3D.forEach((m,i)=>{ const b=document.createElement("button"); b.className="card"+(i===save.map?" sel":""); b.innerHTML=`<b>🇧🇩 ${m.name}</b><span>${m.desc}</span>`; b.onclick=()=>{ save.map=i; persist(); renderMenu(); }; ms.appendChild(b); });
  const inp=$("lvlInput"); inp.max=save.unlocked; if(!inp.value||+inp.value>save.unlocked) inp.value=Math.min(save.unlocked, +inp.value||save.unlocked); inp.min=1;
  $("unlockedTxt").textContent = `আনলকড লেভেল: ${save.unlocked} / 100 · কয়েন: ${save.coins}`;
}
function goMenu(){ state="menu"; showOnly("menu"); $("hud").classList.add("hidden"); $("controls").classList.add("hidden"); renderMenu(); }
$("startBtn").onclick=()=>{ const l=Math.max(1,Math.min(save.unlocked,Math.floor(+$("lvlInput").value)||1)); startLevel(l,save.map,save.vehicle); };
$("pauseBtn").onclick=togglePause; $("resumeBtn").onclick=togglePause;
$("pauseMenuBtn").onclick=goMenu; $("crashMenuBtn").onclick=goMenu; $("doneMenuBtn").onclick=goMenu;
$("retryBtn").onclick=()=>startLevel(curLevel,save.map,save.vehicle); $("pauseRetryBtn").onclick=()=>startLevel(curLevel,save.map,save.vehicle);
$("nextBtn").onclick=()=>startLevel(Math.min(100,curLevel+1),save.map,save.vehicle);
$("cpBtn").onclick=()=>{ if(cpS==null) return; respawnAt(lv,S,cpS); usedCp=true; showOnly(null); state="play"; $("hud").classList.remove("hidden"); $("controls").classList.remove("hidden"); snapCam(); };
function togglePause(){ if(state==="play"){ state="pause"; showOnly("pauseMenu"); } else if(state==="pause"){ state="play"; showOnly(null); } }

// ---------- HUD ----------
function updateHUD(){
  if(!S||!lv) return;
  $("fuelFill").style.width=Math.max(0,S.fuel)+"%"; $("fuelFill").classList.toggle("low",S.fuel<22);
  $("boostFill").style.width=Math.max(0,S.boostE)+"%";
  $("coinTxt").textContent=save.coins+coinsThisRun*COIN_VALUE_3D;
  $("speedTxt").textContent=Math.round(Math.abs(S.vf||0)*3.6)+" km/h";
  $("distTxt").textContent=Math.max(0,Math.round(S.s))+" / "+lv.L+" m";
  $("progFill").style.width=Math.max(0,Math.min(100,S.s/lv.L*100))+"%";
  $("timeTxt").textContent=fmt((performance.now()-levelStart)/1000);
}
const fmt = t => { const m=Math.floor(t/60), s=Math.floor(t%60), d=Math.floor((t*10)%10); return m+":"+String(s).padStart(2,"0")+"."+d; };

function onCrash(){
  state="crash"; shake=.6;
  $("crashText").textContent=S.reason;
  $("cpBtn").style.display=(cpS!=null)?"":"none";
  showOnly("crashMenu"); $("controls").classList.add("hidden");
}
function onComplete(){
  state="complete"; const t=(performance.now()-levelStart)/1000;
  const reward=60+curLevel*3+coinsThisRun*COIN_VALUE_3D;
  save.coins+=reward; // কয়েন শুধু লেভেল শেষ করলে জমা হয় (ক্র্যাশে হারায়)
  if(!usedCp){ if(!save.best[curLevel]||t<save.best[curLevel]) save.best[curLevel]=+t.toFixed(2); }
  save.unlocked=Math.max(save.unlocked,Math.min(100,curLevel+1)); persist();
  $("doneTime").textContent=fmt(t)+(usedCp?" (checkpoint ব্যবহার — রেকর্ডে গণ্য নয়)":"");
  $("doneReward").textContent="+"+reward+" coins (লেভেল "+(60+curLevel*3)+" + কয়েন "+coinsThisRun*COIN_VALUE_3D+")";
  $("doneStars").textContent=t<L_STAR3()?"★★★":t<L_STAR2()?"★★☆":"★☆☆";
  $("nextBtn").style.display=curLevel<100?"":"none";
  showOnly("completeMenu"); $("controls").classList.add("hidden");
}
const L_STAR3=()=>lv.L/9.5, L_STAR2=()=>lv.L/6.5;

// ---------- প্রধান লুপ ----------
let last=performance.now(), acc=0;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000); last=now;
  if(state==="play"&&S&&lv){
    readInput(); const wasAir=!S.grounded; step(lv,S,input,dt); simT+=dt;
    handleEvents(collect(lv,S));
    // ধুলো: পেছনের চাকা থেকে
    if(S.grounded&&Math.abs(S.vf)>3.5&&Math.random()<.7){ const hw=lv.veh.wb/2; emitDust(S.x-Math.cos(S.psi)*hw,S.y-lv.veh.hub-lv.veh.R+.15,S.z-Math.sin(S.psi)*hw,S.vf,1); }
    // ল্যান্ডিং-শেক
    if(S.grounded&&wasAir&&S.landed>5){ shake=Math.max(shake,Math.min(.7,S.landed*.05)); S.landed=0; }
    if(S.crashed&&state==="play") onCrash();
    updateHUD();
  }
  if(S&&lv&&veh&&world){
    veh.setPose(S, state==="play"?dt:0);
    // চেজ-ক্যামেরা: গাড়ির পেছনে, গাড়ির মুখের দিকে ধীরে ঘোরে
    const v=Math.abs(S.vf||0), big=lv.veh.id==="bus"?1.3:lv.veh.id==="truck"?1.15:1;
    let da=S.psi-camPsi; da=Math.atan2(Math.sin(da),Math.cos(da)); camPsi+=da*Math.min(1,dt*3.2);
    camX+=(S.x-camX)*Math.min(1,dt*9); camY+=(S.y-camY)*Math.min(1,dt*4.5); camZ+=(S.z-camZ)*Math.min(1,dt*9);
    const dist=(10.6+Math.min(3,v*.1))*big, h=(4.3+Math.min(1,v*.03))*big;
    shake=Math.max(0,shake-dt*1.6);
    const cxp=camX-Math.cos(camPsi)*dist, czp=camZ-Math.sin(camPsi)*dist; let cyp=camY+h;
    const gH=lv.hAt(cxp,czp); if(gH>-50) cyp=Math.max(cyp,gH+1.7);
    camera.position.set(cxp+(Math.random()-.5)*shake*.35, cyp+(Math.random()-.5)*shake*.35, czp);
    camera.lookAt(camX+Math.cos(camPsi)*9, camY+.4, camZ+Math.sin(camPsi)*9);
    const fv=54+Math.min(12,v*.5); if(Math.abs(camera.fov-fv)>.05){ camera.fov += (fv-camera.fov)*Math.min(1,dt*2); camera.updateProjectionMatrix(); }
    world.update(camera.position,S,performance.now()/1000);
    updateDust(dt);
  }
  if(!window.__h3dNoRender) renderer.render(scene,camera);   // __h3dNoRender: শুধু টেস্টে (সফটওয়্যার-GL খুব ধীর)
}
let toastT=0;
function toast(t){ const el=$("toast"); el.textContent=t; el.classList.add("on"); clearTimeout(toastT); toastT=setTimeout(()=>el.classList.remove("on"),1400); }

// URL থেকে সরাসরি শুরু (টেস্ট/ডেমোর জন্য): ?level=3&map=1&veh=0
const q=new URLSearchParams(location.search);
renderMenu(); goMenu();
if(q.has("level")){ save.unlocked=Math.max(save.unlocked,+q.get("level")||1); startLevel(Math.max(1,Math.min(100,+q.get("level")||1)), Math.max(0,Math.min(4,+q.get("map")||0)), Math.max(0,Math.min(3,+q.get("veh")||0))); }
requestAnimationFrame(frame);
