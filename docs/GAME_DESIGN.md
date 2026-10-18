# গেম ডিজাইন (বর্তমান অবস্থা, v13)

## মূল গেমপ্লে
- সাইড-ভিউ 2D (ট্রাক 3D-এর মতো আঁকা)। gas/brake/tilt দিয়ে পাহাড়ি রাস্তা পার হওয়া, কয়েন কুড়ানো, লেভেলের শেষে পৌঁছানো।
- মোট **১০০ লেভেল**। লেভেল শেষ করলে পরের লেভেল আনলক হয়, কয়েন পুরস্কার পাওয়া যায় (`75 + লেভেল×3 + ম্যাপ×10`)।
- air-time/flip stunt, combo, nitro/boost, damage ও গ্যারেজে repair।

## ট্রাক (৪টা)
TRAIL BLAZER (শুরুর, ফ্রি), DESERT BEAST, ROCK MONSTER, THUNDER X। প্রতিটার আলাদা speed/grip/suspension/boost মান আছে।

## আপগ্রেড
প্রতি ট্রাকে Engine, Tires, Suspension, Boost (লেভেল ১ থেকে বাড়ে)।

## ম্যাপ (৮টা)
GREEN HILLS, ICE VALLEY, JUNGLE RUN, DESERT STORM, VOLCANO RIDGE, NIGHT CITY, CANYON FALLS, AUTUMN PEAK। প্রতিটার রং, আকাশ ও পরিবেশ আলাদা; দাম আলাদা।

## অন্যান্য ফিচার
দৈনিক মিশন ও achievement, ghost (নিজের সেরা রানের ছায়া), আবহাওয়া (বৃষ্টি/কুয়াশা ইত্যাদি), দৈনিক বোনাস, সাউন্ড (mute/volume), pause।

## Save
`localStorage`-এ (`hillRushFinalSaveV1`)। রিফ্রেশ দিলে সর্বশেষ খেলা লেভেল থেকে চালু হয় (v13 থেকে)। বিস্তারিত: `TECHNICAL_NOTES.md`।

## যা এখনো নেই
আসল fuel tank ও pickup, Endless mode, leaderboard, বাংলাদেশি যানবাহন ও ম্যাপ, checkpoint, customization। দেখুন `NEXT_LEVEL_PLAN.md`।
