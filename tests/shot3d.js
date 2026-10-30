// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/shot3d.js <প্রজেক্ট ফোল্ডার> <আউটপুট-ফোল্ডার> [level map veh]
// 3D পেজ লোড করে স্ক্রিনশট নেয় (সফটওয়্যার-GL; আসল GPU-র চেয়ে ধীর)। শুধু দেখার জন্য।
const { chromium } = require('playwright'); const http=require('http'), fs=require('fs'), path=require('path');
const dir=process.argv[2], out=process.argv[3]; const [level=1,map=0,veh=0]=process.argv.slice(4).map(Number);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.glb':'model/gltf-binary'};
const srv=http.createServer((q,r)=>{ let p=path.join(dir,decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){ r.writeHead(404); return r.end(); } r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(r); }).listen(0,async()=>{
  const port=srv.address().port; fs.mkdirSync(out,{recursive:true});
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const p=await b.newPage({viewport:{width:1280,height:640}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto(`http://127.0.0.1:${port}/3d.html`); await p.waitForTimeout(1500);
  await p.screenshot({path:out+'/menu.png'});
  await p.evaluate(([l,m,v])=>window.__h3d.startLevel(l,m,v),[level,map,veh]); await p.waitForTimeout(2500);
  await p.screenshot({path:out+`/play_${level}_${map}_${veh}.png`});
  await p.evaluate(()=>window.__h3d.advance(14,{gas:true})); await p.waitForTimeout(2500); await p.screenshot({path:out+`/drive_${level}_${map}_${veh}.png`});
  console.log(JSON.stringify(await p.evaluate(()=>({x:window.__h3d.S.x,state:window.__h3d.state,crashed:window.__h3d.S.crashed,reason:window.__h3d.S.reason}))));
  console.log('errors:',JSON.stringify(errs.slice(0,8)));
  await b.close(); srv.close();
});
