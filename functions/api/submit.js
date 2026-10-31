import { json, bad, readJson, needDB, authPlayer } from "./_lib.js";
// POST /api/submit { id, token, map, level, time, unlocked, completed, coins }
// যাচাই শুধু সীমা-ভিত্তিক; ক্লায়েন্ট জাল করা স্কোর পুরোপুরি আটকানো যায় না (সৎ সীমাবদ্ধতা)।
const int = (v, a, b) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const p = await authPlayer(env, b.id, b.token); if (!p) return bad("অনুমতি নেই", 401);
  const now = Date.now();
  const unlocked = int(b.unlocked, 1, 100), completed = int(b.completed, 0, 100), coins = int(b.coins, 0, 100000000);
  if (unlocked === null || completed === null || coins === null) return bad("ভুল মান");
  if (b.level !== undefined && b.level !== null) {
    const map = int(b.map, 0, 12), level = int(b.level, 1, 100), time = Number(b.time);
    if (map === null || level === null || !(time >= 8 && time <= 3600)) return bad("ভুল স্কোর");
    await env.DB.prepare("INSERT INTO scores (player_id,map,level,time,updated) VALUES (?,?,?,?,?) ON CONFLICT(player_id,map,level) DO UPDATE SET time=MIN(time,excluded.time), updated=CASE WHEN excluded.time<time THEN excluded.updated ELSE updated END").bind(p.id, map, level, Math.round(time * 100) / 100, now).run();
  }
  await env.DB.prepare("INSERT INTO progress (player_id,unlocked,completed,coins,updated) VALUES (?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET unlocked=MAX(unlocked,excluded.unlocked), completed=MAX(completed,excluded.completed), coins=MAX(coins,excluded.coins), updated=excluded.updated").bind(p.id, unlocked, completed, coins, now).run();
  return json({ ok: true });
}
