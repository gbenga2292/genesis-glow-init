# Notification System Implementation

## Overview
Implemented a comprehensive notification system for the Electron app with the following features:
- System tray integration with minimize-to-tray behavior
- Native OS notifications (Windows notification center)
- In-app toast notifications
- User preferences for notification control
- Backend persistence of notification settings

## Components Modified

### 1. Electron Main Process (`electron/main.js`)
**Changes:**
- Added system tray support with icon and context menu
- Implemented minimize-to-tray behavior (close button hides window instead of quitting)
- Added `isQuitting` flag to differentiate between window close and app quit
- Created IPC handler `show-notification` for native OS notifications
- Modified `window-all-closed` handler to keep app running in tray

**Key Functions:**
- `createTray()`: Creates system tray icon with "Show App" and "Quit" menu
- `mainWindow.on('close')`: Prevents quit, hides window instead
- `ipcMain.handle('show-notification')`: Displays native OS notifications

### 2. Electron Preload Script (`electron/preload.js`)
**Changes:**
- Exposed `showNotification` method to renderer process via `electronAPI`
- Exposed `onDeepLink` for deep linking support

### 3. Type Definitions (`src/vite-env.d.ts`)
**Changes:**
- Added `showNotification` and `onDeepLink` to `electronAPI` interface
- Added proper TypeScript types for notification options

### 4. User Interface (`src/contexts/AuthContext.tsx`)
**Changes:**
- Added `preferences` field to `User` interface with notification settings structure
- Updated `updateUser` signature to accept `preferences` parameter
- Modified user transformation in all auth flows to include preferences

### 5. Data Service (`src/services/dataService.ts`)
**Changes:**
- Updated `updateUser` function to handle `preferences` field
- Added preferences to user object construction in login, MFA verification, and getUsers
- Ensured preferences are persisted to Supabase database

### 6. Preferences UI (`src/components/profile/PreferencesCard.tsx`)
**Changes:**
- Integrated with `useAuth` to access currentUser and updateUser
- Load preferences from backend on component mount
- Save preferences to both localStorage (backup) and Supabase (persistent)
- Use `sendNotification` utility for save confirmation

**Notification Settings:**
- Email Notifications
- In-App Notifications
- Low Stock Alerts
- Waybill Status Updates
- Weekly Report

### 7. Notification Utility (`src/utils/notifications.ts`)
**New File - Central notification handler:**
- Checks user preferences before showing notifications
- Displays in-app toast notifications (via Sonner)
- Triggers native OS notifications (Electron or Web API)
- Supports force flag to bypass preferences for critical alerts
- Handles both Electron and web environments

**Function Signature:**
```typescript
sendNotification({
  title: string,
  body: string,
  type?: 'info' | 'success' | 'warning' | 'error',
  force?: boolean
})
```

## User Flow

### 1. Setting Preferences
1. User navigates to Profile Page → Preferences Card
2. Toggles notification settings (Email, In-App, Low Stock, Waybill Updates, Weekly Report)
3. Clicks "Save Preferences"
4. Preferences saved to:
   - localStorage (fast access, backup)
   - Supabase database (persistent, cross-device)
5. Confirmation notification displayed

### 2. Receiving Notifications
1. App event triggers notification (e.g., low stock detected)
2. `sendNotification()` checks user preferences
3. If enabled:
   - Shows in-app toast notification
   - Triggers native OS notification (appears in Windows notification center)
4. If app is minimized to tray, notification appears in system tray

### 3. Minimize to Tray
1. User clicks close button (X)
2. App hides to system tray (doesn't quit)
3. Tray icon shows in Windows taskbar notification area
4. Double-click tray icon or right-click → "Show App" to restore
5. Right-click → "Quit" to fully close the app

## Database Schema

The `users` table in Supabase should have a `preferences` column (JSONB type) with structure:
```json
{
  "emailNotifications": boolean,
  "inAppNotifications": boolean,
  "lowStockAlerts": boolean,
  "waybillUpdates": boolean,
  "weeklyReport": boolean
}
```

## Next Steps (Future Implementation)

### 1. Notification Triggers
Currently, the notification infrastructure is in place, but specific triggers need to be implemented:

**Low Stock Alerts:**
- Monitor inventory levels
- When asset quantity drops below threshold, call:
  ```typescript
  sendNotification({
    title: 'Low Stock Alert',
    body: `${assetName} is running low (${quantity} remaining)`,
    type: 'warning'
  });
  ```

**Waybill Status Updates:**
- Listen for waybill status changes
- Notify when waybill is sent to site, returned, etc.

**Weekly Reports:**
- Implement scheduled task (backend or Electron main process)
- Generate and send weekly inventory summary

### 2. Email Notifications
- Integrate with email service (e.g., SendGrid, AWS SES)
- Send emails based on `emailNotifications` preference
- Template system for different notification types

### 3. Notification History
- Store notification history in database
- Add "Notifications" panel to view past notifications
- Mark as read/unread functionality

### 4. Advanced Features
- Notification sound preferences
- Do Not Disturb mode
- Notification grouping
- Action buttons in notifications (e.g., "View Waybill")

## Testing

### Manual Testing Checklist
- [ ] System tray icon appears when app starts
- [ ] Close button minimizes to tray (doesn't quit)
- [ ] Double-click tray icon restores window
- [ ] "Quit" from tray menu closes app completely
- [ ] Preferences save successfully
- [ ] Native notifications appear in Windows notification center
- [ ] In-app toasts display correctly
- [ ] Preferences persist after app restart
- [ ] Disabling "In-App Notifications" prevents toasts (except forced)

### Test Notification
To test the notification system, you can add a test button or call:
```typescript
import { sendNotification } from '@/utils/notifications';

sendNotification({
  title: 'Test Notification',
  body: 'This is a test notification from DCEL Inventory',
  type: 'info'
});
```

## Known Issues
None currently identified.

## Dependencies
- `electron`: System tray and native notifications
- `sonner`: In-app toast notifications
- `supabase`: Backend persistence
- No additional npm packages required
