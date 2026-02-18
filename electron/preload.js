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
    signalDataLoaded: () => ipcRenderer.send('app-data-loaded')
});
