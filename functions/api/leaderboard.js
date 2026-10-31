import { json, bad, needDB } from "./_lib.js";
// GET /api/leaderboard?type=level&map=0&level=3   → সেরা সময় (কম = ভালো)
// GET /api/leaderboard?type=overall               → বেশি লেভেল শেষ → বেশি আনলক → বেশি কয়েন
export async function onRequestGet({ request, env }) {
  const e = needDB(env); if (e) return e;
  const u = new URL(request.url), type = u.searchParams.get("type") || "overall";
  if (type === "level") {
    const map = Math.floor(Number(u.searchParams.get("map"))), level = Math.floor(Number(u.searchParams.get("level")));
    if (!(map >= 0 && map <= 12 && level >= 1 && level <= 100)) return bad("ভুল map/level");
    const r = await env.DB.prepare("SELECT p.name AS name, p.guest AS guest, s.time AS time FROM scores s JOIN players p ON p.id=s.player_id WHERE s.map=? AND s.level=? ORDER BY s.time ASC, s.updated ASC LIMIT 20").bind(map, level).all();
    return json({ ok: true, type, rows: r.results || [] });
  }
  const r = await env.DB.prepare("SELECT p.name AS name, p.guest AS guest, g.completed AS completed, g.unlocked AS unlocked, g.coins AS coins FROM progress g JOIN players p ON p.id=g.player_id ORDER BY g.completed DESC, g.unlocked DESC, g.coins DESC LIMIT 20").all();
  return json({ ok: true, type: "overall", rows: r.results || [] });
}
