# Notification Triggers Implementation Guide

## Overview
This guide shows you how to integrate the notification triggers into your existing application.

## Files Created

1. **`src/utils/notificationTriggers.ts`** - Core notification trigger managers
2. **`src/hooks/useNotificationMonitoring.ts`** - React hooks for monitoring
3. **`src/components/notifications/NotificationPanel.tsx`** - UI component for notifications
4. **`src/services/emailNotificationService.ts`** - Email notification service

---

## 1. Low Stock Alerts

### How It Works
- Checks inventory every 30 minutes
- Only notifies once per item until restocked
- Non-invasive: Single notification for multiple items
- Click notification to navigate to low stock filter page

### Integration Steps

#### Step 1: Add to Your Dashboard or App Component

```typescript
// In src/App.tsx or src/pages/DashboardPage.tsx
import { useLowStockMonitoring } from '@/hooks/useNotificationMonitoring';
import { useInventory } from '@/contexts/InventoryContext'; // Your existing context

function Dashboard() {
  const { assets } = useInventory(); // Your existing assets state
  
  // Add this hook - it will automatically monitor for low stock
  useLowStockMonitoring(assets);
  
  // ... rest of your component
}
```

#### Step 2: Add Low Stock Filter to Inventory Page

```typescript
// In src/pages/InventoryPage.tsx
import { useSearchParams } from 'react-router-dom';
import { resetAllLowStockNotifications } from '@/hooks/useNotificationMonitoring';

function InventoryPage() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  
  useEffect(() => {
    // When user views low stock page, reset notifications
    if (filter === 'low-stock') {
      resetAllLowStockNotifications();
    }
  }, [filter]);
  
  // Filter assets based on query param
  const filteredAssets = useMemo(() => {
    if (filter === 'low-stock') {
      return assets.filter(asset => 
        asset.quantity <= asset.lowStockThreshold && asset.quantity > 0
      );
    }
    return assets;
  }, [assets, filter]);
  
  // ... rest of your component
}
```

#### Step 3: Reset Notification When Item is Restocked

```typescript
// When updating asset quantity
import { resetLowStockNotification } from '@/hooks/useNotificationMonitoring';

const handleRestock = async (assetId: string, newQuantity: number) => {
  await updateAsset(assetId, { quantity: newQuantity });
  
  // Reset notification if item is no longer low stock
  const asset = assets.find(a => a.id === assetId);
  if (asset && newQuantity > asset.lowStockThreshold) {
    resetLowStockNotification(assetId);
  }
};
```

---

## 2. Waybill Status Updates

### How It Works
- Monitors waybill status changes
- Notifies when status changes (pending → approved → sent to site, etc.)
- Click notification to view specific waybill

### Integration Steps

#### Step 1: Add to Waybill List Page

```typescript
// In src/pages/WaybillsPage.tsx
import { useWaybillStatusMonitoring } from '@/hooks/useNotificationMonitoring';

function WaybillsPage() {
  const { waybills } = useWaybills(); // Your existing waybills state
  
  // Add this hook - it will automatically monitor status changes
  useWaybillStatusMonitoring(waybills);
  
  // ... rest of your component
}
```

#### Step 2: Notify When Manually Updating Status

```typescript
// When updating waybill status
import { notifyWaybillStatusChange } from '@/hooks/useNotificationMonitoring';

const handleStatusUpdate = async (waybillId: string, newStatus: string) => {
  const waybill = waybills.find(w => w.id === waybillId);
  const oldStatus = waybill?.status;
  
  // Update in database
  await updateWaybill(waybillId, { status: newStatus });
  
  // Send notification
  if (oldStatus && oldStatus !== newStatus) {
    notifyWaybillStatusChange(
      waybillId,
      waybill.waybillNumber,
      oldStatus,
      newStatus
    );
  }
};
```

---

## 3. Weekly Reports

### How It Works
- Automatically sends report every Friday at 5 PM
- Checks every hour to see if it's time
- Only sends once per day
- Click notification to view report page

### Integration Steps

#### Step 1: Initialize in App Component

```typescript
// In src/App.tsx
import { weeklyReportManager } from '@/utils/notificationTriggers';

function App() {
  useEffect(() => {
    // Weekly report manager auto-initializes and checks on schedule
    // No additional code needed - it runs automatically!
  }, []);
  
  // ... rest of your component
}
```

#### Step 2: Create Weekly Report Page (Optional)

```typescript
// Create src/pages/ReportsPage.tsx
import { useSearchParams } from 'react-router-dom';

function ReportsPage() {
  const [searchParams] = useSearchParams();
  const reportType = searchParams.get('type');
  
  if (reportType === 'weekly') {
    // Show weekly report
    return <WeeklyReportView />;
  }
  
  // ... other report types
}
```

#### Step 3: Manual Trigger (Admin Only)

```typescript
// Add a button for admins to manually trigger report
import { weeklyReportManager } from '@/utils/notificationTriggers';

<Button onClick={() => weeklyReportManager.triggerManualReport()}>
  Send Weekly Report Now
</Button>
```

---

## 4. Email Notifications

### How It Works
- Sends emails to users who have `emailNotifications: true` in preferences
- Batches emails for efficiency
- Uses templates for different notification types

### Integration Steps

#### Step 1: Set Up Email Backend

You need to choose an email service. Options:

**Option A: Supabase Edge Function (Recommended)**

Create `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, subject, body, type } = await req.json()
  
  // Use your email service (SendGrid, AWS SES, etc.)
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SENDGRID_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'noreply@yourapp.com' },
      subject,
      content: [{ type: 'text/plain', value: body }]
    })
  })
  
  return new Response(JSON.stringify({ success: response.ok }))
})
```

**Option B: Direct Integration**

Update `src/services/emailNotificationService.ts` line 20 to use your email service directly.

#### Step 2: Send Emails for Low Stock

```typescript
// In your low stock monitoring
import { sendLowStockEmail } from '@/services/emailNotificationService';
import { useAuth } from '@/contexts/AuthContext';

const { currentUser } = useAuth();

// When low stock is detected
if (currentUser?.preferences?.emailNotifications && currentUser.email) {
  await sendLowStockEmail(
    currentUser.email,
    currentUser.name,
    lowStockItems
  );
}
```

#### Step 3: Batch Send to All Users

```typescript
// For weekly reports - send to all users with email enabled
import { batchSendEmails } from '@/services/emailNotificationService';
import { getUsers } from '@/services/dataService';

const sendWeeklyReportToAll = async () => {
  const users = await getUsers();
  
  const reportData = {
    totalAssets: 150,
    lowStockItems: 5,
    activeWaybills: 12,
    completedWaybills: 45
  };
  
  const result = await batchSendEmails(users, 'weekly_report', reportData);
  console.log(`Sent ${result.successful} emails, ${result.failed} failed`);
};
```

---

## 5. Add Notification Panel to UI

### Step 1: Add to App Menu Bar

```typescript
// In src/components/layout/AppMenuBar.tsx
import { NotificationPanel } from '@/components/notifications/NotificationPanel';

function AppMenuBar() {
  return (
    <div className="menu-bar">
      {/* ... other menu items ... */}
      
      <NotificationPanel />
      
      {/* ... user profile dropdown ... */}
    </div>
  );
}
```

### Step 2: Style Integration

The NotificationPanel is already styled to match your app. It includes:
- Bell icon with unread badge
- Dropdown panel with notifications
- Click to navigate to relevant page
- Mark as read functionality
- Clear all button

---

## Testing Checklist

### Low Stock Alerts
- [ ] Set an item's quantity below its threshold
- [ ] Wait 30 seconds (or trigger manually)
- [ ] Verify notification appears
- [ ] Click notification and verify navigation to `/inventory?filter=low-stock`
- [ ] Verify notification marked as read
- [ ] Restock item above threshold
- [ ] Verify no duplicate notifications

### Waybill Status Updates
- [ ] Change a waybill status
- [ ] Verify notification appears
- [ ] Click notification and verify navigation to waybill details
- [ ] Verify correct status change message

### Weekly Reports
- [ ] Manually trigger report (for testing)
- [ ] Verify notification appears
- [ ] Click notification and verify navigation to reports page
- [ ] Wait for Friday 5 PM (or change time in code for testing)
- [ ] Verify automatic report sent

### Email Notifications
- [ ] Enable email notifications in preferences
- [ ] Trigger low stock alert
- [ ] Verify email received
- [ ] Verify email content is correct
- [ ] Disable email notifications
- [ ] Verify no email sent

### Notification Panel
- [ ] Verify bell icon shows unread count
- [ ] Click bell to open panel
- [ ] Verify notifications listed correctly
- [ ] Click notification to navigate
- [ ] Verify "Clear All" works
- [ ] Verify panel closes when clicking outside

---

## Configuration Options

### Adjust Check Intervals

```typescript
// In src/utils/notificationTriggers.ts

// Low stock check interval (default: 30 minutes)
private readonly CHECK_INTERVAL = 30 * 60 * 1000;

// Change to 1 hour:
private readonly CHECK_INTERVAL = 60 * 60 * 1000;
```

### Change Weekly Report Schedule

```typescript
// In src/utils/notificationTriggers.ts

// Default: Friday at 5 PM
private readonly REPORT_DAY = 5; // 0 = Sunday, 5 = Friday
private readonly REPORT_HOUR = 17; // 24-hour format

// Change to Monday at 9 AM:
private readonly REPORT_DAY = 1;
private readonly REPORT_HOUR = 9;
```

### Customize Notification Messages

Edit the messages in `src/utils/notificationTriggers.ts`:

```typescript
// Low stock message
body = `${itemCount} items are running low on stock. Click to view details.`;

// Waybill status messages
const statusMessages: Record<string, string> = {
  'pending': 'is pending approval',
  'approved': 'has been approved',
  // ... customize these
};
```

---

## Troubleshooting

### Notifications Not Appearing
1. Check user preferences: `currentUser.preferences.inAppNotifications`
2. Check browser console for errors
3. Verify notification permission granted (for native notifications)

### Low Stock Not Triggering
1. Verify `lowStockThreshold` is set on assets
2. Check that quantity is actually below threshold
3. Verify 30-minute interval has passed

### Emails Not Sending
1. Check email service configuration
2. Verify user has `emailNotifications: true`
3. Check user has valid email address
4. Check email service logs/errors

### Navigation Not Working
1. Verify React Router is set up
2. Check actionUrl in notification matches your routes
3. Ensure navigate function is available

---

## Next Steps

1. **Integrate into your existing pages** (Dashboard, Inventory, Waybills)
2. **Set up email backend** (Supabase Edge Function or direct integration)
3. **Test all notification types**
4. **Customize messages and timing** to your needs
5. **Add notification panel to menu bar**
6. **Deploy and monitor**

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify user preferences are saved correctly
3. Test with different user roles
4. Check notification storage in localStorage: `app_notifications`
