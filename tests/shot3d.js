// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/shot3d.js <প্রজেক্ট ফোল্ডার> <আউটপুট-ফোল্ডার> '[[map,veh,level,sec],...]'
// 3D পেজ লোড করে বট-চালিত স্ক্রিনশট নেয় (সফটওয়্যার-GL; শুধু দেখার জন্য)।
const { chromium } = require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const dir=process.argv[2], out=process.argv[3]; const jobs=JSON.parse(process.argv[4]||'[[0,0,1,0]]');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary'};
const srv=http.createServer((q,r)=>{ let p=path.join(dir,decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){ r.writeHead(404); return r.end(); } r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(r); }).listen(0,async()=>{
  const port=srv.address().port; fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1280,height:640}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto(`http://127.0.0.1:${port}/3d.html`); await p.waitForTimeout(1200);
  await p.screenshot({path:out+'/menu.png'});
  for(const [map,veh,level,sec] of jobs){
    await p.evaluate(([l,m,v])=>window.__h3d.startLevel(l,m,v),[level,map,veh]); await p.waitForTimeout(1800);
    if(sec>0) await p.evaluate((sec)=>{ window.__h3d.advance(sec,(S,tr)=>{ const look=Math.min(tr.N-2,S.s+10+Math.abs(S.vf)*.6), q=tr.at(look); let a=Math.atan2(q.z-S.z,q.x-S.x)-S.psi; a=Math.atan2(Math.sin(a),Math.cos(a)); const i0=Math.floor(S.s), curv=Math.abs(tr.cpsi[Math.min(tr.N,i0+25)]-tr.cpsi[i0])/25; const g=tr.gaps.find(g=>S.s>g.s0-30&&S.s<g.s0+g.w+2); const vt=g?99:Math.max(7,Math.sqrt(4.5/Math.max(curv,1e-4))); const inp={gas:S.vf<vt,brake:S.vf>vt+3,left:a<-.04,right:a>.04,boost:!!g&&S.s>g.s0-14&&S.s<g.s0+1&&S.boostE>10}; if(!S.grounded){ inp.tiltFwd=S.pitch>.2; inp.tiltBack=S.pitch<-.2; } return inp; }); },sec);
    await p.waitForTimeout(1800); await p.screenshot({path:out+`/m${map}_v${veh}_l${level}_t${sec}.png`});
    console.log(map,veh,level,sec,JSON.stringify(await p.evaluate(()=>({s:window.__h3d.S.s,state:window.__h3d.state,crashed:window.__h3d.S.crashed,reason:window.__h3d.S.reason}))));
  }
  console.log('errors:',JSON.stringify(errs.slice(0,8)));
  await b.close(); srv.close();
});
