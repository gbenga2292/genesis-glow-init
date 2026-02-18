// Auto Updater Module for Electron
// Uses electron-updater for automatic updates from GitHub Releases

import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Disable auto-download by default (user controls when to download)
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;

/**
 * Initialize the auto-updater with the main window reference
 * @param {BrowserWindow} win - The main browser window
 */
export function initAutoUpdater(win) {
  mainWindow = win;

  // Forward update events to renderer
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update-checking');
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update-available', info);
    log.info('Update available:', info.version);
  });

  autoUpdater.on('update-not-available', (info) => {
    sendToRenderer('update-not-available', info);
    log.info('Update not available. Current version is up to date.');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    sendToRenderer('download-progress', {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
    log.info(`Download progress: ${progressObj.percent.toFixed(1)}%`);
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendToRenderer('update-downloaded', info);
    log.info('Update downloaded:', info.version);
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('update-error', { message: err.message });
    log.error('Update error:', err);
  });

  // Setup IPC handlers
  setupIpcHandlers();

  log.info('Auto-updater initialized');
}

/**
 * Send message to renderer process
 */
function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(`auto-updater:${channel}`, data);
  }
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  // Check for updates
  ipcMain.handle('auto-updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      log.error('Check for updates failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Download update
  ipcMain.handle('auto-updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      log.error('Download update failed:', error);
      return { success: false, error: error.message };
    }
  });

  // Quit and install
  ipcMain.handle('auto-updater:quit-and-install', () => {
    log.info('Quitting and installing update...');
    autoUpdater.quitAndInstall(false, true);
  });

  // Get current version
  ipcMain.handle('auto-updater:get-version', () => {
    const { app } = require('electron');
    return app.getVersion();
  });
}

/**
 * Manually trigger update check
 */
export async function checkForUpdates() {
  try {
    return await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Manual update check failed:', error);
    throw error;
  }
}

export default {
  initAutoUpdater,
  checkForUpdates
};
