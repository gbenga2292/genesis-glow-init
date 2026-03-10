import { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// electron-updater and electron-log are CommonJS packages.
// In an ESM main process we must use createRequire to load them correctly.
// Using ESM named imports (import { autoUpdater } from 'electron-updater') can
// silently resolve to undefined, which breaks all IPC handler registration.
const require = createRequire(import.meta.url);
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let tray = null;
let isQuitting = false;

function getIconPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, '../public/favicon.ico');
  }
  // In packaged app, resources are extracted alongside app.asar
  // Try multiple locations for robustness
  const candidates = [
    path.join(process.resourcesPath, 'favicon.ico'),
    path.join(path.dirname(app.getPath('exe')), 'favicon.ico'),
    path.join(app.getAppPath(), 'dist', 'favicon.ico'),
  ];
  for (const p of candidates) {
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  // Fallback
  return path.join(app.getAppPath(), 'dist', 'favicon.ico');
}

function createTray() {
  const iconPath = getIconPath();
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('DCEL Inventory');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Auto-Updater Setup ───────────────────────────────────────────────────────
function setupAutoUpdater() {
  // Helper to safely send events to the renderer
  const send = (channel, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  };

  // ─── Register IPC handlers FIRST ────────────────────────────────────────
  // We register these BEFORE configuring autoUpdater so they are always
  // available to the renderer even if auto-updater setup fails.

  ipcMain.handle('updater:getVersion', () => app.getVersion());

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      // In development, simulate a successful check with no update available
      log.info('[updater] Dev mode: skipping real update check');
      send('updater:update-not-available', { version: app.getVersion() });
      return;
    }
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      log.error('[updater] checkForUpdates failed:', err);
      send('updater:error', { message: err.message });
    }
  });

  ipcMain.handle('updater:download', async () => {
    if (!app.isPackaged) {
      log.info('[updater] Dev mode: skipping download');
      return;
    }
    try {
      await autoUpdater.downloadUpdate();
    } catch (err) {
      log.error('[updater] downloadUpdate failed:', err);
      send('updater:error', { message: err.message });
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    if (app.isPackaged) autoUpdater.quitAndInstall();
  });

  // ─── Configure autoUpdater (only in production) ───────────────────────────
  // Skip in dev — auto-updater requires a published app-update.yml which only
  // exists in a packaged build. Running it in dev causes confusing errors.
  if (!app.isPackaged) {
    log.info('[updater] Running in development — auto-updater is disabled.');
    return;
  }

  try {
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    autoUpdater.autoDownload = false;        // User decides when to download
    autoUpdater.autoInstallOnAppQuit = true; // Installs on next quit if downloaded

    autoUpdater.on('update-available', (info) => {
      log.info('[updater] Update available:', info.version);
      send('updater:update-available', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      log.info('[updater] Already up to date.');
      send('updater:update-not-available', info);
    });

    autoUpdater.on('download-progress', (progress) => {
      send('updater:download-progress', progress);
    });

    autoUpdater.on('update-downloaded', (info) => {
      log.info('[updater] Update downloaded:', info.version);
      send('updater:update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
      log.error('[updater] Error:', err);
      send('updater:error', { message: err.message });
    });

    // Auto-check 10 seconds after startup
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        log.warn('[updater] Startup check failed (non-critical):', err.message);
      });
    }, 10000);

  } catch (err) {
    log.error('[updater] Failed to configure auto-updater:', err);
  }
}

function createWindow() {
  // Create splash window
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: getIconPath()
  });

  // Load splash screen
  const splashPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/splash.html')
    : path.join(__dirname, '../dist/splash.html');

  splashWindow.loadFile(splashPath);

  // Create main window (hidden initially)
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show until ready
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 30
    },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../dist/favicon.ico')
  });

  // Remove default menu
  mainWindow.setMenuBarVisibility(false);
  Menu.setApplicationMenu(null);

  // Load application
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle Close Event (Minimize to Tray)
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // When main window is ready to show, wait for data to load before closing splash
  let isDataLoaded = false;
  let isWindowReady = false;

  mainWindow.once('ready-to-show', () => {
    isWindowReady = true;
    // Only show if data is already loaded
    if (isDataLoaded) {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }
      mainWindow.show();
      createTray();
    }
  });

  // Listen for data-loaded signal from React app
  ipcMain.once('app-data-loaded', () => {
    isDataLoaded = true;
    // Only show if window is already ready
    if (isWindowReady) {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }
      if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
      }
      if (!tray) {
        createTray();
      }
    }
  });

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

// Ignore certificate errors in development (for Supabase SSL issues)
if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}

// Deep Linking Setup
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('dcel-inventory', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('dcel-inventory');
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();

      // On Windows, the deep link is in the commandLine array
      const deepLink = commandLine.find((arg) => arg.startsWith('dcel-inventory://'));
      if (deepLink) {
        mainWindow.webContents.send('deep-link', deepLink);
      }
    }
  });

  app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
      }
    });

    // Handle deep link on startup (Windows)
    const deepLink = process.argv.find((arg) => arg.startsWith('dcel-inventory://'));
    if (deepLink && mainWindow) {
      // Small delay to ensure React handles it? Or just send it.
      // Note: Creating window is async-ish, but variable isn't assigned until constructed.
      // However, we can't send until window "ready-to-show"? 
      // We'll rely on the existing 'ready-to-show' OR we can send it once 'did-finish-load'.
      mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('deep-link', deepLink);
      });
    }
  });

  // Handle deep link (macOS)
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('deep-link', url);
    }
  });
}

// Global window-all-closed handler
app.on('window-all-closed', () => {
  // Do not quit on window all closed (keep query running in tray)
  if (process.platform !== 'darwin') {
    // app.quit(); // We want to keep running in tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// IPC handler for simple window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  } else {
    mainWindow?.maximize();
    return true;
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());
ipcMain.handle('window:toggleDevTools', () => mainWindow?.webContents.toggleDevTools());
ipcMain.handle('window:update-title-bar-overlay', (event, options) => {
  if (mainWindow) {
    mainWindow.setTitleBarOverlay(options);
  }
});

// IPC handler for Native Notifications
ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'DCEL Inventory',
      body: body || '',
      icon: process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '../public/favicon.ico')
        : path.join(__dirname, '../dist/favicon.ico')
    }).show();
    return true;
  }
  return false;
});

