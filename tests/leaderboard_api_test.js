// চালানো: node --no-warnings tests/leaderboard_api_test.js
// D1-এর বদলে node:sqlite দিয়ে নকল D1 বানিয়ে handler-এর লজিক পরীক্ষা। আসল Cloudflare D1-এ এখনো চালানো হয়নি।
import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs';
import * as reg from '../functions/api/register.js'; import * as sub from '../functions/api/submit.js'; import * as lb from '../functions/api/leaderboard.js';
const db=new DatabaseSync(':memory:'); db.exec(fs.readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8'));
const env={DB:{prepare(sql){ const st=db.prepare(sql); const ex=(a)=>({ async run(){ st.run(...a); return {success:true}; }, async first(){ return st.get(...a)||null; }, async all(){ return {results:st.all(...a)}; } }); return { ...ex([]), bind(...a){ return { async run(){ st.run(...a); return {success:true}; }, async first(){ return st.get(...a)||null; }, async all(){ return {results:st.all(...a)}; } }; } }; }}};
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;console.log('PASS',m);} else {fail++;console.log('FAIL',m);} };
const post=(h,body)=>h.onRequestPost({request:new Request('http://x/api',{method:'POST',body:JSON.stringify(body)}),env}).then(async r=>({s:r.status,j:await r.json()}));
const get=(q)=>lb.onRequestGet({request:new Request('http://x/api/leaderboard?'+q),env}).then(async r=>({s:r.status,j:await r.json()}));
const g=await post(reg,{guest:true}); ok(g.j.ok&&g.j.token&&/^Guest-\d{4}$/.test(g.j.name),'গেস্ট রেজিস্টার');
const a=await post(reg,{name:'Azizul',email:'A@Test.com'}); ok(a.j.ok&&a.j.id,'ইমেইল রেজিস্টার');
const dup=await post(reg,{name:'X',email:'a@test.com'}); ok(dup.s===409,'একই ইমেইল দুবার নয়');
ok((await post(reg,{name:'X',email:'nope'})).s===400,'ভুল ইমেইল বাতিল');
ok((await post(reg,{name:'<b>Hi</b>',email:'h@x.com'})).j.name==='bHi/b','নামের বিপজ্জনক চিহ্ন ছাঁটা');
ok((await post(sub,{id:a.j.id,token:'wrong',map:0,level:1,time:30,unlocked:2,completed:1,coins:10})).s===401,'ভুল token বাতিল');
ok((await post(sub,{id:a.j.id,token:a.j.token,map:0,level:1,time:30.5,unlocked:2,completed:1,coins:100})).j.ok,'স্কোর জমা');
ok((await post(sub,{id:a.j.id,token:a.j.token,map:0,level:1,time:40,unlocked:2,completed:1,coins:100})).j.ok,'খারাপ সময় জমা (গ্রহণযোগ্য, সেরা বদলায় না)');
ok((await post(sub,{id:g.j.id,token:g.j.token,map:0,level:1,time:25,unlocked:3,completed:2,coins:50})).j.ok,'গেস্টের স্কোর');
ok((await post(sub,{id:g.j.id,token:g.j.token,map:0,level:1,time:2,unlocked:3,completed:2,coins:50})).s===400,'অসম্ভব দ্রুত সময় বাতিল');
const l=await get('type=level&map=0&level=1'); ok(l.j.rows.length===2&&l.j.rows[0].time===25&&l.j.rows[1].time===30.5,'লেভেল বোর্ড: কম সময় আগে, সেরা সময় টিকে থাকে');
const o=await get('type=overall'); ok(o.j.rows[0].completed===2,'ওভারঅল বোর্ড সাজানো');
ok((await get('type=level&map=99&level=1')).s===400,'ভুল map বাতিল');
ok((await lb.onRequestGet({request:new Request('http://x/api/leaderboard'),env:{}})).status===503,'DB না থাকলে ৫০৩');
console.log(`\n${pass} পাস, ${fail} ফেল`); process.exit(fail?1:0);
