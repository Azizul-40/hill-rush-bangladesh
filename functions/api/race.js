import { json, bad, readJson, needDB, authPlayer } from "./_lib.js";
// অনলাইন রেস (v48) — D1 পোলিং দিয়ে: Durable Object/WebSocket ছাড়া, কোনো বাড়তি সেটআপ ছাড়া।
// POST /api/race { id, token, op, ... }
//   op "quick"  {level,map}            → দ্রুত ম্যাচ: একই লেভেলের খোলা পাবলিক রুমে ঢোকে, না থাকলে নতুন বানায়
//   op "create" {level,map,maxp,pub}   → রুম বানায় (pub=0 হলে শুধু কোড দিয়ে ঢোকা যায়)
//   op "join"   {code}             → কোড দিয়ে ঢোকে
//   op "poll"   {code,x?}          → নিজের অবস্থান পাঠায় + সবার অবস্থা ফেরত পায় (লবি ~১ বার/সেকেন্ড, রেসে ~৪ বার/সেকেন্ড)
//   op "start"  {code}             → হোস্ট রেস শুরু করে (কমপক্ষে ২ জন)
//   op "fin"    {code,time}        → শেষ করার সময় জমা;  op "dnf" {code} → বাদ;  op "leave" {code}
// সময়ের দাবি ক্লায়েন্ট থেকে আসে — পুরোপুরি জাল রোধ করা যায় না (শুধু সীমা যাচাই)।
const ROOM_TTL = 3 * 3600e3, WAIT_AUTO = 10000, COUNTDOWN = 4500, GONE_MS = 12000, MAXP = 8;
const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () => { let s = ""; const a = crypto.getRandomValues(new Uint8Array(5)); for (const v of a) s += letters[v % letters.length]; return s; };
const int = (v, a, b) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
async function view(env, code, pid, now) {
  const room = await env.DB.prepare("SELECT code,host,level,map,maxp,pub,status,start_at,ready_at FROM race_rooms WHERE code=?").bind(code).first();
  if (!room) return null;
  const rows = (await env.DB.prepare("SELECT pid,name,x,fin,seen,joined FROM race_players WHERE code=? ORDER BY joined").bind(code).all()).results || [];
  return { room: { code: room.code, level: room.level, map: room.map, maxp: room.maxp, pub: room.pub, status: room.status, start_at: room.start_at, now, host: room.host === pid }, players: rows.map(r => ({ name: r.name, x: Math.round(r.x), fin: r.fin, you: r.pid === pid, host: r.pid === room.host, gone: now - r.seen > GONE_MS })) };
}
async function addPlayer(env, code, p, now) {
  await env.DB.prepare("INSERT INTO race_players (code,pid,name,x,fin,joined,seen) VALUES (?,?,?,0,NULL,?,?) ON CONFLICT(code,pid) DO UPDATE SET seen=excluded.seen").bind(code, p.id, p.name, now, now).run();
}
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const p = await authPlayer(env, b.id, b.token); if (!p) return bad("অনুমতি নেই", 401);
  const now = Date.now(), op = String(b.op || "");
  try {
    if (op === "create" || op === "quick") {
      const level = int(b.level, 1, 100), map = int(b.map ?? 0, 0, 30); if (level === null || map === null) return bad("ভুল লেভেল");
      try { await env.DB.prepare("DELETE FROM race_players WHERE code IN (SELECT code FROM race_rooms WHERE created < ?)").bind(now - ROOM_TTL).run(); await env.DB.prepare("DELETE FROM race_rooms WHERE created < ?").bind(now - ROOM_TTL).run(); } catch (x) { /* পরিষ্কার-করা ব্যর্থ হলে ক্ষতি নেই */ }
      // আগের কোনো খোলা রুমে থাকলে বের করা
      await env.DB.prepare("DELETE FROM race_players WHERE pid=? AND code IN (SELECT code FROM race_rooms WHERE status='wait')").bind(p.id).run();
      if (op === "quick") {
        const cand = (await env.DB.prepare("SELECT r.code AS code, r.maxp AS maxp, (SELECT COUNT(*) FROM race_players q WHERE q.code=r.code AND q.seen > ?) AS n FROM race_rooms r WHERE r.pub=1 AND r.status='wait' AND r.level=? AND r.map=? AND r.created > ? ORDER BY r.created").bind(now - GONE_MS, level, map, now - 600e3).all()).results || [];
        const hit = cand.find(c => c.n >= 1 && c.n < c.maxp);
        if (hit) { await addPlayer(env, hit.code, p, now); return json({ ok: true, ...(await view(env, hit.code, p.id, now)) }); }
      }
      const maxp = int(b.maxp, 2, MAXP) ?? 6, pub = op === "quick" ? 1 : (b.pub ? 1 : 0);
      let code = newCode(); for (let i = 0; i < 5; i++) { const ex = await env.DB.prepare("SELECT 1 AS k FROM race_rooms WHERE code=?").bind(code).first(); if (!ex) break; code = newCode(); }
      await env.DB.prepare("INSERT INTO race_rooms (code,host,level,map,maxp,pub,status,start_at,ready_at,created) VALUES (?,?,?,?,?,?,'wait',0,0,?)").bind(code, p.id, level, map, maxp, pub, now).run();
      await addPlayer(env, code, p, now);
      return json({ ok: true, ...(await view(env, code, p.id, now)) });
    }
    const code = String(b.code || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5); if (code.length !== 5) return bad("রুম কোড ৫ অক্ষরের");
    const room = await env.DB.prepare("SELECT code,host,level,map,maxp,pub,status,start_at,ready_at FROM race_rooms WHERE code=?").bind(code).first();
    if (!room) return bad("এই কোডে কোনো রুম নেই", 404);
    if (op === "join") {
      const me = await env.DB.prepare("SELECT 1 AS k FROM race_players WHERE code=? AND pid=?").bind(code, p.id).first();
      if (!me) {
        if (room.status !== "wait") return bad("রেস শুরু হয়ে গেছে", 409);
        const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM race_players WHERE code=? AND seen > ?").bind(code, now - GONE_MS).first();
        if (n.n >= room.maxp) return bad("রুম ভর্তি", 409);
        await env.DB.prepare("DELETE FROM race_players WHERE pid=? AND code IN (SELECT code FROM race_rooms WHERE status='wait')").bind(p.id).run();
      }
      await addPlayer(env, code, p, now);
      return json({ ok: true, ...(await view(env, code, p.id, now)) });
    }
    const mine = await env.DB.prepare("SELECT 1 AS k FROM race_players WHERE code=? AND pid=?").bind(code, p.id).first();
    if (!mine) return bad("তুমি এই রুমে নেই", 403);
    if (op === "leave") {
      await env.DB.prepare("DELETE FROM race_players WHERE code=? AND pid=?").bind(code, p.id).run();
      if (room.host === p.id) { const nx = await env.DB.prepare("SELECT pid FROM race_players WHERE code=? ORDER BY joined LIMIT 1").bind(code).first(); if (nx) await env.DB.prepare("UPDATE race_rooms SET host=? WHERE code=?").bind(nx.pid, code).run(); else await env.DB.prepare("DELETE FROM race_rooms WHERE code=?").bind(code).run(); }
      return json({ ok: true });
    }
    if (op === "start") {
      if (room.host !== p.id) return bad("শুধু হোস্ট শুরু করতে পারে", 403);
      const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM race_players WHERE code=? AND seen > ?").bind(code, now - GONE_MS).first();
      if (n.n < 2) return bad("কমপক্ষে ২ জন লাগবে");
      if (room.status === "wait") await env.DB.prepare("UPDATE race_rooms SET status='go', start_at=? WHERE code=?").bind(now + COUNTDOWN, code).run();
      return json({ ok: true, ...(await view(env, code, p.id, now)) });
    }
    if (op === "fin") {
      const t = Number(b.time); if (!(t >= 8 && t <= 3600)) return bad("ভুল সময়");
      await env.DB.prepare("UPDATE race_players SET fin=COALESCE(fin, ?), seen=? WHERE code=? AND pid=?").bind(Math.round(t * 100) / 100, now, code, p.id).run();
      return json({ ok: true, ...(await view(env, code, p.id, now)) });
    }
    if (op === "dnf") { await env.DB.prepare("UPDATE race_players SET fin=COALESCE(fin,-1), seen=? WHERE code=? AND pid=?").bind(now, code, p.id).run(); return json({ ok: true }); }
    if (op === "poll") {
      const x = Number(b.x); await env.DB.prepare("UPDATE race_players SET seen=?, x=CASE WHEN ? >= 0 AND ? < 1000000 THEN ? ELSE x END WHERE code=? AND pid=?").bind(now, Number.isFinite(x) ? x : -1, Number.isFinite(x) ? x : -1, Number.isFinite(x) ? x : 0, code, p.id).run();
      if (room.status === "wait") {
        const n = (await env.DB.prepare("SELECT COUNT(*) AS n FROM race_players WHERE code=? AND seen > ?").bind(code, now - GONE_MS).first()).n;
        if (room.pub) { // পাবলিক রুমে নিজে থেকেই শুরু: ২+ জন হলে ১০ সেকেন্ড, ভর্তি হলে সাথে সাথে
          if (n >= 2 && !room.ready_at) await env.DB.prepare("UPDATE race_rooms SET ready_at=? WHERE code=?").bind(now, code).run();
          if (n < 2 && room.ready_at) await env.DB.prepare("UPDATE race_rooms SET ready_at=0 WHERE code=?").bind(code).run();
          const rdy = room.ready_at || (n >= 2 ? now : 0);
          if (n >= room.maxp || (n >= 2 && now - rdy >= WAIT_AUTO)) await env.DB.prepare("UPDATE race_rooms SET status='go', start_at=? WHERE code=? AND status='wait'").bind(now + COUNTDOWN, code).run();
        }
      }
      const v = await view(env, code, p.id, now); if (v && room.pub && v.room.status === "wait") { const r2 = await env.DB.prepare("SELECT ready_at FROM race_rooms WHERE code=?").bind(code).first(); v.room.auto_in = r2 && r2.ready_at ? Math.max(0, Math.ceil((WAIT_AUTO - (now - r2.ready_at)) / 1000)) : null; }
      return json({ ok: true, ...v });
    }
    return bad("অজানা কাজ");
  } catch (err) { return bad("রেস সার্ভিস প্রস্তুত নয় (db/v48_race_tables.sql চালাও)", 503); }
}
