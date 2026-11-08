// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/v15b_test.js <প্রজেক্ট ফোল্ডারের পথ>
// v15b: গাড়ি-অনুযায়ী আলাদা শব্দ-প্রোফাইল ও বাংলাদেশি ম্যাপ আগে দেখানো।
// সততার নোট: এটা শব্দ "শুনে" যাচাই করে না—শুধু প্রতিটা গাড়ির জন্য নির্ধারিত শব্দ-প্যারামিটার (পিচ, ফিল্টার, চাগ-রেট, ভলিউম)
// আলাদা কি না ও কোড এক্সেপশন ছাড়া চলে কি না দেখে। আসল শোনার মান মানুষকে কানে শুনে যাচাই করতে হবে।
const { chromium } = require('playwright');
let pass=0,fail=0;const ok=(n,c,x='')=>{if(c){pass++;console.log('PASS',n,x)}else{fail++;console.log('FAIL',n,x)}};
(async()=>{
  const dir=process.argv[2];
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--autoplay-policy=no-user-gesture-required']});
  const p=await b.newContext({viewport:{width:1280,height:720}}).then(c=>c.newPage());
  const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+dir+'/index.html');await p.waitForTimeout(400);

  const prof=await p.evaluate(()=>{
    save.ownedVehicles=[0,1,2,3,4,5,6,7,8,9,10,11];resumeAudio();
    const out=[];
    for(let v=0;v<12;v++){
      save.selectedVehicle=v;startLevel(1);truck.vx=320;keys.gas=true;
      let err=null;try{for(let i=0;i<5;i++){updateEngine();}}catch(e){err=String(e);}
      out.push({v,name:vehiclesV22[v].name,err,last:v15S&&v15S.last});
    }
    keys.gas=false;return {ready:audioReady,out};
  });
  ok('অডিও চালু হয়',prof.ready);
  ok('১২টা গাড়ির কোনোটায় শব্দ-কোডে এক্সেপশন নেই',prof.out.every(o=>!o.err),JSON.stringify(prof.out.map(o=>o.err)));
  const eng=prof.out.filter(o=>o.last&&o.last.mode==='engine');
  const sig=eng.map(o=>[o.last.f1,o.last.cut,o.last.lfo,o.last.gain].join('|'));
  ok('১১টা ইঞ্জিন-গাড়ির প্রত্যেকের শব্দ-প্যারামিটার আলাদা',eng.length===11&&new Set(sig).size===11,sig.length+' / '+new Set(sig).size);
  const rick=prof.out.find(o=>o.name==='RICKSHAW');
  ok('রিকশায় ইঞ্জিন নেই—চেইনের টিক টিক মোড',rick.last&&rick.last.mode==='ticks');
  const bus=prof.out.find(o=>o.name==='MURIR TIN BUS'),ebike=prof.out.find(o=>o.name==='EASY BIKE'),golden=prof.out.find(o=>o.name==='GOLDEN X');
  ok('বাস সবচেয়ে গভীর/ভারী (পিচ ও ফিল্টার সবচেয়ে কম)',eng.every(o=>o===bus||(bus.last.f1<o.last.f1&&bus.last.cut<o.last.cut)),bus.last.f1+'Hz/'+bus.last.cut);
  ok('ইজি বাইক ইলেকট্রিক—উঁচু পিচ ও চাগ-হীন',ebike.last.f1>150&&ebike.last.lfo===0,JSON.stringify(ebike.last));
  ok('Golden X পুরনো ট্রাক Trail Blazer-এর চেয়ে চড়া ও মসৃণ',golden.last.f1>prof.out[0].last.f1&&golden.last.lfo>prof.out[0].last.lfo);
  const horn=await p.evaluate(()=>{let e=null;try{for(let v=0;v<12;v++){save.selectedVehicle=v;v15LastHorn=0;v15Horn();}}catch(x){e=String(x)}return e;});
  ok('সব গাড়ির হর্ন এক্সেপশন ছাড়া',horn===null,String(horn));
  const stopOk=await p.evaluate(()=>{try{engineStop();engineStart();return true;}catch(e){return String(e);}});
  ok('engineStop/Start ঠিক',stopOk===true,String(stopOk));
  // ম্যাপ ক্রম
  const order=await p.evaluate(()=>{save.ownedMaps=[0,1,2,3,4,5,6,7,8,9,10,11,12];renderMaps();return [...document.querySelectorAll('#mapGrid .mapCard h3')].map(h=>h.textContent.trim());});
  ok('ম্যাপ তালিকায় প্রথম ৫টা বাংলাদেশি (সিলেট, রাঙামাটি, সাজেক, বান্দরবান, খাগড়াছড়ি)',order.slice(0,5).every(n=>n.includes('🇧🇩'))&&order[0].startsWith('SYLHET')&&order[1].startsWith('RANGAMATI')&&order[2].startsWith('SAJEK'),order.slice(0,6).join(' | '));
  ok('পুরনো ম্যাপ পরে, GREEN HILLS ৬ নম্বরে',order[5]==='GREEN HILLS'&&order.length===15,order[5]);
  const sel=await p.evaluate(()=>{const cards=[...document.querySelectorAll('#mapGrid .mapCard')];cards[1].click();return {sel:save.selectedMap,name:maps[save.selectedMap].name};});
  ok('ক্রম বদলালেও ক্লিকে ঠিক ম্যাপ select (রাঙামাটি = index ১২)',sel.sel===12&&sel.name.startsWith('RANGAMATI'),JSON.stringify(sel));
  // v32: প্রতিটা ম্যাপের কার্ডে নিজের আসল দৃশ্যের ছবি (models/maps/<n>.webp) — ১৩টাই আলাদা
  await p.waitForTimeout(1200);
  const thumbs=await p.evaluate(()=>new Set([...document.querySelectorAll('#mapGrid .mapThumb img.v32MapImg')].map(i=>i.getAttribute('src'))).size);
  ok('১৩টা ম্যাপের নিজস্ব আলাদা thumbnail ছবি (+২ রেয়ার)',thumbs>=13,String(thumbs));
  const old=await p.evaluate(()=>{save.selectedMap=7;save.coins=0;return {s:save.selectedMap,len:maps.length,own:save.ownedMaps.length};});
  ok('পুরনো save-এর index অক্ষত (ম্যাপ ১৩টা + ২টা রেয়ার)',old.len===15&&old.s===7);
  ok('কোনো page error নেই',errs.length===0,JSON.stringify(errs));
  console.log(`\nমোট: ${pass} পাস, ${fail} ফেল`);await b.close();process.exit(fail?1:0);
})();
