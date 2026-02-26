# TaskTrasker Mobile (Expo)

This folder contains the **Android-first Expo shell app** for TaskTrasker.

The app currently wraps the web app (`https://tasktasker.com`) in a React Native `WebView` so you can test and ship an Android app without rewriting the product UI.

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

## 5) Build for Android (cloud)

```bash
npx eas build --platform android --profile production
```

## 6) Submit to Play Store

```bash
npx eas submit --platform android --profile production
```

---

## Notes on iOS

iOS bundle metadata exists in `app.json`, but **there is intentionally no active iOS release flow yet**. If/when requested, iOS EAS profiles and App Store Connect config can be added.
