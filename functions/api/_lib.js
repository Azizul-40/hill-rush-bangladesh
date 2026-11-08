// লিডারবোর্ড API-র সাধারণ সাহায্যকারী (Cloudflare Pages Functions + D1)
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const bad = (msg, status = 400) => json({ ok: false, error: msg }, status);
export const cleanName = s => String(s ?? "").replace(/[\u0000-\u001f<>"'`&]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);
export const validEmail = s => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(s) && s.length <= 254;
export const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
export const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));
export async function readJson(request, max = 4000) { try { const t = await request.text(); if (t.length > max) return null; return JSON.parse(t); } catch (e) { return null; } }
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

// ---------- v45: ইমেইল ভেরিফিকেশন কোড ----------
// মেইল পাঠানো: BREVO_API_KEY (+ MAIL_FROM = Brevo-তে যাচাই করা প্রেরকের ইমেইল) অথবা RESEND_API_KEY (+ MAIL_FROM)।
// পরীক্ষার জন্য DEV_ECHO_CODE="1" দিলে কোড উত্তরেই ফেরত আসে (আসল সাইটে কখনো দিয়ো না)।
export async function sendMail(env, to, subject, text) {
  if (env.BREVO_API_KEY && env.MAIL_FROM) {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: { name: "Hill Rush Bangladesh", email: env.MAIL_FROM }, to: [{ email: to }], subject, textContent: text }) });
    return r.ok;
  }
  if (env.RESEND_API_KEY && env.MAIL_FROM) {
    const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" }, body: JSON.stringify({ from: "Hill Rush Bangladesh <" + env.MAIL_FROM + ">", to: [to], subject, text }) });
    return r.ok;
  }
  return null; // মেইল সেবা সংযুক্ত নয়
}
export const codeHash = (email, purpose, code) => sha256(email + "|" + purpose + "|" + code);
// কোড মিললে true (এবং কোড মুছে যায়); ৫ বার ভুল হলে কোড বাতিল
export async function checkCode(env, email, purpose, code) {
  const row = await env.DB.prepare("SELECT code_hash, expires, tries FROM email_codes WHERE email=? AND purpose=?").bind(email, purpose).first();
  if (!row || row.expires < Date.now() || row.tries >= 5) return false;
  if ((await codeHash(email, purpose, String(code ?? "").trim())) !== row.code_hash) { await env.DB.prepare("UPDATE email_codes SET tries=tries+1 WHERE email=? AND purpose=?").bind(email, purpose).run(); return false; }
  await env.DB.prepare("DELETE FROM email_codes WHERE email=? AND purpose=?").bind(email, purpose).run();
  return true;
}
export async function avatarOf(env, id) { try { const r = await env.DB.prepare("SELECT avatar FROM profile WHERE player_id=?").bind(id).first(); return r ? r.avatar : 0; } catch (e) { return 0; } }
