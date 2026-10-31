// লিডারবোর্ড API-র সাধারণ সাহায্যকারী (Cloudflare Pages Functions + D1)
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);
export const cleanName = s => String(s ?? "").replace(/[\u0000-\u001f<>"'`&]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);
export const validEmail = s => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s) && s.length <= 254;
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
export const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
export async function readJson(request) { try { const t = await request.text(); if (t.length > 4000) return null; return JSON.parse(t); } catch (e) { return null; } }
export const needDB = env => !env || !env.DB ? bad("ডাটাবেস সংযুক্ত নয় (D1 binding 'DB' নেই)", 503) : null;
export const validPin = s => /^\d{4,8}$/.test(String(s ?? ""));
export const pinHash = (id, pin) => sha256(id + ":" + String(pin));
// প্রথম টোকেন players টেবিলে; লগইন করে পাওয়া অন্য ডিভাইসের টোকেন tokens টেবিলে
export async function authPlayer(env, id, token) {
  if (typeof id !== "string" || typeof token !== "string" || id.length > 40 || token.length > 100) return null;
  const row = await env.DB.prepare("SELECT id, name, guest, token_hash FROM players WHERE id = ?").bind(id).first();
  if (!row) return null;
  const h = await sha256(token);
  if (h === row.token_hash) return row;
  const t = await env.DB.prepare("SELECT 1 AS ok FROM tokens WHERE player_id = ? AND token_hash = ?").bind(id, h).first();
  return t ? row : null;
}
