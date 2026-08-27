# Android (SKEW)

Native Kotlin + Jetpack Compose port of the web game. Same scoring, daily UTC seed (`skew-daily-v1`), and puzzles as `src/game/`.

applicationId `app.skew.android` · minSdk 26 · targetSdk 36

## Install debug APK

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Build: `cd android && ./gradlew assembleDebug testDebugUnitTest` (needs `ANDROID_HOME` and `sdk.dir` in `android/local.properties`).
