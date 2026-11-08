import { json, bad, cleanName, validPin, pinHash, sha256, randomHex, readJson, needDB, avatarOf } from "./_lib.js";
// POST /api/login { login, pin } (login = ইমেইল অথবা নাম; পুরনো { name, pin }-ও চলে) → { id, token, name, avatar }  (অন্য ফোন/ব্রাউজারে একই প্রোফাইল)
// ভুল PIN ৫ বার হলে ১০ মিনিট লগইন বন্ধ (অনুমান করে PIN বের করা ঠেকাতে)।
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const who = String(b.login ?? b.email ?? b.name ?? "").trim(), pin = String(b.pin ?? "");
  if (!who || !validPin(pin)) return bad("ইমেইল (বা নাম) আর PIN ঠিকমতো দাও");
  const p = who.includes("@")
    ? await env.DB.prepare("SELECT id, name, pin_hash, fails, lock_until FROM players WHERE email = ?").bind(who.toLowerCase()).first()
    : await env.DB.prepare("SELECT id, name, pin_hash, fails, lock_until FROM players WHERE name_key = ?").bind(cleanName(who).toLowerCase()).first();
  if (!p || !p.pin_hash) return bad("ইমেইল/নাম বা PIN মিলছে না", 401);
  const now = Date.now();
  if (p.lock_until > now) return bad("অনেকবার ভুল হয়েছে — কিছুক্ষণ পরে চেষ্টা করো", 429);
  if ((await pinHash(p.id, pin)) !== p.pin_hash) {
    const f = (p.fails || 0) + 1;
    await env.DB.prepare("UPDATE players SET fails=?, lock_until=? WHERE id=?").bind(f >= 5 ? 0 : f, f >= 5 ? now + 10 * 60 * 1000 : 0, p.id).run();
    return bad("ইমেইল/নাম বা PIN মিলছে না", 401);
  }
  const token = randomHex(24);
  await env.DB.prepare("UPDATE players SET fails=0, lock_until=0 WHERE id=?").bind(p.id).run();
  await env.DB.prepare("INSERT INTO tokens (player_id,token_hash,created) VALUES (?,?,?)").bind(p.id, await sha256(token), now).run();
  return json({ ok: true, id: p.id, token, name: p.name, guest: false, avatar: await avatarOf(env, p.id) });
}
