import { json, bad, validEmail, validPin, pinHash, sha256, randomHex, readJson, needDB, checkCode, avatarOf } from "./_lib.js";
// POST /api/reset { email, code, pin } → PIN ভুলে গেলে ইমেইলের কোড দিয়ে নতুন PIN। অন্য সব ডিভাইস লগ-আউট হয়ে যায়।
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const email = String(b.email ?? "").trim().toLowerCase(), pin = String(b.pin ?? "");
  if (!validEmail(email)) return bad("ইমেইল ঠিক নয়");
  if (!validPin(pin)) return bad("PIN ৪ থেকে ৮টা সংখ্যা হতে হবে");
  const p = await env.DB.prepare("SELECT id, name FROM players WHERE email=? AND pin_hash IS NOT NULL").bind(email).first();
  if (!p || !(await checkCode(env, email, "reset", b.code))) return bad("কোড ভুল বা মেয়াদ শেষ — নতুন কোড নাও", 400);
  const token = randomHex(24);
  await env.DB.prepare("UPDATE players SET pin_hash=?, fails=0, lock_until=0, token_hash=? WHERE id=?").bind(await pinHash(p.id, pin), await sha256(randomHex(16)), p.id).run();
  await env.DB.prepare("DELETE FROM tokens WHERE player_id=?").bind(p.id).run();
  await env.DB.prepare("INSERT INTO tokens (player_id,token_hash,created) VALUES (?,?,?)").bind(p.id, await sha256(token), Date.now()).run();
  return json({ ok: true, id: p.id, token, name: p.name, guest: false, avatar: await avatarOf(env, p.id) });
}
