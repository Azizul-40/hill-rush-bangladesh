import { json, bad, cleanName, validEmail, validPin, pinHash, sha256, randomHex, readJson, needDB, authPlayer, checkCode } from "./_lib.js";
// POST /api/register
//   { guest:true }                         → গেস্ট প্রোফাইল (এই ডিভাইসেই থাকে)
//   { name, pin, email, code }             → নিবন্ধিত প্রোফাইল; ইমেইলে পাঠানো ৬ সংখ্যার কোড (/api/email-code) দিয়ে যাচাই; নাম অনন্য, PIN ৪–৮ সংখ্যা
//   { id, token, name, pin, email, code }  → গেস্টকে নিবন্ধিত করা (স্কোর থেকে যায়)
// PIN সার্ভারে লবণসহ হ্যাশ করে রাখা হয়।
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  if (b.guest) {
    const name = cleanName(b.name) || "Guest-" + String(Math.floor(1000 + Math.random() * 9000));
    const id = "p_" + randomHex(8), token = randomHex(24);
    await env.DB.prepare("INSERT INTO players (id,name,name_key,email,token_hash,guest,created) VALUES (?,?,NULL,NULL,?,1,?)").bind(id, name, await sha256(token), Date.now()).run();
    return json({ ok: true, id, token, name, guest: true });
  }
  const name = cleanName(b.name); if (!name || name.length < 2) return bad("নাম দিতে হবে (অন্তত ২ অক্ষর)");
  if (/^guest-/i.test(name)) return bad("এই নাম নেওয়া যাবে না");
  const email = String(b.email ?? "").trim().toLowerCase(); if (!validEmail(email)) return bad("ইমেইল দিতে হবে");
  const pin = String(b.pin ?? ""); if (!validPin(pin)) return bad("PIN ৪ থেকে ৮টা সংখ্যা হতে হবে");
  const key = name.toLowerCase();
  const up = b.id && b.token ? await authPlayer(env, b.id, b.token) : null;
  const dupN = await env.DB.prepare("SELECT id FROM players WHERE name_key = ?").bind(key).first();
  if (dupN && (!up || dupN.id !== up.id)) return bad("এই নাম আগেই নেওয়া — অন্য নাম দাও, বা লগইন করো", 409);
  if (email) { const dupE = await env.DB.prepare("SELECT id FROM players WHERE email = ?").bind(email).first(); if (dupE && (!up || dupE.id !== up.id)) return bad("এই ইমেইল আগেই নিবন্ধিত", 409); }
  if (!(await checkCode(env, email, "register", b.code))) return bad("কোড ভুল বা মেয়াদ শেষ — নতুন কোড নাও", 400);
  if (up) {
    await env.DB.prepare("UPDATE players SET name=?, name_key=?, email=?, pin_hash=?, guest=0 WHERE id=?").bind(name, key, email, await pinHash(up.id, pin), up.id).run();
    await env.DB.prepare("INSERT INTO profile (player_id,verified) VALUES (?,1) ON CONFLICT(player_id) DO UPDATE SET verified=1").bind(up.id).run();
    return json({ ok: true, id: up.id, token: b.token, name, guest: false, upgraded: true });
  }
  const id = "p_" + randomHex(8), token = randomHex(24);
  await env.DB.prepare("INSERT INTO players (id,name,name_key,email,token_hash,pin_hash,guest,created) VALUES (?,?,?,?,?,?,0,?)").bind(id, name, key, email, await sha256(token), await pinHash(id, pin), Date.now()).run();
  await env.DB.prepare("INSERT INTO profile (player_id,verified) VALUES (?,1)").bind(id).run();
  return json({ ok: true, id, token, name, guest: false, avatar: 0 });
}
