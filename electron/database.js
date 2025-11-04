
import knex from 'knex';
import bcrypt from 'bcrypt';

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
    const { username, password, role, name, email } = userData;

    const existingUser = await db('users').where({ username }).first();
    if (existingUser) {
        return { success: false, message: 'Username already exists' };
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const [newUser] = await db('users').insert({ username, password_hash, role, name, email }).returning('*');
    const userWithoutHash = { ...newUser };
    delete userWithoutHash.password_hash;
    return { success: true, user: userWithoutHash };
}

async function updateUser(userId, userData) {
    if (!db) throw new Error('Database not connected');
    const { name, username, role, email, password } = userData;

    // Check if username is already taken by another user
    if (username) {
        const existingUser = await db('users').where({ username }).whereNot({ id: userId }).first();
        if (existingUser) {
            return { success: false, message: 'Username already exists' };
        }
    }

    const updateData = { name, username, role, email };
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
  transformWaybillFromDB,
  transformWaybillToDB
} from './dataTransform.js';

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

const createWaybill = async (data) => {
  if (!db) throw new Error('Database not connected');
  
  // Use the transaction operations module for proper waybill creation
  const { createWaybillTransaction } = await import('./transactionOperations.js');
  const result = await createWaybillTransaction(db, data);
  
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
          const newAvailable = asset.quantity - newReserved - currentDamaged - currentMissing;
          
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
          const newAvailable = asset.quantity - currentReserved - currentDamaged - currentMissing;
          
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
const getQuickCheckouts = getAll('quick_checkouts');
const createQuickCheckout = create('quick_checkouts');
const updateQuickCheckout = update('quick_checkouts');
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
  return db('equipment_logs').insert(transformEquipmentLogToDB(data)).returning('*').then(rows => rows.map(transformEquipmentLogFromDB));
}

const updateEquipmentLog = (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db('equipment_logs').where({ id }).update(transformEquipmentLogToDB(data)).returning('*').then(rows => rows.map(transformEquipmentLogFromDB));
}

const deleteEquipmentLog = remove('equipment_logs');
const getCompanySettings = () => {
  if (!db) throw new Error('Database not connected');
  return db('company_settings').first().then(settings => settings ? transformCompanySettingsFromDB(settings) : null);
}

const updateCompanySettings = (id, data) => {
  if (!db) throw new Error('Database not connected');
  return db('company_settings').where({ id }).update(transformCompanySettingsToDB(data)).returning('*').then(rows => rows.map(transformCompanySettingsFromDB));
}

const getSiteTransactions = getAll('site_transactions');
const addSiteTransaction = create('site_transactions');
const updateSiteTransaction = update('site_transactions');
const deleteSiteTransaction = remove('site_transactions');

// --- ACTIVITIES ---
const getActivities = () => {
  if (!db) throw new Error('Database not connected');
  return db('activities').select('*').orderBy('timestamp', 'desc').limit(1000);
}

const createActivity = (data) => {
  if (!db) throw new Error('Database not connected');
  return db('activities').insert(data);
}

const clearActivities = () => {
  if (!db) throw new Error('Database not connected');
  return db('activities').del();
}


// --- TRANSACTION OPERATIONS ---

// Create waybill with transaction
const createWaybillWithTransaction = async (waybillData) => {
  if (!db) throw new Error('Database not connected');
  
  const { createWaybillTransaction } = await import('./transactionOperations.js');
  const result = await createWaybillTransaction(db, waybillData);
  
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
        const newAvailable = asset.quantity - (asset.reserved_quantity || 0) - totalSiteQty;

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
        const newAvailable = asset.quantity - newReserved - totalSiteQty;

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
          const newAvailable = asset.quantity - (asset.reserved_quantity || 0) - totalSiteQty;

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
          const newAvailable = asset.quantity - newReserved - totalSiteQty;

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
    getCompanySettings,
    updateCompanySettings,
    getSiteTransactions,
    addSiteTransaction,
    updateSiteTransaction,
    deleteSiteTransaction,
    getActivities,
    createActivity,
    clearActivities,
    createWaybillWithTransaction,
    sendToSiteWithTransaction,
    processReturnWithTransaction,
    deleteWaybillWithTransaction,
    updateWaybillWithTransaction,
};
