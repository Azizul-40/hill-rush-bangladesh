// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/v17_3d_test.js <প্রজেক্ট ফোল্ডার>
// 3D পেজের স্মোক-টেস্ট + ফিজিক্স-অবস্থা (সফটওয়্যার-GL; আসল GPU/ফোনে ফ্রেমরেট মাপা হয়নি)।
const { chromium } = require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const dir=process.argv[2]; let pass=0,fail=0; const ok=(n,c,x)=>{ c?pass++:fail++; console.log((c?'PASS':'FAIL')+': '+n+(c?'':'  ← '+JSON.stringify(x))); };
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png'};
const srv=http.createServer((q,r)=>{ let p=path.join(dir,decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){ r.writeHead(404); return r.end(); } r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(r); }).listen(0,async()=>{
  const port=srv.address().port;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1000,height:560}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(`http://127.0.0.1:${port}/3d.html`); await p.waitForTimeout(1200);
  ok('মেনুতে ৪টা গাড়ি ও ৫টা ম্যাপ', await p.evaluate(()=>document.querySelectorAll('#vehList .card').length===4&&document.querySelectorAll('#mapList .card').length===5));
  // সব ম্যাপ × সব গাড়ি লোড হয়, এরর ছাড়া
  let allLoad=true; const bad=[];
  for(let m=0;m<5;m++) for(let v=0;v<4;v++){ const r=await p.evaluate(([m,v])=>{ try{ window.__h3d.startLevel(2,m,v); return window.__h3d.state; }catch(e){ return 'ERR '+e; } },[m,v]); await p.waitForTimeout(150); if(r!=='play'){ allLoad=false; bad.push([m,v,r]); } }
  ok('৫ ম্যাপ × ৪ গাড়ি সবই শুরু হয়', allLoad, bad);
  // গ্যাস দিয়ে লেভেল ১ শেষ করা যায় (সব গাড়ি, ম্যাপ ০)
  const fin=[]; for(let v=0;v<4;v++){ await p.evaluate(([v])=>window.__h3d.startLevel(1,0,v),[v]); await p.waitForTimeout(100);
    const r=await p.evaluate(()=>{ const h=window.__h3d; const S=h.S; for(let t=0;t<200&&!S.crashed&&S.x<h.lv.L;t+=1/60){ const sl=Math.atan(h.lv.slope(S.x)); const i={gas:true,brake:false,boost:false,tiltBack:false,tiltFwd:false}; if(!S.grounded){ const e=sl-S.ang; i.tiltBack=e>.12; i.tiltFwd=e<-.12; } const g=h.lv.gaps.find(g=>S.x>g[0]-14&&S.x<g[0]+1); if(g&&S.grounded) i.boost=true; h.__step(i); } return {x:S.x,L:h.lv.L,crashed:S.crashed,reason:S.reason}; }).catch(e=>({err:String(e)})); fin.push(r); }
  ok('লেভেল ১: চারটা গাড়ির সব কটা ফিনিশে পৌঁছায়', fin.every(r=>r.x>=r.L-1), fin);
  // গ্যাপে আস্তে ঢুকলে পড়ে, ক্র্যাশ মেনু আসে
  await p.evaluate(()=>window.__h3d.startLevel(1,0,0)); await p.waitForTimeout(100);
  const fall=await p.evaluate(async()=>{ const h=window.__h3d, S=h.S, g=h.lv.gaps[0]; S.x=g[0]+g[1]/2; S.y=h.lv.hgt(g[0])+3; S.vx=1; for(let t=0;t<6&&!S.crashed;t+=1/60) h.__step({gas:false,brake:false,boost:false,tiltBack:false,tiltFwd:false}); await new Promise(r=>setTimeout(r,700)); return {crashed:S.crashed,reason:S.reason,state:h.state}; });
  ok('গ্যাপে আস্তে পড়লে ক্র্যাশ ও মেনু', fall.crashed&&/gap/i.test(fall.reason)&&fall.state==='crash', fall);
  // লেভেল শেষ → আনলক ও সেভ
  await p.evaluate(()=>window.__h3d.startLevel(1,0,0)); await p.waitForTimeout(100);
  const done=await p.evaluate(async()=>{ const h=window.__h3d,S=h.S; S.x=h.lv.finishX-.02; S.y=h.lv.hgt(S.x)+2; S.vx=6; h.__step({gas:true}); await new Promise(r=>setTimeout(r,500)); return {state:h.state,unlocked:h.save.unlocked,coins:h.save.coins,ls:JSON.parse(localStorage.getItem('hillrush3d_v1')||'{}').unlocked}; });
  ok('ফিনিশ → complete, লেভেল ২ আনলকড, localStorage-এ সেভ', done.state==='complete'&&done.unlocked>=2&&done.ls>=2&&done.coins>=63, done);
  // 2D সেভে হাত পড়েনি
  ok('2D গেমের সেভ-কী ছোঁয়া হয়নি', await p.evaluate(()=>!Object.keys(localStorage).some(k=>k!=='hillrush3d_v1'&&/3d/i.test(k))));
  ok('পেজে JS এরর নেই', errs.length===0, errs);
  // 2D পেজ অক্ষত ও 3D লিংক আছে
  await p.goto(`http://127.0.0.1:${port}/index.html`); await p.waitForTimeout(700);
  ok('2D মেনুতে 3D (BETA) লিংক', await p.evaluate(()=>{ const a=document.getElementById('play3dLink'); return !!a&&a.getAttribute('href')==='3d.html'; }));
  console.log(`\n${pass} পাস, ${fail} ফেল`); await b.close(); srv.close(); process.exit(fail?1:0);
});
