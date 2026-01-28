# DCEL Inventory App Update System - Complete Guide

## 📋 Overview

Your app has a **dual-platform update system** that works differently for Desktop (Electron) and Mobile (Android/Capacitor):

### **Desktop App (Electron)** 
- Uses `electron-updater` for automatic updates
- Downloads and installs full application updates
- Requires a release server to host update files

### **Mobile App (Android/Capacitor)**
- Uses `@capawesome/capacitor-live-update` for live updates
- Downloads and applies web bundle updates (HTML/CSS/JS)
- Does not update native code - only web content

---

## 🔧 How It Currently Works

### 1. **User Experience**

Users can check for updates in two ways:

#### A. **Automatic Check (On Startup)**
- When the app starts, it automatically checks for updates after 5 seconds
- This can be toggled on/off in Settings → App Updates → "Automatic Updates" switch
- The setting is stored in `localStorage` as `autoCheckUpdates`

#### B. **Manual Check**
- Users navigate to **Settings** page
- Find the **App Updates** card
- Click **"Check for Updates"** button

### 2. **Update Flow**

#### **Desktop (Electron) Flow:**
```
1. User clicks "Check for Updates"
   ↓
2. App calls electron-updater API
   ↓
3. If update available → Shows "Update Available" alert
   ↓
4. User clicks "Download Update" button
   ↓
5. Progress bar shows download progress
   ↓
6. When complete → Shows "Update Ready!" alert
   ↓
7. User clicks "Install & Restart" button
   ↓
8. App quits and installs update, then restarts
```

#### **Mobile (Capacitor) Flow:**
```
1. User clicks "Check for Updates"
   ↓
2. App calls LiveUpdate.sync()
   ↓
3. If update available → Downloads automatically
   ↓
4. Shows "Update Ready!" alert
   ↓
5. User clicks "Update" button
   ↓
6. App reloads with new web bundle
```

### 3. **Visual Feedback**

The app provides multiple UI elements for updates:

- **Settings Page**: Full update card with controls
- **Update Banner**: Appears at top of app when update is available (for Desktop/Mobile only)
- **Status Indicators**: Shows current version, last check time, download progress

---

## 🚀 How to Deploy Updates (For Creators)

### **IMPORTANT: Current Limitation**

⚠️ **Your update system is NOT fully configured yet!** Here's what's missing:

#### For Desktop (Electron):
1. **No update server configured** - electron-updater needs a server URL
2. **No publish configuration** - electron-builder.json missing publish settings
3. **No auto-updater initialization** - main.js doesn't initialize electron-updater

#### For Mobile (Capacitor):
1. **No update server configured** - LiveUpdate needs a server URL
2. **No bundle upload process** - Need to upload web bundles somewhere

---

## ✅ Complete Setup Guide

### **STEP 1: Set Up Desktop Updates (Electron)**

#### A. Add Auto-Updater to main.js

Add this code to `electron/main.js`:

```javascript
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Configure auto-updater (add after app.whenReady())
function setupAutoUpdater() {
  // Set update server URL
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'https://your-update-server.com/updates'
  });

  // Auto-updater event handlers
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', info);
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-error', { message: err.message });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info('Download progress:', progressObj);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info);
    }
  });
}

// Add IPC handlers for auto-updater
ipcMain.handle('autoUpdater:checkForUpdates', async () => {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Check for updates failed:', error);
    throw error;
  }
});

ipcMain.handle('autoUpdater:downloadUpdate', async () => {
  try {
    return await autoUpdater.downloadUpdate();
  } catch (error) {
    log.error('Download update failed:', error);
    throw error;
  }
});

ipcMain.handle('autoUpdater:quitAndInstall', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Call this in your main() function
app.whenReady().then(() => {
  main();
  setupAutoUpdater();
});
```

#### B. Update preload.js

Add auto-updater API to the exposed APIs:

```javascript
// Add to existing electronAPI object
contextBridge.exposeInMainWorld('electronAPI', {
  getSyncStatus: () => ipcRenderer.invoke('sync:getStatus'),
  manualSync: () => ipcRenderer.invoke('sync:manualSync'),
  
  // Add auto-updater API
  autoUpdater: {
    checkForUpdates: () => ipcRenderer.invoke('autoUpdater:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('autoUpdater:downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('autoUpdater:quitAndInstall'),
    
    // Event listeners
    onUpdateAvailable: (callback) => {
      ipcRenderer.on('update-available', (_, info) => callback(info));
    },
    onUpdateNotAvailable: (callback) => {
      ipcRenderer.on('update-not-available', (_, info) => callback(info));
    },
    onDownloadProgress: (callback) => {
      ipcRenderer.on('download-progress', (_, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback) => {
      ipcRenderer.on('update-downloaded', (_, info) => callback(info));
    },
    onError: (callback) => {
      ipcRenderer.on('update-error', (_, error) => callback(error));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('update-available');
      ipcRenderer.removeAllListeners('update-not-available');
      ipcRenderer.removeAllListeners('download-progress');
      ipcRenderer.removeAllListeners('update-downloaded');
      ipcRenderer.removeAllListeners('update-error');
    }
  }
});
```

#### C. Configure electron-builder.json

Add publish configuration:

```json
{
  "appId": "com.inventory.flow",
  "productName": "DCEL Inventory",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "electron/**/*",
    "public/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources/llm",
      "to": "llm",
      "filter": ["**/*"]
    }
  ],
  "extraMetadata": {
    "main": "electron/main.js"
  },
  "publish": {
    "provider": "generic",
    "url": "https://your-update-server.com/updates"
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "public/favicon.ico",
    "forceCodeSigning": false,
    "signAndEditExecutable": false,
    "artifactName": "dcel_inventory_${version}.${ext}",
    "publish": {
      "provider": "generic",
      "url": "https://your-update-server.com/updates/windows"
    }
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "mac": {
    "target": ["dmg"],
    "icon": "public/favicon.ico",
    "category": "public.app-category.business",
    "publish": {
      "provider": "generic",
      "url": "https://your-update-server.com/updates/mac"
    }
  },
  "linux": {
    "target": ["AppImage"],
    "icon": "public/favicon.ico",
    "category": "Office",
    "publish": {
      "provider": "generic",
      "url": "https://your-update-server.com/updates/linux"
    }
  }
}
```

#### D. Set Up Update Server

You need a server to host your update files. Options:

**Option 1: GitHub Releases (Free)**
```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "your-repo-name"
}
```

**Option 2: Amazon S3**
```json
"publish": {
  "provider": "s3",
  "bucket": "your-bucket-name",
  "region": "us-east-1"
}
```

**Option 3: Custom Server**
- Set up a web server (nginx, Apache, etc.)
- Create directory structure: `/updates/windows/`, `/updates/mac/`, `/updates/linux/`
- Upload built files and `latest.yml` to appropriate directories

#### E. Build and Publish Updates

```bash
# 1. Update version in package.json
# Edit package.json and change "version": "1.0.0" to "1.0.1"

# 2. Build the app
npm run build

# 3. Build installers with electron-builder
npm run electron:build:win

# 4. Upload to your update server
# The release/ folder will contain:
# - dcel_inventory_1.0.1.exe (installer)
# - dcel_inventory_1.0.1.exe.blockmap
# - latest.yml (update metadata)

# Upload these files to your update server
```

---

### **STEP 2: Set Up Mobile Updates (Capacitor)**

#### A. Choose an Update Server

You need to host your web bundles. Options:

1. **Capawesome Cloud** (Recommended - Official)
   - Sign up at https://capawesome.io
   - Get API key and app ID
   
2. **Custom Server**
   - Set up your own server to host bundles
   - Implement the LiveUpdate API

#### B. Configure LiveUpdate

Add to your app initialization (in `src/main.tsx` or `App.tsx`):

```typescript
import { LiveUpdate } from '@capawesome/capacitor-live-update';
import { Capacitor } from '@capacitor/core';

// Configure LiveUpdate on app startup
if (Capacitor.isNativePlatform()) {
  LiveUpdate.configure({
    appId: 'your-app-id',
    channel: 'production', // or 'beta', 'development'
    autoUpdate: false, // We handle updates manually via UI
  });
}
```

#### C. Build and Upload Web Bundles

```bash
# 1. Update version in package.json
# Edit package.json: "version": "1.0.1"

# 2. Build the web app
npm run build

# 3. Sync to Capacitor
npx cap sync

# 4. Create a bundle
npx cap-live-update bundle --app-id your-app-id --channel production

# 5. Upload the bundle
npx cap-live-update upload --app-id your-app-id --channel production --bundle-id 1.0.1
```

---

## 📝 Update Deployment Workflow

### When You Make Changes to Your App:

#### **For Desktop Updates:**

1. **Make your code changes**
2. **Test thoroughly**
3. **Update version in package.json**: `"version": "1.0.1"` → `"1.0.2"`
4. **Build the app**: `npm run build`
5. **Create installer**: `npm run electron:build:win`
6. **Upload to update server**:
   - Upload files from `release/` folder
   - Ensure `latest.yml` is updated
7. **Users will get notified** when they open the app or click "Check for Updates"

#### **For Mobile Updates:**

1. **Make your code changes** (web code only - HTML/CSS/JS)
2. **Test thoroughly**
3. **Update version in package.json**: `"version": "1.0.1"` → `"1.0.2"`
4. **Build the web app**: `npm run build`
5. **Create bundle**: `npx cap-live-update bundle --app-id your-app-id --channel production`
6. **Upload bundle**: `npx cap-live-update upload --app-id your-app-id --channel production --bundle-id 1.0.2`
7. **Users will get the update** when they click "Check for Updates"

---

## 🎯 Update Server File Structure

Your update server should have this structure:

```
your-update-server.com/
└── updates/
    ├── windows/
    │   ├── dcel_inventory_1.0.1.exe
    │   ├── dcel_inventory_1.0.1.exe.blockmap
    │   └── latest.yml
    ├── mac/
    │   ├── dcel_inventory_1.0.1.dmg
    │   ├── dcel_inventory_1.0.1.dmg.blockmap
    │   └── latest-mac.yml
    └── linux/
        ├── dcel_inventory_1.0.1.AppImage
        └── latest-linux.yml
```

The `latest.yml` file is auto-generated by electron-builder and contains:

```yaml
version: 1.0.1
files:
  - url: dcel_inventory_1.0.1.exe
    sha512: [hash]
    size: [bytes]
path: dcel_inventory_1.0.1.exe
sha512: [hash]
releaseDate: '2026-01-28T10:00:00.000Z'
```

---

## 🔐 Security Considerations

1. **Code Signing** (Recommended for production):
   - Windows: Get a code signing certificate
   - Mac: Requires Apple Developer account
   - Update `electron-builder.json` to enable signing

2. **HTTPS**: Always use HTTPS for your update server

3. **Version Control**: Keep track of versions in git tags

---

## 🐛 Troubleshooting

### "Update not found" error:
- Check that `latest.yml` exists on your server
- Verify the URL in electron-builder.json is correct
- Check server CORS settings

### "Download failed" error:
- Ensure update files are publicly accessible
- Check file permissions on server
- Verify file integrity (checksums)

### Mobile updates not working:
- Verify LiveUpdate is configured correctly
- Check API key and app ID
- Ensure bundle was uploaded successfully

---

## 📚 Additional Resources

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [Capacitor Live Update Documentation](https://capawesome.io/plugins/live-update/)
- [electron-builder Publishing](https://www.electron.build/configuration/publish)

---

## ✨ Summary

Your app has a **sophisticated update system** that's **90% complete**! 

**What works:**
✅ UI for checking updates
✅ Download progress tracking
✅ Install and restart functionality
✅ Auto-check on startup
✅ Platform detection (Desktop vs Mobile)

**What's missing:**
❌ Auto-updater initialization in main.js
❌ Update server configuration
❌ Publish workflow setup

**Next Steps:**
1. Choose an update hosting solution (GitHub Releases is easiest)
2. Add auto-updater code to main.js
3. Update electron-builder.json with publish config
4. Build and upload your first update
5. Test the update flow

Once configured, users will be able to click "Check for Updates" and seamlessly update your app! 🚀
