import { json, bad, cleanName, readJson, needDB, authPlayer, avatarOf } from "./_lib.js";
// POST /api/profile { id, token, name?, avatar? } → দেখানোর নাম বদলানো (অনন্য থাকতে হবে) ও অ্যাভাটার (০–১৭) বাছা। লগইন-আইডি (ইমেইল) বদলায় না।
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const p = await authPlayer(env, b.id, b.token); if (!p) return bad("অনুমতি নেই", 401);
  let name = p.name;
  if (b.name !== undefined && b.name !== null && String(b.name).trim() !== "") {
    if (p.guest) return bad("গেস্টের নাম বদলানো যায় না — আগে নিবন্ধিত হও");
    name = cleanName(b.name); if (name.length < 2) return bad("নাম অন্তত ২ অক্ষর");
    if (/^guest-/i.test(name)) return bad("এই নাম নেওয়া যাবে না");
    const dup = await env.DB.prepare("SELECT id FROM players WHERE name_key=?").bind(name.toLowerCase()).first();
    if (dup && dup.id !== p.id) return bad("এই নাম আগেই নেওয়া", 409);
    await env.DB.prepare("UPDATE players SET name=?, name_key=? WHERE id=?").bind(name, name.toLowerCase(), p.id).run();
  }
  let avatar = await avatarOf(env, p.id);
  if (b.avatar !== undefined && b.avatar !== null) {
    const a = Math.floor(Number(b.avatar)); if (!(a >= 0 && a <= 17)) return bad("ভুল ছবি");
    await env.DB.prepare("INSERT INTO profile (player_id,avatar) VALUES (?,?) ON CONFLICT(player_id) DO UPDATE SET avatar=excluded.avatar").bind(p.id, a).run(); avatar = a;
  }
  return json({ ok: true, name, avatar });
}
