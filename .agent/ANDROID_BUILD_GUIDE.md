# 📱 Android App Build Guide - DCEL Inventory

## ✅ What I've Done For You

I've successfully completed the following steps:

1. ✅ **Built the web app** (`npm run build`) - Completed in 29.60s
2. ✅ **Synced to Capacitor** (`npx cap sync android`) - Completed successfully
3. ✅ **Opened Android Studio** (`npx cap open android`) - Android Studio is now opening

---

## 🚀 Current Status

Your Android project is **ready to build** in Android Studio!

### What's Been Prepared:
- ✅ Web assets copied to `android/app/src/main/assets/public`
- ✅ Capacitor plugins synced
- ✅ Android project updated with latest code
- ✅ Android Studio is opening your project

---

## 📋 Next Steps - Complete the Build

### **Option 1: Build in Android Studio (Recommended)**

Android Studio should now be open. Follow these steps:

#### Step 1: Wait for Gradle Sync
- Android Studio will automatically sync Gradle dependencies
- Wait for "Gradle sync finished" message (bottom right)
- This may take 2-5 minutes on first build

#### Step 2: Build the APK
1. Click **Build** menu → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete (progress shown at bottom)
3. When done, you'll see: "APK(s) generated successfully"
4. Click **locate** to find your APK

#### Step 3: Find Your APK
The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

### **Option 2: Build via Command Line (If Java is Installed)**

⚠️ **Note**: This requires Java JDK to be installed and JAVA_HOME configured.

If you have Java installed, you can build from command line:

```bash
# Navigate to android folder
cd android

# Build debug APK
.\gradlew.bat assembleDebug

# Build release APK (requires signing)
.\gradlew.bat assembleRelease
```

---

## 🔧 If You Encounter Issues

### **Issue 1: Java Not Found**

**Error**: `JAVA_HOME is not set`

**Solution**:
1. Download and install **Java JDK 17** from:
   - https://adoptium.net/ (Recommended)
   - Or use Android Studio's bundled JDK

2. Set JAVA_HOME environment variable:
   ```powershell
   # Find Android Studio's JDK path (usually):
   # C:\Program Files\Android\Android Studio\jbr
   
   # Set temporarily in PowerShell:
   $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
   
   # Or set permanently in System Environment Variables
   ```

### **Issue 2: Gradle Sync Failed**

**Solution**:
1. In Android Studio: **File** → **Invalidate Caches** → **Invalidate and Restart**
2. After restart: **File** → **Sync Project with Gradle Files**

### **Issue 3: SDK Not Found**

**Solution**:
1. In Android Studio: **Tools** → **SDK Manager**
2. Ensure these are installed:
   - ✅ Android SDK Platform 34 (or latest)
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android SDK Tools

### **Issue 4: Build Fails with Dependency Errors**

**Solution**:
1. Check `android/app/build.gradle` for version conflicts
2. Clean and rebuild:
   - **Build** → **Clean Project**
   - **Build** → **Rebuild Project**

---

## 📦 Build Variants

### **Debug Build** (For Testing)
- Faster to build
- Includes debugging symbols
- Larger file size
- Not optimized
- **Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

### **Release Build** (For Distribution)
- Requires signing configuration
- Optimized and minified
- Smaller file size
- Ready for Play Store
- **Location**: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🔐 Creating a Release Build

To create a signed release APK:

### Step 1: Generate Signing Key

```bash
# In PowerShell or Command Prompt
keytool -genkey -v -keystore dcel-inventory.keystore -alias dcel-inventory -keyalg RSA -keysize 2048 -validity 10000
```

**Save this information securely!**

### Step 2: Configure Signing in Android Studio

1. **Build** → **Generate Signed Bundle / APK**
2. Select **APK**
3. Click **Create new...** to create keystore (or use existing)
4. Fill in keystore details
5. Choose **release** build variant
6. Click **Finish**

### Step 3: Or Configure in build.gradle

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("path/to/dcel-inventory.keystore")
            storePassword "your-store-password"
            keyAlias "dcel-inventory"
            keyPassword "your-key-password"
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 📱 Installing the APK

### **On Physical Device:**

1. **Enable Developer Options**:
   - Go to **Settings** → **About Phone**
   - Tap **Build Number** 7 times
   - Go back to **Settings** → **Developer Options**
   - Enable **USB Debugging**

2. **Connect Device**:
   - Connect phone via USB
   - Allow USB debugging on phone

3. **Install APK**:
   ```bash
   # Using ADB
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```
   
   Or:
   - Transfer APK to phone
   - Open file manager and tap APK
   - Allow "Install from Unknown Sources" if prompted
   - Tap **Install**

### **On Emulator:**

1. **Create Emulator** (if not exists):
   - In Android Studio: **Tools** → **Device Manager**
   - Click **Create Device**
   - Choose device (e.g., Pixel 5)
   - Choose system image (Android 13+)
   - Click **Finish**

2. **Run on Emulator**:
   - Click **Run** button (green play icon) in Android Studio
   - Select your emulator
   - App will install and launch automatically

---

## 🔄 Quick Rebuild Workflow

When you make changes to your app:

```bash
# 1. Build web app
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Open in Android Studio (if not already open)
npx cap open android

# 4. In Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)
```

Or create a script to automate:

**`build-android.ps1`**:
```powershell
Write-Host "Building web app..." -ForegroundColor Cyan
npm run build

Write-Host "Syncing to Capacitor..." -ForegroundColor Cyan
npx cap sync android

Write-Host "Opening Android Studio..." -ForegroundColor Cyan
npx cap open android

Write-Host "✓ Ready to build in Android Studio!" -ForegroundColor Green
```

Run with: `.\build-android.ps1`

---

## 📊 Build Output Locations

After successful build, find your files here:

```
android/
├── app/
│   └── build/
│       └── outputs/
│           ├── apk/
│           │   ├── debug/
│           │   │   └── app-debug.apk          ← Debug APK
│           │   └── release/
│           │       └── app-release.apk        ← Release APK
│           └── bundle/
│               └── release/
│                   └── app-release.aab        ← Android App Bundle (for Play Store)
```

---

## 🎯 Current Build Configuration

Your app is configured with:

- **App ID**: `com.dcel.inventory`
- **App Name**: DCEL Inventory
- **Version**: 1.0.0 (from package.json)
- **Min SDK**: 22 (Android 5.1)
- **Target SDK**: 34 (Android 14)
- **Splash Screen**: Configured with dark blue background
- **Plugins**: 
  - Capacitor Core
  - Capacitor Splash Screen
  - Capawesome Live Update

---

## 🚀 What to Do Now

1. **Wait for Android Studio to fully load** (may take 1-2 minutes)
2. **Wait for Gradle sync to complete** (progress bar at bottom)
3. **Click Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. **Wait for build** (2-5 minutes first time, faster after)
5. **Click "locate"** when build completes
6. **Install APK** on your device or emulator

---

## ✨ Tips for Faster Builds

1. **Enable Gradle Daemon**: Already enabled by default
2. **Increase Gradle Memory**: Edit `android/gradle.properties`:
   ```properties
   org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
   ```
3. **Use Build Cache**: Already enabled in newer Gradle versions
4. **Close Unnecessary Apps**: Free up RAM during build

---

## 📞 Need Help?

If you encounter any issues:

1. Check the **Build** tab in Android Studio for error details
2. Check **Logcat** for runtime errors
3. Try **Clean Project** then **Rebuild Project**
4. Check that all SDK components are installed
5. Ensure you have at least 4GB free disk space

---

## 🎉 Success!

Once you see "APK(s) generated successfully", you're done! 

Your Android app is ready to install and test. 🚀

**APK Location**: `android/app/build/outputs/apk/debug/app-debug.apk`

You can now:
- ✅ Install on physical devices
- ✅ Test on emulators
- ✅ Share with testers
- ✅ Prepare for Play Store (after creating release build)
