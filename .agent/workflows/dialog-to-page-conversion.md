---
description: Dialog to Page Conversion Plan
---

# Dialog to Full Page Conversion Workflow

This workflow tracks the conversion of dialog-based components to full-page views.

## Completed Conversions

1. ✅ **SiteAssetDetailsPage** - Converted from MachinesSection/ConsumablesSection dialogs
   - Location: `src/pages/SiteAssetDetailsPage.tsx`
   - Routing: Integrated in Index.tsx under 'site-asset-details' view

2. ✅ **AssetAnalyticsPage** - Converted from AssetAnalyticsDialog
   - Location: `src/pages/AssetAnalyticsPage.tsx`
   - Status: Created, needs integration in Index.tsx

## Pending Conversions

### High Priority

3. **EmployeeAnalyticsPage** - Already exists!
   - Location: `src/components/checkout/EmployeeAnalyticsPage.tsx`
   - Action: Move to `src/pages/` and integrate routing

4. **WaybillDocumentPage** - Convert from WaybillDocument dialog
   - Current: `src/components/waybills/WaybillDocument.tsx`
   - Target: `src/pages/WaybillDocumentPage.tsx`
   - Purpose: Full-page view for waybill printing/viewing

5. **ReturnWaybillDocumentPage** - Convert from ReturnWaybillDocument dialog
   - Current: `src/components/waybills/ReturnWaybillDocument.tsx`
   - Target: `src/pages/ReturnWaybillDocumentPage.tsx`
   - Purpose: Full-page view for return waybill documents

6. **ReturnProcessingPage** - Convert from ReturnProcessingDialog
   - Current: `src/components/waybills/ReturnProcessingDialog.tsx`
   - Target: `src/pages/ReturnProcessingPage.tsx`
   - Purpose: Full-page QA/check-in interface for returns

7. **MachineDetailsPage** - Convert from MachineDetailsDialog
   - Current: `src/components/maintenance/MachineDetailsDialog.tsx`
   - Target: `src/pages/MachineDetailsPage.tsx`
   - Purpose: Full machine specifications and status view

### Medium Priority

8. **SiteFormPage** - Convert from SiteForm dialog
   - Current: `src/components/sites/SiteForm.tsx`
   - Target: `src/pages/SiteFormPage.tsx`
   - Purpose: Create/edit site details

### Lower Priority (Keep as dialogs for now)

- RestockDialog - Quick action, suitable for dialog
- ExcelImportDialog - Quick action, suitable for dialog
- SendToSiteDialog - Quick action, suitable for dialog
- BulkAssetOperations - Batch operations, suitable for dialog

## Integration Steps for Each Conversion

1. Create new page component in `src/pages/`
2. Add routing state in Index.tsx (e.g., `selectedAssetForAnalytics`)
3. Add view case in renderContent switch statement
4. Update navigation triggers (replace dialog open with view change)
5. Add onBack handler to return to previous view
6. Test navigation flow
7. Remove old dialog component (or mark deprecated)

## Current View State Pattern

```typescript
// State for page navigation
const [selectedAssetForAnalytics, setSelectedAssetForAnalytics] = useState<Asset | null>(null);
const [selectedWaybillForView, setSelectedWaybillForView] = useState<Waybill | null>(null);

// In renderContent switch
case 'asset-analytics':
  return selectedAssetForAnalytics ? (
    <AssetAnalyticsPage
      asset={selectedAssetForAnalytics}
      onBack={() => {
        setSelectedAssetForAnalytics(null);
        setActiveTab('inventory');
      }}
      // ... other props
    />
  ) : null;
```
