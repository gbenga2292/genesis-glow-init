import { app, BrowserWindow, ipcMain, shell, Menu, Tray, nativeImage, Notification } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let tray = null;
let isQuitting = false;

function createTray() {
  const iconPath = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../public/favicon.ico')
    : path.join(__dirname, '../dist/favicon.ico');

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
    // Icon path depends on environment
    icon: process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../dist/favicon.ico')
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

