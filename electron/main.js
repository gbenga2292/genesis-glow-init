import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import log from 'electron-log';
import { initializeDatabase } from './databaseSetup.js';

// ============= Single Instance Lock =============
// Prevent multiple instances of the app from running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  // This is the first instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();

      // Show a dialog to inform the user
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

import { migrateDatabase } from './migrateDatabase.js';
import * as db from './database.js';
import config, { getDatabasePath } from './config.js';
import { SyncManager } from './syncManager.js';
import { backupScheduler } from './backupScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Listen for logs from renderer
ipcMain.on('log-message', (event, { level, message, data }) => {
  if (log[level]) {
    log[level](`[Renderer] ${message}`, data || '');
  } else {
    log.info(`[Renderer] ${message}`, data || '');
  }
});

// --- Get Database Configuration ---
const APP_DATA_PATH = app.getPath('userData');
const DB_PATH = getDatabasePath(APP_DATA_PATH);
const DB_FILENAME = config.databaseFilename;
const LOCK_FILENAME = config.lockFilename;

const masterDbPath = path.join(DB_PATH, DB_FILENAME);
const lockFilePath = path.join(DB_PATH, LOCK_FILENAME);
const localDbPath = path.join(APP_DATA_PATH, DB_FILENAME);

console.log('=== Database Configuration ===');
console.log('Storage Type:', config.storageType);
console.log('Database Path:', DB_PATH);
console.log('Master DB:', masterDbPath);
console.log('Local DB:', localDbPath);
console.log('Locking Enabled:', config.enableLocking);
console.log('============================');

let mainWindow;
let splashWindow;
// LLM manager instance is created during main() but we keep a module-scoped reference
// so shutdown handlers outside main() can access it.
let llmManager;
let syncManager;

async function main() {
  // Initialize sync manager
  syncManager = new SyncManager(APP_DATA_PATH, masterDbPath, localDbPath, db);

  // Ensure the database directory exists
  if (!fs.existsSync(DB_PATH)) {
    console.log('Creating database directory:', DB_PATH);
    try {
      fs.mkdirSync(DB_PATH, { recursive: true });
      console.log('Database directory created successfully.');
    } catch (error) {
      console.error('Failed to create database directory:', error);
      dialog.showErrorBox('Error', `Could not create database directory: ${error.message}`);
      app.quit();
      return;
    }
  }

  // 1. Check for master database and initialize if it doesn't exist
  if (!fs.existsSync(masterDbPath)) {
    if (config.autoCreateDatabase) {
      console.log('Master database not found. Initializing a new one...');
      try {
        await initializeDatabase(masterDbPath);
        console.log('✓ New master database created at:', masterDbPath);
      } catch (error) {
        console.error('Failed to create database:', error);
        dialog.showErrorBox('Database Error', `Could not create database: ${error.message}`);
        app.quit();
        return;
      }
    } else {
      dialog.showErrorBox('Database Not Found', 'Database file does not exist and auto-creation is disabled.');
      app.quit();
      return;
    }
  }

  // 2. Create backup if enabled
  if (config.autoBackup && fs.existsSync(masterDbPath)) {
    const backupPath = path.join(DB_PATH, `${DB_FILENAME}.backup`);
    try {
      fs.copyFileSync(masterDbPath, backupPath);
      console.log('✓ Database backup created:', backupPath);
    } catch (error) {
      console.warn('Could not create backup:', error.message);
    }
  }

  // 3. Handle locking (if enabled)
  if (config.enableLocking) {
    if (fs.existsSync(lockFilePath)) {
      const locker = fs.readFileSync(lockFilePath, 'utf-8').trim();
      const currentUser = `${process.env.USERNAME || 'unknown'} on ${process.env.COMPUTERNAME || 'unknown-pc'}`;
      if (locker === currentUser) {
        console.log('Stale lock file detected from this PC. Removing it.');
        fs.unlinkSync(lockFilePath);
      } else {
        dialog.showErrorBox('Database Locked', `The database is currently in use by ${locker}. Please try again later.`);
        app.quit();
        return;
      }
    }

    // Acquire lock
    const lockContent = `${process.env.USERNAME || 'unknown'} on ${process.env.COMPUTERNAME || 'unknown-pc'}`;
    fs.writeFileSync(lockFilePath, lockContent);
    console.log('✓ Database lock acquired.');
  }

  // 4. Copy database to local machine (for better performance)
  try {
    fs.copyFileSync(masterDbPath, localDbPath);
    console.log('✓ Database copied to local working copy:', localDbPath);
  } catch (error) {
    console.error('Failed to copy database locally:', error);
    dialog.showErrorBox('Error', 'Could not copy the database file. Please check permissions.');
    if (config.enableLocking && fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath); // Release lock on error
    }
    app.quit();
    return;
  }

  // 5. Connect to the local database
  db.connect(localDbPath);
  console.log('✓ Connected to database.');

  // 6. Run migration to add new columns if needed
  console.log('Running database migration...');
  try {
    await migrateDatabase(localDbPath);
    console.log('✓ Database migration completed.');
  } catch (error) {
    console.error('Migration failed:', error);
    dialog.showErrorBox('Migration Error', `Database migration failed: ${error.message}`);
  }

  // 7. Setup IPC Handlers dynamically
  // Helper to detect mutating operations
  const isMutatingOperation = (name) => {
    if (!name) return false;
    if (name.startsWith('get')) return false;
    return !['login', 'getDatabaseInfo', 'connect', 'disconnect'].includes(name);
  };

  // Sync local working copy back to master storage
  const syncLocalToMaster = async () => {
    if (syncManager) {
      const result = await syncManager.syncToMaster();
      if (!result.success) {
        console.error('Failed to sync database back to master:', result.error);
      }
    }
  };

  for (const functionName of Object.keys(db)) {
    if (typeof db[functionName] === 'function' && functionName !== 'connect' && functionName !== 'disconnect') {
      ipcMain.handle(`db:${functionName}`, async (event, ...args) => {
        try {
          const result = await db[functionName](...args);
          if (isMutatingOperation(functionName)) {
            // Persist changes immediately to master storage
            await syncLocalToMaster();
          }
          return result;
        } catch (error) {
          console.error(`Error in IPC handler db:${functionName}:`, error);
          // Rethrow the error to be caught by the frontend
          throw error;
        }
      });
    }
  }

  // Add handler to get database info
  ipcMain.handle('db:getDatabaseInfo', () => {
    return {
      storageType: config.storageType,
      dbPath: DB_PATH,
      masterDbPath: masterDbPath,
      localDbPath: localDbPath,
      lockingEnabled: config.enableLocking
    };
  });

  ipcMain.handle('db:wipeLocalDatabase', () => {
    console.log('Wipe command received. Attempting to delete local database.');
    // First, disconnect from the database if connected
    db.disconnect();

    console.log('Attempting to delete file at:', localDbPath);
    try {
      if (fs.existsSync(localDbPath)) {
        fs.unlinkSync(localDbPath);
        console.log('✓ Successfully deleted local database file.');
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          title: 'Success',
          message: 'The local database has been deleted. The application will now close. Please restart it.'
        }).then(() => {
          app.quit();
        });
        return { success: true, path: localDbPath };
      } else {
        console.log('Local database file not found, nothing to delete.');
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          title: 'Not Found',
          message: 'The local database file was not found. The application will now close. Please restart it.'
        }).then(() => {
          app.quit();
        });
        return { success: false, message: 'File not found.' };
      }
    } catch (error) {
      console.error('Failed to delete local database file:', error);
      dialog.showErrorBox('Deletion Failed', `Could not delete the local database file. Please do it manually at ${localDbPath}. Error: ${error.message}`);
      app.quit();
      return { success: false, error: error.message };
    }
  });

  // Add sync status handlers
  ipcMain.handle('sync:getStatus', () => {
    if (syncManager) {
      return syncManager.getSyncInfo();
    }
    return { error: 'Sync manager not initialized' };
  });

  ipcMain.handle('sync:manualSync', async () => {
    if (!syncManager) {
      return { success: false, error: 'Sync manager not initialized' };
    }

    try {
      syncManager.markSyncStarted();
      const result = await syncManager.syncToMaster();

      if (result.success) {
        return {
          success: true,
          message: 'Database synced successfully',
          timestamp: result.timestamp
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Window control handlers
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

  console.log('IPC handlers registered.');

  // --- Initialize Backup Scheduler ---
  console.log('Initializing automatic backup scheduler...');
  backupScheduler.initialize(APP_DATA_PATH);
  console.log('✓ Backup scheduler initialized');

  // --- LLM Manager Integration ---
  // Dynamically import the ESM LLM manager module (main.js is ESM)
  const { LLMManager } = await import('./llmManager.js');
  llmManager = new LLMManager();

  // Try to migrate API key from company settings (DB) into OS secure store (keytar)
  // This keeps the DB copy for cross-machine sync while also populating keytar for secure local use.
  const tryMigrateApiKeyFromDB = async () => {
    try {
      if (!db || typeof db.getCompanySettings !== 'function') return;
      const cs = await db.getCompanySettings();
      if (!cs || !cs.ai || !cs.ai.remote) return;
      const remote = cs.ai.remote;
      if (!remote.apiKey) return; // nothing to migrate

      // If keytar already has it, nothing to do
      try {
        const keytarModule = await import('keytar');
        const keytar = keytarModule.default || keytarModule;
        const SERVICE = 'hi-there-project-09-ai';
        const ACCOUNT = (cs && cs.id) ? String(cs.id) : 'default';
        const stored = await keytar.getPassword(SERVICE, ACCOUNT);
        if (stored) {
          console.log('LLM: API key already present in secure store for account', ACCOUNT);
          return;
        }
        // Ask llmManager to persist remote config (it will attempt to store via keytar too)
        const res = await llmManager.updateModelPath({ remote });
        if (res && res.success) {
          console.log('LLM: Migrated API key into secure store via llmManager');
          // Mark the company settings record to indicate secure-store presence (optional)
          try {
            const updated = { ...(cs || {}), ai: { ...(cs.ai || {}), remote: { ...remote, storedInSecureStore: true } } };
            if (cs.id && db.updateCompanySettings) {
              await db.updateCompanySettings(cs.id, updated);
              console.log('LLM: Updated company settings to mark storedInSecureStore');
            }
          } catch (err) {
            console.warn('LLM: Failed to mark company settings after migration', err);
          }
        } else {
          console.warn('LLM: llmManager.updateModelPath reported failure during migration', res && res.error);
        }
      } catch (err) {
        console.warn('LLM: keytar unavailable or migration failed; leaving API key in DB for cross-machine use', err);
      }
    } catch (err) {
      console.error('LLM: Unexpected error while migrating API key from DB', err);
    }
  };

  // Auto-start LLM server on app startup
  llmManager.start().then(result => {
    if (result.success) {
      console.log('✓ LLM server auto-started successfully');
    } else {
      console.warn('⚠ LLM server auto-start failed:', result.error);
      console.warn('  AI Assistant will not be available until LLM is configured.');
    }
  }).catch(err => {
    console.error('LLM auto-start error:', err);
  });

  // Attempt immediate migration from DB into keytar so runtime operations find the key
  tryMigrateApiKeyFromDB().catch(err => console.warn('LLM: migration task failed', err));

  // --- LLM IPC Handlers (New Bundled Runtime Approach) ---
  ipcMain.handle('llm:status', async () => {
    return llmManager.getStatus();
  });

  ipcMain.handle('llm:configure', async (event, newCfg) => {
    // Allow updating modelPath or remote configuration via a single payload
    if (!newCfg) return { success: false, error: 'No config provided' };
    return llmManager.updateModelPath(newCfg);
  });

  // Migrate API key(s) from company settings (DB) into secure store (keytar). Returns a short report.
  ipcMain.handle('llm:migrate-keys', async () => {
    try {
      await tryMigrateApiKeyFromDB();
      return { success: true, message: 'Migration attempted. Check logs for details.' };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Check where the API key exists: secure store and/or DB
  ipcMain.handle('llm:get-key-status', async () => {
    try {
      const cs = await db.getCompanySettings();
      const dbHas = !!(cs && cs.ai && cs.ai.remote && cs.ai.remote.apiKey);
      let secureHas = false;
      try {
        const keytarModule = await import('keytar');
        const keytar = keytarModule.default || keytarModule;
        const SERVICE = 'hi-there-project-09-ai';
        const ACCOUNT = (cs && cs.id) ? String(cs.id) : 'default';
        const stored = await keytar.getPassword(SERVICE, ACCOUNT);
        secureHas = !!stored;
      } catch (err) {
        // keytar not available
      }
      return { success: true, inDB: dbHas, inSecureStore: secureHas };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Clear API key from secure store and (optionally) from DB. If removeFromDB true, will null out the DB copy.
  ipcMain.handle('llm:clear-key', async (event, { removeFromDB = false } = {}) => {
    try {
      const cs = await db.getCompanySettings();
      if (cs) {
        try {
          const keytarModule = await import('keytar');
          const keytar = keytarModule.default || keytarModule;
          const SERVICE = 'hi-there-project-09-ai';
          const ACCOUNT = (cs && cs.id) ? String(cs.id) : 'default';
          await keytar.deletePassword(SERVICE, ACCOUNT);
        } catch (err) {
          console.warn('LLM: Failed to clear key from secure store (or keytar missing)', err);
        }

        if (removeFromDB) {
          try {
            const updated = { ...(cs || {}), ai: { ...(cs.ai || {}), remote: { ...(cs.ai?.remote || {}), apiKey: null, storedInSecureStore: false } } };
            if (cs.id && db.updateCompanySettings) {
              await db.updateCompanySettings(cs.id, updated);
            }
          } catch (err) {
            console.warn('LLM: Failed to clear API key from DB', err);
          }
        }
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
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

  // --- Backup Scheduler IPC Handlers ---
  ipcMain.handle('backup:getStatus', () => {
    return backupScheduler.getStatus();
  });

  ipcMain.handle('backup:triggerManual', async (event, options) => {
    return await backupScheduler.triggerManualBackup(options);
  });

  ipcMain.handle('backup:setEnabled', (event, enabled) => {
    backupScheduler.setEnabled(enabled);
    return { success: true };
  });

  ipcMain.handle('backup:setRetention', (event, days) => {
    backupScheduler.setRetentionDays(days);
    return { success: true };
  });

  ipcMain.handle('backup:listBackups', () => {
    return backupScheduler.listBackups();
  });

  ipcMain.handle('backup:checkNAS', async () => {
    return await backupScheduler.checkNASAccessibility();
  });

  ipcMain.handle('backup:readBackupFile', async (event, filePath) => {
    return await backupScheduler.readBackupFile(filePath);
  });

  ipcMain.handle('backup:setNASPath', (event, nasPath) => {
    backupScheduler.setNASPath(nasPath);
    return { success: true };
  });


  // 7. Create the browser window
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
    show: false, // Don't show until ready-to-show
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

  // Remove the default menu
  mainWindow.setMenu(null);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // When the main window is ready to show, close the splash screen
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
    }, 1000); // Small extra delay for smooth transition
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

// Handle the "Check-In" process on quit
app.on('before-quit', (event) => {
  console.log('Starting shutdown process...');

  // Stop LLM server first
  try {
    console.log('Shutting down LLM server...');
    if (typeof llmManager !== 'undefined' && llmManager) {
      llmManager.stop();
      console.log('✓ LLM server stopped');
    } else {
      console.log('No LLM manager instance available to stop.');
    }
  } catch (err) {
    console.error('Error stopping LLM server:', err);
  }

  // Stop backup scheduler
  try {
    console.log('Stopping backup scheduler...');
    backupScheduler.stop();
    console.log('✓ Backup scheduler stopped');
  } catch (err) {
    console.error('Error stopping backup scheduler:', err);
  }

  // Sync database back to master
  // Note: Sync is now handled async during mutations. We skip explicit sync here to avoid hanging shutdown.
  // If needed, implement properly using app.preventDefault() to wait for async operations.
  if (syncManager) {
    console.log('Check-in: Sync handled by mutation events.');
  }

  // Release lock if locking is enabled
  if (config.enableLocking && fs.existsSync(lockFilePath)) {
    try {
      fs.unlinkSync(lockFilePath);
      console.log('✓ Database lock released.');
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  }
});

// Also attempt a sync on will-quit for extra safety
app.on('will-quit', () => {
  // Cleanup or final logs
  console.log('App is quitting...');
});


