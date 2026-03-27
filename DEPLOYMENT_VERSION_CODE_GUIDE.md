# Play Store Deployment & Version Code Flow

## The Error We Fixed

### Error Message
```
Google Api Error: Invalid request - Version code 1 has already been used.
```

### What It Means
Google Play Store requires each build uploaded to have a **unique and incrementing** `versionCode`. You cannot upload the same `versionCode` twice to the same app, even if the code is different.

**Root Cause:** The Android build was always using `versionCode: 1`, so every deployment attempt failed because we kept trying to upload the same version code that was already used.

---

## How Version Codes Work

### Two Different Version Numbers

TaskTrasker uses **two separate version systems**:

#### 1. **Semantic Version** (User-facing)
- Used in `package.json` and `app.json`
- Example: `0.1.1`
- Displayed to users as "App Version"
- Can repeat across different tracks (internal vs production)

#### 2. **Version Code** (Android internal)
- Numeric only (no dots)
- Must be **unique and strictly incrementing**
- Google Play requirement
- Different across builds

### Why Two Systems?

- **Semantic Version:** Tells users what version they have (0.1.1 = "version 0, patch 1")
- **Version Code:** Tells Google Play this is a new build (1001 = first internal test, 2001 = first production)

Example:
```
Build 1 (PR to main):     versionCode=1001, versionName=0.1.1
Build 2 (PR to main):     versionCode=1002, versionName=0.1.1  ✓ Different versionCode
Build 3 (Push to main):   versionCode=2001, versionName=0.1.1  ✓ Different track range
```

---

## Full Deployment Flow

### 1. **Trigger** (GitHub Actions)
Deployment is triggered by:
- **PR to main** → Uploads to `internal` track (for testing)
- **Push to main** → Uploads to `production` track (for users)

```
Event: Pull Request to main
     ↓
Workflow: play-store-deploy.yml starts
```

### 2. **Set Version Code** (Dynamic calculation)
**File:** `.github/workflows/play-store-deploy.yml`

**Step:** "Set dynamic version code"

```bash
if PR: VERSION_CODE = 1000 + github.run_number
if PUSH: VERSION_CODE = 2000 + github.run_number
```

**Example:**
- Run #42 on PR → `VERSION_CODE = 1042`
- Run #42 on main push → `VERSION_CODE = 2042`

**Why split ranges?**
- `1000-1999`: Internal track (testing, never released to users)
- `2000-2999`: Production track (released to users)
- Ensures they never conflict

### 3. **Update Configuration Files**
**File:** `apps/mobile/app.json` (updated by workflow)

The workflow adds the versionCode:
```json
{
  "expo": {
    "android": {
      "versionCode": 1042
    }
  }
}
```

### 4. **Build Android App**
**File:** `.github/workflows/play-store-deploy.yml` + `apps/mobile/android/app/build.gradle`

**Key Files:**
- `build.gradle`: Reads `VERSION_CODE` environment variable
  ```gradle
  versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
  ```

**Process:**
1. Workflow sets `VERSION_CODE=1042` environment variable
2. Gradle build starts
3. `build.gradle` reads the environment variable
4. APK/AAB is built with `versionCode=1042`

**Output:**
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB (Bundle): `android/app/build/outputs/bundle/release/app-release.aab`

### 5. **Upload to Play Store**
**File:** `apps/mobile/fastlane/Fastfile` + Ruby gem `fastlane`

**Process:**
```ruby
upload_to_play_store(
  package_name: "com.tasktrasker.mobile",
  track: track,           # "internal" or "production"
  release_status: "draft",
  aab: "android/app/build/outputs/bundle/release/app-release.aab",
  json_key: ENV["GOOGLE_PLAY_KEY_FILE"]
)
```

**What happens:**
1. Fastlane reads the service account credentials from JSON file
2. Connects to Google Play Developer API
3. Uploads AAB with unique versionCode (1042)
4. Places it in the specified track as a draft release

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│  GitHub Event                                           │
│  (PR to main / Push to main)                            │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  play-store-deploy.yml Workflow                         │
├─────────────────────────────────────────────────────────┤
│ 1. Install Dependencies (npm install)                   │
│ 2. Set Version Code                                     │
│    - Calculate: 1000+run_num (PR) or 2000+run_num (main)
│    - Export: VERSION_CODE env var                       │
│    - Update: app.json with versionCode                  │
│ 3. Decode Keystore (for signing)                        │
│ 4. Build Android App                                    │
│    - Run: ./gradlew bundleRelease assembleRelease       │
│    - Input: VERSION_CODE env var                        │
│    - Output: APK + AAB files                            │
│ 5. Setup Ruby + Fastlane                                │
│ 6. Upload to Play Store                                 │
│    - Tool: fastlane (Ruby)                              │
│    - Input: AAB + service account credentials           │
│    - Output: Draft release on Play Store                │
└─────────────────────────────────────────────────────────┘
```

---

## Key Configuration Files & Their Roles

### `app.json` (Expo configuration)
```json
{
  "expo": {
    "version": "0.1.1",                    // Semantic version
    "projectId": "a51bafec-...",          // EAS project ID
    "android": {
      "package": "com.tasktrasker.mobile", // Package name for Play Store
      "versionCode": 1042                  // Updated dynamically by workflow
    }
  }
}
```

### `build.gradle` (Android build)
```gradle
android {
  defaultConfig {
    versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
    versionName "0.1.1"
  }
}
```
**Critical:** Reads from `VERSION_CODE` environment variable, not hardcoded.

### `eas.json` (Expo build service)
```json
{
  "cli": {
    "appVersionSource": "remote"           // Use semantic version from app.json
  },
  "build": {
    "production": {
      "env": {
        "EAS_BUILD_NO_EXPO_GO_WARNING": "true"
      }
    }
  }
}
```

### `.github/workflows/play-store-deploy.yml` (CI/CD)
```yaml
- name: Set dynamic version code
  run: |
    if [ "${{ github.event_name }}" = "pull_request" ]; then
      VERSION_CODE=$((1000 + ${{ github.run_number }}))
    else
      VERSION_CODE=$((2000 + ${{ github.run_number }}))
    fi
    echo "VERSION_CODE=$VERSION_CODE" >> $GITHUB_ENV
```

### `Fastfile` (Fastlane automation)
```ruby
upload_to_play_store(
  package_name: "com.tasktrasker.mobile",
  track: track,
  aab: "android/app/build/outputs/bundle/release/app-release.aab",
  json_key: ENV["GOOGLE_PLAY_KEY_FILE"]
)
```

---

## Troubleshooting: How to Identify Version Code Issues

### Issue: "Version code X has already been used"

**Diagnosis:**
1. Check the error message for which versionCode failed
2. Verify `build.gradle` is reading from `VERSION_CODE` env var
3. Check workflow logs for "VERSION_CODE=" output
4. Confirm the environment variable is being passed to gradle

**Example debugging:**
```bash
# Check if VERSION_CODE is set in workflow
echo "VERSION_CODE=$VERSION_CODE"  # Should print something like 1042

# Check build.gradle reads it
grep "versionCode" android/app/build.gradle
# Should show: versionCode System.getenv("VERSION_CODE")?.toInteger() ?: 1
```

### Issue: "Invalid UUID appId"

**Diagnosis:**
1. Check `projectId` is at top level of app.json (not nested)
2. Verify projectId is valid UUID format: `a51bafec-ecc2-4a14-b18b-afbe1974e973`

### Issue: "Couldn't find gradlew"

**Diagnosis:**
1. Check `gradle_path` in Fastfile is relative to `project_dir`
2. Verify paths don't double up: ✗ `android/android/gradlew`, ✓ `android/gradlew`

### Issue: "No value found for 'package_name'"

**Diagnosis:**
1. Verify Fastfile has `package_name: "com.tasktrasker.mobile"`
2. Check it's not commented out or removed

---

## Version Code Ranges Reference

| Track | Range | Example | Use Case |
|-------|-------|---------|----------|
| internal | 1000-1999 | 1001, 1042 | Pull requests (testing) |
| production | 2000-2999 | 2001, 2042 | Main branch (user release) |

Each branch can safely upload to its own range without conflicting with the other.

---

## Summary

The **version code error** occurred because:

1. ❌ **Old Setup:** `versionCode` was hardcoded to `1` in `build.gradle`
2. ❌ **Workflow:** Tried to set version dynamically, but gradle ignored it
3. ❌ **Result:** Every build uploaded with versionCode=1 → "already used" error

The **fix** involved:

1. ✅ Making `build.gradle` read from `VERSION_CODE` environment variable
2. ✅ Ensuring workflow passes dynamic version code (1000+, 2000+)
3. ✅ Using separate ranges for internal vs production to avoid conflicts

**Now:** Each deployment gets a unique versionCode, and Play Store accepts the upload.
