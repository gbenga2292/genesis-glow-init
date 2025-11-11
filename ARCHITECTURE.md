# Architecture Documentation

## Overview
This document defines the architectural standards, patterns, and conventions for the Genesis Glow Inventory Management System.

---

## 1. ID Type Standards

### **Rule: ALL IDs are STRINGS**

**Database Schema:**
- All ID columns use `TEXT` type (not INTEGER)
- Primary keys: `id TEXT PRIMARY KEY`
- Foreign keys: `site_id TEXT`, `asset_id TEXT`, etc.

**TypeScript Types:**
```typescript
interface Asset {
  id: string;
  siteId?: string;
  // ... all IDs are strings
}
```

**Transform Functions:**
- Database layer (`electron/dataTransform.js`) ensures all IDs are converted to strings
- Use `String(value)` or `.toString()` for any database values
- Frontend receives pre-transformed data with string IDs

**WHY:** Prevents type mismatch bugs where `log.siteId === site.id` fails due to number vs string comparison

---

## 2. State Management Pattern

### **Single Source of Truth: Context Providers**

**Contexts:**
- `AssetsContext` - Manages all asset data
- `WaybillsContext` - Manages all waybill data
- `AuthContext` - Manages authentication state

**Page Components:**
- `Index.tsx` and other pages **consume** contexts via hooks
- Pages DO NOT maintain their own state for data
- Pages pass down context functions and data to child components

**Example:**
```typescript
// ✅ CORRECT - Use contexts
const { assets, updateAsset } = useAssets();
const { waybills, createWaybill } = useWaybills();

// ❌ WRONG - Don't maintain local state
const [assets, setAssets] = useState<Asset[]>([]);
```

**WHY:** Eliminates state synchronization issues, duplicate data loading, and ensures single source of truth

---

## 3. Data Transformation Rules

### **Single Transform Library**

**Use ONLY:** `electron/dataTransform.js`

**Database Operations:**
```javascript
// When reading from DB
const assets = await db('assets').select('*')
  .then(assets => assets.map(transformAssetFromDB));

// When writing to DB
await db('assets').insert(transformAssetToDB(asset));
```

**Frontend:**
- Receives already-transformed data from database layer
- NO transformation needed in components
- Data arrives with correct types and field names

**Deleted Files:**
- `src/utils/dataTransform.ts` - REMOVED (was duplicate)

**WHY:** Single transformation point prevents inconsistencies and ensures all data has same shape

---

## 4. Asset Quantity Calculation

### **Standard Formula**

**For Company Inventory (non-site-specific assets):**
```typescript
availableQuantity = quantity - reservedQuantity - damagedCount - missingCount
```

**For Site-Specific Assets:**
```typescript
// Assets with siteId field (permanently assigned to site)
availableQuantity = quantity // No calculation needed

// Assets distributed across sites (siteQuantities object)
availableQuantity = quantity - reservedQuantity - sum(siteQuantities)
```

**When to Calculate:**
1. On asset creation/import
2. When quantity changes
3. When waybill is created (reserves quantity)
4. When waybill is sent to site (moves from reserved to siteQuantities)
5. When return is processed

**Implementation Location:**
- Database layer calculates and stores `available_quantity`
- Frontend displays pre-calculated value
- Context providers recalculate when needed

**WHY:** Consistent calculation prevents inventory discrepancies and confusion

---

## 5. Site Relationship Patterns

### **Two Distinct Patterns**

**Pattern A: Direct Assignment (`siteId` field)**

**Use for:** Equipment, Tools, Non-Consumable assets permanently at a site

```typescript
interface Asset {
  siteId?: string; // Single site assignment
  type: 'equipment' | 'tools'; // Use for these types
}
```

**Pattern B: Distributed Quantities (`siteQuantities` object)**

**Use for:** Consumables distributed across multiple sites

```typescript
interface Asset {
  siteQuantities: Record<string, number>; // Multiple sites
  type: 'consumable'; // Use for consumables
}
```

**Validation Rules:**
```typescript
// Equipment/Tools MUST use siteId
if (asset.type === 'equipment' || asset.type === 'tools') {
  assert(asset.siteId !== undefined);
  assert(Object.keys(asset.siteQuantities).length === 0);
}

// Consumables MUST use siteQuantities
if (asset.type === 'consumable') {
  assert(asset.siteId === undefined);
  assert(asset.siteQuantities !== undefined);
}
```

**WHY:** Clear distinction prevents confusion about where assets are located

---

## 6. Database Schema Standards

### **Primary Keys**
```sql
-- Waybills: String IDs (user-facing)
CREATE TABLE waybills (
  id TEXT PRIMARY KEY
);

-- Other tables: Auto-increment converted to string
CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT
  -- Frontend sees: String(id)
);
```

### **Foreign Keys**
```sql
-- Reference tables by ID
CREATE TABLE assets (
  site_id INTEGER REFERENCES sites(id),
  -- Frontend sees: String(site_id)
);
```

### **JSON Columns**
```sql
-- Store complex data as JSON
CREATE TABLE assets (
  site_quantities TEXT, -- JSON.stringify({siteId: quantity})
);
```

---

## 7. Component Data Flow

### **Props Down, Events Up**

```
Context (State)
    ↓ props
Page Component
    ↓ props
Feature Component
    ↓ props
UI Component
    ↑ callbacks
Feature Component
    ↑ callbacks
Page Component
    ↑ callbacks
Context (Updates State)
```

**Example:**
```typescript
// Context
const { assets, updateAsset } = useAssets();

// Page passes down
<AssetTable assets={assets} onUpdate={updateAsset} />

// Component calls callback
<Button onClick={() => onUpdate(updatedAsset)} />
```

**WHY:** Unidirectional data flow is predictable and debuggable

---

## 8. Authentication & Permissions

### **Permission Checks**

```typescript
const { isAuthenticated, hasPermission } = useAuth();

// Check before sensitive operations
if (!hasPermission('edit_assets')) {
  toast({ title: "Unauthorized" });
  return;
}
```

**Permission Levels:**
- `view_assets` - View asset data
- `edit_assets` - Create/Update assets
- `delete_assets` - Delete assets
- `create_waybills` - Create waybills
- `process_returns` - Process returns
- `manage_sites` - Site management
- `print_documents` - Generate PDFs
- `manage_users` - User management

---

## 9. Error Handling

### **Logging Standards**

```typescript
import { logger } from '@/lib/logger';

// Log errors (always logged)
logger.error('Failed to load assets', error);

// Log debug info (dev only)
logger.debug('Asset loaded', asset);

// Toast for user feedback
toast({
  title: "Error",
  description: "Failed to load assets",
  variant: "destructive"
});
```

**WHY:** Production-safe logging prevents sensitive data exposure

---

## 10. File Organization

### **Directory Structure**
```
src/
├── components/
│   ├── assets/         # Asset-related components
│   ├── waybills/       # Waybill components
│   ├── sites/          # Site management
│   ├── layout/         # Layout components
│   └── ui/             # Shadcn UI components
├── contexts/           # React contexts
│   ├── AssetsContext.tsx
│   ├── WaybillsContext.tsx
│   └── AuthContext.tsx
├── hooks/              # Custom hooks
├── lib/                # Utilities
├── pages/              # Route pages
├── types/              # TypeScript types
└── utils/              # Helper functions

electron/
├── database.js         # Database operations
├── dataTransform.js    # Transform functions
└── transactionOperations.js
```

---

## 11. Common Patterns

### **Data Loading**
```typescript
// In context
useEffect(() => {
  loadAssets();
}, [loadAssets]);

const loadAssets = useCallback(async () => {
  const data = await window.db.getAssets();
  setAssets(data); // Already transformed
}, []);
```

### **Data Mutations**
```typescript
const updateAsset = async (id: string, asset: Asset) => {
  await window.db.updateAsset(id, asset);
  setAssets(prev => prev.map(a => a.id === id ? asset : a));
  toast({ title: "Asset Updated" });
};
```

### **Filtering**
```typescript
// Always use String() for ID comparisons
const filtered = items.filter(item => 
  String(item.siteId) === String(targetSiteId)
);
```

---

## 12. Migration Strategy

When making breaking changes:

1. **Database Schema Changes**
   - Create migration script in `electron/migrateDatabase.js`
   - Test with backup database first
   - Update `databaseSetup.js` for new installations

2. **Type Changes**
   - Update `src/types/` first
   - Fix TypeScript errors
   - Test thoroughly

3. **Refactoring**
   - Make one change at a time
   - Test each change
   - Use version control

---

## 13. Testing Strategy

### **Manual Testing Checklist**
- [ ] Create asset
- [ ] Update asset
- [ ] Delete asset
- [ ] Create waybill
- [ ] Send to site
- [ ] Process return
- [ ] Check inventory calculations
- [ ] Verify site quantities

### **Key Test Scenarios**
1. Full waybill flow (create → send → return)
2. Asset quantity changes (buy → send → return → damage)
3. Multi-site operations
4. Permission-based access

---

## 14. Performance Considerations

### **Database Queries**
- Use indexes on frequently queried columns
- Avoid N+1 queries (batch operations)
- Pre-calculate complex values

### **React Rendering**
- Use `useCallback` for functions passed as props
- Use `useMemo` for expensive calculations
- Avoid inline object/array creation in render

### **Data Loading**
- Load data in contexts, not individual components
- Cache transformed data
- Debounce search/filter operations

---

## 15. Security

### **Authentication**
- Store password hashes using bcrypt
- Never expose password hashes to frontend
- Check permissions before mutations

### **Data Validation**
- Validate on both frontend and backend
- Sanitize user input
- Use TypeScript for type safety

### **Database**
- Use parameterized queries (Knex handles this)
- Validate foreign key constraints
- Implement soft deletes where appropriate

---

## Version History

- **v1.0.0** (2025-01-07) - Initial architecture documentation
  - Established ID type standards
  - Defined state management patterns
  - Documented asset calculation formulas
  - Clarified site relationship patterns
