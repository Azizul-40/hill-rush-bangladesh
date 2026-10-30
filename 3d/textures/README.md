# ঐচ্ছিক টেক্সচার (এখানে ফাইল রাখলে 3D গেম নিজে নিয়ে নেবে)

| ফাইলের নাম | কী | ফরম্যাট |
|---|---|---|
| `road_color.jpg` | রাস্তার মাটির রঙ-টেক্সচার (Diffuse/Color) | JPG, ১K বা ২K |
| `road_normal.jpg` | রাস্তার Normal map (OpenGL/GL) | JPG |
| `ground_color.jpg` | পাহাড়/ঘাসের জমির রঙ-টেক্সচার | JPG |
| `ground_normal.jpg` | জমির Normal map (GL) | JPG |
| `sky.hdr` | আকাশের HDRI (equirectangular) | `.hdr`, ১K–২K |

ফাইল না থাকলে গেম কোডে-আঁকা টেক্সচার ব্যবহার করে। **যেটাই যোগ করো, `docs/ASSET_CREDITS.md`-এ নাম, উৎস-লিংক ও লাইসেন্স লিখবে।**
(লোডার-পথ নকল ছবি দিয়ে পরীক্ষা হয়েছে; আসল Poly Haven/ambientCG ফাইল দিয়ে এখনো না।)
