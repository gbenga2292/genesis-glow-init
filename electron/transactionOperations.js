import knex from 'knex';
import { transformWaybillToDB, transformWaybillFromDB, transformAssetFromDB } from './dataTransform.js';

/**
 * Creates a waybill transaction, updating asset quantities accordingly
 * @param {knex} db - Knex database instance
 * @param {Object} waybillData - Waybill data
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function createWaybillTransaction(db, waybillData) {
  const trx = await db.transaction();
  try {
    console.log('Creating waybill with data:', waybillData);

    // Generate unique waybill ID inside transaction to avoid race conditions
    let waybillId;
    
    // If an ID was provided, verify it doesn't exist
    if (waybillData.id) {
      const existing = await trx('waybills').where({ id: waybillData.id }).first();
      if (existing) {
        throw new Error(`Waybill with ID ${waybillData.id} already exists. Please use a different ID.`);
      }
      waybillId = waybillData.id;
    } else {
      // Generate a new unique ID based on waybill type
      const prefix = waybillData.type === 'return' ? 'RB' : 'WB';
      let counter = 1;
      while (true) {
        waybillId = `${prefix}${counter.toString().padStart(3, '0')}`;
        const existing = await trx('waybills').where({ id: waybillId }).first();
        if (!existing) break;
        counter++;
        if (counter > 10000) {
          throw new Error('Unable to generate unique waybill ID after 10000 attempts');
        }
      }
    }

    console.log('Generated waybill ID:', waybillId);

    // Parse items
    const items = Array.isArray(waybillData.items) ? waybillData.items : [];
    console.log('Waybill items:', items);

    // Insert waybill with generated ID
    const waybillToInsert = transformWaybillToDB({
      ...waybillData,
      id: waybillId,
      items: items
    });

    const [newWaybill] = await trx('waybills').insert(waybillToInsert).returning('*');
    console.log('Waybill inserted:', newWaybill);

    // Update asset quantities based on status
    for (const item of items) {
      const assetId = parseInt(item.assetId);
      console.log(`Updating quantities for asset ${assetId}, quantity: ${item.quantity}, status: ${waybillData.status}`);

      const asset = await trx('assets').where({ id: assetId }).first();
      if (!asset) {
        throw new Error(`Asset with ID ${assetId} not found`);
      }

      if (waybillData.type === 'return') {
        // For return waybills: DO NOT reserve quantities (items are coming back FROM site)
        // Just validate that items exist at the site
        const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
        const siteQty = siteQuantities[waybillData.siteId] || 0;
        
        if (siteQty < item.quantity) {
          throw new Error(`Insufficient quantity at site for asset ${asset.name}. Available at site: ${siteQty}, Requested: ${item.quantity}`);
        }
        
        console.log(`Return waybill: Asset ${assetId} - no reservation needed (returning ${item.quantity} from site)`);
      } else {
        // For outstanding waybills: ADD to reserved quantities
        // Reserved = items in use (whether at warehouse or site)
        const currentReserved = asset.reserved_quantity || 0;
        const newReserved = currentReserved + item.quantity;
        const currentDamaged = asset.damaged_count || 0;
        const currentMissing = asset.missing_count || 0;
        
        // Available = quantity - reserved - damaged - missing (NOT subtracting site quantities)
        const newAvailable = asset.quantity - newReserved - currentDamaged - currentMissing;

        console.log(`Asset ${assetId}: current reserved=${currentReserved}, new reserved=${newReserved}, available=${newAvailable}`);

        if (newAvailable < 0) {
          throw new Error(`Insufficient quantity for asset ${asset.name}. Available: ${asset.quantity - currentReserved - currentDamaged - currentMissing}, Requested: ${item.quantity}`);
        }

        await trx('assets')
          .where({ id: assetId })
          .update({
            reserved_quantity: newReserved,
            available_quantity: newAvailable
          });
      }

      console.log(`Asset ${assetId} quantities updated successfully`);
    }

    await trx.commit();
    console.log('Waybill creation committed successfully');

    return { success: true, waybillId: waybillId };
  } catch (error) {
    await trx.rollback();
    console.error('Waybill creation failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sends a waybill to site, updating asset quantities accordingly
 * @param {knex} db - Knex database instance
 * @param {string} waybillId - Waybill ID to send to site
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function sendToSiteTransaction(db, waybillId) {
  const trx = await db.transaction();
  try {
    console.log(`Sending waybill ${waybillId} to site`);

    // Get waybill
    const waybill = await trx('waybills').where({ id: waybillId }).first();
    if (!waybill) {
      throw new Error('Waybill not found');
    }

    // Parse items
    const items = typeof waybill.items === 'string' ? JSON.parse(waybill.items) : waybill.items;
    console.log('Waybill items:', items);

    // Update waybill status
    await trx('waybills')
      .where({ id: waybillId })
      .update({
        status: 'sent_to_site',
        sent_to_site_date: new Date().toISOString()
      });

    console.log('Waybill status updated to sent_to_site');

    // Update assets: KEEP reserved quantity unchanged, ADD to site quantities
    for (const item of items) {
      const assetId = parseInt(item.assetId);
      const asset = await trx('assets').where({ id: assetId }).first();

      if (!asset) {
        throw new Error(`Asset with ID ${assetId} not found`);
      }

      // KEEP reserved quantity unchanged (items stay reserved until returned)
      const currentReserved = asset.reserved_quantity || 0;

      // Add to site quantities
      const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
      const currentSiteQty = siteQuantities[waybill.siteId] || 0;
      siteQuantities[waybill.siteId] = currentSiteQty + item.quantity;

      // Available = quantity - reserved - damaged - missing (NOT subtracting site quantities)
      // Site quantities are already accounted for in reserved quantity
      const currentDamaged = asset.damaged_count || 0;
      const currentMissing = asset.missing_count || 0;
      const newAvailable = asset.quantity - currentReserved - currentDamaged - currentMissing;

      console.log(`Asset ${assetId}: reserved stays at ${currentReserved}, site qty becomes ${siteQuantities[waybill.siteId]}, available=${newAvailable}`);

      await trx('assets')
        .where({ id: assetId })
        .update({
          site_quantities: JSON.stringify(siteQuantities),
          available_quantity: newAvailable
        });

      console.log(`Asset ${assetId} site quantities updated`);
    }

    // Create site transactions
    if (waybill.siteId && items.length > 0) {
      const siteTransactions = items.map(item => ({
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        site_id: waybill.siteId,
        asset_id: item.assetId,
        asset_name: item.assetName,
        transaction_type: 'waybill',
        quantity: item.quantity,
        type: 'in',
        reference_id: waybillId,
        reference_type: 'waybill',
        created_at: new Date().toISOString()
      }));
      await trx('site_transactions').insert(siteTransactions);
      console.log('Site transactions created');
    }

    await trx.commit();
    console.log('Send to site committed successfully');
    return { success: true };
  } catch (error) {
    await trx.rollback();
    console.error('Send to site failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Processes a return waybill, updating asset quantities accordingly
 * @param {knex} db - Knex database instance
 * @param {Object} returnData - Return data with waybillId and items
 * @returns {Object} - { success: boolean, error?: string }
 */
export async function processReturnTransaction(db, returnData) {
  const trx = await db.transaction();
  try {
    console.log('Processing return with data:', returnData);

    // Get the return waybill
    const waybill = await trx('waybills').where({ id: returnData.waybillId }).first();
    if (!waybill) {
      throw new Error('Return waybill not found');
    }

    if (waybill.type !== 'return') {
      throw new Error('Waybill is not a return type');
    }

    // Parse waybill items
    const waybillItems = typeof waybill.items === 'string' ? JSON.parse(waybill.items) : waybill.items;
    
    // Group return items by assetId
    const returnSummary = returnData.items.reduce((acc, item) => {
      if (!acc[item.assetId]) {
        acc[item.assetId] = { total: 0, good: 0, damaged: 0, missing: 0 };
      }
      acc[item.assetId].total += item.quantity;
      if (item.condition === 'good') acc[item.assetId].good += item.quantity;
      else if (item.condition === 'damaged') acc[item.assetId].damaged += item.quantity;
      else if (item.condition === 'missing') acc[item.assetId].missing += item.quantity;
      return acc;
    }, {});

    // Update asset quantities
    for (const [assetId, summary] of Object.entries(returnSummary)) {
      const asset = await trx('assets').where({ id: parseInt(assetId) }).first();
      if (!asset) {
        throw new Error(`Asset with ID ${assetId} not found`);
      }

      console.log(`Processing return for asset ${assetId}: total=${summary.total}, good=${summary.good}, damaged=${summary.damaged}, missing=${summary.missing}`);

      // Reduce reserved quantity by total returned
      const currentReserved = asset.reserved_quantity || 0;
      const newReserved = Math.max(0, currentReserved - summary.total);

      // Reduce site quantities
      const siteQuantities = asset.site_quantities ? JSON.parse(asset.site_quantities) : {};
      const currentSiteQty = siteQuantities[waybill.siteId] || 0;
      const newSiteQty = Math.max(0, currentSiteQty - summary.total);
      
      if (newSiteQty === 0) {
        delete siteQuantities[waybill.siteId];
      } else {
        siteQuantities[waybill.siteId] = newSiteQty;
      }

      // Update damaged and missing counts
      const newDamaged = (asset.damaged_count || 0) + summary.damaged;
      const newMissing = (asset.missing_count || 0) + summary.missing;

      // Calculate new available quantity
      // Available = quantity - reserved - damaged - missing (NOT subtracting site quantities)
      const newAvailable = asset.quantity - newReserved - newDamaged - newMissing;

      console.log(`Asset ${assetId}: reserved ${currentReserved} -> ${newReserved}, site qty ${currentSiteQty} -> ${newSiteQty}, damaged=${newDamaged}, missing=${newMissing}, available=${newAvailable}`);

      await trx('assets')
        .where({ id: parseInt(assetId) })
        .update({
          reserved_quantity: newReserved,
          site_quantities: JSON.stringify(siteQuantities),
          damaged_count: newDamaged,
          missing_count: newMissing,
          available_quantity: newAvailable
        });

      // Create site transaction for the return
      await trx('site_transactions').insert({
        id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        site_id: waybill.siteId,
        asset_id: parseInt(assetId),
        asset_name: asset.name,
        transaction_type: 'return',
        quantity: summary.total,
        type: 'out',
        reference_id: returnData.waybillId,
        reference_type: 'return_waybill',
        condition: summary.damaged > 0 ? 'damaged' : (summary.missing > 0 ? 'missing' : 'good'),
        created_at: new Date().toISOString()
      });
    }

    // Update waybill items with returned quantities and breakdown
    const updatedItems = waybillItems.map(item => {
      const summary = returnSummary[item.assetId];
      if (summary) {
        const existingBreakdown = item.returnBreakdown || { good: 0, damaged: 0, missing: 0 };
        const newBreakdown = {
          good: existingBreakdown.good + summary.good,
          damaged: existingBreakdown.damaged + summary.damaged,
          missing: existingBreakdown.missing + summary.missing
        };
        const newReturnedQty = (item.returnedQuantity || 0) + summary.total;
        return {
          ...item,
          returnedQuantity: newReturnedQty,
          returnBreakdown: newBreakdown,
          status: newReturnedQty >= item.quantity ? 'return_completed' : 'partial_returned'
        };
      }
      return item;
    });

    // Check if all items are fully returned
    const allItemsReturned = updatedItems.every(item => (item.returnedQuantity || 0) >= item.quantity);

    // Update waybill status
    await trx('waybills')
      .where({ id: returnData.waybillId })
      .update({
        items: JSON.stringify(updatedItems),
        status: allItemsReturned ? 'return_completed' : 'partial_returned',
        updatedAt: new Date().toISOString()
      });

    await trx.commit();
    console.log('Return processing committed successfully');
    return { success: true };
  } catch (error) {
    await trx.rollback();
    console.error('Return processing failed:', error);
    return { success: false, error: error.message };
  }
}
