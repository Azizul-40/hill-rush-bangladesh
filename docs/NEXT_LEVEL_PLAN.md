# HILL RUSH BANGLADESH — পরের লেভেলের পরিকল্পনা

Developed by Azizul & Habiba · Supervised by Md. Hasibur Rahman

এই ফাইল `HILL_RUSH_Complete_Original_Game_Master_Prompt` PDF-এর সাথে আমাদের এখনকার গেম (v12) মিলিয়ে বানানো। এখানে যা লেখা আছে সবই কোড দেখে যাচাই করা; যেটা পরীক্ষা করা হয়নি সেটা সেভাবেই লেখা।

## ১. আমাদের গেম আর PDF-এর মধ্যে বড় পার্থক্য

| বিষয় | PDF-এ বলা | আমাদের এখন |
|---|---|---|
| গ্রাফিক্স | Three.js দিয়ে 3D | প্লেইন HTML5 canvas, 2D সাইড-ভিউ (3D-এর মতো আঁকা ট্রাক) |
| হোস্টিং | Cloudflare Workers | Netlify (GitHub-এ push করলেই অটো ডিপ্লয়) |
| শুরু | লাইভ লিংক + সোর্স দেখে audit | সোর্স আমাদের হাতেই, GitHub-এ v1–v12 history আছে |

**সিদ্ধান্ত লাগবে:** Three.js-এ গেম নতুন করে লেখা মানে পুরো গেম প্রায় আবার বানানো (physics, রেন্ডারিং সব)। অন্য পথ হলো এখনকার 2D গেমেই সব নতুন ফিচার যোগ করা। কোনটা করব সেটা ঠিক করার পর কাজ শুরু।

## ২. PDF-এর ফিচার বনাম এখনকার অবস্থা (কোড দেখে)

**আছে:**
- localStorage save (`hillRushFinalSaveV1`, করাপ্টেড ডেটায় crash করে না)
- Boost/nitro, ghost racing, missions, daily bonus, weather, damage/repair, mute/pause
- Garage upgrade ও Store
- ৮টা map (GREEN HILLS, ICE VALLEY, JUNGLE RUN ইত্যাদি), ৪টা ট্রাক

**আংশিক / যাচাই বাকি:**
- রিফ্রেশ দিলে Level 1-এ ফেরার বাগ আছে কিনা: আলাদা করে পরীক্ষা করা হয়নি
- Save-version migration: আছে কিনা নিশ্চিত না
- Fuel: HUD-এ একটা fuel গেজ আছে, কিন্তু সেটা আসল tank না, শুধু থ্রটল থেকে হিসাব করা সাজানো মান
- মোবাইল touch control: খুব সামান্য আছে, পুরো পরীক্ষা হয়নি
- Coin economy: দাম বসানো আছে, কিন্তু আয়ের হার মেপে ব্যালেন্স করা হয়নি

**নেই:**
- আসল Fuel tank, রাস্তার পাশে fuel can pickup, তেল শেষ হলে ধীরে ধীরে গতি কমা
- Boost pickup (আলাদা চেহারার)
- Endless/Distance mode, Level mode-এর আলাদা ranking, leaderboard (local personal best সহ)
- বাংলাদেশি যানবাহন: CNG অটো, রিকশা, লোকাল বাস (মুড়ির টিন), ইজি বাইক
- বাংলাদেশি map: সাজেক, বান্দরবান/নীলগিরি, সিলেট/জাফলং, খাগড়াছড়ি, কাপ্তাই
- Checkpoint ও recovery, vehicle customization (রং, নম্বর প্লেট)
- `docs/` ফোল্ডারের বাকি ফাইল, test plan, asset credits

## ৩. প্রস্তাবিত ধাপ (একটা একটা করে, প্রতি ধাপ শেষে test + commit)

1. **ভিত্তি:** docs ফাইলগুলো বানানো, রিফ্রেশ-save বাগ পরীক্ষা ও ঠিক করা, save-version যোগ। (ছোট, নিরাপদ)
2. **Economy:** আসলে কত coin আয় হয় মাপা, দাম ঠিক করা, duplicate reward আটকানো।
3. **আসল Fuel ও Boost:** tank, কমার হার, fuel can, boost pickup, তেল শেষের আচরণ।
4. **Level mode vs Endless mode:** দুই ধরনের ranking (local personal best)।
5. **বাংলাদেশি যানবাহন:** CNG, রিকশা, বাস, ইজি বাইক, প্রত্যেকের আলাদা handling।
6. **বাংলাদেশি map:** সাজেক, বান্দরবান, সিলেট, খাগড়াছড়ি, কাপ্তাই।
7. **Checkpoint, customization, মোবাইল control।**
8. **Polish, performance, পুরো test ও documentation।**

## ৪. নিয়ম যেগুলো মেনে চলব (PDF থেকে)

- বড় ফিচারের আগে commit/backup, ছোট ছোট commit, ইতিহাস বদলানো বা বানানো নয়
- যেটা test করা হয়নি সেটা "পাস" লেখা হবে না
- তৃতীয়পক্ষের ছবি/সাউন্ড/কোড নিলে `docs/ASSET_CREDITS.md`-এ সৎভাবে লেখা
- গেমের নাম/পরিচয় আমরা না বললে বদলাব না
