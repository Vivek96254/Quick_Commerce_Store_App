# QuickMart Mobile App - Production Deployment Guide

Complete guide for deploying the QuickMart mobile app to App Store (iOS) and Google Play (Android).

## 📋 Prerequisites

1. **Expo Account**
   - Sign up at [expo.dev](https://expo.dev)
   - Install EAS CLI: `npm install -g eas-cli`

2. **Apple Developer Account** (for iOS)
   - Annual fee: $99/year
   - Sign up at [developer.apple.com](https://developer.apple.com/programs/)

3. **Google Play Developer Account** (for Android)
   - One-time fee: $25
   - Sign up at [play.google.com/console](https://play.google.com/console)

4. **App Assets**
   - App icon (1024x1024 PNG)
   - Splash screen (recommended: 2048x2048)
   - Android adaptive icon (foreground + background)
   - iOS screenshots (various sizes)
   - Android screenshots (various sizes)

## 🚀 Step-by-Step Deployment

### Step 1: Configure EAS

1. **Login to Expo:**
```bash
cd apps/mobile
eas login
```

2. **Link your project:**
```bash
eas build:configure
```

This will:
- Create an EAS project (if not exists)
- Update `app.json` with your project ID
- Create `eas.json` configuration file

3. **Update `app.json`:**
   - Set your app name, version, and bundle identifiers
   - Update `extra.eas.projectId` (auto-filled by EAS)

### Step 2: Configure App Information

Update `apps/mobile/app.json`:

```json
{
  "expo": {
    "name": "QuickMart",
    "slug": "quickmart",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.quickmart",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.quickmart",
      "versionCode": 1
    }
  }
}
```

**Important:**
- `bundleIdentifier` (iOS) and `package` (Android) must be unique
- Use reverse domain notation: `com.yourcompany.appname`
- These cannot be changed after first submission

### Step 3: Set Production API URL

The `eas.json` file already includes the production API URL:
```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://quickmart-api-v065.onrender.com"
}
```

To use a different API URL, update `eas.json` or set it during build:
```bash
EXPO_PUBLIC_API_URL=https://your-api-url.com eas build --platform android --profile production
```

### Step 4: Build for iOS

#### 4.1 First-Time Setup

1. **Configure Apple Developer credentials:**
```bash
eas credentials
```

Select:
- Platform: `iOS`
- Action: `Set up credentials`
- Choose: `Let EAS handle credentials` (recommended)

2. **Build iOS app:**
```bash
eas build --platform ios --profile production
```

This will:
- Create an `.ipa` file
- Upload to EAS servers
- Build takes ~15-20 minutes

3. **Download build:**
```bash
eas build:list
eas build:download [BUILD_ID]
```

#### 4.2 Submit to App Store

**Option A: Automatic Submission (Recommended)**
```bash
eas submit --platform ios
```

**Option B: Manual Submission**
1. Download the `.ipa` file
2. Use **Transporter** app (macOS) or **Xcode**
3. Upload to App Store Connect

**App Store Connect Setup:**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Create new app:
   - Name: QuickMart
   - Primary Language: English
   - Bundle ID: (match your `bundleIdentifier`)
   - SKU: unique identifier
3. Fill in app information:
   - Description
   - Keywords
   - Screenshots
   - App icon
   - Privacy policy URL
4. Submit for review

### Step 5: Build for Android

#### 5.1 First-Time Setup

1. **Configure Android credentials:**
```bash
eas credentials
```

Select:
- Platform: `Android`
- Action: `Set up credentials`
- Choose: `Let EAS handle credentials` (recommended)

EAS will create a keystore automatically.

2. **Build Android app:**
```bash
eas build --platform android --profile production
```

This creates an `.aab` (Android App Bundle) file.

#### 5.2 Submit to Google Play

**Option A: Automatic Submission (Recommended)**

1. **Create Google Play Service Account:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a service account
   - Download JSON key file
   - Grant "Release Manager" role in Google Play Console

2. **Update `eas.json`:**
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"  // or "alpha", "beta", "production"
      }
    }
  }
}
```

3. **Submit:**
```bash
eas submit --platform android
```

**Option B: Manual Submission**

1. Download the `.aab` file from EAS
2. Go to [Google Play Console](https://play.google.com/console)
3. Create new app
4. Upload `.aab` file
5. Fill in store listing:
   - App name
   - Short description
   - Full description
   - Screenshots
   - App icon
   - Feature graphic
6. Set content rating
7. Set pricing (Free/Paid)
8. Submit for review

### Step 6: Update App Version

For subsequent releases:

1. **Update version in `app.json`:**
```json
{
  "expo": {
    "version": "1.0.1",  // Increment version
    "ios": {
      "buildNumber": "2"  // Increment build number
    },
    "android": {
      "versionCode": 2  // Increment version code
    }
  }
}
```

2. **Build and submit:**
```bash
eas build --platform all --profile production
eas submit --platform all
```

## 🔧 Advanced Configuration

### Environment Variables

Set different API URLs for different build profiles:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.quickmart.com"
      }
    },
    "staging": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging-api.quickmart.com"
      }
    }
  }
}
```

Build with staging:
```bash
eas build --platform android --profile staging
```

### OTA Updates (Over-The-Air)

Update your app without rebuilding:

1. **Publish update:**
```bash
eas update --branch production --message "Bug fixes"
```

2. **Configure update channels in `app.json`:**
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

### Build Profiles

Use different profiles for different purposes:

- **development**: For testing with development client
- **preview**: Internal testing builds (APK/IPA)
- **production**: Store builds (AAB/IPA)

### Local Builds (Advanced)

Build locally instead of on EAS servers:

```bash
eas build --platform android --local
```

Requires:
- Android: Android SDK, Java JDK
- iOS: macOS, Xcode, CocoaPods

## 📱 Testing Before Release

### Internal Testing

1. **Build preview version:**
```bash
eas build --platform all --profile preview
```

2. **Share with testers:**
   - iOS: TestFlight (via App Store Connect)
   - Android: Internal testing track (Google Play Console)

### TestFlight (iOS)

1. Upload build to App Store Connect
2. Add testers in TestFlight section
3. Testers receive email invitation
4. Install via TestFlight app

### Google Play Internal Testing

1. Upload `.aab` to internal testing track
2. Add testers' email addresses
3. Testers receive email with download link

## 🔐 Security Considerations

1. **API Keys**: Never commit API keys to repository
2. **Environment Variables**: Use EAS secrets for sensitive data
3. **Code Signing**: Let EAS manage credentials (recommended)
4. **Keystore**: Backup Android keystore (EAS provides download)

## 📊 Monitoring & Analytics

Consider adding:
- **Expo Analytics**: Built-in analytics
- **Sentry**: Error tracking
- **Firebase Analytics**: User behavior
- **App Store Connect Analytics**: Download metrics

## 🐛 Troubleshooting

### Build Failures

1. **Check build logs:**
```bash
eas build:list
eas build:view [BUILD_ID]
```

2. **Common issues:**
   - Missing assets (icon, splash screen)
   - Invalid bundle identifier
   - Expired certificates
   - API URL not accessible

### Submission Failures

1. **iOS:**
   - Check App Store Connect for errors
   - Verify certificates are valid
   - Ensure app follows App Store guidelines

2. **Android:**
   - Check Google Play Console for errors
   - Verify keystore is correct
   - Ensure app follows Google Play policies

### Certificate Issues

Regenerate credentials:
```bash
eas credentials
```

Select: "Remove credentials" then "Set up credentials"

## 📚 Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Google Play Console](https://play.google.com/console)
- [Expo Updates](https://docs.expo.dev/versions/latest/sdk/updates/)

## ✅ Deployment Checklist

- [ ] EAS account created and logged in
- [ ] `eas.json` configured
- [ ] `app.json` updated with correct bundle IDs
- [ ] Production API URL set in `eas.json`
- [ ] App assets (icon, splash) prepared
- [ ] iOS: Apple Developer account active
- [ ] Android: Google Play Developer account active
- [ ] iOS: App Store Connect app created
- [ ] Android: Google Play Console app created
- [ ] Test builds on physical devices
- [ ] App Store/Play Store listings prepared
- [ ] Privacy policy URL ready
- [ ] Screenshots prepared
- [ ] App description and metadata ready

## 🚀 Quick Commands Reference

```bash
# Login to Expo
eas login

# Configure project
eas build:configure

# Build for production
eas build --platform ios --profile production
eas build --platform android --profile production
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
eas submit --platform all

# View builds
eas build:list

# View build details
eas build:view [BUILD_ID]

# Download build
eas build:download [BUILD_ID]

# Manage credentials
eas credentials

# Publish OTA update
eas update --branch production --message "Update message"
```

---

**Need Help?** Check [Expo Forums](https://forums.expo.dev/) or [Expo Discord](https://chat.expo.dev/)
