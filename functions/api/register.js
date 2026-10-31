import { json, bad, cleanName, validEmail, validPin, pinHash, sha256, randomHex, readJson, needDB, authPlayer } from "./_lib.js";
// POST /api/register
//   { guest:true }                         → গেস্ট প্রোফাইল (এই ডিভাইসেই থাকে)
//   { name, pin, email? }                  → নিবন্ধিত প্রোফাইল; নাম অনন্য, PIN ৪–৮ সংখ্যা; অন্য ফোনে /api/login দিয়ে ফেরত আনা যায়
//   { id, token, name, pin, email? }       → গেস্টকে নিবন্ধিত করা (স্কোর থেকে যায়)
// সতর্কতা: ইমেইল যাচাই হয় না; PIN সার্ভারে লবণসহ হ্যাশ করে রাখা হয়।
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
  let email = null;
  if (b.email !== undefined && b.email !== null && String(b.email).trim() !== "") {
    email = String(b.email).trim().toLowerCase(); if (!validEmail(email)) return bad("ইমেইল ঠিক নয়");
  }
  // পুরনো সংস্করণের মতো শুধু নাম+ইমেইল দিলেও চলবে (তখন PIN নেই, অন্য ফোনে লগইন হবে না)
  const pin = b.pin === undefined || b.pin === null || b.pin === "" ? null : String(b.pin);
  if (pin !== null && !validPin(pin)) return bad("PIN ৪ থেকে ৮টা সংখ্যা হতে হবে");
  if (pin === null && !email) return bad("PIN দিতে হবে (৪–৮ সংখ্যা)");
  const key = name.toLowerCase();
  const up = b.id && b.token ? await authPlayer(env, b.id, b.token) : null;
  const dupN = await env.DB.prepare("SELECT id FROM players WHERE name_key = ?").bind(key).first();
  if (dupN && (!up || dupN.id !== up.id)) return bad("এই নাম আগেই নেওয়া — অন্য নাম দাও, বা লগইন করো", 409);
  if (email) { const dupE = await env.DB.prepare("SELECT id FROM players WHERE email = ?").bind(email).first(); if (dupE && (!up || dupE.id !== up.id)) return bad("এই ইমেইল আগেই নিবন্ধিত", 409); }
  if (up) {
    await env.DB.prepare("UPDATE players SET name=?, name_key=?, email=COALESCE(?,email), pin_hash=?, guest=0 WHERE id=?").bind(name, key, email, pin ? await pinHash(up.id, pin) : null, up.id).run();
    return json({ ok: true, id: up.id, token: b.token, name, guest: false, upgraded: true });
  }
  const id = "p_" + randomHex(8), token = randomHex(24);
  await env.DB.prepare("INSERT INTO players (id,name,name_key,email,token_hash,pin_hash,guest,created) VALUES (?,?,?,?,?,?,0,?)").bind(id, name, key, email, await sha256(token), pin ? await pinHash(id, pin) : null, Date.now()).run();
  return json({ ok: true, id, token, name, guest: false });
}
