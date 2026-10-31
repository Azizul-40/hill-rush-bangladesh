// ==============================
// HILL RUSH BANGLADESH
// ==============================

// Canvas নেওয়া হচ্ছে। 
const canvas = document.getElementById("game");

// 2D drawing context নেওয়া হচ্ছে। 
const ctx = canvas.getContext("2d");

// Device pixel ratio সীমিত করা হচ্ছে। 
let DPR = Math.min(window.devicePixelRatio || 1, 2);

// Screen width রাখা হচ্ছে। 
let W = innerWidth;

// Screen height রাখা হচ্ছে। 
let H = innerHeight;

// Canvas resize function। 
function resizeCanvas(){
  // নতুন width নেওয়া হচ্ছে। 
  W = innerWidth;
  // নতুন height নেওয়া হচ্ছে। 
  H = innerHeight;
  // pixel ratio নেওয়া হচ্ছে। 
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  // real canvas width। 
  canvas.width = W * DPR;
  // real canvas height। 
  canvas.height = H * DPR;
  // drawing coordinate CSS pixel অনুযায়ী করা হচ্ছে। 
  ctx.setTransform(DPR,0,0,DPR,0,0);
}

// Window resize listener। 
addEventListener("resize",resizeCanvas);

// শুরুতে canvas resize করা হচ্ছে। 
resizeCanvas();


// ==============================
// SAVE DATA
// ==============================

// মোট level। 
const TOTAL_LEVELS = 100;

// ---------- FUEL ও ENDLESS MODE কনফিগ (Master Prompt ধাপ ২-৩ অনুযায়ী, একটা জায়গায় রাখা হয়েছে যাতে ব্যালেন্স করা সহজ হয়) ----------
const FUEL_CONFIG = {
  cap:100,                 // ট্যাংক পূর্ণ হলে কত
  drainGas:1.9,            // প্রতি সেকেন্ডে খরচ (full throttle/gas চাপলে)
  drainDrive:1.25,         // সাধারণ ডান-চাপ (right) চালানোয় খরচ
  drainIdle:0.45,          // কিছু না চাপলেও/ব্রেক/বাঁয়ে সামান্য খরচ
  lowThreshold:20,         // এর নিচে নামলে সতর্কবার্তা ও হলুদ/লাল গেজ
  canRefill:45,            // একটা fuel can নিলে কত ফেরত পাওয়া যায়
  minPowerAtEmpty:0.18     // ট্যাংক শূন্য হলে engine power/top speed এই ভগ্নাংশে নেমে আসে (হঠাৎ বন্ধ হয় না, ধীরে ধীরে কমে)
};
const BOOST_PICKUP_CONFIG = { refill:55 }; // boost pickup নিলে boostEnergy কত বাড়ে (১০০-এর বেশি না)
let endlessMode=false;                 // true হলে ENDLESS/DISTANCE MODE চলছে
const ENDLESS_LEVEL_SEED=70;           // terrain/difficulty-এর জন্য fixed "level" (মাঝারি-কঠিন, deterministic)
const ENDLESS_LENGTH=58000;            // Endless রুটের মোট দৈর্ঘ্য—শেষ পর্যন্ত পৌঁছানো একটা বিরল কৃতিত্ব, বেশিরভাগ রান তার আগেই ক্র্যাশ/ফুয়েল শেষ হয়ে থামবে
let endlessBestDistanceThisLoad=0;     // শুধু UI সুবিধার জন্য (persist হয় save.endlessBest-এ)

// Save key। 
const SAVE_KEY = "hillRushFinalSaveV1";

// আগের save পড়া হচ্ছে। 
let save;
try{
  save = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
}catch(e){
  // localStorage-এর ডেটা করাপ্টেড (invalid JSON) হলে আগে পুরো script crash করত (সাদা স্ক্রিন)।
  // এখন সেটা ধরে null হিসেবে treat করা হচ্ছে, যাতে নিচের কোড নতুন default profile বানিয়ে নেয়।
  save = null;
}

// Save না থাকলে default profile তৈরি হচ্ছে। 
if(!save){
  save = {
    coins:250,
    unlocked:1,
    selectedVehicle:0,
    ownedVehicles:[0],
    upgrades:{
      0:{engine:1,tires:1,suspension:1,boost:1},
      1:{engine:1,tires:1,suspension:1,boost:1},
      2:{engine:1,tires:1,suspension:1,boost:1},
      3:{engine:1,tires:1,suspension:1,boost:1}
    },
    best:{},
    collected:{},
    completed:{},
    dailyClaimed:false,
    dayKey:"",
    coinPackClaims:0
  };
}

// Save function। 
function persist(){
  // localStorage-এ JSON save করা হচ্ছে। 
  // storage বন্ধ/ভর্তি থাকলেও গেম যেন না থামে—error ধরে একবার সতর্কবার্তা দেওয়া হয়।
  try{
    save.saveVersion=SAVE_VERSION;
    localStorage.setItem(SAVE_KEY,JSON.stringify(save));
  }catch(e){
    if(!window.__saveWarned){
      window.__saveWarned=true;
      console.warn("Hill Rush: progress save করা গেল না (browser storage বন্ধ বা ভর্তি). গেম চলবে, কিন্তু রিফ্রেশে progress হারাতে পারে।");
    }
  }
}

// Coin variable save থেকে নেওয়া হচ্ছে। 
const SAVE_VERSION = 2;

// পুরনো/অসম্পূর্ণ/নষ্ট save-কে নিরাপদ মানে ঠিক করা (valid progress কখনো মুছে ফেলা হয় না)।
function normalizeSave(){
  if(typeof save!=="object"||save===null||Array.isArray(save)) save={};
  save.coins = Number.isFinite(Number(save.coins)) ? Math.max(0,Math.floor(Number(save.coins))) : 250;
  save.unlocked = Number.isFinite(Number(save.unlocked)) ? Math.max(1,Math.min(TOTAL_LEVELS,Math.floor(Number(save.unlocked)))) : 1;
  if(!Array.isArray(save.ownedVehicles)||!save.ownedVehicles.length) save.ownedVehicles=[0];
  if(!Number.isFinite(Number(save.selectedVehicle))||!save.ownedVehicles.includes(Number(save.selectedVehicle))) save.selectedVehicle=0;
  if(typeof save.upgrades!=="object"||save.upgrades===null) save.upgrades={};
  for(let i=0;i<4;i++){
    const u=save.upgrades[i];
    if(typeof u!=="object"||u===null) save.upgrades[i]={engine:1,tires:1,suspension:1,boost:1};
    else{ for(const k of ["engine","tires","suspension","boost"]) if(!Number.isFinite(Number(u[k]))||u[k]<1) u[k]=1; }
  }
  for(const k of ["best","collected","completed"]) if(typeof save[k]!=="object"||save[k]===null||Array.isArray(save[k])) save[k]={};
  if(typeof save.dailyClaimed!=="boolean") save.dailyClaimed=false;
  if(typeof save.dayKey!=="string") save.dayKey="";
  if(!Number.isFinite(Number(save.coinPackClaims))) save.coinPackClaims=0;
  // Endless/Distance mode-এর local personal best (ম্যাপ অনুযায়ী আলাদা, মিটারে)।
  if(typeof save.endlessBest!=="object"||save.endlessBest===null||Array.isArray(save.endlessBest)) save.endlessBest={};
  // সর্বশেষ যে level খেলা হয়েছিল (রিফ্রেশের পর এখান থেকেই চালু হবে)।
  // পুরনো save-এ না থাকলে সবচেয়ে এগিয়ে থাকা (unlocked) level ধরা হয়।
  if(!Number.isFinite(Number(save.lastLevel))) save.lastLevel=save.unlocked;
  save.lastLevel=Math.max(1,Math.min(save.unlocked,Math.floor(Number(save.lastLevel))));
  v15Custom();
  save.saveVersion=SAVE_VERSION;
}
normalizeSave();
let coins = save.coins;

// Current level। 
let currentLevel = save.lastLevel; // রিফ্রেশের পর সর্বশেষ খেলা level (আগে সবসময় Level 1 হয়ে যেত)

// Current page। 
let levelPage = 0;

// Current game state। 
let state = "menu";

// Timer start। 
let levelStart = 0;

// Elapsed time। 
let elapsed = 0;

// Camera। 
const camera = {x:0};

// Particle array। 
let particles = [];

// Coin object array। 
let levelCoins = [];

// Fuel can ও boost pickup—প্রতি লেভেল/এন্ডলেস রান শুরুতে regenerate হয় (কয়েনের মতো persist হয় না, কারণ এগুলো পুরস্কার নয়, চালানোর রিসোর্স)।
let levelFuelCans = [];
let levelBoostCans = [];

// Current level coin collection set। 
let collectedSet = new Set();

// Last frame। 
let lastFrame = performance.now();


// ==============================
// VEHICLES
// ==============================

// Vehicle definitions। 
const vehicles = [
  {
    name:"TRAIL BLAZER",
    emoji:"🚙",
    price:0,
    speed:1,
    grip:1,
    suspension:1,
    boost:1,
    desc:"Balanced starter truck."
  },
  {
    name:"DESERT BEAST",
    emoji:"🏜️",
    price:900,
    speed:1.18,
    grip:.96,
    suspension:1.05,
    boost:1.12,
    desc:"Fast desert runner."
  },
  {
    name:"ROCK MONSTER",
    emoji:"🚚",
    price:1600,
    speed:1.05,
    grip:1.18,
    suspension:1.22,
    boost:1.04,
    desc:"Heavy truck with huge grip."
  },
  {
    name:"THUNDER X",
    emoji:"🏎️",
    price:2800,
    speed:1.30,
    grip:1.12,
    suspension:1.08,
    boost:1.35,
    desc:"High-speed extreme machine."
  }
];

// Upgrade cost function। 
function upgradeCost(type,level){
  // Base cost। 
  const base = {engine:50,tires:50,suspension:60,boost:75}[type];
  // Exponential price। 
  return Math.round(base*Math.pow(1.55,level-1));
}

// Current vehicle upgrade object। 
function currentUpgrades(){
  // Vehicle id। 
  const id = save.selectedVehicle;
  // Missing object হলে default। 
  if(!save.upgrades[id]){
    save.upgrades[id]={engine:1,tires:1,suspension:1,boost:1};
  }
  // Upgrade object return। 
  return save.upgrades[id];
}


// ==============================
// AUDIO
// ==============================

// Audio context। 
let audio = null;

// Master gain। 
let master = null;

// Engine oscillator। 
let engineOsc = null;

// Engine gain। 
let engineGain = null;

// Audio initialized কিনা। 
let audioReady = false;

// User audio settings।
let userVolume = Number(localStorage.getItem("hillRushVolume"));
// Saved volume না থাকলে default 55%।
if(!Number.isFinite(userVolume)) userVolume=55;
// Mute state save করা হচ্ছে।
let userMuted = localStorage.getItem("hillRushMuted")==="1";
// V21 audio migration: পুরোনো build-এর stale mute state একবার reset করা হচ্ছে।
if(localStorage.getItem("hillRushAudioV21")!=="1"){
  userMuted=false;
  localStorage.setItem("hillRushMuted","0");
  localStorage.setItem("hillRushAudioV21","1");
}

// Pause/settings-এর সময় audio suppress করা হচ্ছে।
let audioSuppressed = false;

// Master audio volume apply করা হচ্ছে।
function applyAudioVolume(){
  // Audio তৈরি না হলে শুধু setting save থাকবে।
  if(!master || !audio) return;
  // Mute/pause হলে output zero।
  const target=(userMuted||audioSuppressed)?0:userVolume/100;
  // Smooth volume change।
  master.gain.setTargetAtTime(target,audio.currentTime,.035);
}

// Game pause/resume অনুযায়ী sound mute/unmute।
function setAudioSuppressed(value){
  // Suppression state।
  audioSuppressed=!!value;
  // Volume apply।
  applyAudioVolume();
}

// Browser-এর AudioContext user gesture-এর পরে অবশ্যই resume করা হচ্ছে।
function resumeAudio(){
  // Audio তৈরি না থাকলে আগে তৈরি করা হচ্ছে।
  if(!audioReady) initAudio();
  // Suspended হলে resume করা হচ্ছে।
  if(audio && audio.state==="suspended") audio.resume();
  // Master volume আবার apply করা হচ্ছে।
  applyAudioVolume();
}


// Audio init। 
function initAudio(){
  // আগে তৈরি হলে resume করা হচ্ছে। 
  if(audioReady){
    if(audio.state==="suspended") audio.resume();
    return;
  }

  // Browser audio class। 
  const AC = window.AudioContext || window.webkitAudioContext;
  // Audio API না থাকলে return। 
  if(!AC) return;

  // Context। 
  audio = new AC();
  // Master gain। 
  master = audio.createGain();
  // Loudness। 
  master.gain.value = userVolume/100;
  // Speaker। 
  master.connect(audio.destination);
  // Saved mute/pause state apply করা হচ্ছে।
  applyAudioVolume();
  // Browser context suspended থাকলে resume করার চেষ্টা।
  if(audio.state==="suspended") audio.resume();

  // Engine oscillator। 
  engineOsc = audio.createOscillator();
  // Engine gain। 
  engineGain = audio.createGain();
  // Engine tone। 
  engineOsc.type = "sawtooth";
  // Initial frequency। 
  engineOsc.frequency.value = 55;
  // Initial volume। 
  engineGain.gain.value = 0;
  // Connect। 
  engineOsc.connect(engineGain);
  engineGain.connect(master);
  // Start oscillator। 
  engineOsc.start();

  // Ready। 
  audioReady = true;
}

// Tone sound। 
function tone(freq=500,duration=.1,volume=.12,type="square"){
  // Audio না থাকলে return। 
  if(!audioReady) return;
  // Oscillator। 
  const o = audio.createOscillator();
  // Gain। 
  const g = audio.createGain();
  // Wave। 
  o.type = type;
  // Frequency। 
  o.frequency.value = freq;
  // Fade in। 
  g.gain.setValueAtTime(.0001,audio.currentTime);
  g.gain.exponentialRampToValueAtTime(volume,audio.currentTime+.008);
  // Fade out। 
  g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
  // Connect। 
  o.connect(g);
  g.connect(master);
  // Start। 
  o.start();
  // Stop। 
  o.stop(audio.currentTime+duration+.02);
}

// Coin pickup sound। 
function coinSound(){
  // দুই-tone arcade sound। 
  tone(880,.07,.13,"triangle");
  setTimeout(()=>tone(1320,.10,.10,"triangle"),55);
}

// Crash sound। 
function crashSound(){
  // Low impact। 
  tone(65,.5,.24,"sawtooth");
  // Noise। 
  noise(.42,.25);
}

// Noise। 
function noise(duration=.2,volume=.15){
  // Audio না থাকলে return। 
  if(!audioReady) return;

  // Noise buffer। 
  const buffer=audio.createBuffer(1,audio.sampleRate*duration,audio.sampleRate);
  // Data। 
  const data=buffer.getChannelData(0);

  // Random noise। 
  for(let i=0;i<data.length;i++){
    data[i]=(Math.random()*2-1)*(1-i/data.length);
  }

  // Source। 
  const source=audio.createBufferSource();
  // Gain। 
  const g=audio.createGain();
  // Buffer। 
  source.buffer=buffer;
  // Volume। 
  g.gain.value=volume;
  // Connect। 
  source.connect(g);
  g.connect(master);
  // Start। 
  source.start();
  // Stop। 
  source.stop(audio.currentTime+duration);
}

// Engine start। 
function engineStart(){
  // Audio ready না হলে return। 
  if(!audioReady) return;
  // Volume fade। 
  engineGain.gain.setTargetAtTime(.22,audio.currentTime,.05);
}

// Engine stop। 
function engineStop(){
  // Audio ready না হলে return। 
  if(!audioReady) return;
  // Fade। 
  engineGain.gain.setTargetAtTime(0,audio.currentTime,.07);
}

// Engine update। 
function updateEngine(){
  // Audio/game চললে update। 
  if(!audioReady || state!=="play") return;
  // Speed। 
  const speed=Math.abs(truck.vx);
  // Pitch। 
  engineOsc.frequency.setTargetAtTime(52+speed*.17+(keys.gas?22:0),audio.currentTime,.03);
}


// ==============================
// INPUT
// ==============================

// Keyboard state। boost = নতুন Nitro/Boost বাটনের জন্য।
const keys={left:false,right:false,gas:false,brake:false,boost:false};

// Key down। 
addEventListener("keydown",e=>{
  // Left / reverse। 
  if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A") keys.left=true;
  // Right / drive। 
  if(e.key==="ArrowRight"||e.key==="d"||e.key==="D") keys.right=true;
  // Gas। 
  if(e.key==="ArrowUp"||e.key==="w"||e.key==="W") keys.gas=true;
  // Brake। 
  if(e.key==="ArrowDown"||e.key==="s"||e.key==="S"||e.key===" ") {
    keys.brake=true;
    e.preventDefault();
  }
  // Boost/Nitro—Shift চাপলে বুস্ট চালু হবে (যদি boost energy বাকি থাকে)।
  if(e.key==="Shift"||e.key==="b"||e.key==="B") keys.boost=true;
  // Pause।
  if(e.key==="p"||e.key==="P") togglePause();
});

// Key up।
addEventListener("keyup",e=>{
  // Release left।
  if(e.key==="ArrowLeft"||e.key==="a"||e.key==="A") keys.left=false;
  // Release right।
  if(e.key==="ArrowRight"||e.key==="d"||e.key==="D") keys.right=false;
  // Release gas।
  if(e.key==="ArrowUp"||e.key==="w"||e.key==="W") keys.gas=false;
  // Release brake।
  if(e.key==="ArrowDown"||e.key==="s"||e.key==="S"||e.key===" ") keys.brake=false;
  // Release boost।
  if(e.key==="Shift"||e.key==="b"||e.key==="B") keys.boost=false;
});


// ==============================
// TERRAIN
// ==============================

// Level names। 
const levelNames=[
  "GREEN HILLS","WOODEN BRIDGE","MOUNTAIN CLIMB","RIVER GAP","ROCKY ROAD",
  "DEEP CANYON","SNOW VALLEY","DESERT RUN","NIGHT ROAD","WATERFALL",
  "FOREST PEAK","CLIFF JUMP","RIVER BRIDGE","HIGH MOUNTAIN","MOUNTAIN PEAK",
  "BROKEN ROAD","PINE VALLEY","BIG CANYON","LAKE CROSSING","FINAL HILL"
];

// Level name। 
function levelName(id){
  // Theme repeat। 
  return levelNames[(id-1)%levelNames.length];
}

// Difficulty। 
function difficulty(id){
  // 0 থেকে 1 পর্যন্ত progress। 
  const p=(id-1)/99;
  // Smooth difficulty। 
  return 1+p*1.35;
}

// Seed। 
function seed(id){
  // Deterministic। 
  return id*7919+37;
}

// Hash। 
function hash(n){
  // Sine hash। 
  const v=Math.sin(n*12.9898+seed(currentLevel)*.17)*43758.5453;
  // Decimal। 
  return v-Math.floor(v);
}

// Level length। 
function finishX(){
  // Level 1 সহজ এবং যথেষ্ট playable। 
  return 3600 + currentLevel*42;
}

// Gap list। 
function getGaps(){
  // Difficulty। 
  const d=difficulty(currentLevel);
  // Level 1-5-এর fixed easy gaps। 
  const gaps=[
    [950,100+25*d],
    [1640,95+25*d],
    [2380,110+30*d],
    [3100,120+35*d]
  ];

  // Higher level-এ extra gaps। 
  if(currentLevel>=8) gaps.push([3850,125+35*d]);
  if(currentLevel>=18) gaps.push([4650,130+40*d]);
  if(currentLevel>=30) gaps.push([5450,140+42*d]);
  if(currentLevel>=45) gaps.push([6250,145+45*d]);
  if(currentLevel>=65) gaps.push([7100,150+48*d]);

  // Return। 
  return gaps;
}

// Gap check। 
function isGap(x){
  // Start area সবসময় নিরাপদ রাখা হচ্ছে যাতে নতুন level শুরু করেই truck না পড়ে।
  if(x<430) return false;

  // Finish line-এর আগে/পরে safe runway রাখা হচ্ছে যাতে flag কখনো gap-এর উপর না পড়ে।
  const finish=finishX();
  if(x>finish-300 && x<finish+120) return false;

  // একই gap data physics এবং visual bridge—দুই জায়গায় ব্যবহার করছে।
  const gaps=getGaps();

  // প্রতিটি defined gap-এর মধ্যে x আছে কিনা দেখা হচ্ছে।
  for(const [start,width] of gaps){
    if(x>=start && x<=start+width) return true;
  }

  // Gap না হলে solid road।
  return false;
}

// Terrain height। 
function terrainY(x){
  // Level অনুযায়ী deterministic seed তৈরি করা হচ্ছে।
  const seed=currentLevel*137.31;

  // বড়, মাঝারি এবং ছোট smooth wave।
  const difficulty=Math.min(1,(currentLevel-1)/99);
  const heightScale=1+difficulty*.68;

  const longWave=Math.sin((x+seed)*0.00215)*48*heightScale;
  const mediumWave=Math.sin((x+seed*2)*0.0052)*24*heightScale;
  const shortWave=Math.sin((x+seed*3)*0.0105)*8;

  // Base road height।
  let y=H*.64-(longWave+mediumWave+shortWave);

  // প্রতি section-এ একটি continuous mountain/jump shape।
  const section=Math.floor(x/1200);
  const local=((x%1200)+1200)%1200;

  // Section seed-এর সামান্য variation।
  const sectionWave=Math.sin((section+1)*2.41)*18;

  // Smooth hill — দুই প্রান্তেই zero, তাই boundary-তে কোনো vertical cut হবে না।
  if(local>=150 && local<=650){
    const t=(local-150)/500;
    const smooth=Math.sin(t*Math.PI);
    y-=(105+difficulty*55+sectionWave)*smooth;
  }

  // Smooth jump hump — 650 থেকে 1050 পর্যন্ত উঠবে এবং আবার zero-তে ফিরবে।
  if(local>650 && local<1050){
    const t=(local-650)/400;
    const jump=Math.sin(t*Math.PI);
    y-=(48+difficulty*28)*jump;
  }

  // ছোট natural undulation।
  if(local>1050){
    const t=(local-1050)/150;
    y-=Math.sin(t*Math.PI)*10;
  }

  // Level-এর প্রথম অংশে gentle starting road রাখা হচ্ছে যাতে truck spawn-এ nose-dive না করে।
  if(x<520){
    // Smooth starter road-এর base height।
    const starter=H*.61-Math.sin(x*.0055)*12;
    // 300-520px-এর মধ্যে normal terrain-এর সঙ্গে smooth blend করা হচ্ছে।
    const t=Math.max(0,Math.min(1,(x-300)/220));
    const s=t*t*(3-2*t);
    y=starter*(1-s)+y*s;
  }

  // Road screen-এর বাইরে যেতে দেওয়া হচ্ছে না।
  return Math.max(H*.25,Math.min(H*.72,y));
}

// Terrain slope। 
function terrainSlope(x){
  // দুই পাশে sample। 
  const a=terrainY(x-4);
  const b=terrainY(x+4);
  // Angle। 
  return Math.atan2(b-a,8);
}


// ==============================
// COINS
// ==============================

// Generate coins। 
function generateCoins(){
  // Empty। 
  levelCoins=[];

  // Step দিয়ে road scan। 
  for(let x=380;x<finishX()-120;x+=145){

    // Gap skip। 
    if(isGap(x)) continue;

    // REFERENCE ROAD EDGE
// Continuous grass lip + soil highlight আঁকার helper।
function drawRoadSurface(x1,x2){
  // Smooth road edge।
  ctx.strokeStyle="#39d34a";
  ctx.lineWidth=10;
  ctx.lineCap="round";

  ctx.beginPath();
  for(let x=x1;x<=x2;x+=12){
    const y=terrainY(x)-camera.y;
    if(x===x1) ctx.moveTo(x-camera.x,y);
    else ctx.lineTo(x-camera.x,y);
  }
  ctx.stroke();

  // Grass highlight।
  ctx.strokeStyle="#8bea48";
  ctx.lineWidth=3;

  ctx.beginPath();
  for(let x=x1;x<=x2;x+=18){
    const y=terrainY(x)-camera.y-4;
    if(x===x1) ctx.moveTo(x-camera.x,y);
    else ctx.lineTo(x-camera.x,y);
  }
  ctx.stroke();
}

// Terrain। 
    const y=terrainY(x);

    // Coin pattern। 
    const pattern=Math.floor(x/145)%5;

    // Coin height। 
    const lift=55+(pattern===2?80:0);

    // Coin। 
    levelCoins.push({
      x:x,
      y:y-lift,
      r:18,
      value:10,
      taken:false,
      phase:Math.random()*Math.PI*2
    });
  }

  // Gap-এর আগে bonus coin line। 
  for(const [a,b] of getGaps()){
    // Gap-এর দুই পাশে 3 coin। 
    for(let i=0;i<3;i++){
      // X। 
      const x=a-130+i*55;
      // Coin। 
      levelCoins.push({
        x:x,
        y:terrainY(x)-90-i*8,
        r:18,
        value:20,
        taken:false,
        phase:i
      });
    }
  }

  // Previously collected coin data। 
  const saved=save.collected[currentLevel]||[];
  // Set তৈরি। 
  collectedSet=new Set(saved);

  // Saved coins mark। 
  levelCoins.forEach((c,i)=>c.taken=collectedSet.has(i));
}

// Coin collision। 
function collectCoins(){
  // Truck center। 
  const tx=truck.x;
  // Truck center Y। 
  const ty=truck.y;

  // Coin loop। 
  levelCoins.forEach((c,i)=>{
    // Already collected হলে skip। 
    if(c.taken) return;

    // Distance। 
    const dx=c.x-tx;
    const dy=c.y-ty;
    const dist=Math.sqrt(dx*dx+dy*dy);

    // Collision radius। 
    if(dist<52){
      // Taken। 
      c.taken=true;
      // Set। 
      collectedSet.add(i);
      // Coin add। 
      coins+=c.value;
      // Save। 
      save.coins=coins;
      // Current level collected save। 
      save.collected[currentLevel]=Array.from(collectedSet);
      // Persist। 
      persist();
      // Sound। 
      coinSound();
      // Spark। 
      coinBurst(c.x,c.y);
    }
  });
}


// ==============================
// TRUCK
// ==============================

// Truck state। 
const truck={
  x:180,
  y:430,
  vx:0,
  vy:0,
  angle:0,
  angVel:0,
  wheelSpin:0,
  wheelBase:88,
  wheelR:27,
  onGround:true
};

// Reset truck। 
function resetTruck(){
  // Start position। 
  truck.x=250;
  // Start speed। 
  truck.vx=0;
  // Vertical speed। 
  truck.vy=0;
  // Terrain angle। 
  truck.angle=terrainSlope(truck.x);
  // Rotation speed। 
  truck.angVel=0;
  // Wheel spin। 
  truck.wheelSpin=0;
  // Ground। 
  truck.onGround=true;
  // Y position। 
  truck.y=terrainY(truck.x)-truck.wheelR-31;
  // Camera। 
  camera.x=0;
}


// ==============================
// PARTICLES
// ==============================

// Dust particle। 
function dust(x,y,count=3){
  // Count loop। 
  for(let i=0;i<count;i++){
    // Particle। 
    particles.push({
      type:"dust",
      x:x+(Math.random()-.5)*40,
      y:y,
      vx:(Math.random()-.5)*140,
      vy:-35-Math.random()*120,
      life:.35+Math.random()*.4,
      max:.75,
      size:3+Math.random()*7
    });
  }
}

// Coin spark। 
// Exhaust smoke—গ্যাস চাপলে truck-এর পেছন থেকে ধোঁয়ার কুণ্ডলী বের হবে (আরও jীবন্ত/animated দেখাতে)।
function exhaustPuff(x,y){
  particles.push({type:"smoke",x:x+(Math.random()-.5)*8,y:y+(Math.random()-.5)*6,vx:-60-Math.random()*40,vy:-30-Math.random()*40,life:.5+Math.random()*.3,max:.8,size:4+Math.random()*5});
}
// Boost/Nitro flame—সাধারণ ধোঁয়ার চেয়ে বেশি উজ্জ্বল, নীল-বেগুনি রঙের, দ্রুত মিলিয়ে যাওয়া কণা।
function boostFlame(x,y){
  particles.push({type:"boost",x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*8,vx:-140-Math.random()*90,vy:(Math.random()-.5)*50,life:.3+Math.random()*.2,max:.5,size:5+Math.random()*6});
}

// ---------- AIR TIME / FLIP বোনাস (Hill Climb Racing-এর মতো ভাসমান স্কোর টেক্সট) ----------
let floatTexts=[];
function spawnFloatText(x,y,text,color){
  floatTexts.push({x,y,text,color,life:1.4,max:1.4,vy:-46});
}
function updateFloatTexts(dt){
  for(let i=floatTexts.length-1;i>=0;i--){
    const f=floatTexts[i];f.y+=f.vy*dt;f.vy*=Math.pow(.9,dt*60);f.life-=dt;
    if(f.life<=0)floatTexts.splice(i,1);
  }
}
function drawFloatTexts(){
  floatTexts.forEach(f=>{
    const a=Math.max(0,Math.min(1,f.life/f.max));
    ctx.save();ctx.globalAlpha=a;ctx.font="900 26px system-ui, sans-serif";ctx.textAlign="center";
    ctx.lineWidth=5;ctx.strokeStyle="rgba(0,0,0,.55)";ctx.strokeText(f.text,f.x-camera.x,f.y);
    ctx.fillStyle=f.color;ctx.fillText(f.text,f.x-camera.x,f.y);
    ctx.restore();
  });
}
// ল্যান্ড করার মুহূর্তে air-time আর flip হিসাব করে কয়েন বোনাস দেওয়া হচ্ছে।
function awardAirBonus(){
  const flips=Math.floor(truck.airRotation/(Math.PI*2));
  let bonusCoins=0,label="",color="#ffd83a";
  if(flips>=1){
    bonusCoins=flips*50+Math.floor(truck.airTime*12);
    label=(flips>=2?("FLIP x"+flips):"FLIP!")+" +"+bonusCoins;
    color="#ff6fae";
  }else if(truck.airTime>0.4){
    bonusCoins=Math.floor(truck.airTime*18); // v16 ব্যালান্স: ৪৫→১৮
    label="AIR TIME +"+bonusCoins;
    color="#ffd83a";
  }
  if(bonusCoins>0){
    save.coins=(save.coins||0)+bonusCoins;updateCoinsUI();coinSound();persist();
    spawnFloatText(truck.x,truck.y-95,label,color);
  }
  truck.airTime=0;truck.airRotation=0;
}

// ---------- RPM / FUEL / BOOST গেজ ক্লাস্টার (Hill Climb Racing-এর মতো ড্যাশবোর্ড, স্ক্রিন-স্পেসে আঁকা) ----------
function drawGauge(cx,cy,r,value,label,color){
  ctx.save();ctx.translate(cx,cy);
  // outer ring
  ctx.fillStyle="#12181e";ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#3a444d";ctx.lineWidth=4;ctx.stroke();
  // colored arc scale (red-orange-green feel)
  const startA=Math.PI*.78,endA=Math.PI*2.22;
  ctx.lineWidth=6;
  ctx.strokeStyle="#e6493b";ctx.beginPath();ctx.arc(0,0,r-11,startA,startA+(endA-startA)*.32);ctx.stroke();
  ctx.strokeStyle="#f3a53a";ctx.beginPath();ctx.arc(0,0,r-11,startA+(endA-startA)*.32,startA+(endA-startA)*.62);ctx.stroke();
  ctx.strokeStyle="#79d94a";ctx.beginPath();ctx.arc(0,0,r-11,startA+(endA-startA)*.62,endA);ctx.stroke();
  // ticks
  ctx.strokeStyle="#c8d2d8";ctx.lineWidth=1.4;
  for(let i=0;i<=8;i++){const a=startA+(endA-startA)*(i/8);ctx.beginPath();ctx.moveTo(Math.cos(a)*(r-18),Math.sin(a)*(r-18));ctx.lineTo(Math.cos(a)*(r-11),Math.sin(a)*(r-11));ctx.stroke();}
  // needle
  const nv=Math.max(0,Math.min(1,value)),na=startA+(endA-startA)*nv;
  ctx.save();ctx.rotate(na);ctx.strokeStyle="#f4f7f8";ctx.lineWidth=3;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-r*.14,0);ctx.lineTo(r*.72,0);ctx.stroke();ctx.restore();
  ctx.fillStyle="#dfe6ea";ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fill();
  // icon/fuel pump in the middle-bottom, and label below
  ctx.fillStyle=color;ctx.font="700 10px system-ui, sans-serif";ctx.textAlign="center";ctx.fillText(label,0,r+15);
  ctx.restore();
}
function drawGaugeCluster(){
  if(state!=="play")return;
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0],maxSpeed=430+v.speed*260+currentUpgrades().engine*18;
  const rpmVal=Math.min(1,Math.abs(truck.vx)/Math.max(1,maxSpeed));
  // BOOST gauge এখন সাজানো নয়—আসল boostEnergy (Nitro ট্যাংক) দেখায়, বাটন চাপলে কমবে, ছেড়ে দিলে আবার ভরবে।
  const boostVal=Math.max(0,Math.min(1,(truck.boostEnergy||0)/100));
  // ধাপ ৩: এখন আসল fuel tank দেখানো হয় (আগে এটা সাজানো মান ছিল)।
  const fuelVal=Math.max(0,Math.min(1,(truck.fuel===undefined?FUEL_CONFIG.cap:truck.fuel)/FUEL_CONFIG.cap));
  const cy=H-58,gap=86,r=34;
  drawGauge(W/2-gap,cy,r,rpmVal,"RPM","#e6493b");
  drawGauge(W/2,cy,r*1.08,fuelVal,"FUEL",fuelVal<=FUEL_CONFIG.lowThreshold/FUEL_CONFIG.cap?"#ff5a3a":"#79d94a");
  drawGauge(W/2+gap,cy,r,boostVal,"BOOST",boostVal<=0?"#666":"#9b6bff");
}

// Coin spark।
function coinBurst(x,y){
  // Spark loop। 
  for(let i=0;i<10;i++){
    // Particle। 
    particles.push({
      type:"coin",
      x:x,
      y:y,
      vx:(Math.random()-.5)*180,
      vy:-60-Math.random()*160,
      life:.35,
      max:.35,
      size:3+Math.random()*4
    });
  }
}

// Particle update। 
function updateParticles(dt){
  // Loop। 
  particles.forEach(p=>{
    // X। 
    p.x+=p.vx*dt;
    // Y। 
    p.y+=p.vy*dt;
    // Gravity। 
    p.vy+=420*dt;
    // Life। 
    p.life-=dt;
  });

  // Dead remove। 
  particles=particles.filter(p=>p.life>0);
}


// ==============================
// PHYSICS
// ==============================

// Physics update। 
function updatePhysics(dt){
  // Game running না হলে return। 
  if(state!=="play") return;

  // Engine। 
  updateEngine();

  // Current vehicle। 
  const v=vehicles[save.selectedVehicle];

  // Current upgrades। 
  const up=currentUpgrades();

  // Engine multiplier। 
  const enginePower=1+(up.engine-1)*.09;

  // Tire grip। 
  const grip=1+(up.tires-1)*.055;

  // Suspension। 
  const suspension=1+(up.suspension-1)*.07;

  // Boost multiplier। 
  const boost=1+(up.boost-1)*.08;

  // DRIVE button অথবা GAS pedal চাপলে forward acceleration হবে। 
  if(keys.right || keys.gas){
    // DRIVE মূল acceleration দেবে। 
    const drivePower = keys.gas ? 720 : 560;
    // Vehicle upgrade অনুযায়ী acceleration বাড়বে। 
    truck.vx += drivePower*enginePower*v.speed*boost*dt;
  }

  // REVERSE button চাপলে truck পিছনে যাবে। 
  if(keys.left){
    // Reverse speed controlled রাখা হচ্ছে। 
    truck.vx -= 360*enginePower*dt;
  }

  // BRAKE button চাপলে truck দ্রুত থামবে। 
  if(keys.brake){
    // Strong braking। 
    truck.vx *= Math.pow(.018,dt);
  }

  // Natural friction। 
  truck.vx *= Math.pow(.90,dt);

  // Speed limit। 
  truck.vx=Math.max(-190,Math.min(700,truck.vx));

  // Gravity। 
  truck.vy+=1420/suspension*dt;

  // X movement। 
  truck.x+=truck.vx*dt;

  // Reverse করলে truck world-এর start boundary-এর বাইরে যেতে পারবে না।
  if(truck.x<250){
    truck.x=250;
    truck.vx=Math.max(0,truck.vx);
  }

  // Y movement। 
  truck.y+=truck.vy*dt;

  // Wheel spin। 
  truck.wheelSpin+=truck.vx*dt/truck.wheelR;

  // Wheel positions। 
  const rearX=truck.x-truck.wheelBase/2;
  const frontX=truck.x+truck.wheelBase/2;

  // Ground height। 
  const rearGround=isGap(rearX)?Infinity:terrainY(rearX);
  const frontGround=isGap(frontX)?Infinity:terrainY(frontX);

  // Contact Y। 
  const rearContact=rearGround-truck.wheelR;
  const frontContact=frontGround-truck.wheelR;

  // দুই wheel-ই valid ground-এ আছে কিনা দেখা হচ্ছে। 
  if(isFinite(rearContact)&&isFinite(frontContact)){
    // Chassis target। 
    const targetY=(rearContact+frontContact)/2-25;

    // Target terrain angle। 
    const targetAngle=Math.atan2(frontContact-rearContact,truck.wheelBase);

    // Ground contact। 
    if(truck.y>=targetY && truck.vy>=-120){

      // Hard landing sound। 
      if(!truck.onGround && truck.vy>250){
        // Dust। 
        dust(truck.x,targetY+28,14);
        // Landing sound। 
        tone(70,.16,.12,"sine");
      }

      // Snap to ground। 
      truck.y=targetY;

      // Soft bounce। 
      truck.vy*=-.10;

      // Ground। 
      truck.onGround=true;

      // Angle difference। 
      const diff=Math.atan2(Math.sin(targetAngle-truck.angle),Math.cos(targetAngle-truck.angle));

      // Suspension rotation। 
      truck.angVel+=diff*24*dt*grip;

      // Angle। 
      truck.angle+=truck.angVel*dt;

      // Damping। 
      truck.angVel*=Math.pow(.012,dt);

      // Dust while driving। 
      if(Math.abs(truck.vx)>100 && Math.random()<dt*12){
        dust(rearX,rearContact+22,1);
      }

    }else{
      // Air। 
      truck.onGround=false;

      // Air rotate left। 
      if(keys.left) truck.angVel-=3.4*dt*grip;

      // Air rotate right। 
      if(keys.right) truck.angVel+=3.4*dt*grip;

      // Angular damping। 
      truck.angVel*=Math.pow(.87,dt);

      // Rotation। 
      truck.angle+=truck.angVel*dt;
    }
  }else{
    // Gap = air। 
    truck.onGround=false;

    // Air rotate left। 
    if(keys.left) truck.angVel-=3.4*dt*grip;

    // Air rotate right। 
    if(keys.right) truck.angVel+=3.4*dt*grip;

    // Damping। 
    truck.angVel*=Math.pow(.87,dt);

    // Rotation। 
    truck.angle+=truck.angVel*dt;
  }

  // Collect coins। 
  collectCoins();

  // Camera। 
  updateCamera(dt);

  // Particles। 
  updateParticles(dt);

  // Crash। 
  if(checkCrash()) return;

  // Finish। 
  if(truck.x>=finishX()){
    completeLevel();
  }
}

// Camera update। 
function updateCamera(dt){
  // Target। 
  const target=truck.x-W*.30;
  // Smooth camera। 
  camera.x+=(target-camera.x)*(1-Math.pow(.0008,dt));
  // Don't move backward past start। 
  camera.x=Math.max(0,camera.x);
}


// ==============================
// CRASH
// ==============================

// Crash check। 
function checkCrash(){
  // Water surface। 
  const water=H-105;

  // Wheel positions। 
  const rearX=truck.x-truck.wheelBase/2;
  const frontX=truck.x+truck.wheelBase/2;

  // দুই wheel gap-এর মধ্যে আছে কিনা দেখা হচ্ছে। 
  const bothWheelsGap = isGap(rearX) && isGap(frontX);

  // যেকোনো wheel gap-এর edge-এর উপর চলে গেছে কিনা দেখা হচ্ছে। 
  const oneWheelGap = isGap(rearX) || isGap(frontX);

  // Gap-এর নিচে truck কতটা নেমেছে সেটা দেখা হচ্ছে। 
  const fallingBelowGap = truck.y > H-180;

  // Gap-এর ভিতরে ঢুকে গেলে ground snap বন্ধ রেখে death নিশ্চিত করা হচ্ছে। 
  if((bothWheelsGap || oneWheelGap) && fallingBelowGap){
    // Water fall sound। 
    crash("You fell into the gap!");
    return true;
  }

  // Camera/world-এর অনেক নিচে চলে গেলে অবশ্যই crash হবে। 
  if(truck.y>H+40){
    // Fall death। 
    crash("You fell off the mountain!");
    return true;
  }

  // Normalized angle। 
  const a=Math.atan2(Math.sin(truck.angle),Math.cos(truck.angle));

  // Spawn safety grace — level শুরুতে accidental rotation-এ crash হবে না।
  if(truck.x<520) return false;

  // Upside down। 
  if(Math.abs(a)>2.45 && !truck.onGround){
    crash("The truck landed upside down!");
    return true;
  }

  // Ground rollover। 
  if(truck.onGround && Math.abs(a)>1.90 && Math.abs(truck.vx)>130){
    crash("The truck rolled over!");
    return true;
  }

  // No crash। 
  return false;
}

// Crash। 
function crash(reason){
  // Duplicate আটকানো। 
  if(state!=="play") return;
  // State। 
  state="crash";
  // Engine stop। 
  engineStop();
  // Crash sound। 
  crashSound();
  // Text। 
  document.getElementById("crashText").textContent=reason;
  // Screen। 
  showScreen("crashMenu");
}


// ==============================
// COMPLETE
// ==============================

// Complete level। 
function completeLevel(){
  // State। 
  state="complete";
  // Engine stop। 
  engineStop();

  // Time। 
  elapsed=(performance.now()-levelStart)/1000;

  // Best। 
  const old=save.best[currentLevel];

  // Save best। 
  if(!old||elapsed<old){
    save.best[currentLevel]=elapsed;
  }

  // Mark complete। 
  save.completed[currentLevel]=true;

  // Unlock next। 
  if(currentLevel<TOTAL_LEVELS){
    save.unlocked=Math.max(save.unlocked,currentLevel+1);
  }

  // Reward। 
  const reward=60+Math.floor(currentLevel*2);

  // Coins। 
  coins+=reward;

  // Save। 
  save.coins=coins;

  // Persist। 
  persist();

  // Time। 
  document.getElementById("resultTime").textContent=formatTime(elapsed);

  // Reward। 
  document.getElementById("rewardText").textContent=`+${reward} coins`;

  // Stars। 
  const stars=elapsed<42?"★★★":elapsed<68?"★★☆":"★☆☆";

  // Stars। 
  document.getElementById("resultStars").textContent=stars;

  // Sound। 
  tone(660,.12,.11,"triangle");
  setTimeout(()=>tone(880,.18,.12,"triangle"),100);

  // Complete screen। 
  showScreen("completeMenu");
}


// ==============================
// LEVEL START
// ==============================

// Start level। 
function startLevel(id){
  // ==============================
  // LEVEL START — V16 REAL FIX
  // ==============================

  // Selected level valid range-এর মধ্যে রাখা হচ্ছে।
  currentLevel=Math.max(1,Math.min(TOTAL_LEVELS,id));

  // Game state সরাসরি PLAY করা হচ্ছে।
  state="play";

  // Truck starting point-এ reset করা হচ্ছে।
  resetTruck();

  // Level-এর coins নতুন করে তৈরি করা হচ্ছে।
  generateCoins();

  // Timer reset করা হচ্ছে।
  levelStart=performance.now();
  elapsed=0;

  // সব full-screen menu বন্ধ করা হচ্ছে।
  hideScreens();

  // Gameplay canvas দৃশ্যমান রাখা হচ্ছে।
  const canvas=document.getElementById("game");
  if(canvas){
    canvas.classList.remove("hidden");
    canvas.hidden=false;
    canvas.style.display="block";
    canvas.style.visibility="visible";
  }

  // Gameplay HUD চালু করা হচ্ছে।
  const hud=document.getElementById("hud");
  if(hud){
    hud.classList.remove("hidden");
    hud.style.display="";
    hud.style.visibility="visible";
  }

  // Driving controls চালু করা হচ্ছে।
  const controls=document.getElementById("controls");
  if(controls){
    controls.classList.remove("hidden");
    controls.style.display="";
    controls.style.visibility="visible";
  }

  // Audio unlock করা হচ্ছে এবং আগের settings/pause suppression পরিষ্কার করা হচ্ছে।
  try{resumeAudio();}catch(_){ }
  setAudioSuppressed(false);
  // Level start-এর সময় mute preference ছাড়া অন্য কোনো stale suppression থাকবে না।
  applyAudioVolume();

  // Engine sound শুরু করা হচ্ছে।
  try{engineStart();}catch(_){ }

  // HUD refresh করা হচ্ছে।
  try{updateHUD();}catch(_){ }
}


// ==============================
// UI SCREENS
// ==============================

// Hide all screens। 
function hideScreens(){
  // সব screen-এর ID তালিকা।
  const ids=["mainMenu","levelMenu","garageMenu","storeMenu","pauseMenu","crashMenu","completeMenu","settingsMenu"];

  // প্রতিটি screen hide করা হচ্ছে।
  ids.forEach(id=>{
    // Screen element নেওয়া হচ্ছে।
    const el=document.getElementById(id);
    // Element থাকলে hide করা হচ্ছে।
    if(el){
      el.classList.add("hidden");
      el.style.display="";
      el.style.visibility="";
      el.style.opacity="";
      el.style.pointerEvents="";
    }
  });
}

// Show screen। 
function showScreen(id){
  // আগে সব full-screen screen hide করা হচ্ছে।
  hideScreens();

  // প্রয়োজনীয় screen নেওয়া হচ্ছে।
  const el=document.getElementById(id);

  // Screen পাওয়া গেলে show করা হচ্ছে।
  if(el){
    el.classList.remove("hidden");
    el.style.display="";
    el.style.visibility="";
    el.style.opacity="";
    el.style.pointerEvents="auto";
  }

  // Level/Garage/Store/Main Menu-তে gameplay HUD/controls hide করা হচ্ছে,
  // যাতে screen-এর উপর gameplay UI overlap না করে।
  const menuScreens=["mainMenu","levelMenu","garageMenu","storeMenu"];
  const gameplayMenu=menuScreens.includes(id);
  const hud=document.getElementById("hud");
  const controls=document.getElementById("controls");

  if(gameplayMenu){
    hud.classList.add("hidden");
    controls.classList.add("hidden");
  }else if(id==="pauseMenu"||id==="crashMenu"||id==="completeMenu"){
    // Gameplay result/pause overlay-তে HUD এবং controls রাখা হবে।
    hud.classList.remove("hidden");
    controls.classList.remove("hidden");
  }
}

// Main menu। 
function goMain(){
  // সব movement key release।
  keys.left=false; keys.right=false; keys.gas=false; keys.brake=false;
  // Stop game। 
  state="menu";
  // Stop engine।
  engineStop();
  // Main menu-তে sound allowed।
  setAudioSuppressed(false);
  // Settings/pause overlay explicitly close।
  const settingsPanel=document.getElementById("settingsMenu");
  if(settingsPanel){settingsPanel.classList.add("hidden");settingsPanel.style.display="none";}
  // Hide HUD। 
  document.getElementById("hud").classList.add("hidden");
  // Hide controls। 
  document.getElementById("controls").classList.add("hidden");
  // Update coins। 
  updateCoinsUI();
  // Main menu। 
  showScreen("mainMenu");
}


// ==============================
// LEVEL MENU
// ==============================

// Render level menu। 
function renderLevels(){
  // Coins। 
  document.getElementById("levelCoins").textContent=coins;

  // Range tabs container। 
  const tabs=document.getElementById("rangeTabs");

  // Clear। 
  tabs.innerHTML="";

  // 5 ranges। 
  for(let r=0;r<5;r++){
    // Button। 
    const b=document.createElement("button");
    // Class। 
    b.className="rangeTab"+(r===levelPage?" active":"");
    // Text। 
    b.textContent=`${r*20+1} - ${(r+1)*20}`;
    // Click। 
    b.onclick=()=>{
      levelPage=r;
      tone(480,.06,.05);
      renderLevels();
    };
    // Append। 
    tabs.appendChild(b);
  }

  // Grid। 
  const grid=document.getElementById("levelGrid");

  // Clear। 
  grid.innerHTML="";

  // Start ID। 
  const start=levelPage*20+1;

  // 20 cards। 
  for(let i=0;i<20;i++){
    // ID। 
    const id=start+i;
    // Unlocked। 
    const unlocked=id<=save.unlocked;
    // Completed। 
    const done=!!save.completed[id];
    // Current। 
    const current=id===currentLevel;

    // Card। 
    const card=document.createElement("div");

    // Class। 
    card.className="levelCard"+(current?" current":"");

    // Stars। 
    const stars=done?"★★★":"☆☆☆";

    // HTML। 
    card.innerHTML=`
      <div class="levelNumber">${id}</div>
      <div class="cardStars">${stars}</div>
      <div class="cardScene"><div class="cardTruck">🚙</div></div>
      <div>${levelName(id)}</div>
      ${unlocked?"":'<div class="lock">🔒</div>'}
    `;

    // Unlocked হলে click। 
    if(unlocked){
      card.onclick=()=>{
        tone(560,.06,.06);
        startLevel(id);
      };
    }else{
      // Locked click sound। 
      card.onclick=()=>tone(180,.09,.05);
    }

    // Add। 
    grid.appendChild(card);
  }

  // Page text। 
  document.getElementById("pageText").textContent=`${levelPage+1} / 5`;
}


// ==============================
// GARAGE
// ==============================

// Render garage। 
function renderGarage(){
  // Coins। 
  document.getElementById("garageCoins").textContent=coins;

  // Selected ID। 
  const selected=save.selectedVehicle;

  // Selected vehicle। 
  const v=vehicles[selected];

  // Preview। 
  document.getElementById("garageVehicle").textContent=v.emoji;
  document.getElementById("garageVehicleName").textContent=v.name;
  document.getElementById("garageVehicleDesc").textContent=v.desc;

  // Select button text। 
  document.getElementById("selectVehicleBtn").textContent="SELECTED";

  // Vehicle list। 
  const list=document.getElementById("vehicleList");

  // Clear। 
  list.innerHTML="";

  // All vehicles। 
  vehicles.forEach((vehicle,id)=>{
    // Card। 
    const card=document.createElement("div");

    // Owned। 
    const owned=save.ownedVehicles.includes(id);

    // Selected۔ 
    const isSelected=selected===id;

    // Class। 
    card.className="vehicleCard"+(isSelected?" selected":"");

    // Button label। 
    const label=isSelected?"SELECTED":owned?"SELECT":`BUY ${vehicle.price} 🪙`;

    // HTML। 
    card.innerHTML=`
      <div class="vehicleEmoji">${vehicle.emoji}</div>
      <h3>${vehicle.name}</h3>
      <p>Speed ${Math.round(vehicle.speed*100)}% • Grip ${Math.round(vehicle.grip*100)}%</p>
      <button>${label}</button>
    `;

    // Button। 
    card.querySelector("button").onclick=()=>{
      // Already selected। 
      if(isSelected){
        tone(620,.05,.05);
        return;
      }

      // Owned। 
      if(owned){
        // Select। 
        save.selectedVehicle=id;
        // Save। 
        persist();
        // Sound। 
        tone(700,.08,.07);
        // Render। 
        renderGarage();
        return;
      }

      // Not enough coins। 
      if(coins<vehicle.price){
        tone(150,.12,.06);
        return;
      }

      // Pay। 
      coins-=vehicle.price;

      // Save coins। 
      save.coins=coins;

      // Add owned। 
      save.ownedVehicles.push(id);

      // Select purchased vehicle। 
      save.selectedVehicle=id;

      // Save। 
      persist();

      // Purchase sound। 
      tone(700,.10,.10,"triangle");
      setTimeout(()=>tone(980,.14,.08,"triangle"),90);

      // Render। 
      renderGarage();
      updateCoinsUI();
    };

    // Append। 
    list.appendChild(card);
  });

  // Upgrade UI। 
  renderUpgrades();
}

// Render upgrades। 
function renderUpgrades(){
  // Current upgrades। 
  const up=currentUpgrades();

  // Upgrade types। 
  ["engine","tires","suspension","boost"].forEach(type=>{
    // Level element। 
    document.getElementById(type+"Level").textContent=`LV ${up[type]}`;
    // Cost। 
    document.getElementById(type+"Cost").textContent=`${upgradeCost(type,up[type])} 🪙`;
  });
}

// Buy upgrade। 
function buyUpgrade(type){
  // Current upgrades। 
  const up=currentUpgrades();

  // Max level। 
  if(up[type]>=8){
    tone(160,.1,.05);
    return;
  }

  // Cost। 
  const cost=upgradeCost(type,up[type]);

  // Coins check। 
  if(coins<cost){
    tone(150,.12,.05);
    return;
  }

  // Pay। 
  coins-=cost;

  // Increase। 
  up[type]++;

  // Save। 
  save.coins=coins;

  // Persist। 
  persist();

  // Sound। 
  tone(720,.08,.08,"triangle");
  setTimeout(()=>tone(980,.12,.08,"triangle"),80);

  // Render। 
  renderGarage();
  updateCoinsUI();
}


// ==============================
// STORE
// ==============================

// Render store। 
function renderStore(){
  // Coin। 
  document.getElementById("storeCoins").textContent=coins;

  // Daily claim status। 
  const daily=document.getElementById("dailyBtn");

  // Already claimed। 
  if(save.dailyClaimed){
    daily.textContent="CLAIMED ✓";
    daily.disabled=true;
    daily.style.opacity=".55";
  }else{
    daily.textContent="CLAIM +100";
    daily.disabled=false;
    daily.style.opacity="1";
  }

  // Coin Pack দৈনিক limit status।
  const coinPackBtn=document.getElementById("coinPackBtn");
  if(coinPackBtn){
    const limit=(typeof COIN_PACK_DAILY_LIMIT!=="undefined")?COIN_PACK_DAILY_LIMIT:4;
    const used=Number(save.coinPackClaims)||0;
    if(used>=limit){
      coinPackBtn.textContent="LIMIT REACHED";
      coinPackBtn.disabled=true;
      coinPackBtn.style.opacity=".55";
    }else{
      coinPackBtn.textContent=`GET +${COIN_PACK_AMOUNT} (${used}/${limit})`;
      coinPackBtn.disabled=false;
      coinPackBtn.style.opacity="1";
    }
  }

  // Map Bundle / Vehicle Bundle / VIP Upgrade — dynamic bundle status (typeof guard: TDZ-safe, শুধু maps/vehiclesV22 ready থাকলে চলবে)।
  const mapBtn=document.getElementById("mapBundleBtn");
  if(mapBtn&&typeof maps!=="undefined"){
    const locked=maps.map((m,i)=>({m,i})).filter(o=>!save.ownedMaps.includes(o.i));
    if(locked.length===0){mapBtn.textContent="ALL OWNED ✓";mapBtn.disabled=true;mapBtn.style.opacity=".55";document.getElementById("mapBundleDesc").textContent="You already own every map.";}
    else{const cost=Math.round(locked.reduce((s,o)=>s+o.m.price,0)*.75);mapBtn.textContent=`BUY BUNDLE ${cost} 🪙`;mapBtn.disabled=false;mapBtn.style.opacity="1";document.getElementById("mapBundleDesc").textContent=`Unlock the remaining ${locked.length} map(s) — 25% off.`;}
  }
  const vehBtn=document.getElementById("vehicleBundleBtn");
  if(vehBtn&&typeof vehiclesV22!=="undefined"){
    const locked=vehiclesV22.map((v,i)=>({v,i})).filter(o=>!save.ownedVehicles.includes(o.i));
    if(locked.length===0){vehBtn.textContent="ALL OWNED ✓";vehBtn.disabled=true;vehBtn.style.opacity=".55";document.getElementById("vehicleBundleDesc").textContent="You already own every truck.";}
    else{const cost=Math.round(locked.reduce((s,o)=>s+o.v.price,0)*.75);vehBtn.textContent=`BUY BUNDLE ${cost} 🪙`;vehBtn.disabled=false;vehBtn.style.opacity="1";document.getElementById("vehicleBundleDesc").textContent=`Unlock the remaining ${locked.length} truck(s) — 25% off.`;}
  }
  const vipBtn=document.getElementById("vipUpgradeBtn");
  if(vipBtn&&typeof currentUpgrades!=="undefined"){
    const up=currentUpgrades();
    if(up.engine>=8&&up.tires>=8&&up.suspension>=8&&up.boost>=8){vipBtn.textContent="MAXED ✓";vipBtn.disabled=true;vipBtn.style.opacity=".55";}
    else{vipBtn.textContent="BUY 1200 🪙";vipBtn.disabled=false;vipBtn.style.opacity="1";}
  }
}

// Update coin UI। 
function updateCoinsUI(){
  // Menu। 
  document.getElementById("menuCoins").textContent=coins;
  // HUD। 
  document.getElementById("coins").textContent=coins;
  // Level। 
  document.getElementById("levelCoins").textContent=coins;
  // Garage। 
  document.getElementById("garageCoins").textContent=coins;
  // Store।
  document.getElementById("storeCoins").textContent=coins;
}

// Toast notification—যেমন "Not enough balance!" এক-দুই সেকেন্ডের জন্য নিচে দেখাবে।
let toastTimer=null;
function showToast(msg){
  const el=document.getElementById("toast");
  if(!el)return;
  clearTimeout(toastTimer);
  el.textContent=msg;
  el.classList.remove("hidden");
  // reflow trigger যাতে transition আবার কাজ করে বারবার দেখালেও।
  void el.offsetWidth;
  el.classList.add("show");
  toastTimer=setTimeout(()=>{
    el.classList.remove("show");
    setTimeout(()=>el.classList.add("hidden"),240);
  },1600);
}
// ব্যালেন্স কম থাকলে সবসময় এই একই helper থেকে sound+toast দুটোই হবে।
function notEnoughCoins(){
  tone(120,.15,.08,"sawtooth");
  showToast("Not enough balance! 🪙");
}


// ==============================
// AI BACKGROUND
// ==============================

// Reference-style AI environment image নেওয়া হচ্ছে। 
const aiBackground = new Image();

// Project-এর background image path সেট করা হচ্ছে। 
aiBackground.src = "background_ai.png";

// Image load হলে redraw-এর জন্য flag রাখা হচ্ছে। 
let aiBackgroundReady = false;

// Background load event। 
aiBackground.onload = ()=>{
  // Image ready। 
  aiBackgroundReady = true;
};

// ==============================
// DRAWING
// ==============================

// Polygon helper। 
function poly(points,fill,stroke=null,width=1){
  // Begin path। 
  ctx.beginPath();
  // First point। 
  ctx.moveTo(points[0][0],points[0][1]);
  // Other points। 
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i][0],points[i][1]);
  // Close। 
  ctx.closePath();
  // Fill। 
  ctx.fillStyle=fill;
  ctx.fill();
  // Stroke if needed। 
  if(stroke){
    ctx.strokeStyle=stroke;
    ctx.lineWidth=width;
    ctx.stroke();
  }
}

// Sky। 
function drawSky(){
  // প্রথমে clean sky gradient আঁকা হচ্ছে। 
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#25b9ef");
  g.addColorStop(.60,"#71d8ee");
  g.addColorStop(1,"#bdeff4");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

  // AI reference background পাওয়া গেলে সেটি ব্যবহার করা হচ্ছে। 
  if(aiBackgroundReady){
    // Background image-এর source ratio রাখা হচ্ছে। 
    const sourceRatio=aiBackground.width/aiBackground.height;
    // Game area-এর upper environment height। 
    const bgH=Math.max(H*.58,320);
    // Width পুরো screen cover করবে। 
    const bgW=bgH*sourceRatio;
    // Center থেকে সামান্য camera parallax দেওয়া হচ্ছে। 
    const parallax=(camera.x*.045)%Math.max(1,bgW-W);
    // Image screen-এর মাঝখানে বসানো হচ্ছে। 
    const dx=(W-bgW)/2-parallax;
    // AI mountain/waterfall environment আঁকা হচ্ছে। 
    ctx.drawImage(aiBackground,dx,0,bgW,bgH);

    // Screen-এর ডান/বাম edge seamless রাখার জন্য দ্বিতীয় copy। 
    if(dx+bgW<W){
      ctx.drawImage(aiBackground,dx+bgW,0,bgW,bgH);
    }
    // Screen-এর বাম edge cover করা হচ্ছে। 
    if(dx>0){
      ctx.drawImage(aiBackground,dx-bgW,0,bgW,bgH);
    }
  }

  // Reference-এর মতো foreground water layer। 
  ctx.fillStyle="#08b8df";
  ctx.fillRect(0,H-105,W,105);

  // পানিতে animated white wave lines। 
  ctx.strokeStyle="#eaffff";
  ctx.lineWidth=2;

  // একাধিক wave layer। 
  for(let i=0;i<9;i++){
    // Wave path। 
    ctx.beginPath();
    // Wave-এর শুরু। 
    ctx.moveTo(-20,H-95+i*13);
    // Wave-এর curve। 
    ctx.quadraticCurveTo(W*.28,H-112+i*13,W*.55,H-91+i*13);
    // Wave-এর দ্বিতীয় curve। 
    ctx.quadraticCurveTo(W*.78,H-72+i*13,W+30,H-90+i*13);
    // Wave draw। 
    ctx.stroke();
  }

  // Water-এর ছোট highlights। 
  ctx.globalAlpha=.55;
  ctx.strokeStyle="#ffffff";
  ctx.lineWidth=1;

  // অনেক ছোট horizontal reflections। 
  for(let i=0;i<24;i++){
    // Deterministic position। 
    const x=((i*173-camera.x*.15)%(W+180))-90;
    // Reflection y। 
    const y=H-25-(i%6)*13;
    // Reflection। 
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x+45+(i%4)*16,y);
    ctx.stroke();
  }

  // Alpha reset। 
  ctx.globalAlpha=1;
}

// REFERENCE ROAD EDGE
// Continuous grass lip + soil highlight আঁকার helper।
function drawRoadSurface(x1,x2){
  // Smooth road edge।
  ctx.strokeStyle="#39d34a";
  ctx.lineWidth=10;
  ctx.lineCap="round";

  ctx.beginPath();
  for(let x=x1;x<=x2;x+=12){
    const y=terrainY(x)-camera.y;
    if(x===x1) ctx.moveTo(x-camera.x,y);
    else ctx.lineTo(x-camera.x,y);
  }
  ctx.stroke();

  // Grass highlight।
  ctx.strokeStyle="#8bea48";
  ctx.lineWidth=3;

  ctx.beginPath();
  for(let x=x1;x<=x2;x+=18){
    const y=terrainY(x)-camera.y-4;
    if(x===x1) ctx.moveTo(x-camera.x,y);
    else ctx.lineTo(x-camera.x,y);
  }
  ctx.stroke();
}

// Terrain। 
function drawTerrain(){
  // Visible start। 
  const start=Math.floor(camera.x/7)*7-35;
  // Visible end। 
  const end=camera.x+W+45;

  // Ground segments। 
  for(let x=start;x<end;x+=7){
    // Gap skip। 
    if(isGap(x)||isGap(x+7)) continue;

    // Ground polygon। 
    ctx.beginPath();
    ctx.moveTo(x-camera.x,terrainY(x));
    ctx.lineTo(x+7-camera.x,terrainY(x+7));
    ctx.lineTo(x+7-camera.x,H-105);
    ctx.lineTo(x-camera.x,H-105);
    ctx.closePath();

    // Dirt। 
    ctx.fillStyle="#f2c9ae";
    ctx.fill();
  }

  // Grass top। 
  for(let x=start;x<end;x+=7){
    // Gap skip। 
    if(isGap(x)||isGap(x+7)) continue;

    // Green top। 
    ctx.strokeStyle="#48d45c";
    ctx.lineWidth=15;
    ctx.beginPath();
    ctx.moveTo(x-camera.x,terrainY(x));
    ctx.lineTo(x+7-camera.x,terrainY(x+7));
    ctx.stroke();

    // Dark grass detail। 
    ctx.strokeStyle="#237f42";
    ctx.lineWidth=3;
    ctx.setLineDash([3,5]);
    ctx.beginPath();
    ctx.moveTo(x-camera.x,terrainY(x)-1);
    ctx.lineTo(x+7-camera.x,terrainY(x+7)-1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Cliff support pillars। 
  for(let x=Math.floor(start/100)*100;x<end;x+=100){
    // Gap skip। 
    if(isGap(x)) continue;

    // Y। 
    const y=terrainY(x);

    // Pillar। 
    ctx.strokeStyle="#c97968";
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.moveTo(x-camera.x,y+8);
    ctx.lineTo(x-camera.x,Math.min(H-105,y+180));
    ctx.stroke();

    // Top block। 
    ctx.fillStyle="#df8f7a";
    ctx.fillRect(x-camera.x-12,y+3,24,12);
  }

  // Foreground rock shadows। 
  for(let x=Math.floor(start/230)*230;x<end;x+=230){
    // Gap-এর ভিতরের rock বাদ দেওয়া হচ্ছে। 
    if(isGap(x)) continue;
    // Terrain top। 
    const y=terrainY(x);
    // Shadow/depth polygon। 
    poly([
      [x-camera.x-42,y+68],
      [x-camera.x-15,y+28],
      [x-camera.x+25,y+36],
      [x-camera.x+48,y+70],
      [x-camera.x+18,y+92],
      [x-camera.x-25,y+90]
    ],"#596879");
  }

  // Rocks। 
  for(let x=Math.floor(start/170)*170;x<end;x+=170){
    // Skip gap। 
    if(isGap(x)) continue;
    // Y। 
    const y=terrainY(x);
    // Rock। 
    poly([
      [x-camera.x-24,y+45],
      [x-camera.x-8,y+12],
      [x-camera.x+20,y+20],
      [x-camera.x+32,y+45],
      [x-camera.x+10,y+62],
      [x-camera.x-18,y+59]
    ],"#727f8c");
  }
}

// Draw bridge over a gap। 
function drawBridges(){
  // Gaps। 
  getGaps().forEach(([a,b],index)=>{
    // Bridge only on some levels/gaps। 
    if((index+currentLevel)%3!==0) return;

    // Start screen X। 
    const x=a-camera.x;
    // End screen X। 
    const end=a+b-camera.x;

    // Offscreen skip। 
    if(end<0||x>W) return;

    // Bridge deck। 
    ctx.strokeStyle="#9a5d3c";
    ctx.lineWidth=18;
    ctx.beginPath();
    ctx.moveTo(x,terrainY(a)+20);
    ctx.lineTo(end,terrainY(a+b)+20);
    ctx.stroke();

    // Wood planks। 
    ctx.strokeStyle="#e0a067";
    ctx.lineWidth=7;

    // Planks। 
    for(let p=x;p<end;p+=34){
      ctx.beginPath();
      ctx.moveTo(p,terrainY(a+(p-x))+10);
      ctx.lineTo(p,terrainY(a+(p-x))+30);
      ctx.stroke();
    }
  });
}

// Finish flag। 
function drawFinish(){
  // X। 
  const x=finishX()-camera.x;
  // Y। 
  const y=terrainY(finishX());

  // Pole। 
  ctx.strokeStyle="#704538";
  ctx.lineWidth=7;
  ctx.beginPath();
  ctx.moveTo(x,y);
  ctx.lineTo(x,y-130);
  ctx.stroke();

  // Flag cloth। 
  for(let r=0;r<5;r++){
    for(let c=0;c<4;c++){
      ctx.fillStyle=(r+c)%2?"#fff":"#202020";
      ctx.fillRect(x+5+r*14,y-126+c*14,14,14);
    }
  }
}

// Wheel। 
function drawWheel(x,y,r,rotation){
  // Save। 
  ctx.save();
  // Position। 
  ctx.translate(x,y);
  // Rotation। 
  ctx.rotate(rotation);

  // Tire। 
  ctx.fillStyle="#0b1015";
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();

  // Tire highlight। 
  ctx.strokeStyle="#36434c";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.arc(0,0,r*.78,0,Math.PI*2);
  ctx.stroke();

  // Spokes। 
  ctx.strokeStyle="#69767e";
  ctx.lineWidth=3;

  // 10 spokes। 
  for(let i=0;i<10;i++){
    ctx.rotate(Math.PI/5);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(r*.65,0);
    ctx.stroke();
  }

  // Hub। 
  ctx.fillStyle="#c4cdd2";
  ctx.beginPath();
  ctx.arc(0,0,r*.23,0,Math.PI*2);
  ctx.fill();

  // Restore। 
  ctx.restore();
}


// Rounded rectangle helper — truck body/chassis আঁকার জন্য।
function roundRect(x,y,w,h,r=6){
  // Rounded path শুরু করা হচ্ছে।
  ctx.beginPath();
  // Radius সীমার মধ্যে রাখা হচ্ছে।
  const rr=Math.min(r,Math.abs(w)/2,Math.abs(h)/2);
  // Rounded rectangle আঁকা হচ্ছে।
  ctx.moveTo(x+rr,y);
  ctx.lineTo(x+w-rr,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr);
  ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr);
  ctx.quadraticCurveTo(x,y,x+rr,y);
  ctx.closePath();
}

// Truck। 
function drawTruck(){
  // ==============================
  // MONSTER TRUCK VISUAL
  // ==============================

  // Truck-এর position save করা হচ্ছে।
  ctx.save();

  // Truck-এর world position নেওয়া হচ্ছে।
  ctx.translate(truck.x-camera.x, truck.y);

  // Terrain-এর slope অনুযায়ী truck rotate হচ্ছে।
  ctx.rotate(truck.angle);

  // Suspension bounce তৈরি করা হচ্ছে।
  const bounce=Math.sin(performance.now()*0.012)*1.2;

  // Body একটু উঁচুতে বসানো হচ্ছে।
  ctx.translate(0,-bounce);

  // ------------------------------
  // Rear suspension shadow
  // ------------------------------

  // নিচে soft shadow।
  ctx.fillStyle="rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(0,42,62,10,0,0,Math.PI*2);
  ctx.fill();

  // Wheels প্রথমে নয় — body/chassis আগে আঁকা হবে,
  // তারপর wheels overlay হবে যাতে পুরো monster-truck body সবসময় visible থাকে।

  // ------------------------------
  // Chassis
  // ------------------------------

  // Dark metal chassis।
  ctx.fillStyle="#171d24";
  roundRect(-62,4,116,18,6);
  ctx.fill();

  // Suspension bars।
  ctx.strokeStyle="#8d3e20";
  ctx.lineWidth=5;

  ctx.beginPath();
  ctx.moveTo(-39,14);
  ctx.lineTo(-32,30);
  ctx.moveTo(40,13);
  ctx.lineTo(38,27);
  ctx.stroke();

  // ------------------------------
  // Main monster body
  // ------------------------------

  // Main yellow body।
  ctx.fillStyle="#f7b900";
  ctx.strokeStyle="#6b3b08";
  ctx.lineWidth=3;

  ctx.beginPath();
  ctx.moveTo(-57,-23);
  ctx.lineTo(-43,-48);
  ctx.lineTo(10,-53);
  ctx.lineTo(43,-39);
  ctx.lineTo(57,-8);
  ctx.lineTo(48,8);
  ctx.lineTo(-48,10);
  ctx.lineTo(-61,-4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Body highlight।
  ctx.fillStyle="#ffd83d";
  ctx.beginPath();
  ctx.moveTo(-43,-42);
  ctx.lineTo(5,-47);
  ctx.lineTo(29,-37);
  ctx.lineTo(-35,-31);
  ctx.closePath();
  ctx.fill();

  // ------------------------------
  // Cabin
  // ------------------------------

  // Cabin outer frame।
  ctx.fillStyle="#f5b600";
  ctx.strokeStyle="#62390c";
  ctx.lineWidth=3;

  ctx.beginPath();
  ctx.moveTo(-28,-49);
  ctx.lineTo(-16,-72);
  ctx.lineTo(17,-75);
  ctx.lineTo(36,-51);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front windshield।
  ctx.fillStyle="#a9e9f5";
  ctx.beginPath();
  ctx.moveTo(1,-69);
  ctx.lineTo(15,-70);
  ctx.lineTo(29,-53);
  ctx.lineTo(4,-54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Side window।
  ctx.fillStyle="#8fd9eb";
  ctx.beginPath();
  ctx.moveTo(-13,-68);
  ctx.lineTo(-7,-69);
  ctx.lineTo(-1,-54);
  ctx.lineTo(-25,-54);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Window shine।
  ctx.strokeStyle="rgba(255,255,255,.75)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(-21,-64);
  ctx.lineTo(-9,-66);
  ctx.stroke();

  // ------------------------------
  // Front bumper
  // ------------------------------

  // Heavy black bumper।
  ctx.fillStyle="#111820";
  roundRect(45,-3,22,9,3);
  ctx.fill();

  // Red recovery hook।
  ctx.strokeStyle="#e04725";
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.arc(64,4,5,0,Math.PI);
  ctx.stroke();

  // ------------------------------
  // Roll cage
  // ------------------------------

  ctx.strokeStyle="#202830";
  ctx.lineWidth=3;

  ctx.beginPath();
  ctx.moveTo(-43,-50);
  ctx.lineTo(-37,-61);
  ctx.lineTo(25,-65);
  ctx.lineTo(37,-50);
  ctx.stroke();

  // ------------------------------
  // Hood detail
  // ------------------------------

  ctx.fillStyle="#e79e00";
  roundRect(24,-27,28,6,2);
  ctx.fill();

  // Headlight।
  ctx.fillStyle="#fff4b0";
  roundRect(49,-27,8,9,2);
  ctx.fill();

  // ------------------------------
  // Roof lights
  // ------------------------------

  for(let i=0;i<5;i++){
    // Roof light glow।
    ctx.shadowColor="#ffe65b";
    ctx.shadowBlur=7;

    ctx.fillStyle=i===2?"#fff2a0":"#ffd22e";
    ctx.beginPath();
    ctx.arc(-20+i*9,-77,3.3,0,Math.PI*2);
    ctx.fill();
  }

  // Shadow reset।
  ctx.shadowBlur=0;

  // ------------------------------
  // Door details
  // ------------------------------

  ctx.strokeStyle="#a46a00";
  ctx.lineWidth=2;

  ctx.beginPath();
  ctx.moveTo(-10,-29);
  ctx.lineTo(-10,5);
  ctx.stroke();

  ctx.fillStyle="#4a3312";
  roundRect(-3,-25,7,3,1);
  ctx.fill();

  // ------------------------------
  // Exhaust pipe
  // ------------------------------

  ctx.strokeStyle="#303840";
  ctx.lineWidth=5;

  ctx.beginPath();
  ctx.moveTo(-48,-8);
  ctx.lineTo(-55,-25);
  ctx.lineTo(-50,-31);
  ctx.stroke();

  // Exhaust smoke particles।
  if(Math.random()<.35){
    ctx.globalAlpha=.25;
    ctx.fillStyle="#d7e0e5";
    ctx.beginPath();
    ctx.arc(-54,-35,4+Math.random()*4,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  }

  // ------------------------------
  // Wheels — body-এর উপর পরিষ্কারভাবে render
  // ------------------------------

  drawMonsterWheel(-38,31,25);
  drawMonsterWheel(42,27,28);

  // Body restore।
  ctx.restore();
}

// Monster truck-এর বিশাল wheel আঁকার function।
function drawMonsterWheel(x,y,r){
  // Outer tire।
  ctx.save();
  ctx.translate(x,y);

  // Tire।
  ctx.fillStyle="#10151a";
  ctx.beginPath();
  ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fill();

  // Tire outer highlight।
  ctx.strokeStyle="#303a43";
  ctx.lineWidth=3;
  ctx.stroke();

  // Deep tread blocks।
  ctx.fillStyle="#252d34";
  for(let i=0;i<14;i++){
    const a=i*Math.PI*2/14;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(-3,-r+2,6,9);
    ctx.restore();
  }

  // Rim।
  ctx.fillStyle="#8e9aa5";
  ctx.beginPath();
  ctx.arc(0,0,r*.48,0,Math.PI*2);
  ctx.fill();

  // Rim dark center।
  ctx.fillStyle="#343d45";
  ctx.beginPath();
  ctx.arc(0,0,r*.32,0,Math.PI*2);
  ctx.fill();

  // Rim spokes।
  ctx.strokeStyle="#c7d0d7";
  ctx.lineWidth=2;
  for(let i=0;i<8;i++){
    const a=i*Math.PI*2/8;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*r*.43,Math.sin(a)*r*.43);
    ctx.stroke();
  }

  // Hub।
  ctx.fillStyle="#dbe2e7";
  ctx.beginPath();
  ctx.arc(0,0,r*.13,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

// Coins draw। 
function drawCoins(){
  // Time animation। 
  const t=performance.now()/300;

  // Loop। 
  levelCoins.forEach(c=>{
    // Collected skip। 
    if(c.taken) return;

    // Screen X। 
    const x=c.x-camera.x;
    // Offscreen skip। 
    if(x<-40||x>W+40) return;

    // Floating bob। 
    const y=c.y+Math.sin(t+c.phase)*5;

    // Glow। 
    ctx.fillStyle="#ffd83a55";
    ctx.beginPath();
    ctx.arc(x,y,c.r+8,0,Math.PI*2);
    ctx.fill();

    // Coin। 
    ctx.fillStyle="#ffbf12";
    ctx.beginPath();
    ctx.arc(x,y,c.r,0,Math.PI*2);
    ctx.fill();

    // Coin border। 
    ctx.strokeStyle="#fff3a0";
    ctx.lineWidth=3;
    ctx.stroke();

    // Star। 
    ctx.fillStyle="#fff3a0";
    ctx.font="bold 19px Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("★",x,y+1);
  });
}

// Particles। 
function drawParticles(){
  // Loop।
  particles.forEach(p=>{
    // Alpha।
    ctx.globalAlpha=Math.max(0,p.life/p.max);
    // Color। boost কণার জন্য আলাদা glow সহ নীল-বেগুনি রঙ ব্যবহার হচ্ছে।
    if(p.type==="boost"){
      ctx.shadowColor="#9b6bff";ctx.shadowBlur=10;
      ctx.fillStyle=Math.random()<.5?"#8f6bff":"#4fd1ff";
    }else{
      ctx.shadowBlur=0;
      ctx.fillStyle=p.type==="coin"?"#ffd83a":p.type==="smoke"?"#5a5f66":"#d6ae88";
    }
    // Circle।
    ctx.beginPath();
    ctx.arc(p.x-camera.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
  });
  ctx.shadowBlur=0;

  // Reset alpha।
  ctx.globalAlpha=1;
}


// ==============================
// HUD
// ==============================

// Format time। 
function formatTime(sec){
  // Minutes। 
  const m=Math.floor(sec/60);
  // Seconds। 
  const s=Math.floor(sec%60);
  // Hundredths। 
  const ms=Math.floor((sec%1)*100);
  // Return। 
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}.${String(ms).padStart(2,"0")}`;
}

// HUD update। 
function updateHUD(){
  // Level। 
  document.getElementById("hudLevel").textContent=currentLevel;
  // Name। 
  document.getElementById("hudName").textContent=levelName(currentLevel);
  // Coins। 
  document.getElementById("coins").textContent=coins;
  // Best। 
  document.getElementById("best").textContent=save.best[currentLevel]?formatTime(save.best[currentLevel]):"--:--.--";

  // Progress। 
  const progress=Math.max(0,Math.min(1,(truck.x-180)/(finishX()-180)));

  // Fill। 
  document.getElementById("progressFill").style.width=(progress*100)+"%";

  // Truck marker। 
  document.getElementById("progressTruck").style.left=`calc(${progress*100}% - 10px)`;
}


// ==============================
// RENDER
// ==============================

// Render। 
function render(){
  // Sky। 
  drawSky();

  // REFERENCE ROAD EDGE
// Continuous grass lip + soil highlight আঁকার helper।
function drawRoadSurface(x1,x2){
  // Smooth road edge।
  ctx.strokeStyle="#39d34a";
  ctx.lineWidth=10;
  ctx.lineCap="round";

  ctx.beginPath();
  for(let x=x1;x<=x2;x+=12){
    const y=terrainY(x)-camera.y;
    if(x===x1) ctx.moveTo(x-camera.x,y);
    else ctx.lineTo(x-camera.x,y);
  }
  ctx.stroke();

  // Grass highlight।
  ctx.strokeStyle="#8bea48";
  ctx.lineWidth=3;

  ctx.beginPath();
  for(let x=x1;x<=x2;x+=18){
    const y=terrainY(x)-camera.y-4;
    if(x===x1) ctx.moveTo(x-camera.x,y);
    else ctx.lineTo(x-camera.x,y);
  }
  ctx.stroke();
}

// Terrain। 
  drawTerrain();

  // Bridges। 
  drawBridges();

  // Finish। 
  drawFinish();

  // Coins। 
  drawCoins();

  // Particles। 
  drawParticles();

  // Truck। 
  drawTruck();

  // Gameplay HUD। 
  if(state==="play"){
    // Timer। 
    elapsed=(performance.now()-levelStart)/1000;
    // Timer UI। 
    document.getElementById("timer").textContent=formatTime(elapsed);
    // HUD। 
    updateHUD();
  }
}

// Game loop। 
function loop(now){
  // Delta। 
  const dt=Math.min(.032,(now-lastFrame)/1000||.016);
  // Last frame। 
  lastFrame=now;

  // Physics। 
  updatePhysics(dt);

  // Render। 
  render();

  // Next। 
  requestAnimationFrame(loop);
}


// ==============================
// UI EVENTS
// ==============================

// Play। 
document.getElementById("playBtn").onclick=()=>{
  // Audio। 
  resumeAudio();
  // Sound। 
  tone(540,.08,.08);
  // Start first unlocked/current। 
  startLevel(1);
};

// Levels। 
document.getElementById("levelsBtn").onclick=()=>{
  // Audio। 
  resumeAudio();
  // Render। 
  renderLevels();
  // Show। 
  showScreen("levelMenu");
};

// Garage। 
document.getElementById("garageBtn").onclick=()=>{
  // Audio। 
  resumeAudio();
  // Render。 
  renderGarage();
  // Show۔ 
  showScreen("garageMenu");
};

// Store। 
document.getElementById("storeBtn").onclick=()=>{
  // Audio। 
  resumeAudio();
  // Render। 
  renderStore();
  // Show۔ 
  showScreen("storeMenu");
};

// Back from levels। 
document.getElementById("backLevelsBtn").onclick=()=>{
  // Sound۔ 
  tone(330,.06,.05);
  // Main। 
  goMain();
};

// Back from garage। 
document.getElementById("backGarageBtn").onclick=()=>{
  // Sound۔ 
  tone(330,.06,.05);
  // Main۔ 
  goMain();
};

// Back from store। 
document.getElementById("backStoreBtn").onclick=()=>{
  // Sound। 
  tone(330,.06,.05);
  // Main۔ 
  goMain();
};

// Previous level page। 
document.getElementById("prevPage").onclick=()=>{
  // Page। 
  levelPage=Math.max(0,levelPage-1);
  // Sound। 
  tone(330,.05,.05);
  // Render। 
  renderLevels();
};

// Next level page। 
document.getElementById("nextPage").onclick=()=>{
  // Page। 
  levelPage=Math.min(4,levelPage+1);
  // Sound। 
  tone(430,.05,.05);
  // Render। 
  renderLevels();
};

// Select vehicle। 
document.getElementById("selectVehicleBtn").onclick=()=>{
  // Sound। 
  tone(700,.07,.06);
};

// Upgrade buttons। 
document.querySelectorAll(".upgradeCard").forEach(card=>{
  // Click। 
  card.onclick=()=>buyUpgrade(card.dataset.upgrade);
});

// Daily reward। 
document.getElementById("dailyBtn").onclick=()=>{
  // Already claimed। 
  if(save.dailyClaimed) return;

  // Claim। 
  coins+=100;
  // Save। 
  save.coins=coins;
  // Mark claimed। 
  save.dailyClaimed=true;
  // Persist। 
  persist();
  // Sound। 
  coinSound();
  // UI। 
  renderStore();
  updateCoinsUI();
};

// Coin pack — দিনে সর্বোচ্চ COIN_PACK_DAILY_LIMIT বার claim করা যাবে।
document.getElementById("coinPackBtn").onclick=()=>{
  const limit=(typeof COIN_PACK_DAILY_LIMIT!=="undefined")?COIN_PACK_DAILY_LIMIT:4;
  if((Number(save.coinPackClaims)||0)>=limit){tone(150,.1,.05,"sawtooth");showToast("Daily limit reached! Try again tomorrow.");return;}
  // Free demo reward।
  coins+=COIN_PACK_AMOUNT;
  save.coinPackClaims=(Number(save.coinPackClaims)||0)+1;
  // Save।
  save.coins=coins;
  // Persist।
  persist();
  // Sound।
  coinSound();
  // UI।
  renderStore();
  updateCoinsUI();
};

// Boost pack। 
document.getElementById("boostPackBtn").onclick=()=>{
  // Cost। 
  const cost=150;

  // Coin check।
  if(coins<cost){
    notEnoughCoins();
    return;
  }

  // Pay।
  coins-=cost;

  // Upgrade boost। 
  const up=currentUpgrades();
  up.boost=Math.min(8,up.boost+1);

  // Save। 
  save.coins=coins;
  persist();

  // Sound।
  tone(760,.09,.08,"triangle");
  // UI।
  updateCoinsUI();
  renderStore();
};

// ---------- STORE BUNDLES (নতুন functionality) ----------
// এখনো unlock না-হওয়া সব map একসাথে discount দিয়ে কিনে ফেলা যাবে।
document.getElementById("mapBundleBtn").onclick=()=>{
  const locked=maps.map((m,i)=>({m,i})).filter(o=>!save.ownedMaps.includes(o.i));
  if(locked.length===0){tone(520,.05,.04);return;}
  const fullPrice=locked.reduce((s,o)=>s+o.m.price,0),cost=Math.round(fullPrice*.75);
  if(coins<cost){notEnoughCoins();return;}
  coins-=cost;save.coins=coins;locked.forEach(o=>save.ownedMaps.push(o.i));persist();purchaseSound();updateCoinsUI();renderStore();renderMaps();
};

// এখনো unlock না-হওয়া সব vehicle একসাথে discount দিয়ে কিনে ফেলা যাবে।
document.getElementById("vehicleBundleBtn").onclick=()=>{
  const locked=vehiclesV22.map((v,i)=>({v,i})).filter(o=>!save.ownedVehicles.includes(o.i));
  if(locked.length===0){tone(520,.05,.04);return;}
  const fullPrice=locked.reduce((s,o)=>s+o.v.price,0),cost=Math.round(fullPrice*.75);
  if(coins<cost){notEnoughCoins();return;}
  coins-=cost;save.coins=coins;locked.forEach(o=>save.ownedVehicles.push(o.i));persist();purchaseSound();updateCoinsUI();renderStore();renderGarage();
};

// সিলেক্টেড vehicle-এর সব upgrade (engine/tires/suspension/boost) এক ধাক্কায় +1 level বাড়িয়ে দেয়।
document.getElementById("vipUpgradeBtn").onclick=()=>{
  const cost=1200;
  if(coins<cost){notEnoughCoins();return;}
  const up=currentUpgrades();
  if(up.engine>=8&&up.tires>=8&&up.suspension>=8&&up.boost>=8){tone(520,.05,.04);return;}
  coins-=cost;
  up.engine=Math.min(8,up.engine+1);up.tires=Math.min(8,up.tires+1);up.suspension=Math.min(8,up.suspension+1);up.boost=Math.min(8,up.boost+1);
  save.coins=coins;persist();purchaseSound();updateCoinsUI();renderStore();renderGarage();
};

// Pause।
document.getElementById("pauseBtn").onclick=togglePause;

// Resume। 
document.getElementById("resumeBtn").onclick=()=>{
  // Resume। 
  if(state==="pause"){
    state="play";
    hideScreens();
    setAudioSuppressed(false);
    engineStart();
  }
};

// Pause levels। 
document.getElementById("pauseLevelsBtn").onclick=()=>{
  // Stop। 
  state="levels";
  // Engine। 
  engineStop();
  // Render। 
  renderLevels();
  // Show۔ 
  showScreen("levelMenu");
};

// Pause main। 
document.getElementById("pauseMenuBtn").onclick=goMain;

// Crash retry۔ 
document.getElementById("retryCrashBtn").onclick=()=>startLevel(currentLevel);

// Crash levels۔ 
document.getElementById("crashLevelsBtn").onclick=()=>{
  // Render। 
  renderLevels();
  // Show۔ 
  showScreen("levelMenu");
};

// Complete next। 
document.getElementById("nextLevelBtn").onclick=()=>{
  // Next level if available। 
  if(currentLevel<TOTAL_LEVELS) startLevel(currentLevel+1);
  else {
    renderLevels();
    showScreen("levelMenu");
  }
};

// Complete levels। 
document.getElementById("completeLevelsBtn").onclick=()=>{
  // Render۔ 
  renderLevels();
  // Show۔ 
  showScreen("levelMenu");
};

// Settings placeholder। 
let settingsReturnState="menu";

// Settings open।
document.getElementById("settingsBtn").onclick=()=>{
  // Settings click-কে browser user gesture হিসেবে audio resume করা হচ্ছে।
  resumeAudio();

  // কোন state থেকে settings এসেছে তা মনে রাখা হচ্ছে।
  settingsReturnState=(state==="settings"?"play":state);

  // Gameplay চললে engine থামিয়ে settings mode করা হচ্ছে।
  if(state==="play"){
    state="settings";
    engineStop();
    setAudioSuppressed(true);
  }

  // Slider এবং mute UI sync করা হচ্ছে।
  const slider=document.getElementById("volumeSlider");
  const value=document.getElementById("volumeValue");
  const mute=document.getElementById("muteToggle");
  slider.value=userVolume;
  value.textContent=Math.round(userVolume)+"%";
  mute.checked=userMuted;

  // Gameplay controls settings-এর নিচে না রেখে hide করা হচ্ছে।
  document.getElementById("controls").classList.add("hidden");

  // Settings overlay visible করা হচ্ছে।
  const panel=document.getElementById("settingsMenu");
  panel.classList.remove("hidden");
  panel.style.display="flex";
  panel.style.visibility="visible";
  panel.style.opacity="1";
  panel.style.pointerEvents="auto";
};

// Volume slider।
document.getElementById("volumeSlider").oninput=(e)=>{
  // Volume update।
  userVolume=Number(e.target.value);
  // Save।
  localStorage.setItem("hillRushVolume",String(userVolume));
  // Text update।
  document.getElementById("volumeValue").textContent=Math.round(userVolume)+"%";
  // Apply।
  applyAudioVolume();
};

// Mute toggle।
document.getElementById("muteToggle").onchange=(e)=>{
  // Mute state।
  userMuted=e.target.checked;
  // Save।
  localStorage.setItem("hillRushMuted",userMuted?"1":"0");
  // Apply।
  applyAudioVolume();
};

// Settings close।
document.getElementById("closeSettingsBtn").onclick=()=>{
  // Settings panel hide করা হচ্ছে।
  const panel=document.getElementById("settingsMenu");
  panel.classList.add("hidden");
  panel.style.display="none";
  panel.style.visibility="hidden";
  panel.style.pointerEvents="none";

  // Previous gameplay state restore করা হচ্ছে.
  if(settingsReturnState==="play"){
    state="play";
    resumeAudio();
    setAudioSuppressed(false);
    engineStart();
  }else if(settingsReturnState==="pause"){
    state="pause";
    setAudioSuppressed(true);
  }else{
    state=settingsReturnState;
    setAudioSuppressed(false);
  }
};



// Settings backdrop-এ click করলে close হবে।
document.getElementById("settingsMenu").addEventListener("click",(e)=>{
  if(e.target.id==="settingsMenu") document.getElementById("closeSettingsBtn").click();
});

// ==============================
// MOBILE CONTROLS
// ==============================

// Control buttons। 
document.querySelectorAll(".driveControl").forEach(button=>{
  // Key name। 
  const key=button.dataset.key;
  // Press state helper। 
  const press=()=>{
    resumeAudio();
    setAudioSuppressed(false);
    keys[key]=true;
    button.classList.add("pressed");
  };
  // Release state helper। 
  const release=()=>{
    keys[key]=false;
    button.classList.remove("pressed");
  };

  // Pointer press। 
  button.addEventListener("pointerdown",e=>{
    e.preventDefault();
    press();
    try{button.setPointerCapture(e.pointerId);}catch(_){}
  },{passive:false});
  // Pointer release। 
  button.addEventListener("pointerup",e=>{
    e.preventDefault();
    release();
    try{button.releasePointerCapture(e.pointerId);}catch(_){}
  },{passive:false});
  // Cancel/leave safety। 
  button.addEventListener("pointercancel",release);
  button.addEventListener("lostpointercapture",release);

  // Mouse/touch fallback for older browser behaviour। 
  button.addEventListener("mousedown",e=>{e.preventDefault();press();});
  button.addEventListener("mouseup",release);
  button.addEventListener("mouseleave",()=>{if(!button.hasPointerCapture?.(0)) release();});
});


// ==============================
// INPUT SAFETY
// ==============================

// Tab/app switch করলে সব control release করা হচ্ছে। 
addEventListener("blur",()=>{
  // সব movement key বন্ধ। 
  keys.left=false;
  keys.right=false;
  keys.gas=false;
  keys.brake=false;
});

// Page/tab change হলেও game নিজে থেকে pause করবে না।
// শুধু movement keys release করা হবে যাতে ফিরে এলে truck আটকে না থাকে।
document.addEventListener("visibilitychange",()=>{
  // Page hidden হলে safety release।
  if(document.hidden){
    // সব movement key বন্ধ।
    keys.left=false;
    keys.right=false;
    keys.gas=false;
    keys.brake=false;
  }
});


// ==============================
// PAUSE
// ==============================

// Pause function। 
function togglePause(){
  // Only gameplay থেকে। 
  if(state!=="play"&&state!=="pause") return;

  // Pause। 
  if(state==="play"){
    // Pause state। 
    state="pause";
    // Engine বন্ধ করা হচ্ছে।
    engineStop();
    // Pause করলে সব sound একসাথে mute হবে।
    setAudioSuppressed(true);
    // Screen। 
    showScreen("pauseMenu");
  }else{
    // Resume। 
    state="play";
    // Hide।
    hideScreens();
    // Sound আবার চালু করা হচ্ছে।
    setAudioSuppressed(false);
    // Engine।
    engineStart();
  }
}


// ============================================================
// HILL RUSH V22 — PREMIUM FUNCTIONAL PATCH
// ============================================================
// পুরোনো save-কে নতুন feature-এর জন্য migrate করা হচ্ছে।
if(!Array.isArray(save.ownedVehicles)) save.ownedVehicles=[0];
if(!save.upgrades) save.upgrades={};
if(!Number.isInteger(save.selectedMap)) save.selectedMap=0;
if(!Array.isArray(save.ownedMaps)) save.ownedMaps=[0];
for(let i=0;i<10;i++) if(!save.upgrades[i]) save.upgrades[i]={engine:1,tires:1,suspension:1,boost:1};
coins=Math.max(0,Math.floor(Number(save.coins)||250));
save.coins=coins;

// ---------- DAILY LIMIT RESET (Daily Bonus + Coin Pack প্রতিদিন নতুন করে claim করা যাবে) ----------
const COIN_PACK_DAILY_LIMIT=4;
// v16 ব্যালান্স: কয়েনের মান ২৫→১২, ফ্রি প্যাক ৫০০→২০০ (আগে কয়েন এত বেশি ছিল যে ৫-৬ লেভেলেই বাস কেনা হয়ে যেত)।
const COIN_VALUE=12,COIN_PACK_AMOUNT=200; // দিনে সর্বোচ্চ ৪ বার Coin Pack কেনা যাবে।
const todayKey=new Date().toDateString();
if(save.dayKey!==todayKey){
  save.dayKey=todayKey;
  save.dailyClaimed=false;
  save.coinPackClaims=0;
}
if(!Number.isFinite(save.coinPackClaims)) save.coinPackClaims=0;

persist();

// ---------- MAP DATA ----------
// প্রতিটি map-এর আলাদা scenario ও purchase price রাখা হচ্ছে।
const maps=[
  {name:"GREEN HILLS",desc:"Sunny mountains, lake & waterfall.",price:0,sky1:"#159ee8",sky2:"#a7ecf4",grass:"#45d34e",dirt:"#efc3a5",water:"#0caed4",theme:"hills"},
  {name:"ICE VALLEY",desc:"Frozen peaks with slippery roads.",price:900,sky1:"#5dcff2",sky2:"#eafcff",grass:"#dffaff",dirt:"#cde8ee",water:"#6bdcf1",theme:"ice"},
  {name:"JUNGLE RUN",desc:"Dense jungle and deep ravines.",price:1400,sky1:"#36c987",sky2:"#b7f29b",grass:"#29b94a",dirt:"#b87546",water:"#168fa2",theme:"jungle"},
  {name:"DESERT STORM",desc:"Hot dunes and rocky canyon jumps.",price:1900,sky1:"#ffb85a",sky2:"#ffe7a5",grass:"#d9b74e",dirt:"#d99448",water:"#4eb7c9",theme:"desert"},
  {name:"VOLCANO RIDGE",desc:"Lava glow and black rock climbs.",price:2800,sky1:"#341d3c",sky2:"#d35d3f",grass:"#5d8f42",dirt:"#4b3434",water:"#321e2a",theme:"volcano"},
  {name:"NIGHT CITY",desc:"Neon night road and city lights.",price:3400,sky1:"#071b48",sky2:"#245d9a",grass:"#3dbf8b",dirt:"#4b5365",water:"#102b53",theme:"night"},
  {name:"CANYON FALLS",desc:"Huge cliffs, bridges and waterfalls.",price:4200,sky1:"#2e8ed0",sky2:"#b7e7f2",grass:"#5bd84d",dirt:"#b86d3c",water:"#149bd1",theme:"canyon"},
  {name:"AUTUMN PEAK",desc:"Red forests and golden roads.",price:5000,sky1:"#e77939",sky2:"#ffe0a0",grass:"#d48b36",dirt:"#9a5838",water:"#277eaa",theme:"autumn"}
];

// Map selector render করা হচ্ছে।
function renderMaps(){
  const grid=document.getElementById("mapGrid");
  if(!grid)return;
  document.getElementById("mapCoins").textContent=coins;
  grid.innerHTML="";
  maps.forEach((m,id)=>{
    const owned=save.ownedMaps.includes(id),selected=save.selectedMap===id;
    const card=document.createElement("div");
    card.className="mapCard"+(selected?" selected":"")+(!owned?" locked":"");
    let deco=`<span class="mount"></span><span class="mount m2"></span><span class="mount m3"></span><span class="ground"></span><span class="sun"></span>`;
    if(m.theme==="ice")deco=`<span class="snow"></span><span class="mount"></span><span class="mount m2"></span><span class="ground"></span>`;
    if(m.theme==="jungle")deco+=`<span class="tree t1"></span><span class="tree t2"></span><span class="tree t3"></span>`;
    if(m.theme==="desert")deco=`<span class="sand"></span><span class="mount"></span><span class="mount m2"></span>`;
    if(m.theme==="night")deco=`<span class="city"></span><span class="sun" style="background:#d9eaff"></span><span class="ground"></span>`;
    if(m.theme==="volcano")deco=`<span class="mount"></span><span class="mount m2"></span><span class="ground"></span>`;
    card.innerHTML=`<div class="mapThumb" style="--map-a:${m.sky1};--map-b:${m.sky2};--map-ground:${m.grass}">${deco}</div>${owned?"":`<div class="mapLock">🔒 ${m.price} 🪙</div>`}<div class="mapCardBody"><h3>${m.name}</h3><p>${m.desc}</p><span class="mapBadge">${selected?"✓ SELECTED":owned?"PLAY ANY TIME":`BUY ${m.price} 🪙`}</span></div>`;
    card.onclick=()=>{
      resumeAudio();
      if(owned){save.selectedMap=id;persist();selectSound();renderMaps();return;}
      if(coins<m.price){notEnoughCoins();return;}
      coins-=m.price;save.coins=coins;save.ownedMaps.push(id);save.selectedMap=id;persist();purchaseSound();updateCoinsUI();renderMaps();
    };
    grid.appendChild(card);
  });
}

// ---------- VEHICLES ----------
// সবগুলো monster truck; প্রতিটির speed/grip/suspension/boost আলাদা।
const premiumVehicles=[
  {name:"TRAIL BLAZER",color:"#f7b900",accent:"#fff06a",price:0,speed:1,grip:1,suspension:1,boost:1,desc:"Balanced all-round monster truck."},
  {name:"RED RAMPAGE",color:"#e53935",accent:"#ff8a65",price:650,speed:1.08,grip:1.02,suspension:1.03,boost:1.05,desc:"Quick red truck with strong acceleration."},
  {name:"OCEAN TITAN",color:"#168ee8",accent:"#68d8ff",price:1000,speed:1.12,grip:1.08,suspension:1.10,boost:1.08,desc:"Stable blue truck for rough terrain."},
  {name:"JUNGLE KING",color:"#22a447",accent:"#9af06b",price:1350,speed:1.05,grip:1.18,suspension:1.16,boost:1.04,desc:"Maximum grip for steep tracks."},
  {name:"PURPLE FURY",color:"#8b42d9",accent:"#d7a4ff",price:1800,speed:1.20,grip:1.06,suspension:1.12,boost:1.18,desc:"Fast and agile with strong boost."},
  {name:"BLACK BEAST",color:"#202830",accent:"#ff4747",price:2400,speed:1.16,grip:1.22,suspension:1.25,boost:1.10,desc:"Heavy monster with extreme suspension."},
  {name:"SUNSET KING",color:"#ff6b1a",accent:"#ffd34e",price:3200,speed:1.28,grip:1.10,suspension:1.16,boost:1.25,desc:"High-speed orange machine."},
  {name:"GOLDEN X",color:"#d9a514",accent:"#fff1a1",price:4500,speed:1.35,grip:1.20,suspension:1.25,boost:1.35,desc:"Ultimate monster truck."}
];
const vehiclesV22=premiumVehicles;
// V15: বাংলাদেশি যানবাহন—startup-এর clamp-এর আগেই তালিকায় থাকা দরকার (নইলে রিফ্রেশে select করা গাড়ি আগের ৮টার মধ্যে কেটে যেত)।
vehiclesV22.push(
  {name:"CNG AUTO",kind:"cng",color:"#1f9d55",accent:"#ffd23a",price:1500,speed:1.10,grip:1.05,suspension:1.02,boost:1.00,desc:"ঢাকার সবুজ CNG অটো — হালকা ও ছটফটে।"},
  {name:"RICKSHAW",kind:"rickshaw",color:"#e53b6a",accent:"#ffd23a",price:800,speed:.92,grip:1.12,suspension:1.20,boost:.90,desc:"রঙিন রিকশা — ধীর, কিন্তু পাহাড়ে দারুণ গ্রিপ।"},
  {name:"EASY BIKE",kind:"ebike",color:"#f2b705",accent:"#2a6fdb",price:1100,speed:1.00,grip:1.00,suspension:1.08,boost:1.15,desc:"ব্যাটারিচালিত ইজি বাইক — বুস্ট ভালো।"},
  {name:"MURIR TIN BUS",kind:"bus",color:"#d9482b",accent:"#ffd23a",price:3000,speed:1.04,grip:1.28,suspension:1.30,boost:1.00,desc:"লোকাল বাস 'মুড়ির টিন' — ভারী, গ্রিপ ও সাসপেনশন সেরা।"}
);

// ==============================
// STARTUP
// ==============================

// Coin UI। 
updateCoinsUI();

// Initial level menu তৈরি। 
renderLevels();

// Initial garage তৈরি। 
renderGarage();

// Initial store তৈরি। 
renderStore();

// Animation শুরু। 
requestAnimationFrame(loop);





// CSS দিয়ে garage preview truck বানানো হচ্ছে।
function miniTruckMarkup(v,scale=""){
  return `<div class="miniTruck ${scale}" style="--truck-color:${v.color};--truck-accent:${v.accent}"><div class="miniCab"><i class="miniWindow"></i><i class="miniWindow w2"></i></div><div class="miniBody"></div><div class="miniBumper"></div><div class="miniWheel w1"></div><div class="miniWheel w2"></div></div>`;
}

// Garage-এ vehicle কিনে সঙ্গে সঙ্গে select করা যাবে।
function renderGarage(){
  document.getElementById("garageCoins").textContent=coins;
  const selected=Math.max(0,Math.min(vehiclesV22.length-1,Number(save.selectedVehicle)||0));
  save.selectedVehicle=selected;
  const v=vehiclesV22[selected];
  const preview=document.getElementById("garageVehicle");
  preview.innerHTML=miniTruckMarkup(v);
  document.getElementById("garageVehicleName").textContent=v.name;
  document.getElementById("garageVehicleDesc").textContent=v.desc;
  document.getElementById("selectVehicleBtn").textContent="✓ SELECTED";

  let stats=document.getElementById("garageStats");
  if(!stats){stats=document.createElement("div");stats.id="garageStats";stats.className="vehicleStats";preview.parentElement.insertBefore(stats,document.getElementById("selectVehicleBtn"));}
  const up=currentUpgrades();
  const stat=(label,val)=>`<div class="statBar">${label}<i style="--stat:${Math.min(100,val*72)}%"></i></div>`;
  stats.innerHTML=stat("SPEED",v.speed+up.engine*.018)+stat("GRIP",v.grip+up.tires*.012)+stat("POWER",v.boost+up.boost*.015);

  const list=document.getElementById("vehicleList");list.innerHTML="";
  vehiclesV22.forEach((vehicle,id)=>{
    const owned=save.ownedVehicles.includes(id),selectedNow=selected===id;
    const card=document.createElement("div");card.className="vehicleCard"+(selectedNow?" selected":"");
    card.innerHTML=`<div class="vehicleEmoji">${miniTruckMarkup(vehicle,"vehicleMini")}</div><h3>${vehicle.name}</h3><p>⚡ ${Math.round(vehicle.speed*100)}% · 🛞 ${Math.round(vehicle.grip*100)}% · 🚀 ${Math.round(vehicle.boost*100)}%</p><button type="button">${selectedNow?"SELECTED":owned?"SELECT":`BUY ${vehicle.price} 🪙`}</button>`;
    card.querySelector("button").onclick=e=>{
      e.stopPropagation();resumeAudio();
      if(selectedNow){tone(520,.05,.04);return;}
      if(owned){save.selectedVehicle=id;persist();selectSound();renderGarage();return;}
      if(coins<vehicle.price){notEnoughCoins();return;}
      coins-=vehicle.price;save.coins=coins;save.ownedVehicles.push(id);save.selectedVehicle=id;persist();purchaseSound();updateCoinsUI();renderGarage();
    };
    list.appendChild(card);
  });
  renderUpgrades();
}

// ---------- PREMIUM AUDIO ----------
// Layered engine nodes রাখা হচ্ছে।
let engineHarm=null,engineSub=null,engineNoise=null,engineNoiseGain=null,turboOsc=null;

// বড় mobile/browser game-এর মতো layered engine sound তৈরি করা হচ্ছে।
function initAudio(){
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  if(audioReady&&audio){if(audio.state==="suspended")audio.resume();return;}
  audio=new AC();master=audio.createGain();master.connect(audio.destination);
  master.gain.value=userMuted?0:userVolume/100;

  engineOsc=audio.createOscillator();engineHarm=audio.createOscillator();engineSub=audio.createOscillator();turboOsc=audio.createOscillator();
  engineGain=audio.createGain();const hg=audio.createGain(),sg=audio.createGain(),tg=audio.createGain();
  engineOsc.type="sawtooth";engineHarm.type="square";engineSub.type="sine";turboOsc.type="triangle";
  engineOsc.frequency.value=58;engineHarm.frequency.value=116;engineSub.frequency.value=29;turboOsc.frequency.value=420;
  engineGain.gain.value=0;hg.gain.value=0;sg.gain.value=0;tg.gain.value=0;
  engineOsc.connect(engineGain);engineGain.connect(master);engineHarm.connect(hg);hg.connect(master);engineSub.connect(sg);sg.connect(master);turboOsc.connect(tg);tg.connect(master);
  engineOsc.start();engineHarm.start();engineSub.start();turboOsc.start();

  // Low rumble noise engine layer।
  const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.28;
  engineNoise=audio.createBufferSource();engineNoise.buffer=buffer;engineNoise.loop=true;engineNoiseGain=audio.createGain();engineNoiseGain.gain.value=0;engineNoise.connect(engineNoiseGain);engineNoiseGain.connect(master);engineNoise.start();
  audioReady=true;applyAudioVolume();if(audio.state==="suspended")audio.resume();
}
function applyAudioVolume(){if(!audio||!master)return;const target=(userMuted||audioSuppressed)?0:userVolume/100;master.gain.setTargetAtTime(target,audio.currentTime,.045);}
function resumeAudio(){if(!audioReady)initAudio();if(audio&&audio.state==="suspended")audio.resume();applyAudioVolume();}
function engineStart(){if(!audioReady)return;const n=audio.currentTime;engineGain.gain.setTargetAtTime(.075,n,.08);engineNoiseGain.gain.setTargetAtTime(.018,n,.12);}
function engineStop(){if(!audioReady)return;const n=audio.currentTime;engineGain.gain.setTargetAtTime(0,n,.08);engineNoiseGain&&engineNoiseGain.gain.setTargetAtTime(0,n,.08);}
// প্রতি ফ্রেমে ইঞ্জিনের শব্দ (pitch/volume) truck-এর বর্তমান speed আর gas অনুযায়ী update করা হচ্ছে,
// যাতে গতি বাড়লে ইঞ্জিনের আওয়াজও বাস্তবসম্মতভাবে চড়া/জোরালো শোনায়।
function updateEngine(){
  if(!audioReady||state!=="play")return; // audio চালু না থাকলে বা game চলছে না—কিছু করার দরকার নেই
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0],speed=Math.abs(truck.vx);
  // rpm (ইঞ্জিনের ঘূর্ণন গতি)—base value + speed অনুযায়ী বাড়বে + gas চাপলে extra বাড়বে + vehicle-এর নিজস্ব speed stat যোগ হবে
  const rpm=58+speed*.22+(keys.gas?34:0)+v.speed*6;
  // মূল ইঞ্জিন oscillator + harmonic (দ্বিগুণ পিচ, পুরু আওয়াজের জন্য) + sub (অর্ধেক পিচ, গভীর গুঞ্জনের জন্য)
  engineOsc.frequency.setTargetAtTime(rpm,audio.currentTime,.035);engineHarm.frequency.setTargetAtTime(rpm*2,audio.currentTime,.04);engineSub.frequency.setTargetAtTime(rpm*.5,audio.currentTime,.05);
  // speed বাড়লে volume-ও কিছুটা বাড়বে (সর্বোচ্চ সীমা পর্যন্ত), gas চাপলে আরেকটু জোরে
  engineGain.gain.setTargetAtTime(.045+Math.min(.07,speed/700*.065)+(keys.gas?.025:0),audio.currentTime,.04);
  // engine noise (ঘষা/rough আওয়াজ) speed অনুযায়ী বাড়বে
  engineNoiseGain.gain.setTargetAtTime(.012+speed/700*.025,audio.currentTime,.08);
  // turbo/whine শব্দ speed-এর সাথে সাথে বাড়বে
  turboOsc.frequency.setTargetAtTime(320+speed*1.9,audio.currentTime,.06);
}
function tone(freq=500,duration=.1,volume=.12,type="square"){
  if(!audioReady||!audio)return;
  const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;
  g.gain.setValueAtTime(.0001,audio.currentTime);g.gain.exponentialRampToValueAtTime(volume,audio.currentTime+.008);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+duration);
  o.connect(g);g.connect(master);o.start();o.stop(audio.currentTime+duration+.02);
}
function noise(duration=.2,volume=.15){
  if(!audioReady||!audio)return;
  const buffer=audio.createBuffer(1,Math.max(1,Math.floor(audio.sampleRate*duration)),audio.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
  const source=audio.createBufferSource(),g=audio.createGain();source.buffer=buffer;g.gain.value=volume;source.connect(g);g.connect(master);source.start();source.stop(audio.currentTime+duration);
}
function coinSound(){tone(920,.06,.11,"triangle");setTimeout(()=>tone(1380,.10,.08,"triangle"),50);}
function purchaseSound(){tone(660,.08,.10,"triangle");setTimeout(()=>tone(990,.12,.085,"triangle"),80);setTimeout(()=>tone(1320,.16,.06,"triangle"),155);}
function selectSound(){tone(580,.06,.06,"triangle");setTimeout(()=>tone(820,.09,.055,"triangle"),55);}
function jumpSound(){tone(180,.13,.055,"sine");}
function landSound(){tone(75,.14,.11,"sine");noise(.09,.055);}
function crashSound(){tone(55,.42,.20,"sawtooth");noise(.35,.20);setTimeout(()=>tone(35,.28,.10,"sine"),80);}

// ---------- SMOOTH TERRAIN ----------
function mapDifficulty(){return 1+(save.selectedMap||0)*.055;}
// লেভেল যত বাড়বে, রাস্তার দূরত্ব (finish পর্যন্ত distance) তত বেশি বাড়বে—শুরুর দিকে লেভেল ছোট থাকবে,
// কিন্তু পরের লেভেলগুলোতে অনেক বেশি লম্বা রাস্তা পাওয়া যাবে, যাতে প্রগ্রেশনটা realistic মনে হয়।
function finishX(){
  // ধাপ ৩: Endless/Distance Mode-এ কোনো fixed finish নেই—অনেক লম্বা একটা দৈর্ঘ্য ব্যবহার হয়, বাস্তবে বেশিরভাগ রান তার অনেক আগেই শেষ হয়।
  if(endlessMode) return ENDLESS_LENGTH;
  return 3600+currentLevel*85+Math.floor(currentLevel/10)*70+(save.selectedMap||0)*180;
}

// Gap-এর finish-এর কাছে safe runway রাখা হচ্ছে।
// terrainY() প্রতি ফ্রেমে বহুবার কল হয় বলে getGaps()-কে level অনুযায়ী cache করা হচ্ছে (perf)।
let _gapsCache={key:null,gaps:null};
function getGaps(){
  // Endless-এ truck এগিয়ে যেতে থাকে বলে cache-key-এ x-bucket যোগ করা হয়েছে, যাতে সামনের নতুন gap সময়মতো যোগ হয়।
  const key=currentLevel+"_"+(save.selectedMap||0)+(endlessMode?("_e"+Math.floor((truck.x||0)/3000)):"");
  if(_gapsCache.key===key&&_gapsCache.gaps)return _gapsCache.gaps;
  const d=Math.min(1,(currentLevel-1)/99),base=[[1080,105+20*d],[1870,115+25*d],[2780,125+30*d],[3480,110+25*d]],extra=[];
  if(currentLevel>=10)extra.push([4200,120+30*d]);
  if(currentLevel>=22)extra.push([5050,130+35*d]);
  if(currentLevel>=38)extra.push([5950,145+38*d]);
  if(currentLevel>=58)extra.push([6900,155+42*d]);
  if(currentLevel>=78)extra.push([7900,165+45*d]);
  const finish=finishX();let result=[...base,...extra].filter(g=>g[0]+g[1]<finish-360);
  // ধাপ ৩: Endless মোডে fixed তালিকার পর deterministic পর্যায়ক্রমিক gap যোগ হয়, যাতে লম্বা রুট জুড়ে একঘেয়ে ফাঁকা না থাকে।
  if(endlessMode){
    const aheadTo=Math.max(finish,(truck.x||0)+6000);
    let gx=8800,i=0;
    while(gx<aheadTo&&i<400){
      const w=95+((Math.floor(gx*0.731)+i*53)%60);
      result.push([gx,w]);
      gx+=760+((Math.floor(gx*0.317))%260);
      i++;
    }
  }
  _gapsCache={key,gaps:result};
  return result;
}
function isGap(x){if(x<450)return false;const finish=finishX();if(x>finish-330&&x<finish+120)return false;return getGaps().some(([a,b])=>x>=a&&x<=a+b);}
// একটা x-range এর কোনো অংশ gap-এর ভেতরে পড়ে কিনা—rock/pillar যেন gap-এর ভেতরে overlap করে না আঁকে।
function spanHasGap(a,b){for(let t=a;t<=b;t+=8){if(isGap(t))return true;}return isGap(b);}
function terrainY(x){
  const levelD=Math.min(1,(currentLevel-1)/99),seed=currentLevel*137.31+(save.selectedMap||0)*983.7,mapD=mapDifficulty();
  // পাহাড়/hill আরও অনেক বড়/dramatic দেখানোর জন্য সব wave, bump amplitude আর ভ্যালির গভীরতা আরও বাড়ানো হয়েছে।
  const longWave=Math.sin((x+seed)*.0019)*94*(1+levelD*.72)*mapD,mediumWave=Math.sin((x+seed*2)*.0046)*45*(1+levelD*.55)*mapD,shortWave=Math.sin((x+seed*3)*.0102)*11;
  let y=H*.58-(longWave+mediumWave+shortWave);const section=Math.floor(x/1200),local=((x%1200)+1200)%1200,hard=1+levelD*.75;
  // এই মূল hill-bump-এর slope আগে এত খাড়া ছিল যে normal driving-এও truck বাতাসে উল্টে crash করছিল—তাই height কিছুটা কমিয়ে চড়াই-টা drivable রাখা হয়েছে, তারপরও আগের ভার্সনের চেয়ে অনেক বড়।
  if(local>=120&&local<=650){const t=(local-120)/530;y-=(150+levelD*100+(section%3)*18)*Math.sin(t*Math.PI)*hard;}
  if(local>650&&local<1060){const t=(local-650)/410;y-=(85+levelD*60)*Math.sin(t*Math.PI);}
  if(local>1060&&local<1190){const t=(local-1060)/130;y-=Math.sin(t*Math.PI)*(20+levelD*16);}
  if(x<560){const starter=H*.61-Math.sin(x*.0052)*9,t=Math.max(0,Math.min(1,(x-260)/300)),s=t*t*(3-2*t);y=starter*(1-s)+y*s;}
  // প্রতিটা gap-এর ঠিক আগে একটা ছোট launch-ramp guarantee করা হচ্ছে—আগে gap-এর position টেরেইনের hill-phase-এর
  // উপর নির্ভরশীল ছিল বলে অনেক সময় downhill-এর মাঝখানে gap পড়ে যেত (truck আগে থেকেই নামছে, jump করার সুযোগ নেই)
  // আর সেই কারণেই gap পার হওয়া যাচ্ছিল না। এখন gap শুরুর ঠিক আগে জমি সবসময় উপরের দিকে উঠবে, যাতে truck সবসময়
  // solid ground থেকে ভালো height নিয়ে gap-টা পার হতে পারে, level/map যাই হোক না কেন।
  {
    const rampLen=170,rampLift=95;
    const gaps=getGaps();
    for(let i=0;i<gaps.length;i++){
      const gStart=gaps[i][0];
      if(x>=gStart-rampLen&&x<=gStart){
        const t=(x-(gStart-rampLen))/rampLen,s=t*t*(3-2*t);
        y-=s*rampLift;
        break;
      }
    }
  }
  // V30 বাগ-ফিক্স (বট দিয়ে সব ম্যাপ/লেভেল টেস্ট করে ধরা পড়েছে): gap-এর ঠিক পরের landing zone মাঝেমাঝে
  // টেক-অফ পয়েন্টের চেয়েও উঁচুতে উঠে যেত (sine wave-এর নির্দিষ্ট phase-এ, বিশেষ করে level>=22-এর extra
  // gap-গুলোতে)। ফলে truck লাফিয়ে ওঠার আগেই ল্যান্ডিং জোন আরও উঁচুতে চলে যেত আর জাম্পটা অন্যায়ভাবে
  // কঠিন/অসম্ভব হয়ে "You fell into the gap!" crash হতো, এমনকি ঠিকভাবে জাম্প করলেও। তাই এখন gap-এর পরেও
  // একইভাবে guarantee করা হচ্ছে—landing zone কখনো টেক-অফ পয়েন্ট (lip)-এর চেয়ে উঁচু হবে না, ধীরে ধীরে
  // স্বাভাবিক wave-এ মিলিয়ে যাবে।
  {
    const landLen=170;
    const gaps=getGaps();
    for(let i=0;i<gaps.length;i++){
      const gStart=gaps[i][0],gEnd=gStart+gaps[i][1];
      if(x>gEnd&&x<=gEnd+landLen){
        const lipY=terrainY(gStart);
        if(y<lipY){
          const t=(x-gEnd)/landLen,s=t*t*(3-2*t);
          y=lipY*(1-s)+y*s;
        }
        break;
      }
    }
  }
  // valley খুব বেশি গভীর হলে truck অনেকক্ষণ ধরে বাতাসে "ভাসতে" থাকে (physics ধরতে পারে না) এবং তখন কাছাকাছি
  // কোনো gap পড়লে অন্যায়ভাবে crash হয়ে যায়—তাই lower clamp আগের মতো খুব গভীর না রেখে একটু টাইট করা হলো।
  return Math.max(H*.14,Math.min(H*.72,y));
}
function terrainSlope(x){return Math.atan2(terrainY(x+5)-terrainY(x-5),10);}

// ---------- COINS ----------
function generateCoins(){
  levelCoins=[];const step=Math.max(125,150-(currentLevel%5)*4);
  for(let x=380;x<finishX()-180;x+=step){if(isGap(x))continue;levelCoins.push({x,y:terrainY(x)-62-Math.sin(x*.013)*8,r:16,phase:(x*.041)%6.28,taken:false});}
  const key=currentLevel+"_m"+(save.selectedMap||0),saved=save.collected[key]||[];saved.forEach(i=>{if(levelCoins[i])levelCoins[i].taken=true;});
}

// ---------- ধাপ ৩: FUEL CAN ও BOOST PICKUP জেনারেট করা ----------
// কয়েনের চেয়ে অনেক কম ঘনত্বে, ন্যায্য দূরত্বে (gap-এর ভেতরে নয়) বসানো হয়—
// যাতে স্বাভাবিক সতর্ক ড্রাইভিং-এ পরের fuel source পর্যন্ত পৌঁছানো যায়।
function generateFuelCans(){
  levelFuelCans=[];
  const len=finishX()-600;
  if(len<=0)return;
  // লম্বা রুটে বেশি can দরকার—প্রতি ~২২০০px-এ একটা, কিন্তু খুব ছোট লেভেলে অন্তত একটাও না থাকতে পারে (দরকার নেই)।
  const spacing=2200;
  for(let x=1200;x<finishX()-400;x+=spacing){
    // কাছাকাছি কোনো x যদি gap-এর ভেতরে পড়ে, একটু সরিয়ে নেওয়া হচ্ছে যাতে না-পাওয়া যায় এমন জায়গায় না বসে।
    let px=x;let tries=0;
    while(isGap(px)&&tries<12){px+=40;tries++;}
    if(isGap(px))continue;
    levelFuelCans.push({x:px,y:terrainY(px)-56,taken:false});
  }
}
function generateBoostCans(){
  levelBoostCans=[];
  const spacing=3100; // boost pickup fuel-এর চেয়ে কম ঘন—বোনাস আইটেম, জরুরি না
  for(let x=2100;x<finishX()-400;x+=spacing){
    let px=x;let tries=0;
    while(isGap(px)&&tries<12){px+=40;tries++;}
    if(isGap(px))continue;
    levelBoostCans.push({x:px,y:terrainY(px)-56,taken:false});
  }
}
// Fuel can আঁকা—লাল জ্যারিক্যান, সাদা ফোঁটা চিহ্ন (কয়েনের গোল্ডেন রঙের থেকে স্পষ্ট আলাদা)।
function drawFuelCans(){
  const t=performance.now()/300;
  levelFuelCans.forEach(c=>{
    if(c.taken)return;
    const x=c.x-camera.x;if(x<-40||x>W+40)return;
    const y=c.y+Math.sin(t+c.x*.01)*4;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle="#ff2d2d55";ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#d81f1f";roundRect(-13,-15,26,28,4);ctx.fill();
    ctx.fillStyle="#f4463a";roundRect(-9,-21,18,8,2);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="900 13px system-ui, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("⛽",0,1);
    ctx.restore();
  });
}
// Boost pickup আঁকা—বেগুনি/নীল বিদ্যুৎ চিহ্ন (fuel বা coin থেকে দেখতে স্পষ্ট আলাদা)।
function drawBoostCans(){
  const t=performance.now()/300;
  levelBoostCans.forEach(c=>{
    if(c.taken)return;
    const x=c.x-camera.x;if(x<-40||x>W+40)return;
    const y=c.y+Math.sin(t+c.x*.017)*5;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle="#9b6bff55";ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#6a35d6";ctx.beginPath();ctx.arc(0,0,16,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#f4ecff";ctx.font="900 17px system-ui, sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("⚡",0,1);
    ctx.restore();
  });
}
// প্রতি ফ্রেমে truck-এর কাছাকাছি fuel can থাকলে সেটা নেওয়া হবে—ট্যাংক cap-এর বেশি ওঠে না।
function collectFuel(){
  const tx=truck.x,ty=truck.y-30;
  levelFuelCans.forEach(c=>{
    if(c.taken)return;
    if(Math.hypot(c.x-tx,c.y-ty)<50){
      c.taken=true;
      truck.fuel=Math.min(FUEL_CONFIG.cap,truck.fuel+FUEL_CONFIG.canRefill);
      truck.fuelWarned=truck.fuel>=FUEL_CONFIG.lowThreshold?false:truck.fuelWarned;
      coinBurst(c.x,c.y);coinSound();
      spawnFloatText(c.x,c.y-30,"+ফুয়েল","#ff5a4a");
    }
  });
}
// প্রতি ফ্রেমে truck-এর কাছাকাছি boost pickup থাকলে সেটা নেওয়া হবে—boostEnergy cap-এর বেশি ওঠে না।
function collectBoost(){
  const tx=truck.x,ty=truck.y-30;
  levelBoostCans.forEach(c=>{
    if(c.taken)return;
    if(Math.hypot(c.x-tx,c.y-ty)<50){
      c.taken=true;
      truck.boostEnergy=Math.min(100,(truck.boostEnergy||0)+BOOST_PICKUP_CONFIG.refill);
      coinBurst(c.x,c.y);coinSound();
      spawnFloatText(c.x,c.y-30,"+বুস্ট","#9b6bff");
    }
  });
}
// প্রতি ফ্রেমে truck-এর কাছাকাছি (৪৮px এর মধ্যে) কোনো কয়েন থাকলে সেটা collect করা হচ্ছে—
// কয়েন নেওয়া হলে coins বাড়বে, save-এ record হবে (যাতে retry না করলে আবার না পাওয়া যায়), এবং spark/sound effect হবে।
function collectCoins(){
  const tx=truck.x,ty=truck.y-30;let changed=false; // ty-30: truck-এর একটু উপরে (driver seat বরাবর) থেকে দূরত্ব মাপা হচ্ছে
  levelCoins.forEach((c,i)=>{
    if(c.taken)return; // আগেই নেওয়া কয়েন বাদ
    const d=Math.hypot(c.x-tx,c.y-ty); // truck আর কয়েনের মধ্যে দূরত্ব
    if(d<48){ // কাছাকাছি চলে এলে কয়েন collect হবে
      c.taken=true;coins+=(typeof COIN_VALUE!=="undefined"?COIN_VALUE:12);save.coins=coins;
      // এই level+map-এর জন্য কোন কোন কয়েন নেওয়া হয়েছে সেটা save-এ রাখা হচ্ছে (key = level_mMapIndex)
      const key=currentLevel+"_m"+(save.selectedMap||0);if(!save.collected[key])save.collected[key]=[];if(!save.collected[key].includes(i))save.collected[key].push(i);
      coinBurst(c.x,c.y);coinSound();changed=true;
    }
  });
  if(changed){persist();updateCoinsUI();} // কিছু collect হলে তবেই save+UI update (perf-এর জন্য প্রতি ফ্রেমে না)
}

// ---------- PREMIUM WATER ----------
function drawPremiumWater(){
  const m=maps[save.selectedMap]||maps[0],waterY=H-118,g=ctx.createLinearGradient(0,waterY,0,H);
  g.addColorStop(0,m.water);g.addColorStop(.55,m.theme==="night"?"#081f4b":"#087cae");g.addColorStop(1,"#063d69");ctx.fillStyle=g;ctx.fillRect(0,waterY,W,H-waterY);
  ctx.globalAlpha=.22;
  for(let i=0;i<26;i++){const x=((i*149-camera.x*.22)%(W+260))-130,y=waterY+18+(i%12)*13;ctx.fillStyle=i%2?"#baf7ff":"#fff";ctx.beginPath();ctx.ellipse(x,y,32+(i%4)*12,2.2,0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
  for(let row=0;row<12;row++){const y=waterY+10+row*9;ctx.strokeStyle=row%3===0?"#d7fbff":"#7ee6f3";ctx.globalAlpha=row%3===0?.8:.45;ctx.lineWidth=row%3===0?2.2:1.2;ctx.beginPath();for(let x=-20;x<=W+30;x+=24){const yy=y+Math.sin((x+camera.x*.5)*.012+row)*2.6;if(x===-20)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}
  ctx.globalAlpha=.9;ctx.strokeStyle="#f5ffff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,waterY+2);ctx.quadraticCurveTo(W*.25,waterY-5,W*.5,waterY+2);ctx.quadraticCurveTo(W*.75,waterY+8,W,waterY-1);ctx.stroke();ctx.globalAlpha=1;
}

// ---------- THEMED GROUND STRIP (জঙ্গল/মাটি/ঘাস — সব map-এ পানি না দেখিয়ে theme অনুযায়ী মাটি/জঙ্গল দেখানো হচ্ছে) ----------
function drawGroundStrip(m){
  const stripY=H-118;
  if(m.theme==="jungle"){
    // ভেজা জঙ্গল-মাটি gradient।
    const g=ctx.createLinearGradient(0,stripY,0,H);
    g.addColorStop(0,"#3a6b2e");g.addColorStop(.28,"#5a4526");g.addColorStop(1,"#2e2115");
    ctx.fillStyle=g;ctx.fillRect(0,stripY,W,H-stripY);
    // ঘাসের tuft সারি।
    for(let i=0;i<40;i++){const x=((i*61-camera.x*.32)%(W+120))-60,y=stripY+6+(i%5)*4;ctx.fillStyle=i%2?"#6bcf3f":"#4fae2d";ctx.beginPath();ctx.moveTo(x,y+14);ctx.lineTo(x+4,y-6);ctx.lineTo(x+8,y+14);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(x+6,y+15);ctx.lineTo(x+11,y-3);ctx.lineTo(x+15,y+15);ctx.closePath();ctx.fill();}
    // বড় পাতা/গাছপালা।
    for(let i=0;i<14;i++){const x=((i*172-camera.x*.4)%(W+220))-110,y=stripY+34+(i%3)*12;ctx.fillStyle=i%2?"#2f8f3f":"#3aa84b";ctx.beginPath();ctx.ellipse(x,y,26,11,.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+16,y+6,20,9,-.4,0,Math.PI*2);ctx.fill();}
    // ভেজা মাটির উজ্জ্বল দাগ।
    ctx.globalAlpha=.35;ctx.fillStyle="#7a5a34";for(let i=0;i<10;i++){const x=((i*233-camera.x*.25)%(W+160))-80,y=stripY+70+(i%3)*14;ctx.beginPath();ctx.ellipse(x,y,38,7,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }else if(m.theme==="desert"){
    const g=ctx.createLinearGradient(0,stripY,0,H);
    g.addColorStop(0,"#e8c377");g.addColorStop(1,"#a9793a");
    ctx.fillStyle=g;ctx.fillRect(0,stripY,W,H-stripY);
    for(let row=0;row<9;row++){const y=stripY+8+row*11;ctx.strokeStyle=row%2?"#d9ab5e":"#f3d999";ctx.globalAlpha=.6;ctx.lineWidth=2;ctx.beginPath();for(let x=-20;x<=W+30;x+=26){const yy=y+Math.sin((x+camera.x*.5)*.01+row)*3;if(x===-20)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}
    ctx.globalAlpha=1;
  }else if(m.theme==="volcano"){
    const g=ctx.createLinearGradient(0,stripY,0,H);
    g.addColorStop(0,"#2a1c1c");g.addColorStop(1,"#120a0a");
    ctx.fillStyle=g;ctx.fillRect(0,stripY,W,H-stripY);
    // ফাটল ও জ্বলন্ত lava vein।
    for(let i=0;i<9;i++){const x=((i*205-camera.x*.3)%(W+250))-125,y=stripY+16+(i%4)*18;ctx.strokeStyle="#ff5a27";ctx.globalAlpha=.75;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+30,y+14);ctx.lineTo(x+16,y+30);ctx.lineTo(x+46,y+40);ctx.stroke();ctx.globalAlpha=1;}
    ctx.globalAlpha=.18;ctx.fillStyle="#ff5a27";ctx.fillRect(0,stripY,W,26);ctx.globalAlpha=1;
  }else if(m.theme==="night"){
    const g=ctx.createLinearGradient(0,stripY,0,H);
    g.addColorStop(0,"#1c2735");g.addColorStop(1,"#0a1018");
    ctx.fillStyle=g;ctx.fillRect(0,stripY,W,H-stripY);
    ctx.strokeStyle="#ffd95a";ctx.globalAlpha=.5;ctx.setLineDash([22,18]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-camera.x*.5%80,stripY+14);ctx.lineTo(W,stripY+14);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    for(let i=0;i<20;i++){const x=((i*97-camera.x*.35)%(W+140))-70,y=stripY+40+(i%6)*10;ctx.fillStyle=i%3===0?"#294968":"#182838";ctx.beginPath();ctx.arc(x,y,3+(i%3),0,Math.PI*2);ctx.fill();}
  }else if(m.theme==="autumn"){
    const g=ctx.createLinearGradient(0,stripY,0,H);
    g.addColorStop(0,"#8a5a2c");g.addColorStop(1,"#4a2e18");
    ctx.fillStyle=g;ctx.fillRect(0,stripY,W,H-stripY);
    const leafColors=["#d5432a","#e79a2e","#c96b1e","#f0c33b"];
    for(let i=0;i<26;i++){const x=((i*95-camera.x*.32)%(W+140))-70,y=stripY+12+(i%7)*13;ctx.fillStyle=leafColors[i%leafColors.length];ctx.beginPath();ctx.ellipse(x,y,9,6,i*.4,0,Math.PI*2);ctx.fill();}
  }else{
    // default fallback: canyon/ice/hills অথবা অনির্ধারিত theme-এর জন্য পানি।
    drawPremiumWater();
  }
}

// map-এর theme অনুযায়ী নিচের strip-এ পানি নাকি মাটি/জঙ্গল দেখাবে তা নির্ধারণ করা হচ্ছে।
function drawBottomStrip(){
  const m=maps[save.selectedMap]||maps[0];
  const waterThemes=["hills","canyon","ice"];
  if(waterThemes.includes(m.theme)) drawPremiumWater();
  else drawGroundStrip(m);
}

// ---------- SCENARIO DRAWING (সব ম্যাপের background আরও সুন্দর ও layered করা হয়েছে) ----------
function drawPine(x,y,s,color){ctx.fillStyle="#6a4b32";ctx.fillRect(x-3,y-42*s,6,42*s);ctx.fillStyle=color;for(let i=0;i<3;i++)poly([[x,y-62*s+i*16*s],[x-24*s,y-20*s+i*16*s],[x+24*s,y-20*s+i*16*s]],color);}
function drawCactus(x,y){ctx.strokeStyle="#4c9b42";ctx.lineWidth=12;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-52);ctx.moveTo(x,y-28);ctx.lineTo(x-18,y-42);ctx.moveTo(x,y-20);ctx.lineTo(x+17,y-34);ctx.stroke();}
// একটা polygon-কে flat রঙের বদলে উপর থেকে নিচে gradient shading দিয়ে ভরাট করা হচ্ছে—আরও পাহাড়ি/3D লুক দেয়।
function polyGrad(points,colorTop,colorBottom){
  let minY=Infinity,maxY=-Infinity;points.forEach(p=>{if(p[1]<minY)minY=p[1];if(p[1]>maxY)maxY=p[1];});
  const g=ctx.createLinearGradient(0,minY,0,maxY);g.addColorStop(0,colorTop);g.addColorStop(1,colorBottom);
  poly(points,g);
}
// নরম মেঘ আঁকা হচ্ছে (parallax drift সহ)।
function drawClouds(count,yBase,tint,alpha){
  ctx.globalAlpha=alpha;ctx.fillStyle=tint;
  for(let i=0;i<count;i++){
    const x=((i*231-camera.x*.06)%(W+300))-150,y=yBase+(i%4)*22;
    ctx.beginPath();ctx.ellipse(x,y,42,16,0,0,Math.PI*2);ctx.ellipse(x+26,y-8,28,14,0,0,Math.PI*2);ctx.ellipse(x-24,y-5,26,13,0,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawScenario(theme){
  if(theme==="ice"){
    drawClouds(5,80,"#ffffff",.55);
    for(let i=0;i<7;i++)polyGrad([[i*220,310-i*12],[i*220+130,120+i%2*35],[i*220+280,310]],i%2?"#dff6ff":"#eefcff",i%2?"#7fc9e0":"#a8dcee");
    for(let i=0;i<12;i++)drawPine(70+i*155,365+(i%3)*20,.85,"#9bc9d7");
    ctx.globalAlpha=.5;ctx.fillStyle="#ffffff";for(let i=0;i<40;i++){const x=(i*97-camera.x*.15)%(W+80),y=(i*53)%260;ctx.beginPath();ctx.arc(x,y,1.6,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }else if(theme==="jungle"){
    ctx.globalAlpha=.16;ctx.fillStyle="#0d5b2c";ctx.fillRect(0,150,W,H*.4);ctx.globalAlpha=1;
    for(let i=0;i<18;i++)drawPine(40+i*110,340+(i%4)*28,1.15,i%2?"#0b8f48":"#166b3b");
    // সূর্যের আলো ফাঁক দিয়ে ছড়িয়ে পড়ছে।
    ctx.globalAlpha=.10;ctx.fillStyle="#fff6c0";for(let i=0;i<5;i++){ctx.save();ctx.translate(120+i*230,0);ctx.rotate(.25);ctx.fillRect(-18,0,36,420);ctx.restore();}ctx.globalAlpha=1;
    ctx.globalAlpha=.18;ctx.fillStyle="#d5ff91";ctx.fillRect(0,0,W,H*.55);ctx.globalAlpha=1;
  }else if(theme==="desert"){
    const sung=ctx.createRadialGradient(W*.82,95,4,W*.82,95,80);sung.addColorStop(0,"#fff6d0");sung.addColorStop(.5,"#ffdf7a99");sung.addColorStop(1,"#ffdf7a00");ctx.fillStyle=sung;ctx.beginPath();ctx.arc(W*.82,95,80,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff2b0";ctx.beginPath();ctx.arc(W*.82,95,30,0,Math.PI*2);ctx.fill();
    for(let i=0;i<7;i++)polyGrad([[i*260,H*.48],[i*260+130,H*.23+(i%2)*50],[i*260+300,H*.48]],i%2?"#e8a75c":"#f2c07f",i%2?"#a05a26":"#c8813f");
    for(let i=0;i<9;i++)drawCactus(100+i*220,H*.49);
  }else if(theme==="volcano"){
    for(let i=0;i<7;i++)polyGrad([[i*260,H*.50],[i*260+140,H*.13],[i*260+290,H*.50]],i%2?"#4a2c3a":"#5c2f2f",i%2?"#1c1420":"#281418");
    ctx.globalAlpha=.35;ctx.fillStyle="#ff7a3d";for(let i=0;i<7;i++){ctx.beginPath();ctx.arc(i*260+140,H*.16,10,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    // ধোঁয়ার কুণ্ডলী।
    ctx.globalAlpha=.16;ctx.fillStyle="#8a7a80";for(let i=0;i<6;i++){const x=i*260+140,y=H*.10-((performance.now()/40+i*40)%140);ctx.beginPath();ctx.ellipse(x,y,26,16,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    ctx.globalAlpha=.25;ctx.fillStyle="#ff5a27";ctx.fillRect(0,H*.42,W,H*.18);ctx.globalAlpha=1;
  }else if(theme==="night"){
    ctx.fillStyle="#fff";for(let i=0;i<60;i++){const x=(i*67)%W,y=(i*113)%(H*.5);ctx.globalAlpha=.3+((i*37)%70)/100;ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    const moong=ctx.createRadialGradient(W*.78,100,4,W*.78,100,60);moong.addColorStop(0,"#ffffffcc");moong.addColorStop(1,"#ffffff00");ctx.fillStyle=moong;ctx.beginPath();ctx.arc(W*.78,100,60,0,Math.PI*2);ctx.fill();
    for(let i=0;i<16;i++){const x=i*125,h=80+(i%5)*45;ctx.fillStyle=i%2?"#122944":"#0b1e35";ctx.fillRect(x,H*.42-h,90,h);for(let r=0;r<4;r++)for(let c=0;c<3;c++){ctx.fillStyle=(r+c+i)%3===0?"#ffd95a":"#294968";ctx.fillRect(x+12+c*23,H*.42-h+15+r*20,7,9);}}
    ctx.fillStyle="#e9f4ff";ctx.beginPath();ctx.arc(W*.78,100,28,0,Math.PI*2);ctx.fill();
  }else if(theme==="canyon"){
    drawClouds(4,70,"#ffffff",.4);
    for(let i=0;i<8;i++)polyGrad([[i*230,H*.5],[i*230+115,H*.10],[i*230+260,H*.5]],i%2?"#79aecb":"#8a99ac",i%2?"#31607d":"#3d4a5c");
  }else if(theme==="autumn"){
    drawClouds(3,60,"#fff2df",.35);
    for(let i=0;i<15;i++)drawPine(40+i*135,330+(i%3)*28,1,i%2?"#b9432f":"#d58c32");
    ctx.globalAlpha=.14;ctx.fillStyle="#ffb347";ctx.fillRect(0,0,W,H*.5);ctx.globalAlpha=1;
  }
}

// ---------- SKY ----------
function drawSky(){
  const m=maps[save.selectedMap]||maps[0],g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,m.sky1);g.addColorStop(.68,m.sky2);g.addColorStop(1,"#d9f7f8");ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Green Hills-এর supplied background image শুধু environment-এর জন্য।
  if(m.theme==="hills"&&aiBackgroundReady){
    const bgH=Math.max(H*.72,420),bgW=bgH*(aiBackground.width/aiBackground.height),parallax=((camera.x*.035)%(Math.max(1,bgW+W))),dx=(W-bgW)/2-parallax;
    ctx.globalAlpha=.98;ctx.drawImage(aiBackground,dx,0,bgW,bgH);if(dx+bgW<W)ctx.drawImage(aiBackground,dx+bgW,0,bgW,bgH);if(dx>0)ctx.drawImage(aiBackground,dx-bgW,0,bgW,bgH);ctx.globalAlpha=1;
  }else drawScenario(m.theme);
  drawBottomStrip();
}

// ---------- TERRAIN ----------
function themeGrassDark(theme){return theme==="ice"?"#4c9caf":theme==="desert"?"#9a7d2c":theme==="volcano"?"#304e2d":"#23823f";}
function drawTerrain(){
  const m=maps[save.selectedMap]||maps[0],start=Math.floor(camera.x/7)*7-35,end=camera.x+W+50,waterY=H-118;
  // Smooth dirt body।
  for(let x=start;x<end;x+=7){if(isGap(x)||isGap(x+7))continue;ctx.beginPath();ctx.moveTo(x-camera.x,terrainY(x));ctx.lineTo(x+7-camera.x,terrainY(x+7));ctx.lineTo(x+7-camera.x,waterY);ctx.lineTo(x-camera.x,waterY);ctx.closePath();ctx.fillStyle=m.dirt;ctx.fill();}
  // Vertical cliff texture।
  ctx.globalAlpha=.28;for(let x=Math.floor(start/48)*48;x<end;x+=48){if(isGap(x))continue;const y=terrainY(x);ctx.strokeStyle="#7d4e3f";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-camera.x,y+12);ctx.lineTo(x-camera.x,Math.min(waterY,y+170));ctx.stroke();}ctx.globalAlpha=1;
  // Grass lip— gap-এর উপর দিয়ে লাইনটা ভেসে (bridge) না গিয়ে gap-এর জায়গায় break করবে।
  ctx.strokeStyle=m.grass;ctx.lineWidth=16;ctx.lineCap="round";ctx.beginPath();
  {let started=false;for(let x=start;x<=end;x+=10){if(isGap(x)){started=false;continue;}const y=terrainY(x);if(!started){ctx.moveTo(x-camera.x,y);started=true;}else ctx.lineTo(x-camera.x,y);}}
  ctx.stroke();
  // dashed track লাইনে animation—performance.now() দিয়ে dash offset বদলাচ্ছে, তাই মনে হয় রাস্তাটা প্রবাহিত হচ্ছে (moving road feel)।
  ctx.strokeStyle=themeGrassDark(m.theme);ctx.lineWidth=3;ctx.setLineDash([3,6]);ctx.lineDashOffset=-(performance.now()*.03)%9;ctx.beginPath();
  {let started=false;for(let x=start;x<=end;x+=16){if(isGap(x)){started=false;continue;}const y=terrainY(x)-1;if(!started){ctx.moveTo(x-camera.x,y);started=true;}else ctx.lineTo(x-camera.x,y);}}
  ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
  // Cliff support— gap-এর ভেতরে/কাছাকাছি pillar না বসিয়ে শুধু solid ground-এর নিচে বসানো হচ্ছে।
  for(let x=Math.floor(start/110)*110;x<end;x+=110){if(spanHasGap(x-14,x+14))continue;const y=terrainY(x);ctx.strokeStyle="#c47766";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x-camera.x,y+6);ctx.lineTo(x-camera.x,Math.min(waterY,y+175));ctx.stroke();ctx.fillStyle="#df927d";ctx.fillRect(x-camera.x-12,y+2,24,12);}
  // Rocks— rock-এর পুরো span (প্রায় ৮৮px চওড়া) gap-এর সাথে না মিলিয়ে বসানো হচ্ছে যাতে kখনো gap-এর উপর ভেসে না থাকে।
  for(let x=Math.floor(start/205)*205;x<end;x+=205){if(spanHasGap(x-46,x+46))continue;const y=terrainY(x),rc=m.theme==="desert"?"#8d694f":m.theme==="volcano"?"#3a2c2c":m.theme==="ice"?"#9fc3ce":m.theme==="jungle"?"#5a6b4a":"#687684";poly([[x-camera.x-42,y+72],[x-camera.x-18,y+32],[x-camera.x+25,y+39],[x-camera.x+46,y+72],[x-camera.x+17,y+94],[x-camera.x-28,y+92]],rc);}
}

// ---------- TRUCK PHYSICS ----------
function resetTruck(){
  truck.x=250;truck.vx=0;truck.vy=0;truck.angle=terrainSlope(truck.x);truck.angVel=0;truck.wheelSpin=0;truck.onGround=true;
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];truck.wheelR=27+Math.min(4,(v.suspension-1)*12);truck.wheelBase=92;truck.y=terrainY(truck.x)-truck.wheelR-31;camera.x=0;
  // Hill Climb Racing-এর মতো প্রতিটা চাকা আলাদাভাবে suspension-এ ওঠানামা করবে—body একই থাকছে, শুধু চাকাদুটো independent bounce পাবে।
  truck.rearSusp=0;truck.frontSusp=0;truck.rearSuspV=0;truck.frontSuspV=0;
  // Air-time ও flip বোনাস স্কোরিং-এর জন্য state।
  truck.airTime=0;truck.airRotation=0;truck.flipsThisAir=0;
  // gap-এ crash check করার জন্য শেষবার যেখানে solid ground-এ ছিল সেই height মনে রাখা হচ্ছে।
  truck.lastGroundY=truck.y;
  // নতুন BOOST/NITRO ফিচার—শুরুতে ট্যাংক পুরো ভর্তি (১০০) থাকবে।
  truck.boostEnergy=100;
}

// Control + vehicle stats physics।
function updatePhysics(dt){
  updateFloatTexts(dt);
  if(state!=="play")return;updateEngine();
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0],up=currentUpgrades();
  const enginePower=1+(up.engine-1)*.10,grip=v.grip*(1+(up.tires-1)*.055),suspension=v.suspension*(1+(up.suspension-1)*.07),boost=v.boost*(1+(up.boost-1)*.08),maxSpeed=430+v.speed*260+up.engine*18;
  // --- নতুন BOOST/NITRO ফিচার: বাটন চাপলে ট্যাংক থাকা পর্যন্ত extra speed পাওয়া যাবে, ছাড়লে আস্তে আস্তে আবার ভরে যাবে। ---
  const isBoosting=keys.boost&&truck.boostEnergy>0;
  if(isBoosting){truck.boostEnergy=Math.max(0,truck.boostEnergy-46*dt);}else{truck.boostEnergy=Math.min(100,truck.boostEnergy+13*dt);}
  const boostMul=isBoosting?1.65:1,boostSpeedMul=isBoosting?1.32:1;
  // Nitro চালু হওয়ার মুহূর্তে একবার "হুশ" শব্দ আর নীল আগুনের কণা বের হবে।
  if(isBoosting&&!truck.wasBoosting){tone(180,.18,.14,"sawtooth");setTimeout(()=>tone(340,.14,.10,"sawtooth"),70);}
  truck.wasBoosting=isBoosting;
  if(keys.right||keys.gas)truck.vx+=(keys.gas?900:690)*enginePower*v.speed*boost*boostMul*dt;
  if(keys.left)truck.vx-=520*enginePower*dt;
  if(keys.brake)truck.vx*=Math.pow(.035,dt);
  truck.vx*=Math.pow(.92,dt);truck.vx=Math.max(-260,Math.min(maxSpeed*boostSpeedMul,truck.vx));truck.vy+=1850/Math.max(.7,suspension)*dt;truck.x+=truck.vx*dt;if(truck.x<220){truck.x=220;truck.vx=0;}truck.y+=truck.vy*dt;truck.wheelSpin+=truck.vx*dt/truck.wheelR;
  // Boost চালু থাকলে পেছন থেকে উজ্জ্বল নীল-বেগুনি আগুনের শিখা বের হবে (সাধারণ ধোঁয়ার চেয়ে বেশি আর রঙিন)।
  if(isBoosting&&Math.random()<dt*55)boostFlame(truck.x-Math.cos(truck.angle)*48,truck.y+Math.sin(truck.angle)*48+8);
  const wasOnGround=truck.onGround;
  const rearX=truck.x-truck.wheelBase/2,frontX=truck.x+truck.wheelBase/2,rearGround=isGap(rearX)?Infinity:terrainY(rearX),frontGround=isGap(frontX)?Infinity:terrainY(frontX),rearContact=rearGround-truck.wheelR,frontContact=frontGround-truck.wheelR;
  if(Number.isFinite(rearContact)&&Number.isFinite(frontContact)){
    const targetY=(rearContact+frontContact)/2-25,targetAngle=Math.atan2(frontContact-rearContact,truck.wheelBase);
    // বাগ ফিক্স: truck গ্যাপের ভেতরে অনেক নিচে পড়ে গিয়ে (fall অনেক গভীর), তারপর গ্যাপ পার হয়ে দুই চাকা-ই solid
    // জমিতে পৌঁছালে, আগে এই rail-snap logic-টা truck-কে সাথে সাথে সেই জমির উচ্চতায় "টেলিপোর্ট" করে তুলে আনত—
    // এতে মনে হতো "গ্যাপে পড়েও মরেনি, নিজে নিজে উঠে গেছে"। তাই fall-টা যদি (targetY-এর তুলনায়) অনেক বেশি গভীর হয়,
    // তখন আর snap করে land করানো হবে না—truck airborne-ই থাকবে, ফলে হয় স্বাভাবিকভাবে নিচে পড়ে crash হবে,
    // নয়তো সত্যিকারের কাছাকাছি কোনো solid ground পেলে ঠিকভাবে land করবে।
    const fallGap=truck.y-targetY;
    if(truck.y>=targetY&&truck.vy>=-150&&fallGap<230){if(!truck.onGround&&truck.vy>220){dust(truck.x,targetY+30,16);landSound();}truck.y=targetY;truck.vy*=-.08;truck.onGround=true;truck.lastGroundY=targetY;const diff=Math.atan2(Math.sin(targetAngle-truck.angle),Math.cos(targetAngle-truck.angle));truck.angVel+=diff*24*dt*grip;truck.angle+=truck.angVel*dt;truck.angVel*=Math.pow(.015,dt);if(Math.abs(truck.vx)>110&&Math.random()<dt*13)dust(rearX,rearContact+20,1);}
    else{if(truck.onGround&&truck.vy>200)jumpSound();truck.onGround=false;if(keys.left)truck.angVel-=7.5*dt*grip;if(keys.right)truck.angVel+=7.5*dt*grip;truck.angVel*=Math.pow(.89,dt);truck.angle+=truck.angVel*dt;}
  }else{truck.onGround=false;if(keys.left)truck.angVel-=7.5*dt*grip;if(keys.right)truck.angVel+=7.5*dt*grip;truck.angVel*=Math.pow(.90,dt);truck.angle+=truck.angVel*dt;}
  // --- Hill Climb Racing-এর মতো প্রতিটা চাকা independently suspension-এ ওঠানামা করবে (body/design অপরিবর্তিত, শুধু চাকার movement আলাদা)। ---
  {
    const ca=Math.cos(truck.angle),sa=Math.sin(truck.angle);
    const rearRigidY=truck.y+(-39*sa+32*ca),frontRigidY=truck.y+(43*sa+28*ca);
    const rearRaw=Number.isFinite(rearContact)?(rearContact-rearRigidY):22,frontRaw=Number.isFinite(frontContact)?(frontContact-frontRigidY):22;
    const rearTarget=Math.max(-14,Math.min(22,rearRaw)),frontTarget=Math.max(-14,Math.min(22,frontRaw));
    const susK=95,susD=13;
    truck.rearSuspV+=((rearTarget-truck.rearSusp)*susK-truck.rearSuspV*susD)*dt;truck.rearSusp+=truck.rearSuspV*dt;
    truck.frontSuspV+=((frontTarget-truck.frontSusp)*susK-truck.frontSuspV*susD)*dt;truck.frontSusp+=truck.frontSuspV*dt;
    truck.rearSusp=Math.max(-14,Math.min(22,truck.rearSusp));truck.frontSusp=Math.max(-14,Math.min(22,truck.frontSusp));
  }
  // --- Air Time / Flip বোনাস স্কোরিং (Hill Climb Racing-এর মতো)। ---
  if(!truck.onGround){truck.airTime+=dt;truck.airRotation+=Math.abs(truck.angVel*dt);}
  if(truck.onGround&&!wasOnGround)awardAirBonus();
  // Gas চাপলে exhaust pipe থেকে ধোঁয়া বের হবে (truck-এর পেছনের নিচের দিকে, facing অনুযায়ী)।
  if(keys.gas&&Math.random()<dt*22)exhaustPuff(truck.x-Math.cos(truck.angle)*45,truck.y+Math.sin(truck.angle)*45+8);
  collectCoins();updateCamera(dt);updateParticles(dt);if(checkCrash())return;if(truck.x>=finishX())completeLevel();
}

// Gap-এ পড়লে crash state হবে; কোনো auto respawn নেই।
function checkCrash(){
  const rearX=truck.x-truck.wheelBase/2,frontX=truck.x+truck.wheelBase/2,centerGap=isGap(truck.x),bothGap=isGap(rearX)&&isGap(frontX);
  // Gap-এর ওপর দিয়ে জাম্প করলে crash হবে না, কিন্তু সত্যিকারে গর্তের ভেতরে পড়ে গেলে crash হবে।
  // reference হিসেবে truck-এর lastGroundY বা current x-এর virtual terrainY ব্যবহার করলে, truck অনেক আগে
  // (গর্তের সাথে সম্পর্কহীন কোনো বড় পাহাড় থেকে) অনেকক্ষণ ধরে বাতাসে থাকলে ভুলভাবে crash দেখাত।
  // তাই এখন প্রতিটা নির্দিষ্ট gap-এর নিজের "lip" height (gap শুরুর ঠিক আগের, launch-ramp সহ, স্থির height)-এর
  // সাথে তুলনা করা হচ্ছে—এটা truck কতক্ষণ ধরে বাতাসে ছিল তার ওপর নির্ভর করে না, শুধু ওই gap-টার জন্য fair।
  if(centerGap||bothGap){
    const gaps=getGaps();
    let lip=null;
    for(let i=0;i<gaps.length;i++){const gStart=gaps[i][0],gEnd=gStart+gaps[i][1];if(truck.x>=gStart-5&&truck.x<=gEnd+5){lip=terrainY(gStart);break;}}
    if(lip===null)lip=truck.lastGroundY;
    if(truck.y>lip+150){crash("You fell into the gap!");return true;}
  }
  if(truck.y>H+30){crash("You fell off the mountain!");return true;}
  const a=Math.atan2(Math.sin(truck.angle),Math.cos(truck.angle));
  // আরও realistic crash: truck-এর body সত্যিকারে মাটিতে (উল্টে) ধাক্কা খেলে দ্রুত crash হবে।
  // বড় পাহাড়ের কারণে বাতাসে (jump-এ) truck স্বাভাবিকভাবেই অনেকটা ঘুরে যেতে পারে—সেটা crash না, তাই airborne threshold লেনিয়েন্ট রাখা হয়েছে;
  // আসল crash হবে যখন truck মাটিতে নেমে (onGround) উল্টে থাকা অবস্থায় body দিয়ে ধাক্কা খায়।
  if(truck.x>500&&!truck.onGround&&Math.abs(a)>2.75&&truck.y>H*.5){crash("The truck rolled over!");return true;}
  if(truck.onGround&&Math.abs(a)>1.85&&Math.abs(truck.vx)>90){crash("The truck rolled over!");return true;}
  return false;
}

// hex রং-কে হালকা/গাঢ় করার helper—truck body-কে gradient দিয়ে আরও 3D দেখানোর জন্য।
function shadeColor(hex,percent){
  const n=parseInt(hex.slice(1),16);let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  r=Math.max(0,Math.min(255,Math.round(r+(percent<0?r:255-r)*percent)));
  g=Math.max(0,Math.min(255,Math.round(g+(percent<0?g:255-g)*percent)));
  b=Math.max(0,Math.min(255,Math.round(b+(percent<0?b:255-b)*percent)));
  return "#"+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}
// ---------- ACTUAL MONSTER TRUCK DRAW ----------
function drawTruck(){
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];ctx.save();ctx.translate(truck.x-camera.x,truck.y);ctx.rotate(truck.angle);ctx.translate(0,-(truck.onGround?Math.sin(performance.now()*.012)*1.1:0));
  ctx.fillStyle="rgba(0,0,0,.24)";ctx.beginPath();ctx.ellipse(0,45,72,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#141b22";roundRect(-66,2,124,18,7);ctx.fill();ctx.strokeStyle="#9b4324";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-42,13);ctx.lineTo(-35,30);ctx.moveTo(42,13);ctx.lineTo(38,29);ctx.stroke();
  // Roll-cage bar—পেছনে একটা monster-truck স্টাইল সেফটি বার।
  ctx.strokeStyle="#20262c";ctx.lineWidth=6;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(-58,-18);ctx.lineTo(-58,-66);ctx.lineTo(-30,-72);ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle="#454e56";ctx.beginPath();ctx.moveTo(-58,-42);ctx.lineTo(-40,-46);ctx.stroke();
  const bodyGrad=ctx.createLinearGradient(0,-57,0,12);bodyGrad.addColorStop(0,shadeColor(v.color,.32));bodyGrad.addColorStop(.55,v.color);bodyGrad.addColorStop(1,shadeColor(v.color,-.28));
  ctx.fillStyle=bodyGrad;ctx.strokeStyle="#4a2a08";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-61,-22);ctx.lineTo(-45,-51);ctx.lineTo(10,-57);ctx.lineTo(45,-42);ctx.lineTo(62,-7);ctx.lineTo(50,10);ctx.lineTo(-51,12);ctx.lineTo(-64,-4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle=v.accent;ctx.globalAlpha=.58;ctx.beginPath();ctx.moveTo(-43,-44);ctx.lineTo(4,-50);ctx.lineTo(28,-39);ctx.lineTo(-35,-33);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle=v.color;ctx.strokeStyle="#43280b";ctx.beginPath();ctx.moveTo(-29,-50);ctx.lineTo(-17,-77);ctx.lineTo(18,-80);ctx.lineTo(38,-51);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle="#bfeefa";ctx.beginPath();ctx.moveTo(-11,-72);ctx.lineTo(-5,-73);ctx.lineTo(0,-55);ctx.lineTo(-23,-55);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(4,-74);ctx.lineTo(17,-75);ctx.lineTo(30,-54);ctx.lineTo(5,-55);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle="#202830";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-45,-52);ctx.lineTo(-38,-65);ctx.lineTo(27,-69);ctx.lineTo(39,-50);ctx.stroke();
  ctx.fillStyle="#101820";roundRect(47,-4,24,10,3);ctx.fill();ctx.fillStyle="#fff4ae";roundRect(49,-29,9,10,2);ctx.fill();ctx.fillStyle="#e7a000";roundRect(24,-28,29,6,2);ctx.fill();
  for(let i=0;i<5;i++){ctx.shadowColor="#ffe66b";ctx.shadowBlur=8;ctx.fillStyle="#ffd62e";ctx.beginPath();ctx.arc(-20+i*9,-82,3.2,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;
  ctx.strokeStyle="#7d560e";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,-30);ctx.lineTo(-9,7);ctx.stroke();
  // চাকা দুটো এখন body-র সাথে rigidly বসানো না থেকে independent suspension offset (truck.rearSusp/frontSusp) অনুযায়ী নিজে নিজে ওঠানামা করে।
  drawMonsterWheel(-39,32+truck.rearSusp,27,truck.wheelSpin);drawMonsterWheel(43,28+truck.frontSusp,30,truck.wheelSpin);ctx.restore();
}
function drawMonsterWheel(x,y,r,rotation=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.fillStyle="#0b1015";ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#36424b";ctx.lineWidth=4;ctx.stroke();ctx.fillStyle="#252e35";for(let i=0;i<16;i++){ctx.save();ctx.rotate(i*Math.PI*2/16);ctx.fillRect(-3,-r+1,6,10);ctx.restore();}ctx.fillStyle="#8d9aa3";ctx.beginPath();ctx.arc(0,0,r*.48,0,Math.PI*2);ctx.fill();ctx.fillStyle="#313b43";ctx.beginPath();ctx.arc(0,0,r*.30,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#d2d9dd";ctx.lineWidth=2;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.42,Math.sin(a)*r*.42);ctx.stroke();}ctx.fillStyle="#edf3f5";ctx.beginPath();ctx.arc(0,0,r*.12,0,Math.PI*2);ctx.fill();ctx.restore();
}

// ---------- SCREEN / NAVIGATION ----------
// সব screen একসাথে hide করা হচ্ছে; maps screen-ও included।
function hideScreens(){
  ["mainMenu","levelMenu","mapsMenu","garageMenu","storeMenu","pauseMenu","crashMenu","completeMenu","settingsMenu"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.classList.add("hidden");el.style.display="none";el.style.visibility="hidden";el.style.pointerEvents="none";}
  });
}

// নির্দিষ্ট screen দেখানো হচ্ছে এবং overlap আটকানো হচ্ছে।
function showScreen(id){
  hideScreens();
  const el=document.getElementById(id);
  if(el){el.classList.remove("hidden");el.style.display="";el.style.visibility="visible";el.style.pointerEvents="auto";}
  const menuScreens=["mainMenu","levelMenu","mapsMenu","garageMenu","storeMenu"];
  const hud=document.getElementById("hud"),controls=document.getElementById("controls");
  if(menuScreens.includes(id)){hud.classList.add("hidden");controls.classList.add("hidden");}
  else if(["pauseMenu","crashMenu","completeMenu"].includes(id)){hud.classList.remove("hidden");controls.classList.remove("hidden");}
}

// Main menu route।
function goMain(){
  keys.left=keys.right=keys.gas=keys.brake=false;
  state="menu";engineStop();setAudioSuppressed(false);updateCoinsUI();showScreen("mainMenu");
}

// Level start: selected map + selected vehicle ব্যবহার করা হচ্ছে।
function startLevel(id){
  currentLevel=Math.max(1,Math.min(TOTAL_LEVELS,id));
  // প্রতিবার নতুন করে (retry/restart) level শুরু করলে সেই level+map-এর কয়েন আবার শুরু থেকে available হবে।
  const coinKey=currentLevel+"_m"+(save.selectedMap||0);
  if(save.collected[coinKey])delete save.collected[coinKey];
  state="play";resetTruck();generateCoins();levelStart=performance.now();elapsed=0;hideScreens();
  document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");
  resumeAudio();setAudioSuppressed(false);engineStart();updateHUD();
}

// Level complete reward এখন predictable এবং persist হবে।
// truck finish line পার হলে এই function কল হয়—time রেকর্ড করা, পরের level unlock করা, কয়েন রিওয়ার্ড দেওয়া,
// আর "LEVEL COMPLETE" স্ক্রিন দেখানো—সবকিছু এখানেই হয়।
function completeLevel(){
  if(state!=="play")return; // ইতিমধ্যে complete/crash হয়ে থাকলে আবার চালানো যাবে না (duplicate আটকানো)
  state="complete";engineStop();elapsed=(performance.now()-levelStart)/1000; // মোট সময় হিসাব
  // best time (personal record) হলে সেটাই নতুন best হিসেবে save হবে
  const old=save.best[currentLevel];if(!old||elapsed<old)save.best[currentLevel]=elapsed;
  // এই level "সম্পন্ন" হিসেবে মার্ক হবে, আর পরের level unlock হবে (শেষ level না হলে)
  save.completed[currentLevel]=true;if(currentLevel<TOTAL_LEVELS)save.unlocked=Math.max(save.unlocked,currentLevel+1);
  // level যত বড় আর map যত পরের দিকের (কঠিন), reward তত বেশি
  const reward=75+Math.floor(currentLevel*3)+(save.selectedMap||0)*10;coins+=reward;save.coins=coins;persist();
  // সময়ের ওপর ভিত্তি করে ৩/২/১ তারা (star rating) দেখানো হচ্ছে
  document.getElementById("resultTime").textContent=formatTime(elapsed);document.getElementById("rewardText").textContent=`+${reward} coins`;document.getElementById("resultStars").textContent=elapsed<42?"★★★":elapsed<70?"★★☆":"★☆☆";
  purchaseSound();showScreen("completeMenu");
}

// ---------- SETTINGS ----------
let settingsReturnStateV22="menu";
function openSettingsV22(){
  resumeAudio();settingsReturnStateV22=state;
  if(state==="play"){state="settings";engineStop();setAudioSuppressed(true);}else if(state==="pause"){setAudioSuppressed(true);}
  const slider=document.getElementById("volumeSlider"),value=document.getElementById("volumeValue"),mute=document.getElementById("muteToggle");
  slider.value=userVolume;value.textContent=Math.round(userVolume)+"%";mute.checked=userMuted;
  const panel=document.getElementById("settingsMenu");panel.classList.remove("hidden");panel.style.display="flex";panel.style.visibility="visible";panel.style.pointerEvents="auto";panel.style.zIndex="99999";
}
function closeSettingsV22(){
  const panel=document.getElementById("settingsMenu");panel.classList.add("hidden");panel.style.display="none";panel.style.visibility="hidden";panel.style.pointerEvents="none";
  const previous=settingsReturnStateV22;
  if(previous==="play"||previous==="settings"){
    state="play";document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");setAudioSuppressed(false);resumeAudio();engineStart();
  }else if(previous==="pause"){
    state="pause";document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");setAudioSuppressed(true);
  }else state=previous;
}

// ---------- EVENT REBIND ----------
// Main menu।
document.getElementById("playBtn").onclick=()=>{resumeAudio();tone(540,.08,.08);startLevel(currentLevel||1);};
document.getElementById("levelsBtn").onclick=()=>{resumeAudio();tone(480,.06,.05);renderLevels();showScreen("levelMenu");};
document.getElementById("mapsBtn").onclick=()=>{resumeAudio();tone(500,.06,.05);renderMaps();showScreen("mapsMenu");};
document.getElementById("garageBtn").onclick=()=>{resumeAudio();tone(500,.06,.05);renderGarage();showScreen("garageMenu");};
document.getElementById("storeBtn").onclick=()=>{resumeAudio();tone(500,.06,.05);renderStore();showScreen("storeMenu");};
// ধাপ ৩: ENDLESS/DISTANCE MODE—সরাসরি সিলেক্টেড vehicle/map দিয়ে শুরু, finish নেই।
document.getElementById("endlessBtn").onclick=()=>{resumeAudio();tone(460,.07,.06);startEndless();};

// Back buttons।
["backLevelsBtn","backMapsBtn","backGarageBtn","backStoreBtn"].forEach(id=>{const el=document.getElementById(id);if(el)el.onclick=()=>{tone(330,.06,.05);goMain();};});

// Settings।
document.getElementById("settingsBtn").onclick=openSettingsV22;
document.getElementById("closeSettingsBtn").onclick=()=>{tone(330,.05,.04);closeSettingsV22();};
document.getElementById("settingsMenu").onclick=e=>{if(e.target.id==="settingsMenu")closeSettingsV22();};
document.getElementById("volumeSlider").oninput=e=>{userVolume=Number(e.target.value);localStorage.setItem("hillRushVolume",String(userVolume));document.getElementById("volumeValue").textContent=Math.round(userVolume)+"%";applyAudioVolume();};
document.getElementById("muteToggle").onchange=e=>{userMuted=e.target.checked;localStorage.setItem("hillRushMuted",userMuted?"1":"0");applyAudioVolume();};

// Garage select।
document.getElementById("selectVehicleBtn").onclick=()=>{persist();selectSound();renderGarage();};

// Pause / crash / complete।
document.getElementById("resumeBtn").onclick=()=>{if(state==="pause"){state="play";hideScreens();document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");setAudioSuppressed(false);resumeAudio();engineStart();}};
document.getElementById("pauseMenuBtn").onclick=goMain;
document.getElementById("pauseLevelsBtn").onclick=()=>{engineStop();state="levels";renderLevels();showScreen("levelMenu");};
document.getElementById("retryCrashBtn").onclick=()=>startLevel(currentLevel);
document.getElementById("crashLevelsBtn").onclick=()=>{state="levels";renderLevels();showScreen("levelMenu");};
document.getElementById("nextLevelBtn").onclick=()=>{if(currentLevel<TOTAL_LEVELS)startLevel(currentLevel+1);else{renderLevels();showScreen("levelMenu");}};
document.getElementById("completeLevelsBtn").onclick=()=>{state="levels";renderLevels();showScreen("levelMenu");};
document.getElementById("endlessRetryBtn").onclick=()=>startEndless();
document.getElementById("endlessMenuBtn").onclick=goMain;

// Level page controls পুনরায় bind করা হচ্ছে।
document.getElementById("prevPage").onclick=()=>{levelPage=Math.max(0,levelPage-1);renderLevels();tone(330,.05,.04);};
document.getElementById("nextPage").onclick=()=>{levelPage=Math.min(4,levelPage+1);renderLevels();tone(430,.05,.04);};

// Control buttons: pointer/touch/keyboard তিনভাবেই reliable।
function bindDriveControl(button){
  const key=button.dataset.key;
  const press=e=>{if(e)e.preventDefault();if(state!=="play")return;resumeAudio();setAudioSuppressed(false);keys[key]=true;button.classList.add("pressed");};
  const release=e=>{if(e)e.preventDefault();keys[key]=false;button.classList.remove("pressed");};
  button.onpointerdown=press;button.onpointerup=release;button.onpointercancel=release;button.onpointerleave=release;button.oncontextmenu=e=>e.preventDefault();
  button.ontouchstart=press;button.ontouchend=release;button.ontouchcancel=release;
}
document.querySelectorAll(".driveControl").forEach(bindDriveControl);

// Escape: settings বা pause close।
addEventListener("keydown",e=>{if(e.key==="Escape"){if(!document.getElementById("settingsMenu").classList.contains("hidden"))closeSettingsV22();else if(state==="play"||state==="pause")togglePause();}});

// ---------- VISUAL RENDER ----------
// Existing bridge layer বাদ দেওয়া হচ্ছে যাতে visible gap আর fake bridge collision না করে।
function drawBridges(){}
function render(){
  drawSky();drawTerrain();drawBridges();drawFinish();drawCoins();drawParticles();drawTruck();drawFloatTexts();drawGaugeCluster();
  if(state==="play"){elapsed=(performance.now()-levelStart)/1000;document.getElementById("timer").textContent=formatTime(elapsed);updateHUD();}
}

// ---------- STARTUP ----------
updateCoinsUI();renderGarage();renderMaps();showScreen("mainMenu");



// ============================================================
// V24 -- CLICK FIX: removed the V23 document-level capture-phase
// click router. Ota shob button er click age theke atke dichhilo,
// karon capture-phase e stopPropagation() event ke target e
// pouchanor age e thamiye dito. Ekhon protita button e directly
// onclick bind kora ache (EVENT REBIND section, upore), tai alada
// router er dorkar nei.
// ============================================================


// ============================================================
// HILL RUSH V30 — ফাইনাল অ্যাডভান্সড প্যাচ
// (Mouse-first control panel + Biome physics + Ghost Racing +
//  Stunt & Combo + Dynamic Weather + Daily Missions/Achievements
//  + Damage & Repair + audit fixes)
// প্রতিটা লাইনের পাশে বাংলা কমেন্টে বোঝানো আছে কোন লাইন কী করছে এবং কেন।
// ============================================================

// ---------- SAVE SCHEMA SELF-HEALING ----------
// পুরোনো/করাপ্টেড save-এ নতুন ফিচারের ফিল্ড না থাকলে নিরাপদভাবে default বসানো হচ্ছে।
// এটা idempotent—যতবার কল হোক, ক্ষতি নেই, তাই যেকোনো নতুন function-এর শুরুতে নিশ্চিন্তে কল করা যায়।
function ensureV30Save(){
  // Ghost racing-এর best-run ডেটা রাখার জায়গা।
  if(!save.ghosts) save.ghosts={};
  // কোন কোন achievement আগেই claim হয়ে গেছে তার তালিকা।
  if(!save.achClaimed) save.achClaimed=[];
  // Lifetime (সারাজীবনের) পরিসংখ্যান—achievement check করার জন্য দরকার।
  if(!save.lifetime) save.lifetime={stuntsTotal:0};
  // stuntsTotal সংখ্যা না থাকলে/ভুল হলে ০ থেকে শুরু।
  if(!Number.isFinite(save.lifetime.stuntsTotal)) save.lifetime.stuntsTotal=0;
  // আজকের দৈনিক কাউন্টার (level/distance/stunt)—প্রতিদিন রিসেট হবে।
  if(!save.daily) save.daily={dayKey:"",coinsToday:0,distanceToday:0,stuntsToday:0,levelsToday:0};
  // আজকের ৩টা মিশনের তালিকা—না থাকলে খালি array।
  if(!save.missions||!Array.isArray(save.missions.items)) save.missions={dayKey:"",items:[]};
  // প্রতিটা ভেহিকেলের condition/damage (০-১০০)—না থাকলে খালি object (লাগলে getCondition lazily ১০০ বসাবে)।
  if(!save.vehicleCondition) save.vehicleCondition={};
}

// ---------- RUN-ONLY / মডিউল স্টেট ----------
// এগুলো সব var দিয়ে ঘোষণা করা হয়েছে (let/const নয়) ইচ্ছাকৃতভাবে—কারণ script-এর অনেক উপরের দিকে
// (৩১৬২ ও ৩৭৬৯ নম্বর লাইনের কাছাকাছি STARTUP কলগুলোতে) আগে থেকেই updateCoinsUI()/renderGarage()
// কল হয়, যেগুলো এই নিচের নতুন কোডের ওপর নির্ভর করে। var hoist হয়ে undefined নিয়ে শুরু হয়, তাই
// সেই আগের কলগুলোতে কোনো ReferenceError (TDZ ক্র্যাশ) হবে না—গার্ড চেক (Array.isArray ইত্যাদি) নিরাপদে false হবে।
var MISSION_POOL=[
  // প্রতিদিন এই pool থেকে deterministic ভাবে ৩টা মিশন বাছাই হয় (তারিখ অনুযায়ী—তাই সবার জন্য একই দিনে একই মিশন)।
  {id:"m_levels2",desc:"আজ ২টি লেভেল সম্পন্ন করো",type:"levels",target:2,reward:100},
  {id:"m_levels4",desc:"আজ ৪টি লেভেল সম্পন্ন করো",type:"levels",target:4,reward:180},
  {id:"m_distance3000",desc:"আজ মোট ৩০০০ দূরত্ব অতিক্রম করো",type:"distance",target:3000,reward:90},
  {id:"m_distance6000",desc:"আজ মোট ৬০০০ দূরত্ব অতিক্রম করো",type:"distance",target:6000,reward:160},
  {id:"m_stunts2",desc:"আজ ২টি নিরাপদ স্টান্ট ফ্লিপ করো",type:"stunts",target:2,reward:110},
  {id:"m_stunts5",desc:"আজ ৫টি নিরাপদ স্টান্ট ফ্লিপ করো",type:"stunts",target:5,reward:200}
];
// স্থায়ী (lifetime) achievement তালিকা—একবার claim হলে আর কখনো আবার দেওয়া হবে না।
var ACHIEVEMENTS=[
  {id:"ach_levels10",desc:"১০টি লেভেল সম্পন্ন করো",reward:300,check:s=>Object.keys(s.completed||{}).length>=10},
  {id:"ach_levels50",desc:"৫০টি লেভেল সম্পন্ন করো",reward:1000,check:s=>Object.keys(s.completed||{}).length>=50},
  {id:"ach_coins3000",desc:"একসাথে ৩০০০ কয়েন জমাও",reward:400,check:s=>(s.coins||0)>=3000},
  {id:"ach_stunts50",desc:"মোট ৫০টি স্টান্ট ফ্লিপ ল্যান্ড করো",reward:350,check:s=>((s.lifetime&&s.lifetime.stuntsTotal)||0)>=50},
  {id:"ach_vehicles3",desc:"৩টি ভেহিকেল আনলক করো",reward:250,check:s=>(s.ownedVehicles||[]).length>=3},
  {id:"ach_maps3",desc:"৩টি ম্যাপ আনলক করো",reward:250,check:s=>(s.ownedMaps||[]).length>=3}
];
// বর্তমান লেভেলের আবহাওয়া ("clear"/"rain"/"snow"/"wind"/"sandstorm")।
var currentWeather="clear";
// আবহাওয়ার কণা (বৃষ্টি/তুষার/বালি/বাতাস)।
var weatherParticles=[];
// Stunt combo গোনা ও তার টাইমার (কতক্ষণের মধ্যে পরের ফ্লিপ করলে combo বাড়বে)।
var comboCount=0,comboTimer=0;
// Ghost racing: playback (আগের best run) ও বর্তমান run রেকর্ডিং।
var ghostPlayback=null,ghostRecording=[],ghostRecordTimer=0;
// একটানা একই সংঘর্ষে বারবার damage না কাটার জন্য cooldown টাইমার।
var impactCooldown=0;

// স্ক্রিপ্ট লোড হওয়ার সাথে সাথেই একবার save self-heal ও দৈনিক মিশন ঠিক করা হচ্ছে।
ensureV30Save();

// ---------- DAILY MISSIONS: রোজ নতুন করে রিসেট ----------
// তারিখ (local date string) থেকে deterministic hash বানিয়ে pool থেকে ৩টা মিশন বাছাই করা হচ্ছে।
function pickDailyMissions(dayStr){
  // Pool খালি/না থাকলে কিছু করার নেই।
  if(!Array.isArray(MISSION_POOL)) return [];
  // সাধারণ string hash (deterministic—একই তারিখে সবসময় একই ফলাফল)।
  let h=0;
  for(let i=0;i<dayStr.length;i++) h=(h*31+dayStr.charCodeAt(i))>>>0;
  // মূল pool-এর একটা কপি, যাতে আসল array পরিবর্তন না হয়।
  const pool=MISSION_POOL.slice(),chosen=[];
  // পরপর ৩টা ভিন্ন মিশন তুলে আনা হচ্ছে।
  for(let i=0;i<3&&pool.length;i++){
    // LCG-স্টাইল hash advance (deterministic pseudo-random)।
    h=(h*1103515245+12345)>>>0;
    // Pool-এর কোন index বাছাই হবে।
    const idx=h%pool.length;
    // সেই entry সরিয়ে আনা হচ্ছে যাতে দ্বিতীয়বার আবার না আসে।
    const picked=pool.splice(idx,1)[0];
    // তাজা claimed:false সহ নতুন instance তৈরি (পুরোনো দিনের claimed state যেন বহন না করে)।
    chosen.push({id:picked.id,desc:picked.desc,type:picked.type,target:picked.target,reward:picked.reward,claimed:false});
  }
  // চূড়ান্ত ৩টা মিশন।
  return chosen;
}
// আজকের তারিখ আগের save-এর তারিখ থেকে আলাদা হলে—দৈনিক কাউন্টার ও মিশন রিসেট।
function checkDailyReset(){
  // সবার আগে schema নিরাপদ করা হচ্ছে।
  ensureV30Save();
  // আজকের local date string।
  const today=new Date().toDateString();
  // তারিখ বদলে গেলে (বা প্রথমবার) রিসেট।
  if(save.daily.dayKey!==today){
    // দৈনিক কাউন্টার শূন্য থেকে শুরু।
    save.daily={dayKey:today,coinsToday:0,distanceToday:0,stuntsToday:0,levelsToday:0};
    // নতুন ৩টা মিশন বাছাই।
    save.missions={dayKey:today,items:pickDailyMissions(today)};
    // সেভ করা হচ্ছে।
    persist();
  }
}
// স্ক্রিপ্ট লোডের সাথে সাথেই একবার চেক করা হচ্ছে (মিশন স্ক্রিন প্রথমবার খোলার আগেই যেন ডেটা প্রস্তুত থাকে)।
checkDailyReset();

// ---------- DAMAGE & REPAIR ----------
// নির্দিষ্ট vehicle-এর বর্তমান condition (০-১০০, ১০০=সম্পূর্ণ ঠিক) পড়া হচ্ছে, না থাকলে লেজিলি ১০০ বসানো হচ্ছে।
function getCondition(id){
  // Object না থাকলে তৈরি (করাপ্টেড save হ্যান্ডলিং)।
  if(!save.vehicleCondition) save.vehicleCondition={};
  // সংখ্যা না হলে (প্রথমবার/করাপ্টেড) ১০০% থেকে শুরু।
  if(!Number.isFinite(save.vehicleCondition[id])) save.vehicleCondition[id]=100;
  // মান রিটার্ন।
  return save.vehicleCondition[id];
}
// Condition-কে ০-১০০ এর মধ্যে clamp করে বসানো হচ্ছে।
function setCondition(id,val){
  // Object নিরাপদ করা।
  if(!save.vehicleCondition) save.vehicleCondition={};
  // Clamp করে বসানো।
  save.vehicleCondition[id]=Math.max(0,Math.min(100,val));
}
// প্রতি ফ্রেমে cooldown timer কমানো হচ্ছে (একই সংঘর্ষে বারবার damage আটকাতে)।
function updateDamage(dt){
  // Cooldown চললে কমতে থাকবে।
  if(impactCooldown>0) impactCooldown-=dt;
}
// হার্ড ল্যান্ডিং/রোলওভার ক্র্যাশে vehicle-এর condition কমানো হচ্ছে।
function applyImpactDamage(amount,force){
  // Cooldown চলাকালীন (এবং force না দেওয়া হলে) একই সংঘর্ষের জন্য আবার damage হবে না।
  if(impactCooldown>0&&!force) return;
  // পরের ০.৬ সেকেন্ড আর damage প্রযোজ্য হবে না (একই impact-এর multi-frame ড্যামেজ আটকাতে)।
  impactCooldown=.6;
  // বর্তমান নির্বাচিত vehicle।
  const id=save.selectedVehicle;
  // Condition কমানো।
  setCondition(id,getCondition(id)-amount);
  // সেভ।
  persist();
}
// HUD-এর damage bar আপডেট করা হচ্ছে (রং সহ—সবুজ/হলুদ/লাল)।
function updateDamageBarUI(){
  // DOM element।
  const bar=document.getElementById("damageBar");
  // না থাকলে কিছু করার নেই।
  if(!bar) return;
  // বর্তমান condition।
  const val=getCondition(save.selectedVehicle);
  // Width পার্সেন্ট হিসেবে।
  bar.style.width=Math.max(0,val)+"%";
  // Threshold অনুযায়ী CSS class।
  bar.className="damageBar"+(val<35?" crit":val<70?" warn":"");
}

// ---------- BIOME-ভিত্তিক PHYSICS (grip/visibility) ----------
// প্রতিটা ম্যাপের theme অনুযায়ী আলাদা grip multiplier—বরফে পিচ্ছিল, মরুভূমিতে ঢিলেঢালা, পাহাড়ে রুক্ষ।
function themeGripMul(theme){
  // ICE VALLEY—সবচেয়ে পিচ্ছিল।
  if(theme==="ice") return .78;
  // DESERT STORM—ঢিলেঢালা বালি, কম grip।
  if(theme==="desert") return .86;
  // VOLCANO RIDGE—রুক্ষ পাথুরে জমি, সামান্য কম grip।
  if(theme==="volcano") return .92;
  // বাকি সব biome স্বাভাবিক grip।
  return 1;
}
// Night City মানচিত্রে কম দৃশ্যমানতা—truck-এর চারপাশে একটা "headlight" radius বাদে বাকি স্ক্রিন অন্ধকার।
function drawNightOverlay(){
  // শুধু খেলার মধ্যে দেখানো হবে।
  if(state!=="play") return;
  // বর্তমান ম্যাপ।
  const m=maps[save.selectedMap]||maps[0];
  // শুধু night theme-এ কাজ করবে।
  if(m.theme!=="night") return;
  // Headlight-এর কেন্দ্র—truck-এর একটু সামনে (drive direction অনুযায়ী ডানদিকে)।
  const sx=truck.x-camera.x+40,sy=truck.y-20;
  // গতি বাড়লে visibility radius একটু বাড়বে (বাস্তবসম্মত হেডলাইট থ্রো)।
  const r=Math.max(220,Math.min(420,220+Math.abs(truck.vx)*.35));
  ctx.save();
  // কেন্দ্র থেকে বাইরের দিকে স্বচ্ছ → গাঢ় অন্ধকার gradient।
  const grad=ctx.createRadialGradient(sx,sy,r*.25,sx,sy,r);
  grad.addColorStop(0,"rgba(0,0,0,0)");
  grad.addColorStop(1,"rgba(2,6,14,.82)");
  ctx.fillStyle=grad;
  // পুরো স্ক্রিনে overlay বসানো।
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

// ---------- DYNAMIC WEATHER ----------
// Deterministic pseudo-random hash (০-১ এর মধ্যে), শুধু আবহাওয়া বাছাইয়ের জন্য ব্যবহৃত।
function hashSeed(n){
  const v=Math.sin(n*12.9898)*43758.5453;
  return v-Math.floor(v);
}
// Level+Map অনুযায়ী deterministic আবহাওয়া বাছাই—একই level/map-এ সবসময় একই আবহাওয়া থাকবে, finish distance/terrain বদলায় না।
function weatherForLevel(){
  // বর্তমান ম্যাপ।
  const m=maps[save.selectedMap]||maps[0];
  // Biome অনুযায়ী সম্ভাব্য আবহাওয়ার pool সীমিত করা হচ্ছে (বাস্তবসম্মত—মরুভূমিতে বরফ পড়বে না)।
  let pool=["clear","wind"];
  if(m.theme==="ice") pool=["snow","clear","wind"];
  else if(m.theme==="desert") pool=["sandstorm","clear","wind"];
  else if(m.theme==="jungle"||m.theme==="hills"||m.theme==="canyon"||m.theme==="autumn") pool=["clear","rain","wind"];
  else if(m.theme==="night") pool=["clear","rain"];
  else if(m.theme==="volcano") pool=["clear","wind"];
  // Level+Map থেকে deterministic seed।
  const h=hashSeed(currentLevel*131.7+(save.selectedMap||0)*977.3);
  // Pool থেকে একটা বাছাই।
  const idx=Math.min(pool.length-1,Math.floor(h*pool.length));
  return pool[idx];
}
// আবহাওয়া অনুযায়ী grip multiplier (traction প্রভাব)।
function weatherGripMul(){
  return {clear:1,rain:.90,snow:.78,wind:.97,sandstorm:.88}[currentWeather]||1;
}
// বাতাস/বালির ঝড়ে airborne অবস্থায় হালকা পিছনের দিকে ধাক্কা (challenge বাড়ানোর জন্য, deterministic—র‍্যান্ডম না)।
function weatherSideForce(){
  return (currentWeather==="wind"||currentWeather==="sandstorm")?-26:0;
}
// প্রতি ফ্রেমে নতুন আবহাওয়া কণা তৈরি+movement+cleanup (performance cap সহ)।
function updateWeather(dt){
  // Array নিরাপদ করা (early-call safety)।
  if(!weatherParticles) weatherParticles=[];
  // খেলা না চললে কণা তৈরি করার দরকার নেই।
  if(state!=="play") return;
  // প্রতিটা আবহাওয়ার জন্য সর্বোচ্চ কণা সংখ্যা (performance limit)।
  const caps={clear:0,rain:140,snow:90,wind:40,sandstorm:110};
  const max=caps[currentWeather]||0;
  // ক্যাপের নিচে থাকলে এবং দৈব সময়ে নতুন কণা যোগ।
  if(max>0&&weatherParticles.length<max&&Math.random()<dt*max*.9){
    if(currentWeather==="rain") weatherParticles.push({x:camera.x+Math.random()*W,y:-20,vx:-40,vy:620,life:2,type:"rain"});
    else if(currentWeather==="snow") weatherParticles.push({x:camera.x+Math.random()*W,y:-20,vx:(Math.random()-.5)*30,vy:60+Math.random()*40,life:4,type:"snow",size:2+Math.random()*3,sway:Math.random()*6.28});
    else if(currentWeather==="wind") weatherParticles.push({x:camera.x+W+20,y:Math.random()*H,vx:-220-Math.random()*80,vy:0,life:2,type:"wind"});
    else if(currentWeather==="sandstorm") weatherParticles.push({x:camera.x+W+20,y:Math.random()*H,vx:-260-Math.random()*120,vy:(Math.random()-.5)*30,life:2,type:"sand",size:2+Math.random()*4});
  }
  // প্রতিটা কণা move করা হচ্ছে।
  weatherParticles.forEach(p=>{
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    // তুষার হালকা দুলতে দুলতে পড়বে।
    if(p.type==="snow") p.x+=Math.sin(performance.now()*.002+(p.sway||0))*12*dt;
    p.life-=dt;
  });
  // মৃত/দূরের কণা বাদ (performance)।
  weatherParticles=weatherParticles.filter(p=>p.life>0&&p.x>camera.x-80&&p.x<camera.x+W+80);
  // Hard cap—কোনোভাবে বেশি জমে গেলেও সীমিত রাখা।
  if(weatherParticles.length>260) weatherParticles.length=260;
}
// আবহাওয়ার কণা + হালকা haze overlay আঁকা হচ্ছে।
function drawWeather(){
  // কিছু না থাকলে/clear হলে আঁকার দরকার নেই।
  if(!weatherParticles||currentWeather==="clear") return;
  ctx.save();
  weatherParticles.forEach(p=>{
    // Screen-space x।
    const sx=p.x-camera.x;
    if(p.type==="rain"){ctx.strokeStyle="rgba(190,220,255,.55)";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,p.y);ctx.lineTo(sx-10,p.y-26);ctx.stroke();}
    else if(p.type==="snow"){ctx.fillStyle="rgba(255,255,255,.85)";ctx.beginPath();ctx.arc(sx,p.y,p.size||3,0,Math.PI*2);ctx.fill();}
    else if(p.type==="wind"){ctx.strokeStyle="rgba(255,255,255,.18)";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(sx,p.y);ctx.lineTo(sx+26,p.y);ctx.stroke();}
    else if(p.type==="sand"){ctx.fillStyle="rgba(214,180,120,.5)";ctx.beginPath();ctx.arc(sx,p.y,p.size||3,0,Math.PI*2);ctx.fill();}
  });
  // পুরো স্ক্রিনে হালকা haze (আবহাওয়ার mood)।
  const haze={rain:"rgba(60,90,130,.10)",snow:"rgba(255,255,255,.10)",sandstorm:"rgba(200,150,70,.18)",wind:"rgba(255,255,255,.04)"}[currentWeather];
  if(haze){ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);}
  ctx.restore();
}
// HUD-এ আবহাওয়ার আইকন আপডেট।
function updateWeatherBadge(){
  const el=document.getElementById("weatherBadge");
  if(!el) return;
  const icon={clear:"☀",rain:"🌧",snow:"❄",wind:"💨",sandstorm:"🏜"}[currentWeather]||"☀";
  el.textContent=icon;
}

// ---------- GHOST RACING ----------
// বর্তমান level+map-এর জন্য unique key (best-run ঘোস্ট এই key দিয়ে save হয়)।
function ghostKey(){
  return currentLevel+"_m"+(save.selectedMap||0);
}
// প্রতি ~০.১ সেকেন্ডে truck-এর অবস্থান রেকর্ড করা হচ্ছে (প্রতি ফ্রেমে না, storage/perf বাঁচাতে)।
function recordGhostSample(dt){
  ghostRecordTimer=(ghostRecordTimer||0)+dt;
  if(ghostRecordTimer>=.1){
    ghostRecordTimer=0;
    ghostRecording.push([elapsed,truck.x,truck.y,truck.angle]);
    // খুব দীর্ঘ রান হলেও memory নিয়ন্ত্রণে রাখা হচ্ছে।
    if(ghostRecording.length>3000) ghostRecording.shift();
  }
}
// Level শেষ হলে—এই রানটা আগের best-run থেকে ভালো হলে (অথবা প্রথমবার) ঘোস্ট হিসেবে save করা হচ্ছে।
function saveGhostIfBest(){
  ensureV30Save();
  const key=ghostKey();
  const prev=save.ghosts[key];
  // কমপক্ষে কয়েকটা sample থাকতে হবে, এবং আগের চেয়ে দ্রুত/প্রথম হতে হবে।
  if(ghostRecording.length>1&&(!prev||elapsed<prev.time)){
    save.ghosts[key]={time:elapsed,samples:ghostRecording.slice()};
  }
}
// Level শুরু হওয়ার সময় আগের best-run ঘোস্ট (থাকলে) লোড করা হচ্ছে।
function loadGhostForLevel(){
  ensureV30Save();
  const g=save.ghosts[ghostKey()];
  // অন্তত ২টা sample না থাকলে ঘোস্ট দেখানো হবে না (অর্থহীন হবে)।
  ghostPlayback=(g&&Array.isArray(g.samples)&&g.samples.length>1)?{samples:g.samples,idx:0}:null;
}
// নির্দিষ্ট সময় t-এ ঘোস্টের অবস্থান interpolate করে বের করা হচ্ছে।
function sampleGhostAt(t){
  if(!ghostPlayback) return null;
  const s=ghostPlayback.samples;
  if(!s||!s.length) return null;
  // শুরুর আগে হলে প্রথম sample।
  if(t<=s[0][0]) return s[0];
  const last=s[s.length-1];
  // ঘোস্টের রান শেষ হয়ে গেলে আর দেখানো হবে না (অসম্পূর্ণ loop এড়াতে)।
  if(t>=last[0]) return null;
  // আগের ইনডেক্স থেকে এগিয়ে scan (বেশিরভাগ সময় caching-এর মতো দ্রুত হবে)।
  let i=Math.min(ghostPlayback.idx,s.length-2);
  // Level restart হলে (t ছোট হয়ে গেলে) আবার শুরু থেকে scan।
  if(i>0&&s[i][0]>t) i=0;
  while(i<s.length-2&&s[i+1][0]<t) i++;
  ghostPlayback.idx=i;
  const a=s[i],b=s[i+1];
  const span=Math.max(1e-4,b[0]-a[0]),frac=Math.max(0,Math.min(1,(t-a[0])/span));
  // Linear interpolation—x,y,angle তিনটাই smooth ভাবে মিশিয়ে দেওয়া হচ্ছে।
  return [t,a[1]+(b[1]-a[1])*frac,a[2]+(b[2]-a[2])*frac,a[3]+(b[3]-a[3])*frac];
}
// স্বচ্ছ (translucent) ঘোস্ট truck আঁকা হচ্ছে—এটা শুধু visual, কোনো collision/physics নেই।
function drawGhost(){
  if(state!=="play"||!ghostPlayback) return;
  const sample=sampleGhostAt(elapsed);
  if(!sample) return;
  const gx=sample[1],gy=sample[2],ga=sample[3];
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];
  ctx.save();
  // স্বচ্ছ করে আঁকা হচ্ছে যাতে আসল truck থেকে আলাদা বোঝা যায়।
  ctx.globalAlpha=.30;
  ctx.translate(gx-camera.x,gy);
  ctx.rotate(ga);
  // সরলীকৃত body সিলুয়েট (পুরো ডিটেইল আঁকার দরকার নেই—ঘোস্ট শুধু reference)।
  ctx.fillStyle=v.color;
  ctx.beginPath();
  ctx.moveTo(-61,-22);ctx.lineTo(-45,-51);ctx.lineTo(10,-57);ctx.lineTo(45,-42);ctx.lineTo(62,-7);ctx.lineTo(50,10);ctx.lineTo(-51,12);ctx.lineTo(-64,-4);ctx.closePath();
  ctx.fill();
  // একই monster wheel helper পুনর্ব্যবহার করা হচ্ছে।
  drawMonsterWheel(-39,32,27,truck.wheelSpin);
  drawMonsterWheel(43,28,30,truck.wheelSpin);
  ctx.restore();
}

// ---------- STUNT & COMBO (চূড়ান্ত সংস্করণ—আগের awardAirBonus-কে combo যোগ করে replace করা হচ্ছে) ----------
// Combo টাইমার কমছে, সময় ফুরালে combo ভেঙে যাবে।
function updateCombo(dt){
  if(comboTimer>0){
    comboTimer-=dt;
    if(comboTimer<=0){comboTimer=0;comboCount=0;}
  }
}
// Truck মাটিতে (নিরাপদে) ল্যান্ড করার মুহূর্তে air-time/flip হিসাব করে কয়েন বোনাস দেওয়া হচ্ছে।
function awardAirBonus(){
  ensureV30Save();
  // কতগুলো সম্পূর্ণ ঘূর্ণন (flip) হয়েছে বাতাসে।
  const flips=Math.floor(truck.airRotation/(Math.PI*2));
  let bonusCoins=0,label="",color="#ffd83a";
  if(flips>=1){
    // Ground rotation বা বারবার একই stunt গোনা এড়াতে: এই branch শুধু landing-এর মুহূর্তে একবারই চলে
    // (এই function-ই কল হয় শুধু onGround transition-এ, updatePhysics থেকে—তাই duplicate counting হয় না)।
    comboCount=(comboCount||0)+1;
    // পরের ৩.২ সেকেন্ডের মধ্যে আরেকটা স্টান্ট করলে combo বাড়বে, নাহলে ভেঙে যাবে।
    comboTimer=3.2;
    // Combo multiplier—সর্বোচ্চ x3 পর্যন্ত (অতিরিক্ত exploit আটকাতে limit)।
    const comboMul=1+Math.min(4,comboCount-1)*.5;
    bonusCoins=Math.round((flips*50+Math.floor(truck.airTime*12))*comboMul); // v16 ব্যালান্স: ১২০→৫০, ৩০→১২
    label=(flips>=2?("FLIP x"+flips):"FLIP!")+(comboCount>1?(" COMBO x"+comboCount):"")+" +"+bonusCoins;
    color="#ff6fae";
    // Lifetime ও দৈনিক স্টান্ট কাউন্টার (achievement/mission-এর জন্য)।
    save.lifetime.stuntsTotal=(save.lifetime.stuntsTotal||0)+1;
    save.daily.stuntsToday=(save.daily.stuntsToday||0)+1;
  }else if(truck.airTime>0.4){
    // শুধু বাতাসে ভেসে থাকা (flip ছাড়া) হলে ছোট bonus, combo বাড়বে না।
    bonusCoins=Math.floor(truck.airTime*18); // v16 ব্যালান্স: ৪৫→১৮
    label="AIR TIME +"+bonusCoins;
    color="#ffd83a";
  }
  if(bonusCoins>0){
    // বাগ ফিক্স: আগে এখানে শুধু save.coins বাড়ত কিন্তু global `coins` variable sync হতো না,
    // ফলে পরে কোনো coin pickup হলে (যেটা coins+=25;save.coins=coins; করে) সেই stunt bonus হারিয়ে যেতে পারত।
    // তাই এখন প্রথমে save.coins বাড়িয়ে তারপর global coins-কে সেটার সাথে sync করা হচ্ছে।
    save.coins=(save.coins||0)+bonusCoins;
    coins=save.coins;
    updateCoinsUI();
    coinSound();
    persist();
    spawnFloatText(truck.x,truck.y-95,label,color);
  }
  // Air-time/rotation রিসেট পরের জাম্পের জন্য।
  truck.airTime=0;truck.airRotation=0;
}

// ---------- MISSIONS / ACHIEVEMENTS UI ----------
// মিশন ক্লেইম করা হচ্ছে (target পূরণ হলে এবং আগে claim না হলে)।
function claimMission(id){
  ensureV30Save();
  const item=(save.missions.items||[]).find(m=>m.id===id);
  if(!item||item.claimed) return;
  const progress=save.daily[item.type+"Today"]||0;
  // টার্গেট পূরণ না হলে claim করা যাবে না (ডাবল-ক্লিক/রিফ্রেশ exploit আটকানো)।
  if(progress<item.target) return;
  item.claimed=true;
  coins+=item.reward;save.coins=coins;persist();
  purchaseSound();updateCoinsUI();renderMissions();
}
// Achievement-গুলো স্বয়ংক্রিয়ভাবে (claim বাটন ছাড়াই) একবার পূরণ হলেই পুরস্কার দেওয়া হচ্ছে।
function checkAchievements(){
  // Data এখনো তৈরি না হলে (খুব early call) কিছু করার দরকার নেই।
  if(!Array.isArray(ACHIEVEMENTS)) return;
  ensureV30Save();
  let any=false;
  ACHIEVEMENTS.forEach(a=>{
    // আগে claim হয়নি এবং শর্ত পূরণ হয়েছে—তবেই পুরস্কার।
    if(!save.achClaimed.includes(a.id)&&a.check(save)){
      save.achClaimed.push(a.id);
      coins+=a.reward;save.coins=coins;any=true;
      // শুধু খেলার মধ্যে থাকলে floating notification দেখানো হবে (মেনুতে থাকলে truck position অর্থহীন)।
      if(state==="play") spawnFloatText(truck.x,truck.y-130,"🏆 +"+a.reward,"#ffd34e");
    }
  });
  if(any){
    persist();
    // এখানে সরাসরি updateCoinsUI() কল না করে (সেটা নিজেই checkAchievements কল করে, infinite loop এড়াতে)
    // সরাসরি সব coin-display element আপডেট করা হচ্ছে।
    document.getElementById("menuCoins").textContent=coins;
    document.getElementById("coins").textContent=coins;
    document.getElementById("levelCoins").textContent=coins;
    document.getElementById("garageCoins").textContent=coins;
    document.getElementById("storeCoins").textContent=coins;
    const mc2=document.getElementById("mapCoins");if(mc2)mc2.textContent=coins;
    const msc2=document.getElementById("missionsCoins");if(msc2)msc2.textContent=coins;
    renderMissions();
  }
}
// মিশন ও অ্যাচিভমেন্ট স্ক্রিন রেন্ডার করা হচ্ছে।
function renderMissions(){
  ensureV30Save();
  const list=document.getElementById("missionsList");
  // স্ক্রিন এখনো DOM-এ না থাকলে (হবে না, তবুও safety) কিছু করার দরকার নেই।
  if(!list) return;
  const mc=document.getElementById("missionsCoins");if(mc) mc.textContent=coins;
  list.innerHTML="";
  (save.missions.items||[]).forEach(item=>{
    const progress=Math.min(item.target,save.daily[item.type+"Today"]||0);
    const pct=Math.round((progress/item.target)*100);
    const ready=progress>=item.target&&!item.claimed;
    const div=document.createElement("div");
    div.className="missionItem"+(item.claimed?" claimed":"");
    div.innerHTML=`<div class="missionInfo"><div class="missionDesc">${item.desc}</div><div class="missionProgressTrack"><div class="missionProgressFill" style="width:${pct}%"></div></div><div class="missionReward">${progress}/${item.target} • reward ${item.reward} 🪙</div></div><button type="button" class="claimBtn${ready?" ready":""}" ${(item.claimed||!ready)?"disabled":""}>${item.claimed?"✓ DONE":"CLAIM"}</button>`;
    if(ready){
      const btn=div.querySelector(".claimBtn");
      btn.onclick=()=>claimMission(item.id);
    }
    list.appendChild(div);
  });
  const achListEl=document.getElementById("achievementsList");
  if(achListEl&&Array.isArray(ACHIEVEMENTS)){
    achListEl.innerHTML="";
    ACHIEVEMENTS.forEach(a=>{
      const done=save.achClaimed.includes(a.id);
      const div=document.createElement("div");
      div.className="achItem"+(done?" done":"");
      div.innerHTML=`<div class="achIcon">${done?"🏆":"🔒"}</div><div class="achInfo"><div class="achDesc">${a.desc}</div><div class="missionReward">reward ${a.reward} 🪙${done?" • claimed":""}</div></div>`;
      achListEl.appendChild(div);
    });
  }
}

// ---------- PHYSICS/RESET/START/COMPLETE/RENDER — চূড়ান্ত সংস্করণ (সব নতুন সিস্টেম হুক করা) ----------

// Truck reset—আগের সব logic অপরিবর্তিত + নতুন সিস্টেমের run-only state reset।
function resetTruck(){
  truck.x=250;truck.vx=0;truck.vy=0;truck.angle=terrainSlope(truck.x);truck.angVel=0;truck.wheelSpin=0;truck.onGround=true;
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];truck.wheelR=27+Math.min(4,(v.suspension-1)*12);truck.wheelBase=92;truck.y=terrainY(truck.x)-truck.wheelR-31;camera.x=0;
  truck.rearSusp=0;truck.frontSusp=0;truck.rearSuspV=0;truck.frontSuspV=0;
  truck.airTime=0;truck.airRotation=0;truck.flipsThisAir=0;
  truck.lastGroundY=truck.y;
  truck.boostEnergy=100;
  // --- ধাপ ৩: আসল fuel ট্যাংক—প্রতি attempt-এ পূর্ণ (১০০) থেকে শুরু। ---
  truck.fuel=FUEL_CONFIG.cap;
  truck.fuelWarned=false;
  truck.fuelStallTime=0;
  // --- V30: combo/ghost-recording/impact-cooldown রিসেট। Vehicle condition এখানে রিসেট হয় না—
  // সেটা persistent থাকে, শুধু গ্যারেজে REPAIR করলেই ঠিক হবে (বাস্তবসম্মত)। ---
  comboCount=0;comboTimer=0;
  ghostRecording=[];ghostRecordTimer=0;
  impactCooldown=0;
}

// Level শুরু—weather বাছাই, ghost লোড, daily reset চেক।
function startLevel(id){
  currentLevel=Math.max(1,Math.min(TOTAL_LEVELS,id));
  // রিফ্রেশের পরেও এই level মনে থাকবে।
  save.lastLevel=Math.min(currentLevel,save.unlocked);persist();
  // মাঝ-সেশনে মধ্যরাত পার হলেও মিশন ঠিকভাবে রিসেট হবে।
  checkDailyReset();
  const coinKey=currentLevel+"_m"+(save.selectedMap||0);
  if(save.collected[coinKey]) delete save.collected[coinKey];
  state="play";
  // এই level+map-এর জন্য deterministic আবহাওয়া বাছাই (একই level/map সবসময় একই আবহাওয়া)।
  currentWeather=weatherForLevel();
  // আগের level-এর আবহাওয়া কণা মুছে ফেলা হচ্ছে।
  weatherParticles=[];
  // আগের best-run ঘোস্ট (থাকলে) লোড করা হচ্ছে।
  loadGhostForLevel();
  resetTruck();generateCoins();generateFuelCans();generateBoostCans();levelStart=performance.now();elapsed=0;hideScreens();
  document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");
  resumeAudio();setAudioSuppressed(false);engineStart();updateHUD();updateWeatherBadge();updateDamageBarUI();
}

// ---------- ধাপ ৩: ENDLESS / DISTANCE MODE ----------
// Level mode থেকে আলাদা: কোনো fixed finish/সময়ের র‍্যাংকিং নেই, শুধু কতদূর যাওয়া গেল তাই গণনা হয়—
// local personal best (প্রতি ম্যাপে আলাদা) save.endlessBest-এ থাকে।
function startEndless(){
  endlessMode=true;
  currentLevel=ENDLESS_LEVEL_SEED; // শুধু terrain/difficulty বাছাইয়ের জন্য একটা fixed, deterministic মান
  checkDailyReset();
  const coinKey=currentLevel+"_m"+(save.selectedMap||0);
  if(save.collected[coinKey]) delete save.collected[coinKey];
  state="play";
  currentWeather=weatherForLevel();
  weatherParticles=[];
  ghostRecording=[];
  resetTruck();generateCoins();generateFuelCans();generateBoostCans();levelStart=performance.now();elapsed=0;hideScreens();
  document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");
  resumeAudio();setAudioSuppressed(false);engineStart();updateHUD();updateWeatherBadge();updateDamageBarUI();
}
// Endless রান শেষ—ক্র্যাশে, ফুয়েল ফুরিয়ে থেমে গেলে, বা (বিরল) পুরো রুট শেষ করলে কল হয়।
function endEndlessRun(reason){
  if(state!=="play") return;
  state="complete";engineStop();
  // ১০px = ১ মিটার ধরা হয়েছে (শুধু UI-তে দেখানোর একক)।
  const distanceM=Math.max(0,Math.round((truck.x-250)/10));
  const mapKey=String(save.selectedMap||0);
  const prevBest=Number(save.endlessBest[mapKey])||0;
  const isNewBest=distanceM>prevBest;
  if(isNewBest) save.endlessBest[mapKey]=distanceM;
  persist();
  checkAchievements();
  const reasonEl=document.getElementById("endlessReason");if(reasonEl)reasonEl.textContent=reason;
  document.getElementById("endlessDistance").textContent=distanceM+" মিটার";
  document.getElementById("endlessBestText").textContent=(isNewBest?"🏆 নতুন সেরা রেকর্ড!":"সেরা: "+Math.max(distanceM,prevBest)+" মিটার");
  purchaseSound();showScreen("endlessMenu");
  endlessMode=false;
}

// Level complete—আগের reward logic অপরিবর্তিত + ghost save + daily mission counter + achievement check।
function completeLevel(){
  if(state!=="play") return;
  state="complete";engineStop();elapsed=(performance.now()-levelStart)/1000;
  const old=save.best[currentLevel];if(!old||elapsed<old) save.best[currentLevel]=elapsed;
  save.completed[currentLevel]=true;if(currentLevel<TOTAL_LEVELS) save.unlocked=Math.max(save.unlocked,currentLevel+1);
  // শেষ করার পর রিফ্রেশ দিলে পরের level থেকে চালু হবে।
  save.lastLevel=Math.min(currentLevel+1,save.unlocked,TOTAL_LEVELS);
  const reward=75+Math.floor(currentLevel*3)+(save.selectedMap||0)*10;coins+=reward;save.coins=coins;
  // --- V30: দৈনিক মিশন কাউন্টার + ghost best-run save + achievement check ---
  ensureV30Save();
  save.daily.levelsToday=(save.daily.levelsToday||0)+1;
  saveGhostIfBest();
  persist();
  checkAchievements();
  document.getElementById("resultTime").textContent=formatTime(elapsed);document.getElementById("rewardText").textContent=`+${reward} coins`;document.getElementById("resultStars").textContent=elapsed<42?"★★★":elapsed<70?"★★☆":"★☆☆";
  purchaseSound();showScreen("completeMenu");
}

// ক্র্যাশ—combo ভাঙা + impact damage যোগ করা হয়েছে, বাকি আগের মতোই।
function crash(reason){
  if(state!=="play") return;
  crashSound();
  // ক্র্যাশ হলে combo স্বাভাবিকভাবেই ভেঙে যাবে।
  comboCount=0;comboTimer=0;
  // ক্র্যাশের ধরন অনুযায়ী আলাদা পরিমাণ damage (গ্যাপে পড়া/পাহাড় থেকে পড়া/রোলওভার)।
  const dmg=reason&&reason.indexOf("gap")>=0?20:reason&&reason.indexOf("mountain")>=0?24:14;
  applyImpactDamage(dmg,true);
  if(endlessMode){
    engineStop();
    endEndlessRun(reason);
    return;
  }
  state="crash";
  engineStop();
  document.getElementById("crashText").textContent=reason;
  showScreen("crashMenu");
}

// মূল physics loop—বায়োম/আবহাওয়া/condition grip, ghost রেকর্ডিং, combo, distance ট্র্যাকিং সব হুক করা হয়েছে।
function updatePhysics(dt){
  // ভাসমান bonus টেক্সট সবসময় update হবে (pause/menu থাকলেও সমস্যা নেই, নিজে থেকেই life শেষ হলে বন্ধ হয়ে যায়)।
  updateFloatTexts(dt);
  // খেলা চলছে না হলে বাকি কিছু করার দরকার নেই।
  if(state!=="play") return;
  updateEngine();
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0],up=currentUpgrades();
  // বর্তমান ম্যাপ (biome)।
  const m=maps[save.selectedMap]||maps[0];
  // Vehicle condition (damage) অনুযায়ী performance factor—পুরো ভাঙা truck ধীরে চলবে/কম grip পাবে।
  const conditionFactor=.65+.35*(getCondition(save.selectedVehicle)/100);
  const enginePower=(1+(up.engine-1)*.10)*conditionFactor;
  // Grip: vehicle base × tire upgrade × biome grip × আবহাওয়া grip × condition।
  const grip=v.grip*(1+(up.tires-1)*.055)*themeGripMul(m.theme)*weatherGripMul()*conditionFactor;
  const suspension=v.suspension*(1+(up.suspension-1)*.07),boost=v.boost*(1+(up.boost-1)*.08),maxSpeed=430+v.speed*260+up.engine*18;

  // --- BOOST/NITRO ---
  const isBoosting=keys.boost&&truck.boostEnergy>0;
  if(isBoosting){truck.boostEnergy=Math.max(0,truck.boostEnergy-46*dt);}else{truck.boostEnergy=Math.min(100,truck.boostEnergy+13*dt);}
  const boostMul=isBoosting?1.65:1,boostSpeedMul=isBoosting?1.32:1;
  if(isBoosting&&!truck.wasBoosting){tone(180,.18,.14,"sawtooth");setTimeout(()=>tone(340,.14,.10,"sawtooth"),70);}
  truck.wasBoosting=isBoosting;

  // --- ধাপ ৩: FUEL—আসল ট্যাংক, চালানোর ধরন অনুযায়ী খরচ, শেষ হলে হঠাৎ না থেমে ধীরে ধীরে দুর্বল হওয়া ---
  if(truck.fuel===undefined) truck.fuel=FUEL_CONFIG.cap;
  const fuelDrainRate=keys.gas?FUEL_CONFIG.drainGas:(keys.right?FUEL_CONFIG.drainDrive:FUEL_CONFIG.drainIdle);
  truck.fuel=Math.max(0,truck.fuel-fuelDrainRate*dt);
  if(truck.fuel<FUEL_CONFIG.lowThreshold&&!truck.fuelWarned){
    truck.fuelWarned=true;
    spawnFloatText(truck.x,truck.y-95,"⛽ FUEL কম!","#ff6a3a");
  }
  // শূন্য থেকে lowThreshold পর্যন্ত engine power/top speed সরলরেখায় কমে; তারপর স্বাভাবিক। হঠাৎ বন্ধ বা টেলিপোর্ট হয় না।
  const fuelPower=truck.fuel<=0?FUEL_CONFIG.minPowerAtEmpty:(truck.fuel<FUEL_CONFIG.lowThreshold?(FUEL_CONFIG.minPowerAtEmpty+(1-FUEL_CONFIG.minPowerAtEmpty)*(truck.fuel/FUEL_CONFIG.lowThreshold)):1);

  // --- GAS/DRIVE/REVERSE/BRAKE ---
  if(keys.right||keys.gas) truck.vx+=(keys.gas?900:690)*enginePower*fuelPower*v.speed*boost*boostMul*dt;
  if(keys.left) truck.vx-=520*enginePower*dt;
  if(keys.brake) truck.vx*=Math.pow(.035,dt);
  truck.vx*=Math.pow(.92,dt);
  truck.vx=Math.max(-260,Math.min(maxSpeed*boostSpeedMul*fuelPower,truck.vx));

  // --- GRAVITY ---
  truck.vy+=1850/Math.max(.7,suspension)*dt;

  // --- আবহাওয়ার সাইড-ফোর্স: বাতাসে/বালির ঝড়ে airborne অবস্থায় হালকা পিছনে ধাক্কা (challenge) ---
  if(!truck.onGround) truck.vx+=weatherSideForce()*dt;

  // --- অবস্থান আপডেট ---
  const prevX=truck.x;
  truck.x+=truck.vx*dt;
  if(truck.x<220){truck.x=220;truck.vx=0;}
  truck.y+=truck.vy*dt;
  truck.wheelSpin+=truck.vx*dt/truck.wheelR;

  // --- দূরত্ব ট্র্যাকিং (Missions/Achievements)—শুধু সামনের movement গণনা হবে ---
  const movedForward=Math.max(0,truck.x-prevX);
  if(movedForward>0){
    save.daily.distanceToday=(save.daily.distanceToday||0)+movedForward;
    save.lifetime.distanceTotal=(save.lifetime.distanceTotal||0)+movedForward;
  }

  // --- Boost flame particle ---
  if(isBoosting&&Math.random()<dt*55) boostFlame(truck.x-Math.cos(truck.angle)*48,truck.y+Math.sin(truck.angle)*48+8);

  const wasOnGround=truck.onGround;
  const rearX=truck.x-truck.wheelBase/2,frontX=truck.x+truck.wheelBase/2,rearGround=isGap(rearX)?Infinity:terrainY(rearX),frontGround=isGap(frontX)?Infinity:terrainY(frontX),rearContact=rearGround-truck.wheelR,frontContact=frontGround-truck.wheelR;

  if(Number.isFinite(rearContact)&&Number.isFinite(frontContact)){
    const targetY=(rearContact+frontContact)/2-25,targetAngle=Math.atan2(frontContact-rearContact,truck.wheelBase);
    // আগের session-এ ফিক্স করা "গ্যাপে পড়েও মরে না" বাগের গার্ড—fall অনেক গভীর হলে snap করানো হবে না।
    // V30 বাগ-ফিক্স: বট দিয়ে সব ম্যাপ/লেভেল টেস্ট করার সময় ধরা পড়েছে—যদি truck কোনো বড় পাহাড়ের চূড়া থেকে
    // (কোনো gap-এর সাথে সম্পর্কহীনভাবে) অনেকক্ষণ ধরে পড়তে থাকে এবং পড়তে পড়তে ঠিক একটা gap-এর ঠিক পরেই
    // সম্পূর্ণ শক্ত (solid) জমিতে এসে পড়ে, তাহলে fallGap (পতনের গভীরতা) ২৩০-এর বেশি হয়ে যেত এবং এই গার্ড
    // ভুলভাবে catch আটকে দিত—ফলে truck সম্পূর্ণ শক্ত রাস্তার উপর দিয়েও ভুতুড়েভাবে পড়তে থাকত এবং শেষে
    // "You fell off the mountain!" বলে অন্যায়ভাবে crash হতো, যদিও আসল কোনো gap-এর সাথে এর সম্পর্কই ছিল না।
    // তাই এখন fallGap-ভিত্তিক এই নিষেধাজ্ঞা শুধু তখনই কাজ করবে যখন truck-এর বর্তমান চাকার আশেপাশে
    // সত্যিই কোনো gap আছে (spanHasGap দিয়ে চেক করা)—তাহলেই এটা "গ্যাপ থেকে auto-climb" exploit ধরবে,
    // আর সাধারণ গভীর (কিন্তু gap-সম্পর্কহীন) পতনে truck স্বাভাবিকভাবেই ঠিকমতো land করবে।
    const fallGap=truck.y-targetY;
    // মার্জিন ছোট রাখা হয়েছে (শুধু gap-এর ঠিক কিনারা পর্যন্ত + সামান্য বাফার)—বড় মার্জিন দিলে truck
    // gap পার হয়ে অনেকদূর সত্যিকারের শক্ত জমিতে চলে যাওয়ার পরেও ভুলভাবে catch আটকে দিচ্ছিল (উপরের নোট দ্রষ্টব্য)।
    const nearGapExploit=fallGap>=230&&spanHasGap(rearX-15,frontX+15);
    if(truck.y>=targetY&&truck.vy>=-150&&!nearGapExploit){
      if(!truck.onGround&&truck.vy>220){dust(truck.x,targetY+30,16);landSound();}
      // হার্ড ল্যান্ডিং (খুব জোরে পড়া) হলে vehicle condition কিছুটা কমবে (Damage & Repair ফিচার)।
      if(!truck.onGround&&truck.vy>480) applyImpactDamage(Math.min(14,(truck.vy-480)/60));
      truck.y=targetY;truck.vy*=-.08;truck.onGround=true;truck.lastGroundY=targetY;
      const diff=Math.atan2(Math.sin(targetAngle-truck.angle),Math.cos(targetAngle-truck.angle));
      truck.angVel+=diff*24*dt*grip;truck.angle+=truck.angVel*dt;truck.angVel*=Math.pow(.015,dt);
      if(Math.abs(truck.vx)>110&&Math.random()<dt*13) dust(rearX,rearContact+20,1);
    }else{
      if(truck.onGround&&truck.vy>200) jumpSound();truck.onGround=false;
      if(keys.left) truck.angVel-=7.5*dt*grip;if(keys.right) truck.angVel+=7.5*dt*grip;
      truck.angVel*=Math.pow(.89,dt);truck.angle+=truck.angVel*dt;
    }
  }else{
    truck.onGround=false;
    if(keys.left) truck.angVel-=7.5*dt*grip;if(keys.right) truck.angVel+=7.5*dt*grip;
    truck.angVel*=Math.pow(.90,dt);truck.angle+=truck.angVel*dt;
  }

  // --- স্বাধীন চাকা suspension (অপরিবর্তিত) ---
  {
    const ca=Math.cos(truck.angle),sa=Math.sin(truck.angle);
    const rearRigidY=truck.y+(-39*sa+32*ca),frontRigidY=truck.y+(43*sa+28*ca);
    const rearRaw=Number.isFinite(rearContact)?(rearContact-rearRigidY):22,frontRaw=Number.isFinite(frontContact)?(frontContact-frontRigidY):22;
    const rearTarget=Math.max(-14,Math.min(22,rearRaw)),frontTarget=Math.max(-14,Math.min(22,frontRaw));
    const susK=95,susD=13;
    truck.rearSuspV+=((rearTarget-truck.rearSusp)*susK-truck.rearSuspV*susD)*dt;truck.rearSusp+=truck.rearSuspV*dt;
    truck.frontSuspV+=((frontTarget-truck.frontSusp)*susK-truck.frontSuspV*susD)*dt;truck.frontSusp+=truck.frontSuspV*dt;
    truck.rearSusp=Math.max(-14,Math.min(22,truck.rearSusp));truck.frontSusp=Math.max(-14,Math.min(22,truck.frontSusp));
  }

  // --- Air Time / Flip / Combo ---
  if(!truck.onGround){truck.airTime+=dt;truck.airRotation+=Math.abs(truck.angVel*dt);}
  if(truck.onGround&&!wasOnGround) awardAirBonus();
  updateCombo(dt);

  // --- exhaust ---
  if(keys.gas&&Math.random()<dt*22) exhaustPuff(truck.x-Math.cos(truck.angle)*45,truck.y+Math.sin(truck.angle)*45+8);

  // --- নতুন সিস্টেম আপডেট: আবহাওয়া কণা, damage cooldown, ghost রেকর্ডিং ---
  updateWeather(dt);
  updateDamage(dt);
  recordGhostSample(dt);

  collectCoins();collectFuel();collectBoost();updateCamera(dt);updateParticles(dt);
  // ধাপ ৩: ফুয়েল ফুরিয়ে গিয়ে truck প্রায় থেমে গেলে (স্থল-এ, কিছুক্ষণ ধরে) রান শেষ হবে—অনির্দিষ্টকাল আটকে থাকবে না।
  if(truck.fuel<=0&&truck.onGround&&Math.abs(truck.vx)<12){truck.fuelStallTime=(truck.fuelStallTime||0)+dt;}else{truck.fuelStallTime=0;}
  if(endlessMode&&truck.fuelStallTime>2.5){endEndlessRun("ফুয়েল ফুরিয়ে গাড়ি থেমে গেছে");return;}
  if(checkCrash()) return;
  if(endlessMode){
    // Endless mode-এ ফিক্সড finish নেই (দূরত্বই লক্ষ্য); রুটের একদম শেষ (বিরল) হলে একটা সফল সমাপ্তি হিসেবে গণ্য হবে।
    if(truck.x>=finishX()) endEndlessRun("পুরো রুট শেষ করেছ! 🎉");
    return;
  }
  if(truck.x>=finishX()) completeLevel();
}

// পর্দায় আঁকার ক্রম—ghost truck-এর পরে আসল truck, তারপর আবহাওয়া/রাত-দৃশ্যমানতা overlay।
function render(){
  drawSky();drawTerrain();drawBridges();drawFinish();drawCoins();drawFuelCans();drawBoostCans();drawCheckpointFlags();drawParticles();
  drawGhost();
  drawTruck();
  drawWeather();
  drawNightOverlay();
  drawFloatTexts();drawGaugeCluster();
  if(state==="play"){
    elapsed=(performance.now()-levelStart)/1000;
    document.getElementById("timer").textContent=formatTime(elapsed);
    updateHUD();updateWeatherBadge();updateDamageBarUI();
  }
}

// Coin UI আপডেট + achievement check (এখানে হুক করা হয়েছে কারণ এই function প্রায় প্রতিটা coin-change event-এ কল হয়)।
function updateCoinsUI(){
  document.getElementById("menuCoins").textContent=coins;
  document.getElementById("coins").textContent=coins;
  document.getElementById("levelCoins").textContent=coins;
  document.getElementById("garageCoins").textContent=coins;
  document.getElementById("storeCoins").textContent=coins;
  const mc=document.getElementById("mapCoins");if(mc) mc.textContent=coins;
  const msc=document.getElementById("missionsCoins");if(msc) msc.textContent=coins;
  checkAchievements();
}

// সব স্ক্রিন hide—এখন "missionsMenu"-ও তালিকায় যোগ করা হয়েছে।
function hideScreens(){
  ["mainMenu","levelMenu","mapsMenu","garageMenu","storeMenu","missionsMenu","pauseMenu","crashMenu","completeMenu","settingsMenu","endlessMenu"].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.classList.add("hidden");el.style.display="none";el.style.visibility="hidden";el.style.pointerEvents="none";}
  });
}
// নির্দিষ্ট স্ক্রিন দেখানো—"missionsMenu"-ও menu-screen তালিকায় যোগ (HUD/controls hide হবে)।
function showScreen(id){
  hideScreens();
  const el=document.getElementById(id);
  if(el){el.classList.remove("hidden");el.style.display="";el.style.visibility="visible";el.style.pointerEvents="auto";}
  const menuScreens=["mainMenu","levelMenu","mapsMenu","garageMenu","storeMenu","missionsMenu"];
  const hud=document.getElementById("hud"),controls=document.getElementById("controls");
  if(menuScreens.includes(id)){hud.classList.add("hidden");controls.classList.add("hidden");}
  else if(["pauseMenu","crashMenu","completeMenu","endlessMenu"].includes(id)){hud.classList.remove("hidden");controls.classList.remove("hidden");}
}

// গ্যারেজ—আগের সব logic অপরিবর্তিত + condition bar/REPAIR বাটন যোগ করা হয়েছে।
function renderGarage(){
  document.getElementById("garageCoins").textContent=coins;
  const selected=Math.max(0,Math.min(vehiclesV22.length-1,Number(save.selectedVehicle)||0));
  save.selectedVehicle=selected;
  const v=vehiclesV22[selected];
  const preview=document.getElementById("garageVehicle");
  preview.innerHTML=miniTruckMarkup(v);
  document.getElementById("garageVehicleName").textContent=v.name;
  document.getElementById("garageVehicleDesc").textContent=v.desc;
  document.getElementById("selectVehicleBtn").textContent="✓ SELECTED";

  let stats=document.getElementById("garageStats");
  if(!stats){stats=document.createElement("div");stats.id="garageStats";stats.className="vehicleStats";preview.parentElement.insertBefore(stats,document.getElementById("selectVehicleBtn"));}
  const up=currentUpgrades();
  const stat=(label,val)=>`<div class="statBar">${label}<i style="--stat:${Math.min(100,val*72)}%"></i></div>`;
  stats.innerHTML=stat("SPEED",v.speed+up.engine*.018)+stat("GRIP",v.grip+up.tires*.012)+stat("POWER",v.boost+up.boost*.015);

  // --- V30: Vehicle condition bar + REPAIR বাটন (Damage & Repair ফিচার) ---
  let cond=document.getElementById("garageCondition");
  if(!cond){cond=document.createElement("div");cond.id="garageCondition";cond.className="garageCondition";stats.insertAdjacentElement("afterend",cond);}
  const conditionVal=getCondition(selected);
  const condClass=conditionVal<35?"crit":conditionVal<70?"warn":"";
  const repairCost=Math.round((100-conditionVal)*3);
  cond.innerHTML=`<div class="condLabel"><span>🔧 CONDITION</span><span>${Math.round(conditionVal)}%</span></div><div class="condTrack"><div class="condFill ${condClass}" style="width:${conditionVal}%"></div></div><button type="button" class="repairBtn" ${conditionVal>=100?"disabled":""}>${conditionVal>=100?"FULL CONDITION":`🔧 REPAIR — ${repairCost} 🪙`}</button>`;
  const repairBtn=cond.querySelector(".repairBtn");
  if(repairBtn&&conditionVal<100){
    repairBtn.onclick=()=>{
      resumeAudio();
      // ব্যালেন্স যথেষ্ট না থাকলে—negative coin আটকানো ও toast দেখানো।
      if(coins<repairCost){notEnoughCoins();return;}
      coins-=repairCost;save.coins=coins;setCondition(selected,100);persist();purchaseSound();updateCoinsUI();renderGarage();
    };
  }

  const list=document.getElementById("vehicleList");list.innerHTML="";
  vehiclesV22.forEach((vehicle,id)=>{
    const owned=save.ownedVehicles.includes(id),selectedNow=selected===id;
    const card=document.createElement("div");card.className="vehicleCard"+(selectedNow?" selected":"");
    card.innerHTML=`<div class="vehicleEmoji">${miniTruckMarkup(vehicle,"vehicleMini")}</div><h3>${vehicle.name}</h3><p>⚡ ${Math.round(vehicle.speed*100)}% · 🛞 ${Math.round(vehicle.grip*100)}% · 🚀 ${Math.round(vehicle.boost*100)}%</p><button type="button">${selectedNow?"SELECTED":owned?"SELECT":`BUY ${vehicle.price} 🪙`}</button>`;
    card.querySelector("button").onclick=e=>{
      e.stopPropagation();resumeAudio();
      if(selectedNow){tone(520,.05,.04);return;}
      if(owned){save.selectedVehicle=id;persist();selectSound();renderGarage();return;}
      if(coins<vehicle.price){notEnoughCoins();return;}
      coins-=vehicle.price;save.coins=coins;save.ownedVehicles.push(id);save.selectedVehicle=id;persist();purchaseSound();updateCoinsUI();renderGarage();
    };
    list.appendChild(card);
  });
  renderUpgrades();
}

// ---------- মাউস-ফার্স্ট কন্ট্রোল প্যানেল: PAUSE/RESTART/MUTE বাটন ওয়্যারিং ----------
// এই তিনটা বাটনে ইচ্ছাকৃতভাবে ".driveControl" class দেওয়া হয়নি (index.html দেখুন), কারণ সেই class-এর
// সব element-এ আগে থেকেই keys[...]=true/false সেট করার pointerdown/up লজিক বাঁধা আছে (gas/brake/drive-এর জন্য)—
// সেটা এই action-বাটনগুলোর সাথে মিশে গেলে click আচরণ অনির্দিষ্ট হয়ে যেত। তাই এগুলো শুধু সাধারণ click বাটন।
(function wireV30ControlButtons(){
  const missionsBtnEl=document.getElementById("missionsBtn");
  if(missionsBtnEl) missionsBtnEl.onclick=()=>{resumeAudio();tone(500,.06,.05);checkDailyReset();renderMissions();showScreen("missionsMenu");};
  const backMissionsBtnEl=document.getElementById("backMissionsBtn");
  if(backMissionsBtnEl) backMissionsBtnEl.onclick=()=>{tone(330,.06,.05);goMain();};

  const ctlPauseEl=document.getElementById("ctlPause");
  if(ctlPauseEl) ctlPauseEl.onclick=e=>{if(e)e.preventDefault();resumeAudio();if(state==="play"||state==="pause")togglePause();};

  const ctlRestartEl=document.getElementById("ctlRestart");
  if(ctlRestartEl) ctlRestartEl.onclick=e=>{if(e)e.preventDefault();resumeAudio();if(state==="play"||state==="pause")startLevel(currentLevel);};

  const ctlMuteEl=document.getElementById("ctlMute");
  if(ctlMuteEl){
    const syncMuteIcon=()=>{ctlMuteEl.textContent=userMuted?"🔇":"🔊";ctlMuteEl.classList.toggle("muted",userMuted);};
    ctlMuteEl.onclick=e=>{
      if(e)e.preventDefault();
      userMuted=!userMuted;
      localStorage.setItem("hillRushMuted",userMuted?"1":"0");
      applyAudioVolume();
      syncMuteIcon();
      // Settings প্যানেলের mute checkbox-এর সাথেও sync রাখা হচ্ছে।
      const muteToggleEl=document.getElementById("muteToggle");
      if(muteToggleEl) muteToggleEl.checked=userMuted;
    };
    // শুরুতেই আইকন সঠিকভাবে দেখানো হচ্ছে।
    syncMuteIcon();
  }
})();

// ---------- INPUT SAFETY (অতিরিক্ত গার্ড) ----------
// Tab/app switch বা window blur হলে boost key-ও (আগের ভার্সনে বাদ ছিল) রিলিজ হবে, এবং pressed CSS class-ও মুছে যাবে।
addEventListener("blur",()=>{
  keys.left=keys.right=keys.gas=keys.brake=keys.boost=false;
  document.querySelectorAll(".pressed").forEach(b=>b.classList.remove("pressed"));
});
// ট্যাব hidden হলে এখন শুধু key release না, গেম নিজে থেকেই pause হয়ে যাবে (simulation+timer সত্যিকারে থেমে যায়)।
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){
    keys.left=keys.right=keys.gas=keys.brake=keys.boost=false;
    document.querySelectorAll(".pressed").forEach(b=>b.classList.remove("pressed"));
    if(state==="play") togglePause();
  }
});

// ---------- STARTUP (রিফ্রেশ) ----------
// নতুন HUD/Garage/Missions উপাদানগুলো প্রথমবারেই সঠিক ডেটা দেখানোর জন্য একবার রেন্ডার করা হচ্ছে।
updateCoinsUI();
updateWeatherBadge();
updateDamageBarUI();
renderMissions();
// ============================================================


// =====================================================================
// V15 — বাংলাদেশি যানবাহন, বাংলাদেশি ম্যাপ, checkpoint, customization, records
// (সব নতুন কোড ফাইলের শেষে; আগের ফাংশন "wrap" করা হয়েছে যাতে পুরনো লজিক অক্ষত থাকে)
// =====================================================================

// ---------- ছোট helper (canvas context প্যারামিটার হিসেবে নেয়, তাই গ্যারেজের preview-তেও কাজ করে) ----------
function v15Rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function v15Grad(c,y0,y1,top,bot){const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,top);g.addColorStop(1,bot);return g;}
function v15Wheel(c,x,y,r,spin,rim){
  c.save();c.translate(x,y);
  c.fillStyle="#0c1014";c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
  c.strokeStyle="#2b353d";c.lineWidth=3;c.beginPath();c.arc(0,0,r-3,0,Math.PI*2);c.stroke();
  c.rotate(spin||0);
  c.fillStyle=rim;c.beginPath();c.arc(0,0,r*.55,0,Math.PI*2);c.fill();
  c.strokeStyle="rgba(0,0,0,.45)";c.lineWidth=2.5;
  for(let i=0;i<6;i++){c.rotate(Math.PI/3);c.beginPath();c.moveTo(0,0);c.lineTo(r*.52,0);c.stroke();}
  c.fillStyle="#d8dde2";c.beginPath();c.arc(0,0,r*.14,0,Math.PI*2);c.fill();
  c.restore();
}
function v15Arch(c,x,y,r){c.save();c.beginPath();c.rect(x-r-2,-44,2*r+4,56);c.clip();c.fillStyle="#0c1014";c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();}
function v15Plate(c,text,x,y){
  c.save();c.fillStyle="#fffdf2";c.strokeStyle="#1d1d1d";c.lineWidth=1.5;v15Rr(c,x,y,40,14,3);c.fill();c.stroke();
  c.fillStyle="#0a7a3a";c.fillRect(x+2,y+2,36,2);
  c.fillStyle="#111";c.font="bold 8px monospace";c.textAlign="center";c.textBaseline="middle";c.fillText(text,x+20,y+9);c.restore();
}
function v15Flag(c,x,y){c.save();c.strokeStyle="#4a3a2a";c.lineWidth=2;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-26);c.stroke();c.fillStyle="#006a4e";c.fillRect(x,y-26,20,12);c.fillStyle="#f42a41";c.beginPath();c.arc(x+9,y-20,3.6,0,Math.PI*2);c.fill();c.restore();}

// ---------- ১) CNG অটো-রিকশা ----------
function v15CNG(c,v,o){
  const body=v.color,dark=shadeColor(body,-.45),light=shadeColor(body,.35);
  c.lineJoin="round";
  c.fillStyle="#141b22";v15Rr(c,-64,4,128,12,5);c.fill();
  // ভেতরের খোলা অংশ (ছায়া) ও সিট
  c.fillStyle="#0e1f16";c.beginPath();c.moveTo(-58,-28);c.lineTo(-60,-60);c.lineTo(46,-60);c.lineTo(52,-28);c.closePath();c.fill();
  c.fillStyle="#8a3a30";v15Rr(c,-50,-40,52,12,3);c.fill();c.fillRect(-52,-58,7,30);
  c.fillStyle="#e0b08a";c.beginPath();c.arc(22,-47,7,0,Math.PI*2);c.fill();
  c.fillStyle="#2d4a8a";v15Rr(c,15,-41,15,15,4);c.fill();
  c.strokeStyle="#222";c.lineWidth=3;c.beginPath();c.moveTo(34,-42);c.lineTo(31,-33);c.stroke();
  // নিচের বডি
  c.fillStyle=v15Grad(c,-28,12,light,body);c.strokeStyle=dark;c.lineWidth=3;
  c.beginPath();c.moveTo(-66,-12);c.lineTo(-61,-28);c.lineTo(38,-28);c.lineTo(62,-14);c.lineTo(69,-2);c.lineTo(62,10);c.lineTo(-62,10);c.lineTo(-68,-2);c.closePath();c.fill();c.stroke();
  c.fillStyle=v.accent;c.fillRect(-64,-14,126,3);
  // সামনের কাচ
  c.fillStyle="rgba(190,235,250,.78)";c.beginPath();c.moveTo(36,-58);c.lineTo(48,-60);c.lineTo(61,-30);c.lineTo(44,-29);c.closePath();c.fill();c.strokeStyle=dark;c.lineWidth=2;c.stroke();
  // ছাদ (hood)
  c.fillStyle=v15Grad(c,-84,-52,light,body);c.strokeStyle=dark;c.lineWidth=3;
  c.beginPath();c.moveTo(-64,-52);c.quadraticCurveTo(-64,-82,-36,-82);c.lineTo(24,-82);c.quadraticCurveTo(48,-82,56,-58);c.lineTo(58,-52);c.closePath();c.fill();c.stroke();
  // থাম
  c.strokeStyle=body;c.lineWidth=6;c.lineCap="round";c.beginPath();c.moveTo(-58,-52);c.lineTo(-57,-28);c.moveTo(38,-52);c.lineTo(46,-28);c.stroke();
  // লেখা, হেডলাইট, প্লেট
  c.fillStyle="#111";c.font="bold 13px sans-serif";c.textAlign="left";c.textBaseline="alphabetic";c.fillText("CNG",-50,2);
  c.fillStyle="#fff7b0";c.shadowColor="#ffe66b";c.shadowBlur=8;c.beginPath();c.arc(65,-8,4.5,0,Math.PI*2);c.fill();c.shadowBlur=0;
  c.fillStyle="#d22";c.fillRect(-69,-10,4,7);
  v15Plate(c,o.plate,2,-12);
  v15Arch(c,-39,32+o.rs,33);v15Arch(c,43,28+o.fs,36);
  v15Wheel(c,-39,32+o.rs,27,o.spin,"#f2f2f2");v15Wheel(c,43,28+o.fs,30,o.spin,"#f2f2f2");
}

// ---------- ২) রিকশা (প্যাডেল) ----------
function v15Rickshaw(c,v,o){
  const body=v.color,acc=v.accent,dark=shadeColor(body,-.45);
  c.lineJoin="round";c.lineCap="round";
  // ফ্রেম
  c.strokeStyle="#1b232a";c.lineWidth=5;
  c.beginPath();c.moveTo(-39,32+o.rs);c.lineTo(-18,-4);c.lineTo(30,-4);c.lineTo(43,28+o.fs);c.stroke();
  c.beginPath();c.moveTo(-18,-4);c.lineTo(8,20);c.lineTo(30,-4);c.stroke();
  c.beginPath();c.moveTo(43,28+o.fs);c.lineTo(37,-30);c.lineTo(50,-35);c.stroke();
  // মাডগার্ড
  c.strokeStyle=acc;c.lineWidth=4;c.beginPath();c.arc(-39,32+o.rs,32,Math.PI*1.08,Math.PI*1.92);c.stroke();c.beginPath();c.arc(43,28+o.fs,35,Math.PI*1.1,Math.PI*1.9);c.stroke();
  // যাত্রী সিট
  c.fillStyle="#a8232b";v15Rr(c,-62,-14,48,10,3);c.fill();c.fillStyle="#7e1a21";c.fillRect(-64,-44,9,32);
  // হুড (ডোম) + ডোরাকাটা সাজ
  c.save();c.beginPath();c.moveTo(-66,-12);c.bezierCurveTo(-76,-86,-16,-96,2,-46);c.lineTo(-4,-12);c.closePath();
  c.fillStyle=v15Grad(c,-86,-12,shadeColor(body,.3),body);c.fill();c.clip();
  c.strokeStyle=acc;c.lineWidth=5;for(let i=-4;i<9;i++){c.beginPath();c.moveTo(-72+i*10,-92);c.lineTo(-52+i*10,-8);c.stroke();}
  c.restore();
  c.strokeStyle=dark;c.lineWidth=3;c.beginPath();c.moveTo(-66,-12);c.bezierCurveTo(-76,-86,-16,-96,2,-46);c.lineTo(-4,-12);c.stroke();
  // পিছনের টিনের সাজ-ফলক
  c.fillStyle=acc;v15Rr(c,-70,-42,8,30,2);c.fill();c.fillStyle="#e8399a";[-38,-28,-18].forEach(y=>{c.beginPath();c.arc(-66,y,2.6,0,Math.PI*2);c.fill();});
  // চালক
  c.fillStyle="#2a2f38";c.beginPath();c.ellipse(20,-21,9,3.5,0,0,Math.PI*2);c.fill();
  c.strokeStyle="#2c3e8f";c.lineWidth=10;c.beginPath();c.moveTo(19,-24);c.lineTo(30,-52);c.stroke();
  c.fillStyle="#e0b08a";c.beginPath();c.arc(33,-61,7,0,Math.PI*2);c.fill();
  c.fillStyle="#e8e8e8";c.beginPath();c.arc(33,-65,7,Math.PI,0);c.fill();
  c.strokeStyle="#e0b08a";c.lineWidth=4;c.beginPath();c.moveTo(30,-48);c.lineTo(43,-35);c.stroke();
  c.strokeStyle="#6a4a2a";c.lineWidth=6;c.beginPath();c.moveTo(19,-22);c.lineTo(26,6);c.stroke();
  c.fillStyle="#222";c.beginPath();c.arc(24,14,3,0,Math.PI*2);c.fill();
  v15Flag(c,-26,-84);
  v15Plate(c,o.plate,-30,-2);
  v15Wheel(c,-39,32+o.rs,27,o.spin,"#cfd6dc");v15Wheel(c,43,28+o.fs,30,o.spin,"#cfd6dc");
}

// ---------- ৩) ইজি বাইক (ব্যাটারি অটো) ----------
function v15Ebike(c,v,o){
  const body=v.color,acc=v.accent,dark=shadeColor(body,-.5),light=shadeColor(body,.35);
  c.lineJoin="round";c.lineCap="round";
  c.fillStyle="#1a222a";v15Rr(c,-64,2,128,12,4);c.fill();
  c.fillStyle="#3b4752";v15Rr(c,-28,12,58,10,3);c.fill();
  c.strokeStyle="#ffd34e";c.lineWidth=2;c.beginPath();c.moveTo(2,13);c.lineTo(-3,18);c.lineTo(3,18);c.lineTo(-2,22);c.stroke();
  // সিট
  c.fillStyle="#8a3a3a";v15Rr(c,-56,-22,40,9,3);c.fill();c.fillRect(-58,-48,6,28);
  c.fillStyle="#e0b08a";c.beginPath();c.arc(22,-44,6.5,0,Math.PI*2);c.fill();
  c.fillStyle="#7a3b2e";v15Rr(c,16,-38,13,16,4);c.fill();
  // সামনের কাউল
  c.fillStyle=v15Grad(c,-32,8,light,body);c.strokeStyle=dark;c.lineWidth=3;
  c.beginPath();c.moveTo(34,-32);c.lineTo(52,-32);c.lineTo(67,-8);c.lineTo(63,8);c.lineTo(28,8);c.closePath();c.fill();c.stroke();
  c.fillStyle=acc;c.fillRect(30,-6,36,4);
  // পাশের খোলা রেলিং
  c.strokeStyle=body;c.lineWidth=4;c.beginPath();c.moveTo(-62,-8);c.lineTo(30,-8);c.stroke();
  // সামনের কাচ
  c.fillStyle="rgba(190,235,250,.78)";c.beginPath();c.moveTo(38,-70);c.lineTo(50,-68);c.lineTo(58,-32);c.lineTo(44,-32);c.closePath();c.fill();c.strokeStyle=dark;c.lineWidth=2;c.stroke();
  // থাম ও ছাদ
  c.strokeStyle="#2a3138";c.lineWidth=5;c.beginPath();c.moveTo(-58,-8);c.lineTo(-58,-70);c.moveTo(-14,-8);c.lineTo(-14,-70);c.moveTo(38,-32);c.lineTo(38,-70);c.stroke();
  c.fillStyle=acc;c.strokeStyle=shadeColor(acc,-.5);c.lineWidth=2.5;v15Rr(c,-68,-80,124,11,5);c.fill();c.stroke();
  c.fillStyle="#fff";c.fillRect(-60,-77,100,2);
  c.fillStyle="#fff7b0";c.shadowColor="#ffe66b";c.shadowBlur=8;c.beginPath();c.arc(64,-12,4.5,0,Math.PI*2);c.fill();c.shadowBlur=0;
  c.fillStyle="#d22";c.fillRect(-67,-14,4,8);
  v15Plate(c,o.plate,-10,-4);
  v15Arch(c,-39,32+o.rs,33);v15Arch(c,43,28+o.fs,36);
  v15Wheel(c,-39,32+o.rs,27,o.spin,"#e8c23a");v15Wheel(c,43,28+o.fs,30,o.spin,"#e8c23a");
}

// ---------- ৪) লোকাল বাস "মুড়ির টিন" ----------
function v15Bus(c,v,o){
  const body=v.color,acc=v.accent,dark=shadeColor(body,-.5),light=shadeColor(body,.3);
  c.lineJoin="round";c.lineCap="round";
  c.fillStyle="#141b22";v15Rr(c,-72,6,148,10,4);c.fill();
  // ছাদের মালপত্র
  c.fillStyle="#7a5a3a";v15Rr(c,-58,-96,26,12,3);c.fill();c.fillStyle="#3a6a8a";v15Rr(c,-28,-93,22,9,3);c.fill();c.fillStyle="#9a3a3a";v15Rr(c,-2,-95,30,11,3);c.fill();
  c.strokeStyle="#222";c.lineWidth=2;c.beginPath();c.moveTo(-64,-86);c.lineTo(36,-86);c.stroke();
  // মূল বডি
  c.fillStyle=v15Grad(c,-86,10,light,body);c.strokeStyle=dark;c.lineWidth=3;v15Rr(c,-74,-86,152,96,9);c.fill();c.stroke();
  // টিনের তালি
  const patch=["#c9d1d6","#e8b0a0","#9fb3c0","#d8c27a"];
  [[-66,-6,22,12],[-34,0,18,9],[-8,-8,26,13],[28,-2,20,10],[52,-9,18,12]].forEach((p,i)=>{c.fillStyle=patch[i%4];c.globalAlpha=.85;c.fillRect(p[0],p[1],p[2],p[3]);c.globalAlpha=1;c.strokeStyle="rgba(0,0,0,.35)";c.lineWidth=1;c.strokeRect(p[0],p[1],p[2],p[3]);});
  // রঙিন ডোরা
  c.fillStyle=acc;c.fillRect(-74,-46,152,6);c.fillStyle="#1d7a3a";c.fillRect(-74,-38,152,3);
  // জানালা + যাত্রী
  for(let i=0;i<5;i++){const wx=-66+i*24;c.fillStyle="#13222b";v15Rr(c,wx-1.5,-79,22,28,3);c.fill();c.fillStyle="rgba(190,230,245,.92)";v15Rr(c,wx,-77.5,19,25,2);c.fill();
    if(i!==2){c.fillStyle=["#d9a47a","#b8845e","#e0b08a","#8a5a3a"][i%4];c.beginPath();c.arc(wx+9.5,-62,5,0,Math.PI*2);c.fill();c.fillStyle=["#cc4444","#4477cc","#44aa66","#ddaa33"][i%4];c.fillRect(wx+3,-57,13,6);}}
  // সামনের কাচ + গন্তব্য-ফলক
  c.fillStyle="rgba(190,230,245,.92)";c.beginPath();c.moveTo(56,-78);c.lineTo(74,-74);c.lineTo(76,-48);c.lineTo(56,-50);c.closePath();c.fill();c.strokeStyle=dark;c.lineWidth=2;c.stroke();
  c.fillStyle="#0c0c0c";v15Rr(c,44,-92,32,11,2);c.fill();c.fillStyle="#ffd23a";c.font="bold 9px sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillText("ঢাকা",60,-86);
  // দরজা
  c.fillStyle="#1b1b1b";c.fillRect(30,-48,18,56);c.strokeStyle="#999";c.lineWidth=1;c.beginPath();c.moveTo(39,-48);c.lineTo(39,8);c.stroke();
  // লেখা
  c.fillStyle="#fff";c.strokeStyle="rgba(0,0,0,.6)";c.lineWidth=2.5;c.font="bold 12px sans-serif";c.textAlign="left";c.textBaseline="alphabetic";c.strokeText("মুড়ির টিন",-66,-18);c.fillText("মুড়ির টিন",-66,-18);
  // টোল/ডেন্ট
  c.strokeStyle="rgba(0,0,0,.35)";c.lineWidth=2;c.beginPath();c.moveTo(-48,-30);c.lineTo(-40,-26);c.lineTo(-34,-31);c.moveTo(8,-24);c.lineTo(15,-20);c.lineTo(20,-25);c.stroke();
  // বাম্পার, হেডলাইট
  c.fillStyle="#222";v15Rr(c,70,-4,12,12,3);c.fill();v15Rr(c,-80,-4,10,12,3);c.fill();
  c.fillStyle="#fff7b0";c.shadowColor="#ffe66b";c.shadowBlur=8;c.beginPath();c.arc(74,-16,4.5,0,Math.PI*2);c.fill();c.shadowBlur=0;
  c.fillStyle="#d22";c.fillRect(-76,-16,4,8);
  v15Plate(c,o.plate,2,-30);
  v15Arch(c,-39,32+o.rs,33);v15Arch(c,43,28+o.fs,36);
  v15Wheel(c,-39,32+o.rs,27,o.spin,"#b9c2c9");v15Wheel(c,43,28+o.fs,30,o.spin,"#b9c2c9");
}

// kind অনুযায়ী সঠিক sprite আঁকা
function v15DrawVehicle(c,v,o){
  c.save();
  if(v.kind==="cng")v15CNG(c,v,o);
  else if(v.kind==="rickshaw")v15Rickshaw(c,v,o);
  else if(v.kind==="ebike")v15Ebike(c,v,o);
  else if(v.kind==="bus")v15Bus(c,v,o);
  c.restore();
}

// ---------- নতুন যানবাহন তালিকায় যোগ (পুরনো index অপরিবর্তিত, তাই পুরনো save নিরাপদ) ----------

// ---------- Customization (রং + নম্বর প্লেট), selected গাড়ির জন্য ----------
const V15_COLORS=["","#e53935","#168ee8","#22a447","#8b42d9","#ff6b1a","#202830","#f7b900","#ff4fa3","#e9eef2"];
function v15Custom(){
  if(typeof save.custom!=="object"||save.custom===null||Array.isArray(save.custom)) save.custom={};
  const c=save.custom;
  if(typeof c.color!=="string"||!/^#[0-9a-fA-F]{6}$/.test(c.color)) c.color="";
  if(typeof c.plate!=="string") c.plate="";
  c.plate=c.plate.toUpperCase().replace(/[^A-Z0-9\- ]/g,"").slice(0,8);
  return c;
}
function v15PlateText(){return v15Custom().plate||"HR-BD";}
// selected গাড়িতে custom রং বসানো একটা কপি (মূল তালিকা বদলায় না)
function v15Eff(v){
  if(!v||v!==vehiclesV22[save.selectedVehicle]) return v;
  const cu=v15Custom();
  if(!cu.color) return v;
  return Object.assign({},v,{color:cu.color,accent:shadeColor(cu.color,.45)});
}

// ---------- গেমে গাড়ি আঁকা: নতুন kind হলে sprite, নইলে আগের ট্রাক (custom রং/প্লেট সহ) ----------
const v15DrawTruckBase=drawTruck;
drawTruck=function(){
  const base=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];
  const v=v15Eff(base);
  if(base.kind){
    ctx.save();ctx.translate(truck.x-camera.x,truck.y);ctx.rotate(truck.angle);
    ctx.translate(0,-(truck.onGround?Math.sin(performance.now()*.012)*1.1:0));
    ctx.fillStyle="rgba(0,0,0,.24)";ctx.beginPath();ctx.ellipse(0,45,72,11,0,0,Math.PI*2);ctx.fill();
    v15DrawVehicle(ctx,v,{rs:truck.rearSusp||0,fs:truck.frontSusp||0,spin:truck.wheelSpin||0,plate:v15PlateText()});
    ctx.restore();
    return;
  }
  if(v!==base){
    const oc=base.color,oa=base.accent;base.color=v.color;base.accent=v.accent;
    try{v15DrawTruckBase();}finally{base.color=oc;base.accent=oa;}
  }else v15DrawTruckBase();
  // ট্রাকের পিছনে নম্বর প্লেট
  ctx.save();ctx.translate(truck.x-camera.x,truck.y);ctx.rotate(truck.angle);v15Plate(ctx,v15PlateText(),-92,-4);ctx.restore();
};

// ---------- গ্যারেজের preview: নতুন kind-এর জন্য sprite ছবি (data URL), আগের CSS truck অপরিবর্তিত ----------
const v15SpriteCache={};
function v15SpriteURL(v){
  const plate=v15PlateText();
  const key=[v.kind,v.color,v.accent,plate].join("|");
  if(v15SpriteCache[key]) return v15SpriteCache[key];
  const cv=document.createElement("canvas");cv.width=180;cv.height=180;
  const c=cv.getContext("2d");c.translate(90,118);
  v15DrawVehicle(c,v,{rs:0,fs:0,spin:.4,plate});
  return v15SpriteCache[key]=cv.toDataURL("image/png");
}
const v15MiniBase=miniTruckMarkup;
miniTruckMarkup=function(v,scale=""){
  const e=v15Eff(v);
  if(v&&v.kind) return `<img class="v15Sprite ${scale}" alt="${v.name}" src="${v15SpriteURL(e)}">`;
  return v15MiniBase(e,scale);
};

// =====================================================================
// V15 — বাংলাদেশি ম্যাপ (৫টা)। পুরনো ম্যাপের index অপরিবর্তিত, নতুনগুলো শেষে।
// =====================================================================
maps.push(
  {name:"SAJEK VALLEY",desc:"মেঘের রাজ্য — রাঙামাটির সাজেকের পাহাড়ি পথ।",price:2200,sky1:"#4fa3e0",sky2:"#fbe3c8",grass:"#4fc05e",dirt:"#b98558",water:"#7fbbe0",theme:"sajek"},
  {name:"BANDARBAN NILGIRI",desc:"কুয়াশাঢাকা সবুজ পাহাড় ও ঝর্ণা।",price:2600,sky1:"#5a9fc2",sky2:"#dcebe4",grass:"#3aa65a",dirt:"#8a6a48",water:"#4a9ec0",theme:"bandarban"},
  {name:"SYLHET TEA HILLS",desc:"জাফলংয়ের চা-বাগান ও স্বচ্ছ নদী।",price:3000,sky1:"#3b9be0",sky2:"#cfeeff",grass:"#5fcf5c",dirt:"#a56b45",water:"#1fb7c9",theme:"sylhet"},
  {name:"KHAGRACHHARI",desc:"বাঁশবন, মাচাঘর আর লাল মাটির পাহাড়।",price:3600,sky1:"#4eb0e8",sky2:"#fff0c8",grass:"#58c04e",dirt:"#c0603a",water:"#3aa0b8",theme:"khagrachhari"},
  {name:"RANGAMATI KAPTAI",desc:"রাঙামাটির কাপ্তাই হ্রদ, ঝুলন্ত সেতু আর নৌকা।",price:4000,sky1:"#5b3a8c",sky2:"#ffb070",grass:"#3f9a55",dirt:"#7a5a40",water:"#e0894a",theme:"kaptai"}
);
const V15_BD_THEMES=["sajek","bandarban","sylhet","khagrachhari","kaptai"];

// ---------- ছোট দৃশ্য-helper ----------
function v15RidgeY(x,baseY,amp,freq,par,seed){
  const wx=x+camera.x*par;
  return baseY-amp*(Math.sin(wx*freq+seed)*.5+Math.sin(wx*freq*2.3+seed*1.7)*.3+Math.sin(wx*freq*.5+seed*.4)*.4);
}
function v15Ridge(baseY,amp,freq,par,seed,top,bot){
  ctx.beginPath();ctx.moveTo(0,H);
  for(let x=0;x<=W+12;x+=12)ctx.lineTo(x,v15RidgeY(x,baseY,amp,freq,par,seed));
  ctx.lineTo(W+12,H);ctx.closePath();
  const g=ctx.createLinearGradient(0,baseY-amp,0,baseY+90);g.addColorStop(0,top);g.addColorStop(1,bot);
  ctx.fillStyle=g;ctx.fill();
}
function v15Mist(y,alpha,par,col){
  ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=col||"#fff";
  const P=W+380;
  for(let i=0;i<9;i++){const x=(((i*190-camera.x*par)%P)+P)%P-190;ctx.beginPath();ctx.ellipse(x,y+(i%3)*8,120,15,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
// world-fixed জিনিস (ঘর, গাছ) ridge-এর parallax-এর সাথে চলে
function v15OnRidge(count,spacing,off,baseY,amp,freq,par,seed,fn){
  const P=count*spacing;
  for(let i=0;i<count;i++){
    const sx=(((i*spacing+off-camera.x*par)%P)+P)%P-spacing;
    if(sx<-60||sx>W+60)continue;
    fn(sx,v15RidgeY(sx,baseY,amp,freq,par,seed),i);
  }
}
function v15Cottage(x,y,s,roof){
  ctx.fillStyle="#f1e4c4";ctx.fillRect(x-9*s,y-10*s,18*s,10*s);
  ctx.fillStyle=roof;ctx.beginPath();ctx.moveTo(x-12*s,y-10*s);ctx.lineTo(x,y-20*s);ctx.lineTo(x+12*s,y-10*s);ctx.closePath();ctx.fill();
  ctx.fillStyle="#6b4a2b";ctx.fillRect(x-2*s,y-6*s,4*s,6*s);
}
function v15StiltHouse(x,y,s){
  ctx.fillStyle="#5a3d22";[-8,-3,3,8].forEach(d=>ctx.fillRect(x+d*s-1,y-10*s,2*s,10*s));
  ctx.fillStyle="#8a6a3a";ctx.fillRect(x-11*s,y-14*s,22*s,5*s);
  ctx.fillStyle="#c9a85a";ctx.fillRect(x-9*s,y-24*s,18*s,10*s);
  ctx.fillStyle="#b08a3a";ctx.beginPath();ctx.moveTo(x-14*s,y-23*s);ctx.lineTo(x,y-35*s);ctx.lineTo(x+14*s,y-23*s);ctx.closePath();ctx.fill();
  ctx.fillStyle="#3a2a18";ctx.fillRect(x-2*s,y-21*s,4*s,7*s);
}
function v15Bamboo(x,y,s){
  ctx.lineCap="round";
  for(let k=0;k<5;k++){
    const dx=(k-2)*6*s,top=y-(70+((k*37)%23))*s;
    ctx.strokeStyle=k%2?"#7cc24a":"#5aa83a";ctx.lineWidth=3*s;
    ctx.beginPath();ctx.moveTo(x+dx,y);ctx.lineTo(x+dx*1.8,top);ctx.stroke();
    ctx.fillStyle="#4f9a34";
    for(let j=0;j<3;j++){const ly=top+j*14*s;ctx.beginPath();ctx.ellipse(x+dx*1.8+6*s,ly,9*s,2.6*s,.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(x+dx*1.8-6*s,ly+4*s,9*s,2.6*s,-.5,0,Math.PI*2);ctx.fill();}
  }
}
function v15Tree(x,y,s){ctx.fillStyle="#5a3d22";ctx.fillRect(x-2*s,y-26*s,4*s,26*s);ctx.fillStyle="#2f8a3a";ctx.beginPath();ctx.arc(x,y-34*s,15*s,0,Math.PI*2);ctx.arc(x-10*s,y-27*s,11*s,0,Math.PI*2);ctx.arc(x+10*s,y-27*s,11*s,0,Math.PI*2);ctx.fill();}
function v15Boat(x,y,s,phase){
  const b=Math.sin(performance.now()*.002+phase)*2;
  ctx.save();ctx.translate(x,y+b);
  ctx.fillStyle="#3a2414";ctx.beginPath();ctx.moveTo(-26*s,0);ctx.quadraticCurveTo(0,10*s,26*s,0);ctx.lineTo(20*s,-5*s);ctx.lineTo(-20*s,-5*s);ctx.closePath();ctx.fill();
  ctx.strokeStyle="#6a4a2a";ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(-8*s,-5*s);ctx.quadraticCurveTo(0,-20*s,12*s,-5*s);ctx.stroke();
  ctx.fillStyle="rgba(255,200,120,.45)";ctx.fillRect(-26*s,5*s,52*s,2*s);
  ctx.restore();
}

// ---------- প্রতিটা ম্যাপের পেছনের দৃশ্য ----------
function v15Stupa(x,y,s){
  ctx.fillStyle="#7a5a1a";ctx.fillRect(x-16*s,y-6*s,32*s,6*s);
  ctx.fillStyle="#d9a52a";ctx.beginPath();ctx.moveTo(x-14*s,y-6*s);ctx.lineTo(x-10*s,y-22*s);ctx.lineTo(x+10*s,y-22*s);ctx.lineTo(x+14*s,y-6*s);ctx.closePath();ctx.fill();
  ctx.fillStyle="#f2c94c";ctx.beginPath();ctx.arc(x,y-22*s,11*s,Math.PI,0);ctx.fill();
  ctx.fillStyle="#e0b23a";ctx.fillRect(x-3*s,y-44*s,6*s,12*s);ctx.beginPath();ctx.moveTo(x-5*s,y-32*s);ctx.lineTo(x,y-54*s);ctx.lineTo(x+5*s,y-32*s);ctx.closePath();ctx.fill();
  ctx.fillStyle="rgba(255,240,170,.5)";ctx.fillRect(x-8*s,y-20*s,4*s,12*s);
}
function v15HangBridge(){
  const P=2600,x0=((1000-camera.x*.07)%P+P)%P-300;
  if(x0>W+700||x0<-1000) return;
  const deckY=H*.50,topY=H*.37,x1=x0+520;
  ctx.save();ctx.strokeStyle="#26203a";ctx.fillStyle="#26203a";ctx.lineCap="round";
  ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x0-160,deckY+2);ctx.lineTo(x1+160,deckY+2);ctx.stroke();
  [x0,x1].forEach(tx=>{ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(tx,deckY+4);ctx.lineTo(tx,topY);ctx.stroke();ctx.fillRect(tx-9,topY-4,18,6);});
  ctx.lineWidth=2.6;
  [[x0-160,x0],[x0,x1],[x1,x1+160]].forEach(seg=>{
    const a=seg[0],b=seg[1];ctx.beginPath();
    if(a===x0&&b===x1){ctx.moveTo(a,topY);ctx.quadraticCurveTo((a+b)/2,deckY-6,b,topY);}
    else if(a<x0){ctx.moveTo(a,deckY);ctx.quadraticCurveTo((a+b)/2,deckY-30,b,topY);}
    else {ctx.moveTo(a,topY);ctx.quadraticCurveTo((a+b)/2,deckY-30,b,deckY);}
    ctx.stroke();
  });
  ctx.lineWidth=1.2;
  for(let x=x0+14;x<x1;x+=18){const t=(x-x0)/(x1-x0),cy=(1-t)*(1-t)*topY+2*t*(1-t)*(deckY-6)+t*t*topY;ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(x,deckY);ctx.stroke();}
  ctx.fillStyle="#ffd98a";for(let x=x0-150;x<x1+160;x+=40){ctx.beginPath();ctx.arc(x,deckY-3,1.6,0,Math.PI*2);ctx.fill();}
  ctx.restore();
}
function v15Scenario(theme){
  if(theme==="sajek"){
    const sg=ctx.createRadialGradient(W*.76,H*.17,4,W*.76,H*.17,110);sg.addColorStop(0,"#fff6d8");sg.addColorStop(1,"rgba(255,246,216,0)");ctx.fillStyle=sg;ctx.beginPath();ctx.arc(W*.76,H*.17,110,0,Math.PI*2);ctx.fill();
    drawClouds(3,70,"#ffffff",.5);
    v15Ridge(H*.34,55,.0042,.02,1.3,"#a9c4de","#e3ecf3");
    v15Mist(H*.40,.7,.05);
    v15Ridge(H*.43,62,.0056,.05,3.1,"#5aae62","#2f7a45");
    const roofs=["#d0392f","#2f6fd0","#e0a22f","#2f9a5a","#c43a8a"];
    v15OnRidge(7,300,90,H*.43,62,.0056,.05,3.1,(x,y,i)=>v15Cottage(x,y+5,1.45,roofs[i%5]));
    v15Mist(H*.47,.8,.09);
    v15Ridge(H*.52,40,.0072,.1,5.2,"#3a9a52","#1f6a38");
    v15OnRidge(9,230,60,H*.52,40,.0072,.1,5.2,(x,y,i)=>drawPine(x,y+8,.7,i%2?"#1f7a42":"#2b8f4d"));
  }else if(theme==="bandarban"){
    drawClouds(3,70,"#ffffff",.4);
    v15Ridge(H*.32,75,.0038,.02,0.7,"#7a9db8","#c4d6df");
    v15Mist(H*.37,.55,.04);
    v15Ridge(H*.43,85,.0050,.05,2.2,"#34777a","#1d5252");
    v15OnRidge(1,1500,500,H*.43,85,.0050,.05,2.2,(x,y)=>v15Stupa(x,y+3,1.5));
    const fx=((420-camera.x*.05)%1800+1800)%1800-200;
    if(fx>-40&&fx<W+40){const fy=v15RidgeY(fx,H*.43,85,.0050,.05,2.2);const g=ctx.createLinearGradient(0,fy,0,fy+170);g.addColorStop(0,"rgba(255,255,255,.95)");g.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=g;ctx.fillRect(fx-6,fy,12,170);ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=2;ctx.setLineDash([8,10]);ctx.lineDashOffset=-performance.now()/40;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy+160);ctx.stroke();ctx.setLineDash([]);}
    v15Mist(H*.49,.6,.08);
    v15Ridge(H*.53,55,.0064,.1,4.4,"#2a8a52","#16603a");
    v15OnRidge(12,170,40,H*.53,55,.0064,.1,4.4,(x,y,i)=>drawPine(x,y+8,1,i%2?"#0e6a3a":"#17804a"));
  }else if(theme==="sylhet"){
    drawClouds(4,60,"#ffffff",.55);
    v15Ridge(H*.31,70,.0040,.015,0.4,"#6f9cc6","#b9d4ea");
    // দূরের পাহাড়ে ঝর্ণা (জাফলং/মেঘালয়)
    const wx=((700-camera.x*.015)%2000+2000)%2000-200;
    if(wx>-30&&wx<W+30){const wy=v15RidgeY(wx,H*.31,70,.0040,.015,0.4);const g=ctx.createLinearGradient(0,wy,0,wy+120);g.addColorStop(0,"rgba(255,255,255,.9)");g.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=g;ctx.fillRect(wx-3,wy,6,120);}
    v15Mist(H*.37,.5,.04);
    v15Ridge(H*.43,48,.0050,.04,2.6,"#7ad07a","#3f9a4e");
    for(let r=0;r<8;r++){
      ctx.strokeStyle=r%2?"#2f8a42":"#4aa85a";ctx.lineWidth=5;ctx.beginPath();
      for(let x=0;x<=W+12;x+=12){const y=v15RidgeY(x,H*.43,48,.0050,.04,2.6)+10+r*9;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.stroke();
    }
    v15OnRidge(8,230,60,H*.43,48,.0050,.04,2.6,(x,y)=>v15Tree(x,y+3,1.4));
    v15Ridge(H*.54,34,.0075,.09,5.0,"#3f9a4e","#2a7a3a");
  }else if(theme==="khagrachhari"){
    drawClouds(3,60,"#ffffff",.45);
    v15Ridge(H*.33,66,.0044,.02,1.9,"#79b88a","#bfe0c4");
    v15Mist(H*.38,.4,.04);
    v15Ridge(H*.43,66,.0054,.05,3.7,"#3f9a4a","#276f36");
    v15OnRidge(6,320,100,H*.43,66,.0054,.05,3.7,(x,y)=>v15StiltHouse(x,y+4,1.4));
    v15Ridge(H*.53,40,.0070,.1,0.9,"#2f8a3c","#1c5f2a");
    v15OnRidge(9,210,30,H*.53,40,.0070,.1,0.9,(x,y)=>v15Bamboo(x,y+6,1.15));
  }else if(theme==="kaptai"){
    const sx=W*.62,sy=H*.27;
    const sg=ctx.createRadialGradient(sx,sy,6,sx,sy,190);sg.addColorStop(0,"rgba(255,244,200,1)");sg.addColorStop(.25,"rgba(255,190,110,.75)");sg.addColorStop(1,"rgba(255,150,90,0)");ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,190,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff3c8";ctx.beginPath();ctx.arc(sx,sy,36,0,Math.PI*2);ctx.fill();
    drawClouds(3,80,"#ffd2a8",.45);
    v15Ridge(H*.40,55,.0040,.02,1.1,"#6a4a8a","#a8708a");
    v15HangBridge();
    v15Ridge(H*.48,50,.0052,.05,2.9,"#3a4f6a","#2a3a52");
    v15Ridge(H*.54,36,.0066,.09,4.6,"#2a5a46","#1c3f32");
    v15OnRidge(10,200,50,H*.54,36,.0066,.09,4.6,(x,y)=>v15Tree(x,y+4,1.1));
  }
}

// ---------- নিচের strip: মাটি/পানির নতুন ধরন ----------
function v15SoilStrip(m){
  const stripY=H-118;
  const g=ctx.createLinearGradient(0,stripY,0,H);
  const top=m.theme==="khagrachhari"?"#b4563a":m.theme==="bandarban"?"#5b4a30":"#8a6a40";
  g.addColorStop(0,top);g.addColorStop(1,shadeColor(top,-.55));
  ctx.fillStyle=g;ctx.fillRect(0,stripY,W,H-stripY);
  for(let i=0;i<34;i++){const x=((i*67-camera.x*.32)%(W+120)+W+120)%(W+120)-60,y=stripY+6+(i%5)*4;ctx.fillStyle=i%2?"#58b34a":"#3f9a3c";ctx.beginPath();ctx.moveTo(x,y+14);ctx.lineTo(x+4,y-6);ctx.lineTo(x+8,y+14);ctx.closePath();ctx.fill();}
  ctx.globalAlpha=.4;ctx.fillStyle=shadeColor(top,-.35);
  for(let i=0;i<11;i++){const x=((i*211-camera.x*.28)%(W+200)+W+200)%(W+200)-100,y=stripY+48+(i%4)*14;ctx.beginPath();ctx.ellipse(x,y,26+(i%3)*8,6,0,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}
function v15Lake(){
  const waterY=H-118;
  const g=ctx.createLinearGradient(0,waterY,0,H);g.addColorStop(0,"#f0a060");g.addColorStop(.35,"#b0607a");g.addColorStop(1,"#1c2c52");
  ctx.fillStyle=g;ctx.fillRect(0,waterY,W,H-waterY);
  const sx=W*.62;
  for(let i=0;i<9;i++){const y=waterY+6+i*11,w=70-i*4+Math.sin(performance.now()*.003+i)*6;ctx.fillStyle="rgba(255,225,160,"+(0.5-i*.04)+")";ctx.beginPath();ctx.ellipse(sx,y,w,2.4,0,0,Math.PI*2);ctx.fill();}
  for(let row=0;row<10;row++){const y=waterY+10+row*10;ctx.strokeStyle="rgba(255,235,200,"+(row%3===0?.5:.22)+")";ctx.lineWidth=row%3===0?2:1.2;ctx.beginPath();for(let x=-20;x<=W+30;x+=24){const yy=y+Math.sin((x+camera.x*.5)*.012+row)*2.4;if(x===-20)ctx.moveTo(x,yy);else ctx.lineTo(x,yy);}ctx.stroke();}
  const P=W+400;
  [[120,0.9,0],[520,1.2,1.7],[900,0.8,3.1],[1300,1.0,4.4]].forEach(b=>{const x=(((b[0]-camera.x*.18)%P)+P)%P-200;if(x>-60&&x<W+60)v15Boat(x,waterY+24+(b[2]%3)*14,b[1],b[2]);});
}

// ---------- hook: পুরনো ফাংশনে নতুন theme যোগ ----------
const v15ScenarioBase=drawScenario;
drawScenario=function(theme){ if(V15_BD_THEMES.includes(theme)) v15Scenario(theme); else v15ScenarioBase(theme); };

const v15BottomBase=drawBottomStrip;
drawBottomStrip=function(){
  const m=maps[save.selectedMap]||maps[0];
  if(m.theme==="kaptai") v15Lake();
  else if(m.theme==="sylhet") drawPremiumWater();
  else if(m.theme==="sajek"||m.theme==="bandarban"||m.theme==="khagrachhari") v15SoilStrip(m);
  else v15BottomBase();
};

const v15GripBase=themeGripMul;
themeGripMul=function(theme){ if(theme==="sylhet") return .95; if(theme==="khagrachhari") return .96; return v15GripBase(theme); };

const v15WeatherBase=weatherForLevel;
weatherForLevel=function(){
  const m=maps[save.selectedMap]||maps[0];
  if(!V15_BD_THEMES.includes(m.theme)) return v15WeatherBase();
  const pools={sajek:["clear","wind","rain"],bandarban:["clear","rain"],sylhet:["rain","clear","rain"],khagrachhari:["clear","rain","wind"],kaptai:["clear","wind"]};
  const pool=pools[m.theme];
  const h=hashSeed(currentLevel*131.7+(save.selectedMap||0)*977.3);
  return pool[Math.min(pool.length-1,Math.floor(h*pool.length))];
};

// নতুন ম্যাপগুলো সূচক-ভিত্তিক কঠিনতায় অতিরিক্ত কঠিন না হয়ে যায়—সীমা বসানো (সবচেয়ে কঠিন পুরনো ম্যাপের কাছাকাছি)
const v15DiffBase=mapDifficulty;
mapDifficulty=function(){ return Math.min(1.5,v15DiffBase()); };

// =====================================================================
// V15 — Checkpoint ও recovery (শুধু Level mode; Endless-এর র‍্যাংকিং অক্ষত রাখতে সেখানে নেই)
// =====================================================================
let v15Cps=[], v15Checkpoint=null, v15UsedCp=false, v15CrashAt=0;

function v15InitCps(){
  v15Cps=[];v15Checkpoint=null;v15UsedCp=false;
  if(endlessMode) return;
  const end=finishX();
  [0.25,0.5,0.75].forEach(f=>{
    let x=Math.round(250+(end-250)*f);
    for(let k=0;k<40&&spanHasGap(x-110,x+110);k++) x+=40;
    v15Cps.push({x,hit:false});
  });
}
const v15StartLevelBase=startLevel;
startLevel=function(id){ v15StartLevelBase(id); v15InitCps(); };
const v15StartEndlessBase=startEndless;
startEndless=function(){ v15StartEndlessBase(); v15InitCps(); };

const v15UpdateBase=updatePhysics;
updatePhysics=function(dt){
  v15UpdateBase(dt);
  if(state!=="play"||endlessMode) return;
  for(let i=0;i<v15Cps.length;i++){
    const cp=v15Cps[i];
    if(!cp.hit&&truck.x>=cp.x){
      cp.hit=true;v15Checkpoint={x:cp.x,n:i+1};
      spawnFloatText(truck.x,truck.y-95,"📍 CHECKPOINT "+(i+1),"#4cff9a");
      tone(740,.08,.06);
    }
  }
};

const v15CrashBase=crash;
crash=function(reason){
  const was=state;
  v15CrashBase(reason);
  if(was==="play"&&state==="crash") v15CrashAt=performance.now();
  const b=document.getElementById("cpRetryBtn");
  if(b) b.style.display=(state==="crash"&&v15Checkpoint&&!endlessMode)?"":"none";
};

function v15Respawn(){
  if(!v15Checkpoint||endlessMode) return;
  const cp=v15Checkpoint;
  state="play";hideScreens();
  document.getElementById("hud").classList.remove("hidden");document.getElementById("controls").classList.remove("hidden");
  resetTruck();
  truck.x=cp.x;truck.angle=terrainSlope(cp.x);truck.y=terrainY(cp.x)-truck.wheelR-31;truck.lastGroundY=truck.y;
  // checkpoint পুরো ভর্তি নয়—শুধু চলার মতো fuel/boost দেয়
  truck.fuel=Math.min(FUEL_CONFIG.cap,60);truck.boostEnergy=60;
  camera.x=Math.max(0,truck.x-W*.30);
  // menu-তে অপেক্ষার সময় টাইমারে গণ্য হবে না
  if(v15CrashAt) levelStart+=performance.now()-v15CrashAt;
  v15UsedCp=true;
  resumeAudio();setAudioSuppressed(false);engineStart();updateHUD();
}

// checkpoint ব্যবহার করে শেষ করলে সময়-রেকর্ড ও ghost বদলাবে না (সৎ র‍্যাংকিং), কয়েন পুরস্কার আগের মতোই
const v15CompleteBase=completeLevel;
completeLevel=function(){
  if(!v15UsedCp) return v15CompleteBase();
  const old=save.best[currentLevel];
  const ghostBase=saveGhostIfBest;
  saveGhostIfBest=function(){};
  try{ v15CompleteBase(); }finally{ saveGhostIfBest=ghostBase; }
  if(old===undefined) delete save.best[currentLevel]; else save.best[currentLevel]=old;
  persist();
  const rt=document.getElementById("rewardText");
  if(rt) rt.textContent+=" · checkpoint ব্যবহার — সময় রেকর্ডে গণ্য নয়";
};

function drawCheckpointFlags(){
  if(endlessMode||!v15Cps.length) return;
  for(const cp of v15Cps){
    const sx=cp.x-camera.x;
    if(sx<-60||sx>W+60) continue;
    const gy=terrainY(cp.x);
    ctx.save();
    ctx.strokeStyle="#2b2b2b";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(sx,gy);ctx.lineTo(sx,gy-92);ctx.stroke();
    ctx.fillStyle=cp.hit?"#2ecc71":"#ffffff";ctx.strokeStyle="#111";ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(sx,gy-92);ctx.lineTo(sx+46,gy-79);ctx.lineTo(sx,gy-66);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#111";ctx.font="bold 10px sans-serif";ctx.textAlign="left";ctx.fillText("CP",sx+6,gy-75);
    ctx.restore();
  }
}

// =====================================================================
// V15 — গ্যারেজে customization প্যানেল (রং + নম্বর প্লেট)
// =====================================================================
const v15GarageBase=renderGarage;
renderGarage=function(){
  v15GarageBase();
  const btn=document.getElementById("selectVehicleBtn");
  if(!btn) return;
  let panel=document.getElementById("garageCustom");
  if(!panel){panel=document.createElement("div");panel.id="garageCustom";panel.className="garageCustom";btn.parentElement.insertBefore(panel,btn);}
  const cu=v15Custom();
  panel.innerHTML=`<div class="gcTitle">🎨 CUSTOMIZE</div><div class="gcSwatches">${V15_COLORS.map(c=>`<button type="button" class="gcSwatch${cu.color===c?" on":""}" data-c="${c}" style="${c?"background:"+c:""}" aria-label="${c||"default colour"}">${c?"":"↺"}</button>`).join("")}</div><label class="gcPlate">নম্বর প্লেট <input id="gcPlateInput" maxlength="8" value="${cu.plate}" placeholder="HR-BD" autocomplete="off" spellcheck="false"></label>`;
  panel.querySelectorAll(".gcSwatch").forEach(b=>{b.onclick=()=>{v15Custom().color=b.dataset.c;persist();selectSound();renderGarage();};});
  const inp=panel.querySelector("#gcPlateInput");
  inp.oninput=()=>{
    const c=v15Custom();c.plate=inp.value;v15Custom();inp.value=c.plate;persist();
    const prev=document.getElementById("garageVehicle");
    if(prev) prev.innerHTML=miniTruckMarkup(vehiclesV22[save.selectedVehicle]||vehiclesV22[0]);
  };
};

// =====================================================================
// V15 — Records স্ক্রিন (শুধু local; Endless সেরা দূরত্ব + লেভেলের সেরা সময়)
// =====================================================================
function v15FmtTime(t){const s=Math.max(0,Number(t)||0);const m=Math.floor(s/60);return m+":"+String(Math.floor(s%60)).padStart(2,"0");}
function renderRecords(){
  const box=document.getElementById("recordsList");
  if(!box) return;
  const eb=save.endlessBest||{};
  const done=Object.keys(save.completed||{}).length;
  let html=`<div class="recSummary"><span>✅ শেষ করা লেভেল: <b>${done}</b> / ${TOTAL_LEVELS}</span><span>🔓 আনলকড: <b>${save.unlocked}</b></span><span>🪙 কয়েন: <b>${coins}</b></span></div>`;
  html+=`<h3 class="recH">🏁 Endless — সেরা দূরত্ব (প্রতি ম্যাপে)</h3><div class="recGrid">`;
  maps.forEach((m,i)=>{const v=Number(eb[String(i)])||0;const owned=save.ownedMaps.includes(i);html+=`<div class="recCard${owned?"":" locked"}"><b>${m.name}</b><span>${v?v+" মিটার":(owned?"—":"🔒")}</span></div>`;});
  html+=`</div><h3 class="recH">⏱ লেভেলের সেরা সময়</h3><div class="recGrid recLevels">`;
  const lv=Object.keys(save.best||{}).map(Number).filter(n=>n>=1&&n<=TOTAL_LEVELS).sort((a,b)=>a-b);
  if(!lv.length) html+=`<div class="recEmpty">এখনো কোনো লেভেল শেষ করা হয়নি।</div>`;
  lv.forEach(n=>{html+=`<div class="recCard"><b>Level ${n}</b><span>${v15FmtTime(save.best[n])}</span></div>`;});
  html+=`</div>`;
  box.innerHTML=html;
}
const v15HideBase=hideScreens;
hideScreens=function(){
  v15HideBase();
  const el=document.getElementById("recordsMenu");
  if(el){el.classList.add("hidden");el.style.display="none";el.style.visibility="hidden";el.style.pointerEvents="none";}
};
const v15ShowBase=showScreen;
showScreen=function(id){
  v15ShowBase(id);
  if(id==="recordsMenu"){document.getElementById("hud").classList.add("hidden");document.getElementById("controls").classList.add("hidden");}
};

// =====================================================================
// V15 — বাটন বাঁধা + প্রথমবার তালিকা নতুন করে আঁকা
// =====================================================================
(function v15Wire(){
  const rb=document.getElementById("recordsBtn");
  if(rb) rb.onclick=()=>{resumeAudio();tone(500,.06,.05);renderRecords();showScreen("recordsMenu");};
  const rbk=document.getElementById("backRecordsBtn");
  if(rbk) rbk.onclick=()=>{tone(330,.06,.05);goMain();};
  const cb=document.getElementById("cpRetryBtn");
  if(cb) cb.onclick=()=>{resumeAudio();tone(520,.07,.06);v15Respawn();};
  v15Custom();
  if(typeof renderMaps==="function") renderMaps();
  renderGarage();
  if(typeof renderStore==="function") renderStore();
})();


// =====================================================================
// V15b — প্রতিটা গাড়ির আলাদা ইঞ্জিন/শব্দ-চরিত্র (Web Audio, কোডে তৈরি; কোনো অডিও ফাইল নেই)
// =====================================================================
// প্রোফাইলের মান: w1/w2 তরঙ্গ, f0 নিষ্ক্রিয় পিচ(Hz), fs গতি-প্রতি পিচ বৃদ্ধি, cut ফিল্টার সীমা, q, lfo [ন্যূনতম,সর্বোচ্চ] চাগ-রেট (Hz),
// depth চাগের গভীরতা (০–১), gain মূল ভলিউম, noise ঘর্ঘর, o2 দ্বিতীয় অসিলেটরের অনুপাত (পিচ-গুণক)
const V15_SND={
  "TRAIL BLAZER":{w1:"sawtooth",w2:"square",f0:46,fs:.060,cut:700,q:1,lfo:[9,22],depth:.35,gain:.085,noise:.016,o2:.5},
  "RED RAMPAGE":{w1:"sawtooth",w2:"sawtooth",f0:52,fs:.075,cut:900,q:1,lfo:[10,26],depth:.30,gain:.085,noise:.016,o2:.5},
  "OCEAN TITAN":{w1:"sawtooth",w2:"triangle",f0:44,fs:.055,cut:650,q:.8,lfo:[8,18],depth:.28,gain:.090,noise:.012,o2:.5},
  "JUNGLE KING":{w1:"square",w2:"sawtooth",f0:40,fs:.050,cut:560,q:1.2,lfo:[7,16],depth:.45,gain:.090,noise:.020,o2:.5},
  "PURPLE FURY":{w1:"sawtooth",w2:"square",f0:64,fs:.100,cut:1400,q:1.5,lfo:[14,34],depth:.20,gain:.075,noise:.014,o2:2},
  "BLACK BEAST":{w1:"sawtooth",w2:"sine",f0:36,fs:.045,cut:500,q:1.5,lfo:[6,14],depth:.50,gain:.100,noise:.022,o2:.5},
  "SUNSET KING":{w1:"sawtooth",w2:"square",f0:58,fs:.090,cut:1200,q:1.2,lfo:[12,30],depth:.25,gain:.080,noise:.014,o2:1.5},
  "GOLDEN X":{w1:"sawtooth",w2:"sawtooth",f0:70,fs:.110,cut:1700,q:.9,lfo:[16,38],depth:.14,gain:.070,noise:.010,o2:2},
  "CNG AUTO":{w1:"square",w2:"sawtooth",f0:72,fs:.090,cut:1100,q:3,lfo:[7,21],depth:.75,gain:.065,noise:.014,o2:1.5},
  "RICKSHAW":{none:true,noise:.008},
  "EASY BIKE":{w1:"triangle",w2:"sine",f0:170,fs:.60,cut:3200,q:.7,lfo:[0,0],depth:0,gain:.030,noise:.006,o2:2},
  "MURIR TIN BUS":{w1:"sawtooth",w2:"square",f0:31,fs:.040,cut:380,q:1.4,lfo:[5,11],depth:.55,gain:.105,noise:.030,o2:.5}
};
let v15S=null,v15SndPhase=0,v15LastBoost=false,v15LastHorn=0,v15LastT=0;
function v15SndInit(){
  if(v15S||!audioReady||!audio||!master) return;
  const a=audio;
  const o1=a.createOscillator(),o2=a.createOscillator(),f=a.createBiquadFilter(),amp=a.createGain(),out=a.createGain(),lfo=a.createOscillator(),lfoG=a.createGain();
  f.type="lowpass";f.frequency.value=700;f.Q.value=1;
  o1.type="sawtooth";o2.type="square";o1.frequency.value=46;o2.frequency.value=23;
  amp.gain.value=.65;lfo.type="sine";lfo.frequency.value=10;lfoG.gain.value=0;
  out.gain.value=0;
  o1.connect(f);o2.connect(f);f.connect(amp);amp.connect(out);out.connect(master);
  lfo.connect(lfoG);lfoG.connect(amp.gain);
  o1.start();o2.start();lfo.start();
  v15S={o1,o2,f,amp,out,lfo,lfoG,last:null};
}
// নির্বাচিত গাড়ির শব্দ-প্রোফাইল
function v15Prof(){const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];return V15_SND[v.name]||V15_SND["TRAIL BLAZER"];}
// হর্ন (boost বাটনের প্রথম চাপে, ১.৫ সেকেন্ডে একবার)
function v15Horn(){
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];
  const now=performance.now();if(now-v15LastHorn<1500)return;v15LastHorn=now;
  if(v.name==="RICKSHAW"){tone(2300,.14,.05,"sine");setTimeout(()=>tone(2300,.14,.05,"sine"),170);}
  else if(v.name==="MURIR TIN BUS"){tone(196,.32,.07,"sawtooth");tone(247,.32,.06,"sawtooth");}
  else if(v.name==="CNG AUTO"){tone(620,.09,.05,"square");setTimeout(()=>tone(620,.09,.05,"square"),130);}
  else if(v.name==="EASY BIKE"){tone(880,.12,.04,"square");}
  // ট্রাকগুলোর boost-এ আগের মতোই (আলাদা হর্ন নেই)
}
const v15UpdateEngineBase=updateEngine;
updateEngine=function(){
  if(!audioReady||state!=="play") return;
  v15UpdateEngineBase();                       // আগের নোড/অবস্থা ঠিক রাখতে
  v15SndInit();if(!v15S) return;
  const p=v15Prof(),t=audio.currentTime,speed=Math.abs(truck.vx);
  const nowMs=performance.now(),dt=Math.min(.1,Math.max(0,(nowMs-(v15LastT||nowMs))/1000));v15LastT=nowMs;
  // আগের এক-সুরের ইঞ্জিন চুপ করানো (এখন প্রোফাইল-ভিত্তিক শব্দ বাজবে)
  engineGain.gain.setTargetAtTime(0,t,.03);
  const spN=Math.min(1,speed/700),thr=keys.gas?1:(keys.right?.55:0);
  if(p.none){
    // রিকশা: ইঞ্জিন নেই—চেইন/প্যাডেলের টিক টিক ও টায়ারের হিস
    v15S.out.gain.setTargetAtTime(0,t,.03);
    v15SndPhase+=dt*(1.4+spN*7+thr*2);
    if(v15SndPhase>=1){v15SndPhase-=1;noise(.014,.03);tone(1500+Math.random()*300,.012,.016,"square");}
    engineNoiseGain.gain.setTargetAtTime(p.noise+spN*.012,t,.08);
    v15S.last={mode:"ticks",rate:+(1.4+spN*7+thr*2).toFixed(2)};
  }else{
    v15S.o1.type=p.w1;v15S.o2.type=p.w2;
    const f1=p.f0+speed*p.fs+thr*p.f0*.35;
    v15S.o1.frequency.setTargetAtTime(f1,t,.04);v15S.o2.frequency.setTargetAtTime(f1*p.o2,t,.05);
    const cut=p.cut*(.75+spN*.45+thr*.35);
    v15S.f.frequency.setTargetAtTime(cut,t,.05);v15S.f.Q.value=p.q;
    const lf=p.lfo[0]+(p.lfo[1]-p.lfo[0])*Math.min(1,spN*.7+thr*.4);
    v15S.lfo.frequency.setTargetAtTime(Math.max(.1,lf),t,.08);
    v15S.lfoG.gain.setTargetAtTime(p.depth*.5,t,.08);v15S.amp.gain.setTargetAtTime(.65,t,.1);
    const g=p.gain*(.6+spN*.5+thr*.3);
    v15S.out.gain.setTargetAtTime(g,t,.05);
    engineNoiseGain.gain.setTargetAtTime(p.noise+spN*p.noise*1.2,t,.08);
    v15S.last={mode:"engine",f1:+f1.toFixed(1),cut:+cut.toFixed(0),lfo:+lf.toFixed(1),gain:+g.toFixed(3)};
  }
  // boost বাটনের প্রথম চাপে হর্ন
  if(keys.boost&&!v15LastBoost) v15Horn();
  v15LastBoost=!!keys.boost;
};
const v15EngineStopBase=engineStop;
engineStop=function(){ v15EngineStopBase(); if(v15S&&audio) v15S.out.gain.setTargetAtTime(0,audio.currentTime,.08); };

// =====================================================================
// V15b — ম্যাপ তালিকা: বাংলাদেশি স্পট আগে (index অপরিবর্তিত—শুধু দেখানোর ক্রম), প্রতিটার নিজস্ব thumbnail
// =====================================================================
// ক্রম: সিলেট, রাঙামাটি (কাপ্তাই), সাজেক, বান্দরবান, খাগড়াছড়ি, তারপর আগের ৮টা
const V15_MAP_ORDER=[10,12,8,9,11,0,1,2,3,4,5,6,7];
function v15Thumb(theme){
  const sky={sajek:["#4fa3e0","#fbe3c8"],bandarban:["#5a9fc2","#dcebe4"],sylhet:["#3b9be0","#cfeeff"],khagrachhari:["#4eb0e8","#fff0c8"],kaptai:["#5b3a8c","#ffb070"]}[theme];
  let body="";
  if(theme==="sajek") body=`<ellipse cx="60" cy="58" rx="70" ry="9" fill="#fff" opacity=".75"/><path d="M0 70 Q40 40 90 62 T200 56 V110 H0Z" fill="#4fae5a"/><rect x="40" y="58" width="12" height="8" fill="#f1e4c4"/><path d="M37 58 L46 50 L55 58Z" fill="#d0392f"/><rect x="120" y="60" width="12" height="8" fill="#f1e4c4"/><path d="M117 60 L126 52 L135 60Z" fill="#2f6fd0"/><ellipse cx="150" cy="74" rx="60" ry="8" fill="#fff" opacity=".8"/>`;
  else if(theme==="bandarban") body=`<path d="M0 62 Q50 20 100 52 T200 40 V110 H0Z" fill="#34777a"/><path d="M110 40 H118 L116 26 L121 12 L126 26 L124 40Z" fill="#e0b23a"/><rect x="60" y="30" width="3" height="38" fill="#fff" opacity=".85"/><ellipse cx="100" cy="66" rx="90" ry="8" fill="#fff" opacity=".6"/><path d="M0 84 Q60 66 110 82 T200 78 V110 H0Z" fill="#1a6a40"/>`;
  else if(theme==="sylhet") body=`<path d="M0 50 Q50 20 100 44 T200 36 V110 H0Z" fill="#7aa8d0"/><path d="M0 70 Q60 52 110 68 T200 62 V110 H0Z" fill="#5fc064"/><path d="M0 76 Q60 58 110 74 T200 68" stroke="#2f8a42" stroke-width="3" fill="none"/><path d="M0 84 Q60 66 110 82 T200 76" stroke="#2f8a42" stroke-width="3" fill="none"/><rect x="150" y="48" width="3" height="14" fill="#5a3d22"/><circle cx="151" cy="44" r="9" fill="#2f8a3a"/>`;
  else if(theme==="khagrachhari") body=`<path d="M0 66 Q50 34 100 58 T200 50 V110 H0Z" fill="#3f9a4a"/><rect x="48" y="64" width="2" height="9" fill="#5a3d22"/><rect x="62" y="64" width="2" height="9" fill="#5a3d22"/><rect x="45" y="52" width="22" height="12" fill="#c9a85a"/><path d="M42 53 L56 40 L70 53Z" fill="#b08a3a"/><path d="M0 88 Q70 70 120 86 T200 80 V110 H0Z" fill="#c0603a"/><path d="M150 82 L156 40 M158 82 L164 46 M166 82 L170 50" stroke="#6fbf48" stroke-width="3" fill="none"/>`;
  else body=`<circle cx="120" cy="40" r="13" fill="#fff3c8"/><path d="M0 58 Q60 38 120 56 T200 50 V110 H0Z" fill="#6a4a8a" opacity=".85"/><path d="M30 56 H170" stroke="#26203a" stroke-width="3"/><path d="M60 56 V34 M130 56 V34 M60 34 Q95 54 130 34" stroke="#26203a" stroke-width="2" fill="none"/><rect x="0" y="76" width="200" height="34" fill="#c9743f"/><rect x="100" y="76" width="30" height="34" fill="#ffd98a" opacity=".5"/><path d="M34 90 Q46 98 58 90Z" fill="#3a2414"/>`;
  return `<svg viewBox="0 0 200 110" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%"><defs><linearGradient id="sk${theme}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="200" height="110" fill="url(#sk${theme})"/>${body}</svg>`;
}
const v15RenderMapsBase=renderMaps;
renderMaps=function(){
  v15RenderMapsBase();
  const g=document.getElementById("mapGrid");
  if(!g) return;
  const cards=[...g.children];
  if(cards.length!==maps.length) return;
  cards.forEach((c,i)=>{
    const m=maps[i];
    if(V15_BD_THEMES.includes(m.theme)){
      const th=c.querySelector(".mapThumb");
      if(th){th.innerHTML=v15Thumb(m.theme);th.style.position="relative";th.style.overflow="hidden";}
      const h=c.querySelector("h3");if(h&&!h.dataset.bd){h.dataset.bd="1";h.textContent=h.textContent+" 🇧🇩";}
    }
  });
  V15_MAP_ORDER.forEach(i=>g.appendChild(cards[i]));
};
renderMaps();


// =====================================================================
// V16 — বাসের গ্যাপ ও ক্যানভাস-রিসাইজ সুরক্ষা
// =====================================================================
// বাস দেখতে অনেক বড় (বডি ~১৫০px), অথচ গ্যাপ ছিল ~১০৫px—চোখে মনে হত বাস গ্যাপের ওপর দিয়ে "সেতু" হয়ে যায়, পড়ার উপায় নেই।
// তাই বাস নিলে গ্যাপের প্রস্থ ১.৩ গুণ (জাম্প করে পার হওয়া তবুও সম্ভব; tests/v16_test.js ও বট-টেস্টে যাচাই)।
const V16_BUS_GAP_SCALE=1.3;
let v16GapSrc=null,v16GapScale=1,v16GapOut=null;
const v16GetGapsBase=getGaps;
getGaps=function(){
  const src=v16GetGapsBase();
  const v=vehiclesV22[save.selectedVehicle];
  const sc=(v&&v.kind==="bus")?V16_BUS_GAP_SCALE:1;
  if(sc===1) return src;
  if(src===v16GapSrc&&sc===v16GapScale) return v16GapOut;
  v16GapSrc=src;v16GapScale=sc;v16GapOut=src.map(([a,w])=>[a,Math.round(w*sc)]);
  return v16GapOut;
};

// ব্রাউজারের জুম/ডিসপ্লে-স্কেল/উইন্ডো-স্ন্যাপে মাঝেমধ্যে resize ইভেন্ট মিস হয় (স্ক্রিনশটে ডান পাশে কাটা অংশ দেখা গিয়েছিল)।
// তাই প্রতি ফ্রেমে মাপ মিলিয়ে দেখা হয়, না মিললে canvas নতুন করে মাপা হয়।
function v16CheckSize(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(innerWidth!==W||innerHeight!==H||dpr!==DPR||canvas.width!==Math.floor(W*DPR)||canvas.height!==Math.floor(H*DPR)) resizeCanvas();
}
const v16RenderBase=render;
render=function(){ v16CheckSize(); ctx.setTransform(DPR*(window.__k||1),0,0,DPR*(window.__k||1),0,0); /* v16.2: ট্রান্সফর্ম হারিয়ে গেলে (গেম ছোট দেখায়) প্রতি ফ্রেমে ফিরিয়ে আনা */ return v16RenderBase.apply(this,arguments); };
["orientationchange","fullscreenchange","pageshow","focus"].forEach(ev=>addEventListener(ev,()=>setTimeout(resizeCanvas,60)));
if(window.visualViewport) visualViewport.addEventListener("resize",resizeCanvas);

// ============================================================
// v16.3 — লেভেলভেদে আলাদা দূরত্ব/খাদের জায়গা + রাস্তার পাশে বাড়তি ডিটেইল
// ============================================================
// ফিনিশের দূরত্ব: আগে লেভেলের সাথে প্রায় সরলরেখায় বাড়ত; এখন প্রতিটা লেভেলে ০–১০৮০ একক বাড়তি (নির্দিষ্ট, র‍্যান্ডম নয়)।
const v163FinBase=finishX;
finishX=function(){ const f=v163FinBase.apply(this,arguments); if(endlessMode) return f; return f+((currentLevel*97+(save.selectedMap||0)*31)%13)*90; };
// খাদের জায়গা: প্রতিটা খাদ লেভেল অনুযায়ী ০–১২৬ একক আগে সরে—ক্রম ও ফাঁক ঠিক থাকে, ফিনিশের আগে runway বাড়ে বই কমে না।
const v163GapBase=getGaps; let v163GapSrc=null, v163GapKey=null, v163GapOut=null;
getGaps=function(){ const src=v163GapBase.apply(this,arguments); if(endlessMode) return src;
  const key=currentLevel+"_"+(save.selectedMap||0);
  if(src===v163GapSrc&&key===v163GapKey) return v163GapOut;
  v163GapSrc=src; v163GapKey=key;
  v163GapOut=src.map((g,i)=>{ const sh=((currentLevel*(37+i*11)+(save.selectedMap||0)*13)%8)*18; const c=g.slice(); c[0]=g[0]-sh; return c; });
  return v163GapOut; };
// রাস্তার পাশের ছোট ডিটেইল: ঝোপ, ফুল, বাঁশের বেড়া, সাইন, পাথরের স্তূপ, প্রতি ৫০০ এককে দূরত্বের খুঁটি।
function v163Hash(k){ const s=Math.sin(k*12.9898+(save.selectedMap||0)*78.233+currentLevel*3.1)*43758.5453; return s-Math.floor(s); }
function v163DrawDetails(){
  if(typeof state==="undefined"||state==="menu") return;
  const m=maps[save.selectedMap]||maps[0], x0=Math.floor((camera.x-60)/90)*90, x1=camera.x+W+80;
  for(let x=x0;x<x1;x+=90){
    if(x<420||spanHasGap(x-50,x+50)) continue;
    const r=v163Hash(x/90), ox=x+(v163Hash(x*.37)-.5)*40, y=terrainY(ox), sx=ox-camera.x;
    ctx.save(); ctx.translate(sx,y+2); ctx.rotate(terrainSlope(ox)*.9);
    if(r<.20){ // ঝোপ
      ctx.fillStyle="rgba(30,90,40,.95)"; for(const [dx,dy,rr] of [[-8,-6,9],[4,-9,11],[14,-5,8]]){ ctx.beginPath(); ctx.arc(dx,dy,rr,0,6.3); ctx.fill(); }
      ctx.fillStyle="rgba(70,150,60,.9)"; ctx.beginPath(); ctx.arc(2,-12,6,0,6.3); ctx.fill();
    } else if(r<.32){ // বুনো ফুল
      const cols=["#ffd23f","#ff6b9a","#ffffff","#b46bff"]; for(let i=0;i<4;i++){ const dx=-12+i*8, h=10+((i*7)%6); ctx.strokeStyle="#2f7a35"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(dx,0); ctx.lineTo(dx,-h); ctx.stroke(); ctx.fillStyle=cols[(i+Math.floor(r*100))%4]; ctx.beginPath(); ctx.arc(dx,-h,3.2,0,6.3); ctx.fill(); }
    } else if(r<.42){ // বাঁশ/কাঠের বেড়া
      ctx.strokeStyle="#8a6a3a"; ctx.lineWidth=4; ctx.lineCap="round"; for(let i=0;i<4;i++){ ctx.beginPath(); ctx.moveTo(-18+i*12,0); ctx.lineTo(-18+i*12,-22); ctx.stroke(); }
      ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-20,-16); ctx.lineTo(20,-16); ctx.moveTo(-20,-8); ctx.lineTo(20,-8); ctx.stroke();
    } else if(r<.49){ // সতর্ক-সাইন
      ctx.strokeStyle="#555"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-34); ctx.stroke();
      ctx.fillStyle="#f2c230"; ctx.beginPath(); ctx.moveTo(0,-52); ctx.lineTo(15,-37); ctx.lineTo(0,-22); ctx.lineTo(-15,-37); ctx.closePath(); ctx.fill(); ctx.strokeStyle="#111"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#111"; ctx.fillRect(-1.5,-46,3,10); ctx.fillRect(-1.5,-33,3,3);
    } else if(r<.58){ // পাথরের স্তূপ
      ctx.fillStyle="#7d7a76"; for(const [dx,dy,rr] of [[-7,-4,7],[5,-5,8],[0,-12,6]]){ ctx.beginPath(); ctx.ellipse(dx,dy,rr,rr*.7,0,0,6.3); ctx.fill(); }
      ctx.fillStyle="rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(-2,-14,3,2,0,0,6.3); ctx.fill();
    }
    ctx.restore();
  }
  // প্রতি ৫০০ এককে দূরত্বের খুঁটি (মিটার = (x-250)/10)
  for(let x=Math.floor((camera.x-40)/500)*500;x<x1;x+=500){ if(x<750||spanHasGap(x-30,x+30)) continue; const y=terrainY(x), sx=x-camera.x;
    ctx.save(); ctx.translate(sx,y+2); ctx.rotate(terrainSlope(x)*.9);
    ctx.fillStyle="#f4f4f0"; ctx.fillRect(-5,-38,10,38); ctx.fillStyle="#d4202a"; ctx.fillRect(-5,-38,10,9);
    ctx.fillStyle="#fff"; ctx.strokeStyle="rgba(0,0,0,.4)"; ctx.lineWidth=1; ctx.font="bold 11px Arial"; ctx.textAlign="center"; const t=Math.round((x-250)/10)+"m"; ctx.strokeText(t,0,-44); ctx.fillText(t,0,-44);
    ctx.restore(); }
}
const v163TerrainBase=drawTerrain;
drawTerrain=function(){ const r=v163TerrainBase.apply(this,arguments); try{ v163DrawDetails(); }catch(e){} return r; };

// ============================================================
// v17 — লিডারবোর্ড + প্রোফাইল (গেস্ট / ইমেইল রেজিস্টার)
// অনলাইন অংশ Cloudflare Pages Functions + D1 (functions/api/*, db/schema.sql)। সার্ভার না থাকলে শুধু এই ডিভাইসের রেকর্ড দেখায়।
// ============================================================
const V17_PROFILE_KEY="hillrush_profile_v1";
function v17Profile(){ try{ const p=JSON.parse(localStorage.getItem(V17_PROFILE_KEY)||"null"); return p&&p.id&&p.token?p:null; }catch(e){ return null; } }
function v17SetProfile(p){ try{ if(p) localStorage.setItem(V17_PROFILE_KEY,JSON.stringify(p)); else localStorage.removeItem(V17_PROFILE_KEY); }catch(e){} }
const v17Esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function v17Api(path,opt){
  const r=await fetch(path,Object.assign({headers:{"content-type":"application/json"}},opt||{}));
  const ct=r.headers.get("content-type")||""; if(!ct.includes("json")) throw new Error("server-off");
  const j=await r.json(); if(!j.ok) throw new Error(j.error||"error"); return j;
}
async function v17Submit(){
  const p=v17Profile(); if(!p||endlessMode) return;
  try{ await v17Api("/api/submit",{method:"POST",body:JSON.stringify({id:p.id,token:p.token,map:save.selectedMap||0,level:currentLevel,time:save.best[currentLevel],unlocked:save.unlocked,completed:Object.keys(save.completed||{}).length,coins:Math.floor(save.coins||0)})}); }catch(e){}
}
const v17CompleteBase=completeLevel;
completeLevel=function(){ const was=state; const r=v17CompleteBase.apply(this,arguments); if(was==="play"&&state==="complete") v17Submit(); return r; };
let v17Tab="overall", v17Msg="";
function v17Fmt(t){ return typeof v15FmtTime==="function"?v15FmtTime(t):Number(t).toFixed(2)+"s"; }
async function v17Render(){
  const box=document.getElementById("leaderBody"); if(!box) return;
  const p=v17Profile(); const mapOpts=maps.map((m,i)=>`<option value="${i}"${i===(save.selectedMap||0)?" selected":""}>${v17Esc(m.name)}</option>`).join("");
  let html=`<div class="lbBox"><h3>👤 প্রোফাইল</h3>`;
  if(p){ html+=`<div class="lbRow2"><b>${v17Esc(p.name)}</b> <span>${p.guest?"(গেস্ট)":"(নিবন্ধিত)"}</span><button class="lbBtn gray" id="lbLogout">এই ডিভাইস থেকে সরাও</button></div><div class="lbNote">লেভেল শেষ করলে স্কোর নিজে থেকে জমা হবে।${p.guest?" গেস্ট প্রোফাইল শুধু এই ডিভাইসে থাকে।":""}</div>`; }
  else { html+=`<div class="lbNote">স্কোর লিডারবোর্ডে দেখাতে গেস্ট হও অথবা রেজিস্টার করো।</div><div class="lbRow2"><button class="lbBtn blue" id="lbGuest">👤 গেস্ট হিসেবে খেলো</button></div><div class="lbRow2" style="margin-top:8px"><input id="lbName" placeholder="নাম" maxlength="20"><input id="lbEmail" type="email" placeholder="ইমেইল"><button class="lbBtn" id="lbReg">রেজিস্টার</button></div><div class="lbNote">ইমেইল যাচাই করা হয় না, পাসওয়ার্ডও নেই; অন্য ডিভাইসে একই প্রোফাইল ফেরানো যাবে না।</div>`; }
  if(v17Msg) html+=`<div class="lbNote lbErr">${v17Esc(v17Msg)}</div>`;
  html+=`</div><div class="lbTabs"><button class="lbBtn${v17Tab==="overall"?" on":""}" id="lbTabO">🏆 সামগ্রিক</button><button class="lbBtn${v17Tab==="level"?" on":""}" id="lbTabL">⏱ লেভেল অনুযায়ী</button></div>`;
  if(v17Tab==="level") html+=`<div class="lbBox"><div class="lbRow2"><select id="lbMap">${mapOpts}</select><input id="lbLevel" type="number" min="1" max="${TOTAL_LEVELS}" value="${currentLevel||1}"><button class="lbBtn blue" id="lbGo">দেখাও</button></div></div>`;
  html+=`<div id="lbList" class="lbBox"><div class="lbNote">লোড হচ্ছে…</div></div>`;
  box.innerHTML=html;
  const $=id=>document.getElementById(id);
  if($("lbGuest")) $("lbGuest").onclick=async()=>{ try{ const j=await v17Api("/api/register",{method:"POST",body:JSON.stringify({guest:true})}); v17SetProfile({id:j.id,token:j.token,name:j.name,guest:true}); v17Msg=""; v17Submit(); }catch(e){ v17Msg=e.message==="server-off"?"অনলাইন সার্ভার এখনো সংযুক্ত নয়।":e.message; } v17Render(); };
  if($("lbReg")) $("lbReg").onclick=async()=>{ try{ const j=await v17Api("/api/register",{method:"POST",body:JSON.stringify({name:$("lbName").value,email:$("lbEmail").value})}); v17SetProfile({id:j.id,token:j.token,name:j.name,guest:false}); v17Msg=""; v17Submit(); }catch(e){ v17Msg=e.message==="server-off"?"অনলাইন সার্ভার এখনো সংযুক্ত নয়।":e.message; } v17Render(); };
  if($("lbLogout")) $("lbLogout").onclick=()=>{ v17SetProfile(null); v17Msg=""; v17Render(); };
  $("lbTabO").onclick=()=>{ v17Tab="overall"; v17Render(); }; $("lbTabL").onclick=()=>{ v17Tab="level"; v17Render(); };
  if($("lbGo")) $("lbGo").onclick=()=>v17Load();
  v17Load();
}
async function v17Load(){
  const list=document.getElementById("lbList"); if(!list) return; const me=v17Profile();
  try{
    let q="type=overall"; if(v17Tab==="level"){ const m=document.getElementById("lbMap"), l=document.getElementById("lbLevel"); q=`type=level&map=${m?m.value:(save.selectedMap||0)}&level=${l?l.value:(currentLevel||1)}`; }
    const j=await v17Api("/api/leaderboard?"+q);
    if(!j.rows.length){ list.innerHTML=`<div class="lbNote">এখনো কেউ স্কোর দেয়নি। প্রথম হও!</div>`; return; }
    const head=v17Tab==="level"?"<tr><th>#</th><th>নাম</th><th>সময়</th></tr>":"<tr><th>#</th><th>নাম</th><th>শেষ করা</th><th>আনলকড</th><th>কয়েন</th></tr>";
    const rows=j.rows.map((r,i)=>{ const mine=me&&r.name===me.name; const nm=v17Esc(r.name)+(r.guest?" <small>(গেস্ট)</small>":"");
      return v17Tab==="level"?`<tr class="${mine?"me":""}"><td>${i+1}</td><td>${nm}</td><td>${v17Fmt(r.time)}</td></tr>`:`<tr class="${mine?"me":""}"><td>${i+1}</td><td>${nm}</td><td>${r.completed}</td><td>${r.unlocked}</td><td>${r.coins}</td></tr>`; }).join("");
    list.innerHTML=`<table class="lbTable">${head}${rows}</table>`;
  }catch(e){
    const best=Object.keys(save.best||{}).map(Number).sort((a,b)=>a-b).map(n=>`<tr><td>Level ${n}</td><td>${v17Fmt(save.best[n])}</td></tr>`).join("");
    list.innerHTML=`<div class="lbNote lbErr">${e.message==="server-off"||e instanceof TypeError?"অনলাইন সার্ভার এখনো সংযুক্ত নয়, তাই বিশ্বব্যাপী তালিকা দেখানো যাচ্ছে না।":v17Esc(e.message)}</div><h3>এই ডিভাইসের সেরা সময়</h3>${best?`<table class="lbTable">${best}</table>`:'<div class="lbNote">এখনো কোনো লেভেল শেষ করা হয়নি।</div>'}`;
  }
}
const v17HideBase=hideScreens;
hideScreens=function(){ v17HideBase(); const el=document.getElementById("leaderMenu"); if(el){el.classList.add("hidden");el.style.display="none";el.style.visibility="hidden";el.style.pointerEvents="none";} };
const v17ShowBase=showScreen;
showScreen=function(id){ v17ShowBase(id); if(id==="leaderMenu"){ document.getElementById("hud").classList.add("hidden"); document.getElementById("controls").classList.add("hidden"); } };
(function v17Wire(){
  const b=document.getElementById("leaderBtn"); if(b) b.onclick=()=>{ resumeAudio(); tone(500,.06,.05); showScreen("leaderMenu"); v17Render(); };
  const k=document.getElementById("backLeaderBtn"); if(k) k.onclick=()=>{ tone(330,.06,.05); goMain(); };
})();

// ============================================================
// v17.2 — ফোন লম্বালম্বি (portrait) মোডে খেলা: দুনিয়া ~৭৬০ একক চওড়া ধরে ছোট করে দেখানো হয়, যাতে গাড়ি ও রাস্তা আঁটে।
// W/H এখন "ভার্চুয়াল" মাপ (পর্দার মাপ ÷ k); ল্যান্ডস্কেপে k=1, আগের মতোই।
// ============================================================
window.__k=1; let v172Last="";
resizeCanvas=function(){
  const iw=innerWidth, ih=innerHeight, k=1; /* v17.3: portrait-স্কেল বন্ধ — ফোনে আড়াআড়ি ধরতে বলা হয় */
  window.__k=k; W=iw/k; H=ih/k; DPR=Math.min(window.devicePixelRatio||1,2);
  canvas.width=Math.floor(iw*DPR); canvas.height=Math.floor(ih*DPR);
  ctx.setTransform(DPR*k,0,0,DPR*k,0,0); v172Last=iw+"x"+ih+"@"+DPR;
};
v16CheckSize=function(){
  const dpr=Math.min(window.devicePixelRatio||1,2);
  if(v172Last!==innerWidth+"x"+innerHeight+"@"+dpr||canvas.width!==Math.floor(innerWidth*DPR)||canvas.height!==Math.floor(innerHeight*DPR)) resizeCanvas();
};
resizeCanvas();
// portrait: ঘড়িগুলো (RPM/FUEL/BOOST) নিচের বাটনের পেছনে ঢেকে যেত — বাটনের ওপরে তুলে আঁকা
const v172GaugeBase=drawGaugeCluster;
drawGaugeCluster=function(){ const k=window.__k||1; if(k>=1) return v172GaugeBase.apply(this,arguments); ctx.save(); ctx.translate(0,-165/k); try{ return v172GaugeBase.apply(this,arguments); } finally { ctx.restore(); } };

// ============================================================
// v17.3 — ফোন সবসময় আড়াআড়ি (landscape): লম্বা ধরলে "ফোন ঘোরাও" পর্দা + গেম থামে; PLAY চাপলে ফুলস্ক্রিন+landscape-lock চেষ্টা
// ============================================================
(function v173(){
  const coarse=()=>matchMedia("(pointer:coarse)").matches;
  function check(){
    const ov=document.getElementById("rotateOverlay");
    const portrait=innerHeight>innerWidth*1.05, show=coarse()&&portrait;
    if(ov) ov.classList.toggle("on",show);
    if(show&&typeof state!=="undefined"&&state==="play"){ try{ togglePause(); }catch(e){} }
  }
  ["resize","orientationchange"].forEach(ev=>addEventListener(ev,()=>setTimeout(check,80)));
  setInterval(check,1000); check();
  async function lockLandscape(){
    if(!coarse()) return;
    try{ if(!document.fullscreenElement&&document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen({navigationUI:"hide"}); }catch(e){}
    try{ if(screen.orientation&&screen.orientation.lock) await screen.orientation.lock("landscape"); }catch(e){}
  }
  addEventListener("pointerup",function once(e){ if(e.pointerType==="touch"){ lockLandscape(); removeEventListener("pointerup",once); } });
})();

// ============================================================
// v21 — বাস্তবসম্মত ২D পাহাড়: মাটির রং + ঘাসের ছোপ, ম্যাপ অনুযায়ী গাছ/বন/পাথর,
// খাদ আগের মতো খোলা (দুই পাড়ে পাথুরে কিনারা), পানিতে পাহাড়ের ছায়া-প্রতিবিম্ব।
// শুধু আঁকা বদলেছে — terrainY/খাদ/ফিজিক্স/কন্ট্রোল আগের মতোই। সব নিজের কোডে আঁকা।
// ============================================================
const V21=(function(){
  let C=ctx; // আঁকার context (টাইল ক্যাশে আঁকার সময় বদলায়)
  const polyC=(pts,fill)=>{ C.fillStyle=fill; C.beginPath(); pts.forEach((p,i)=>i?C.lineTo(p[0],p[1]):C.moveTo(p[0],p[1])); C.closePath(); C.fill(); };
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  const sh=(c,f)=>c.map(v=>f<0?v*(1+f):v+(255-v)*f);
  const css=(c,a)=>`rgba(${c.map(v=>Math.round(Math.max(0,Math.min(255,v)))).join(',')},${a==null?1:a})`;
  // ম্যাপ-থিম অনুযায়ী মাটি, ঘাস, পাথর আর গাছপালার সেট
  const BIOME={
    hills:       {soil:[128,98,68], grass:[96,142,62], rock:[120,118,112], veg:["pine","round","bush","rock","pine","oak"], forest:"pine", cover:.55},
    sajek:       {soil:[146,92,58], grass:[88,146,64], rock:[126,112,98],  veg:["round","banana","bamboo","coconut","bush","rock"], forest:"round", cover:.6},
    bandarban:   {soil:[118,90,62], grass:[74,130,64], rock:[110,112,108], veg:["round","banyan","bamboo","oak","bush","rock"], forest:"round", cover:.65},
    sylhet:      {soil:[132,94,62], grass:[86,150,60], rock:[118,114,104], veg:["tea","tea","tea","shade","bush"], forest:"shade", cover:.7},
    khagrachhari:{soil:[164,82,50], grass:[96,140,58], rock:[130,104,88],  veg:["bamboo","bamboo","round","coconut","bush","rock"], forest:"bamboo", cover:.5},
    kaptai:      {soil:[120,88,62], grass:[78,134,66], rock:[112,108,100], veg:["round","banana","coconut","coconut","bush","rock","oak"], forest:"round", cover:.6},
    jungle:      {soil:[92,70,48],  grass:[58,120,52], rock:[96,104,86],   veg:["big","banyan","fern","round","bush","oak"], forest:"big", cover:.75},
    canyon:      {soil:[170,100,62],grass:[120,140,70],rock:[150,96,66],   veg:["rock","rock","bush","dry","pine"], forest:null, cover:.2},
    autumn:      {soil:[130,88,58], grass:[170,130,60],rock:[118,108,98],  veg:["autumn","autumn","bush","rock","pine"], forest:"autumn", cover:.4},
    desert:      {soil:[212,168,108],grass:[170,150,80],rock:[150,112,80], veg:["cactus","rock","dry","dry","rock"], forest:null, cover:.08},
    ice:         {soil:[226,236,242],grass:[200,220,230],rock:[120,136,146],veg:["snowpine","snowpine","snowrock","snowrock","dry"], forest:"snowpine", cover:0},
    volcano:     {soil:[62,48,46],  grass:[78,84,56],  rock:[52,42,42],    veg:["rock","dead","rock","lava","dead"], forest:null, cover:.08},
    night:       {soil:[92,84,74],  grass:[70,110,70], rock:[100,100,100], veg:["bush","round","rock","lamp","bush"], forest:"round", cover:.45}
  };
  const B=()=>{ const m=maps[save.selectedMap]||maps[0]; return [m,BIOME[m.theme]||BIOME.hills]; };
  const hash=n=>{const s=Math.sin(n*12.9898+(save.selectedMap||0)*78.233+currentLevel*3.1)*43758.5453;return s-Math.floor(s);};
  const STEP=8, N=8, ease=t=>Math.pow(t,1.15), rad=t=>Math.round(t*42*6/8);

  // ---------- গাছপালা ----------
  const trunk=(x,y,w,h,c)=>{ C.fillStyle=c||"#5a3e28"; C.fillRect(x-w/2,y-h,w,h); };
  const blob=(x,y,r,c)=>{ C.fillStyle=c; C.beginPath(); C.arc(x,y,r,0,6.3); C.fill(); };
  function pine(x,y,s,c,snow){ trunk(x,y,4*s,14*s);
    for(let i=0;i<3;i++){ const yy=y-12*s-i*11*s, w=(15-i*3.5)*s;
      C.fillStyle=css(sh(c,-.15)); C.beginPath(); C.moveTo(x,yy-16*s); C.lineTo(x+w,yy); C.lineTo(x,yy); C.closePath(); C.fill();
      C.fillStyle=css(sh(c,.10)); C.beginPath(); C.moveTo(x,yy-16*s); C.lineTo(x-w,yy); C.lineTo(x,yy); C.closePath(); C.fill();
      if(snow){ C.fillStyle="rgba(250,252,255,.92)"; C.beginPath(); C.moveTo(x,yy-16*s); C.lineTo(x-w*.55,yy-7*s); C.lineTo(x+w*.4,yy-8*s); C.closePath(); C.fill(); } } }
  function round(x,y,s,c){ trunk(x,y,4.4*s,16*s); for(const [dx,dy,r,f] of [[0,-24,12,-.12],[-7,-19,8,0],[7,-20,8,-.2],[-3,-29,7,.14]]) blob(x+dx*s,y+dy*s,r*s,css(sh(c,f))); }
  function big(x,y,s,c){ trunk(x,y,6*s,26*s,"#4a3220"); for(const [dx,dy,r,f] of [[0,-38,16,-.15],[-12,-30,11,0],[12,-31,12,-.22],[-5,-46,10,.12],[8,-44,9,.05]]) blob(x+dx*s,y+dy*s,r*s,css(sh(c,f))); }
  function shade(x,y,s,c){ trunk(x,y,3*s,30*s,"#6a5038"); C.fillStyle=css(sh(c,-.1)); C.beginPath(); C.ellipse(x,y-33*s,17*s,7*s,0,0,6.3); C.fill(); C.fillStyle=css(sh(c,.1)); C.beginPath(); C.ellipse(x-4*s,y-36*s,10*s,4*s,0,0,6.3); C.fill(); }
  function bush(x,y,s,c){ for(const [dx,dy,r,f] of [[-6,-4,6,-.15],[5,-5,7,-.05],[0,-8,5,.15]]) blob(x+dx*s,y+dy*s,r*s,css(sh(c,f))); }
  function tea(x,y,s,c){ // চা-বাগানের গোল ঝোপের সারি
    for(let k=-1;k<=1;k++){ const xx=x+k*12*s; C.fillStyle=css(sh(c,-.18)); C.beginPath(); C.ellipse(xx,y-5*s,7*s,5.5*s,0,0,6.3); C.fill(); C.fillStyle=css(sh(c,.12)); C.beginPath(); C.ellipse(xx-1.5*s,y-7*s,4.5*s,3*s,0,0,6.3); C.fill(); } }
  function bamboo(x,y,s){ C.lineCap="round"; for(let k=0;k<5;k++){ const dx=(k-2)*3*s, h=(34+k*5%11)*s, lean=(k-2)*2.5*s; C.strokeStyle=k%2?"#7aa344":"#5f8a34"; C.lineWidth=2.2*s; C.beginPath(); C.moveTo(x+dx,y); C.quadraticCurveTo(x+dx+lean*.4,y-h*.5,x+dx+lean,y-h); C.stroke();
      C.fillStyle="#6c9a3c"; C.beginPath(); C.ellipse(x+dx+lean+3*s,y-h+2*s,6*s,1.8*s,-.5,0,6.3); C.fill(); C.beginPath(); C.ellipse(x+dx+lean*.7-4*s,y-h*.7,5*s,1.6*s,.5,0,6.3); C.fill(); } }
  function banana(x,y,s){ C.strokeStyle="#6b7a3a"; C.lineWidth=3*s; C.beginPath(); C.moveTo(x,y); C.lineTo(x+1*s,y-22*s); C.stroke();
    for(const [a,l] of [[-2.4,16],[-.7,16],[-1.9,13],[-1.1,13],[-1.55,11]]){ C.fillStyle="#5d9a3a"; C.save(); C.translate(x+1*s,y-22*s); C.rotate(a); C.beginPath(); C.ellipse(l*s*.5,0,l*s*.55,3.2*s,0,0,6.3); C.fill(); C.restore(); } }
  function fern(x,y,s,c){ C.strokeStyle=css(sh(c,-.05)); C.lineWidth=1.6*s; C.beginPath(); for(const a of [-2.6,-2.1,-1.6,-1.1,-.6]){ C.moveTo(x,y); C.quadraticCurveTo(x+Math.cos(a)*8*s,y+Math.sin(a)*12*s,x+Math.cos(a)*14*s,y+Math.sin(a)*9*s); } C.stroke(); }
  function rock(x,y,s,c,snow){
    C.fillStyle="rgba(0,0,0,.18)"; C.beginPath(); C.ellipse(x+3*s,y+1*s,17*s,3.5*s,0,0,6.3); C.fill();
    const A=[x-15*s,y],Bp=[x-9*s,y-13*s],Cq=[x+5*s,y-16*s],D=[x+15*s,y-5*s],E=[x+12*s,y+1*s],F=[x-1*s,y-6*s];
    polyC([A,Bp,Cq,F],css(sh(c,.22))); polyC([Cq,D,E,F],css(sh(c,-.25))); polyC([A,F,E],css(sh(c,-.05)));
    if(snow) polyC([[x-11*s,y-9*s],Bp,Cq,[x+9*s,y-12*s],[x-1*s,y-10*s]],"rgba(248,251,255,.95)"); }
  function cactus(x,y,s){ C.fillStyle="#4f7f3a"; C.fillRect(x-2.5*s,y-24*s,5*s,24*s); C.fillRect(x-9*s,y-16*s,4*s,9*s); C.fillRect(x-9*s,y-10*s,8*s,3*s); C.fillRect(x+5*s,y-19*s,4*s,8*s); C.fillRect(x+1*s,y-13*s,8*s,3*s); C.fillStyle="rgba(255,255,255,.18)"; C.fillRect(x-2.5*s,y-24*s,1.5*s,24*s); }
  function dry(x,y,s){ C.strokeStyle="#a08a52"; C.lineWidth=1.2*s; C.beginPath(); for(let i=-3;i<=3;i++){ C.moveTo(x+i*2*s,y); C.lineTo(x+i*3.6*s,y-(6+(i&1)*3)*s); } C.stroke(); }
  function dead(x,y,s){ C.strokeStyle="#2a2220"; C.lineWidth=2.4*s; C.lineCap="round"; C.beginPath(); C.moveTo(x,y); C.lineTo(x,y-24*s); C.moveTo(x,y-14*s); C.lineTo(x-8*s,y-22*s); C.moveTo(x,y-18*s); C.lineTo(x+7*s,y-27*s); C.stroke(); }
  function lava(x,y,s){ C.strokeStyle="rgba(255,96,36,.85)"; C.lineWidth=2*s; C.beginPath(); C.moveTo(x-12*s,y-2*s); C.lineTo(x-4*s,y-6*s); C.lineTo(x+3*s,y-3*s); C.lineTo(x+12*s,y-8*s); C.stroke(); }
  function lamp(x,y,s){ C.fillStyle="#2c3138"; C.fillRect(x-1.5*s,y-36*s,3*s,36*s); C.fillRect(x-1.5*s,y-36*s,10*s,2.5*s); blob(x+8*s,y-33*s,3*s,"#ffe9a8"); }
  function grassTuft(x,y,s,c){ C.strokeStyle=css(c); C.lineWidth=1.3*s; C.beginPath(); for(let i=-3;i<=3;i++){ C.moveTo(x+i*2.5*s,y); C.lineTo(x+i*3.4*s,y-(5+(i&1)*3)*s); } C.stroke(); }
  // v28: আসল ৩D গাছের মডেল থেকে আগে বানানো ছবি (models/trees/*.webp, ক্রেডিট: docs/ASSET_CREDITS.md)।
  // লোড হলে টাইল আবার আঁকা হয়; লোড না হলে আগের কোডে আঁকা গাছ।
  const SPR={}, SPR_H={bamboo:86,coconut:120,autumn:84,oak:82,banyan:92,fern:38,dead:68,round:68,shade:86,big:94};
  const SPR_SRC={bamboo:["bamboo"],coconut:["coconut"],autumn:["autumn"],oak:["oak"],banyan:["banyan"],big:["banyan","oak"],fern:["fern"],dead:["dead"],round:["round"],shade:["shade"]};
  (function loadSprites(){ if(typeof Image==="undefined") return; const names=["bamboo","coconut","autumn","oak","banyan","fern","dead","round","shade"]; let left=names.length*3;
    for(const nm of names){ SPR[nm]=[]; for(let k=0;k<3;k++){ const im=new Image(); im.decoding="async";
      im.onload=im.onerror=()=>{ if(--left===0) window.__treeVer=(window.__treeVer||0)+1; }; im.src="models/trees/"+nm+"_"+k+".webp"; SPR[nm].push(im); } } })();
  function sprite(type,x,y,s){
    const src=SPR_SRC[type]; if(!src) return false; const nm=src[Math.floor(hash(x*.53+y*.07+1.7)*src.length)%src.length], arr=SPR[nm]; if(!arr) return false;
    const im=arr[Math.floor(hash(x*.91+y*.17)*arr.length)%arr.length]; if(!im||!im.complete||!im.naturalWidth) return false;
    const h=(SPR_H[type]||56)*s*(.85+hash(x*.37)*.3), w=h*im.naturalWidth/im.naturalHeight, flip=hash(x*1.31+.2)<.5;
    C.fillStyle="rgba(0,0,0,.16)"; C.beginPath(); C.ellipse(x+2*s,y+1*s,Math.min(w*.32,22*s),3*s,0,0,6.3); C.fill();
    C.save(); C.translate(x,y+2*s); if(flip) C.scale(-1,1); C.drawImage(im,-w/2,-h,w,h); C.restore(); return true; }
  function plant(type,x,y,s,b){
    if(sprite(type,x,y,s)) return;
    const g=b.grass, leaf=sh(mix(g,[30,90,40],.45),-.18);
    switch(type){
      case "pine": return pine(x,y,s,sh(leaf,-.05));
      case "snowpine": return pine(x,y,s,[64,104,96],true);
      case "round": return round(x,y,s,leaf);
      case "big": case "oak": case "banyan": return big(x,y,s,sh(leaf,-.1));
      case "coconut": return banana(x,y,s);
      case "shade": return shade(x,y,s,leaf);
      case "autumn": return round(x,y,s,hash(x*.3)<.5?[206,96,40]:[226,160,52]);
      case "bush": return bush(x,y,s,sh(leaf,.05));
      case "tea": return tea(x,y,s,[60,128,52]);
      case "bamboo": return bamboo(x,y,s);
      case "banana": return banana(x,y,s);
      case "fern": return fern(x,y,s,leaf);
      case "rock": return rock(x,y,s*.9,b.rock);
      case "snowrock": return rock(x,y,s,b.rock,true);
      case "cactus": return cactus(x,y,s);
      case "dry": return dry(x,y,s);
      case "dead": return dead(x,y,s);
      case "lava": return lava(x,y,s);
      case "lamp": return lamp(x,y,s);
    } }

  let last=null; // পানির প্রতিবিম্বের জন্য শেষ ফ্রেমের পাহাড়ের রেখা
  function draw(){
    const [m,b]=B(), floor=H-118, MARGIN=280, x0=Math.floor((camera.x-MARGIN)/STEP)*STEP, x1=camera.x+W+MARGIN, n=Math.ceil((x1-x0)/STEP)+1;
    const X=new Float64Array(n), Y=new Float64Array(n), G=new Uint8Array(n);
    for(let i=0;i<n;i++){ const x=x0+i*STEP; X[i]=x-camera.x; Y[i]=terrainY(x); G[i]=isGap(x)?1:0; }
    // শক্ত মাটির টুকরা (খাদ দিয়ে আলাদা)
    const runs=[]; for(let i=0;i<n;i++){ if(G[i]) continue; let j=i; while(j+1<n&&!G[j+1]) j++; if(j>i) runs.push([i,j]); i=j; }
    const top=sh(mix(b.soil,b.grass,b.cover*.55),-.02), low=sh(b.soil,-.42);
    last={X,Y,G,runs,floor};
    for(const [ra,rb] of runs){
      const cnt=rb-ra+1, S=new Float64Array(cnt+1); for(let q=0;q<cnt;q++) S[q+1]=S[q]+Y[ra+q];
      const sm=(i,r)=>{ if(r<=0) return Y[i]; const lo=Math.max(ra,i-r), hi=Math.min(rb,i+r); return (S[hi-ra+1]-S[lo-ra])/(hi-lo+1); };
      const lineAt=(i,t)=>{ const v=sm(i,rad(t)); return v+(floor+8-v)*ease(t); };
      const L=[]; for(let k=0;k<=N;k++){ const t=k/N, arr=new Float64Array(cnt); for(let q=0;q<cnt;q++) arr[q]=lineAt(ra+q,t); L.push(arr); }
      const gapL=ra>0&&G[ra-1], gapR=rb<n-1&&G[rb+1];
      const xl=X[ra]+(gapL?0:-STEP), xr=X[rb]+(gapR?0:STEP);
      // ১) ঢাল: মাটির রঙে স্তর (উপরে ঘাস-মেশানো, নিচে গাঢ় মাটি)
      for(let k=0;k<N;k++){ const t=k/N, A=L[k], Bn=L[k+1];
        C.fillStyle=css(mix(top,low,Math.pow(t,.85))); C.beginPath(); C.moveTo(xl,A[0]);
        for(let q=0;q<cnt;q++) C.lineTo(X[ra+q],A[q]); C.lineTo(xr,A[cnt-1]); C.lineTo(xr,Bn[cnt-1]+.8);
        for(let q=cnt-1;q>=0;q--) C.lineTo(X[ra+q],Bn[q]+.8); C.lineTo(xl,Bn[0]+.8); C.closePath(); C.fill();
        if(k>6) continue; const fade=1-t*.75;
        for(let q=0;q+2<cnt;q+=2){ const lo=Math.max(0,q-3), hi=Math.min(cnt-1,q+5), sl=(A[hi]-A[lo])/(STEP*Math.max(1,hi-lo)); const lit=sl<0, al=Math.min(lit?.20:.30,Math.abs(sl)*(lit?.36:.48))*fade; if(al<.025) continue;
          C.fillStyle=lit?`rgba(255,240,205,${al})`:`rgba(18,10,4,${al})`; C.beginPath(); C.moveTo(X[ra+q],A[q]); C.lineTo(X[ra+q+2]+.5,A[q+2]); C.lineTo(X[ra+q+2]+.5,Bn[q+2]+.8); C.lineTo(X[ra+q],Bn[q]+.8); C.closePath(); C.fill(); } }
      // ২) ঘাসের ছোপ (ঝোপালো গুচ্ছ + ঘাসের ডগা) — খাড়া ঢালে কম, চূড়ার কাছে বেশি
      if(b.cover>0){ for(let q=1;q<cnt-1;q++){ const wx=x0+(ra+q)*STEP; if(wx%16!==0) continue; const h1=hash(wx*.37+.5), h2=hash(wx*.71+3.3); const t=.03+h2*.82;
          const steep=Math.abs(Y[Math.min(rb,ra+q+2)]-Y[Math.max(ra,ra+q-2)])/(STEP*4); if(h1>b.cover*(1.25-t*.5)-steep*.6) continue;
          const y=lineAt(ra+q,t); if(y>floor-3) continue; const s=.55+t*1.05, xx=X[ra+q]+(h1-.5)*12, gc=mix(b.grass,sh(b.grass,-.38),h2*.7+t*.3), w=(7+h2*9)*s;
          C.fillStyle=css(sh(gc,-.12),.9); C.beginPath(); C.ellipse(xx,y,w,3.2*s,0,0,6.3); C.fill();
          C.fillStyle=css(gc,.95); C.beginPath(); C.ellipse(xx-w*.35,y-1.6*s,w*.55,2.8*s,0,0,6.3); C.ellipse(xx+w*.3,y-1.2*s,w*.5,2.5*s,0,0,6.3); C.fill();
          C.strokeStyle=css(sh(gc,.12)); C.lineWidth=1.1*s; C.beginPath(); for(let k=-2;k<=2;k++){ const bx=xx+k*w*.33; C.moveTo(bx,y-1*s); C.lineTo(bx+(k*.8)*s,y-(4.5+((k+5)%3)*1.8)*s); } C.stroke(); } }
      for(let q=2;q<cnt-2;q+=3){ const wx=x0+(ra+q)*STEP, h=hash(wx*.13+9.1); if(h>.22) continue; const t=.15+hash(wx*.29)*.7, y=lineAt(ra+q,t); if(y>floor-4) continue; const s=.6+t;
        C.fillStyle=css(sh(b.soil,-.25),.35); C.beginPath(); C.ellipse(X[ra+q],y,6*s,1.6*s,0,0,6.3); C.fill(); // ছোট পাথর/মাটির দলা
        C.fillStyle=css(sh(b.soil,.25),.4); C.beginPath(); C.ellipse(X[ra+q]-1*s,y-1*s,3*s,1*s,0,0,6.3); C.fill(); }
      // ৩) খাদের পাড়: প্রাকৃতিক পাথুরে খাড়া কিনারা (খাদ খোলা থাকে, আগের মতো)
      const cliff=(side)=>{ const q=side<0?0:cnt-1, ex=side<0?xl:xr, ey=Y[ra+q]; const bot=floor+8, dir=-side;
        const pts=[[ex,ey+2]]; for(let k=1;k<=8;k++){ const yy=ey+(bot-ey)*k/8, j=(hash(ex*.1+k*7.7)-.5)*7; pts.push([ex+dir*(k*1.6)+j*(side<0?1:-1)*.6+(side<0?j:-j)*.4,yy]); }
        pts.push([ex+dir*22,bot]); pts.push([ex+dir*22,ey+8]);
        const g=C.createLinearGradient(0,ey,0,bot); g.addColorStop(0,css(sh(b.rock,side<0?.12:-.2))); g.addColorStop(1,css(sh(b.rock,-.55)));
        C.fillStyle=g; C.beginPath(); pts.forEach((p,k)=>k?C.lineTo(p[0],p[1]):C.moveTo(p[0],p[1])); C.closePath(); C.fill();
        C.strokeStyle="rgba(0,0,0,.25)"; C.lineWidth=1.2; C.beginPath(); for(let k=1;k<8;k+=2){ C.moveTo(pts[k][0],pts[k][1]); C.lineTo(pts[k][0]+dir*12,pts[k][1]+5); } C.stroke();
        C.strokeStyle=css(sh(b.rock,side<0?.35:-.35),.9); C.lineWidth=2; C.beginPath(); pts.slice(0,9).forEach((p,k)=>k?C.lineTo(p[0],p[1]):C.moveTo(p[0],p[1])); C.stroke();
        rock(ex+dir*9,ey+14,.42,b.rock,m.theme==="ice"); };
      if(gapL) cliff(-1); if(gapR) cliff(1);
    }
    // গোড়ায় হালকা ছায়া
    { const g=C.createLinearGradient(0,floor-36,0,floor+8); g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,.2)"); C.fillStyle=g;
      for(const [ra,rb] of runs) C.fillRect(X[ra],floor-36,X[rb]-X[ra],44); }

    // ৪) চূড়ার পেছনে বন (ম্যাপ অনুযায়ী) — রাস্তার পেছনে ছোট গাছের সারি
    const forest=b.forest;
    if(forest){ for(let gx=Math.floor((camera.x-40)/34)*34; gx<camera.x+W+40; gx+=34){ const h=hash(gx*.61+4.4); if(h>.62) continue; const i=Math.round((gx-x0)/STEP); if(i<1||i>n-2||G[i]||G[i-1]||G[i+1]) continue;
        const y=Y[i]-7; C.globalAlpha=.88; plant(forest,X[i]+(h-.3)*20,y,.55+h*.35,b); C.globalAlpha=1; } }
    // ৫) ঢালের গাছপালা/পাথর — উপরের (দূরের) আগে, নিচের (কাছের) পরে
    const items=[];
    for(let gx=Math.floor((camera.x-60)/40)*40; gx<camera.x+W+60; gx+=40){
      const h1=hash(gx*.71+1.3), h2=hash(gx*.33+7.1), wx=gx+(h1-.5)*30, i=Math.round((wx-x0)/STEP); if(i<2||i>n-3) continue;
      let ok=true; for(let q=i-4;q<=i+4;q++) if(q<0||q>=n||G[q]) { ok=false; break; } if(!ok) continue;
      const run=runs.find(r=>i>=r[0]&&i<=r[1]); if(!run) continue;
      const t=.12+h2*.76, r=rad(t), lo=Math.max(run[0],i-r), hi=Math.min(run[1],i+r); let v=0; for(let q=lo;q<=hi;q++) v+=Y[q]; v/=(hi-lo+1);
      const y=v+(floor+8-v)*ease(t); if(y>floor-4) continue;
      items.push([t,wx-camera.x,y,b.veg[Math.floor(hash(gx*1.7+.4)*b.veg.length)]]); }
    items.sort((a,c)=>a[0]-c[0]);
    for(const [t,x,y,type] of items) plant(type,x,y,.55+t*.95,b);

    // ৬) চূড়ার রাস্তা: মাটির পথ, চাকার দাগ, ঘাসের কিনারা
    const path=m.theme==="ice"?[214,226,232]:m.theme==="desert"?[196,150,92]:m.theme==="volcano"?[88,72,64]:mix(b.soil,[150,112,74],.45);
    const verge=b.cover>.15?sh(b.grass,-.04):sh(b.soil,.08);
    const P=(ra,rb,dy)=>{ C.beginPath(); for(let q=ra;q<=rb;q++) q===ra?C.moveTo(X[q],Y[q]+dy):C.lineTo(X[q],Y[q]+dy); };
    C.lineCap="butt"; C.lineJoin="round";
    for(const [ra,rb] of runs){
      C.strokeStyle="rgba(0,0,0,.14)"; C.lineWidth=14; P(ra,rb,17); C.stroke();
      C.strokeStyle=css(verge); C.lineWidth=20; P(ra,rb,0); C.stroke();
      C.strokeStyle=css(path); C.lineWidth=9; P(ra,rb,-1); C.stroke();
      C.strokeStyle=css(sh(path,-.3),.55); C.lineWidth=1.6; P(ra,rb,-3.5); C.stroke(); P(ra,rb,1.6); C.stroke();
      C.strokeStyle="rgba(255,255,230,.32)"; C.lineWidth=2; P(ra,rb,-9.5); C.stroke();
      if(b.cover>.15){ C.strokeStyle=css(sh(verge,-.28)); C.lineWidth=1.4; C.beginPath();
        for(let q=ra;q<=rb;q++){ const hh=3+((q*7)%5); C.moveTo(X[q],Y[q]+11); C.lineTo(X[q]+1.5,Y[q]+11-hh); C.moveTo(X[q]+4,Y[q]+11); C.lineTo(X[q]+5,Y[q]+12-hh*.7); } C.stroke(); }
    }
    if(typeof v23DrawRocks==="function") v23DrawRocks(C,b,camera.x,W);
  }

  // ---------- পানি: শান্ত, গভীর রং, পাহাড়ের প্রতিবিম্ব, হালকা ঢেউ ----------
  function water(){
    const m=maps[save.selectedMap]||maps[0], wy=H-118, t=performance.now()/1000, base=(()=>{ const h=String(m.water||"#2a8fb8").replace('#',''); const v=parseInt(h,16); return [v>>16&255,v>>8&255,v&255]; })();
    const g=C.createLinearGradient(0,wy,0,H); g.addColorStop(0,css(mix(base,[170,210,225],.35))); g.addColorStop(.35,css(sh(base,-.25))); g.addColorStop(1,css(sh(base,-.62)));
    C.fillStyle=g; C.fillRect(0,wy,W,H-wy);
    // পাহাড়ের প্রতিবিম্ব (আগের ফ্রেমের রেখা উল্টে)
    { const floor=wy, X=[], Y=[], runs=[]; let st=-1;
      for(let x=-24;x<=W+24;x+=12){ const wx=x+camera.x, i=X.length; X.push(x); Y.push(terrainY(wx)); if(isGap(wx)){ if(st>=0&&i-1>st) runs.push([st,i-1]); st=-1; } else if(st<0) st=i; }
      if(st>=0&&X.length-1>st) runs.push([st,X.length-1]);
      C.save(); C.beginPath(); C.rect(0,wy,W,H-wy); C.clip();
      C.fillStyle="rgba(10,30,30,.30)";
      for(const [ra,rb] of runs){ C.beginPath(); C.moveTo(X[ra],wy); for(let q=ra;q<=rb;q++){ const d=floor-Y[q]; C.lineTo(X[q]+Math.sin(q*.9+t*2)*1.5,wy+d*.55); } C.lineTo(X[rb],wy); C.closePath(); C.fill(); }
      C.restore(); }
    // নরম ঢেউয়ের রেখা (কম, ধীরে চলে)
    for(let r=0;r<9;r++){ const y=wy+8+r*r*1.5+r*4; if(y>H) break; const a=.10+.12*(1-r/9);
      C.strokeStyle=`rgba(235,250,255,${a})`; C.lineWidth=1+(r<3?.6:0);
      for(let k=0;k<6;k++){ const len=40+((k*37+r*13)%60), x=((k*211+r*97-camera.x*(.25+r*.03)+t*12*(r%2?1:-1))%(W+200)+W+200)%(W+200)-100;
        C.beginPath(); C.moveTo(x,y); C.quadraticCurveTo(x+len/2,y-1.5,x+len,y); C.stroke(); } }
    // তীরের ফেনা
    C.strokeStyle="rgba(255,255,255,.55)"; C.lineWidth=2; C.beginPath(); for(let x=0;x<=W;x+=12){ const y=wy+1.5+Math.sin(x*.05+t*1.8)*1.2; x?C.lineTo(x,y):C.moveTo(x,y); } C.stroke();
    // আকাশের ঝিলিক
    const sg=C.createLinearGradient(0,wy,0,wy+40); sg.addColorStop(0,"rgba(255,255,255,.18)"); sg.addColorStop(1,"rgba(255,255,255,0)"); C.fillStyle=sg; C.fillRect(0,wy,W,40);
  }
  // ---------- টাইল ক্যাশ: পাহাড় একবার ৫১২px চওড়া টুকরায় এঁকে রাখা হয়, প্রতি ফ্রেমে শুধু বসানো (অনেক দ্রুত) ----------
  const TILE=512, cache=new Map(); let key="";
  function renderTile(i){
    const c=document.createElement("canvas"); c.width=Math.ceil(TILE*DPR); c.height=Math.ceil(H*DPR);
    const cx=c.getContext("2d"), sx=camera.x, sw=W;
    C=cx; camera.x=i*TILE; W=TILE;
    try{ cx.setTransform(DPR,0,0,DPR,0,0); draw(); } finally { C=ctx; camera.x=sx; W=sw; }
    return c; }
  function drawTiles(){
    const k=[currentLevel,save.selectedMap,H,DPR,(typeof endlessMode!=="undefined"&&endlessMode)?1:0,window.__treeVer||0].join("|");
    if(k!==key){ cache.clear(); key=k; }
    const first=Math.floor(camera.x/TILE), lastT=Math.floor((camera.x+W)/TILE);
    let made=0;
    for(let i=first;i<=lastT+1;i++){ let c=cache.get(i);
      if(!c){ if(i>lastT&&made>0) continue; c=renderTile(i); made++; }
      cache.delete(i); cache.set(i,c);
      if(i<=lastT) ctx.drawImage(c,i*TILE-camera.x,0,TILE,H); }
    while(cache.size>7) cache.delete(cache.keys().next().value); }
  return {draw,water,drawTiles,BIOME};
})();
drawPremiumWater=function(){ try{ V21.water(); }catch(e){} };
drawTerrain=function(){
  try{ V21.drawTiles(); }catch(e){ try{ v163TerrainBase.apply(this,arguments); }catch(_){} }
  try{ v163DrawDetails(); }catch(e){}
};

// ============================================================
// v22 — দিন / বিকেল / রাত + বৃষ্টি / রোদ, আর গাড়ির হেডলাইট।
// প্রতি লেভেল+ম্যাপে নির্দিষ্ট সময় ও আবহাওয়া (একই লেভেলে সবসময় একই)। আলো কম হলে হেডলাইট জ্বলে,
// আর শুধু হেডলাইটের আলোয় সামনের রাস্তা দেখা যায়। শুধু আঁকা — ফিজিক্স আগের মতো (বৃষ্টির grip আগের নিয়মে)।
// ============================================================
function timeOfDay(){
  const m=maps[save.selectedMap]||maps[0];
  if(m.theme==="night") return "night";
  if(typeof window.__forceTod==="string") return window.__forceTod;
  const h=hashSeed(currentLevel*71.31+(save.selectedMap||0)*19.73+5.1);
  return h<.46?"day":h<.70?"evening":"night";
}
(function v22(){
  const BD=["sajek","bandarban","sylhet","khagrachhari","kaptai"];
  const wBase=weatherForLevel;
  weatherForLevel=function(){
    if(typeof window.__forceWeather==="string") return window.__forceWeather;
    const m=maps[save.selectedMap]||maps[0];
    if(BD.includes(m.theme)){ const h=hashSeed(currentLevel*131.7+(save.selectedMap||0)*977.3); return h<.52?"clear":h<.86?"rain":"wind"; }
    return wBase.apply(this,arguments);
  };
  const badgeBase=updateWeatherBadge;
  updateWeatherBadge=function(){ badgeBase.apply(this,arguments); const el=document.getElementById("weatherBadge"); if(!el) return;
    const tod=timeOfDay(), w=currentWeather; let icon=el.textContent;
    if(tod==="night") icon=w==="rain"?"🌧":"🌙"; else if(tod==="evening"&&w==="clear") icon="🌅";
    if(el.textContent!==icon) el.textContent=icon; };

  let lc=null, lx=null, sc=null, sx=null, bc=null, bx=null, flash=0, nextFlash=4;
  const V22_FILTER=(()=>{ try{ const c=document.createElement('canvas').getContext('2d'); c.filter='blur(1px)'; return c.filter==='blur(1px)'; }catch(e){ return false; } })();
  function lampPos(){ const a=truck.angle, ca=Math.cos(a), sa=Math.sin(a), kd=(vehiclesV22[save.selectedVehicle]||{}).kind, L=(typeof v26Lamp!=="undefined"&&v26Lamp)?v26Lamp:({bus:[74,-16],cng:[65,-8]}[kd]||[60,-14]), lx0=L[0], ly0=L[1];
    return [truck.x-camera.x+ca*lx0-sa*ly0, truck.y+sa*lx0+ca*ly0, a]; }
  function clipAboveGround(c,x0,x1){ c.beginPath(); c.moveTo(x0,-60); for(let x=x0;x<=x1;x+=8){ const wx=x+camera.x; c.lineTo(x,isGap(wx)?H+60:terrainY(wx)-3); } c.lineTo(x1,-60); c.closePath(); c.clip(); }
  function beam(c,hx,hy,dir,len,alpha,col){ for(const [sp,k] of [[.08,1],[.15,.6],[.24,.32]]){ const g=c.createRadialGradient(hx,hy,3,hx,hy,len); g.addColorStop(0,col(alpha*k)); g.addColorStop(.55,col(alpha*k*.4)); g.addColorStop(1,col(0)); c.fillStyle=g; cone(c,hx,hy,dir,len,sp); c.fill(); } }
  const V22_LAYERS=[[-3,20,1],[-24,48,.6],[-60,56,.26]];
  // রাস্তা-বরাবর আলো: রাস্তার রেখা ধরে কয়েক স্তরের নরম আলো (দূরে গেলে কমে), খাদে ভেঙে যায়
  // রাস্তায় পড়া আলো: প্রতিটা বিন্দুর জন্য হিসাব — রশ্মির ভেতরে কিনা, দূরত্ব কত, মাঝে পাহাড়ের আড়াল আছে কিনা
  function roadLight(c,hx,hy,dir,L,col,strength){
    const pts=[];
    for(let x=hx-50;x<=hx+L;x+=10){ const wx=x+camera.x; if(isGap(wx)){ pts.push(null); continue; }
      const y=terrainY(wx), dx=x-hx, dy=y-hy, d=Math.hypot(dx,dy);
      const diff=Math.abs(Math.atan2(dy,Math.max(1,dx))-dir);
      let v=dx>0?Math.max(0,1-Math.max(0,diff-.20)/.40):0;          // রশ্মির কোণ (মাঝে পুরো, কিনারায় কমে)
      v*=Math.pow(Math.max(0,1-d/L),.8);                           // দূরে গেলে কমে
      if(v>0&&dx>30){ for(let t=.15;t<.96;t+=.12){ const ox=hx+dx*t, oy=hy+dy*t, owx=ox+camera.x; if(!isGap(owx)&&terrainY(owx)<oy-5){ v=0; break; } } } // পাহাড়ের আড়াল
      v=Math.max(v,.8*Math.max(0,1-d/170));                          // বাতির ঠিক সামনে/নিচে ছড়ানো আলো
      pts.push([x,y,v*strength]); }
    c.lineCap="butt";
    for(const [oy,w,al] of V22_LAYERS){ c.lineWidth=w;
      for(let i=1;i<pts.length;i++){ const p0=pts[i-1], p1=pts[i]; if(!p0||!p1) continue; const v=(p0[2]+p1[2])/2*al; if(v<.02) continue;
        c.strokeStyle=col(v); c.beginPath(); c.moveTo(p0[0],p0[1]+oy); c.lineTo(p1[0],p1[1]+oy); c.stroke(); } } }
  // রশ্মির দিক: গাড়ির দিক আর সামনের রাস্তার দিকের মাঝামাঝি (একটু নিচে — low beam)
  function beamDir(hx,hy,a){ const wx=hx+camera.x+170, ry=isGap(wx)?hy+40:terrainY(wx)-12; const rd=Math.atan2(ry-hy,170); let d=a+.10; d=d+(rd-d)*.55; return d; }
  function cone(c,x,y,a,len,spread){ c.beginPath(); c.moveTo(x,y); c.lineTo(x+Math.cos(a-spread)*len,y+Math.sin(a-spread)*len);
    c.quadraticCurveTo(x+Math.cos(a)*len*1.08,y+Math.sin(a)*len*1.08,x+Math.cos(a+spread)*len,y+Math.sin(a+spread)*len); c.closePath(); }
  drawNightOverlay=function(){
    if(typeof state==="undefined"||state==="menu") return;
    const tod=timeOfDay(), w=currentWeather, wet=w==="rain"||w==="snow"||w==="sandstorm", now=performance.now()/1000, LT=v25Light();
    // রোদ: সূর্য যেখানে, সেখান থেকে উষ্ণ আলো ও রশ্মি (মেঘ/বৃষ্টিতে কমে)
    const sunI=LT.sun*(1-LT.rain)*(1-LT.warm*.5);
    if(sunI>.04){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=sunI; const ox=LT.sx, oy=LT.sy;
      const g=ctx.createRadialGradient(ox,oy,10,ox,oy,Math.max(W,H)*.75); g.addColorStop(0,"rgba(255,236,170,.30)"); g.addColorStop(.5,"rgba(255,220,150,.07)"); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
      for(let k=0;k<5;k++){ const a=.35+k*.17+Math.sin(now*.15+k)*.02; ctx.fillStyle="rgba(255,240,190,.035)"; ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(ox+Math.cos(a-.035)*W*1.3,oy+Math.sin(a-.035)*W*1.3); ctx.lineTo(ox+Math.cos(a+.035)*W*1.3,oy+Math.sin(a+.035)*W*1.3); ctx.closePath(); ctx.fill(); }
      ctx.restore(); }
    // বিকেল: কমলা আভা
    if(LT.warm>.03){ ctx.save(); ctx.globalAlpha=Math.min(1,LT.warm); const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,"rgba(255,120,40,.26)"); g.addColorStop(.6,"rgba(255,150,70,.12)"); g.addColorStop(1,"rgba(80,30,60,.18)"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); ctx.restore(); }
    let dark=LT.dark;
    // বৃষ্টির রাতে মাঝে মাঝে বিদ্যুৎ চমক
    if(false&&w==="rain"){ if(now>nextFlash){ flash=1; nextFlash=now+5+Math.random()*9; } }
    if(dark<.04) return;
    // কম-রেজোলিউশনের ক্যানভাসে আলো আঁকা হয়, তারপর ঝাপসা করে বড় করে বসানো হয় — আলোর কিনারা নরম, দাগ থাকে না, খরচও কম
    const q=1/5, sw=Math.max(2,Math.ceil(W*q)), shh=Math.max(2,Math.ceil(H*q));
    if(!lc){ lc=document.createElement("canvas"); lx=lc.getContext("2d"); sc=document.createElement("canvas"); sx=sc.getContext("2d"); bc=document.createElement("canvas"); bx=bc.getContext("2d"); }
    for(const cv of [lc,sc,bc]) if(cv.width!==sw||cv.height!==shh){ cv.width=sw; cv.height=shh; }
    const lightsOn=dark>=.2;
    // ১) আলোর নকশা (উষ্ণ হলুদ রঙে)
    sx.setTransform(1,0,0,1,0,0); sx.globalCompositeOperation="source-over"; sx.globalAlpha=1; sx.clearRect(0,0,sw,shh); sx.setTransform(q,0,0,q,0,0);
    if(lightsOn){ const [hx,hy,a]=lampPos(), dir=beamDir(hx,hy,a), warm=v=>`rgba(255,228,170,${v})`;
      sx.save(); clipAboveGround(sx,hx-40,hx+420); beam(sx,hx,hy,dir,380,.36,warm); sx.restore();   // বাতাসে হালকা রশ্মি (পাহাড় ভেদ করে না)
      roadLight(sx,hx,hy,dir,Math.min(600,Math.max(420,W*.5)),warm,1);                                 // রাস্তায় পড়া আসল আলো
      const g2=sx.createRadialGradient(truck.x-camera.x,truck.y-10,10,truck.x-camera.x,truck.y-10,120); g2.addColorStop(0,"rgba(255,228,170,.45)"); g2.addColorStop(1,"rgba(255,228,170,0)");
      sx.fillStyle=g2; sx.fillRect(truck.x-camera.x-130,truck.y-140,260,260); }
    // ২) ঝাপসা কপি
    bx.setTransform(1,0,0,1,0,0); bx.clearRect(0,0,sw,shh);
    if(V22_FILTER) bx.filter="blur(1.6px)"; bx.drawImage(sc,0,0); if(V22_FILTER) bx.filter="none";
    // ৩) অন্ধকারের মুখোশ: অন্ধকার − আলো
    lx.setTransform(1,0,0,1,0,0); lx.globalCompositeOperation="source-over"; lx.clearRect(0,0,sw,shh);
    lx.fillStyle=tod==="night"?`rgba(3,8,22,${dark})`:`rgba(28,22,40,${dark})`; lx.fillRect(0,0,sw,shh);
    lx.globalCompositeOperation="destination-out"; lx.drawImage(bc,0,0);
    if(flash>0){ lx.fillStyle=`rgba(0,0,0,${Math.min(1,flash)*.85})`; lx.fillRect(0,0,sw,shh); flash-=.06; }
    ctx.save(); ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality="low"; ctx.drawImage(lc,0,0,W,H);
    // ৪) আলোর উষ্ণ আভা
    if(lightsOn){ ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=.40; ctx.drawImage(bc,0,0,W,H); ctx.globalAlpha=1; }
    ctx.restore();
    if(lightsOn){ const [hx,hy,a]=lampPos(), ca=Math.cos(a), sa=Math.sin(a);
      ctx.save(); ctx.globalCompositeOperation="lighter";
      const lg=ctx.createRadialGradient(hx,hy,0,hx,hy,20); lg.addColorStop(0,"rgba(255,250,225,.9)"); lg.addColorStop(1,"rgba(255,240,180,0)"); ctx.fillStyle=lg; ctx.beginPath(); ctx.arc(hx,hy,20,0,6.3); ctx.fill();
      // পেছনের লাল বাতি
      const TL=(typeof v27Tail!=="undefined"&&v27Tail)?v27Tail:[-62,-12], tx=truck.x-camera.x+ca*TL[0]-sa*TL[1], ty=truck.y+sa*TL[0]+ca*TL[1]; const tg=ctx.createRadialGradient(tx,ty,0,tx,ty,15); tg.addColorStop(0,"rgba(255,60,50,.85)"); tg.addColorStop(1,"rgba(255,40,30,0)"); ctx.fillStyle=tg; ctx.beginPath(); ctx.arc(tx,ty,15,0,6.3); ctx.fill();
      ctx.restore(); }
    // রাতে চাঁদ (মেঘ/বৃষ্টি না থাকলে)
    if(LT.moon>.04&&LT.rain<.6){ const mx=LT.mx, my=LT.my; ctx.save(); ctx.globalAlpha=LT.moon*(1-LT.rain); const mg=ctx.createRadialGradient(mx,my,10,mx,my,90); mg.addColorStop(0,"rgba(230,238,255,.35)"); mg.addColorStop(1,"rgba(230,238,255,0)"); ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(mx,my,90,0,6.3); ctx.fill();
      ctx.fillStyle="#eef2ff"; ctx.beginPath(); ctx.arc(mx,my,20,0,6.3); ctx.fill(); ctx.fillStyle="rgba(180,190,215,.5)"; ctx.beginPath(); ctx.arc(mx-6,my-4,4,0,6.3); ctx.arc(mx+6,my+6,3,0,6.3); ctx.fill(); ctx.restore(); }
  };
})();

// ============================================================
// v23 — শুরুর লেভেল দিনে, উজ্জ্বল হেডলাইট, লম্বা ও কঠিন রাস্তা (রাস্তায় পাথর), তিন চাকার রিকশা/CNG, গাড়িতে ৩D ভাব
// ============================================================
// ১) সময়: প্রথম ৫ লেভেল সবসময় দিন; পরে দিন বেশি, রাত কম (Night City ম্যাপ সবসময় রাত)
timeOfDay=function(){
  const m=maps[save.selectedMap]||maps[0];
  if(m.theme==="night") return "night";
  if(typeof window.__forceTod==="string") return window.__forceTod;
  if(currentLevel<=5) return "day";
  const h=hashSeed(currentLevel*71.31+(save.selectedMap||0)*19.73+5.1);
  return h<.52?"day":h<.74?"evening":"night";
};

// ২) লম্বা রাস্তা: আগের দূরত্বের প্রায় ১.৪ গুণ (Endless বাদে)
const v23FinBase=finishX;
finishX=function(){ const f=v23FinBase.apply(this,arguments); if(endlessMode) return f; return Math.round(600+(f-600)*1.4); };

// ৩) রাস্তায় পাথর: terrainY-তে ছোট-বড় পাথরের ঢিবি যোগ হয়, তাই চাকা সত্যিই পাথরের ওপর দিয়ে ওঠে-নামে।
// লেভেল বাড়লে পাথর বেশি ও উঁচু। খাদের লাফের র‍্যাম্পের কাছে কোনো পাথর বসে না।
const V23R={key:"",list:[],busy:false};
function v23Rocks(){
  const k=currentLevel+"|"+(save.selectedMap||0)+"|"+(endlessMode?1:0);
  if(V23R.key===k) return V23R.list;
  if(V23R.busy) return [];
  V23R.busy=true; const out=[];
  try{
    if(!endlessMode){
      const fin=finishX(), n=Math.min(46,5+Math.floor(currentLevel*.4)), span=(fin-1300)/n;
      for(let i=0;i<n;i++){
        const h=hashSeed(currentLevel*17.31+i*7.77+(save.selectedMap||0)*3.13), h2=hashSeed(i*91.7+currentLevel*2.9);
        const x=Math.round(950+i*span+h*span*.55); if(x>fin-520) continue;
        let near=false; for(let t=x-300;t<=x+220;t+=16) if(isGap(t)){ near=true; break; } if(near) continue;
        const ht=7+Math.min(11,currentLevel*.11)+h2*7, w=36+h2*30+ht*.8;
        out.push([x,w,ht]);
      }
    }
  } finally { V23R.busy=false; }
  V23R.key=k; V23R.list=out; return out;
}
function v23RockAt(x){ const L=v23Rocks(); let lo=0,hi=L.length-1;
  while(lo<=hi){ const m=(lo+hi)>>1, r=L[m], hw=r[1]/2; if(x<r[0]-hw) hi=m-1; else if(x>r[0]+hw) lo=m+1; else return r; } return null; }
const v23TerrainBase=terrainY;
terrainY=function(x){ const y=v23TerrainBase(x); const r=v23RockAt(x); if(!r) return y; const u=(x-r[0])/(r[1]/2); return y-r[2]*Math.pow(Math.max(0,Math.cos(u*Math.PI/2)),1.4); };
// পাথর আঁকা (পাহাড়ের টাইলের ভেতরে, রাস্তার ওপরে)
function v23DrawRocks(C,b,cx,w){
  for(const r of v23Rocks()){ const [x,wd,ht]=r; if(x<cx-90||x>cx+w+90) continue;
    const sx=x-cx, base=v23TerrainBase(x), col=b.rock, sh=(c,f)=>c.map(v=>f<0?v*(1+f):v+(255-v)*f), css=c=>`rgb(${c.map(v=>Math.round(Math.max(0,Math.min(255,v)))).join(',')})`;
    const hw=wd*.52, top=base-ht-3, j=k=>(hashSeed(x*.13+k)-.5);
    const pts=[[sx-hw,base+4],[sx-hw*.86,base-ht*.45+j(1)*4],[sx-hw*.5,top+j(2)*3],[sx+hw*.05,top-2+j(3)*3],[sx+hw*.55,top+2+j(4)*3],[sx+hw*.9,base-ht*.4+j(5)*4],[sx+hw,base+4]];
    C.fillStyle="rgba(0,0,0,.25)"; C.beginPath(); C.ellipse(sx+4,base+5,hw*1.05,4,0,0,6.3); C.fill();
    C.fillStyle=css(sh(col,-.12)); C.beginPath(); pts.forEach((p,i)=>i?C.lineTo(p[0],p[1]):C.moveTo(p[0],p[1])); C.closePath(); C.fill();
    // আলোর দিক (বাঁ-উপর) উজ্জ্বল পিঠ, ডানে ছায়া
    C.fillStyle=css(sh(col,.22)); C.beginPath(); C.moveTo(pts[1][0],pts[1][1]); C.lineTo(pts[2][0],pts[2][1]); C.lineTo(pts[3][0],pts[3][1]); C.lineTo(sx-hw*.05,base-ht*.35); C.closePath(); C.fill();
    C.fillStyle=css(sh(col,-.38)); C.beginPath(); C.moveTo(pts[4][0],pts[4][1]); C.lineTo(pts[5][0],pts[5][1]); C.lineTo(pts[6][0],pts[6][1]); C.lineTo(sx+hw*.25,base+4); C.lineTo(sx+hw*.15,base-ht*.4); C.closePath(); C.fill();
    C.strokeStyle="rgba(0,0,0,.35)"; C.lineWidth=1.2; C.beginPath(); C.moveTo(sx-hw*.1,top+4); C.lineTo(sx-hw*.02,base-ht*.45); C.lineTo(sx+hw*.18,base-2); C.stroke();
    C.strokeStyle="rgba(255,255,255,.28)"; C.lineWidth=1.5; C.beginPath(); C.moveTo(pts[1][0],pts[1][1]); C.lineTo(pts[2][0],pts[2][1]); C.lineTo(pts[3][0],pts[3][1]); C.stroke();
    // গোড়ায় ঘাস
    C.strokeStyle="rgba(60,110,50,.9)"; C.lineWidth=1.3; C.beginPath(); for(let k=-3;k<=3;k++){ const gx=sx+k*hw*.33; C.moveTo(gx,base+5); C.lineTo(gx+k*.6,base-1-((k+9)%3)*2); } C.stroke();
  }
}

// ৪) গাড়িতে ৩D ভাব: অন্য পাশের চাকা (পেছনে, একটু সরে, গাঢ়), আর গাড়ির গায়ে আলো-ছায়া।
// রিকশা, CNG, ইজিবাইক = তিন চাকা (সামনে ১, পেছনে ২); বাস/ট্রাক = চার চাকা।
const V23_THREE={rickshaw:1,cng:1,ebike:1};
let v23oc=null,v23ox=null;
const v23VehBase=v15DrawVehicle;
v15DrawVehicle=function(c,v,o){
  let M; try{ M=c.getTransform(); }catch(e){ return v23VehBase.apply(this,arguments); }
  const sc=Math.hypot(M.a,M.b)||1, S=Math.ceil(260*sc);
  if(!v23oc){ v23oc=document.createElement("canvas"); v23ox=v23oc.getContext("2d"); }
  if(v23oc.width<S||v23oc.height<S){ v23oc.width=S; v23oc.height=S; }
  const ox=v23ox, half=S/2; ox.setTransform(1,0,0,1,0,0); ox.globalCompositeOperation="source-over"; ox.clearRect(0,0,v23oc.width,v23oc.height);
  ox.setTransform(M.a,M.b,M.c,M.d,half,half);
  // অন্য পাশের চাকা (শরীরের পেছনে)
  const three=!!V23_THREE[v.kind], rim="#9aa3aa", dx=three?27:11, dy=three?-12:-9;
  ox.save(); v15Wheel(ox,-39+dx,32+(o.rs||0)+dy,three?25:27,o.spin||0,rim); if(!three) v15Wheel(ox,43+dx,28+(o.fs||0)+dy,30,o.spin||0,rim); ox.restore();
  ox.save(); ox.setTransform(1,0,0,1,0,0); ox.globalCompositeOperation="source-atop"; ox.fillStyle=three?"rgba(8,12,18,.32)":"rgba(8,12,18,.5)"; ox.fillRect(0,0,S,S); ox.restore();
  ox.globalCompositeOperation="source-over";
  v23VehBase.call(this,ox,v,o);
  // গায়ে আলো (উপর-বাঁ থেকে) আর নিচে ছায়া — শুধু গাড়ির পিক্সেলে
  ox.save(); ox.setTransform(1,0,0,1,0,0); ox.globalCompositeOperation="source-atop";
  const g=ox.createLinearGradient(half-90*sc,half-110*sc,half+70*sc,half+70*sc);
  g.addColorStop(0,"rgba(255,255,255,.26)"); g.addColorStop(.42,"rgba(255,255,255,.04)"); g.addColorStop(.62,"rgba(0,0,0,.05)"); g.addColorStop(1,"rgba(0,0,0,.34)");
  ox.fillStyle=g; ox.fillRect(0,0,S,S);
  const g2=ox.createLinearGradient(0,half-80*sc,0,half-50*sc); g2.addColorStop(0,"rgba(255,255,255,0)"); g2.addColorStop(.5,"rgba(255,255,255,.10)"); g2.addColorStop(1,"rgba(255,255,255,0)");
  ox.fillStyle=g2; ox.fillRect(0,0,S,S);
  ox.restore();
  c.save(); c.setTransform(1,0,0,1,0,0); c.drawImage(v23oc,0,0,S,S,M.e-half,M.f-half,S,S); c.restore();
};
// সাধারণ ট্রাকগুলোর জন্যও অন্য পাশের চাকা
const v23TruckBase=drawTruck;
drawTruck=function(){
  const base=vehiclesV22[save.selectedVehicle]||vehiclesV22[0];
  if(!base.kind){ try{
    ctx.save(); ctx.translate(truck.x-camera.x,truck.y); ctx.rotate(truck.angle); ctx.translate(0,-(truck.onGround?Math.sin(performance.now()*.012)*1.1:0));
    ctx.globalAlpha=.75; drawMonsterWheel(-31,26+(truck.rearSusp||0),27,truck.wheelSpin); drawMonsterWheel(51,22+(truck.frontSusp||0),30,truck.wheelSpin); ctx.globalAlpha=1;
    ctx.fillStyle="rgba(8,12,18,.45)"; ctx.beginPath(); ctx.arc(-31,26+(truck.rearSusp||0),27,0,6.3); ctx.arc(51,22+(truck.frontSusp||0),30,0,6.3); ctx.fill();
    ctx.restore(); }catch(e){} }
  return v23TruckBase.apply(this,arguments);
};

// ============================================================
// v25 — চলমান দিন-রাত আর বদলানো আবহাওয়া।
// খেলার সময় ঘড়ি চলে: সকাল → দুপুর → বিকেল (সূর্যাস্ত) → রাত (চাঁদ ওঠে) → ভোর → আবার দিন। পুরো চক্র ~৩.৫ মিনিট।
// সূর্য আর চাঁদ আকাশে পথ ধরে চলে, আলো ধীরে ধীরে বদলায়। প্রথম ৫ লেভেল সকালে শুরু হয়।
// আবহাওয়াও ৩০–৭০ সেকেন্ড পরপর বদলায় (রোদ ↔ বৃষ্টি ↔ বাতাস ইত্যাদি), মেঘ/অন্ধকার ধীরে আসে-যায়।
// ============================================================
const V25={CYCLE:210,startP:.08,key:"",nextChange:0,lastEl:0,rainAmt:0,lastNow:0};
function v25Lerp(pts,p){ for(let i=1;i<pts.length;i++){ if(p<=pts[i][0]){ const a=pts[i-1], b=pts[i], t=(p-a[0])/Math.max(1e-6,b[0]-a[0]); return a[1]+(b[1]-a[1])*t; } } return pts[pts.length-1][1]; }
function v25Phase(){
  const m=maps[save.selectedMap]||maps[0];
  if(m.theme==="night") return .76;
  const f=window.__forceTod; if(f==="day") return .25; if(f==="evening") return .49; if(f==="night") return .76;
  const k=currentLevel+"|"+(save.selectedMap||0);
  if(k!==V25.key){ V25.key=k; V25.startP=currentLevel<=5?.07:hashSeed(currentLevel*71.31+(save.selectedMap||0)*19.73+5.1)*.6; }
  const el=(typeof elapsed==="number"&&state!=="menu")?elapsed:0;
  return ((V25.startP+el/V25.CYCLE)%1+1)%1;
}
const V25_DARK=[[0,.32],[.06,0],[.44,0],[.52,.30],[.60,.78],[.90,.78],[.97,.48],[1,.32]];
const V25_WARM=[[0,.6],[.06,.25],[.12,0],[.41,0],[.49,1],[.56,.55],[.62,0],[.92,0],[.97,.55],[1,.6]];
function v25Light(){
  const p=v25Phase(), ra=V25.rainAmt;
  let dark=v25Lerp(V25_DARK,p), warm=v25Lerp(V25_WARM,p)*(1-ra*.8);
  dark=Math.min(.9,dark+ra*(dark<.3?.34:.12));
  const sa=(p+.02)/.6, sun=(sa>0&&sa<1)?Math.min(1,Math.sin(Math.PI*sa)*3):0;
  const ma=(p-.56)/.44, moon=(ma>0&&ma<1)?Math.min(1,Math.sin(Math.PI*ma)*3):0;
  return {p,dark,warm,rain:ra,sun,sx:W*(.06+.88*Math.max(0,Math.min(1,sa))),sy:H*(.62-.5*Math.sin(Math.PI*Math.max(0,Math.min(1,sa)))),
          moon,mx:W*(.08+.84*Math.max(0,Math.min(1,ma))),my:H*(.55-.43*Math.sin(Math.PI*Math.max(0,Math.min(1,ma))))};
}
timeOfDay=function(){ const L=v25Light(); return L.dark>=.5?"night":(L.warm>.35?"evening":"day"); };
const V25_POOL={ice:["clear","snow","wind","snow"],desert:["clear","sandstorm","wind","clear"],volcano:["clear","wind","clear"],night:["clear","rain","clear"]};
function v25Tick(){
  const now=performance.now()/1000, dt=Math.min(.1,V25.lastNow?now-V25.lastNow:0); V25.lastNow=now;
  const wet=currentWeather==="rain"||currentWeather==="snow"||currentWeather==="sandstorm";
  if(typeof state==="undefined"||state==="menu") return;
  const el=elapsed||0;
  if(el<V25.lastEl-.5||V25.nextChange===0){ V25.nextChange=el+20+Math.random()*25; V25.rainAmt=wet?1:0; }   // নতুন/আবার শুরু হওয়া লেভেল
  V25.lastEl=el;
  V25.rainAmt+=((wet?1:0)-V25.rainAmt)*Math.min(1,dt*.35);                                                  // মেঘ/অন্ধকার ধীরে আসে-যায়
  if(state==="play"&&typeof window.__forceWeather!=="string"&&el>V25.nextChange){
    const m=maps[save.selectedMap]||maps[0], pool=V25_POOL[m.theme]||["clear","rain","clear","wind","rain"];
    let nw=currentWeather, tries=0; while(nw===currentWeather&&tries++<8) nw=pool[Math.floor(Math.random()*pool.length)];
    currentWeather=nw; V25.nextChange=el+30+Math.random()*40;
  }
}

// ============================================================
// v24 (নতুন) — আকাশ, মেঘ, পাখি, বিস্তারিত বিদ্যুৎ চমক, আর আবহাওয়ার শব্দ
// ============================================================
const V24=(function(){
  const rnd=(a,b)=>a+Math.random()*(b-a);
  // ---------- শব্দ (কোডে তৈরি) ----------
  let rainSrc=null, rainGain=null, nextCricket=0;
  function noiseBuf(sec,brown){ const n=Math.floor(audio.sampleRate*sec), b=audio.createBuffer(1,n,audio.sampleRate), d=b.getChannelData(0); let last=0;
    for(let i=0;i<n;i++){ const w=Math.random()*2-1; if(brown){ last=(last+.02*w)/1.02; d[i]=last*3.2; } else d[i]=w; } return b; }
  function ensureRain(){ if(rainSrc||!audioReady||!audio) return;
    rainSrc=audio.createBufferSource(); rainSrc.buffer=noiseBuf(3,false); rainSrc.loop=true;
    const hp=audio.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=500; const lp=audio.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=5200;
    rainGain=audio.createGain(); rainGain.gain.value=0; rainSrc.connect(hp); hp.connect(lp); lp.connect(rainGain); rainGain.connect(master); rainSrc.start(); }
  function thunder(dist){ if(!audioReady||!audio) return; const t=audio.currentTime;
    const src=audio.createBufferSource(); src.buffer=noiseBuf(4.5,true);
    const lp=audio.createBiquadFilter(); lp.type="lowpass"; lp.frequency.setValueAtTime(dist<.35?1400:420,t); lp.frequency.exponentialRampToValueAtTime(110,t+3.4);
    const g=audio.createGain(), vol=.6*(1-dist*.55);
    g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(vol,t+.04+dist*.3);
    for(let k=1;k<6;k++) g.gain.exponentialRampToValueAtTime(vol*rnd(.3,.9),t+.25+k*.42+dist*.2);
    g.gain.exponentialRampToValueAtTime(.0001,t+4.3); src.connect(lp); lp.connect(g); g.connect(master); src.start(t); src.stop(t+4.5);
    if(dist<.3){ const c=audio.createBufferSource(); c.buffer=noiseBuf(.3,false); const hp=audio.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=1800; const cg=audio.createGain();
      cg.gain.setValueAtTime(.35,t); cg.gain.exponentialRampToValueAtTime(.0001,t+.28); c.connect(hp); hp.connect(cg); cg.connect(master); c.start(t); c.stop(t+.3); } }  // কাছের বাজে "কড়াৎ"
  function birdCall(){ if(!audioReady||!audio) return; const t0=audio.currentTime, n=2+Math.floor(Math.random()*3), base=rnd(2300,3300);
    for(let i=0;i<n;i++){ const t=t0+i*rnd(.11,.18), o=audio.createOscillator(), g=audio.createGain(); o.type="sine";
      o.frequency.setValueAtTime(base,t); o.frequency.exponentialRampToValueAtTime(base*rnd(1.25,1.55),t+.06); o.frequency.exponentialRampToValueAtTime(base*.9,t+.1);
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.035,t+.015); g.gain.exponentialRampToValueAtTime(.0001,t+.11); o.connect(g); g.connect(master); o.start(t); o.stop(t+.13); } }
  function cricket(){ if(!audioReady||!audio) return; const t0=audio.currentTime;
    for(let i=0;i<3;i++){ const t=t0+i*.09, o=audio.createOscillator(), g=audio.createGain(); o.type="triangle"; o.frequency.value=4300;
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.012,t+.01); g.gain.exponentialRampToValueAtTime(.0001,t+.06); o.connect(g); g.connect(master); o.start(t); o.stop(t+.07); } }

  // ---------- মেঘ (একবার এঁকে রাখা ফিতা, প্রতি ফ্রেমে শুধু সরানো) ----------
  const cloudCache={}, bands={};
  function cloudSprite(dark){ const key=dark?"d":"l"; if(cloudCache[key]) return cloudCache[key];
    const R=2, c=document.createElement("canvas"); c.width=150*R; c.height=90*R; const x=c.getContext("2d"); x.scale(R,R);
    for(const [dx,dy,r] of [[0,0,34],[-30,8,24],[30,6,26],[-12,-14,24],[14,-12,22],[48,12,18],[-48,14,16]]){ const cx=75+dx, cy=48+dy, g=x.createRadialGradient(cx,cy-r*.3,r*.2,cx,cy,r);
      if(dark){ g.addColorStop(0,"rgb(120,126,140)"); g.addColorStop(1,"rgb(58,62,74)"); } else { g.addColorStop(0,"#fff"); g.addColorStop(1,"rgb(214,226,238)"); }
      x.fillStyle=g; x.beginPath(); x.arc(cx,cy,r,0,6.3); x.fill(); }
    return cloudCache[key]=c; }
  function band(dark){ const key=currentLevel+"|"+save.selectedMap+"|"+W+"|"+H; let b=bands[dark?1:0];
    if(b&&b.key===key) return b; b={key,span:Math.ceil(W*1.6),c:document.createElement("canvas")}; bands[dark?1:0]=b;
    b.c.width=b.span; b.c.height=Math.ceil(H*.5); const bx=b.c.getContext("2d"), sc=W/900+.4, n=dark?16:7;
    for(let i=0;i<n;i++){ const cs=(dark?rnd(1.1,1.9):rnd(.6,1.25))*sc, cx=Math.random()*b.span, cy=(dark?rnd(0,.22):rnd(.05,.32))*H, sp=cloudSprite(dark);
      for(const off of [0,-b.span,b.span]) bx.drawImage(sp,cx+off-75*cs,cy-48*cs,150*cs,90*cs); }
    return b; }
  function drawBand(b,alpha,t){ if(alpha<.02) return; const off=((camera.x*.07+t*6)%b.span+b.span)%b.span; ctx.save(); ctx.globalAlpha=alpha; ctx.drawImage(b.c,-off,0); ctx.drawImage(b.c,b.span-off,0); ctx.restore(); }

  // ---------- আকাশ ----------
  let birds=[], nextFlock=0, cloudLight=0;
  function sky(){
    if(typeof state==="undefined"||state==="menu") return;
    try{ v25Tick(); }catch(e){}
    const L=v25Light(), ra=L.rain, t=performance.now()/1000, night=L.dark>.5;
    // সূর্য (আকাশে পথ ধরে চলে; বিকেলে বড় ও কমলা)
    if(L.sun>.02){ const a=L.sun*(1-ra*.9), sx=L.sx, sy=L.sy, w=L.warm, r=24+w*12;
      ctx.save(); ctx.globalAlpha=a; const g=ctx.createRadialGradient(sx,sy,8,sx,sy,130+w*50);
      g.addColorStop(0,w>.4?"rgba(255,190,110,.9)":"rgba(255,250,215,.9)"); g.addColorStop(.25,w>.4?"rgba(255,140,60,.38)":"rgba(255,236,170,.35)"); g.addColorStop(1,"rgba(255,200,140,0)");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(sx,sy,130+w*50,0,6.3); ctx.fill(); ctx.fillStyle=w>.4?"#ffb35c":"#fff6cf"; ctx.beginPath(); ctx.arc(sx,sy,r,0,6.3); ctx.fill(); ctx.restore(); }
    // মেঘ: পরিষ্কার আকাশের সাদা মেঘ ↔ বৃষ্টির ঘন কালো মেঘ (ধীরে বদলায়)
    drawBand(band(false),(1-ra)*(night?.45:.85),t);
    drawBand(band(true),ra*.95,t);
    if(cloudLight>.01){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.globalAlpha=Math.min(1,cloudLight); ctx.drawImage(band(true).c,0,0); ctx.restore(); }
    if(ra>.02){ const g=ctx.createLinearGradient(0,0,0,H*.5); g.addColorStop(0,`rgba(40,44,56,${.55*ra})`); g.addColorStop(1,"rgba(40,44,56,0)"); ctx.fillStyle=g; ctx.fillRect(0,0,W,H*.5); }
    // পাখির ঝাঁক (রোদেলা দিনে/বিকেলে)
    if(L.sun>.5&&ra<.3&&state==="play"&&t>nextFlock){ nextFlock=t+rnd(7,15); const n=3+Math.floor(Math.random()*5), y=rnd(.08,.3)*H, dir=Math.random()<.5?1:-1;
      const A=window.V28A;
      if(A&&A.ok("bird")){ // v28: আসল ৩D পাখির ঝাঁক (ডানা ঝাপটানো ছবি) আর মাঝে মাঝে কাছ দিয়ে উড়ে যাওয়া শালিক
        for(let i=0;i<1+(n>5?1:0);i++) birds.push({sp:"bird",x:dir>0?-90-i*120:W+90+i*120, y:y+i*rnd(10,24), vx:dir*rnd(55,80), ph:Math.random()*6, s:rnd(.75,1.15)});
        if(A.ok("myna")&&Math.random()<.45) birds.push({sp:"myna",x:dir>0?-60:W+60, y:rnd(.25,.42)*H, vx:dir*rnd(95,130), ph:Math.random()*6, s:rnd(.85,1.1)});
      } else
      for(let i=0;i<n;i++) birds.push({x:dir>0?-40-i*rnd(16,28):W+40+i*rnd(16,28), y:y+(i%2?1:-1)*i*rnd(4,8), vx:dir*rnd(55,80), ph:Math.random()*6, s:rnd(.7,1.1)});
      if(Math.random()<.85) setTimeout(birdCall,rnd(200,900)); }
    birds=birds.filter(b=>b.x>-140&&b.x<W+140);
    ctx.strokeStyle=L.warm>.4?"rgba(40,20,30,.85)":"rgba(30,36,44,.85)"; ctx.lineWidth=2.4; ctx.lineCap="round";
    for(const b of birds){ b.x+=b.vx/60; b.y+=Math.sin(t*1.3+b.ph)*.15;
      if(b.sp){ const A=window.V28A; if(b.sp==="bird") A.draw(ctx,"bird",Math.floor(t*12+b.ph),b.x,b.y,30*b.s,b.vx<0,(L.warm>.4?.8:.85)); else A.draw(ctx,"myna",0,b.x,b.y+Math.sin(t*2+b.ph)*3,28*b.s,b.vx<0,1); continue; }
      const f=Math.sin(t*9+b.ph)*7*b.s, s=b.s*11;
      ctx.beginPath(); ctx.moveTo(b.x-s,b.y-f); ctx.quadraticCurveTo(b.x-s*.4,b.y-f*.3-2,b.x,b.y); ctx.quadraticCurveTo(b.x+s*.4,b.y-f*.3-2,b.x+s,b.y-f); ctx.stroke(); }
  }

  // ---------- বিদ্যুৎ: শাখা-প্রশাখাসহ বজ্র, কয়েকবার ঝলক, মেঘ আলোকিত, মেঘের ভেতরে চমক ----------
  let strikes=[], nextStrike=0, pending=[];
  function genBolt(x0,y0,x1,y1,disp,depth,w,out){
    if(depth<=0){ out.push([x0,y0,x1,y1,w]); return; }
    const mx=(x0+x1)/2+(Math.random()-.5)*disp, my=(y0+y1)/2+(Math.random()-.5)*disp*.3;
    genBolt(x0,y0,mx,my,disp*.55,depth-1,w,out); genBolt(mx,my,x1,y1,disp*.55,depth-1,w,out);
    if(depth>=2&&Math.random()<.33){ const ang=Math.atan2(y1-y0,x1-x0)+(Math.random()<.5?-1:1)*rnd(.45,.95), len=Math.hypot(x1-x0,y1-y0)*rnd(.5,.95);
      genBolt(mx,my,mx+Math.cos(ang)*len,my+Math.sin(ang)*len,disp*.5,depth-2,w*.45,out); } }
  function pulses(){ const p=[0]; const n=1+Math.floor(Math.random()*3); let tt=0; for(let i=0;i<n;i++){ tt+=rnd(.07,.18); p.push(tt); } return p; }
  function strike(kind){
    const t=performance.now()/1000, sheet=kind==="sheet"||(kind!=="bolt"&&Math.random()<.35), dist=sheet?rnd(.4,1):Math.random();
    let x=rnd(.12,.88)*W; const tx=truck.x-camera.x; if(Math.abs(x-tx)<170) x=tx+(x<tx?-1:1)*rnd(170,260); x=Math.max(20,Math.min(W-20,x)); if(Math.abs(x-tx)<150) x=tx+(tx<W/2?1:-1)*220;
    const cy=rnd(.08,.18)*H, s={t0:t,p:pulses(),x,cy,sheet,dist,seg:null,gx:x,gy:H*.6};
    if(!sheet){ const gx=x+rnd(-70,70), gwx=gx+camera.x, gy=isGap(gwx)?H-118:terrainY(gwx); s.gx=gx; s.gy=gy; s.seg=[];
      genBolt(x,cy,gx,gy,Math.hypot(gx-x,gy-cy)*.42,6,(1.6-dist)*1.3,s.seg); }
    strikes.push(s); pending.push([t+(sheet?rnd(.8,2.5):.15+dist*2.2),dist]); }
  function intensity(s,t){ let I=0; for(const pt of s.p){ const d=t-s.t0-pt; if(d>=0) I+=Math.exp(-d/.055)*(pt===0?1:.8); } return Math.min(1.2,I); }
  function overlay(){
    if(typeof state==="undefined"||state==="menu") return;
    const t=performance.now()/1000, L=v25Light(), rainy=currentWeather==="rain"&&L.rain>.55;
    if(rainy&&state==="play"){ if(!nextStrike) nextStrike=t+rnd(2,5); if(t>nextStrike){ strike(); nextStrike=t+rnd(4,10); } } else nextStrike=0;
    let flash=0, glow=0; strikes=strikes.filter(s=>t-s.t0<1.2);
    for(const s of strikes){ const I=intensity(s,t); if(I<.01) continue;
      const k=(1-s.dist*.6); flash=Math.max(flash,I*k*(s.sheet?.45:1)); glow=Math.max(glow,I*k);
      ctx.save(); ctx.globalCompositeOperation="lighter";
      // মেঘের ভেতর আলো
      const cg=ctx.createRadialGradient(s.x,s.cy,10,s.x,s.cy,W*(s.sheet?.28:.38)); cg.addColorStop(0,`rgba(205,215,255,${.55*I*k})`); cg.addColorStop(1,"rgba(205,215,255,0)");
      ctx.fillStyle=cg; ctx.fillRect(0,0,W,H*.7);
      if(!s.sheet&&s.seg){
        // বজ্রটা পাহাড়ের পেছনে: শুধু মাটির ওপরে আঁকা
        ctx.beginPath(); ctx.moveTo(-10,-10); for(let x=-10;x<=W+20;x+=16){ const wx=x+camera.x; ctx.lineTo(x,isGap(wx)?H:terrainY(wx)-3); } ctx.lineTo(W+20,-10); ctx.closePath(); ctx.clip();
        ctx.lineCap="round";
        for(const [mul,a,col] of [[9,.10,"170,185,255"],[3.6,.35,"200,210,255"],[1.3,1,"255,255,255"]]){
          for(const [x0,y0,x1,y1,w] of s.seg){ ctx.strokeStyle=`rgba(${col},${Math.min(1,a*I*k*(w>1?1:.75))})`; ctx.lineWidth=Math.max(.6,w*mul); ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke(); } }
        // মাটিতে পড়ার জায়গায় ঝলক
        const gg=ctx.createRadialGradient(s.gx,s.gy,2,s.gx,s.gy,70); gg.addColorStop(0,`rgba(230,235,255,${.6*I*k})`); gg.addColorStop(1,"rgba(230,235,255,0)"); ctx.fillStyle=gg; ctx.fillRect(s.gx-80,s.gy-80,160,160);
      }
      ctx.restore(); }
    cloudLight=glow*.6;
    if(flash>.01){ ctx.save(); ctx.globalCompositeOperation="lighter"; ctx.fillStyle=`rgba(195,205,255,${flash*(L.dark>.5?.30:.18)})`; ctx.fillRect(0,0,W,H); ctx.restore(); }
    while(pending.length&&pending[0][0]<=t) thunder(pending.shift()[1]);
    pending.sort((a,b)=>a[0]-b[0]);
    // শব্দ
    if(audioReady&&audio){ ensureRain(); const playing=state==="play";
      if(rainGain) rainGain.gain.setTargetAtTime(currentWeather==="rain"&&playing?.18*L.rain:0,audio.currentTime,.5);
      if(playing&&L.dark>.5&&L.rain<.3&&t>nextCricket){ nextCricket=t+rnd(.8,2.2); cricket(); } }
  }
  return {sky,overlay,strike,_dbg:()=>({birds:birds.length,strikes:strikes.length}),_flock:()=>{ nextFlock=0; }};
})();
const v24SkyBase=drawSky;
drawSky=function(){ const r=v24SkyBase.apply(this,arguments); try{ V24.sky(); }catch(e){} return r; };
const v24OverlayBase=drawNightOverlay;
drawNightOverlay=function(){ const r=v24OverlayBase.apply(this,arguments); try{ V24.overlay(); }catch(e){} return r; };

// ============================================================
// v26 — আসল ৩D মনস্টার ট্রাক (truck3d.js, models/monster_truck.glb)। সাধারণ ট্রাকগুলো (রং অনুযায়ী) ৩D-তে আঁকা হয়।
// (v27 থেকে রিকশা/CNG/ইজিবাইক/বাসও ৩D — নিচে দেখো।) ৩D লোড না হলে বা WebGL না থাকলে আগের ২D ছবি।
// ============================================================
let v26Lamp=null;
const v26TruckBase=drawTruck;
drawTruck=function(){
  const base=vehiclesV22[save.selectedVehicle]||vehiclesV22[0], T=window.V3DTruck;
  if(base.kind||!T||!T.ready||window.__no3d){ v26Lamp=null; return v26TruckBase.apply(this,arguments); }
  const v=v15Eff(base); let img=null;
  try{ img=T.render({color:v.color,spin:truck.wheelSpin||0,rs:truck.rearSusp||0,fs:truck.frontSusp||0,wb:98,rc:[-47,29]}); }catch(e){ img=null; }
  if(!img){ v26Lamp=null; return v26TruckBase.apply(this,arguments); }
  ctx.save(); ctx.translate(truck.x-camera.x,truck.y); ctx.rotate(truck.angle); ctx.translate(0,-(truck.onGround?Math.sin(performance.now()*.012)*1.1:0));
  ctx.fillStyle="rgba(0,0,0,.26)"; ctx.beginPath(); ctx.ellipse(2,54,80,8,0,0,Math.PI*2); ctx.fill();
  ctx.drawImage(img.canvas,img.dx,img.dy,img.dw,img.dh);
  ctx.restore(); v26Lamp=img.lamp;
};

// ============================================================
// v27 — CNG, রিকশা, ইজি বাইক আর বাসও আসল ৩D মডেলে (truck3d.js → V3DTruck.renderVeh)।
// মডেল লোড না হওয়া পর্যন্ত, বা WebGL না থাকলে, আগের ২D ছবি। ক্রেডিট: docs/ASSET_CREDITS.md
// ============================================================
let v27Tail=null;
const v27Base=drawTruck;
drawTruck=function(){
  const base=vehiclesV22[save.selectedVehicle]||vehiclesV22[0], T=window.V3DTruck;
  v27Tail=null;
  if(!base.kind||!T||!T.renderVeh||!T.has(base.kind)||window.__no3d) return v27Base.apply(this,arguments);
  const v=v15Eff(base); let img=null;
  try{ img=T.renderVeh(base.kind,{color:v.color,base:base.color,spin:truck.wheelSpin||0,rs:truck.rearSusp||0,fs:truck.frontSusp||0,gy:29+(truck.wheelR||27)}); }catch(e){ img=null; }
  if(!img){ v26Lamp=null; return v27Base.apply(this,arguments); }
  ctx.save(); ctx.translate(truck.x-camera.x,truck.y); ctx.rotate(truck.angle); ctx.translate(0,-(truck.onGround?Math.sin(performance.now()*.012)*.8:0));
  const gy=29+(truck.wheelR||27);
  ctx.fillStyle="rgba(0,0,0,.24)"; ctx.beginPath(); ctx.ellipse(0,gy-2,img.len*.46,6,0,0,Math.PI*2); ctx.fill();
  ctx.drawImage(img.canvas,img.dx,img.dy,img.dw,img.dh);
  ctx.restore(); v26Lamp=img.lamp; v27Tail=img.tail;
};

// ============================================================
// v28 — আসল ৩D মডেল থেকে বানানো প্রাণী: নেকড়ে আর খরগোশ পাহাড়ের রাস্তায় দৌড়ায়, আকাশে পাখির ঝাঁক ও শালিক।
// ছবিগুলো (models/animals/*.webp) মডেলের হাঁটা/ওড়ার অ্যানিমেশন থেকে ৮টা ফ্রেমে বানানো। ক্রেডিট: docs/ASSET_CREDITS.md
// শুধু দেখার জন্য — গাড়ির সাথে ধাক্কা বা খেলার নিয়মে কোনো প্রভাব নেই।
// ============================================================
window.V28A=(function(){
  const SH={wolf:8,rabbit:8,bird:8,myna:1}, IM={}, rnd=(a,b)=>a+Math.random()*(b-a);
  for(const k in SH){ const im=new Image(); im.decoding="async"; im.src="models/animals/"+k+".webp"; IM[k]=im; }
  const ok=k=>{ const im=IM[k]; return !!(im&&im.complete&&im.naturalWidth); };
  // h = উচ্চতা (পিক্সেলে), x/y = নিচের মাঝখান (পাখির ক্ষেত্রে মাঝখান)
  function draw(c,k,f,x,y,h,flip,alpha,ang){ if(!ok(k)) return; const im=IM[k], n=SH[k], fw=im.naturalWidth/n, fh=im.naturalHeight, w=h*fw/fh, fi=((f%n)+n)%n;
    c.save(); c.translate(x,y); if(ang) c.rotate(ang); if(flip) c.scale(-1,1); if(alpha!=null) c.globalAlpha*=alpha;
    const bird=k==="bird"||k==="myna"; c.drawImage(im,fi*fw,0,fw,fh,-w/2,bird?-h/2:-h,w,h); c.restore(); }
  let list=[], nextSpawn=0, lastT=0, lastLevel="";
  const WOLF={jungle:1,bandarban:1,night:1,hills:.6,sajek:.6,autumn:.8,ice:.7,khagrachhari:.5}, RAB={hills:1,sajek:1,bandarban:.8,sylhet:1,kaptai:1,khagrachhari:1,jungle:.6,autumn:1,night:.4};
  function update(){
    const now=performance.now()/1000, dt=Math.min(.05,lastT?now-lastT:0); lastT=now;
    const lk=currentLevel+"|"+save.selectedMap; if(lk!==lastLevel){ lastLevel=lk; list=[]; nextSpawn=now+rnd(4,8); }
    if(state!=="play") return;
    const m=maps[save.selectedMap]||maps[0], th=m.theme, dark=typeof v25Light==="function"?(v25Light().dark||0):0;
    if(now>nextSpawn&&list.length<2){ nextSpawn=now+rnd(9,18);
      const pw=(WOLF[th]||0)*(.4+dark), pr=(RAB[th]||0)*(1-dark*.7); const tot=pw+pr;
      if(tot>0&&Math.random()<.85){ const kind=Math.random()*tot<pw?"wolf":"rabbit", x=camera.x+W+rnd(40,160);
        if(!isGap(x)&&ok(kind)) list.push({k:kind,x,dir:Math.random()<.75?1:-1,v:kind==="wolf"?rnd(120,170):rnd(110,150),ph:Math.random()*8,flee:0}); } }
    for(const a of list){
      const d=a.x-truck.x; if(a.dir>0&&d>-40&&d<260) a.flee=Math.min(1,a.flee+dt*2); else a.flee=Math.max(0,a.flee-dt*.5);
      if(a.dir<0&&d<220&&d>-40){ a.dir=1; } // গাড়ি দেখলে ঘুরে পালায়
      const sp=a.v*(1+a.flee*.9), nx=a.x+a.dir*sp*dt;
      if(isGap(nx+a.dir*30)) a.gone=1; else a.x=nx;
      a.ph+=dt*(a.k==="wolf"?10:9)*(.8+a.flee*.6);
      if(a.x<camera.x-160||a.x>camera.x+W+260) a.gone=1; }
    list=list.filter(a=>!a.gone);
  }
  function drawGround(){
    for(const a of list){ const x=a.x-camera.x, y=terrainY(a.x)+1, sl=terrainSlope(a.x), h=a.k==="wolf"?44:24;
      ctx.fillStyle="rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(x,y,h*.7,2.5,sl,0,6.3); ctx.fill();
      draw(ctx,a.k,Math.floor(a.ph),x,y,h,a.dir<0,1,sl*.8); }
  }
  return {ok,draw,update,drawGround,_list:()=>list,_spawn:(k,x,dir)=>list.push({k,x,dir:dir||1,v:k==="wolf"?140:130,ph:0,flee:0})};
})();
const v28TruckBase=drawTruck;
drawTruck=function(){ try{ V28A.update(); V28A.drawGround(); }catch(e){} return v28TruckBase.apply(this,arguments); };
