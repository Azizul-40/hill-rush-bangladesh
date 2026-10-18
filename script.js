// ==============================
// HILL RUSH FINAL BUILD
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

// Save key। 
const SAVE_KEY = "hillRushFinalSaveV1";

// আগের save পড়া হচ্ছে। 
let save = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");

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
  localStorage.setItem(SAVE_KEY,JSON.stringify(save));
}

// Coin variable save থেকে নেওয়া হচ্ছে। 
let coins = Number(save.coins || 250);

// Current level। 
let currentLevel = 1;

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

// Keyboard state। 
const keys={left:false,right:false,gas:false,brake:false};

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
    bonusCoins=flips*120+Math.floor(truck.airTime*30);
    label=(flips>=2?("FLIP x"+flips):"FLIP!")+" +"+bonusCoins;
    color="#ff6fae";
  }else if(truck.airTime>0.4){
    bonusCoins=Math.floor(truck.airTime*45);
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
  const boostVal=Math.min(1,.35+Math.abs(truck.vx)/Math.max(1,maxSpeed)*.65);
  const fuelVal=keys.gas?Math.min(1,.55+Math.abs(truck.vx)/Math.max(1,maxSpeed)*.45):.45;
  const cy=H-58,gap=86,r=34;
  drawGauge(W/2-gap,cy,r,rpmVal,"RPM","#e6493b");
  drawGauge(W/2,cy,r*1.08,fuelVal,"FUEL","#79d94a");
  drawGauge(W/2+gap,cy,r,boostVal,"BOOST","#4aa8ff");
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
      coinPackBtn.textContent=`GET +500 (${used}/${limit})`;
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
    // Color।
    ctx.fillStyle=p.type==="coin"?"#ffd83a":p.type==="smoke"?"#5a5f66":"#d6ae88";
    // Circle। 
    ctx.beginPath();
    ctx.arc(p.x-camera.x,p.y,p.size,0,Math.PI*2);
    ctx.fill();
  });

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
  coins+=500;
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
const COIN_PACK_DAILY_LIMIT=4; // দিনে সর্বোচ্চ ৪ বার Coin Pack কেনা যাবে।
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
function updateEngine(){
  if(!audioReady||state!=="play")return;
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0],speed=Math.abs(truck.vx);
  const rpm=58+speed*.22+(keys.gas?34:0)+v.speed*6;
  engineOsc.frequency.setTargetAtTime(rpm,audio.currentTime,.035);engineHarm.frequency.setTargetAtTime(rpm*2,audio.currentTime,.04);engineSub.frequency.setTargetAtTime(rpm*.5,audio.currentTime,.05);
  engineGain.gain.setTargetAtTime(.045+Math.min(.07,speed/700*.065)+(keys.gas?.025:0),audio.currentTime,.04);
  engineNoiseGain.gain.setTargetAtTime(.012+speed/700*.025,audio.currentTime,.08);
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
function finishX(){return 3600+currentLevel*44+(save.selectedMap||0)*160;}

// Gap-এর finish-এর কাছে safe runway রাখা হচ্ছে।
function getGaps(){
  const d=Math.min(1,(currentLevel-1)/99),base=[[1080,105+20*d],[1870,115+25*d],[2780,125+30*d],[3480,110+25*d]],extra=[];
  if(currentLevel>=10)extra.push([4200,120+30*d]);
  if(currentLevel>=22)extra.push([5050,130+35*d]);
  if(currentLevel>=38)extra.push([5950,145+38*d]);
  if(currentLevel>=58)extra.push([6900,155+42*d]);
  if(currentLevel>=78)extra.push([7900,165+45*d]);
  const finish=finishX();return [...base,...extra].filter(g=>g[0]+g[1]<finish-360);
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
  return Math.max(H*.14,Math.min(H*.80,y));
}
function terrainSlope(x){return Math.atan2(terrainY(x+5)-terrainY(x-5),10);}

// ---------- COINS ----------
function generateCoins(){
  levelCoins=[];const step=Math.max(125,150-(currentLevel%5)*4);
  for(let x=380;x<finishX()-180;x+=step){if(isGap(x))continue;levelCoins.push({x,y:terrainY(x)-62-Math.sin(x*.013)*8,r:16,phase:(x*.041)%6.28,taken:false});}
  const key=currentLevel+"_m"+(save.selectedMap||0),saved=save.collected[key]||[];saved.forEach(i=>{if(levelCoins[i])levelCoins[i].taken=true;});
}
function collectCoins(){
  const tx=truck.x,ty=truck.y-30;let changed=false;
  levelCoins.forEach((c,i)=>{if(c.taken)return;const d=Math.hypot(c.x-tx,c.y-ty);if(d<48){c.taken=true;coins+=25;save.coins=coins;const key=currentLevel+"_m"+(save.selectedMap||0);if(!save.collected[key])save.collected[key]=[];if(!save.collected[key].includes(i))save.collected[key].push(i);coinBurst(c.x,c.y);coinSound();changed=true;}});
  if(changed){persist();updateCoinsUI();}
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
}

// Control + vehicle stats physics।
function updatePhysics(dt){
  updateFloatTexts(dt);
  if(state!=="play")return;updateEngine();
  const v=vehiclesV22[save.selectedVehicle]||vehiclesV22[0],up=currentUpgrades();
  const enginePower=1+(up.engine-1)*.10,grip=v.grip*(1+(up.tires-1)*.055),suspension=v.suspension*(1+(up.suspension-1)*.07),boost=v.boost*(1+(up.boost-1)*.08),maxSpeed=430+v.speed*260+up.engine*18;
  if(keys.right||keys.gas)truck.vx+=(keys.gas?900:690)*enginePower*v.speed*boost*dt;
  if(keys.left)truck.vx-=520*enginePower*dt;
  if(keys.brake)truck.vx*=Math.pow(.035,dt);
  truck.vx*=Math.pow(.92,dt);truck.vx=Math.max(-260,Math.min(maxSpeed,truck.vx));truck.vy+=1500/Math.max(.7,suspension)*dt;truck.x+=truck.vx*dt;if(truck.x<220){truck.x=220;truck.vx=0;}truck.y+=truck.vy*dt;truck.wheelSpin+=truck.vx*dt/truck.wheelR;
  const wasOnGround=truck.onGround;
  const rearX=truck.x-truck.wheelBase/2,frontX=truck.x+truck.wheelBase/2,rearGround=isGap(rearX)?Infinity:terrainY(rearX),frontGround=isGap(frontX)?Infinity:terrainY(frontX),rearContact=rearGround-truck.wheelR,frontContact=frontGround-truck.wheelR;
  if(Number.isFinite(rearContact)&&Number.isFinite(frontContact)){
    const targetY=(rearContact+frontContact)/2-25,targetAngle=Math.atan2(frontContact-rearContact,truck.wheelBase);
    if(truck.y>=targetY&&truck.vy>=-150){if(!truck.onGround&&truck.vy>220){dust(truck.x,targetY+30,16);landSound();}truck.y=targetY;truck.vy*=-.08;truck.onGround=true;const diff=Math.atan2(Math.sin(targetAngle-truck.angle),Math.cos(targetAngle-truck.angle));truck.angVel+=diff*24*dt*grip;truck.angle+=truck.angVel*dt;truck.angVel*=Math.pow(.015,dt);if(Math.abs(truck.vx)>110&&Math.random()<dt*13)dust(rearX,rearContact+20,1);}
    else{if(truck.onGround&&truck.vy>200)jumpSound();truck.onGround=false;if(keys.left)truck.angVel-=4*dt*grip;if(keys.right)truck.angVel+=4*dt*grip;truck.angVel*=Math.pow(.89,dt);truck.angle+=truck.angVel*dt;}
  }else{truck.onGround=false;if(keys.left)truck.angVel-=4*dt*grip;if(keys.right)truck.angVel+=4*dt*grip;truck.angVel*=Math.pow(.90,dt);truck.angle+=truck.angVel*dt;}
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
  // Gap-এর ওপর দিয়ে জাম্প করলে crash হবে না, কিন্তু সত্যিকারে গর্তের ভেতরে (virtual ground level-এর অনেক নিচে) পড়ে গেলে crash হবে।
  // virtual ground = gap না থাকলে এখানে মাটি যত উঁচু হতো (terrainY নিজেই isGap চেক করে না, তাই এই reference height পাওয়া যায়)।
  if(centerGap||bothGap){
    const groundRef=terrainY(truck.x);
    if(truck.y>groundRef+85){crash("You fell into the gap!");return true;}
  }
  if(truck.y>H+30){crash("You fell off the mountain!");return true;}
  const a=Math.atan2(Math.sin(truck.angle),Math.cos(truck.angle));
  // আরও realistic crash: truck-এর body সত্যিকারে মাটিতে (উল্টে) ধাক্কা খেলে দ্রুত crash হবে।
  // বড় পাহাড়ের কারণে বাতাসে (jump-এ) truck স্বাভাবিকভাবেই অনেকটা ঘুরে যেতে পারে—সেটা crash না, তাই airborne threshold লেনিয়েন্ট রাখা হয়েছে;
  // আসল crash হবে যখন truck মাটিতে নেমে (onGround) উল্টে থাকা অবস্থায় body দিয়ে ধাক্কা খায়।
  if(truck.x>500&&!truck.onGround&&Math.abs(a)>2.75&&truck.y>H*.5){crash("The truck rolled over!");return true;}
  if(truck.onGround&&Math.abs(a)>1.55&&Math.abs(truck.vx)>90){crash("The truck rolled over!");return true;}
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
function completeLevel(){
  if(state!=="play")return;
  state="complete";engineStop();elapsed=(performance.now()-levelStart)/1000;
  const old=save.best[currentLevel];if(!old||elapsed<old)save.best[currentLevel]=elapsed;
  save.completed[currentLevel]=true;if(currentLevel<TOTAL_LEVELS)save.unlocked=Math.max(save.unlocked,currentLevel+1);
  const reward=75+Math.floor(currentLevel*3)+(save.selectedMap||0)*10;coins+=reward;save.coins=coins;persist();
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
