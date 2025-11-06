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
    'getCompanySettings', 'updateCompanySettings',
    'getSiteTransactions', 'addSiteTransaction', 'updateSiteTransaction', 'deleteSiteTransaction',
    'getActivities', 'createActivity', 'clearActivities',
'createWaybillWithTransaction', 'processReturnWithTransaction', 'sendToSiteWithTransaction', 'deleteWaybillWithTransaction', 'updateWaybillWithTransaction',
    'getDatabaseInfo', 'wipeLocalDatabase'
];

// Dynamically create an API object for the frontend
const dbAPI = {};
for (const functionName of dbFunctions) {
    dbAPI[functionName] = (...args) => ipcRenderer.invoke(`db:${functionName}`, ...args);
}

// Expose the entire API on window.db
contextBridge.exposeInMainWorld('db', dbAPI);
