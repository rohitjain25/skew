# SKEW

Find the fake.

Free browser game. Three shapes. Exactly one is wrong. Tap it.

No account. No download. 3 lives. Combo on consecutive hits. A typical endless run lasts about 45–90 seconds.

Daily uses the UTC date as a seed. `?d=YYYY-MM-DD` selects that UTC day. Missing or invalid `d` falls back to UTC today. Same date → same 12 rounds for every player.

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

`VITE_SITE_URL` is the public origin used for Open Graph and share links.

The results screen always includes an optional ₹49 UPI tip (`pn=SKEW`). The game is free without it.

## Android

Native Kotlin + Jetpack Compose app under `android/` (`applicationId app.skew.android`). Same scoring, daily seed, and puzzles as the web client.

```bash
cd android
./gradlew assembleDebug testDebugUnitTest
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

See `ANDROID.md`.
