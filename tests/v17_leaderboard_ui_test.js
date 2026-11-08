// চালানো: NODE_PATH=$(npm root -g) node --no-warnings tests/v17_leaderboard_ui_test.js <প্রজেক্ট ফোল্ডার>
// নকল-D1 (node:sqlite) সার্ভারসহ ব্রাউজারে লিডারবোর্ড UI পরীক্ষা। আসল Cloudflare D1/ইন্টারনেটে চালানো হয়নি।
const { chromium } = require('playwright'); const http=require('http'), fs=require('fs'), path=require('path'); const { DatabaseSync } = require('node:sqlite');
const dir=process.argv[2]||'.'; const withApi=process.argv[3]!=='noapi';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg'};
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m);} };
(async()=>{
  const db=new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(dir,'db/schema.sql'),'utf8'));
  const env={DB:{prepare(sql){ const st=db.prepare(sql); const ex=a=>({async run(){st.run(...a);return{success:true};},async first(){return st.get(...a)||null;},async all(){return{results:st.all(...a)};}}); return {...ex([]),bind(...a){return ex(a);}}; }}};
  const H={register:await import(path.resolve(dir,'functions/api/register.js')),submit:await import(path.resolve(dir,'functions/api/submit.js')),leaderboard:await import(path.resolve(dir,'functions/api/leaderboard.js')),login:await import(path.resolve(dir,'functions/api/login.js'))};
  const srv=http.createServer(async(q,r)=>{ const u=new URL(q.url,'http://x');
    if(u.pathname.startsWith('/api/')&&withApi){ const name=u.pathname.split('/')[2]; const h=H[name]; if(!h){ r.writeHead(404); return r.end(); }
      let body=''; for await(const c of q) body+=c; const req=new Request('http://x'+q.url,{method:q.method,body:q.method==='POST'?body:undefined});
      const res=await (q.method==='POST'?h.onRequestPost:h.onRequestGet)({request:req,env}); r.writeHead(res.status,{'content-type':'application/json'}); return r.end(await res.text()); }
    let p=path.join(dir,decodeURIComponent(u.pathname)); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){ r.writeHead(404,{'content-type':'text/html'}); return r.end('<html>404</html>'); } r.writeHead(200,{'content-type':mime[path.extname(p)]||'application/octet-stream'}); fs.createReadStream(p).pipe(r); }).listen(0,async()=>{
    const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const p=await b.newPage({viewport:{width:1100,height:650}}); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(`http://127.0.0.1:${srv.address().port}/index.html`); await p.waitForTimeout(700);
    await p.evaluate(()=>localStorage.setItem('hillrush_lang','bn')); await p.reload(); await p.waitForTimeout(700); // বাংলা মোডে বার্তা যাচাই
    ok(await p.evaluate(()=>!!document.getElementById('leaderBtn')),'মেনুতে LEADERBOARD বাটন আছে');
    await p.click('#leaderBtn'); await p.waitForTimeout(500);
    ok(await p.evaluate(()=>getComputedStyle(document.getElementById('leaderMenu')).display!=='none'),'লিডারবোর্ড স্ক্রিন খোলে');
    if(!withApi){
      const t=await p.evaluate(()=>document.getElementById('leaderBody').innerText); ok(/সংযুক্ত নয়/.test(t),'সার্ভার না থাকলে পরিষ্কার বার্তা + লোকাল তালিকা');
    } else {
      await p.click('#v45Guest'); await p.waitForTimeout(500);
      const prof=await p.evaluate(()=>JSON.parse(localStorage.getItem('hillrush_profile_v1')||'null')); ok(prof&&prof.guest&&/^Guest-/.test(prof.name),'গেস্ট প্রোফাইল তৈরি ও সেভ');
      await p.evaluate(()=>{ startLevel(1); state='play'; levelStart=performance.now()-30000; completeLevel(); }); await p.waitForTimeout(800);
      await p.evaluate(()=>{ goMain(); }); await p.click('#leaderBtn'); await p.waitForTimeout(600);
      const t=await p.evaluate(()=>document.getElementById('lbList').innerText); ok(new RegExp(prof.name).test(t),'লেভেল শেষ করলে ওভারঅল তালিকায় নিজের নাম আসে');
      await p.click('#lbTabL'); await p.waitForTimeout(300); await p.click('#lbGo'); await p.waitForTimeout(500);
      const t2=await p.evaluate(()=>document.getElementById('lbList').innerText); ok(new RegExp(prof.name).test(t2),'লেভেল-ট্যাবে সময়সহ নিজের নাম');
      // v39: লেভেল শেষের পর্দায় র‍্যাংক
      await p.evaluate(()=>{ goMain(); startLevel(2); state='play'; levelStart=performance.now()-20000; completeLevel(); }); await p.waitForTimeout(900);
      ok(/র‍্যাংক: #1/.test(await p.evaluate(()=>(document.querySelector('#completeMenu .v39Rank')||{}).textContent||'')),'লেভেল শেষে অনলাইন র‍্যাংক দেখায়');
      // রেজিস্টার/লগইন/রিসেট/সিঙ্ক এখন tests/v45_account_ui_test.js-এ পরীক্ষা হয়
      await p.evaluate(()=>{ goMain(); startEndless(); truck.x=250+6000; endEndlessRun('test'); }); await p.waitForTimeout(900);
      ok(/এন্ডলেস র‍্যাংক: #1/.test(await p.evaluate(()=>(document.querySelector('#endlessMenu .v39Rank')||{}).textContent||'')),'এন্ডলেস শেষে র‍্যাংক');
      await p.evaluate(()=>goMain()); await p.click('#leaderBtn'); await p.waitForTimeout(400); await p.click('#lbTabE'); await p.waitForTimeout(600);
      ok(/600 মিটার/.test(await p.evaluate(()=>document.getElementById('lbList').innerText)),'এন্ডলেস ট্যাবে দূরত্ব');
    }
    ok(errs.length===0,'কোনো page error নেই '+JSON.stringify(errs.slice(0,2)));
    console.log(`\n${pass} পাস, ${fail} ফেল`); await b.close(); srv.close(); process.exit(fail?1:0); });
})();
