// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node tests/v37_controls_editor_test.js <প্রজেক্ট ফোল্ডার>
// সেটিংস → বাটন সাজাও: GAS টেনে সরানো, ১৫০% করা, সেভ, রিলোডের পরও থাকা, নতুন জায়গায় চাপলে কাজ করা।
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:800,height:360}});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto('file://'+(process.argv[2]||'/home/claude/hill-rush-bangladesh')+'/index.html');await p.waitForTimeout(500);
await p.evaluate(()=>{try{localStorage.removeItem(V37.KEY)}catch(e){} startLevel(2);}); await p.waitForTimeout(400);
await p.click('#settingsBtn'); await p.waitForTimeout(300); await p.click('#ctlEditBtn'); await p.waitForTimeout(300);

const g=await p.evaluate(()=>{const r=document.querySelector('#controls .gasControl').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width};});
console.log('elAt',await p.evaluate(g=>{const e=document.elementFromPoint(g.x,g.y);return e?(e.id||e.className):null;},g)); await p.mouse.move(g.x,g.y); await p.mouse.down(); console.log('drag?',await p.evaluate(()=>document.querySelector('.ceSel')?document.querySelector('.ceSel').dataset.key:'none')); await p.mouse.move(g.x+120,g.y-150,{steps:8}); await p.mouse.up();
await p.evaluate(()=>{const s=document.getElementById('ceSlider'); s.value=150; s.dispatchEvent(new Event('input'));});
await p.waitForTimeout(200);
const kg=await p.evaluate(()=>keys.gas); await p.click('#ceSave'); await p.waitForTimeout(300);
const after=await p.evaluate(()=>{const r=document.querySelector('#controls .gasControl').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:Math.round(r.width),state, settingsVisible:getComputedStyle(document.getElementById('settingsMenu')).display};});
console.log('gas pressed during edit?',kg,'after save',JSON.stringify(after),'before',JSON.stringify(g));
await p.reload(); await p.waitForTimeout(500); await p.evaluate(()=>startLevel(1)); await p.waitForTimeout(400);
console.log('after reload',await p.evaluate(()=>{const r=document.querySelector('#controls .gasControl').getBoundingClientRect();return JSON.stringify({x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:Math.round(r.width)});}));

// টাচে চাপলে GAS কাজ করে কিনা (নতুন জায়গায়)
const gg=await p.evaluate(()=>{const r=document.querySelector('#controls .gasControl').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.move(gg.x,gg.y); await p.mouse.down(); await p.waitForTimeout(100); console.log('gas works at new place',await p.evaluate(()=>keys.gas)); await p.mouse.up();
console.log('errs',errs); await b.close();})();
