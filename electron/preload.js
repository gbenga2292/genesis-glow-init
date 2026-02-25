const { contextBridge, ipcRenderer } = require('electron');

// Expose minimal window controls
contextBridge.exposeInMainWorld('electronAPI', {
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
        toggleDevTools: () => ipcRenderer.invoke('window:toggleDevTools'),
        updateTitleBarOverlay: (options) => ipcRenderer.invoke('window:update-title-bar-overlay', options)
    },
    onDeepLink: (callback) => ipcRenderer.on('deep-link', (event, url) => callback(url)),
    showNotification: (options) => ipcRenderer.invoke('show-notification', options),
    signalDataLoaded: () => ipcRenderer.send('app-data-loaded'),

    // ─── Auto-Updater Bridge ───────────────────────────────────────────────────
    // These expose electron-updater events & commands from main.js to the React app.
    autoUpdater: {
        // Commands (React → Main)
        checkForUpdates: () => ipcRenderer.invoke('updater:check'),
        downloadUpdate: () => ipcRenderer.invoke('updater:download'),
        quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
        getAppVersion: () => ipcRenderer.invoke('updater:getVersion'),

        // Events (Main → React) — each returns a cleanup function
        onUpdateAvailable: (callback) => {
            const handler = (event, info) => callback(info);
            ipcRenderer.on('updater:update-available', handler);
            return () => ipcRenderer.removeListener('updater:update-available', handler);
        },
        onUpdateNotAvailable: (callback) => {
            const handler = (event, info) => callback(info);
            ipcRenderer.on('updater:update-not-available', handler);
            return () => ipcRenderer.removeListener('updater:update-not-available', handler);
        },
        onDownloadProgress: (callback) => {
            const handler = (event, progress) => callback(progress);
            ipcRenderer.on('updater:download-progress', handler);
            return () => ipcRenderer.removeListener('updater:download-progress', handler);
        },
        onUpdateDownloaded: (callback) => {
            const handler = (event, info) => callback(info);
            ipcRenderer.on('updater:update-downloaded', handler);
            return () => ipcRenderer.removeListener('updater:update-downloaded', handler);
        },
        onError: (callback) => {
            const handler = (event, err) => callback(err);
            ipcRenderer.on('updater:error', handler);
            return () => ipcRenderer.removeListener('updater:error', handler);
        },
    }
});
