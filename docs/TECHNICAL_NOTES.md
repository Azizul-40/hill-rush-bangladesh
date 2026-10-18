# টেকনিক্যাল নোট

## ফাইল
- `index.html` — স্ক্রিন/মেনু/HUD-এর কাঠামো
- `script.js` — পুরো গেম (খেলা, physics, আঁকা, সেভ, স্টোর, মিশন)
- `style.css` — ডিজাইন
- `home_bg.jpg` — হোম পেজের ব্যানার
- `tests/save_test.js` — সেভ সিস্টেমের স্বয়ংক্রিয় ব্রাউজার টেস্ট
- `tests/economy_fuel_boost_endless_test.js` — fuel/boost/endless-এর স্বয়ংক্রিয় টেস্ট (২০টা assertion)
- `tests/economy_measure.js` — coin economy মাপার bot (upper-bound measurement, সতর্কতাসহ)

## হোস্টিং
GitHub (`Azizul-40/hill-rush-bangladesh`) → Netlify। `main`-এ push করলে স্বয়ংক্রিয় ডিপ্লয়: https://hill-rush-bangladesh.netlify.app

## Save সিস্টেম (v13)
- Key: `hillRushFinalSaveV1`, ভেতরে `saveVersion: 2`।
- মূল ফিল্ড: `coins`, `unlocked`, `lastLevel`, `selectedVehicle`, `ownedVehicles`, `upgrades`, `best`, `completed`, `collected`, `dailyClaimed`, `dayKey`, `coinPackClaims`, এবং মিশন/ghost/achievement/damage-এর ফিল্ড।
- `normalizeSave()` লোডের সময় চলে: ভুল/নষ্ট/অসম্পূর্ণ মান নিরাপদ মানে ঠিক করে, ভালো progress মুছে না। পুরনো save-এ `lastLevel` না থাকলে `unlocked` ধরা হয়।
- save হয়: লেভেল শুরু, লেভেল শেষ, কেনাকাটা/আপগ্রেড, সেটিংস পরিবর্তনে। প্রতি ফ্রেমে নয়।
- `persist()` try/catch-এ; storage বন্ধ/ভর্তি হলে গেম চলে, console-এ একবার সতর্কবার্তা।
- সীমা: local save, তাই browser-এর site data মুছলে বা অন্য browser/ডিভাইসে progress থাকবে না। cloud sync এখন নেই।

## Fuel সিস্টেম (v14)
- `FUEL_CONFIG`: cap ১০০, gas/drive/idle অনুযায়ী আলাদা drain rate, lowThreshold ২০, pickup রিফিল ৪৫।
- `truck.fuel` প্রতি ফ্রেমে কমে (`updatePhysics()`); শূন্যের কাছে `fuelPower` মাল্টিপ্লায়ার acceleration ও maxSpeed দুটোতেই প্রয়োগ হয় (`minPowerAtEmpty: 0.18`) — হঠাৎ বন্ধ না হয়ে ধীরে দুর্বল হয়।
- `generateFuelCans()`/`drawFuelCans()`/`collectFuel()` — রাস্তায় fuel can বসানো, আঁকা, কুড়ানো।
- RPM/FUEL/BOOST গেজে (`drawGaugeCluster()`) এখন আসল `truck.fuel` দেখায়, কম হলে লাল/কমলা।

## Boost pickup (v14)
- `BOOST_PICKUP_CONFIG`: পিকআপে রিফিল ৫৫, cap ১০০ (আগে থেকেই থাকা boost energy সিস্টেমের উপর)।
- `generateBoostCans()`/`drawBoostCans()`/`collectBoost()` — fuel can থেকে ভিজ্যুয়ালি আলাদা (বেগুনি বিদ্যুৎ আইকন, canvas primitive দিয়ে আঁকা)।

## Endless/Distance Mode (v14)
- `endlessMode` ফ্ল্যাগ, `ENDLESS_LENGTH=58000` (ফিক্সড finish-এর বদলে); `finishX()` endless হলে এই মান রিটার্ন করে।
- `getGaps()` endless-এ x-bucket cache key ব্যবহার করে এবং deterministic gap generate করে player-এর সামনে পর্যন্ত (৬০০০px আগাম)।
- `startEndless()`/`endEndlessRun(reason)` — রান শুরু/শেষ, crash বা fuel-stall (২.৫ সেকেন্ড স্থির থাকলে) হ্যান্ডল করে, normal crash screen-এর বদলে `#endlessMenu` দেখায়।
- `save.endlessBest` — প্রতি ম্যাপে আলাদা local personal-best দূরত্ব, `normalizeSave()`-এ সুরক্ষিত।
- রান শেষে `endlessMode=false` রিসেট হয়, তাই normal Level mode স্বাভাবিকভাবে চলে (টেস্টে যাচাই করা)।

## Coin economy পরিমাপ (v14)
- `tests/economy_measure.js`: full-throttle autoplay bot দিয়ে প্রতি লেভেলে সময় ও কয়েন মাপা হয়েছে (level 1: ৫.২s/৫৭৫ কয়েন, level 10: ৬.৫s/৬৫০, level 25: ৮.৪s/৭৯৭, level 50: ১১.৮s/১৫৪৬)।
- **সতর্কতা:** এই সংখ্যা bot-এর বারবার air-time/flip বোনাস পাওয়ার কারণে সতর্ক মানুষের খেলার চেয়ে বেশি দেখাতে পারে। তাই এই ডেটা দিয়ে দাম/পুরস্কার *বদলানো হয়নি*, শুধু পরিমাপ রেকর্ড করা হয়েছে।

## জানা সমস্যা / ঋণ
- `script.js`-এ অনেক ফাংশন একাধিকবার ঘোষিত (শেষটাই কার্যকর) — ভার্সনে ভার্সনে যোগ হওয়ার ফল। ভবিষ্যতে পরিষ্কার করা দরকার।
- `style.css`-এ অনেক স্তরের `!important` ওভাররাইড আছে; নতুন নিয়ম ফাইলের শেষে যোগ হয়।
- Coin economy-র বাস্তব (মানুষ-খেলা) ভারসাম্য যাচাই এখনো বাকি।
