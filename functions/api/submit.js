import { json, bad, readJson, needDB, authPlayer } from "./_lib.js";
// POST /api/submit { id, token, unlocked, completed, coins, map?, level?, time?, endless?:{map,dist} }
// উত্তরে র‍্যাংক: level → { rank, total }, endless → { endlessRank, endlessTotal }
// যাচাই শুধু সীমা-ভিত্তিক; ক্লায়েন্ট জাল করা স্কোর পুরোপুরি আটকানো যায় না (সৎ সীমাবদ্ধতা)।
const int = (v, a, b) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const p = await authPlayer(env, b.id, b.token); if (!p) return bad("অনুমতি নেই", 401);
  const now = Date.now(), out = { ok: true };
  const unlocked = int(b.unlocked, 1, 100), completed = int(b.completed, 0, 100), coins = int(b.coins, 0, 100000000);
  if (unlocked === null || completed === null || coins === null) return bad("ভুল মান");
  if (b.level !== undefined && b.level !== null) {
    const map = int(b.map, 0, 12), level = int(b.level, 1, 100), time = Number(b.time);
    if (map === null || level === null || !(time >= 8 && time <= 3600)) return bad("ভুল স্কোর");
    await env.DB.prepare("INSERT INTO scores (player_id,map,level,time,updated) VALUES (?,?,?,?,?) ON CONFLICT(player_id,map,level) DO UPDATE SET time=MIN(time,excluded.time), updated=CASE WHEN excluded.time<time THEN excluded.updated ELSE updated END").bind(p.id, map, level, Math.round(time * 100) / 100, now).run();
    const mine = await env.DB.prepare("SELECT time FROM scores WHERE player_id=? AND map=? AND level=?").bind(p.id, map, level).first();
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE map=? AND level=? AND time < ?").bind(map, level, mine.time).first();
    const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE map=? AND level=?").bind(map, level).first();
    out.rank = (r.n || 0) + 1; out.total = t.n || 1; out.best = mine.time;
  }
  if (b.endless && typeof b.endless === "object") {
    const map = int(b.endless.map, 0, 12), dist = int(b.endless.dist, 1, 1000000);
    if (map === null || dist === null) return bad("ভুল দূরত্ব");
    await env.DB.prepare("INSERT INTO endless (player_id,map,dist,updated) VALUES (?,?,?,?) ON CONFLICT(player_id,map) DO UPDATE SET dist=MAX(dist,excluded.dist), updated=CASE WHEN excluded.dist>dist THEN excluded.updated ELSE updated END").bind(p.id, map, dist, now).run();
    const mine = await env.DB.prepare("SELECT dist FROM endless WHERE player_id=? AND map=?").bind(p.id, map).first();
    const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM endless WHERE map=? AND dist > ?").bind(map, mine.dist).first();
    const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM endless WHERE map=?").bind(map).first();
    out.endlessRank = (r.n || 0) + 1; out.endlessTotal = t.n || 1; out.endlessBest = mine.dist;
  }
  await env.DB.prepare("INSERT INTO progress (player_id,unlocked,completed,coins,updated) VALUES (?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET unlocked=MAX(unlocked,excluded.unlocked), completed=MAX(completed,excluded.completed), coins=MAX(coins,excluded.coins), updated=excluded.updated").bind(p.id, unlocked, completed, coins, now).run();
  return json(out);
}
