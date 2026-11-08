// চালানো: node --no-warnings tests/leaderboard_api_test.js
// D1-এর বদলে node:sqlite দিয়ে নকল D1 বানিয়ে handler-এর লজিক পরীক্ষা। আসল Cloudflare D1-এ এখনো চালানো হয়নি।
import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs';
import * as reg from '../functions/api/register.js'; import * as login from '../functions/api/login.js'; import * as sub from '../functions/api/submit.js'; import * as lb from '../functions/api/leaderboard.js'; import * as ec from '../functions/api/email-code.js'; import * as rs from '../functions/api/reset.js'; import * as pf from '../functions/api/profile.js'; import * as sv from '../functions/api/save.js';
const db=new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));
const env={DEV_ECHO_CODE:'1',DB:{prepare(sql){ const st=db.prepare(sql); const ex=(a)=>({ async run(){ st.run(...a); return {success:true}; }, async first(){ return st.get(...a)||null; }, async all(){ return {results:st.all(...a)}; } }); return { ...ex([]), bind(...a){ return { async run(){ st.run(...a); return {success:true}; }, async first(){ return st.get(...a)||null; }, async all(){ return {results:st.all(...a)}; } }; } }; }}};
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m);} };
const post=(h,body)=>h.onRequestPost({request:new Request('http://x/api',{method:'POST',body:JSON.stringify(body)}),env}).then(async r=>({s:r.status,j:await r.json()}));
// ইমেইল কোড নিয়ে রেজিস্টার (DEV_ECHO_CODE=1 হলে কোড উত্তরে আসে)
const regv=async(name,pin,email,extra={})=>{ const c=await post(ec,{email,purpose:'register'}); return post(reg,{name,pin,email,code:c.j.devCode,...extra}); };
const get=(q)=>lb.onRequestGet({request:new Request('http://x/api/leaderboard?'+q),env}).then(async r=>({s:r.status,j:await r.json()}));
const g=await post(reg,{guest:true}); ok(g.j.ok&&g.j.token&&/^Guest-\d{4}$/.test(g.j.name),'গেস্ট রেজিস্টার');
const a=await regv('Azizul','1234','A@Test.com'); ok(a.j.ok&&a.j.id,'ইমেইল-কোড দিয়ে রেজিস্টার');
const dup=await post(ec,{email:'a@test.com',purpose:'register'}); ok(dup.s===409,'একই ইমেইল দুবার নয়');
ok((await post(ec,{email:'nope',purpose:'register'})).s===400,'ভুল ইমেইল বাতিল');
ok((await regv('<b>Hi</b>','1234','h@x.com')).j.name==='bHi/b','নামের বিপজ্জনক চিহ্ন ছাঁটা');
ok((await post(sub,{id:a.j.id,token:'wrong',map:0,level:1,time:30,unlocked:2,completed:1,coins:10})).s===401,'ভুল token বাতিল');
ok((await post(sub,{id:a.j.id,token:a.j.token,map:0,level:1,time:30.5,unlocked:2,completed:1,coins:100})).j.ok,'স্কোর জমা');
ok((await post(sub,{id:a.j.id,token:a.j.token,map:0,level:1,time:40,unlocked:2,completed:1,coins:100})).j.ok,'খারাপ সময় জমা (গ্রহণযোগ্য, সেরা বদলায় না)');
ok((await post(sub,{id:g.j.id,token:g.j.token,map:0,level:1,time:25,unlocked:3,completed:2,coins:50})).j.ok,'গেস্টের স্কোর');
ok((await post(sub,{id:g.j.id,token:g.j.token,map:0,level:1,time:2,unlocked:3,completed:2,coins:50})).s===400,'অসম্ভব দ্রুত সময় বাতিল');
const l=await get('type=level&map=0&level=1'); ok(l.j.rows.length===2&&l.j.rows[0].time===25&&l.j.rows[1].time===30.5,'লেভেল বোর্ড: কম সময় আগে, সেরা সময় টিকে থাকে');
const o=await get('type=overall'); ok(o.j.rows[0].completed===2,'ওভারঅল বোর্ড সাজানো');
ok((await get('type=level&map=99&level=1')).s===400,'ভুল map বাতিল');
ok((await lb.onRequestGet({request:new Request('http://x/api/leaderboard'),env:{}})).status===503,'DB না থাকলে ৫০৩');
// ---- v39: নাম + PIN, লগইন, গেস্ট থেকে নিবন্ধিত, এন্ডলেস, র‍্যাংক ----
const r1=await regv('Rahim','4321','rahim@x.com'); ok(r1.j.ok&&!r1.j.guest,'নাম + PIN + ইমেইল দিয়ে রেজিস্টার');
ok((await regv('rahim','1111','other@x.com')).s===409,'একই নাম (ছোট-বড় হাত আলাদা হলেও) দুবার নয়');
ok((await regv('Karim','12','karim@x.com')).s===400,'ছোট PIN বাতিল');
ok((await post(login,{name:'RAHIM',pin:'0000'})).s===401,'ভুল PIN-এ লগইন হয় না');
const lg=await post(login,{login:'rahim@x.com',pin:'4321'}); ok(lg.j.ok&&lg.j.id===r1.j.id&&lg.j.token!==r1.j.token,'ঠিক PIN-এ লগইন, নতুন ডিভাইসের টোকেন');
const s1=await post(sub,{id:lg.j.id,token:lg.j.token,map:2,level:5,time:41,unlocked:6,completed:5,coins:10}); ok(s1.j.ok&&s1.j.rank===1&&s1.j.total===1,'নতুন টোকেনে স্কোর জমা + র‍্যাংক');
ok((await post(sub,{id:r1.j.id,token:r1.j.token,map:2,level:5,time:39,unlocked:6,completed:5,coins:10})).j.ok,'পুরনো ডিভাইসের টোকেনও কাজ করে');
const s2=await post(sub,{id:g.j.id,token:g.j.token,map:2,level:5,time:35,unlocked:6,completed:5,coins:10}); ok(s2.j.rank===1&&s2.j.total===2,'দ্রুততর সময় হলে র‍্যাংক ১');
const me=await get('type=level&map=2&level=5&me='+r1.j.id); ok(me.j.me&&me.j.me.rank===2&&me.j.rows.some(r=>r.mine)&&!('id' in me.j.rows[0]),'নিজের র‍্যাংক আর সারি চিহ্ন; অন্যের id লুকানো');
const e1=await post(sub,{id:r1.j.id,token:r1.j.token,unlocked:6,completed:5,coins:10,endless:{map:3,dist:820}}); ok(e1.j.endlessRank===1&&e1.j.endlessBest===820,'এন্ডলেস দূরত্ব জমা');
await post(sub,{id:g.j.id,token:g.j.token,unlocked:6,completed:5,coins:10,endless:{map:3,dist:1200}});
await post(sub,{id:r1.j.id,token:r1.j.token,unlocked:6,completed:5,coins:10,endless:{map:3,dist:500}});
const eb=await get('type=endless&map=3&me='+r1.j.id); ok(eb.j.rows[0].dist===1200&&eb.j.rows[1].dist===820&&eb.j.me.rank===2,'এন্ডলেস বোর্ড: বেশি দূরত্ব আগে, সেরা দূরত্ব টিকে থাকে');
const gu=await post(reg,{guest:true}); const up=await regv('Sumi','5555','sumi@x.com',{id:gu.j.id,token:gu.j.token}); ok(up.j.ok&&up.j.id===gu.j.id&&up.j.upgraded,'গেস্ট থেকে নিবন্ধিত, একই id');
ok((await post(login,{name:'sumi',pin:'5555'})).j.ok,'নিবন্ধিত গেস্ট অন্য ডিভাইসে লগইন করতে পারে');
for(let i=0;i<5;i++) await post(login,{name:'Sumi',pin:'9999'});
ok((await post(login,{name:'Sumi',pin:'5555'})).s===429,'৫ বার ভুল PIN হলে কিছুক্ষণ লগইন বন্ধ');
// ---- v45: কোড যাচাই, রিসেট, প্রোফাইল, ক্লাউড সেভ, মোট আয় ----
ok((await post(reg,{name:'NoCode',pin:'1234',email:'nc@x.com',code:'000000'})).s===400,'ভুল কোডে রেজিস্টার হয় না');
const c1=await post(ec,{email:'fast@x.com',purpose:'register'}); const c2=await post(ec,{email:'fast@x.com',purpose:'register'}); ok(c1.j.ok&&c2.s===429,'৪৫ সেকেন্ডের আগে নতুন কোড নয়');
ok((await post(reg,{name:'Fast',pin:'1234',email:'fast@x.com',code:c1.j.devCode})).j.ok,'ঠিক কোডে রেজিস্টার');
ok((await post(reg,{name:'Fast2',pin:'1234',email:'fast@x.com',code:c1.j.devCode})).s===409,'কোড একবারই চলে (ইমেইল এখন নেওয়া)');
const cb=await post(ec,{email:'bad@x.com',purpose:'register'}); for(let i=0;i<5;i++) await post(reg,{name:'Bad',pin:'1234',email:'bad@x.com',code:'111111'}); ok((await post(reg,{name:'Bad',pin:'1234',email:'bad@x.com',code:cb.j.devCode})).s===400,'৫ বার ভুল কোডের পর ঠিক কোডও বাতিল');
const lgE=await post(login,{login:'RAHIM@x.com',pin:'4321'}); ok(lgE.j.ok&&lgE.j.id===r1.j.id,'ইমেইল (বড় হাতের) দিয়ে লগইন');
ok((await post(login,{name:'Rahim',pin:'4321'})).j.ok,'নাম দিয়েও লগইন (পুরনো নিয়ম)');
// PIN রিসেট
const rc=await post(ec,{email:'rahim@x.com',purpose:'reset'}); ok(rc.j.ok&&rc.j.devCode,'রিসেট কোড');
ok((await post(rs,{email:'rahim@x.com',code:'999999',pin:'7777'})).s===400,'ভুল কোডে রিসেট হয় না');
const rr=await post(rs,{email:'rahim@x.com',code:rc.j.devCode,pin:'7777'}); ok(rr.j.ok&&rr.j.id===r1.j.id,'ঠিক কোডে নতুন PIN');
ok((await post(login,{login:'rahim@x.com',pin:'4321'})).s===401&&(await post(login,{login:'rahim@x.com',pin:'7777'})).j.ok,'পুরনো PIN আর চলে না, নতুনটা চলে');
ok((await post(sub,{id:r1.j.id,token:r1.j.token,unlocked:6,completed:5,coins:10})).s===401,'রিসেটের পর পুরনো ডিভাইসের টোকেন বাতিল');
const nr=await post(ec,{email:'ghost@x.com',purpose:'reset'}); ok(nr.j.ok&&!nr.j.devCode,'অচেনা ইমেইলে একই উত্তর, কোড নেই');
// প্রোফাইল: নাম বদল + অ্যাভাটার
const T=rr.j;
const pn=await post(pf,{id:T.id,token:T.token,name:'RahimX',avatar:5}); ok(pn.j.ok&&pn.j.name==='RahimX'&&pn.j.avatar===5,'নাম ও ছবি বদল');
ok((await post(pf,{id:T.id,token:T.token,name:'sumi'})).s===409,'অন্যের নামে বদলানো যায় না');
ok((await post(pf,{id:T.id,token:T.token,avatar:99})).s===400,'ভুল ছবি নম্বর বাতিল');
ok((await post(login,{login:'rahim@x.com',pin:'7777'})).j.avatar===5,'লগইনে ছবি ফেরত');
ok((await post(pf,{id:g.j.id,token:g.j.token,name:'GuestNew'})).s===400,'গেস্টের নাম বদলানো যায় না');
// ক্লাউড সেভ
const sv0=await post(sv,{id:T.id,token:T.token,op:'get'}); ok(sv0.j.ok&&sv0.j.data===null,'প্রথমে ক্লাউড সেভ খালি');
const blob=JSON.stringify({coins:123,unlocked:7}); ok((await post(sv,{id:T.id,token:T.token,op:'put',data:blob,ts:Date.now()})).j.ok,'সেভ জমা');
const sv1=await post(sv,{id:T.id,token:T.token,op:'get'}); ok(sv1.j.data===blob,'সেভ ফেরত');
ok((await post(sv,{id:T.id,token:T.token,op:'put',data:'{"coins":1}',ts:1000})).j.updated>1000,'পুরনো টাইমস্ট্যাম্পের সেভ নতুনটাকে মোছে না');
ok((await post(sv,{id:g.j.id,token:g.j.token,op:'get'})).s===403,'গেস্টের ক্লাউড সেভ নেই');
ok((await post(sv,{id:T.id,token:'bad',op:'get'})).s===401,'ভুল টোকেনে ক্লাউড সেভ নেই');
// মোট আয় ও লিডারবোর্ডের ছবি
await post(sub,{id:T.id,token:T.token,unlocked:9,completed:8,coins:50,earned:900});
const ob=await get('type=overall&me='+T.id); const row=ob.j.rows.find(r=>r.mine); ok(row&&row.coins===900&&row.avatar===5,'ওভারঅলে মোট আয় (৯০০, খরচের পরের ৫০ নয়) ও ছবি');
console.log(`\n${pass} পাস, ${fail} ফেল`); process.exit(fail?1:0);
