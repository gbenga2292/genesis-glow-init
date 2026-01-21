# Dialog to Page Conversion - Progress Report

## ✅ Completed Conversions

### 1. SiteAssetDetailsPage
- **Status**: ✅ Complete and Integrated
- **Location**: `src/pages/SiteAssetDetailsPage.tsx`
- **Routing**: Integrated in Index.tsx under `'site-asset-details'` view
- **Features**:
  - Log Entry tab (Equipment/Consumable logging)
  - History tab (View past logs)
  - Analytics tab (Performance metrics)
  - Tracks equipment arrival dates and missed logs
  - Supports both equipment and consumable assets

### 2. AssetAnalyticsPage
- **Status**: ✅ Created, ⏳ Needs Integration
- **Location**: `src/pages/AssetAnalyticsPage.tsx`
- **Next Steps**:
  1. Add state in Index.tsx: `const [selectedAssetForAnalytics, setSelectedAssetForAnalytics] = useState<Asset | null>(null);`
  2. Add routing case in renderContent switch
  3. Update AssetTable onViewAnalytics callback to navigate to page instead of opening dialog
  4. Remove/deprecate AssetAnalyticsDialog component

## 🔄 Ready for Conversion

### 3. EmployeeAnalyticsPage
- **Current Status**: Already exists as a page component!
- **Location**: `src/components/checkout/EmployeeAnalyticsPage.tsx`
- **Action Required**: Already being used as a page, no conversion needed
- **Note**: May need to verify routing is properly set up

### 4. WaybillDocumentPage
- **Priority**: High
- **Current**: Dialog component at `src/components/waybills/WaybillDocument.tsx`
- **Target**: `src/pages/WaybillDocumentPage.tsx`
- **Purpose**: Full-page printable waybill view
- **Current Usage**: Triggered by `setShowWaybillDocument(waybill)` in Index.tsx

### 5. ReturnWaybillDocumentPage
- **Priority**: High
- **Current**: Dialog component at `src/components/waybills/ReturnWaybillDocument.tsx`
- **Target**: `src/pages/ReturnWaybillDocumentPage.tsx`
- **Purpose**: Full-page printable return waybill view
- **Current Usage**: Triggered by `setShowReturnWaybillDocument(waybill)` in Index.tsx

### 6. ReturnProcessingPage
- **Priority**: High
- **Current**: Dialog component at `src/components/waybills/ReturnProcessingDialog.tsx`
- **Target**: `src/pages/ReturnProcessingPage.tsx`
- **Purpose**: QA/Check-in interface for processing returns
- **Current Usage**: Triggered by `setProcessingReturnWaybill(waybill)` in Index.tsx

### 7. MachineDetailsPage
- **Priority**: Medium
- **Current**: Dialog component at `src/components/maintenance/MachineDetailsDialog.tsx`
- **Target**: `src/pages/MachineDetailsPage.tsx`
- **Purpose**: Full machine specifications and status view

### 8. SiteFormPage
- **Priority**: Medium
- **Current**: Dialog component at `src/components/sites/SiteForm.tsx`
- **Target**: `src/pages/SiteFormPage.tsx`
- **Purpose**: Create/edit site details
- **Note**: Currently used within SitesPage component

## 🚫 Keep as Dialogs (Quick Actions)

These components are better suited to remain as dialogs due to their nature as quick, focused actions:

- **RestockDialog** - Quick restock action
- **RestockHistoryDialog** - Quick history view
- **ExcelImportDialog** - File upload action
- **SendToSiteDialog** - Quick waybill creation
- **BulkAssetOperations** - Batch operations overlay
- **QuickCheckoutForm** - Quick checkout action (though could be converted if needed)

## 📋 Implementation Pattern

For each conversion, follow this pattern:

```typescript
// 1. Create page component in src/pages/
export const [ComponentName]Page = ({ data, onBack, ...props }) => {
  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      {/* Header with back button */}
      <div className="flex items-center gap-4 p-6 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Title</h1>
          <p className="text-muted-foreground">Description</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Content here */}
      </div>
    </div>
  );
};

// 2. Add state in Index.tsx
const [selectedItemForView, setSelectedItemForView] = useState<Type | null>(null);

// 3. Add routing case
case 'item-view':
  return selectedItemForView ? (
    <ComponentNamePage
      data={selectedItemForView}
      onBack={() => {
        setSelectedItemForView(null);
        setActiveTab('previous-tab');
      }}
      {...otherProps}
    />
  ) : null;

// 4. Update triggers
// Replace: setShowDialog(true)
// With: setSelectedItemForView(item); setActiveTab('item-view');
```

## 🎯 Next Steps

1. **Integrate AssetAnalyticsPage** (Highest priority)
   - Add routing state and case
   - Update AssetTable callback
   - Test navigation flow

2. **Convert Waybill Documents** (High priority)
   - WaybillDocumentPage
   - ReturnWaybillDocumentPage
   - These are frequently used and benefit from full-page view

3. **Convert ReturnProcessingPage** (High priority)
   - Complex workflow that deserves dedicated page
   - Better UX for QA/check-in process

4. **Convert remaining medium priority pages** as needed

## 🔍 Testing Checklist

For each converted page:
- [ ] Navigation to page works correctly
- [ ] Back button returns to correct previous view
- [ ] All data displays correctly
- [ ] All actions (save, update, delete) work
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] Old dialog component can be safely removed
