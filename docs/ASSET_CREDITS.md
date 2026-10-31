# অ্যাসেট ও উৎসের তালিকা

| অ্যাসেট | কোথায় ব্যবহার | উৎস / লাইসেন্স | মন্তব্য |
|---|---|---|---|
| `home_bg.jpg` (হোম ব্যানার) | হোম পেজের ব্যাকগ্রাউন্ড | Azizul-এর দেওয়া ছবি; **উৎস/টুল ও লাইসেন্স Azizul নিশ্চিত করে এখানে লিখবে** | আমরা বাসের সাইনবোর্ডের লেখা ঠিক করেছি, পুরনো "VERSION 8.0" ব্যাজ সরিয়েছি, একটু শার্প করেছি |
| `background_ai.png` | ব্যাকগ্রাউন্ড | **উৎস নিশ্চিত করা বাকি** | |
| কোড (`script.js`, `style.css`, `index.html`) | পুরো গেম | Azizul ও Habiba (Claude-এর সহায়তায়, `CHANGELOG.md`-এ ভার্সন অনুযায়ী) | v26 থেকে ২D গেমেও three.js (নিচে) ব্যবহার হয়, শুধু ৩D ট্রাক আঁকতে |
| বাংলাদেশি যানবাহনের ২D ছবি (CNG, রিকশা, ইজি বাইক, বাস) | গ্যারেজ/মেনু, আর ৩D লোড না হলে গেমে | **কোডে আঁকা, আমাদের নিজস্ব ডিজাইন** (canvas 2D, বাইরের ছবি নেই) | বাসের "ঢাকা" ও "মুড়ির টিন" লেখা ব্রাউজারের ফন্টে আঁকা |
| বাংলাদেশি ম্যাপের দৃশ্য (সাজেক, বান্দরবান, সিলেট, খাগড়াছড়ি, কাপ্তাই) | গেমের পেছনের দৃশ্য | **কোডে আঁকা, আমাদের নিজস্ব ডিজাইন** (বাইরের ছবি নেই) | |
| বাংলাদেশের পতাকা (রিকশার ছোট পতাকা) | রিকশা sprite | সরল জ্যামিতিক আকার (সবুজ জমিনে লাল বৃত্ত), কোডে আঁকা | |
| সাউন্ড | গেমের শব্দ | কোডে তৈরি (Web Audio)। বাইরের ফাইল নেই | |
| three.js r170 (`3d/lib/three.module.min.js`, `3d/lib/jsm/loaders/GLTFLoader.js`, `3d/lib/jsm/utils/BufferGeometryUtils.js`) | 3D পেজ (`3d.html`) | three.js authors — **MIT লাইসেন্স** (`3d/lib/LICENSE`), npm `three@0.170.0` থেকে হুবহু কপি | ফাইল বদলানো হয়নি; CDN নয়, রিপোতেই রাখা |
| 3D গাড়ি (ট্রাক, বাস, CNG, রিকশা) | 3D পেজ | **কোডে বানানো, আমাদের নিজস্ব** (`3d/vehicles3d.js`, বাইরের মডেল নেই) | চেহারা সরল/আধা-বাস্তব, ছবির মতো নয় |
| 3D পাহাড়, রাস্তা, গাছ, বাড়ি, হ্রদ, সেতু, আকাশ | 3D পেজ | **কোডে বানানো** (`3d/world3d.js`); টেক্সচার canvas-এ কোডে আঁকা | কোনো ফটো-টেক্সচার/HDRI নেই |
| `3d/models/*.glb` (ঐচ্ছিক) | 3D গাড়ির বদলি মডেল | **এখনো কোনো ফাইল নেই।** যোগ করলে এখানে নাম, বানানেওয়ালা, উৎস-লিংক, লাইসেন্স (CC0/CC-BY…) লিখতে হবে | লোডার-পথ আছে কিন্তু আসল .glb দিয়ে পরীক্ষা হয়নি |

> নিয়ম: নতুন কোনো ছবি/সাউন্ড/কোড যোগ করলে এখানে নাম, সৃষ্টিকর্তা/উৎস, লাইসেন্স লেখা হবে।

## ৩D মনস্টার ট্রাক মডেল (v26)
- **মডেল:** "Free Monster Truck"
- **নির্মাতা:** Steel Cyclone Studios
- **উৎস:** https://steelcyclonestudios.gumroad.com/l/freemonstertruck (দাম $0)
- **শর্ত (পেজে যেমন লেখা):** বাণিজ্যিক বা অবাণিজ্যিক যেকোনো প্রজেক্টে ব্যবহার করা যাবে। পেজে পূর্ণাঙ্গ লাইসেন্স-লেখা নেই।
- **কে যোগ করেছে:** ব্যবহারকারী (Azizul) নিজে ডাউনলোড করে দিয়েছে (`FreeMonsterTruck.rar`)।
- **আমাদের পরিবর্তন:** FBX থেকে GLB-তে রূপান্তর (FBX2glTF), টেক্সচার বাদ, নরমাল বাদ দিয়ে weld, meshoptimizer দিয়ে ~১.৭৭ লাখ থেকে ~২৭.৫ হাজার ত্রিভুজে হালকা করা, quantize। ফাইল: `models/monster_truck.glb` (~৩৯০KB)। রং গেমে বদলানো হয় (ট্রাক অনুযায়ী)।
- **ব্যবহার:** `truck3d.js` ফাইলে Three.js দিয়ে অফস্ক্রিন আঁকা হয়, তারপর ২D গেমে বসানো হয়।

## ৩D বাংলাদেশি যানবাহন (v27)
সবগুলো Sketchfab থেকে ব্যবহারকারী (Azizul) নিজে ডাউনলোড করে দিয়েছে। নাম, নির্মাতা, লাইসেন্স আর লিংক নেওয়া হয়েছে মডেল ফাইলের ভেতরের তথ্য (glTF `asset.extras`) থেকে। এই তথ্য আমাদের হালকা করা ফাইলেও রাখা আছে। গেমের সেটিংসে "3D মডেল ক্রেডিট" অংশেও নামগুলো দেখানো হয়।

| গেমে | মডেল | নির্মাতা | লাইসেন্স | উৎস | আমাদের ফাইল |
|---|---|---|---|---|---|
| RICKSHAW | "Rickshaw" | asrafullislamsiam | CC BY 4.0 | https://sketchfab.com/3d-models/rickshaw-e9f24ba4a27a4072a6372ed9dc37dbba | `models/rickshaw.glb` (~১.৬MB) |
| CNG AUTO | "Autorikshaw - Indian Tuk Tuk" | bhagathartworks | CC BY 4.0 | https://sketchfab.com/3d-models/autorikshaw-indian-tuk-tuk-5775d012693741008acff9dad410e92d | `models/cng.glb` (~২০০KB) |
| EASY BIKE | "Tuk-Tuk (Passenger)" | Potater_King | CC BY 4.0 | https://sketchfab.com/3d-models/tuk-tuk-passenger-43fa5e7c2e364c7aa488555dd69d5582 | `models/ebike.glb` (~৩৫০KB) |
| MURIR TIN BUS | "PSX Bus" | Namahoi | Sketchfab Standard | https://sketchfab.com/3d-models/psx-bus-b16ea5da83d14981a5dc2d8d199a1efd | `models/bus.glb` (~৮০KB) |

**আমাদের পরিবর্তন (CC BY 4.0 অনুযায়ী জানানো হলো):** সামনের দিক ঘুরিয়ে মাপমতো বসানো হয়েছে। চাকাগুলো আলাদা করা হয়েছে যাতে ঘোরে। বাসের দৃশ্য থেকে আকাশ, বালু আর ছায়া বাদ দেওয়া হয়েছে, অ্যানিমেশনও বাদ। রিকশার চেইন আর ছোট বল্টু বাদ দেওয়া হয়েছে, আর meshoptimizer দিয়ে ~৯ লাখ থেকে ~৬৩ হাজার ত্রিভুজে কমানো হয়েছে। টেক্সচার ছোট করে WebP করা হয়েছে, quantize করা হয়েছে। গেমে খেলোয়াড়ের বেছে নেওয়া রং অনুযায়ী বডির রং বদলায়। কাজটা হয় `truck3d.js` (`renderVeh`) দিয়ে।

**সতর্কতা:** "PSX Bus"-এর লাইসেন্স Sketchfab Standard, এটা CC নয়। গেমের ভেতরে ব্যবহার করা যায়, কিন্তু মডেলটা আলাদা করে আবার বিতরণ করা যায় না। আমাদের রিপো পাবলিক, তাই `models/bus.glb` ফাইলটা যে কেউ নামাতে পারে। জমা দেওয়ার আগে এটা নিয়ে সুপারভাইজারের সাথে কথা বলা ভালো। দরকার হলে বাসের জন্য CC BY / CC0 মডেল খুঁজে বদলে দেওয়া যায়।

## ৩D গাছ (v28)
ব্যবহারকারী (Azizul) Sketchfab থেকে ডাউনলোড করে দিয়েছে। নাম, নির্মাতা, লাইসেন্স আর লিংক নেওয়া হয়েছে মডেল ফাইলের ভেতরের তথ্য (`asset.extras`) থেকে। গেমে মডেল ফাইল রাখা হয়নি। প্রতিটা মডেল three.js দিয়ে ৩ দিক থেকে একবার রেন্ডার করে ছবি (`models/trees/*.webp`, মোট ~৯০০KB) বানানো হয়েছে, পাহাড়ে সেই ছবি বসে।

| গেমে (ধরন) | মডেল | নির্মাতা | লাইসেন্স | উৎস |
|---|---|---|---|---|
| বাঁশঝাড় (`bamboo`) | "bamboo tree" | tojamerlin | CC BY 4.0 | https://sketchfab.com/3d-models/bamboo-tree-d0161434cf6844a8bc6eaeb0c0692ed0 |
| নারকেল গাছ (`coconut`) | "Coconut Tree" | gelmi.com.br | CC BY 4.0 | https://sketchfab.com/3d-models/coconut-tree-2b959f888db340259e0679839cd224e1 |
| হলুদ পাতার গাছ (`autumn`) | "Platano Tree" | gelmi.com.br | CC BY 4.0 | https://sketchfab.com/3d-models/platano-tree-ef48485b7c534acc905c0d9964c5fe7c |
| বড় গাছ (`oak`, `big`) | "Oak tree" | massive-graphisme | CC BY 4.0 | https://sketchfab.com/3d-models/oak-tree-3dc59560f2d24345bdbe65c44636453b |
| বটগাছের মতো (`banyan`, `big`) | "Tree GN" | TechArtBGN | CC BY 4.0 | https://sketchfab.com/3d-models/tree-gn-40da979cb23f492583ec89c4196cff4e |
| পাতাবাহার ঝোপ (`fern`, জঙ্গল) | "Monstera Tree" | sligocreatures | **CC BY-NC 4.0** | https://sketchfab.com/3d-models/monstera-tree-6d219fec989947698609f1b6945e009c |
| পাতাহীন গাছ (`dead`, আগ্নেয়গিরি) | "Tree" | Epic_Tree_Store | CC BY 4.0 | https://sketchfab.com/3d-models/tree-c25e5fc2bfa54d24a165a8a207c0a6d7 |
| গোল গাছ (`round`) | "Stylized Tree" | yonimantz | CC BY 4.0 | https://sketchfab.com/3d-models/stylized-tree-6d1aeea748f147789004bc03e1930d32 |
| চা-বাগানের ছায়াগাছ (`shade`) | "Tree" | farhad.Guli | CC BY 4.0 | https://sketchfab.com/3d-models/tree-7016d1d32fe748f0a8b3f5eb39374bc4 |

**আমাদের পরিবর্তন:** Platano, Oak আর Tree GN-এর পুরনো spec-gloss উপাদান metal-rough-এ বদলানো হয়েছে (gltf-transform), যাতে রং ঠিক আসে। স্বচ্ছ পাতায় alpha-cutout দেওয়া হয়েছে। সামনে-উপর-বাঁ দিক থেকে আলো দিয়ে ৩ কোণ থেকে রেন্ডার করা হয়েছে। তারপর কেটে ৩০০px উঁচু WebP বানানো হয়েছে। গেমে মাপ, উল্টানো (mirror) আর ছায়া যোগ হয়।

## ৩D প্রাণী (v28)
| গেমে | মডেল | নির্মাতা | লাইসেন্স | উৎস |
|---|---|---|---|---|
| নেকড়ে (রাস্তায় দৌড়ায়) | "Wolf - Realistic 3D Model Demo Free" | WildMesh 3D | **CC BY-NC 4.0** | https://sketchfab.com/3d-models/wolf-realistic-3d-model-demo-free-8840b859a566485c874a27b1731e1db8 |
| খরগোশ (রাস্তায় লাফায়) | "Rabbit - Realistic 3D Model Demo Free" | WildMesh 3D | **CC BY-NC 4.0** | https://sketchfab.com/3d-models/rabbit-realistic-3d-model-demo-free-d70284ea0d7644988bdcd327c3ffb59a |
| শালিক (আকাশে উড়ে যায়) | "Common Myna 3D Model Free" | iRahulRajput | CC BY 4.0 | https://sketchfab.com/3d-models/common-myna-3d-model-free-102ccde8b113480fab81de79e432dcd5 |
| পাখির ঝাঁক | "Birds" | Zacxophone | Sketchfab Standard | https://sketchfab.com/3d-models/birds-3a9bb97be78944f9bffc23fb25c2154e |

**আমাদের পরিবর্তন:** নেকড়ে আর খরগোশের হাঁটার অ্যানিমেশন থেকে, আর পাখির ঝাঁকের ডানা ঝাপটানো অ্যানিমেশন থেকে, ৮টা করে ফ্রেম রেন্ডার করা হয়েছে (`models/animals/*.webp`, মোট ~১০০KB)। শালিকের একটা ছবি। মডেল ফাইল গেমে রাখা হয়নি।

**লাইসেন্স নিয়ে খেয়াল রাখার বিষয়:**
- **NC (অবাণিজ্যিক):** নেকড়ে, খরগোশ আর Monstera। ইউনিভার্সিটি প্রজেক্টে ব্যবহার করা যাবে, কিন্তু গেম বিক্রি করলে বা বিজ্ঞাপন দিলে এগুলো বাদ দিতে হবে।
- **পাখির দুই ফাইল:** ব্যবহারকারী দুটো পাখির ফাইল দিয়েছিল। "bird" (Blender Artist, CC BY 4.0) আর "Birds" (Zacxophone, Sketchfab Standard)-এর জ্যামিতি হুবহু এক, অর্থাৎ একটা আরেকটার কপি। কোনটা আসল জানা নেই, তাই বেশি কড়া লাইসেন্সটা ধরে Zacxophone-কে ক্রেডিট দেওয়া হয়েছে। গেমে শুধু রেন্ডার করা ছবি আছে, মডেল ফাইল নেই।

## কলাগাছ আর মাটি-রাস্তার টেক্সচার (v29)
| গেমে | মডেল | নির্মাতা | লাইসেন্স | উৎস |
|---|---|---|---|---|
| কলাগাছ (`banana`, ৩টা ছবি) | "Banana Tree (Low Poly)" | EmiyaSyahriel | CC BY 4.0 | https://sketchfab.com/3d-models/banana-tree-low-poly-97a50ee6d93d4d8cb2c455a64a6d17c2 |
| কলাগাছ (`banana`, ৩টা ছবি) | "Banana Tree" | DJMiddi | CC BY 4.0 | https://sketchfab.com/3d-models/banana-tree-7186ebfc24fc42c599f81713cd28d55e |
| মাটি (`dirt`), রাস্তা (`road`), পাথুরে মাটি (`rocks`), খাদের পাথর (`cliff`) | "[UPDATE] Dirt Road Through Forest" (এর Ground_Dirt, Dirt_Road, Broken_Rocks, Tall_Cliff টেক্সচার) | 99.Miles | CC BY 4.0 | https://sketchfab.com/3d-models/update-dirt-road-through-forest-c4676cdf7715484382400ff63faffd45 |
| বালু (`sand`, মরুভূমি ম্যাপ) | "Sand Dunes" | Helindu | CC BY 4.0 | https://sketchfab.com/3d-models/sand-dunes-6bd9a0d96ef4463a8efd45af2be595ac |
| বরফ (`snow`, বরফ ম্যাপ) | "American Road Snow in Winter" (এর Cliff টেক্সচার) | jimbogies | CC BY 4.0 | https://sketchfab.com/3d-models/american-road-snow-in-winter-3618e7de9d014f1eb38d5c95b5f45645 |

**আমাদের পরিবর্তন:** মডেল থেকে শুধু রংয়ের টেক্সচার (base color) বের করা হয়েছে। সেটা থেকে ২৫৬px-এর "দানা-মানচিত্র" বানানো হয়েছে (`models/ground/*.webp`): টেক্সচারের আলো-ছায়ার পার্থক্য থেকে স্বচ্ছ হালকা/গাঢ় ফোঁটা। বালুর ছবির কিনারা কাটা হয়েছে। গেমে এগুলো পাহাড়ের আগের রংয়ের ওপর বসে, তাই প্রতিটা ম্যাপের নিজের রং থাকে, শুধু আসল মাটি-পাথরের দানা যোগ হয়। কলাগাছ ৩ কোণ থেকে রেন্ডার করে ছবি করা হয়েছে।

**যেগুলো ব্যবহার হয়নি (ফাইল দেওয়া হয়েছিল):** "Road02" (SKMT), "gravel road 2" (SPLEEN VISION), "Oak & Pine forest grounds" (3dhdscan), "Snow foot step" (GM3Dscan), "Sand Dune" (Helindu, টেক্সচার ছাড়া), "Sand Rock Pack 05" (perryfactor6177258)। এগুলো স্ক্যান করা টুকরো মডেল। এদের টেক্সচার জোড়া দিয়ে বারবার বসানোর মতো (tileable) না, আর ২D পাশ-দৃশ্যে কাজেও লাগে না। সবই CC BY 4.0।

## চালক (v30)
- **মডেল:** "indian man in pattern shirt"
- **নির্মাতা:** Pixel_Monster
- **লাইসেন্স:** CC BY 4.0
- **উৎস:** https://sketchfab.com/3d-models/indian-man-in-pattern-shirt-13b46cdd311043d7a460245276c9771b
- **কে যোগ করেছে:** ব্যবহারকারী (Azizul) নিজে ডাউনলোড করে দিয়েছে।
- **আমাদের পরিবর্তন:** অ্যানিমেশন, নরমাল/অন্যান্য ম্যাপ বাদ দেওয়া হয়েছে। ~৫২ হাজার থেকে ~১৩.৫ হাজার ত্রিভুজে হালকা করা হয়েছে, টেক্সচার ২৫৬px WebP করা হয়েছে (`models/driver.glb`, ~৫২০KB)। গেমে কোড দিয়ে বসানো হয় (`truck3d.js`): হাড়গুলো IK দিয়ে ঘোরানো, যাতে পা প্যাডেলে/মেঝেতে আর হাত হ্যান্ডেলে/স্টিয়ারিংয়ে থাকে। রিকশায় প্যাডেল মারার নড়াচড়া চাকার সাথে চলে।
