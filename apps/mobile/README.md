# TaskTrasker Mobile

This folder contains the **Expo-based Android app** for TaskTrasker, built with native Android SDK + Gradle for Play Store distribution.

The app wraps the web app (`https://tasktasker.com`) in a React Native `WebView`, enabling a full-featured native experience without rewriting the product UI.

## Prerequisites

- Node.js 18+
- npm
- Android Studio (SDK + emulator) for Android testing
- (Optional) Expo Go app on a physical Android device

## 1) Install dependencies

From this folder:

```bash
npm install
```

## 2) Run locally for development

Start Expo dev server:

```bash
npm run start
```

Then choose one of these:

- Press `a` in the Expo terminal to open Android emulator
- Scan the QR code with Expo Go (Android device on same network)

Or run directly:

```bash
npm run android
```

## 3) Local testing tips

- Keep the web app deployed/running, since mobile shell loads `webAppUrl` from `app.json`.
- To test another target (staging/local tunnel), update:
  - `expo.extra.webAppUrl` in `app.json`
- If Metro cache gets weird:

```bash
npx expo start --clear
```

## 4) Type-check mobile code

```bash
npm run typecheck
```

## 5) Build for Android (local)

Build a signed release APK:

```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

Or build an Android App Bundle (AAB) for Play Store:

```bash
cd android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

Set these environment variables before building:
```bash
export KEYSTORE_PASSWORD=tasktrasker123
export KEY_ALIAS=tasktrasker
export KEY_PASSWORD=tasktrasker123
```

## 6) Play Store Submission (via GitHub Actions)

**Automated workflow:** Push to `main` or create a PR → GitHub Actions automatically:
1. Builds the signed AAB with Gradle
2. Submits to Google Play Store via Fastlane
   - PRs → Internal Testing track
   - main → Production track

**Manual local submission:**

```bash
bundle install
bundle exec fastlane android deploy --track internal
```

Requires `GOOGLE_PLAY_SERVICE_ACCOUNT` JSON file in working directory.

---

## Secrets & Configuration

**GitHub Secrets** (for automated CI/CD):
- `KEYSTORE_BASE64` — base64-encoded signing keystore
- `KEYSTORE_PASSWORD` — keystore password
- `GOOGLE_PLAY_SERVICE_ACCOUNT` — Play Store service account JSON

**Local config** (`.env` file, never commit):
```bash
KEYSTORE_PASSWORD=tasktrasker123
KEY_ALIAS=tasktrasker
KEY_PASSWORD=tasktrasker123
GOOGLE_PLAY_KEY_FILE=google-play-service-account.json
```

---

## Notes on iOS

iOS bundle metadata exists in `app.json`, but **there is intentionally no active iOS release flow yet**. If/when requested, iOS EAS profiles and App Store Connect config can be added.
