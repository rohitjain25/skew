# SKEW

Find the fake.

Free browser game. Three shapes. Exactly one is wrong. Tap it.

No account. No download. 3 lives. Combo on consecutive hits. A typical endless run lasts about 45–90 seconds.

Daily uses the UTC date as a seed. Every player gets the same 12 rounds until 00:00 UTC. First completed run of the day is stored on this device.

Personal best is saved in localStorage. There is no public leaderboard.

Optional ₹49 UPI tip on the results screen. The game is free either way.

## Play locally

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43123

```bash
npm test
npm run build
npm run preview
```

`npm run build` writes static files to `dist/`.

## Deploy (free static hosting)

This is a static frontend. Any of these work:

**Cloudflare Pages:** connect the repo, build command `npm run build`, output directory `dist`.

**GitHub Pages:** build `dist/`, publish that folder. `base` is `./` so project pages work.

**Origin / Vercel:** framework preset Vite, output `dist`.

Set `VITE_SITE_URL` only if you want absolute Open Graph URLs. Not required to play.

The results screen always includes an optional ₹49 UPI tip (`pn=SKEW`). The game is free without it.
