# টেস্ট প্ল্যান ও ফলাফল

শুধু যা সত্যিই চালানো হয়েছে সেগুলোকেই "পাস" লেখা হয়েছে।

## স্বয়ংক্রিয় টেস্ট: সেভ সিস্টেম (`tests/save_test.js`)
চালানো: ২০২৬-১০-১৯, Chromium (Playwright), ডেস্কটপ ১২৮০×৭২০।

| # | পরীক্ষা | ফলাফল |
|---|---|---|
| 1 | পুরনো save (unlocked 7, lastLevel নেই) → রিফ্রেশে level 7 | পাস |
| 2 | coins রিফ্রেশে অক্ষত | পাস |
| 3 | level 3 খেলে রিফ্রেশ → level 3 | পাস |
| 4 | রিফ্রেশে unlocked কমে না | পাস |
| 5 | রিফ্রেশের পর PLAY চাপলে level 3 শুরু | পাস |
| 6 | লেভেল শেষে reward একবারই (দুবার কল করলেও) | পাস |
| 7 | শেষের পর lastLevel = পরের level | পাস |
| 8 | রিফ্রেশে পরের level ও coins সেভ | পাস |
| 9 | নষ্ট JSON save → crash নেই, ডিফল্ট profile | পাস |
| 10 | ভুল মান (coins "abc", unlocked 999 ইত্যাদি) নিরাপদ মানে ঠিক | পাস |
| 11 | storage-এ লেখা ব্যর্থ হলেও গেম চলে | পাস |
| 12 | কোনো page error নেই | পাস |

## হাতে চালানো টেস্ট (২০২৬-১০-১৮ — ১৯)
- হোম পেজ: ১৯২০×৮৭০, ১৯২০×১০৮০, ১২৮০×৭২০, ১০২৪×৭৬৮, ৮৪৪×৩৯০ মাপে দেখা হয়েছে।
- PLAY চাপলে মেনু লুকায় ও HUD দেখায়: পাস (প্রতিটা আপডেটের পর)।

## স্বয়ংক্রিয় টেস্ট: Fuel/Boost/Endless (`tests/economy_fuel_boost_endless_test.js`)
চালানো: ২০২৬-১০-১৯, Chromium (Playwright)। ২০টা assertion, সব পাস।

| বিষয় | কী যাচাই হয়েছে | ফলাফল |
|---|---|---|
| Fuel drain | gas/drive/idle-এ আলাদা হারে fuel কমা | পাস |
| Fuel pickup | fuel can-এর কাছে গেলে ট্যাংক ভরা | পাস |
| Fuel empty | শূন্যে পাওয়ার কমে, হঠাৎ বন্ধ না হওয়া | পাস |
| Boost pickup | boost can কুড়ালে energy বাড়া | পাস |
| Boost negative control | দূরে থেকে `collectBoost()` কল করলে regen ছাড়া কোনো false-positive না হওয়া (`deltaE < 0.3`) | পাস |
| Endless start/end | `startEndless()`/`endEndlessRun()` সঠিকভাবে state বদলানো, শেষে `endlessMode=false` রিসেট | পাস |
| Endless crash/fuel-stall | crash বা ২.৫s fuel-stall-এ রান শেষ হওয়া | পাস |
| Endless best distance | `save.endlessBest` প্রতি ম্যাপে আলাদা সংরক্ষণ | পাস |
| Level mode regression | Endless রানের পর normal Level mode স্বাভাবিক চলা | পাস |

## Coin economy পরিমাপ (`tests/economy_measure.js`)
চালানো: ২০২৬-১০-১৯, full-throttle autoplay bot।

| লেভেল | সময় | কয়েন |
|---|---|---|
| 1 | ৫.২s | ৫৭৫ |
| 10 | ৬.৫s | ৬৫০ |
| 25 | ৮.৪s | ৭৯৭ |
| 50 | ১১.৮s | ১৫৪৬ |

**সতর্কতা:** bot বারবার air-time/flip বোনাস পায়, যা সতর্ক মানুষের খেলার চেয়ে বেশি কয়েন দেখাতে পারে। এই সংখ্যা শুধু upper-bound measurement — বাস্তব মানুষ-খেলার ডেটা না থাকায় দাম/পুরস্কার *বদলানো হয়নি*।

## এখনো টেস্ট হয়নি (পরের ধাপে)
কেনাকাটার যাচাই (দুবার ক্লিক, নেগেটিভ ব্যালেন্স), দৈনিক বোনাসের একবার-দাবি, মোবাইল touch control, দীর্ঘ রান-এ পারফরম্যান্স, ghost replay, Level mode leaderboard।
