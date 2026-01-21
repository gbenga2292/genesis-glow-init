import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';

// ============= Single Instance Lock =============
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();

      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'App Already Running',
        message: 'The application is already running.',
        detail: 'The existing window has been brought to focus.',
        buttons: ['OK']
      });
    }
  });
}

// Configure electron-log
log.initialize();
log.transports.file.level = 'info';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let splashWindow;
let llmManager;

// Listen for logs from renderer
ipcMain.on('log-message', (event, { level, message, data }) => {
  if (log[level]) {
    log[level](`[Renderer] ${message}`, data || '');
  } else {
    log.info(`[Renderer] ${message}`, data || '');
  }
});

async function main() {
  console.log('=== DCEL Inventory - Supabase Mode ===');
  console.log('SQLite/NAS functionality is DISABLED. All data is stored in Supabase.');
  console.log('========================================');

  // --- Window control handlers ---
  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('window:toggleDevTools', () => {
    if (mainWindow) mainWindow.webContents.toggleDevTools();
  });

  // --- Database handlers (return not-available responses) ---
  // These stubs prevent errors when the frontend tries to call these methods
  ipcMain.handle('db:getDatabaseInfo', () => {
    return {
      storageType: 'supabase',
      dbPath: 'Supabase Cloud',
      masterDbPath: 'Supabase Cloud',
      localDbPath: 'Supabase Cloud',
      lockingEnabled: false,
      message: 'All data is stored in Supabase. Local SQLite is disabled.'
    };
  });

  ipcMain.handle('sync:getStatus', () => {
    return {
      inSync: true,
      status: 'supabase',
      metadata: {},
      message: 'Using Supabase for all data storage. No local sync needed.'
    };
  });

  ipcMain.handle('sync:manualSync', async () => {
    return {
      success: true,
      message: 'Using Supabase for all data storage. No manual sync needed.'
    };
  });

  // --- LLM Manager Integration (keep this for AI assistant) ---
  try {
    const { LLMManager } = await import('./llmManager.js');
    llmManager = new LLMManager();

    llmManager.start().then(result => {
      if (result.success) {
        console.log('✓ LLM server auto-started successfully');
      } else {
        console.warn('⚠ LLM server auto-start failed:', result.error);
      }
    }).catch(err => {
      console.error('LLM auto-start error:', err);
    });

    // LLM IPC Handlers
    ipcMain.handle('llm:status', async () => {
      return llmManager.getStatus();
    });

    ipcMain.handle('llm:configure', async (event, newCfg) => {
      if (!newCfg) return { success: false, error: 'No config provided' };
      return llmManager.updateModelPath(newCfg);
    });

    ipcMain.handle('llm:generate', async (event, { prompt, options = {} } = {}) => {
      if (!prompt) return { success: false, error: 'No prompt provided' };
      return await llmManager.generate(prompt, options);
    });

    ipcMain.handle('llm:start', async () => {
      return await llmManager.start();
    });

    ipcMain.handle('llm:stop', async () => {
      return llmManager.stop();
    });

    ipcMain.handle('llm:restart', async () => {
      return await llmManager.restart();
    });

    // Stub handlers for keytar-related operations (no-op since we use Supabase)
    ipcMain.handle('llm:migrate-keys', async () => {
      return { success: true, message: 'No migration needed - using Supabase.' };
    });

    ipcMain.handle('llm:get-key-status', async () => {
      return { success: true, inDB: false, inSecureStore: false };
    });

    ipcMain.handle('llm:clear-key', async () => {
      return { success: true };
    });
  } catch (err) {
    console.warn('LLM Manager not available:', err.message);
  }

  // --- Backup handlers (return stubs - backup is handled by Supabase) ---
  ipcMain.handle('backup:getStatus', () => {
    return {
      enabled: false,
      message: 'Backup is handled by Supabase. Local backup is disabled.'
    };
  });

  ipcMain.handle('backup:triggerManual', async () => {
    return {
      success: false,
      message: 'Local backup is disabled. Data is backed up automatically in Supabase.'
    };
  });

  ipcMain.handle('backup:setEnabled', () => {
    return { success: true, message: 'Backup is handled by Supabase.' };
  });

  ipcMain.handle('backup:setRetention', () => {
    return { success: true };
  });

  ipcMain.handle('backup:listBackups', () => {
    return [];
  });

  ipcMain.handle('backup:checkNAS', async () => {
    return { accessible: false, message: 'NAS backup is disabled. Using Supabase.' };
  });

  ipcMain.handle('backup:readBackupFile', async () => {
    return null;
  });

  ipcMain.handle('backup:setNASPath', () => {
    return { success: true };
  });

  console.log('IPC handlers registered.');

  // Create the browser window
  createWindow();
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../public/favicon.ico')
      : path.join(__dirname, '../dist/favicon.ico')
  });

  if (process.env.NODE_ENV === 'development') {
    splashWindow.loadFile(path.join(__dirname, '../public/splash.html'));
  } else {
    splashWindow.loadFile(path.join(__dirname, '../dist/splash.html'));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#74b1be',
      height: 48
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

  mainWindow.setMenu(null);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
    }, 1000);
  });
}

app.whenReady().then(() => {
  createSplashWindow();
  main();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('Starting shutdown process...');

  try {
    if (typeof llmManager !== 'undefined' && llmManager) {
      llmManager.stop();
      console.log('✓ LLM server stopped');
    }
  } catch (err) {
    console.error('Error stopping LLM server:', err);
  }
});

app.on('will-quit', () => {
  console.log('App is quitting...');
});
