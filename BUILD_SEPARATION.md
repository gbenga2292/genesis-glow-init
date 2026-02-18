# Build Separation Guide: Android vs Electron

This document explains how to build the Android APK and Electron desktop app separately without conflicts.

## Problem Solved

Previously, Electron files were syncing into the Android folder, causing:
- APK bloat (7MB → 140MB)
- Build conflicts
- Unnecessary dependencies

## Solution

The builds are now properly separated:

### Files Added/Modified
1. **`.capacitorignore`** - Tells Capacitor what NOT to sync to Android
2. **`capacitor.config.ts`** - Updated with Android-specific plugin config
3. **`electron-builder.json`** - Excludes Capacitor packages, fixes Windows symlink error

---

## Building Android APK

### Step 1: Clean Previous Build
```bash
# Remove any Electron artifacts that might have synced
rm -rf android/app/src/main/assets/public/electron
rm -rf android/app/src/main/assets/public/node_modules

# On Windows PowerShell:
Remove-Item -Recurse -Force android/app/src/main/assets/public/electron -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android/app/src/main/assets/public/node_modules -ErrorAction SilentlyContinue
```

### Step 2: Build for Android
```bash
# Build the web app
npm run build

# Sync to Android (uses .capacitorignore to exclude Electron files)
npx cap sync android

# Open in Android Studio
npx cap open android
```

### Step 3: Build APK in Android Studio
1. Wait for Gradle sync
2. Build → Build Bundle(s) / APK(s) → Build APK(s)
3. APK will be in: `android/app/build/outputs/apk/debug/app-debug.apk`

**Expected APK Size:** ~7-15MB (depending on assets)

---

## Building Electron (Windows)

### Fix for Windows Symlink Error

The error "Cannot create symbolic link : A required privilege is not held by the client" has two solutions:

#### Option A: Run as Administrator (Recommended)
1. Right-click on PowerShell or Command Prompt
2. Select "Run as administrator"
3. Navigate to your project folder
4. Run the build command:
```bash
npm run electron:build:win
```

#### Option B: Enable Developer Mode
1. Open Windows Settings
2. Go to Update & Security → For developers
3. Enable "Developer Mode"
4. Restart your terminal
5. Run the build command normally

### Build Commands
```bash
# Build for Windows
npm run electron:build:win

# Output will be in: release/dcel_inventory.exe
```

---

## Quick Reference Scripts

### Android Build Script (build-android.ps1)
```powershell
Write-Host "🧹 Cleaning..." -ForegroundColor Cyan
Remove-Item -Recurse -Force android/app/build -ErrorAction SilentlyContinue

Write-Host "📦 Building web app..." -ForegroundColor Cyan
npm run build

Write-Host "📱 Syncing to Android..." -ForegroundColor Cyan
npx cap sync android

Write-Host "✅ Ready! Open Android Studio with: npx cap open android" -ForegroundColor Green
```

### Electron Build Script (build-electron.ps1)
```powershell
Write-Host "🖥️ Building Electron app..." -ForegroundColor Cyan
Write-Host "⚠️ Run this as Administrator to avoid symlink errors!" -ForegroundColor Yellow

npm run electron:build:win

Write-Host "✅ Done! Check release/ folder" -ForegroundColor Green
```

---

## Troubleshooting

### APK Still Too Large?
1. Delete `android/app/src/main/assets/public` folder
2. Run `npm run build` 
3. Run `npx cap sync android`
4. Check the folder - it should only contain web assets (JS, CSS, HTML, images)

### Electron Build Fails with Symlink Error?
- Run PowerShell/CMD as Administrator
- OR enable Windows Developer Mode

### Build Conflicts?
Clear all caches:
```bash
# Clear Capacitor
rm -rf android/app/src/main/assets/public

# Clear Electron builder cache
rm -rf node_modules/.cache
rm -rf %LOCALAPPDATA%\electron-builder\Cache

# Reinstall
npm install
```

---

## File Size Expectations

| Build Type | Expected Size |
|------------|---------------|
| Android APK (Debug) | 7-15 MB |
| Android APK (Release) | 5-10 MB |
| Electron Portable (Win) | 80-120 MB |

**Note:** Electron apps are larger because they bundle Chromium and Node.js.
