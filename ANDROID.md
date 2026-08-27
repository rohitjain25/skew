# Android (SKEW)

Native Kotlin + Jetpack Compose port of the web game. Same scoring, daily UTC seed (`skew-daily-v1` + FNV-1a + mulberry32), and puzzles as `src/game/`.

applicationId `app.skew.android` · minSdk 26 · targetSdk 36 · portrait phone · free, no account, works offline.

No Play Console upload. No UPI.

## Install debug APK

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Build:

```bash
cd android
./gradlew assembleDebug testDebugUnitTest
```

Needs `ANDROID_HOME` and `sdk.dir` in `android/local.properties`.

## Share

Share card / Challenge a friend both open the Android Sharesheet with one packet:

- PNG: hashed silhouettes (`skew-share-sil-v1`, not the puzzle), score, UTC date on daily cards, three-bar mark (middle −8°), live host lockup `temporary-zippy-mistral-mg92d6h.vercel.app` (not `SKEW.GAME`). No answer, no rupee, no poker.
- One line: `SKEW — Find the fake. I scored N. Can you beat me?`
- URL: `https://temporary-zippy-mistral-mg92d6h.vercel.app/?d=YYYY-MM-DD`

Backing out of the sheet does not count as a share (no Android beacon this pass).

## Deep links

`https://temporary-zippy-mistral-mg92d6h.vercel.app/?d=YYYY-MM-DD` is an https App Link (intent-filter on that host). Opening it plays that UTC day’s Daily seed. First finish of a UTC day is saved; later opens are practice. Missing or invalid `d` falls back to UTC today.

Verified autoVerify (`assetlinks.json` on the live host) is not part of this pass; the VIEW filter still lets you open the URL with the app.
