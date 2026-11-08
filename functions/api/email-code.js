import { json, bad, validEmail, readJson, needDB, randomHex, sendMail, codeHash } from "./_lib.js";
// POST /api/email-code { email, purpose: "register" | "reset" }  → ইমেইলে ৬ সংখ্যার কোড (১০ মিনিট বৈধ, ৪৫ সেকেন্ডে একবার)
export async function onRequestPost({ request, env }) {
  const e = needDB(env); if (e) return e;
  const b = await readJson(request); if (!b) return bad("ভুল অনুরোধ");
  const email = String(b.email ?? "").trim().toLowerCase(), purpose = b.purpose === "reset" ? "reset" : "register";
  if (!validEmail(email)) return bad("ইমেইল ঠিক নয়");
  const exists = await env.DB.prepare("SELECT id, pin_hash FROM players WHERE email=?").bind(email).first();
  if (purpose === "register" && exists && exists.pin_hash) return bad("এই ইমেইল আগেই নিবন্ধিত — লগইন করো", 409);
  const now = Date.now();
  const last = await env.DB.prepare("SELECT last_sent FROM email_codes WHERE email=? AND purpose=?").bind(email, purpose).first();
  if (last && now - last.last_sent < 45000) return bad("একটু অপেক্ষা করো — নতুন কোড ৪৫ সেকেন্ড পরে পাঠানো যাবে", 429);
  // PIN রিসেটে অ্যাকাউন্ট না থাকলেও একই উত্তর (কে নিবন্ধিত সেটা ফাঁস না করতে)
  if (purpose === "reset" && !(exists && exists.pin_hash)) return json({ ok: true, sent: true });
  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  await env.DB.prepare("INSERT INTO email_codes (email,purpose,code_hash,expires,tries,last_sent) VALUES (?,?,?,?,0,?) ON CONFLICT(email,purpose) DO UPDATE SET code_hash=excluded.code_hash, expires=excluded.expires, tries=0, last_sent=excluded.last_sent").bind(email, purpose, await codeHash(email, purpose, code), now + 10 * 60 * 1000, now).run();
  const sent = await sendMail(env, email, "Hill Rush Bangladesh — তোমার কোড " + code, "তোমার Hill Rush Bangladesh " + (purpose === "reset" ? "PIN রিসেটের" : "অ্যাকাউন্ট খোলার") + " কোড: " + code + "\n\nকোডটি ১০ মিনিট বৈধ। তুমি চেয়ে না থাকলে এই মেইল উপেক্ষা করো।");
  const dev = env.DEV_ECHO_CODE === "1";
  if (sent === null && !dev) return bad("ইমেইল সেবা এখনো সংযুক্ত নয় (অ্যাডমিনকে BREVO_API_KEY বা RESEND_API_KEY দিতে হবে)", 503);
  if (sent === false) return bad("ইমেইল পাঠানো যায়নি — একটু পরে আবার চেষ্টা করো", 502);
  return json(dev ? { ok: true, sent: true, devCode: code } : { ok: true, sent: true });
}
