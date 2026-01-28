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
    'getConsumableLogs', 'createConsumableLog', 'updateConsumableLog', 'deleteConsumableLog',
    'getCompanySettings', 'createCompanySettings', 'updateCompanySettings',
    'getSiteTransactions', 'addSiteTransaction', 'updateSiteTransaction', 'deleteSiteTransaction',
    'getActivities', 'createActivity', 'clearActivities',
    'getMetricsSnapshots', 'getTodayMetricsSnapshot', 'createMetricsSnapshot',
    'createWaybillWithTransaction', 'processReturnWithTransaction', 'sendToSiteWithTransaction', 'deleteWaybillWithTransaction', 'updateWaybillWithTransaction',
    'getSavedApiKeys', 'createSavedApiKey', 'updateSavedApiKey', 'setActiveApiKey', 'deleteSavedApiKey', 'getActiveApiKey',
    'migrateSavedKeysToKeytar', 'getApiKeyFromKeyRef',
    'getDatabaseInfo', 'wipeLocalDatabase'
];

// Dynamically create an API object for the frontend
const dbAPI = {};
for (const functionName of dbFunctions) {
    dbAPI[functionName] = (...args) => ipcRenderer.invoke(`db:${functionName}`, ...args);
}

// Expose the entire API on window.db
contextBridge.exposeInMainWorld('db', dbAPI);

// Expose sync APIs
contextBridge.exposeInMainWorld('electronAPI', {
  getSyncStatus: () => ipcRenderer.invoke('sync:getStatus'),
  manualSync: () => ipcRenderer.invoke('sync:manualSync'),
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
