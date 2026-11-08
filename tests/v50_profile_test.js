// চালানোর নিয়ম: NODE_PATH=$(npm root -g) node --no-warnings tests/v50_profile_test.js <প্রজেক্ট ফোল্ডার> <একটা ছবির ফাইল (png/jpg)> [স্ক্রিনশট-ফোল্ডার]
const { chromium }=require('playwright');let pass=0,fail=0;const ok=(n,c,d)=>{if(c){pass++;console.log('PASS',n);}else{fail++;console.log('FAIL',n,d===undefined?'':JSON.stringify(d));}};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await (await b.newContext({viewport:{width:1000,height:640}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://'+process.argv[2]+'/index.html?noshell=1');await p.waitForTimeout(600);
  await p.evaluate(()=>localStorage.setItem('hillrush_lang','bn'));
  ok('হোমে PROFILE বাটন আর চিপ',await p.isVisible('#profileBtn')&&await p.isVisible('#homeChip'));
  await p.click('#profileBtn');await p.waitForTimeout(400);
  ok('প্রোফাইল পাতা খোলে',await p.isVisible('#profileMenu')&&await p.isVisible('#profileBody .v50Head'));
  ok('লগইন/রেজিস্টার ফর্ম আছে (ইমেইল বা নাম + PIN)',(await p.textContent('#profileBody')).match(/ইমেইল বা নাম|Email or name/)!==null||await p.isVisible('#profileBody .v45Tabs'));
  await p.setInputFiles('#v50File',process.argv[3]);await p.waitForTimeout(800);
  const pic=await p.evaluate(()=>save.pic);ok('ছবি ১২৮px JPEG হয়ে সেভ (ছোট সাইজ)',/^data:image\/jpeg;base64,/.test(pic)&&pic.length<30000,pic&&pic.length);
  ok('প্রোফাইলে ছবি দেখায়',await p.isVisible('#profileBody img.v50Pic'));
  await p.screenshot({path:(process.argv[4]||'/tmp')+'/v50_profile.png'});
  await p.click('#backProfileBtn');await p.waitForTimeout(400);
  ok('হোম চিপে ছবি',await p.isVisible('#homeChip img'));
  await p.reload();await p.waitForTimeout(700);
  ok('রিলোডের পরও ছবি থাকে',await p.isVisible('#homeChip img'));
  await p.click('#leaderBtn');await p.waitForTimeout(800);
  ok('লিডারবোর্ডে প্রোফাইল-বাক্সের বদলে লিংক',await p.isVisible('#lbToProfile'));
  await p.click('#lbToProfile');await p.waitForTimeout(400);
  ok('লিংক থেকে প্রোফাইল পাতা',await p.isVisible('#profileBody .v50Head'));
  await p.click('#v50Del');await p.waitForTimeout(300);ok('ছবি সরানো যায়',(await p.evaluate(()=>save.pic))==='');
  await p.setInputFiles('#v50File',{name:'x.txt',mimeType:'text/plain',buffer:Buffer.from('hi')});await p.waitForTimeout(400);
  ok('ছবি নয় এমন ফাইল বাতিল',(await p.textContent('#v50Msg')).length>0&&(await p.evaluate(()=>save.pic))==='');
  ok('page error নেই',errs.length===0,errs);
  console.log(`\n${pass} পাস, ${fail} ফেল`);await b.close();process.exit(fail?1:0);
})();
