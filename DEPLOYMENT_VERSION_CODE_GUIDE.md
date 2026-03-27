# Play Store Deployment & Version Code Flow - Comprehensive Guide

**Table of Contents:**
1. [The Error We Fixed](#the-error-we-fixed)
2. [Understanding Version Codes](#understanding-version-codes)
3. [Architecture Overview](#architecture-overview)
4. [Detailed Workflow Steps](#detailed-workflow-steps)
5. [Key Technologies](#key-technologies)
6. [Configuration Files Deep Dive](#configuration-files-deep-dive)
7. [Google Play Console Setup](#google-play-console-setup)
8. [How Each Component Works](#how-each-component-works)
9. [Common Issues & Solutions](#common-issues--solutions)
10. [Manual Testing & Debugging](#manual-testing--debugging)
11. [Security Considerations](#security-considerations)
12. [References](#references)

---

## The Error We Fixed

### Error Message
```
Google Api Error: Invalid request - Version code 1 has already been used.
```

### Root Cause Analysis

This error occurred because of a **mismatch between where the version code was being set and where Gradle was reading it**.

**The Problem:**
1. Workflow step tried to set `versionCode` dynamically (1000+, 2000+)
2. `build.gradle` had `versionCode 1` **hardcoded**
3. When Gradle built the app, it ignored the dynamic value and used the hardcoded `1`
4. Google Play refused the upload because versionCode=1 was already used

**The Chain of Failures:**
```
Workflow: "Set VERSION_CODE=1042"  →  Gradle: "Ignore, use versionCode 1"  →  Play Store: "Error: 1 already used"
```

### The Fix

Changed `build.gradle` to **read from the environment variable**:

```gradle
// Before (WRONG - hardcoded, ignores env var)
versionCode 1

// After (CORRECT - reads from env var, defaults to 1 if not set)
versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
```

Now the flow works correctly:
```
Workflow: "Set VERSION_CODE=1042"  →  Gradle: "Read env var, use 1042"  →  Play Store: "✓ Accepted"
```

---

## Understanding Version Codes

### Why Version Codes Exist

Android/Google Play requires **version codes** because:
- They uniquely identify each build
- They must be numerically incrementing (1 < 2 < 3, always)
- They prevent users from downgrading to older versions
- Google Play uses them to determine which version is "newer"

### Semantic Version vs Version Code

TaskTrasker uses **two independent versioning systems**:

| Aspect | Semantic Version | Version Code |
|--------|------------------|--------------|
| Format | `0.1.1` | `1042` |
| Where | `package.json`, `app.json` | `build.gradle` |
| Who sees it | Users (in Play Store listing) | Google Play internally |
| Requirements | Human-readable, follows semver | Numeric only, always incrementing |
| Can repeat? | Yes, across tracks | NO - must be unique per upload |
| Set by | Developer | Automation (workflow) |

### Why We Split Version Codes by Track

Google Play uses **tracks** to manage releases:
- **internal**: Testing (internal testers only)
- **beta**: Beta testing (testers opt-in)
- **production**: Public release (all users)

We use **different ranges** for safety:
```
Internal track:    1000-1999  (testing, safe to repeat on main/dev branches)
Production track:  2000-2999  (actual users, must be strictly incrementing)
```

This prevents mistakes like accidentally uploading version 1042 to production when 1042 is already in internal testing.

### Version Code Calculation

The workflow calculates version codes dynamically:

```bash
# For PRs (internal testing)
VERSION_CODE = 1000 + github.run_number

# For main branch pushes (production)
VERSION_CODE = 2000 + github.run_number
```

**Examples:**
```
GitHub Run #1 on PR:        VERSION_CODE = 1001 (internal)
GitHub Run #2 on PR:        VERSION_CODE = 1002 (internal)
GitHub Run #3 on main:      VERSION_CODE = 2003 (production)
GitHub Run #10 on PR:       VERSION_CODE = 1010 (internal)
GitHub Run #10 on main:     VERSION_CODE = 2010 (production)
```

**Why this works:**
- Each PR gets its own unique code (never conflicts with main)
- All production builds start from 2000 (always higher than internal)
- No manual tracking needed - automatic based on run numbers

---

## Architecture Overview

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        User Action                               │
│              (Push to main OR Create PR to main)                 │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                   GitHub Actions Webhook                         │
│   Triggers .github/workflows/play-store-deploy.yml              │
└─────────────────────────────┬──────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │   Determine Build Parameters            │
        ├─────────────────────────────────────────┤
        │ if (PR to main):                         │
        │   VERSION_CODE = 1000 + run_number      │
        │   TRACK = "internal"                     │
        │ else if (push to main):                  │
        │   VERSION_CODE = 2000 + run_number      │
        │   TRACK = "production"                   │
        └─────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │   Setup Build Environment               │
        ├─────────────────────────────────────────┤
        │ - Install Node.js                        │
        │ - Install Java 17                        │
        │ - Install Android SDK                    │
        │ - npm install (dependencies)             │
        │ - Set VERSION_CODE env var               │
        │ - Update app.json with versionCode       │
        │ - Decode keystore (signing certificate) │
        └─────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │   Build Android Application             │
        ├─────────────────────────────────────────┤
        │ Gradle reads VERSION_CODE from env      │
        │ Builds:                                  │
        │  - APK (app-release.apk)                 │
        │  - AAB (app-release.aab)                 │
        │ Signs with keystore certificate          │
        │ Outputs in:                              │
        │  - apk/release/                          │
        │  - bundle/release/                       │
        └─────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │   Prepare for Upload                    │
        ├─────────────────────────────────────────┤
        │ - Install Ruby & Fastlane                │
        │ - Load Google Play credentials           │
        │ - Package APK for artifacts              │
        │ - Upload APK to GitHub artifacts         │
        └─────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────────────────────────┐
        │   Upload to Google Play Store            │
        ├─────────────────────────────────────────┤
        │ Fastlane:                                │
        │  - Reads AAB from build output           │
        │  - Authenticates with service account    │
        │  - Uploads to Play Store API             │
        │  - Places in track (internal/prod)       │
        │  - Creates draft release                 │
        └─────────────────────────────────────────┘
                              │
                              ↓
                    ┌─────────────────┐
                    │  Deployment Done │
                    │  (or Failed)      │
                    └─────────────────┘
```

---

## Detailed Workflow Steps

This section breaks down each step in `.github/workflows/play-store-deploy.yml` and explains what's happening.

### Step 1: Checkout Code

```yaml
- name: Checkout code
  uses: actions/checkout@v4
```

**What it does:**
- Clones your repository code into the GitHub Actions runner
- Creates a clean working directory

**Output:**
- All source code available at working directory

**Why it matters:**
- Without this, the runner has no code to build

---

### Step 2: Setup Node.js

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
    cache-dependency-path: apps/mobile/package-lock.json
```

**What it does:**
- Installs Node.js v20 (matches your local development environment)
- Sets up npm caching (speeds up `npm install`)
- Points cache to the correct `package-lock.json`

**Why it matters:**
- Expo CLI and build tools need Node.js
- Caching saves ~2-3 minutes on repeat builds

**Timing:** ~30 seconds (first time) or ~5 seconds (with cache)

---

### Step 3: Setup Java 17

```yaml
- name: Setup Java
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'
```

**What it does:**
- Installs Java Development Kit (JDK) 17 (Temurin distribution by Eclipse)
- Gradle (Android build tool) requires Java

**Why it matters:**
- Android builds absolutely require Java
- Temurin is OpenJDK with LTS support

**Timing:** ~20 seconds

**Note:** If you change Java version, must match local development environment

---

### Step 4: Setup Android SDK

```yaml
- name: Setup Android SDK
  uses: android-actions/setup-android@v3
```

**What it does:**
- Installs Android SDK (Software Development Kit)
- Installs build tools, platform tools, and emulator images
- Sets up environment variables (ANDROID_HOME, etc.)

**Why it matters:**
- Required for Gradle to build Android apps
- Includes: compilers, debuggers, emulators, platform libraries

**Timing:** ~2-3 minutes

---

### Step 5: Install Dependencies

```yaml
- name: Install dependencies
  run: npm install
  working-directory: apps/mobile
```

**What it does:**
- Runs `npm install` in `apps/mobile` directory
- Installs all Node.js dependencies from `package.json`
- Creates `node_modules/` with all dependencies
- Installs Fastlane via npm

**Dependencies installed:**
- `expo` (~53.0.0) - Expo framework
- `react-native` (0.79.0) - React Native framework
- `react` (19.0.0) - React library
- Various native modules (safe-area-context, screens, webview, etc.)
- `fastlane` (^0.0.9) - Build automation tool

**Timing:** ~30-60 seconds (with cache) or ~2-3 minutes (first time)

---

### Step 6: Set Dynamic Version Code ⭐ (THE KEY STEP)

```yaml
- name: Set dynamic version code
  working-directory: apps/mobile
  run: |
    # Different version code ranges for internal (dev) vs production
    # Internal: 1000-1999, Production: 2000-2999
    if [ "${{ github.event_name }}" = "pull_request" ]; then
      VERSION_CODE=$((1000 + ${{ github.run_number }}))
      echo "Building for INTERNAL track (dev) with versionCode: $VERSION_CODE"
    else
      VERSION_CODE=$((2000 + ${{ github.run_number }}))
      echo "Building for PRODUCTION track with versionCode: $VERSION_CODE"
    fi

    echo "VERSION_CODE=$VERSION_CODE" >> $GITHUB_ENV

    # Update app.json with the new versionCode
    node << 'EOF'
      const fs = require('fs');
      const versionCode = parseInt(process.env.VERSION_CODE);
      const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
      appJson.expo.android.versionCode = versionCode;
      fs.writeFileSync('app.json', JSON.stringify(appJson, null, 2) + '\n');
      console.log(`Updated versionCode to: ${versionCode}`);
      console.log('Updated app.json:', JSON.stringify(appJson.expo.android, null, 2));
    EOF
```

**What it does:**

1. **Detects event type:**
   - `github.event_name` = "pull_request" (PR) or "push" (main branch)

2. **Calculates version code:**
   ```bash
   VERSION_CODE = 1000 + github.run_number    # For PR
   VERSION_CODE = 2000 + github.run_number    # For main push
   ```

3. **Exports to environment:**
   - `echo "VERSION_CODE=$VERSION_CODE" >> $GITHUB_ENV`
   - Makes variable available to all following steps

4. **Updates app.json:**
   - Reads `app.json`
   - Sets `expo.android.versionCode = VERSION_CODE`
   - Writes back to file

**Why this is critical:**
- **Without this:** Gradle would use hardcoded `versionCode 1`
- **With this:** Gradle reads `VERSION_CODE` environment variable
- **Result:** Each build gets unique version code

**Example output in logs:**
```
Building for INTERNAL track (dev) with versionCode: 1042
Updated versionCode to: 1042
Updated app.json: {
  "android": {
    "package": "com.tasktrasker.mobile",
    "versionCode": 1042,
    ...
  }
}
```

**Timing:** ~2 seconds

---

### Step 7: Decode Keystore

```yaml
- name: Decode keystore
  run: |
    echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > apps/mobile/android/tasktrasker.keystore
```

**What it does:**
- Takes base64-encoded keystore from GitHub Secrets
- Decodes it and writes to `android/tasktrasker.keystore`
- This keystore is the **digital signing certificate** for the app

**What is a keystore?**
- Binary file containing cryptographic keys
- Used to digitally sign the APK/AAB
- Proves that you (the legitimate developer) created this build
- Cannot be recovered if lost - keep backup!

**Security:**
- Keystore stored as base64 in GitHub Secrets (encrypted)
- Only exposed during build
- Deleted from runner after build

**Timing:** ~1 second

---

### Step 8: Build APK/AAB

```yaml
- name: Build APK/AAB
  working-directory: apps/mobile
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: tasktrasker
    KEY_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
  run: |
    cd android
    ./gradlew bundleRelease assembleRelease
```

**What it does:**
1. Changes to `apps/mobile/android` directory
2. Runs Gradle commands:
   - `bundleRelease` - Builds AAB (Android App Bundle)
   - `assembleRelease` - Builds APK (Android Package)

**Environment variables passed:**
- `KEYSTORE_PASSWORD` - Password to keystore
- `KEY_ALIAS` - Name of key in keystore
- `KEY_PASSWORD` - Password for specific key

**Gradle process:**
1. Reads `build.gradle` (includes `versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1`)
2. Reads `VERSION_CODE` from environment (1042)
3. Compiles Kotlin/Java code to bytecode
4. Minifies code (Proguard/R8)
5. Bundles with assets and resources
6. Signs with keystore certificate
7. Produces two outputs:
   - APK: `app/build/outputs/apk/release/app-release.apk` (~50MB)
   - AAB: `app/build/outputs/bundle/release/app-release.aab` (~40MB)

**APK vs AAB:**
| Aspect | APK | AAB |
|--------|-----|-----|
| Size | Larger (~50MB) | Smaller (~40MB) |
| Installation | Direct install | Google Play generates APK for device |
| Distribution | Can distribute anywhere | Play Store only |
| Use | Testing, manual distribution | Production releases |
| Google Play | Deprecated for production | Required for Play Store |

**Output verified by logs:**
```
BUILD SUCCESSFUL in 14s
227 actionable tasks: 16 executed, 211 up-to-date
Found AAB file: /home/runner/work/TaskTrasker/TaskTrasker/apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

**Timing:** ~14-15 seconds (subsequent builds cached)

**This is where the version code is embedded!**
- The AAB/APK now has `versionCode=1042` burned into it
- Can't be changed after build

---

### Step 9: Package APK for Artifacts

```yaml
- name: Package APK for manual deployment
  working-directory: apps/mobile
  run: |
    mkdir -p apk-release
    cp android/app/build/outputs/apk/release/*.apk apk-release/
    cd apk-release
    zip -r ../tasktrasker-apk-${{ github.sha }}.zip .
    cd ..
    ls -lh tasktrasker-apk-*.zip

- name: Upload APK artifact
  uses: actions/upload-artifact@v4
  with:
    name: tasktrasker-apk-release
    path: apps/mobile/tasktrasker-apk-${{ github.sha }}.zip
    if-no-files-found: warn
```

**What it does:**
- Creates artifact ZIP file with APK
- Uploads to GitHub Actions artifacts (available for download)
- Allows manual testing/distribution if needed

**File naming:**
- `tasktrasker-apk-{git-sha}.zip`
- SHA is unique per commit for traceability

**Timing:** ~2 seconds

---

### Step 10: Setup Ruby & Fastlane

```yaml
- name: Setup Ruby
  uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.2'
    bundler-cache: true
    working-directory: apps/mobile
```

**What it does:**
- Installs Ruby 3.2 (Fastlane is written in Ruby)
- Sets up Bundler (Ruby dependency manager)
- Installs gems from `Gemfile` (if exists) or via `bundle install`

**Why Fastlane?**
- Automates Play Store uploads
- Handles authentication, API calls, retries
- Much simpler than manual `curl` requests to Play Store API

**Timing:** ~30-60 seconds

---

### Step 11: Submit to Google Play Store ⭐ (THE UPLOAD STEP)

```yaml
- name: Submit to Google Play Store
  working-directory: apps/mobile
  env:
    GOOGLE_PLAY_KEY_FILE: google-play-service-account.json
    KEYSTORE_PATH: android/tasktrasker.keystore
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: tasktrasker
    KEY_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    FASTLANE_TRACK: ${{ github.event_name == 'pull_request' && 'internal' || 'production' }}
  run: |
    echo '${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}' > google-play-service-account.json
    bundle exec fastlane android deploy
    rm google-play-service-account.json
```

**What it does:**

1. **Set environment variables:**
   - `GOOGLE_PLAY_KEY_FILE` - Service account JSON file name
   - `FASTLANE_TRACK` - internal (PR) or production (main)
   - Keystore password and other signing details

2. **Write service account credentials:**
   - `secrets.GOOGLE_PLAY_SERVICE_ACCOUNT` (JSON) → written to file
   - This gives Fastlane permission to upload

3. **Run Fastlane:**
   - `bundle exec fastlane android deploy`
   - Fastlane reads `apps/mobile/fastlane/Fastfile`
   - Executes the `android deploy` lane

4. **Clean up:**
   - Deletes the credentials file
   - Prevents credentials from being logged

**Fastlane Execution (from Fastfile):**

```ruby
lane :deploy do |options|
  track = ENV["FASTLANE_TRACK"] || "internal"

  # Step 1: Build (already done, but Fastlane can verify)
  build_android_app(
    task: "bundleRelease",
    project_dir: "android/",
    gradle_path: "gradlew"
  )

  # Step 2: Upload to Play Store
  upload_to_play_store(
    package_name: "com.tasktrasker.mobile",    # App package ID
    track: track,                              # "internal" or "production"
    release_status: "draft",                   # Draft (not live yet)
    aab: "android/app/build/outputs/bundle/release/app-release.aab",
    skip_upload_apk: true,                     # Only upload AAB
    json_key: ENV["GOOGLE_PLAY_KEY_FILE"],     # Service account
    skip_upload_metadata: true,                # Don't update description
    skip_upload_images: true,                  # Don't update screenshots
    skip_upload_screenshots: true
  )

  UI.success("🎉 Successfully uploaded to Play Store (#{track})")
end
```

**What Fastlane does:**
1. Reads AAB from build output
2. Connects to Google Play Developer API
3. Authenticates with service account JSON
4. Uploads AAB with versionCode=1042
5. Places in track (internal or production)
6. Creates draft release (doesn't go live)

**On Success:**
```
[22:05:12]: 🎉 Successfully uploaded to Play Store (internal)
```

**On Failure (Version Code Already Used):**
```
[22:05:12]: Google Api Error: Invalid request - Version code 1 has already been used.
```

**Timing:** ~37-40 seconds

---

## Key Technologies

### GitHub Actions
- **What it is:** GitHub's built-in CI/CD system
- **What it does:** Runs workflows triggered by git events
- **Runs on:** Ubuntu Linux runners (GitHub-hosted)
- **Cost:** 2000 free minutes/month, then $0.008/minute
- **Configuration:** `.github/workflows/*.yml` files
- **Useful for:** Tests, builds, deployments, notifications

**Why we use it:**
- Free for open source/small teams
- Native GitHub integration (no third-party services)
- Good documentation and community

### Gradle
- **What it is:** Build automation tool for Android
- **What it does:** Compiles code, manages dependencies, builds APK/AAB
- **Language:** Groovy (Java-like)
- **Configuration:** `build.gradle` files
- **Executable:** `gradlew` (Gradle wrapper - ensures consistent version)

**Key concepts:**
- **Tasks:** Build operations (bundleRelease, assembleRelease)
- **Variants:** Build configurations (debug, release)
- **Dependencies:** External libraries and modules
- **Plugins:** Extensions (React Native plugin, etc.)

**In our build:**
- Reads `VERSION_CODE` from environment
- Compiles Expo/React Native code
- Bundles JS/assets with native code
- Signs with keystore
- Produces APK/AAB

### Fastlane
- **What it is:** Build automation tool for mobile apps
- **What it does:** Automates repetitive tasks (building, signing, uploading)
- **Language:** Ruby
- **Configuration:** `fastlane/Fastfile`
- **Main tool for:** Play Store uploads, beta distribution, testing

**Why we use it:**
- Simplifies Google Play API interactions
- Handles authentication and retries
- Standard tool in mobile development
- Great documentation

**In our deployment:**
- Reads AAB from Gradle output
- Authenticates with service account
- Uploads to Google Play API
- Handles error cases

### Expo
- **What it is:** Development platform for React Native apps
- **What it does:** Simplifies React Native development
- **Configuration:** `app.json`, `eas.json`
- **Used for:** Project metadata, build settings, assets

**In our project:**
- `app.json`: App name, version, package name, projectId, plugins
- `eas.json`: EAS Build settings (we're not using EAS, just native Gradle)

### Google Play Developer API
- **What it is:** REST API for managing Play Store apps
- **What it does:** Upload builds, manage releases, track analytics
- **Authentication:** Service account JSON (OAuth 2.0)
- **Rate limits:** 10,000 requests/hour
- **Used by:** Fastlane, custom scripts, CD/CD pipelines

---

## Configuration Files Deep Dive

### `package.json` (apps/mobile/)

```json
{
  "name": "tasktrasker-mobile",
  "version": "0.1.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "expo": "~53.0.0",
    "expo-constants": "~17.1.0",
    "expo-linking": "~7.1.0",
    "expo-router": "~5.0.0",
    "expo-status-bar": "~2.2.0",
    "react": "19.0.0",
    "react-native": "0.79.0",
    "react-native-safe-area-context": "5.4.0",
    "react-native-screens": "~4.11.0",
    "react-native-webview": "13.13.5"
  },
  "devDependencies": {
    "@types/react": "~19.0.10",
    "babel-preset-expo": "~13.1.0",
    "fastlane": "^0.0.9",
    "typescript": "~5.8.2"
  }
}
```

**Key fields:**
- `version`: Semantic version (displayed to users)
- `dependencies`: Core libraries needed at runtime
- `devDependencies`: Tools needed for development (Fastlane, TypeScript)

**Important notes:**
- Fastlane is listed as dev dependency (only needed during build)
- Expo and React Native versions must match local environment
- Using loose versions (`~`, `^`) to allow patches/minor updates

---

### `app.json` (apps/mobile/)

```json
{
  "expo": {
    "name": "TaskTrasker",
    "slug": "tasktrasker",
    "scheme": "tasktrasker",
    "version": "0.1.1",
    "projectId": "a51bafec-ecc2-4a14-b18b-afbe1974e973",
    "orientation": "portrait",
    "userInterfaceStyle": "automatic",
    "assetBundlePatterns": ["**/*"],
    "android": {
      "package": "com.tasktrasker.mobile",
      "versionCode": 1042,
      "adaptiveIcon": {
        "backgroundColor": "#0f172a"
      }
    },
    "ios": {
      "bundleIdentifier": "com.tasktrasker.mobile",
      "supportsTablet": true
    },
    "plugins": ["expo-router"],
    "extra": {
      "webAppUrl": "https://tasktasker.com",
      "router": {}
    },
    "owner": "task-trasker"
  }
}
```

**Critical fields:**
- `version`: Semantic version (matches package.json)
- `projectId`: EAS project ID (UUID format)
- `android.package`: Unique package identifier for Play Store (globally unique)
- `android.versionCode`: **Updated dynamically by workflow** (must be unique per build)

**Dynamic updates:**
- Workflow replaces `versionCode` value before Gradle build
- Gradle reads environment variable, but app.json also has it for reference

---

### `build.gradle` (apps/mobile/android/app/)

```gradle
apply plugin: "com.android.application"
apply plugin: "org.jetbrains.kotlin.android"
apply plugin: "com.facebook.react"

def projectRoot = rootDir.getAbsoluteFile().getParentFile().getAbsolutePath()

react {
    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", projectRoot, "android", "absolute"].execute(null, rootDir).text.trim())
    // ... more React Native config
}

def enableProguardInReleaseBuilds = (findProperty('android.enableProguardInReleaseBuilds') ?: false).toBoolean()

android {
    ndkVersion rootProject.ext.ndkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.tasktrasker.mobile'
    defaultConfig {
        applicationId 'com.tasktrasker.mobile'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
        versionName "0.1.1"
    }

    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH") ?: "android/tasktrasker.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableProguardInReleaseBuilds
        }
    }

    flavorDimensions "version"
    productFlavors {
        internal {
            dimension "version"
        }
    }
}
```

**Critical line:**
```gradle
versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
```

**What this means:**
- `System.getenv("VERSION_CODE")` - Read environment variable
- `?.toInteger()` - Convert to integer (safe null coalescing)
- `: 1` - Default to 1 if not set
- **Result:** Uses VERSION_CODE from workflow, or defaults to 1

**Without this line:**
- Would be `versionCode 1` (hardcoded)
- Every build has same versionCode
- Play Store rejects duplicates

**Signing configuration:**
- Reads keystore path, password, alias from environment
- Applied to `release` buildType
- Signs APK/AAB with developer certificate

---

### `eas.json` (apps/mobile/)

```json
{
  "cli": {
    "version": ">= 10.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EAS_BUILD_NO_EXPO_GO_WARNING": "true"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EAS_BUILD_NO_EXPO_GO_WARNING": "true"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "EAS_BUILD_NO_EXPO_GO_WARNING": "true"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "production"
      }
    },
    "internal": {
      "android": {
        "track": "internal"
      }
    }
  }
}
```

**Purpose:**
- Configures Expo Application Services (EAS)
- We're **not using EAS Build** (using native Gradle instead)
- This file mostly ignored in our setup
- We use native Gradle for more control and speed

**Key settings:**
- `appVersionSource: "remote"` - Use version from app.json (don't ask user)
- `EAS_BUILD_NO_EXPO_GO_WARNING` - Suppress Expo Go warning (development warning)

---

### `Fastfile` (apps/mobile/fastlane/)

```ruby
default_platform(:android)

platform :android do
  desc "Build and submit to Google Play Store"
  lane :deploy do |options|
    track = options[:track] || ENV["FASTLANE_TRACK"] || "internal"

    build_android_app(
      task: "bundleRelease",
      project_dir: "android/",
      gradle_path: "gradlew"
    )

    aab_file = lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH]

    unless aab_file && File.exist?(aab_file)
      UI.error("AAB file not found")
      exit(1)
    end

    upload_to_play_store(
      package_name: "com.tasktrasker.mobile",
      track: track,
      release_status: "draft",
      aab: "android/app/build/outputs/bundle/release/app-release.aab",
      skip_upload_apk: true,
      json_key: ENV["GOOGLE_PLAY_KEY_FILE"],
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )

    UI.success("🎉 Successfully uploaded to Play Store (#{track})")
  end

  desc "Build release APK"
  lane :build_apk do
    build_android_app(
      task: "assembleRelease",
      project_dir: "android/",
      gradle_path: "gradlew",
      properties: {
        "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["KEY_PASSWORD"]
      }
    )
  end

  desc "Build release AAB (bundle)"
  lane :build_aab do
    build_android_app(
      task: "bundleRelease",
      project_dir: "android/",
      gradle_path: "gradlew",
      properties: {
        "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
        "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
        "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
        "android.injected.signing.key.password" => ENV["KEY_PASSWORD"]
      }
    )
  end
end
```

**Key components:**
- `lane :deploy` - Main deployment lane (called by workflow)
- `build_android_app()` - Fastlane wrapper around Gradle
- `upload_to_play_store()` - Google Play API call
- `track` - "internal" or "production" (from environment)

**Upload parameters:**
- `package_name` - App's unique identifier
- `track` - Which release track
- `release_status: "draft"` - Doesn't go live immediately
- `skip_upload_apk: true` - Only upload AAB (newer format)
- `skip_upload_metadata/images/screenshots` - Don't update store listing

---

### `.github/workflows/play-store-deploy.yml`

See "Detailed Workflow Steps" section above for line-by-line explanation.

---

## Google Play Console Setup

### What is Google Play Console?

Web interface for managing Android app releases. Where you:
- Upload builds (APK/AAB)
- Manage release tracks
- View analytics
- Set app store listing
- Manage testers

### Release Tracks Explained

Google Play has different **tracks** for different audiences:

| Track | Audience | Purpose | Testing | Live |
|-------|----------|---------|---------|------|
| **internal** | Internal team only | QA testing | Yes | No |
| **alpha** | Testers (few hundred) | Early testing | Yes | No |
| **beta** | Testers (larger group) | Beta testing | Yes | No |
| **production** | All users | Public release | Yes | Yes |

**Our setup uses:**
- `internal` - For PR testing (not released to users)
- `production` - For main branch (actual user release)

### Service Account Setup

**What it is:**
- Special Google account for automation (not a person)
- Has credentials (JSON file) instead of password
- Grants Fastlane permission to upload builds

**How it works:**
1. Create in Google Cloud Console
2. Generate JSON key file
3. Add to GitHub Secrets
4. Fastlane reads it to authenticate
5. Uploads builds on your behalf

**Setup steps (one-time):**
1. Google Cloud Console → Service Accounts
2. Create service account (name: "github-play-store-deploy")
3. Generate JSON key
4. Store securely (GitHub Secrets)
5. In Google Play Console → Settings → User permissions
6. Grant service account "Release Manager" role

**Security:**
- JSON key is like a password - keep secret
- Only expose in CI/CD (GitHub Secrets)
- Rotate periodically (generate new key)
- Revoke old keys when rotated

---

## How Each Component Works

### Gradle Build System

**What Gradle does:**

```
Source Code (Kotlin/Java)
        ↓
    Compile → Bytecode
        ↓
    Link Libraries → Dex files
        ↓
    Minify Code → Optimized
        ↓
    Process Resources → XML/images/assets
        ↓
    Package → APK/AAB
        ↓
    Sign → Keystore certificate
        ↓
    Output → Releasable artifact
```

**In our case:**

```yaml
gradlew bundleRelease    # Task: Create AAB
  ↓
Read build.gradle → versionCode = System.getenv("VERSION_CODE")
  ↓
Read app.json → app metadata, plugins
  ↓
Compile React Native JS → Bundled JavaScript
  ↓
Compile Kotlin/Java → Native code
  ↓
Package → Android App Bundle (1042)
  ↓
Sign with keystore → Cryptographic signature
  ↓
Output → app-release.aab (40MB)
```

### Fastlane Upload Process

```
AAB file (app-release.aab)
        ↓
Fastlane reads file
        ↓
Authenticate with Google Play API
  (service account JSON provides credentials)
        ↓
Validate AAB
  - Check versionCode (must be unique)
  - Check packageName (must match app)
  - Check signatures
        ↓
Upload to Google Play
        ↓
Place in track (internal/production)
        ↓
Create release (draft/complete)
        ↓
Response
  - Success: "Uploaded to Play Store"
  - Failure: "Version code 1 already used" (our error)
```

---

## Common Issues & Solutions

### Issue 1: "Version code X has already been used"

**Symptoms:**
- Fastlane upload fails
- Error message mentions version code

**Root cause:**
- Same versionCode uploaded twice
- Gradle using hardcoded value instead of environment variable

**Diagnosis:**
```bash
# Check build.gradle
grep "versionCode" android/app/build.gradle
# Should show: versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
# NOT: versionCode 1

# Check workflow logs
# Look for: "versionCode to: 1042"
```

**Solution:**
1. Ensure `build.gradle` reads from environment variable
2. Check workflow sets `VERSION_CODE` before gradle
3. Use different ranges (1000+ for internal, 2000+ for production)

---

### Issue 2: "Invalid UUID appId"

**Symptoms:**
- Build fails in Expo validation
- Error mentions projectId or appId

**Root cause:**
- `projectId` in wrong location (nested vs top-level)
- Invalid UUID format

**Solution:**
```json
// WRONG - nested
"extra": {
  "eas": {
    "projectId": "..."
  }
}

// RIGHT - top-level
"projectId": "a51bafec-ecc2-4a14-b18b-afbe1974e973",
```

---

### Issue 3: "Couldn't find gradlew"

**Symptoms:**
- Build fails immediately
- Can't find gradle wrapper

**Root cause:**
- Gradle path wrong (doubled path like `android/android/gradlew`)
- Working directory incorrect

**Diagnosis:**
- Check workflow working-directory
- Check `gradle_path` in Fastfile

**Solution:**
- `project_dir: "android/"`
- `gradle_path: "gradlew"` (relative to project_dir)
- Working directory in workflow: `apps/mobile`

---

### Issue 4: "No value found for 'package_name'"

**Symptoms:**
- Fastlane upload fails
- Missing required field

**Root cause:**
- Fastfile missing `package_name` parameter

**Solution:**
```ruby
upload_to_play_store(
  package_name: "com.tasktrasker.mobile",  # ADD THIS
  track: track,
  ...
)
```

---

### Issue 5: "Cannot provide both APK and AAB"

**Symptoms:**
- Upload fails
- Message about both APK and AAB present

**Root cause:**
- Fastlane trying to upload both APK and AAB
- Should only upload AAB (modern format)

**Solution:**
```ruby
upload_to_play_store(
  skip_upload_apk: true,  # ADD THIS
  aab: "...",
  ...
)
```

---

### Issue 6: "Google Api Error: Invalid request - The caller does not have permission"

**Symptoms:**
- Service account can't authenticate
- No permission to upload

**Root cause:**
- Service account not granted permission in Google Play Console
- Service account not linked to app

**Solution:**
1. Google Play Console → Settings → User permissions
2. Add service account email with "Release Manager" role
3. Ensure service account has access to this specific app

---

## Manual Testing & Debugging

### View Workflow Logs

**On GitHub:**
1. Go to Actions tab
2. Click workflow run
3. Click "Submit to Google Play Store" step
4. Expand logs to see detailed output

**Look for:**
```
[22:05:12]: versionCode to: 1042  ← Version code being used
[22:05:12]: Successfully uploaded to Play Store (internal)  ← Success
[22:05:12]: Google Api Error: ... ← Failure details
```

### Check Environment Variables

In workflow logs, you'll see:
```
Building for INTERNAL track (dev) with versionCode: 1042
```

This tells you:
- Track was correctly determined (PR vs main)
- Version code was correctly calculated
- Environment variable was exported

### Verify AAB File

After build completes, check if AAB exists:
```bash
ls -lh android/app/build/outputs/bundle/release/
# Should show: app-release.aab (40MB)
```

If missing:
- Gradle build failed (check earlier logs)
- Output path is wrong
- Storage issue (disk full?)

### Check Version Code in AAB

APK/AAB contain version code - can extract and verify:
```bash
# Install aapt tool (Android SDK)
aapt dump badging app-release.aab | grep versionCode
# Output: package: name='com.tasktrasker.mobile' versionCode='1042'
```

### Manual Gradle Build (Local)

Test locally before pushing:
```bash
cd apps/mobile/android
export VERSION_CODE=1042
./gradlew bundleRelease
```

Check output:
```
BUILD SUCCESSFUL in 14s
Found AAB file: android/app/build/outputs/bundle/release/app-release.aab
```

---

## Security Considerations

### Keystore Security

**Private key storage:**
- Keystore file is sensitive (cryptographic key)
- If compromised, attacker can sign as you
- Can't be recovered if lost

**Best practices:**
1. Keep local keystore backup in secure location
2. Use strong keystore password
3. Never commit to git
4. Use GitHub Secrets for CI/CD

**In our setup:**
- Keystore stored in GitHub Secrets (encrypted by GitHub)
- Only exposed during build
- Deleted after build completes
- Never committed to repo

### Service Account Security

**JSON key is like a password:**
- Grants full access to upload builds
- Could upload malicious code as you
- Must keep secret

**Best practices:**
1. Store in GitHub Secrets only
2. Never commit to git
3. Rotate keys periodically
4. Revoke old keys after rotation
5. Use least-privilege role (Release Manager, not Owner)
6. Monitor uploads in Google Play Console

**In our setup:**
- Stored in `secrets.GOOGLE_PLAY_SERVICE_ACCOUNT`
- Written to file only during build
- Deleted immediately after Fastlane finishes
- Not exposed in logs

### GitHub Secrets

**What they are:**
- Encrypted variables in GitHub
- Only exposed to workflow at runtime
- Can't be viewed after creation (even by you!)

**Our secrets:**
- `KEYSTORE_BASE64` - Android signing certificate
- `KEYSTORE_PASSWORD` - Keystore password
- `GOOGLE_PLAY_SERVICE_ACCOUNT` - Play Store API credentials

**Access control:**
- Only available to workflows on main/PR branches
- Not available to forks (unless explicitly enabled)
- Only exposed if used in `run:` script

---

## References

### Official Documentation

- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Gradle Documentation](https://docs.gradle.org/)
- [Fastlane Documentation](https://docs.fastlane.tools/)
- [Expo Documentation](https://docs.expo.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Android Version Code Documentation](https://developer.android.com/studio/publish/versioning)

### Key Concepts

- **Version Code:** https://developer.android.com/studio/publish/versioning
- **Android App Bundle:** https://developer.android.com/guide/app-bundle
- **Google Play API:** https://developers.google.com/play/developer/api
- **Service Accounts:** https://cloud.google.com/docs/authentication/service-accounts
- **GitHub Secrets:** https://docs.github.com/en/actions/security-guides/encrypted-secrets

### Tools

- **Fastlane Supply Plugin:** https://docs.fastlane.tools/actions/supply/
- **Gradle Wrapper:** https://gradle.org/gradle-wrapper/
- **Android Build System:** https://developer.android.com/build

---

## Summary

### The Problem (Before Fix)

Version code was **hardcoded in build.gradle**:
```gradle
versionCode 1  // Hardcoded - can't change!
```

Workflow tried to set it dynamically, but Gradle ignored the environment variable:
```
Workflow: "VERSION_CODE=1042"
Gradle: "Ignore, use hardcoded 1"
Result: Always upload versionCode 1 → Error!
```

### The Solution (After Fix)

Changed build.gradle to **read from environment**:
```gradle
versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
```

Now workflow → Gradle → Play Store works correctly:
```
Workflow: "VERSION_CODE=1042, VERSION_CODE=1043, ..."
Gradle: "Read env var, use 1042, 1043, ..."
Result: Each build unique → Success!
```

### How It Works Now

1. **Trigger:** PR/push to main
2. **Calculate:** VERSION_CODE = 1000+run# (PR) or 2000+run# (main)
3. **Prepare:** Update app.json, decode keystore, set env var
4. **Build:** Gradle reads env var, builds APK/AAB with unique version
5. **Upload:** Fastlane uploads to Play Store with unique version code
6. **Success:** Draft release created, waiting for manual promotion

Each build gets unique version code, Play Store accepts upload, app distributed to testers/users.

