# Online racing — status

**Built (v48):** quick match, private rooms with code, lobby, live positions via D1 polling (functions/api/race.js).
Needs `db/v48_race_tables.sql` run once in the D1 console.

**Not built / untested:** real phones on mobile networks, many simultaneous rooms, server-side anti-cheat,
car collisions, voice/chat, ranked matchmaking by RP.

**If it gets slow** (D1 free tier = 100k writes/day; each racer writes ~4×/s), move to a Durable Object per room with WebSocket:
1. Worker + `RaceRoom` DO (SQLite-backed), bind to Pages. 2. Clients send `{x}` ~10×/s; DO broadcasts. 3. Same room/op protocol as race.js.
