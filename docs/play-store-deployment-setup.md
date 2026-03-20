# Google Play Store Automated Deployment Setup

This guide explains how to set up the GitHub Actions secrets needed for automated Play Store deployment via EAS.

## Required Secrets

You need to add 2 secrets to your GitHub repository:

### 1. `EAS_TOKEN`
**What it is:** Authentication token for Expo Application Services (EAS)

**Where to get it:**
1. Go to https://expo.dev
2. Sign in with your account (create one if needed)
3. Go to Account Settings → Personal Account Tokens (or https://expo.dev/settings/access-tokens)
4. Click "Generate Token"
5. Name it something like `GitHub Actions` or `Play Store Deploy`
6. Copy the generated token

**Where to add it:**
1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `EAS_TOKEN`
4. Value: Paste the token you copied
5. Click "Add secret"

---

### 2. `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
**What it is:** A JSON key file that authenticates with your Google Play Store account

**Where to get it:**

#### Step 1: Create a Service Account in Google Cloud
1. Go to https://console.cloud.google.com/
2. Create a new project (or use existing): name it something like `TaskTrasker Play Store`
3. Once in the project, go to **APIs & Services** → **Credentials**
4. Click **+ Create Credentials** → **Service Account**
5. Fill in:
   - Service account name: `github-play-store-deploy`
   - Service account ID: (auto-filled)
   - Description: `GitHub Actions for Play Store deployment`
6. Click **Create and Continue**
7. Skip the optional steps, click **Done**

#### Step 2: Create and Download the JSON Key
1. From the Credentials page, find your new service account in the list
2. Click on it to open its details
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. A JSON file will download automatically - **keep this safe!**

#### Step 3: Grant Play Store Permissions
1. Go to Google Play Console: https://play.google.com/console
2. Select your app (TaskTrasker)
3. Go to **Settings** → **API Access**
4. Click **Create Service Account**
5. Follow the link to Google Cloud Console (if not already done)
6. Go back to Play Console and click **Grant Access** to the service account you created
7. Give it these roles:
   - **Release Manager** (allows submitting releases)
   - **User Accounts Admin** (optional, for managing testers)

#### Step 4: Add the JSON Secret to GitHub
1. Open the JSON file you downloaded with a text editor
2. Copy its entire contents
3. Go to your GitHub repo → Settings → Secrets and variables → Actions
4. Click "New repository secret"
5. Name: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
6. Value: Paste the entire JSON file contents
7. Click "Add secret"

---

## Configuration Checklist

- [ ] Created EAS account at https://expo.dev
- [ ] Generated EAS Token and added as `EAS_TOKEN` secret
- [ ] Created Google Cloud Project
- [ ] Created Service Account in Google Cloud
- [ ] Downloaded JSON key file
- [ ] Granted service account access in Google Play Console with Release Manager role
- [ ] Added `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret to GitHub
- [ ] Updated `eas.json` if needed (should already be configured in submit section)
- [ ] Updated `app.json` with correct Android package name and EAS project ID

## Verify Setup

### Check EAS Configuration
1. In your terminal, run:
   ```bash
   cd apps/mobile
   eas whoami
   ```
   If authenticated correctly, it will show your EAS account.

2. Check your `eas.json` has the submit configuration:
   ```json
   {
     "submit": {
       "production": {
         "android": {
           "track": "production"
         }
       }
     }
   }
   ```

### Check app.json
Make sure your `app.json` has:
```json
{
  "expo": {
    "android": {
      "package": "com.tasktrasker.mobile"
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

If `projectId` is missing or says `REPLACE_WITH_EAS_PROJECT_ID`:
1. Run: `cd apps/mobile && eas init`
2. This will create/link your EAS project

---

## Deployment Flow

Once everything is set up:

1. Push to `main` branch
2. GitHub Actions automatically:
   - Builds your APK/AAB with EAS
   - Submits it to Google Play Store
   - Tracks progress in the action logs

You can also manually trigger the deploy:
- Go to Actions tab → Play Store Deploy → Run workflow

---

## Troubleshooting

**Error: "EAS_TOKEN invalid"**
- Verify the token in GitHub Secrets is correct
- Token may have expired - generate a new one

**Error: "Service account not authorized"**
- Go to Google Play Console and re-verify Release Manager role is granted
- May take a few minutes to propagate

**Error: "Could not find APK/AAB"**
- Ensure `eas.json` production build config is correct
- Run `eas build` locally first to test

**Build takes too long or times out**
- EAS builds can take 10-15 minutes
- Increase timeout in workflow if needed (currently 30 minutes)

