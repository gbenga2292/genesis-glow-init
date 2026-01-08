import knex from 'knex';
import bcrypt from 'bcrypt';
import path from 'path';
import os from 'os';
import {
  transformAssetFromDB,
  transformAssetToDB,
  transformSiteFromDB,
  transformSiteToDB,
  transformEmployeeFromDB,
  transformEmployeeToDB,
  transformCompanySettingsFromDB,
  transformCompanySettingsToDB,
  transformEquipmentLogFromDB,
  transformEquipmentLogToDB,
  transformConsumableLogFromDB,
  transformConsumableLogToDB,
  transformWaybillFromDB,
  transformWaybillToDB,
  transformSiteTransactionToDB,
  transformSiteTransactionFromDB,
  transformActivityFromDB,
  transformActivityToDB,
  transformQuickCheckoutFromDB,
  transformQuickCheckoutToDB,
  transformMaintenanceLogFromDB,
  transformMaintenanceLogToDB
} from './dataTransform.js';
import { calculateAvailableQuantity } from './utils/assetCalculations.js';

let db;

// This function is called from main.js to connect to the LOCAL database copy
function connect(localDbPath) {
  db = knex({
    client: 'better-sqlite3',
    connection: {
      filename: localDbPath,
    },
    useNullAsDefault: true,
  });
  console.log('Connected to local database:', localDbPath);
}

// This function is called from main.js on shutdown
function disconnect() {
  if (db) {
    db.destroy();
    console.log('Database connection destroyed.');
  }
}

// --- AUTHENTICATION ---
async function login(username, password) {
  if (!db) throw new Error('Database not connected');
  const user = await db('users').where({ username }).first();
  if (!user) {
    return { success: false, message: 'Invalid credentials' };
  }
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (isValid) {
    // Don't send the password hash to the frontend
    const userWithoutHash = { ...user };
    delete userWithoutHash.password_hash;
    return { success: true, user: userWithoutHash };
  }
  return { success: false, message: 'Invalid credentials' };
}

async function createUser(userData) {
  if (!db) throw new Error('Database not connected');
  const { username, password, role, name } = userData;

  const existingUser = await db('users').where({ username }).first();
  if (existingUser) {
    return { success: false, message: 'Username already exists' };
  }

  const saltRounds = 10;
  const password_hash = await bcrypt.hash(password, saltRounds);

  const [newUser] = await db('users').insert({ username, password_hash, role, name }).returning('*');
  const userWithoutHash = { ...newUser };
  delete userWithoutHash.password_hash;
  return { success: true, user: userWithoutHash };
}

async function updateUser(userId, userData) {
  if (!db) throw new Error('Database not connected');
  const { name, username, role, password } = userData;

  // Check if username is already taken by another user
  if (username) {
    const existingUser = await db('users').where({ username }).whereNot({ id: userId }).first();
    if (existingUser) {
      return { success: false, message: 'Username already exists' };
    }
  }

  const updateData = { name, username, role };
  if (password) {
    const saltRounds = 10;
    updateData.password_hash = await bcrypt.hash(password, saltRounds);
  }

  const updatedRows = await db('users').where({ id: userId }).update(updateData);
  if (updatedRows > 0) {
    const updatedUser = await db('users').where({ id: userId }).first();
    const userWithoutHash = { ...updatedUser };
    delete userWithoutHash.password_hash;
    return { success: true, user: userWithoutHash };
  } else {
    return { success: false, message: 'User not found' };
  }
}

async function deleteUser(userId) {
  if (!db) throw new Error('Database not connected');
  // Prevent deleting the admin user
  const user = await db('users').where({ id: userId }).first();
  if (!user) {
    return { success: false, message: 'User not found' };
  }
  if (user.username === 'admin') {
    return { success: false, message: 'Cannot delete admin user' };
  }

  const deletedRows = await db('users').where({ id: userId }).del();
  if (deletedRows > 0) {
    return { success: true };
  } else {
    return { success: false, message: 'Failed to delete user' };
  }
}

// --- GENERIC CRUD HELPERS ---
const getAll = (tableName) => () => {
  if (!db) throw new Error('Database not connected');
  return db(tableName).select('*');
}

const getById = (tableName) => (id) => {
  if (!db) throw new Error('Database not connected');
  return db(tableName).where({ id }).first();
}

const create = (tableName) => (data) => {
  if (!db) throw new Error('Database not connected');
  return db(tableName).insert(data).returning('*');
}

const update = (tableName) => (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db(tableName).where({ id }).update(data).returning('*');
}

const remove = (tableName) => (id) => {
  if (!db) throw new Error('Database not connected');
  return db(tableName).where({ id }).del();
}

const clearTable = (tableName) => async () => {
  if (!db) throw new Error('Database not connected');
  return db(tableName).del();
}




// Declare all functions as constants before exporting
const getUsers = getAll('users');
const getSites = () => {
  if (!db) throw new Error('Database not connected');
  return db('sites').select('*').then(sites => sites.map(transformSiteFromDB));
}

const getSiteById = getById('sites');

const createSite = (data) => {
  if (!db) throw new Error('Database not connected');
  return db('sites').insert(transformSiteToDB(data)).returning('*').then(rows => rows.map(transformSiteFromDB));
}

const updateSite = (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db('sites').where({ id }).update(transformSiteToDB(data)).returning('*').then(rows => rows.map(transformSiteFromDB));
}

const deleteSite = remove('sites');
const getEmployees = () => {
  if (!db) throw new Error('Database not connected');
  return db('employees').select('*').then(employees => employees.map(transformEmployeeFromDB));
}

const createEmployee = (data) => {
  if (!db) throw new Error('Database not connected');
  return db('employees').insert(transformEmployeeToDB(data)).returning('*').then(rows => rows.map(transformEmployeeFromDB));
}

const updateEmployee = (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db('employees').where({ id }).update(transformEmployeeToDB(data)).returning('*').then(rows => rows.map(transformEmployeeFromDB));
}

const deleteEmployee = remove('employees');
const getVehicles = getAll('vehicles');
const createVehicle = create('vehicles');
const updateVehicle = update('vehicles');
const deleteVehicle = remove('vehicles');

const getAssets = () => {
  if (!db) throw new Error('Database not connected');
  return db('assets').select('*').then(assets => assets.map(transformAssetFromDB));
}

const createAsset = (data) => {
  if (!db) throw new Error('Database not connected');
  return db('assets').insert(transformAssetToDB(data)).returning('*').then(rows => rows.map(transformAssetFromDB));
}

const addAsset = createAsset;

const updateAsset = (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db('assets').where({ id }).update(transformAssetToDB(data)).returning('*').then(rows => rows.map(transformAssetFromDB));
}

const deleteAsset = remove('assets');
const getWaybills = () => {
  if (!db) throw new Error('Database not connected');
  return db('waybills').select('*').then(waybills => waybills.map(transformWaybillFromDB));
}

const createWaybill = async (data, options = {}) => {
  if (!db) throw new Error('Database not connected');

  // Use the transaction operations module for proper waybill creation
  const { createWaybillTransaction } = await import('./transactionOperations.js');
  const result = await createWaybillTransaction(db, data, options);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create waybill');
  }

  // Fetch and return the created waybill
  const waybill = await db('waybills').where({ id: result.waybillId }).first();
  return transformWaybillFromDB(waybill);
}

const updateWaybill = (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db('waybills').where({ id }).update(transformWaybillToDB(data)).returning('*').then(rows => rows.map(transformWaybillFromDB));
}

const deleteWaybill = async (id) => {
  if (!db) throw new Error('Database not connected');

  const trx = await db.transaction();
  try {
    console.log(`Attempting to delete waybill ${id}`);

    // Get waybill
    const waybill = await trx('waybills').where({ id }).first();
    if (!waybill) {
      console.log(`Waybill ${id} not found in database`);
      throw new Error('Waybill not found');
    }

    console.log(`Found waybill ${id} with status ${waybill.status}`);

    // Parse items
    const items = typeof waybill.items === 'string' ? JSON.parse(waybill.items) : waybill.items;
    console.log(`Waybill has ${items.length} items`);

    // Unreserve assets if waybill is outstanding
    if (waybill.status === 'outstanding') {
      console.log('Unreserving assets for outstanding waybill');
      for (const item of items) {
        const assetId = parseInt(item.assetId);
        const asset = await trx('assets').where({ id: assetId }).first();

        if (asset) {
          const currentReserved = asset.reserved_quantity || 0;
          const newReserved = Math.max(0, currentReserved - item.quantity);
          const currentDamaged = asset.damaged_count || 0;
          const currentMissing = asset.missing_count || 0;
          // Available = quantity - reserved - damaged - missing
          const newAvailable = calculateAvailableQuantity(asset.quantity, newReserved, currentDamaged, currentMissing);

          console.log(`Asset ${assetId}: unreserving ${item.quantity}, reserved ${currentReserved} -> ${newReserved}`);

          await trx('assets')
            .where({ id: assetId })
            .update({
              reserved_quantity: newReserved,
              available_quantity: newAvailable
            });
        }
      }
    } else if (waybill.status === 'sent_to_site') {
      console.log('Removing site quantities for sent_to_site waybill');
      // If sent to site, remove from site quantities
      for (const item of items) {
        const assetId = parseInt(item.assetId);
        const asset = await trx('assets').where({ id: assetId }).first();

        if (asset) {
          const currentReserved = asset.reserved_quantity || 0;
          const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
          const currentSiteQty = siteQuantities[waybill.siteId] || 0;
          siteQuantities[waybill.siteId] = Math.max(0, currentSiteQty - item.quantity);

          const currentDamaged = asset.damaged_count || 0;
          const currentMissing = asset.missing_count || 0;
          // Available = quantity - reserved - damaged - missing
          const newAvailable = calculateAvailableQuantity(asset.quantity, currentReserved, currentDamaged, currentMissing);

          console.log(`Asset ${assetId}: removing ${item.quantity} from site, site qty ${currentSiteQty} -> ${siteQuantities[waybill.siteId]}`);

          await trx('assets')
            .where({ id: assetId })
            .update({
              site_quantities: JSON.stringify(siteQuantities),
              available_quantity: newAvailable
            });
        }
      }

      // Delete site transactions
      await trx('site_transactions').where({ reference_id: id, reference_type: 'waybill' }).del();
      console.log('Deleted site transactions');
    }

    // Delete waybill
    const deletedCount = await trx('waybills').where({ id }).del();
    console.log(`Deleted ${deletedCount} waybill record(s)`);

    await trx.commit();
    console.log(`Waybill ${id} deletion committed successfully`);
    return deletedCount;
  } catch (error) {
    await trx.rollback();
    console.error('Waybill deletion failed:', error);
    throw error;
  }
}
const getWaybillItems = getAll('waybill_items');
const createWaybillItem = create('waybill_items');
const updateWaybillItem = update('waybill_items');
const deleteWaybillItem = remove('waybill_items');
const getQuickCheckouts = () => {
  if (!db) throw new Error('Database not connected');
  return db('quick_checkouts')
    .leftJoin('assets', 'quick_checkouts.asset_id', 'assets.id')
    .leftJoin('employees', 'quick_checkouts.employee_id', 'employees.id')
    .select(
      'quick_checkouts.*',
      'assets.name as asset_name',
      'employees.name as employee_name'
    )
    .then(checkouts => checkouts.map(transformQuickCheckoutFromDB));
}
const createQuickCheckout = async (data) => {
  if (!db) throw new Error('Database not connected');

  // We need to resolve employee name to employee_id if possible
  // For now, let's try to find the employee by name
  let employeeId = null;
  if (data.employee) {
    const emp = await db('employees').where({ name: data.employee }).first();
    if (emp) {
      employeeId = emp.id;
    }
  }

  const dbData = transformQuickCheckoutToDB(data);
  if (employeeId) {
    dbData.employee_id = employeeId;
  }

  // Remove id, created_at, updated_at for creation
  delete dbData.id;
  delete dbData.created_at;
  delete dbData.updated_at;

  return db('quick_checkouts').insert(dbData).returning('*').then(rows => rows.map(transformQuickCheckoutFromDB));
}

const updateQuickCheckout = (id, data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformQuickCheckoutToDB(data);

  // Remove id and created_at
  delete dbData.id;
  delete dbData.created_at;

  if (!dbData.updated_at) {
    dbData.updated_at = new Date().toISOString();
  }

  return db('quick_checkouts').where({ id }).update(dbData).returning('*').then(rows => rows.map(transformQuickCheckoutFromDB));
}

const deleteQuickCheckout = remove('quick_checkouts');
const getReturnBills = getAll('return_bills');
const createReturnBill = create('return_bills');
const updateReturnBill = update('return_bills');
const deleteReturnBill = remove('return_bills');
const getReturnItems = getAll('return_items');
const createReturnItem = create('return_items');
const updateReturnItem = update('return_items');
const deleteReturnItem = remove('return_items');
const getEquipmentLogs = () => {
  if (!db) throw new Error('Database not connected');
  return db('equipment_logs').select('*').then(logs => logs.map(transformEquipmentLogFromDB));
}

const createEquipmentLog = (data) => {
  if (!db) throw new Error('Database not connected');

  // Validate that the equipment exists before inserting
  const equipmentExists = db('assets').where({ id: data.equipmentId }).first();
  if (!equipmentExists) {
    throw new Error(`Cannot create equipment log: Asset with id ${data.equipmentId} does not exist`);
  }

  const dbData = transformEquipmentLogToDB(data);
  // Remove id, created_at, and updated_at for creation - let DB handle them
  delete dbData.id;
  delete dbData.created_at;
  delete dbData.updated_at;
  return db('equipment_logs').insert(dbData).returning('*').then(rows => rows.map(transformEquipmentLogFromDB));
}

const updateEquipmentLog = (id, data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformEquipmentLogToDB(data);
  // Remove id and created_at for updates, keep updated_at
  delete dbData.id;
  delete dbData.created_at;
  // Set updated_at to now if not provided
  if (!dbData.updated_at) {
    dbData.updated_at = new Date().toISOString();
  }
  return db('equipment_logs').where({ id }).update(dbData).returning('*').then(rows => rows.map(transformEquipmentLogFromDB));
}

const deleteEquipmentLog = remove('equipment_logs');

// --- CONSUMABLE LOGS ---
const getConsumableLogs = () => {
  if (!db) throw new Error('Database not connected');
  return db('consumable_logs').select('*').then(logs => logs.map(transformConsumableLogFromDB));
}

const createConsumableLog = (data) => {
  if (!db) throw new Error('Database not connected');

  // Validate that the consumable exists before inserting
  const consumableExists = db('assets').where({ id: data.consumableId }).first();
  if (!consumableExists) {
    throw new Error(`Cannot create consumable log: Asset with id ${data.consumableId} does not exist`);
  }

  const dbData = transformConsumableLogToDB(data);
  // Remove created_at and updated_at for creation - let DB handle them
  delete dbData.created_at;
  delete dbData.updated_at;
  return db('consumable_logs').insert(dbData).returning('*').then(rows => rows.map(transformConsumableLogFromDB));
}

const updateConsumableLog = (id, data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformConsumableLogToDB(data);
  // Remove id and created_at for updates, keep updated_at
  delete dbData.id;
  delete dbData.created_at;
  // Set updated_at to now if not provided
  if (!dbData.updated_at) {
    dbData.updated_at = new Date().toISOString();
  }
  return db('consumable_logs').where({ id }).update(dbData).returning('*').then(rows => rows.map(transformConsumableLogFromDB));
}

const deleteConsumableLog = remove('consumable_logs');

// --- MAINTENANCE LOGS ---
const getMaintenanceLogs = () => {
  if (!db) throw new Error('Database not connected');
  return db('maintenance_logs').select('*').orderBy('date_started', 'desc').then(logs => logs.map(transformMaintenanceLogFromDB));
}

const createMaintenanceLog = (data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformMaintenanceLogToDB(data);
  // Remove created_at and updated_at for creation if relying on defaults, but frontend usually sends them.
  // We'll keep them if provided, or remove if we want DB default.
  // Frontend sends ID, so we keep it.

  return db('maintenance_logs').insert(dbData).returning('*').then(rows => rows.map(transformMaintenanceLogFromDB));
}

const updateMaintenanceLog = (id, data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformMaintenanceLogToDB(data);
  delete dbData.id;
  delete dbData.created_at;
  if (!dbData.updated_at) dbData.updated_at = new Date().toISOString();

  return db('maintenance_logs').where({ id }).update(dbData).returning('*').then(rows => rows.map(transformMaintenanceLogFromDB));
}

const deleteMaintenanceLog = remove('maintenance_logs');

const getCompanySettings = () => {
  if (!db) throw new Error('Database not connected');
  return db('company_settings').first().then(settings => settings ? transformCompanySettingsFromDB(settings) : null);
}

const createCompanySettings = (data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformCompanySettingsToDB(data);
  return db('company_settings').insert(dbData).returning('*').then(rows => rows.map(transformCompanySettingsFromDB));
}

const updateCompanySettings = (id, data) => {
  if (!db) throw new Error('Database not connected');
  // If id is not provided or settings don't exist, try to create instead of update
  if (!id) {
    return createCompanySettings(data);
  }
  return db('company_settings').where({ id }).update(transformCompanySettingsToDB(data)).returning('*').then(rows => {
    // If no rows updated, try to create instead
    if (rows.length === 0) {
      return createCompanySettings(data);
    }
    return rows.map(transformCompanySettingsFromDB);
  });
}

const getSiteTransactions = () => {
  if (!db) throw new Error('Database not connected');
  return db('site_transactions').select('*').then(transactions => transactions.map(transformSiteTransactionFromDB));
};
const addSiteTransaction = create('site_transactions');
const updateSiteTransaction = update('site_transactions');
const deleteSiteTransaction = remove('site_transactions');

// --- ACTIVITIES ---
const getActivities = () => {
  if (!db) throw new Error('Database not connected');
  return db('activities').select('*').orderBy('timestamp', 'desc').limit(1000)
    .then(activities => activities.map(transformActivityFromDB));
}

const createActivity = (data) => {
  if (!db) throw new Error('Database not connected');
  const dbData = transformActivityToDB(data);
  return db('activities').insert(dbData);
}

const clearActivities = () => {
  if (!db) throw new Error('Database not connected');
  return db('activities').del();
}

// --- METRICS SNAPSHOTS ---
const getMetricsSnapshots = (days = 7) => {
  if (!db) throw new Error('Database not connected');
  const date = new Date();
  date.setDate(date.getDate() - days);
  return db('metrics_snapshots')
    .where('snapshot_date', '>=', date.toISOString().split('T')[0])
    .orderBy('snapshot_date', 'asc')
    .select('*');
}

const getTodayMetricsSnapshot = () => {
  if (!db) throw new Error('Database not connected');
  const today = new Date().toISOString().split('T')[0];
  return db('metrics_snapshots')
    .where('snapshot_date', today)
    .first();
}

const createMetricsSnapshot = (data) => {
  if (!db) throw new Error('Database not connected');
  const today = new Date().toISOString().split('T')[0];
  return db('metrics_snapshots')
    .insert({
      snapshot_date: today,
      total_assets: data.total_assets || 0,
      total_quantity: data.total_quantity || 0,
      outstanding_waybills: data.outstanding_waybills || 0,
      outstanding_checkouts: data.outstanding_checkouts || 0,
      out_of_stock: data.out_of_stock || 0,
      low_stock: data.low_stock || 0,
    })
    .onConflict('snapshot_date')
    .merge()
    .returning('*');
}


// --- TRANSACTION OPERATIONS ---

// Create waybill with transaction
const createWaybillWithTransaction = async (waybillData, options = {}) => {
  if (!db) throw new Error('Database not connected');

  const { createWaybillTransaction } = await import('./transactionOperations.js');
  const result = await createWaybillTransaction(db, waybillData, options);

  if (!result.success) {
    throw new Error(result.error || 'Failed to create waybill');
  }

  // Return the created waybill
  const waybill = await db('waybills').where({ id: result.waybillId }).first();
  return { success: true, waybill: transformWaybillFromDB(waybill) };
}

// Send to site with transaction
const sendToSiteWithTransaction = async (waybillId, sentToSiteDate) => {
  if (!db) throw new Error('Database not connected');

  const { sendToSiteTransaction } = await import('./transactionOperations.js');
  const result = await sendToSiteTransaction(db, waybillId);

  if (!result.success) {
    throw new Error(result.error || 'Failed to send waybill to site');
  }

  // Update sent_to_site_date if provided
  if (sentToSiteDate) {
    await db('waybills')
      .where({ id: waybillId })
      .update({ sent_to_site_date: sentToSiteDate });
  }

  return result;
}

// Process return with transaction
const processReturnWithTransaction = async (returnData) => {
  if (!db) throw new Error('Database not connected');

  const { processReturnTransaction } = await import('./transactionOperations.js');
  const result = await processReturnTransaction(db, returnData);

  if (!result.success) {
    throw new Error(result.error || 'Failed to process return');
  }

  return result;
}

// Delete waybill with transaction
const deleteWaybillWithTransaction = async (waybillId) => {
  if (!db) throw new Error('Database not connected');

  const trx = await db.transaction();
  try {
    const waybill = await trx('waybills').where({ id: waybillId }).first();
    if (!waybill) {
      throw new Error('Waybill not found');
    }

    const items = typeof waybill.items === 'string' ? JSON.parse(waybill.items) : waybill.items;

    // Reverse the quantity changes based on waybill status
    for (const item of items) {
      const asset = await trx('assets').where({ id: parseInt(item.assetId) }).first();
      if (!asset) continue;

      if (waybill.status === 'sent_to_site') {
        // Remove from site quantities and add back to available
        const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
        const currentSiteQty = siteQuantities[waybill.siteId] || 0;
        const newSiteQty = Math.max(0, currentSiteQty - item.quantity);

        if (newSiteQty === 0) {
          delete siteQuantities[waybill.siteId];
        } else {
          siteQuantities[waybill.siteId] = newSiteQty;
        }

        const totalSiteQty = Object.values(siteQuantities).reduce((sum, qty) => sum + qty, 0);
        const newAvailable = calculateAvailableQuantity(asset.quantity, (asset.reserved_quantity || 0), (asset.damaged_count || 0), (asset.missing_count || 0));

        await trx('assets')
          .where({ id: parseInt(item.assetId) })
          .update({
            site_quantities: JSON.stringify(siteQuantities),
            available_quantity: newAvailable
          });

        // Delete related site transactions
        await trx('site_transactions')
          .where({ reference_id: waybillId, reference_type: 'waybill' })
          .delete();
      } else if (waybill.status === 'outstanding') {
        // Remove from reserved quantities
        const currentReserved = asset.reserved_quantity || 0;
        const newReserved = Math.max(0, currentReserved - item.quantity);
        const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
        const totalSiteQty = Object.values(siteQuantities).reduce((sum, qty) => sum + qty, 0);
        const newAvailable = calculateAvailableQuantity(asset.quantity, newReserved, (asset.damaged_count || 0), (asset.missing_count || 0));

        await trx('assets')
          .where({ id: parseInt(item.assetId) })
          .update({
            reserved_quantity: newReserved,
            available_quantity: newAvailable
          });
      }
    }

    // Delete the waybill
    await trx('waybills').where({ id: waybillId }).delete();

    await trx.commit();
    return { success: true };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

// Update waybill with transaction
const updateWaybillWithTransaction = async (waybillId, updatedData) => {
  if (!db) throw new Error('Database not connected');

  const trx = await db.transaction();
  try {
    const existingWaybill = await trx('waybills').where({ id: waybillId }).first();
    if (!existingWaybill) {
      throw new Error('Waybill not found');
    }

    const existingItems = typeof existingWaybill.items === 'string' ? JSON.parse(existingWaybill.items) : existingWaybill.items;
    const newItems = Array.isArray(updatedData.items) ? updatedData.items : existingItems;

    // Calculate differences in quantities
    const oldQuantities = new Map();
    existingItems.forEach(item => {
      oldQuantities.set(item.assetId, item.quantity);
    });

    const newQuantities = new Map();
    newItems.forEach(item => {
      newQuantities.set(item.assetId, item.quantity);
    });

    // Update assets based on the differences
    for (const item of newItems) {
      const oldQty = oldQuantities.get(item.assetId) || 0;
      const difference = item.quantity - oldQty;

      if (difference !== 0) {
        const asset = await trx('assets').where({ id: parseInt(item.assetId) }).first();
        if (!asset) continue;

        if (existingWaybill.status === 'sent_to_site') {
          const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
          const currentSiteQty = siteQuantities[existingWaybill.siteId] || 0;
          siteQuantities[existingWaybill.siteId] = Math.max(0, currentSiteQty + difference);

          const totalSiteQty = Object.values(siteQuantities).reduce((sum, qty) => sum + qty, 0);
          const newAvailable = calculateAvailableQuantity(asset.quantity, (asset.reserved_quantity || 0), (asset.damaged_count || 0), (asset.missing_count || 0));

          await trx('assets')
            .where({ id: parseInt(item.assetId) })
            .update({
              site_quantities: JSON.stringify(siteQuantities),
              available_quantity: newAvailable
            });
        } else if (existingWaybill.status === 'outstanding') {
          const currentReserved = asset.reserved_quantity || 0;
          const newReserved = Math.max(0, currentReserved + difference);
          const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
          const totalSiteQty = Object.values(siteQuantities).reduce((sum, qty) => sum + qty, 0);
          const newAvailable = calculateAvailableQuantity(asset.quantity, newReserved, (asset.damaged_count || 0), (asset.missing_count || 0));

          await trx('assets')
            .where({ id: parseInt(item.assetId) })
            .update({
              reserved_quantity: newReserved,
              available_quantity: newAvailable
            });
        }
      }
    }

    // Update the waybill
    const waybillToUpdate = transformWaybillToDB({
      ...updatedData,
      items: newItems,
      updatedAt: new Date()
    });

    await trx('waybills')
      .where({ id: waybillId })
      .update(waybillToUpdate);

    await trx.commit();
    return { success: true };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

const createReturnWaybill = async (data) => {
  if (!db) throw new Error('Database not connected');

  const trx = await db.transaction();
  try {
    console.log('Creating return waybill with data:', data);

    // Generate unique return waybill ID inside transaction to avoid race conditions
    let returnWaybillId;
    let counter = 1;
    while (true) {
      returnWaybillId = `RB${counter.toString().padStart(3, '0')}`;
      const existing = await trx('waybills').where({ id: returnWaybillId }).first();
      if (!existing) break;
      counter++;
      if (counter > 10000) {
        throw new Error('Unable to generate unique return waybill ID after 10000 attempts');
      }
    }

    console.log('Generated return waybill ID:', returnWaybillId);

    // Parse items
    const items = Array.isArray(data.items) ? data.items : [];
    console.log('Return waybill items:', items);

    // Insert return waybill with generated ID
    const returnWaybillToInsert = transformWaybillToDB({
      ...data,
      id: returnWaybillId,
      items: items
    });

    const [newReturnWaybill] = await trx('waybills').insert(returnWaybillToInsert).returning('*');
    console.log('Return waybill inserted:', newReturnWaybill);

    // Group items by assetId to calculate total quantity per asset
    const assetUpdates = new Map();
    for (const item of items) {
      const assetId = parseInt(item.assetId);
      const existing = assetUpdates.get(assetId) || { quantity: 0, damaged: 0, missing: 0 };

      if (item.condition === 'good') {
        existing.quantity += item.quantity;
      } else if (item.condition === 'damaged') {
        existing.damaged += item.quantity;
        existing.quantity += item.quantity; // Still counts toward total reserved reduction
      } else if (item.condition === 'missing') {
        existing.missing += item.quantity;
        existing.quantity += item.quantity; // Still counts toward total reserved reduction
      }

      assetUpdates.set(assetId, existing);
    }

    // Update asset quantities - reduce reserved and site quantities by total, track damaged/missing separately
    for (const [assetId, totals] of assetUpdates.entries()) {
      console.log(`Updating asset ${assetId}: total return=${totals.quantity}, damaged=${totals.damaged}, missing=${totals.missing}`);

      const asset = await trx('assets').where({ id: assetId }).first();
      if (!asset) {
        throw new Error(`Asset with ID ${assetId} not found`);
      }

      console.log('Asset before update:', asset);

      const currentReserved = asset.reserved_quantity || 0;
      const currentDamaged = asset.damaged_count || 0;
      const currentMissing = asset.missing_count || 0;

      // Reduce reserved by total quantity returned (good + damaged + missing)
      const newReserved = currentReserved - totals.quantity;
      const newDamaged = currentDamaged + totals.damaged;
      const newMissing = currentMissing + totals.missing;

      // Reduce site quantities
      const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
      const currentSiteQty = siteQuantities[data.siteId] || 0;
      siteQuantities[data.siteId] = Math.max(0, currentSiteQty - totals.quantity);
      if (siteQuantities[data.siteId] === 0) {
        delete siteQuantities[data.siteId];
      }

      const totalSiteQty = Object.values(siteQuantities).reduce((sum, qty) => sum + qty, 0);
      const newAvailable = asset.quantity - newReserved - newDamaged - newMissing - totalSiteQty;

      console.log(`Asset ${assetId}: reserved ${currentReserved} -> ${newReserved}, site qty ${currentSiteQty} -> ${siteQuantities[data.siteId] || 0}, damaged ${currentDamaged} -> ${newDamaged}, missing ${currentMissing} -> ${newMissing}, available=${newAvailable}`);

      await trx('assets')
        .where({ id: assetId })
        .update({
          reserved_quantity: newReserved,
          site_quantities: JSON.stringify(siteQuantities),
          damaged_count: newDamaged,
          missing_count: newMissing,
          available_quantity: newAvailable
        });

      const assetAfterUpdate = await trx('assets').where({ id: assetId }).first();
      console.log('Asset after update:', assetAfterUpdate);

      console.log(`Asset ${assetId} updated successfully`);
    }

    await trx.commit();
    console.log('Return waybill creation committed successfully');

    return transformWaybillFromDB(newReturnWaybill);
  } catch (error) {
    await trx.rollback();
    console.error('Return waybill creation failed:', error);
    throw error;
  }
}

// --- SAVED API KEYS ---
const getSavedApiKeys = () => {
  if (!db) throw new Error('Database not connected');
  // Ensure table exists (helpful for upgrades / older DBs)
  return ensureSavedApiKeysTable().then(() => db('saved_api_keys').select('*').orderBy('created_at', 'desc'));
};

const createSavedApiKey = (data) => {
  if (!db) throw new Error('Database not connected');
  const { key_name, provider, api_key, endpoint, model } = data;
  return ensureSavedApiKeysTable().then(() => db('saved_api_keys').insert({
    key_name,
    provider,
    api_key,
    endpoint: endpoint || null,
    model: model || null,
    is_active: false
  }).returning('*'));
};

const updateSavedApiKey = (id, data) => {
  if (!db) throw new Error('Database not connected');
  const { key_name, provider, api_key, endpoint, model, is_active } = data;
  return ensureSavedApiKeysTable().then(() => db('saved_api_keys').where({ id }).update({
    key_name,
    provider,
    api_key,
    endpoint: endpoint || null,
    model: model || null,
    is_active,
    updated_at: db.fn.now()
  }).returning('*'));
};

const setActiveApiKey = async (id) => {
  if (!db) throw new Error('Database not connected');
  // First, deactivate all keys
  await ensureSavedApiKeysTable();
  await db('saved_api_keys').update({ is_active: false });
  // Then set the specified key as active
  return db('saved_api_keys').where({ id }).update({ is_active: true, updated_at: db.fn.now() }).returning('*');
};

const deleteSavedApiKey = (id) => {
  if (!db) throw new Error('Database not connected');
  return ensureSavedApiKeysTable().then(() => db('saved_api_keys').where({ id }).del());
};

const getActiveApiKey = () => {
  if (!db) throw new Error('Database not connected');
  return ensureSavedApiKeysTable().then(() => db('saved_api_keys').where({ is_active: true }).first());
};

// Helper: ensure saved_api_keys table exists (used defensively at runtime)
const ensureSavedApiKeysTable = async () => {
  if (!db) throw new Error('Database not connected');
  const exists = await db.schema.hasTable('saved_api_keys');
  if (!exists) {
    await db.schema.createTable('saved_api_keys', (table) => {
      table.increments('id').primary();
      table.string('key_name').notNullable().unique();
      table.string('provider').notNullable();
      table.text('api_key').notNullable();
      table.string('key_ref');
      table.text('endpoint');
      table.string('model');
      table.boolean('is_active').defaultTo(false);
      table.timestamps(true, true);
    });
    console.log('Created missing table: saved_api_keys');
  }
  // Ensure key_ref column exists for older DBs
  const hasKeyRef = await db.schema.hasColumn('saved_api_keys', 'key_ref');
  if (!hasKeyRef) {
    await db.schema.table('saved_api_keys', (t) => {
      t.string('key_ref');
    });
    console.log('Added missing column key_ref to saved_api_keys');
  }
};

// Move plain-text API keys stored in the DB into the OS secure store (keytar)
const migrateSavedKeysToKeytar = async () => {
  if (!db) throw new Error('Database not connected');
  await ensureSavedApiKeysTable();
  // dynamic import keytar to avoid optional dependency at startup
  const keytarModule = await import('keytar');
  const keytar = keytarModule.default || keytarModule;
  const SERVICE = process.env.KEYTAR_SERVICE || 'hi-there-project-09-keys';

  const rows = await db('saved_api_keys').select('*').whereNotNull('api_key');
  for (const row of rows) {
    try {
      const account = `saved_api_key:${row.id}`;
      // store in keytar
      await keytar.setPassword(SERVICE, account, String(row.api_key));
      // update DB: set key_ref and null api_key
      await db('saved_api_keys').where({ id: row.id }).update({ key_ref: account, api_key: null, updated_at: db.fn.now() });
      console.log(`Migrated saved_api_key id=${row.id} into secure store as ${account}`);
    } catch (err) {
      console.error('Failed to migrate saved_api_key id=', row.id, err);
    }
  }
  return { migrated: rows.length };
};

const getApiKeyFromKeyRef = async (keyRef) => {
  if (!keyRef) return null;
  const keytarModule = await import('keytar');
  const keytar = keytarModule.default || keytarModule;
  const SERVICE = process.env.KEYTAR_SERVICE || 'hi-there-project-09-keys';
  return keytar.getPassword(SERVICE, keyRef);
};

// --- BACKUP AND RESTORE FUNCTIONS ---

/**
 * Create a complete JSON backup of all database tables
 * @param {Array<string>} selectedSections - Array of section names to backup
 * @returns {Promise<Object>} Backup data with metadata
 */
const createJsonBackup = async (selectedSections = []) => {
  if (!db) throw new Error('Database not connected');

  const backupData = {
    metadata: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      appVersion: process.env.npm_package_version || '1.0.0',
      sections: selectedSections
    },
    data: {}
  };

  try {
    // Backup each selected section
    if (selectedSections.includes('users')) {
      const users = await db('users').select('id', 'username', 'name', 'role', 'created_at', 'updated_at');
      backupData.data.users = users;
    }

    if (selectedSections.includes('assets')) {
      backupData.data.assets = await db('assets').select('*');
    }

    if (selectedSections.includes('waybills')) {
      backupData.data.waybills = await db('waybills').select('*');
    }

    if (selectedSections.includes('quick_checkouts')) {
      backupData.data.quick_checkouts = await db('quick_checkouts').select('*');
    }

    if (selectedSections.includes('sites')) {
      backupData.data.sites = await db('sites').select('*');
    }

    if (selectedSections.includes('site_transactions')) {
      backupData.data.site_transactions = await db('site_transactions').select('*');
    }

    if (selectedSections.includes('employees')) {
      backupData.data.employees = await db('employees').select('*');
    }

    if (selectedSections.includes('vehicles')) {
      backupData.data.vehicles = await db('vehicles').select('*');
    }

    if (selectedSections.includes('equipment_logs')) {
      backupData.data.equipment_logs = await db('equipment_logs').select('*');
    }

    if (selectedSections.includes('consumable_logs')) {
      backupData.data.consumable_logs = await db('consumable_logs').select('*');
    }

    if (selectedSections.includes('activities')) {
      backupData.data.activities = await db('activities').select('*');
    }

    if (selectedSections.includes('company_settings')) {
      backupData.data.company_settings = await db('company_settings').select('*');
    }

    // Calculate checksum for data integrity
    const dataString = JSON.stringify(backupData.data);
    const crypto = await import('crypto');
    const checksum = crypto.createHash('sha256').update(dataString).digest('hex');
    backupData.metadata.checksum = checksum;

    return { success: true, data: backupData };
  } catch (error) {
    console.error('JSON backup failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Restore data from JSON backup with transaction support
 * @param {Object} backupData - Backup data object
 * @param {Array<string>} selectedSections - Sections to restore
 * @returns {Promise<Object>} Result with success status and errors
 */
const restoreJsonBackup = async (backupData, selectedSections = []) => {
  if (!db) throw new Error('Database not connected');

  // Validate backup data
  if (!backupData || !backupData.metadata || !backupData.data) {
    return { success: false, error: 'Invalid backup file structure' };
  }

  // Verify checksum
  const dataString = JSON.stringify(backupData.data);
  const crypto = await import('crypto');
  const calculatedChecksum = crypto.createHash('sha256').update(dataString).digest('hex');

  if (backupData.metadata.checksum !== calculatedChecksum) {
    return { success: false, error: 'Backup file checksum mismatch - file may be corrupted' };
  }

  const errors = [];
  const trx = await db.transaction();

  try {
    // Restore users (without passwords - they need to be reset)
    if (selectedSections.includes('users') && backupData.data.users) {
      for (const user of backupData.data.users) {
        try {
          // Skip admin user to prevent conflicts
          if (user.username === 'admin') continue;

          const existing = await trx('users').where({ username: user.username }).first();
          if (!existing) {
            // Create with a default password that must be changed
            const bcrypt = await import('bcrypt');
            const defaultPassword = await bcrypt.hash('ChangeMe123!', 10);
            await trx('users').insert({
              ...user,
              password_hash: defaultPassword
            });
          }
        } catch (err) {
          errors.push({ section: 'users', id: user.username, error: err.message });
        }
      }
    }

    // Restore assets
    if (selectedSections.includes('assets') && backupData.data.assets) {
      for (const asset of backupData.data.assets) {
        try {
          const existing = await trx('assets').where({ id: asset.id }).first();
          if (existing) {
            await trx('assets').where({ id: asset.id }).update(asset);
          } else {
            await trx('assets').insert(asset);
          }
        } catch (err) {
          errors.push({ section: 'assets', id: asset.id, error: err.message });
        }
      }
    }

    // Restore sites (must come before waybills)
    if (selectedSections.includes('sites') && backupData.data.sites) {
      for (const site of backupData.data.sites) {
        try {
          const existing = await trx('sites').where({ id: site.id }).first();
          if (existing) {
            await trx('sites').where({ id: site.id }).update(site);
          } else {
            await trx('sites').insert(site);
          }
        } catch (err) {
          errors.push({ section: 'sites', id: site.id, error: err.message });
        }
      }
    }

    // Restore employees (must come before quick_checkouts)
    if (selectedSections.includes('employees') && backupData.data.employees) {
      for (const employee of backupData.data.employees) {
        try {
          const existing = await trx('employees').where({ id: employee.id }).first();
          if (existing) {
            await trx('employees').where({ id: employee.id }).update(employee);
          } else {
            await trx('employees').insert(employee);
          }
        } catch (err) {
          errors.push({ section: 'employees', id: employee.id, error: err.message });
        }
      }
    }

    // Restore vehicles
    if (selectedSections.includes('vehicles') && backupData.data.vehicles) {
      for (const vehicle of backupData.data.vehicles) {
        try {
          const existing = await trx('vehicles').where({ id: vehicle.id }).first();
          if (existing) {
            await trx('vehicles').where({ id: vehicle.id }).update(vehicle);
          } else {
            await trx('vehicles').insert(vehicle);
          }
        } catch (err) {
          errors.push({ section: 'vehicles', id: vehicle.id, error: err.message });
        }
      }
    }

    // Restore waybills
    if (selectedSections.includes('waybills') && backupData.data.waybills) {
      for (const waybill of backupData.data.waybills) {
        try {
          const existing = await trx('waybills').where({ id: waybill.id }).first();
          if (!existing) {
            await trx('waybills').insert(waybill);
          }
        } catch (err) {
          errors.push({ section: 'waybills', id: waybill.id, error: err.message });
        }
      }
    }

    // Restore quick checkouts
    if (selectedSections.includes('quick_checkouts') && backupData.data.quick_checkouts) {
      for (const checkout of backupData.data.quick_checkouts) {
        try {
          const existing = await trx('quick_checkouts').where({ id: checkout.id }).first();
          if (!existing) {
            await trx('quick_checkouts').insert(checkout);
          }
        } catch (err) {
          errors.push({ section: 'quick_checkouts', id: checkout.id, error: err.message });
        }
      }
    }

    // Restore site transactions
    if (selectedSections.includes('site_transactions') && backupData.data.site_transactions) {
      for (const transaction of backupData.data.site_transactions) {
        try {
          const existing = await trx('site_transactions').where({ id: transaction.id }).first();
          if (!existing) {
            await trx('site_transactions').insert(transaction);
          }
        } catch (err) {
          errors.push({ section: 'site_transactions', id: transaction.id, error: err.message });
        }
      }
    }

    // Restore equipment logs
    if (selectedSections.includes('equipment_logs') && backupData.data.equipment_logs) {
      for (const log of backupData.data.equipment_logs) {
        try {
          const existing = await trx('equipment_logs').where({ id: log.id }).first();
          if (!existing) {
            await trx('equipment_logs').insert(log);
          }
        } catch (err) {
          errors.push({ section: 'equipment_logs', id: log.id, error: err.message });
        }
      }
    }

    // Restore consumable logs
    if (selectedSections.includes('consumable_logs') && backupData.data.consumable_logs) {
      for (const log of backupData.data.consumable_logs) {
        try {
          const existing = await trx('consumable_logs').where({ id: log.id }).first();
          if (!existing) {
            await trx('consumable_logs').insert(log);
          }
        } catch (err) {
          errors.push({ section: 'consumable_logs', id: log.id, error: err.message });
        }
      }
    }

    // Restore activities
    if (selectedSections.includes('activities') && backupData.data.activities) {
      for (const activity of backupData.data.activities) {
        try {
          const existing = await trx('activities').where({ id: activity.id }).first();
          if (!existing) {
            await trx('activities').insert(activity);
          }
        } catch (err) {
          errors.push({ section: 'activities', id: activity.id, error: err.message });
        }
      }
    }

    // Restore company settings
    if (selectedSections.includes('company_settings') && backupData.data.company_settings) {
      const settings = backupData.data.company_settings[0];
      if (settings) {
        try {
          const existing = await trx('company_settings').first();
          if (existing) {
            await trx('company_settings').where({ id: existing.id }).update(settings);
          } else {
            await trx('company_settings').insert(settings);
          }
        } catch (err) {
          errors.push({ section: 'company_settings', id: 'settings', error: err.message });
        }
      }
    }

    // Commit transaction if no critical errors
    await trx.commit();

    return {
      success: true,
      errors: errors,
      message: errors.length > 0
        ? `Restore completed with ${errors.length} non-critical errors`
        : 'Restore completed successfully'
    };

  } catch (error) {
    // Rollback on critical error
    await trx.rollback();
    console.error('Restore failed, transaction rolled back:', error);
    return {
      success: false,
      error: error.message,
      errors: errors
    };
  }
};

/**
 * Create a native SQLite database backup
 * @param {string} destinationPath - Path where backup should be saved
 * @returns {Promise<{success: boolean, path?: string, size?: number, message?: string, error?: string}>}
 */
const createDatabaseBackup = async (destinationPath) => {
  if (!db) throw new Error('Database not connected');

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Ensure destination directory exists
    const destDir = path.dirname(destinationPath);
    await fs.mkdir(destDir, { recursive: true });

    // VACUUM INTO requires the file to NOT exist
    try {
      await fs.unlink(destinationPath);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }

    // Use VACUUM INTO for a safe, consistent backup even while online
    const sanitizedPath = destinationPath.replace(/'/g, "''");
    await db.raw(`VACUUM INTO '${sanitizedPath}'`);

    // Verify backup file was created
    const stats = await fs.stat(destinationPath);

    console.log(`✓ Database backup created (VACUUM INTO): ${destinationPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      success: true,
      path: destinationPath,
      size: stats.size,
      message: 'Database backup created successfully'
    };
  } catch (error) {
    console.error('Database backup failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Restore database from a native SQLite backup file
 * @param {string} sourcePath - Path to backup file
 * @param {string} targetPath - Path where database should be restored
 * @returns {Promise<Object>} Result with success status
 */
const restoreDatabaseBackup = async (sourcePath, targetPath) => {
  try {
    const fs = await import('fs/promises');

    // Verify source file exists
    await fs.access(sourcePath);

    // Close current database connection
    if (db) {
      await db.destroy();
      db = null;
    }

    // Copy backup file to target location
    await fs.copyFile(sourcePath, targetPath);

    // Reconnect to the restored database
    connect(targetPath);

    return {
      success: true,
      message: 'Database restored successfully'
    };
  } catch (error) {
    console.error('Database restore failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export {
  connect,
  disconnect,
  login,
  createUser,
  updateUser,
  deleteUser,
  getUsers,
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getAssets,
  createAsset,
  addAsset,
  updateAsset,
  deleteAsset,
  getWaybills,
  createWaybill,
  createReturnWaybill,
  updateWaybill,
  deleteWaybill,
  getWaybillItems,
  createWaybillItem,
  updateWaybillItem,
  deleteWaybillItem,
  getQuickCheckouts,
  createQuickCheckout,
  updateQuickCheckout,
  deleteQuickCheckout,
  getReturnBills,
  createReturnBill,
  updateReturnBill,
  deleteReturnBill,
  getReturnItems,
  createReturnItem,
  updateReturnItem,
  deleteReturnItem,
  getEquipmentLogs,
  createEquipmentLog,
  updateEquipmentLog,
  deleteEquipmentLog,
  getConsumableLogs,
  createConsumableLog,
  updateConsumableLog,
  deleteConsumableLog,
  getMaintenanceLogs,
  createMaintenanceLog,
  updateMaintenanceLog,
  deleteMaintenanceLog,
  getCompanySettings,
  createCompanySettings,
  updateCompanySettings,
  getSiteTransactions,
  addSiteTransaction,
  updateSiteTransaction,
  deleteSiteTransaction,
  getActivities,
  createActivity,
  clearActivities,
  getMetricsSnapshots,
  getTodayMetricsSnapshot,
  createMetricsSnapshot,
  createWaybillWithTransaction,
  sendToSiteWithTransaction,
  processReturnWithTransaction,
  deleteWaybillWithTransaction,
  updateWaybillWithTransaction,
  getSavedApiKeys,
  createSavedApiKey,
  updateSavedApiKey,
  setActiveApiKey,
  deleteSavedApiKey,
  getActiveApiKey,
  migrateSavedKeysToKeytar,
  getApiKeyFromKeyRef,
  createJsonBackup,
  restoreJsonBackup,
  createDatabaseBackup,
  restoreDatabaseBackup,
  clearTable,
};
