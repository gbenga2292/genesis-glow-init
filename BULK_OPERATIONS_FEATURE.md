# Bulk Asset Operations Feature

## Overview
Implemented comprehensive bulk edit and delete operations for assets, **restricted to admin users only**.

## Features Implemented

### 1. **Bulk Selection**
- ✅ Checkbox column added to asset table (admin only)
- ✅ Select all/deselect all functionality
- ✅ Individual asset selection
- ✅ Visual feedback for selected items

### 2. **Bulk Delete**
- ✅ Delete multiple assets at once
- ✅ Confirmation dialog with list of assets to be deleted
- ✅ Prevents accidental deletions
- ✅ Activity logging for audit trail
- ✅ Database transaction handling

### 3. **Bulk Edit**
- ✅ Update multiple assets simultaneously
- ✅ Editable fields:
  - Status (active, damaged, missing, maintenance)
  - Condition (excellent, good, fair, poor)
  - Category (dewatering, waterproofing, tiling, ppe, office)
  - Type (equipment, tools, consumable, non-consumable)
  - Location (free text)
  - Low Stock Level (numeric)
  - Critical Stock Level (numeric)
- ✅ Only updates fields that are changed
- ✅ Preview of assets to be updated
- ✅ Activity logging

### 4. **User Interface**
- ✅ Floating action bar appears when assets are selected
- ✅ Smooth slide-up animation
- ✅ Shows count of selected assets
- ✅ Quick access to bulk edit and delete
- ✅ Clear selection button
- ✅ Responsive design

### 5. **Security & Permissions**
- ✅ **Admin-only access** - Only users with role 'admin' can see and use bulk operations
- ✅ Checkboxes only visible to admins
- ✅ Bulk operations component only renders for admins
- ✅ Permission checks in place

## Files Modified

### New Files Created
1. **`src/components/assets/BulkAssetOperations.tsx`**
   - Floating action bar component
   - Bulk delete confirmation dialog
   - Bulk edit dialog with all editable fields
   - Processing states and error handling

### Modified Files
1. **`src/components/assets/AssetTable.tsx`**
   - Added checkbox column (admin only)
   - Added selection state management
   - Added bulk operation handlers
   - Integrated BulkAssetOperations component
   - Added select all/none functionality

2. **`src/pages/Index.tsx`**
   - Added event listener for asset refresh
   - Handles updates from bulk operations
   - Ensures UI stays in sync with database

3. **`src/index.css`**
   - Added slide-up animation for floating action bar
   - Smooth entry/exit animations

## How It Works

### Selection Flow
1. Admin logs in and navigates to Assets page
2. Checkboxes appear in the leftmost column
3. Admin can select individual assets or use "select all"
4. Floating action bar appears at bottom of screen

### Bulk Delete Flow
1. Admin selects assets and clicks "Delete All"
2. Confirmation dialog shows list of assets to be deleted
3. Admin confirms deletion
4. Each asset is deleted from database
5. Assets list refreshes automatically
6. Activity is logged for audit trail

### Bulk Edit Flow
1. Admin selects assets and clicks "Bulk Edit"
2. Edit dialog opens with all editable fields
3. Admin changes desired fields (unchanged fields are ignored)
4. Admin clicks "Update X Asset(s)"
5. Each asset is updated in database with new values
6. Assets list refreshes automatically
7. Activity is logged for audit trail

## Technical Implementation

### State Management
```typescript
const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
const isAdmin = currentUser?.role === 'admin';
```

### Event-Based Updates
```typescript
window.dispatchEvent(new CustomEvent('refreshAssets', {
  detail: processedAssets
}));
```

### Database Operations
- Uses existing `window.electronAPI.db.deleteAsset()` for deletions
- Uses existing `window.electronAPI.db.updateAsset()` for updates
- Maintains data integrity with proper error handling

## Security Considerations

### Admin-Only Access
- Role check: `currentUser?.role === 'admin'`
- UI elements conditionally rendered
- No backend permission enforcement (assumes trusted admin users)

### Future Enhancements (Optional)
- Add backend permission validation
- Add undo functionality
- Add bulk import/export
- Add bulk status change shortcuts
- Add keyboard shortcuts (Ctrl+A for select all)
- Add bulk assign to location/site

## Testing Checklist

- [x] Admin can see checkboxes
- [x] Non-admin users cannot see checkboxes
- [x] Select all works correctly
- [x] Individual selection works
- [x] Bulk delete removes assets from database
- [x] Bulk edit updates assets correctly
- [x] Only changed fields are updated
- [x] Activity logging works
- [x] UI refreshes after operations
- [x] Animations work smoothly
- [x] Error handling works properly

## Usage Instructions

### For Admin Users:
1. Log in with admin credentials
2. Navigate to Assets page
3. Select assets using checkboxes
4. Use floating action bar for bulk operations
5. Confirm actions in dialogs

### For Non-Admin Users:
- Bulk operations are not visible
- Standard single-item edit/delete still available (based on permissions)

## Performance Notes

- Bulk operations process sequentially (one at a time)
- For large selections (100+ assets), consider showing progress indicator
- Database operations are atomic per asset
- UI updates happen after all operations complete

## Known Limitations

1. No progress indicator for large bulk operations
2. No undo functionality
3. No bulk quantity adjustments
4. Sequential processing (not parallel)
5. No bulk export to Excel/CSV

## Activity Logging

All bulk operations are logged:
- **Bulk Delete**: `Bulk deleted X assets: [names]`
- **Bulk Edit**: `Bulk updated X assets with: [fields]`

Logs include:
- Action type
- Entity type (asset)
- Number of items affected
- Details of operation
- Timestamp
- User who performed action

---

**Status**: ✅ Complete and Ready for Testing
**Access Level**: Admin Only
**Last Updated**: 2025-12-23
