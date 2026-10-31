import { json, bad, cleanName, validEmail, sha256, randomHex, readJson, needDB } from "./_lib.js";
// POST /api/register  { guest:true } অথবা { name, email }  → { id, token, name }
// সতর্কতা: ইমেইল যাচাই (verify) করা হয় না, পাসওয়ার্ডও নেই; token শুধু ওই ডিভাইসে থাকে।
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const guest = !!b.guest;
  let name = cleanName(b.name), email = null;
  if (guest) { if (!name) name = "Guest-" + String(Math.floor(1000 + Math.random() * 9000)); }
  else {
    if (!name) return bad("নাম দিতে হবে");
    email = String(b.email ?? "").trim().toLowerCase();
    if (!validEmail(email)) return bad("ইমেইল ঠিক নয়");
    const ex = await env.DB.prepare("SELECT id FROM players WHERE email = ?").bind(email).first();
    if (ex) return bad("এই ইমেইল আগেই নিবন্ধিত", 409);
  }
  const id = "p_" + randomHex(8), token = randomHex(24);
  await env.DB.prepare("INSERT INTO players (id,name,email,token_hash,guest,created) VALUES (?,?,?,?,?,?)").bind(id, name, email, await sha256(token), guest ? 1 : 0, Date.now()).run();
  return json({ ok: true, id, token, name, guest });
}
