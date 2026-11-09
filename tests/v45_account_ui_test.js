// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node --no-warnings tests/v45_account_ui_test.js <প্রজেক্ট ফোল্ডার>
// আসল functions/api/*.js হ্যান্ডলার + নকল D1 (node:sqlite) দিয়ে লোকাল সার্ভার; ব্রাউজারে রেজিস্টার → দ্বিতীয় ব্রাউজারে লগইন → সেভ মেলানো।
const http=require('http'),fs=require('fs'),path=require('path');const { DatabaseSync }=require('node:sqlite');const { chromium }=require('playwright');
const dir=process.argv[2];let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n);}else{fail++;console.log('FAIL',n,d===undefined?'':JSON.stringify(d));}};
(async()=>{
  const H={};for(const n of ['email-code','register','login','reset','profile','save','submit','leaderboard'])H[n]=await import('file://'+path.join(dir,'functions/api',n+'.js'));
  const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(path.join(dir,'db/schema.sql'),'utf8'));
  const mk=(a)=>({async run(){db.prepare(a.sql).run(...a.args);return{success:true};},async first(){return db.prepare(a.sql).get(...a.args)||null;},async all(){return{results:db.prepare(a.sql).all(...a.args)};}});
  const env={DEV_ECHO_CODE:'1',DB:{prepare(sql){const m=mk({sql,args:[]});return{...m,bind(...args){return mk({sql,args});}};}}};
  let lastCode='';
  const srv=http.createServer(async(req,res)=>{
    const u=new URL(req.url,'http://x');
    if(u.pathname.startsWith('/api/')){
      const n=u.pathname.slice(5);const h=H[n];if(!h){res.writeHead(404);return res.end();}
      const body=await new Promise(r=>{let t='';req.on('data',c=>t+=c);req.on('end',()=>r(t));});
      const rq=new Request('http://x'+req.url,{method:req.method,body:req.method==='POST'?body:undefined});
      const out=await (req.method==='POST'?h.onRequestPost:h.onRequestGet)({request:rq,env});
      const txt=await out.text();if(n==='email-code'){try{lastCode=JSON.parse(txt).devCode||lastCode;}catch(e){}}
      res.writeHead(out.status,{'content-type':'application/json'});return res.end(txt);
    }
    let f=path.join(dir,u.pathname==='/'?'index.html':u.pathname);
    fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end();}const ext=path.extname(f);res.writeHead(200,{'content-type':{'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.json':'application/json'}[ext]||'application/octet-stream'});res.end(d);});
  });
  await new Promise(r=>srv.listen(0,r));const base='http://127.0.0.1:'+srv.address().port;
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const mkPage=async()=>{const c=await b.newContext({viewport:{width:1000,height:640}});const p=await c.newPage();p.__errs=[];p.on('pageerror',e=>p.__errs.push(String(e)));await p.goto(base+'/index.html?noshell=1');await p.waitForTimeout(500);await p.evaluate(()=>localStorage.setItem('hillrush_lang','bn'));return p;};
  const openLb=async p=>{await p.evaluate(()=>{V50.open();});await p.waitForTimeout(500);};
  // ফোন ১: রেজিস্টার
  const A=await mkPage();
  await A.evaluate(()=>{save.coins=777;coins=777;save.unlocked=5;save.completed={1:true,2:true,3:true,4:true};save.ownedVehicles=[0,1];save.ownedMaps=[0];save.best={1:30.5};persist();});
  await openLb(A);
  await A.click('.v45Tabs button[data-a="reg"]');await A.waitForTimeout(200);
  await A.fill('#v45_email','azizul@test.com');await A.click('#v45Send');await A.waitForTimeout(500);
  ok('কোড পাঠানোর পর কুলডাউন বাটন',(await A.textContent('#v45Send')).includes('(')||await A.isDisabled('#v45Send'));
  await A.fill('#v45_code','000000');await A.fill('#v45_name','Azizul');await A.fill('#v45_pin','4321');await A.click('#v45Reg');await A.waitForTimeout(700);
  ok('ভুল কোডে ত্রুটি দেখায়',!!(await A.textContent('#profileBody')).match(/কোড ভুল|Wrong or expired code/));
  await A.fill('#v45_code',lastCode);await A.click('#v45Reg');await A.waitForTimeout(1200);
  const prof=await A.evaluate(()=>v17Profile());ok('রেজিস্টার হয়ে প্রোফাইল সেভ',prof&&!prof.guest&&prof.name==='Azizul',prof);
  const tx=await A.textContent('#profileBody');ok('রেজিস্টার হলে সিঙ্ক বার্তা/অবস্থা',(tx.includes('নিবন্ধিত')||tx.includes('Registered')),tx.slice(0,300));
  // অ্যাভাটার ও নাম বদল
  await A.click('.v45AvB[data-i="3"]');await A.waitForTimeout(500);
  ok('অ্যাভাটার বদল সেভ',(await A.evaluate(()=>v17Profile().avatar))===3);
  await A.fill('#v45_rename','AzizulBD');await A.click('#v45Rename');await A.waitForTimeout(600);
  ok('নাম বদল',(await A.evaluate(()=>v17Profile().name))==='AzizulBD');
  // ক্লাউডে সেভ গেছে
  await A.evaluate(()=>V45.push());await A.waitForTimeout(300);
  // ফোন ২: নতুন ব্রাউজার, লগইন
  const B=await mkPage();await openLb(B);
  ok('ফোন ২-এ শুরুতে ডিফল্ট কয়েন',(await B.evaluate(()=>save.coins))===250);
  await B.click('.v45Tabs button[data-a="login"]');await B.waitForTimeout(200);
  await B.fill('#v45_login','azizul@test.com');await B.fill('#v45_pin','9999');await B.click('#v45Login');await B.waitForTimeout(700);
  ok('ভুল PIN-এ লগইন হয় না',!(await B.evaluate(()=>v17Profile())));
  await B.fill('#v45_pin','4321');await B.click('#v45Login');await B.waitForTimeout(1500);
  const sB=await B.evaluate(()=>({coins:save.coins,unlocked:save.unlocked,done:Object.keys(save.completed).length,veh:save.ownedVehicles,best:save.best,name:v17Profile().name,av:v17Profile().avatar}));
  ok('ফোন ২-এ লগইনে কয়েন, আনলক, গাড়ি, সেরা সময় এসেছে',sB.coins===777&&sB.unlocked===5&&sB.done===4&&sB.veh.includes(1)&&sB.best[1]===30.5,sB);
  ok('নাম ও অ্যাভাটার এসেছে',sB.name==='AzizulBD'&&sB.av===3,sB);
  // ফোন ২-এ কেনা → সিঙ্ক → ফোন ১ রিলোডে দেখা যায়, কয়েন দ্বিগুণ হয় না
  await B.evaluate(()=>{save.ownedMaps=[0,1];save.coins=777-1450+1450-300;coins=save.coins;persist();});
  await B.evaluate(()=>V45.push());await B.waitForTimeout(300);
  await A.evaluate(()=>V45.pull());await A.waitForTimeout(500);
  const sA=await A.evaluate(()=>({maps:save.ownedMaps,coins:save.coins}));
  ok('ফোন ২-এ কেনা ম্যাপ ফোন ১-এ এলো',sA.maps.includes(1),sA);
  // PIN রিসেট
  const C=await mkPage();await openLb(C);await C.click('.v45Tabs button[data-a="login"]');await C.click('#v45Forgot');await C.waitForTimeout(200);
  await C.fill('#v45_email','azizul@test.com');await C.click('#v45SendR');await C.waitForTimeout(600);
  await C.fill('#v45_code',lastCode);await C.fill('#v45_newpin','2468');await C.click('#v45Reset');await C.waitForTimeout(1500);
  ok('PIN রিসেট করে লগইন',await C.evaluate(()=>{const p=v17Profile();return !!(p&&p.name==='AzizulBD');}));
  // লিডারবোর্ডে মোট আয়
  await C.evaluate(()=>{save.earnedTotal=1234;});await C.evaluate(()=>v17Api('/api/submit',{method:'POST',body:JSON.stringify(v39SubmitBody({}))}));
  const lb=await C.evaluate(()=>v17Api('/api/leaderboard?type=overall').then(j=>j.rows));ok('লিডারবোর্ডে মোট আয় ও অ্যাভাটার',lb.some(r=>r.coins===1234&&r.avatar===3),lb);
  // নতুন গেস্ট থেকে আপগ্রেড
  const D=await mkPage();await openLb(D);await D.click('.v45Tabs button[data-a="guest"]');await D.click('#v45Guest');await D.waitForTimeout(700);
  ok('গেস্ট প্রোফাইল',await D.evaluate(()=>{const p=v17Profile();return !!(p&&p.guest);}));
  ok('গেস্ট দেখায় রেজিস্টার ফর্ম',await D.isVisible('#v45Reg'));
  for(const p of [A,B,C,D])ok('page error নেই',p.__errs.length===0,p.__errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();srv.close();process.exit(fail?1:0);
})();
