# Data Integrity Fixes - Implementation Guide

## Overview
This document provides comprehensive solutions for all 5 critical data integrity risks identified in the Genesis Glow application.

---

## ✅ **Issue 1: Transaction Rollback UI**

### Problem
If operations fail mid-process, manual cleanup is needed.

### Solution Implemented
Created **Transaction Manager** (`src/utils/transactionManager.ts`) that:
- Tracks all database operations
- Records previous state before changes
- Automatically rolls back on failure
- Provides transaction history

### How to Use

```typescript
import { withTransaction } from "@/utils/transactionManager";

// Wrap any multi-step operation
await withTransaction(
  "Bulk update assets",
  async (recordStep) => {
    for (const asset of assets) {
      // Record step for rollback
      recordStep({
        type: 'update',
        entity: 'asset',
        id: asset.id,
        previousData: asset,
        newData: updatedAsset
      });
      
      await updateAsset(asset.id, updatedAsset);
    }
  }
);
// If any step fails, ALL changes are automatically rolled back
```

### Files Created
- `src/utils/transactionManager.ts` - Transaction management system

---

## ✅ **Issue 2: Inventory Calculation Validation**

### Problem
Complex quantity calculations prone to edge cases.

### Solution Implemented
Created **Data Validation Utilities** (`src/utils/dataValidation.ts`) that:
- Validates all inventory calculations
- Checks for negative quantities
- Ensures total integrity (reserved + damaged + missing ≤ quantity)
- Detects calculation mismatches

### How to Use

```typescript
import { validateAsset, validateInventoryCalculation } from "@/utils/dataValidation";

// Before saving asset
const validation = validateAsset(assetData, existingAssets, isEdit);

if (!validation.isValid) {
  // Show errors to user
  toast({
    title: "Validation Error",
    description: validation.errors.join(", "),
    variant: "destructive"
  });
  return;
}

// Show warnings (non-blocking)
if (validation.warnings.length > 0) {
  toast({
    title: "Warning",
    description: validation.warnings.join(", ")
  });
}

// Validate inventory calculations
const invValidation = validateInventoryCalculation(asset);
if (!invValidation.isValid) {
  // Fix calculation or alert user
}
```

### Validation Rules
- ✅ Quantity cannot be negative
- ✅ Reserved ≤ Total quantity
- ✅ Damaged + Missing + Used + Reserved ≤ Total
- ✅ Available = Total - Reserved - SiteTotal - Damaged - Missing - Used
- ✅ Critical stock ≤ Low stock level
- ✅ All counts must be whole numbers

### Files Created
- `src/utils/dataValidation.ts` - Comprehensive validation functions

---

## ✅ **Issue 3: Data Validation on Forms**

### Problem
Minimal input validation on forms.

### Solution Implemented
Comprehensive validation for ALL entity types:

### Asset Validation
```typescript
validateAsset(asset, existingAssets, isEdit)
```
- Required fields: name, unit, category, type
- Duplicate name check (case-insensitive)
- Quantity validation (non-negative, integer)
- Stock level validation
- Cost validation
- Equipment-specific validation (fuel, electricity)

### Waybill Validation
```typescript
validateWaybill(waybill, existingWaybills, assets)
```
- Required fields: site, driver, vehicle, purpose, items
- Duplicate ID check
- Item quantity validation
- Asset availability check
- Date logic validation (return date ≥ issue date)
- Duplicate items warning

### Site Validation
```typescript
validateSite(site, existingSites, isEdit)
```
- Required fields: name, location
- Duplicate name check
- Phone number format validation

### Employee Validation
```typescript
validateEmployee(employee, existingEmployees, isEdit)
```
- Required fields: name, role
- Email format validation
- Phone number format validation
- Duplicate name warning

### Vehicle Validation
```typescript
validateVehicle(vehicle, existingVehicles, isEdit)
```
- Required field: name
- Duplicate registration number check
- Duplicate name warning

### Integration Example

```typescript
// In AddAssetForm.tsx
import { validateAsset } from "@/utils/dataValidation";

const handleSubmit = async (data) => {
  // Validate before submission
  const validation = validateAsset(data, assets, false);
  
  if (!validation.isValid) {
    setErrors(validation.errors);
    return;
  }
  
  if (validation.warnings.length > 0) {
    setWarnings(validation.warnings);
  }
  
  // Proceed with save
  await saveAsset(data);
};
```

---

## ✅ **Issue 4: Duplicate Prevention**

### Problem
No checks for duplicate asset names or waybill IDs.

### Solution Implemented
Built into validation utilities with case-insensitive matching:

### Asset Duplicate Check
```typescript
// Checks for duplicate names (case-insensitive)
const duplicate = existingAssets.find(
  a => a.name.toLowerCase() === asset.name.toLowerCase() && 
       (!isEdit || a.id !== asset.id)
);

if (duplicate) {
  errors.push(`Asset name "${asset.name}" already exists (ID: ${duplicate.id})`);
}
```

### Waybill Duplicate Check
```typescript
// Prevents duplicate waybill IDs
const duplicate = existingWaybills.find(w => w.id === waybill.id);
if (duplicate) {
  errors.push(`Waybill ID "${waybill.id}" already exists`);
}
```

### Vehicle Registration Duplicate Check
```typescript
// Prevents duplicate registration numbers
const duplicate = existingVehicles.find(
  v => v.registration_number?.toLowerCase() === vehicle.registration_number.toLowerCase() && 
       (!isEdit || v.id !== vehicle.id)
);
```

### Implementation in Forms

```typescript
// Before creating new asset
const validation = validateAsset(newAssetData, allAssets, false);

if (validation.errors.some(e => e.includes('already exists'))) {
  // Show specific duplicate error
  toast({
    title: "Duplicate Asset",
    description: "An asset with this name already exists",
    variant: "destructive"
  });
  return;
}
```

---

## ✅ **Issue 5: Orphaned Records**

### Problem
Deleting sites doesn't handle assets allocated to them.

### Solution Implemented
Created **Orphaned Records Handler** (`src/utils/orphanedRecordsHandler.ts`) that:
- Checks for orphaned records before deletion
- Provides migration options
- Automatically cleans up site quantities
- Prevents data loss

### How to Use

```typescript
import { checkOrphans, handleOrphanedAssets, cleanupSiteQuantities } from "@/utils/orphanedRecordsHandler";

// Before deleting a site
const orphanCheck = await checkOrphans('site', siteId, {
  assets,
  waybills,
  quickCheckouts
});

if (!orphanCheck.canDelete) {
  // Show warning dialog
  const result = await showOrphanWarningDialog({
    warnings: orphanCheck.warnings,
    suggestions: orphanCheck.suggestions,
    orphanedAssets: orphanCheck.orphanedAssets,
    orphanedWaybills: orphanCheck.orphanedWaybills
  });
  
  if (result.action === 'cancel') {
    return;
  }
  
  if (result.action === 'move_to_office') {
    // Move orphaned assets to office
    await handleOrphanedAssets(siteId, assets, 'move_to_office');
  }
  
  // Clean up site quantities
  await cleanupSiteQuantities(siteId, assets);
}

// Now safe to delete site
await deleteSite(siteId);
```

### Orphan Check Results

```typescript
interface OrphanCheckResult {
  hasOrphans: boolean;
  orphanedAssets: Asset[];        // Assets allocated to this site
  orphanedWaybills: Waybill[];    // Waybills referencing this site
  canDelete: boolean;              // Safe to delete?
  warnings: string[];              // What will be affected
  suggestions: string[];           // How to fix
}
```

### Migration Options

1. **Move to Office** - Relocate assets to office location
2. **Deactivate** - Mark assets as maintenance/inactive
3. **Cancel** - Abort deletion

### Files Created
- `src/utils/orphanedRecordsHandler.ts` - Orphan detection and handling

---

## 📋 **Implementation Checklist**

### Phase 1: Core Utilities (✅ Complete)
- [x] Create `transactionManager.ts`
- [x] Create `dataValidation.ts`
- [x] Create `orphanedRecordsHandler.ts`

### Phase 2: Form Integration (Recommended)
- [ ] Update `AddAssetForm.tsx` to use validation
- [ ] Update `WaybillForm.tsx` to use validation
- [ ] Update `SiteForm.tsx` to use validation
- [ ] Add validation error display components
- [ ] Add warning display components

### Phase 3: Delete Operations (Recommended)
- [ ] Update site deletion to check orphans
- [ ] Update asset deletion to check orphans
- [ ] Add orphan warning dialog component
- [ ] Implement migration options UI

### Phase 4: Bulk Operations (Recommended)
- [ ] Update `BulkAssetOperations.tsx` to use transactions
- [ ] Add validation to bulk edit
- [ ] Add rollback notification
- [ ] Add progress indicator for large operations

---

## 🎯 **Usage Examples**

### Example 1: Safe Asset Creation

```typescript
const handleCreateAsset = async (assetData) => {
  // 1. Validate
  const validation = validateAsset(assetData, existingAssets, false);
  
  if (!validation.isValid) {
    showErrors(validation.errors);
    return;
  }
  
  // 2. Warn about potential issues
  if (validation.warnings.length > 0) {
    const proceed = await confirmWithWarnings(validation.warnings);
    if (!proceed) return;
  }
  
  // 3. Create with transaction
  await withTransaction("Create asset", async (recordStep) => {
    const newAsset = await createAsset(assetData);
    
    recordStep({
      type: 'create',
      entity: 'asset',
      id: newAsset.id,
      newData: newAsset
    });
  });
};
```

### Example 2: Safe Site Deletion

```typescript
const handleDeleteSite = async (siteId) => {
  // 1. Check for orphans
  const orphanCheck = await checkOrphans('site', siteId, {
    assets,
    waybills
  });
  
  if (!orphanCheck.canDelete) {
    // 2. Show warning and get user choice
    const action = await showOrphanDialog(orphanCheck);
    
    if (action === 'cancel') return;
    
    // 3. Handle orphans
    if (action === 'move_to_office') {
      await handleOrphanedAssets(siteId, assets, 'move_to_office');
    }
    
    await cleanupSiteQuantities(siteId, assets);
  }
  
  // 4. Delete with transaction
  await withTransaction("Delete site", async (recordStep) => {
    recordStep({
      type: 'delete',
      entity: 'site',
      id: siteId,
      previousData: site
    });
    
    await deleteSite(siteId);
  });
};
```

### Example 3: Bulk Update with Validation

```typescript
const handleBulkUpdate = async (assetIds, updates) => {
  // 1. Validate updates don't create issues
  const errors = [];
  
  for (const assetId of assetIds) {
    const asset = assets.find(a => a.id === assetId);
    const updatedAsset = { ...asset, ...updates };
    
    const validation = validateAsset(updatedAsset, assets, true);
    if (!validation.isValid) {
      errors.push(`${asset.name}: ${validation.errors.join(', ')}`);
    }
  }
  
  if (errors.length > 0) {
    showErrors(errors);
    return;
  }
  
  // 2. Update with transaction
  await withTransaction("Bulk update assets", async (recordStep) => {
    for (const assetId of assetIds) {
      const asset = assets.find(a => a.id === assetId);
      const updatedAsset = { ...asset, ...updates };
      
      recordStep({
        type: 'update',
        entity: 'asset',
        id: assetId,
        previousData: asset,
        newData: updatedAsset
      });
      
      await updateAsset(assetId, updatedAsset);
    }
  });
};
```

---

## 🔧 **Testing Guide**

### Test Transaction Rollback
1. Start bulk delete of 10 assets
2. Simulate failure on 5th asset
3. Verify first 4 assets are restored
4. Check transaction log

### Test Validation
1. Try creating asset with negative quantity → Should fail
2. Try creating duplicate asset name → Should fail
3. Try creating asset with critical > low stock → Should warn
4. Try creating waybill with insufficient inventory → Should fail

### Test Orphan Prevention
1. Create site with 5 assets
2. Try deleting site → Should warn
3. Choose "Move to Office" → Assets should relocate
4. Delete site → Should succeed

### Test Duplicate Prevention
1. Create asset "Pump A"
2. Try creating "pump a" (different case) → Should fail
3. Try creating "Pump B" → Should succeed

---

## 📊 **Benefits**

| Issue | Before | After |
|-------|--------|-------|
| Failed operations | Manual cleanup required | Automatic rollback |
| Invalid data | Saved to database | Blocked with clear error |
| Duplicates | Created silently | Prevented with warning |
| Orphaned records | Data loss | Prevented or migrated |
| Inventory errors | Silent corruption | Detected and fixed |

---

## 🚀 **Next Steps**

1. **Review** the utility files created
2. **Integrate** validation into existing forms
3. **Add** orphan checking to delete operations
4. **Test** thoroughly with real data
5. **Train** users on new validation messages
6. **Monitor** transaction logs for issues

---

**Status**: ✅ Core utilities complete, ready for integration
**Priority**: HIGH - Prevents data corruption
**Estimated Integration Time**: 4-6 hours
