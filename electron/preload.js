const { contextBridge, ipcRenderer } = require('electron');

// A list of all functions exported from electron/database.js
const dbFunctions = [
    'login', 'createUser', 'updateUser', 'deleteUser', 'getUsers',
    'getSites', 'getSiteById', 'createSite', 'updateSite', 'deleteSite',
    'getEmployees', 'createEmployee', 'updateEmployee', 'deleteEmployee',
    'getVehicles', 'createVehicle', 'updateVehicle', 'deleteVehicle',
    'getAssets', 'createAsset', 'addAsset', 'updateAsset', 'deleteAsset',
    'getWaybills', 'createWaybill', 'createReturnWaybill', 'updateWaybill', 'deleteWaybill',
    'getWaybillItems', 'createWaybillItem', 'updateWaybillItem', 'deleteWaybillItem',
    'getQuickCheckouts', 'createQuickCheckout', 'updateQuickCheckout', 'deleteQuickCheckout',
    'getReturnBills', 'createReturnBill', 'updateReturnBill', 'deleteReturnBill',
    'getReturnItems', 'createReturnItem', 'updateReturnItem', 'deleteReturnItem',
    'getEquipmentLogs', 'createEquipmentLog', 'updateEquipmentLog', 'deleteEquipmentLog',
    'getMaintenanceLogs', 'createMaintenanceLog', 'updateMaintenanceLog', 'deleteMaintenanceLog',
    'getConsumableLogs', 'createConsumableLog', 'updateConsumableLog', 'deleteConsumableLog',
    'getCompanySettings', 'createCompanySettings', 'updateCompanySettings',
    'getSiteTransactions', 'addSiteTransaction', 'updateSiteTransaction', 'deleteSiteTransaction',
    'getActivities', 'createActivity', 'clearActivities',
    'getMetricsSnapshots', 'getTodayMetricsSnapshot', 'createMetricsSnapshot',
    'createWaybillWithTransaction', 'processReturnWithTransaction', 'sendToSiteWithTransaction', 'deleteWaybillWithTransaction', 'updateWaybillWithTransaction',
    'getSavedApiKeys', 'createSavedApiKey', 'updateSavedApiKey', 'setActiveApiKey', 'deleteSavedApiKey', 'getActiveApiKey',
    'migrateSavedKeysToKeytar', 'getApiKeyFromKeyRef',
    'createJsonBackup', 'restoreJsonBackup', 'createDatabaseBackup', 'restoreDatabaseBackup',
    'getDatabaseInfo', 'wipeLocalDatabase', 'clearTable'
];

// Dynamically create an API object for the frontend
const dbAPI = {};
for (const functionName of dbFunctions) {
    dbAPI[functionName] = (...args) => ipcRenderer.invoke(`db:${functionName}`, ...args);
}

// Expose everything via a single electronAPI (IPC) namespace
contextBridge.exposeInMainWorld('electronAPI', {
    // Database operations grouped under .db
    db: dbAPI,

    // Sync APIs
    getSyncStatus: () => ipcRenderer.invoke('sync:getStatus'),
    manualSync: () => ipcRenderer.invoke('sync:manualSync'),

    // Window controls
    window: {
        minimize: () => ipcRenderer.invoke('window:minimize'),
        maximize: () => ipcRenderer.invoke('window:maximize'),
        close: () => ipcRenderer.invoke('window:close'),
        isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
        toggleDevTools: () => ipcRenderer.invoke('window:toggleDevTools'),
    },

    // Logging
    log: (level, message, data) => ipcRenderer.send('log-message', { level, message, data }),
});

// Expose Backup Scheduler API
contextBridge.exposeInMainWorld('backupScheduler', {
    getStatus: () => ipcRenderer.invoke('backup:getStatus'),
    triggerManual: (options) => ipcRenderer.invoke('backup:triggerManual', options),
    save: (data) => ipcRenderer.invoke('backup:save', data),
    setEnabled: (enabled) => ipcRenderer.invoke('backup:setEnabled', enabled),
    setRetention: (days) => ipcRenderer.invoke('backup:setRetention', days),
    listBackups: () => ipcRenderer.invoke('backup:listBackups'),
    checkNAS: () => ipcRenderer.invoke('backup:checkNAS'),
    setNASPath: (nasPath) => ipcRenderer.invoke('backup:setNASPath', nasPath),
    readBackupFile: (filePath) => ipcRenderer.invoke('backup:readBackupFile', filePath),
    onAutoBackupTrigger: (callback) => ipcRenderer.on('backup:auto-trigger', (event, ...args) => callback(...args)),
});

// Expose Local LLM API (Bundled Runtime)
const llmAPI = {
    generate: (payload) => ipcRenderer.invoke('llm:generate', payload),
    status: () => ipcRenderer.invoke('llm:status'),
    configure: (cfg) => ipcRenderer.invoke('llm:configure', cfg),
    start: () => ipcRenderer.invoke('llm:start'),
    stop: () => ipcRenderer.invoke('llm:stop'),
    restart: () => ipcRenderer.invoke('llm:restart')
};

// Expose migration & key management helpers
llmAPI.migrateKeys = () => ipcRenderer.invoke('llm:migrate-keys');
llmAPI.getKeyStatus = () => ipcRenderer.invoke('llm:get-key-status');
llmAPI.clearKey = (opts) => ipcRenderer.invoke('llm:clear-key', opts || {});

contextBridge.exposeInMainWorld('llm', llmAPI);
