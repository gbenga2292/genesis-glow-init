import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeDatabase } from './databaseSetup.js';
import { migrateDatabase } from './migrateDatabase.js';
import * as db from './database.js';
import config, { getDatabasePath } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function main() {
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
  const syncLocalToMaster = () => {
    try {
      fs.copyFileSync(localDbPath, masterDbPath);
      console.log('✓ Database synced back to master storage.');
    } catch (error) {
      console.error('Failed to sync database back to master:', error);
    }
  };

  for (const functionName of Object.keys(db)) {
    if (typeof db[functionName] === 'function' && functionName !== 'connect' && functionName !== 'disconnect') {
      ipcMain.handle(`db:${functionName}`, async (event, ...args) => {
        try {
          const result = await db[functionName](...args);
          if (isMutatingOperation(functionName)) {
            // Persist changes immediately to master storage
            syncLocalToMaster();
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
  
  console.log('IPC handlers registered.');

  // --- LLM IPC Handlers ---
  ipcMain.handle('llm:status', async () => {
    return {
      available: !!config.llamaBinaryPath || !!config.llamaLocalHttpUrl,
      binaryPath: config.llamaBinaryPath || null,
      localHttpUrl: config.llamaLocalHttpUrl || null
    };
  });

  ipcMain.handle('llm:configure', async (event, newCfg) => {
    // Note: this is a lightweight runtime configure; persistent storage should be done via settings
    if (newCfg.llamaBinaryPath !== undefined) config.llamaBinaryPath = newCfg.llamaBinaryPath;
    if (newCfg.llamaModelPath !== undefined) config.llamaModelPath = newCfg.llamaModelPath;
    if (newCfg.llamaArgs !== undefined) config.llamaArgs = newCfg.llamaArgs;
    if (newCfg.llamaLocalHttpUrl !== undefined) config.llamaLocalHttpUrl = newCfg.llamaLocalHttpUrl;
    return { success: true };
  });

  ipcMain.handle('llm:generate', async (event, { prompt, options = {} } = {}) => {
    if (!prompt) return { success: false, error: 'No prompt provided' };

    // Prefer local HTTP wrapper if configured
    if (config.llamaLocalHttpUrl) {
      try {
        const res = await fetch(config.llamaLocalHttpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, options })
        });
        const data = await res.json();
        return { success: true, text: data.text || data.output || JSON.stringify(data), raw: data };
      } catch (err) {
        console.error('Local HTTP LLM request failed', err);
        // fall through to binary spawn attempt
      }
    }

    // Next: try spawning configured binary
    if (config.llamaBinaryPath) {
      return new Promise((resolve) => {
        try {
          const args = Array.isArray(config.llamaArgs) ? config.llamaArgs.slice() : [];
          // If a model path exists, add a conventional flag for wrappers that accept it
          if (config.llamaModelPath && !args.includes('--model')) {
            args.push('--model', config.llamaModelPath);
          }

          // Give wrapper the prompt via stdin (many wrappers consume stdin)
          const child = spawn(config.llamaBinaryPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

          let stdout = '';
          let stderr = '';
          let hasResolved = false;

          // Set a timeout of 60 seconds for LLM response
          const timeoutHandle = setTimeout(() => {
            if (!hasResolved) {
              hasResolved = true;
              console.warn('LLM process timeout after 60s');
              child.kill('SIGTERM');
              // Give it 5 seconds to die gracefully, then force kill
              setTimeout(() => {
                if (child.exitCode === null) {
                  child.kill('SIGKILL');
                }
              }, 5000);
              resolve({ success: false, error: 'LLM timeout (>60s) - process killed' });
            }
          }, 60000);

          child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
          });

          child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
          });

          child.on('error', (err) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeoutHandle);
              console.error('LLM child error', err);
              resolve({ success: false, error: err.message });
            }
          });

          child.on('close', (code) => {
            if (!hasResolved) {
              hasResolved = true;
              clearTimeout(timeoutHandle);
              if (code === 0 || stdout.length > 0) {
                resolve({ success: true, text: stdout.trim(), rawStdout: stdout, rawStderr: stderr });
              } else {
                resolve({ success: false, error: `LLM process exited with code ${code}`, rawStderr: stderr });
              }
            }
          });

          // Write prompt to stdin and close
          try {
            child.stdin.write(prompt);
            child.stdin.end();
          } catch (err) {
            console.warn('Failed to write prompt to LLM stdin', err);
            hasResolved = true;
            clearTimeout(timeoutHandle);
            resolve({ success: false, error: err.message });
          }
        } catch (err) {
          console.error('Failed to spawn local LLM', err);
          resolve({ success: false, error: err.message });
        }
      });
    }

    return { success: false, error: 'No local LLM configured (binary or HTTP URL)' };
  });


  // 7. Create the browser window
  createWindow();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../public/favicon.ico')
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(main);

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
  
  try {
    console.log('Copying local database back to master...');
    fs.copyFileSync(localDbPath, masterDbPath);
    console.log('✓ Database successfully synced back to:', DB_PATH);
  } catch (error) {
    console.error('CRITICAL: Failed to copy database back!', error);
    dialog.showErrorBox('Sync Error', `Failed to save changes back to the database location. Your local changes are safe at: ${localDbPath}`);
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
  try {
    fs.copyFileSync(localDbPath, masterDbPath);
    console.log('✓ Database synced on will-quit.');
  } catch (error) {
    console.error('Failed to sync database on will-quit:', error);
  }
});


