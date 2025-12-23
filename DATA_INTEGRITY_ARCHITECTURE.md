# Data Integrity Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (Forms, Dialogs, Bulk Operations)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYER                             │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Asset      │  │   Waybill    │  │    Site      │         │
│  │ Validation   │  │  Validation  │  │  Validation  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  • Required fields     • Duplicate check                       │
│  • Type validation     • Range validation                      │
│  • Logical validation  • Inventory integrity                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  TRANSACTION LAYER                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────┐        │
│  │  withTransaction("Operation", async (recordStep) => {       │
│  │                                                     │        │
│  │    recordStep({ type, entity, id, previousData })  │        │
│  │    await performOperation()                         │        │
│  │                                                     │        │
│  │    // If fails → Automatic Rollback                │        │
│  │  })                                                 │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                 │
│  • Step recording      • Automatic rollback                    │
│  • State preservation  • Transaction history                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   ORPHAN CHECK LAYER                            │
│                                                                 │
│  Before Delete:                                                │
│  ┌────────────────────────────────────────┐                   │
│  │  checkOrphans(entityType, entityId)    │                   │
│  │                                         │                   │
│  │  Returns:                               │                   │
│  │  • hasOrphans: boolean                  │                   │
│  │  • orphanedAssets: Asset[]              │                   │
│  │  • canDelete: boolean                   │                   │
│  │  • warnings: string[]                   │                   │
│  │  • suggestions: string[]                │                   │
│  └────────────────────────────────────────┘                   │
│                                                                 │
│  If orphans found:                                             │
│  ┌────────────────────────────────────────┐                   │
│  │  handleOrphanedAssets(action)          │                   │
│  │  • move_to_office                       │                   │
│  │  • deactivate                           │                   │
│  │  • cancel                               │                   │
│  └────────────────────────────────────────┘                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Assets  │  │ Waybills │  │  Sites   │  │ Employees│      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  • SQLite Database                                             │
│  • Electron IPC                                                │
│  • Automatic sync                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Create Asset Flow

```
User Input
    │
    ▼
Validate Asset ────────┐
    │                  │
    │ ✅ Valid         │ ❌ Invalid
    ▼                  ▼
Check Duplicates   Show Errors
    │                  │
    │ ✅ Unique        └─── STOP
    ▼
Start Transaction
    │
    ▼
Record Step (create)
    │
    ▼
Save to Database ──────┐
    │                  │
    │ ✅ Success       │ ❌ Failure
    ▼                  ▼
Commit Transaction  Rollback
    │                  │
    ▼                  ▼
Success Toast      Error Toast
```

### 2. Delete Site Flow

```
User Clicks Delete
    │
    ▼
Check Orphans
    │
    ├─── Has Orphans ────┐
    │                    ▼
    │              Show Warning
    │                    │
    │              User Chooses:
    │              ├─ Move to Office
    │              ├─ Deactivate
    │              └─ Cancel ──── STOP
    │                    │
    │                    ▼
    │              Handle Orphans
    │                    │
    └────────────────────┘
    │
    ▼
Start Transaction
    │
    ▼
Record Step (delete)
    │
    ▼
Delete from Database ──┐
    │                  │
    │ ✅ Success       │ ❌ Failure
    ▼                  ▼
Commit            Rollback
    │              (Restore Site)
    ▼                  │
Success Toast      Error Toast
```

### 3. Bulk Update Flow

```
User Selects Assets
    │
    ▼
User Edits Fields
    │
    ▼
Validate Each Asset ───┐
    │                  │
    │ ✅ All Valid     │ ❌ Any Invalid
    ▼                  ▼
Start Transaction  Show Errors
    │                  │
    ▼                  └─── STOP
For Each Asset:
    │
    ├─ Record Step (update)
    │
    └─ Update Database
    │
    ▼
All Success? ──────────┐
    │                  │
    │ ✅ Yes           │ ❌ No
    ▼                  ▼
Commit Transaction  Rollback All
    │                  │
    ▼                  ▼
Success Toast      Error Toast
                   (All Restored)
```

---

## Component Integration

```
┌──────────────────────────────────────────────────────────┐
│                    AddAssetForm.tsx                      │
│                                                          │
│  import { validateAsset } from '@/utils/dataValidation'  │
│  import { withTransaction } from '@/utils/transaction'   │
│                                                          │
│  const handleSubmit = async (data) => {                 │
│    // 1. Validate                                        │
│    const validation = validateAsset(data, assets)       │
│    if (!validation.isValid) return                      │
│                                                          │
│    // 2. Create with transaction                        │
│    await withTransaction("Create asset", async (rec) => {│
│      rec({ type: 'create', entity: 'asset', ... })      │
│      await createAsset(data)                            │
│    })                                                    │
│  }                                                       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    SitesPage.tsx                         │
│                                                          │
│  import { checkOrphans } from '@/utils/orphanHandler'    │
│  import { withTransaction } from '@/utils/transaction'   │
│                                                          │
│  const handleDelete = async (siteId) => {               │
│    // 1. Check orphans                                   │
│    const check = await checkOrphans('site', siteId, {   │
│      assets, waybills                                    │
│    })                                                    │
│                                                          │
│    // 2. Handle orphans if needed                       │
│    if (!check.canDelete) {                              │
│      await handleOrphanedAssets(...)                    │
│    }                                                     │
│                                                          │
│    // 3. Delete with transaction                        │
│    await withTransaction("Delete site", async (rec) => { │
│      rec({ type: 'delete', entity: 'site', ... })       │
│      await deleteSite(siteId)                           │
│    })                                                    │
│  }                                                       │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                BulkAssetOperations.tsx                   │
│                                                          │
│  import { validateAsset } from '@/utils/dataValidation'  │
│  import { withTransaction } from '@/utils/transaction'   │
│                                                          │
│  const handleBulkUpdate = async (ids, updates) => {     │
│    // 1. Validate all                                    │
│    for (const id of ids) {                              │
│      const validation = validateAsset(...)              │
│      if (!validation.isValid) return                    │
│    }                                                     │
│                                                          │
│    // 2. Update with transaction                        │
│    await withTransaction("Bulk update", async (rec) => { │
│      for (const id of ids) {                            │
│        rec({ type: 'update', entity: 'asset', ... })    │
│        await updateAsset(id, updates)                   │
│      }                                                   │
│    })                                                    │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Error Handling Flow

```
Operation Starts
    │
    ▼
Try {
    │
    ▼
  Validation ────────┐
    │               │
    │ ✅ Pass       │ ❌ Fail
    ▼               ▼
  Transaction   Show Validation
    │           Errors
    ▼               │
  Database Op   Return Early
    │               │
    │ ✅ Success    └─── User Fixes
    ▼
  Commit
    │
    ▼
  Success!
}
Catch (error) {
    │
    ▼
  Rollback Transaction
    │
    ▼
  Restore Previous State
    │
    ▼
  Show Error Toast
    │
    ▼
  Log Error
}
```

---

## Validation Rules Matrix

| Entity   | Required Fields | Duplicate Check | Range Check | Logic Check |
|----------|----------------|-----------------|-------------|-------------|
| Asset    | ✅ name, unit   | ✅ name         | ✅ qty ≥ 0  | ✅ critical ≤ low |
| Waybill  | ✅ site, items  | ✅ ID           | ✅ qty > 0  | ✅ return ≥ issue |
| Site     | ✅ name, loc    | ✅ name         | ❌          | ❌          |
| Employee | ✅ name, role   | ⚠️ name (warn)  | ❌          | ✅ email format |
| Vehicle  | ✅ name         | ⚠️ name (warn)  | ❌          | ✅ reg unique |

---

## Transaction States

```
┌──────────────┐
│   PENDING    │ ← Transaction started
└──────┬───────┘
       │
       ├─── All steps succeed ───→ ┌────────────┐
       │                           │  COMMITTED │
       │                           └────────────┘
       │
       ├─── Any step fails ──────→ ┌──────────────┐
       │                           │ ROLLED_BACK  │
       │                           └──────────────┘
       │
       └─── Rollback fails ──────→ ┌────────────┐
                                   │   FAILED   │
                                   └────────────┘
```

---

## Benefits Summary

```
┌─────────────────────────────────────────────────────────┐
│                    BEFORE                               │
├─────────────────────────────────────────────────────────┤
│  ❌ Failed operations leave corrupt data                │
│  ❌ No validation on inputs                             │
│  ❌ Duplicate entries created                           │
│  ❌ Orphaned records on deletion                        │
│  ❌ Inventory calculations unchecked                    │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     AFTER                               │
├─────────────────────────────────────────────────────────┤
│  ✅ Automatic rollback on failure                       │
│  ✅ Comprehensive validation                            │
│  ✅ Duplicate prevention                                │
│  ✅ Orphan detection & handling                         │
│  ✅ Inventory integrity guaranteed                      │
└─────────────────────────────────────────────────────────┘
```

---

**Created**: 2025-12-23  
**Status**: ✅ Architecture Complete  
**Next**: Integration into components
