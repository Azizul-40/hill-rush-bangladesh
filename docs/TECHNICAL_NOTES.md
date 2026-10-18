# টেকনিক্যাল নোট

## ফাইল
- `index.html` — স্ক্রিন/মেনু/HUD-এর কাঠামো
- `script.js` — পুরো গেম (খেলা, physics, আঁকা, সেভ, স্টোর, মিশন)
- `style.css` — ডিজাইন
- `home_bg.jpg` — হোম পেজের ব্যানার
- `tests/save_test.js` — সেভ সিস্টেমের স্বয়ংক্রিয় ব্রাউজার টেস্ট

## হোস্টিং
GitHub (`Azizul-40/hill-rush-bangladesh`) → Netlify। `main`-এ push করলে স্বয়ংক্রিয় ডিপ্লয়: https://hill-rush-bangladesh.netlify.app

## Save সিস্টেম (v13)
- Key: `hillRushFinalSaveV1`, ভেতরে `saveVersion: 2`।
- মূল ফিল্ড: `coins`, `unlocked`, `lastLevel`, `selectedVehicle`, `ownedVehicles`, `upgrades`, `best`, `completed`, `collected`, `dailyClaimed`, `dayKey`, `coinPackClaims`, এবং মিশন/ghost/achievement/damage-এর ফিল্ড।
- `normalizeSave()` লোডের সময় চলে: ভুল/নষ্ট/অসম্পূর্ণ মান নিরাপদ মানে ঠিক করে, ভালো progress মুছে না। পুরনো save-এ `lastLevel` না থাকলে `unlocked` ধরা হয়।
- save হয়: লেভেল শুরু, লেভেল শেষ, কেনাকাটা/আপগ্রেড, সেটিংস পরিবর্তনে। প্রতি ফ্রেমে নয়।
- `persist()` try/catch-এ; storage বন্ধ/ভর্তি হলে গেম চলে, console-এ একবার সতর্কবার্তা।
- সীমা: local save, তাই browser-এর site data মুছলে বা অন্য browser/ডিভাইসে progress থাকবে না। cloud sync এখন নেই।

## জানা সমস্যা / ঋণ
- `script.js`-এ অনেক ফাংশন একাধিকবার ঘোষিত (শেষটাই কার্যকর) — ভার্সনে ভার্সনে যোগ হওয়ার ফল। ভবিষ্যতে পরিষ্কার করা দরকার।
- `style.css`-এ অনেক স্তরের `!important` ওভাররাইড আছে; নতুন নিয়ম ফাইলের শেষে যোগ হয়।
- Fuel গেজ এখন আসল tank নয়, থ্রটল থেকে হিসাব করা প্রদর্শন।
