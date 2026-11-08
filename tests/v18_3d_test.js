// v18 আসল-3D পরীক্ষা (Playwright + সফটওয়্যার GL)। চালানো: NODE_PATH=$(npm root -g) node tests/v18_3d_test.js <প্রজেক্ট ফোল্ডার>
// সৎ নোট: এটা বট-চালিত লজিক পরীক্ষা; আসল ডিভাইসের FPS/টাচ-অনুভূতি এখানে মাপা হয় না।
const { chromium } = require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const dir=process.argv[2]||'.';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg','.json':'application/json'};
let pass=0, fail=0; const ok=(c,m)=>{ if(c){ pass++; console.log('PASS',m); } else { fail++; console.log('FAIL',m); } };
const srv=http.createServer((q,r)=>{ let p=path.join(dir,decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){ r.writeHead(404); return r.end(); } r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(r); }).listen(0,async()=>{
  const port=srv.address().port, base=`http://127.0.0.1:${port}`;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const ctx=await b.newContext({viewport:{width:1100,height:600}}); const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error'&&!/404/.test(m.text())) errs.push('console: '+m.text()); });
  // ২D গেমের সেভ-কী আগে বসাই — 3D যেন ছুঁতে না পারে
  await p.goto(base+'/index.html'); await p.waitForTimeout(800);
  const link=await p.evaluate(()=>{ const a=document.getElementById('play3dLink'); return a&&a.getAttribute('href'); });
  ok(link===null||link==='3d.html','3D লিংক v38-এ সরানো হয়েছে (নেই বা আছে দুটোই ঠিক)');
  await p.evaluate(()=>{ localStorage.setItem('hillrush_2d_sentinel','keep-me'); });
  const before2d=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).filter(k=>k!=='hillrush3d_v1').sort().map(k=>[k,localStorage.getItem(k)])));
  await p.goto(base+'/3d.html'); await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>!!window.__h3d && window.__h3d.state==='menu'),'3D পেজ লোড, মেনু অবস্থা');
  await p.evaluate(()=>{ window.__h3dNoRender=true; });   // লজিক-টেস্ট: রেন্ডার বন্ধ (সফটওয়্যার-GL ধীর); স্ক্রিনশট আলাদা স্ক্রিপ্টে
  // সব ২০ কম্বো শুরু হয়
  let comboOK=0; const combos=[];
  for(let m=0;m<5;m++) for(let v=0;v<4;v++){ const r=await p.evaluate(([m,v])=>{ window.__h3d.startLevel(1,m,v); const h=window.__h3d; return h.state==='play' && !!h.S && h.tr.coins.length>10 && h.tr.gaps.length>=2; },[m,v]); if(r) comboOK++; else combos.push(m+'/'+v); await p.waitForTimeout(150); }
  ok(comboOK===20,`৫ ম্যাপ × ৪ গাড়ি = ২০ কম্বো শুরু হয় (${comboOK}/20) ${combos.join(',')}`);
  // বট-চালিত ফিনিশ → complete, আনলক, সেভ
  const botSrc=`(S,tr,slow)=>{ const look=Math.min(tr.N-2,S.s+10+Math.abs(S.vf)*.6), q=tr.at(look); let a=Math.atan2(q.z-S.z,q.x-S.x)-S.psi; a=Math.atan2(Math.sin(a),Math.cos(a)); const i0=Math.floor(S.s), curv=Math.abs(tr.cpsi[Math.min(tr.N,i0+25)]-tr.cpsi[i0])/25; const g=tr.gaps.find(g=>S.s>g.s0-30&&S.s<g.s0+g.w+2); let vt=g?99:Math.max(7,Math.sqrt(4.5/Math.max(curv,1e-4))); if(slow) vt=2.5; const inp={gas:S.vf<vt,brake:S.vf>vt+3,left:a<-.04,right:a>.04,boost:!slow&&!!g&&S.s>g.s0-14&&S.s<g.s0+1&&S.boostE>10}; if(!S.grounded){ inp.tiltFwd=S.pitch>.2; inp.tiltBack=S.pitch<-.2; } return inp; }`;
  const run=(slow)=>p.evaluate(([src,slow])=>{ const bot=eval(src); const h=window.__h3d; let n=0; while(h.state==='play'&&n<60*300){ h.__step(bot(h.S,h.tr,slow)); n++; } return {state:h.state,reason:h.S.reason,s:h.S.s,L:h.tr.L,t:n/60}; },[botSrc,slow]);
  let done=false;
  for(const [m,v] of [[0,1],[1,2],[3,3],[4,0],[2,1]]){ await p.evaluate(([m,v])=>window.__h3d.startLevel(1,m,v),[m,v]); const r=await run(false); if(r.state==='complete'){ done=true; ok(true,`বট লেভেল ১ শেষ করল (ম্যাপ ${m}, গাড়ি ${v}) ${r.t.toFixed(0)}s`); break; } else console.log('  (বট ব্যর্থ',m,v,r.reason,r.s,'/',r.L,')'); }
  ok(done,'অন্তত একটি কম্বোতে বট ফিনিশ করতে পারে');
  const sv=await p.evaluate(()=>JSON.parse(localStorage.getItem('hillrush3d_v1')||'null'));
  ok(sv && sv.unlocked>=2 && sv.coins>0,'ফিনিশে লেভেল ২ আনলক ও কয়েন সেভ হয়');
  ok(await p.evaluate(()=>document.getElementById('completeMenu').classList.contains('hidden')===false),'Complete মেনু দেখা যায়');
  // ধীরে গেলে খাদে পড়ে → ক্র্যাশ
  await p.evaluate(()=>window.__h3d.startLevel(1,0,0));
  const r2=await run(true);
  ok(r2.state==='crash' && /gap/i.test(r2.reason),`ধীরে চালালে খাদে পড়ে ক্র্যাশ ("${r2.reason}")`);
  // দ্রুত গেলে খাদ পার হয় (বুস্ট সহ বট)
  await p.evaluate(()=>window.__h3d.startLevel(1,0,0));
  const jumped=await p.evaluate(([src])=>{ const bot=eval(src); const h=window.__h3d; const g0=h.tr.gaps[0]; let n=0, passed=false; while(h.state==='play'&&n<60*60){ h.__step(bot(h.S,h.tr,false)); n++; if(h.S.s>g0.s0+g0.w+4){ passed=true; break; } } return passed; },[botSrc]);
  ok(jumped,'পর্যাপ্ত গতিতে প্রথম খাদ লাফিয়ে পার হওয়া যায়');
  // রিট্রাই/চেকপয়েন্ট
  await p.evaluate(()=>window.__h3d.startLevel(1,2,2));
  const cp=await p.evaluate(([src])=>{ const bot=eval(src); const h=window.__h3d; let n=0; while(h.state==='play'&&n<60*120){ h.__step(bot(h.S,h.tr,false)); n++; if(h.tr.cps[0].hit) break; } return h.tr.cps[0].hit; },[botSrc]);
  ok(cp,'চেকপয়েন্ট স্পর্শ হয়');
  // ২D সেভ অক্ষত
  const after2d=await p.evaluate(()=>JSON.stringify(Object.keys(localStorage).filter(k=>k!=='hillrush3d_v1').sort().map(k=>[k,localStorage.getItem(k)])));
  ok(before2d===after2d,'3D খেললে ২D-এর localStorage বদলায়নি');
  ok(errs.length===0,'কোনো JS error নেই '+JSON.stringify(errs.slice(0,3)));
  console.log(`\n${pass} পাস, ${fail} ফেল`); await b.close(); srv.close(); process.exit(fail?1:0);
});
