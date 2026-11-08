import { json, bad, readJson, needDB, authPlayer } from "./_lib.js";
// POST /api/save { id, token, op: "get" }                 → { ok, data (JSON লেখা বা null), updated }
// POST /api/save { id, token, op: "put", data, ts }       → পুরো সেভ (কয়েন, আনলক, গাড়ি, আপগ্রেড, সেরা সময়) সার্ভারে রাখে
// শুধু নিবন্ধিত প্লেয়ার। বড় আকার (৮০ হাজার অক্ষরের বেশি) বাতিল।
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request, 90000); if (!b) return bad("ভুল অনুরোধ");
  const p = await authPlayer(env, b.id, b.token); if (!p) return bad("অনুমতি নেই", 401);
  if (p.guest) return bad("ক্লাউড সেভ শুধু নিবন্ধিত অ্যাকাউন্টে", 403);
  if (b.op === "get") {
    const r = await env.DB.prepare("SELECT data, updated FROM cloudsave WHERE player_id=?").bind(p.id).first();
    return json({ ok: true, data: r ? r.data : null, updated: r ? r.updated : 0 });
  }
  if (b.op === "put") {
    if (typeof b.data !== "string" || b.data.length > 80000) return bad("সেভ খুব বড়");
    try { JSON.parse(b.data); } catch (x) { return bad("ভুল সেভ"); }
    const ts = Math.min(Date.now() + 60000, Math.max(0, Math.floor(Number(b.ts)) || Date.now()));
    await env.DB.prepare("INSERT INTO cloudsave (player_id,data,updated) VALUES (?,?,?) ON CONFLICT(player_id) DO UPDATE SET data=excluded.data, updated=excluded.updated WHERE excluded.updated >= cloudsave.updated").bind(p.id, b.data, ts).run();
    const r = await env.DB.prepare("SELECT updated FROM cloudsave WHERE player_id=?").bind(p.id).first();
    return json({ ok: true, updated: r.updated });
  }
  return bad("ভুল অনুরোধ");
}
