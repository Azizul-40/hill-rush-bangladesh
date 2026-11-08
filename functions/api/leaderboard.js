import { json, bad, needDB } from "./_lib.js";
// v45-র নতুন `profile` টেবিল এখনো বানানো না হলে (docs/ACCOUNTS_SETUP.md ধাপ ১) আগের মতো ছবি/মোট-আয় ছাড়া চলে, ভেঙে পড়ে না।
async function hasProfile(env) { try { await env.DB.prepare("SELECT 1 FROM profile LIMIT 1").first(); return true; } catch (e) { return false; } }
// GET /api/leaderboard?type=level&map=0&level=3   → সেরা সময় (কম = ভালো)
// GET /api/leaderboard?type=endless&map=0         → এন্ডলেসে সবচেয়ে বেশি দূরত্ব
// GET /api/leaderboard?type=overall               → বেশি লেভেল শেষ → বেশি আনলক → বেশি কয়েন
// &me=<player id> দিলে উত্তরে নিজের র‍্যাংকও (me: {rank,total} বা null)
export async function onRequestGet({ request, env }) {
  const e = needDB(env); if (e) return e;
  const u = new URL(request.url), type = u.searchParams.get("type") || "overall", me = (u.searchParams.get("me") || "").slice(0, 40);
  const mapQ = Math.floor(Number(u.searchParams.get("map"))), pf = await hasProfile(env);
  const AV = pf ? ", COALESCE(pr.avatar,0) AS avatar" : "", JN = pf ? " LEFT JOIN profile pr ON pr.player_id=p.id" : "";
  if (type === "level") {
    const map = mapQ, level = Math.floor(Number(u.searchParams.get("level")));
    if (!(map >= 0 && map <= 20 && level >= 1 && level <= 100)) return bad("ভুল map/level");
    const r = await env.DB.prepare("SELECT p.id AS id, p.name AS name, p.guest AS guest" + AV + ", s.time AS time FROM scores s JOIN players p ON p.id=s.player_id" + JN + " WHERE s.map=? AND s.level=? ORDER BY s.time ASC, s.updated ASC LIMIT 20").bind(map, level).all();
    let mine = null;
    if (me) { const m = await env.DB.prepare("SELECT time FROM scores WHERE player_id=? AND map=? AND level=?").bind(me, map, level).first();
      if (m) { const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE map=? AND level=? AND time<?").bind(map, level, m.time).first(); const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM scores WHERE map=? AND level=?").bind(map, level).first(); mine = { rank: n.n + 1, total: t.n, time: m.time }; } }
    return json({ ok: true, type, rows: strip(r.results, me), me: mine });
  }
  if (type === "endless") {
    if (!(mapQ >= 0 && mapQ <= 20)) return bad("ভুল map");
    const r = await env.DB.prepare("SELECT p.id AS id, p.name AS name, p.guest AS guest" + AV + ", x.dist AS dist FROM endless x JOIN players p ON p.id=x.player_id" + JN + " WHERE x.map=? ORDER BY x.dist DESC, x.updated ASC LIMIT 20").bind(mapQ).all();
    let mine = null;
    if (me) { const m = await env.DB.prepare("SELECT dist FROM endless WHERE player_id=? AND map=?").bind(me, mapQ).first();
      if (m) { const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM endless WHERE map=? AND dist>?").bind(mapQ, m.dist).first(); const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM endless WHERE map=?").bind(mapQ).first(); mine = { rank: n.n + 1, total: t.n, dist: m.dist }; } }
    return json({ ok: true, type, rows: strip(r.results, me), me: mine });
  }
  if (!pf) {
    const r0 = await env.DB.prepare("SELECT p.id AS id, p.name AS name, p.guest AS guest, g.completed AS completed, g.unlocked AS unlocked, g.coins AS coins FROM progress g JOIN players p ON p.id=g.player_id ORDER BY g.completed DESC, g.unlocked DESC, g.coins DESC LIMIT 20").all();
    let mine0 = null;
    if (me) { const m = await env.DB.prepare("SELECT completed, unlocked, coins FROM progress WHERE player_id=?").bind(me).first();
      if (m) { const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM progress WHERE completed>? OR (completed=? AND unlocked>?) OR (completed=? AND unlocked=? AND coins>?)").bind(m.completed, m.completed, m.unlocked, m.completed, m.unlocked, m.coins).first(); const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM progress").first(); mine0 = { rank: n.n + 1, total: t.n }; } }
    return json({ ok: true, type: "overall", rows: strip(r0.results, me), me: mine0 });
  }
  const r = await env.DB.prepare("SELECT p.id AS id, p.name AS name, p.guest AS guest, COALESCE(pr.avatar,0) AS avatar, g.completed AS completed, g.unlocked AS unlocked, MAX(g.coins, COALESCE(pr.earned,0)) AS coins FROM progress g JOIN players p ON p.id=g.player_id LEFT JOIN profile pr ON pr.player_id=g.player_id ORDER BY g.completed DESC, g.unlocked DESC, MAX(g.coins, COALESCE(pr.earned,0)) DESC LIMIT 20").all();
  let mine = null;
  if (me) { const m = await env.DB.prepare("SELECT g.completed AS completed, g.unlocked AS unlocked, MAX(g.coins, COALESCE(pr.earned,0)) AS coins FROM progress g LEFT JOIN profile pr ON pr.player_id=g.player_id WHERE g.player_id=?").bind(me).first();
    if (m) { const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM progress g LEFT JOIN profile pr ON pr.player_id=g.player_id WHERE g.completed>? OR (g.completed=? AND g.unlocked>?) OR (g.completed=? AND g.unlocked=? AND MAX(g.coins, COALESCE(pr.earned,0))>?)").bind(m.completed, m.completed, m.unlocked, m.completed, m.unlocked, m.coins).first(); const t = await env.DB.prepare("SELECT COUNT(*) AS n FROM progress").first(); mine = { rank: n.n + 1, total: t.n }; } }
  return json({ ok: true, type: "overall", rows: strip(r.results, me), me: mine });
}
// অন্যদের id প্রকাশ করা হয় না; শুধু নিজের সারি চিহ্নিত (mine:true)
function strip(rows, me) { return (rows || []).map(({ id, ...x }) => ({ ...x, mine: !!me && id === me })); }
