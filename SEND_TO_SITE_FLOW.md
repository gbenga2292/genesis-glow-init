# Send to Site Flow - Complete Documentation

## Overview
This document describes the complete flow when a user clicks "Send" on a waybill to send it to a site.

## Frontend Flow

### 1. User Interface (WaybillList.tsx)
- User clicks the "Send" button on an outstanding waybill
- Opens `SendToSiteDialog` component
- User selects a date (defaults to today)
- Clicks "Send" button in the dialog

### 2. Dialog Component (SendToSiteDialog.tsx)
```typescript
const handleSend = () => {
  onSend(waybill, selectedDate);
  onOpenChange(false);
};
```
- Calls `onSend` callback with waybill and selected date
- Closes the dialog

### 3. Handler (Index.tsx - handleSentToSite)
```typescript
const handleSentToSite = async (waybill: Waybill, sentToSiteDate: Date) => {
  // 1. Validate database connection
  // 2. Call backend transaction: window.db.sendToSiteWithTransaction
  // 3. Reload all data from database (assets, waybills, site transactions)
  // 4. Show success/error toast
}
```

## Backend Flow (Electron)

### 1. IPC Handler (electron/main.js)
- Receives call to `db:sendToSiteWithTransaction`
- Forwards to database function

### 2. Database Wrapper (electron/database.js)
```javascript
const sendToSiteWithTransaction = (waybillId, sentToSiteDate) => 
  sendToSiteTransaction(db, waybillId, sentToSiteDate);
```

### 3. Transaction Operation (electron/transactionOperations.js)
The `sendToSiteTransaction` function performs the following in a single atomic transaction:

#### Step 1: Get Waybill Data
```javascript
const waybill = await trx('waybills').where({ id: waybillId }).first();
const waybillItems = await trx('waybill_items').where({ waybill_id: waybillId });
```

#### Step 2: Update Waybill Status
```javascript
await trx('waybills')
  .where({ id: waybillId })
  .update({
    status: 'sent_to_site',
    sent_to_site_date: sentToSiteDate || new Date().toISOString()
  });
```

#### Step 3: Update Asset Quantities
For each waybill item:
```javascript
// 1. Get current asset data
const asset = await trx('assets').where({ id: item.asset_id }).first();

// 2. Transform from DB format
const transformedAsset = transformAssetFromDB(asset);
const currentReserved = transformedAsset.reservedQuantity || 0;
const siteQuantities = transformedAsset.siteQuantities || {};
const currentSiteQty = siteQuantities[waybill.site_id] || 0;

// 3. Update quantities:
//    - Decrease reserved_quantity (items no longer reserved, now at site)
//    - Increase site_quantities for the specific site
siteQuantities[waybill.site_id] = currentSiteQty + item.quantity;

await trx('assets')
  .where({ id: item.asset_id })
  .update({
    reserved_quantity: Math.max(0, currentReserved - item.quantity),
    site_quantities: JSON.stringify(siteQuantities)
  });
```

#### Step 4: Create Site Transactions
```javascript
const siteTransactions = waybillItems.map(item => ({
  id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  site_id: waybill.site_id,
  asset_id: item.asset_id,
  asset_name: item.asset_name,
  quantity: item.quantity,
  type: 'in',  // Items going INTO the site
  transaction_type: 'waybill',
  reference_id: waybillId,
  reference_type: 'waybill',
  created_at: new Date().toISOString()
}));
await trx('site_transactions').insert(siteTransactions);
```

#### Step 5: Commit or Rollback
```javascript
await trx.commit();  // All successful
// OR
await trx.rollback(); // On error, revert all changes
```

## Database Changes

### Tables Modified:
1. **waybills**
   - `status`: 'outstanding' → 'sent_to_site'
   - `sent_to_site_date`: null → selected date

2. **assets**
   - `reserved_quantity`: Decreased by waybill item quantities
   - `site_quantities`: JSON object updated with site-specific quantities

3. **site_transactions** (new records)
   - Type: 'in' (items going into site)
   - Transaction type: 'waybill'
   - One record per waybill item

## Data Integrity Features

### Transaction Safety
- All operations wrapped in a database transaction
- If ANY step fails, ALL changes are rolled back
- Guarantees data consistency

### Quantity Tracking
- Reserved quantities properly decremented
- Site quantities properly incremented
- No inventory loss or duplication

### Audit Trail
- Site transactions record all movements
- Linked to original waybill via `reference_id`
- Timestamp of when items arrived at site

## Frontend Data Reload

After successful transaction, the frontend reloads:
1. **Assets** - To show updated reserved/site quantities
2. **Waybills** - To show updated status and sent date
3. **Site Transactions** - To show new transaction records

This ensures the UI always reflects the current database state.

## Error Handling

### Frontend
- Checks for database connection before proceeding
- Shows error toast if transaction fails
- Logs errors for debugging

### Backend
- Validates waybill exists
- Uses try-catch around transaction
- Rolls back on any error
- Returns success/error status to frontend

## Testing Checklist

To verify this flow works correctly:

- [ ] Outstanding waybill shows "Send" button
- [ ] Dialog opens with date picker
- [ ] Can select custom date
- [ ] Waybill status changes to "sent_to_site"
- [ ] Sent date is saved correctly
- [ ] Reserved quantity decreases for each asset
- [ ] Site quantities increase for target site
- [ ] Site transactions are created with type 'in'
- [ ] UI refreshes to show all changes
- [ ] Success toast appears
- [ ] If database error occurs, nothing changes (rollback)
- [ ] Error toast appears on failure

## Related Files

### Frontend
- `src/components/waybills/WaybillList.tsx` - UI with Send button
- `src/components/waybills/SendToSiteDialog.tsx` - Date selection dialog
- `src/pages/Index.tsx` - Handler function

### Backend
- `electron/main.js` - IPC handler
- `electron/database.js` - Database wrapper
- `electron/transactionOperations.js` - Transaction logic
- `electron/dataTransform.js` - Data transformation utilities

### Types
- `src/vite-env.d.ts` - TypeScript definitions for window.db API
- `src/types/asset.ts` - Asset and Waybill type definitions
