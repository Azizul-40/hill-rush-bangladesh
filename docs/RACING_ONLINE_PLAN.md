# Live online racing — handoff plan (NOT built, NOT tested)

v47 ships an **offline race vs bots** (2–8 racers, names above cars, countdown, position HUD, results, trophies, RP ranks).
Real multiplayer with other people needs a server. Suggested design:

1. Cloudflare **Durable Object** `RaceRoom` (one per room code) with WebSocket; free plan needs the SQLite-backed DO class.
2. Lobby: create room → 5-letter code; join by code; host picks level + player count (2–8); quick-match = a DO `Matchmaker` holding a waiting room.
3. Sync: same level seed for everyone; each client sends `{x, y, angle, t}` ~10×/s; server relays; clients interpolate ghosts (cars do not collide).
4. Start: server broadcasts a start timestamp → 3-2-1-GO. Finish: client sends finish time; server ranks and awards RP/trophies (validate time ≥ physical minimum).
5. Cheating cannot be fully prevented with client-side physics; only sanity checks (max speed, finish time).
6. Needs the owner to enable Durable Objects in `wrangler.toml` / Pages bindings. Real-phone latency is untested.
