# Android Notifications Setup

## Current Status
The notification utility (`src/utils/notifications.ts`) is already platform-agnostic and will work on Android with proper Capacitor configuration.

## Setup Steps

### 1. Install Capacitor Local Notifications Plugin

```bash
npm install @capacitor/local-notifications
npx cap sync android
```

### 2. Update Android Permissions

The plugin should automatically add permissions, but verify in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### 3. Update Notification Utility

Replace `src/utils/notifications.ts` with the enhanced version:

```typescript
import { toast } from 'sonner';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface NotificationOptions {
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  force?: boolean;
}

export const sendNotification = async ({ title, body, type = 'info', force = false }: NotificationOptions) => {
  // Check preferences
  let inAppEnabled = true;

  try {
    const prefsStr = localStorage.getItem('user_preferences');
    if (prefsStr) {
      const prefs = JSON.parse(prefsStr);
      if (prefs.inAppNotifications === false) {
        inAppEnabled = false;
      }
    }
  } catch (e) {
    console.warn('Failed to parse notifications preferences', e);
  }

  // If force is true, bypass preference check
  if (!inAppEnabled && !force) {
    return;
  }

  // 1. Show In-App Toast (works on all platforms)
  const showToast = (message: string, description: string) => {
    switch (type) {
      case 'success':
        toast.success(message, { description });
        break;
      case 'error':
        toast.error(message, { description });
        break;
      case 'warning':
        toast.warning(message, { description });
        break;
      case 'info':
      default:
        toast.info(message, { description });
    }
  };

  showToast(title, body);

  // 2. Native Notifications
  const platform = Capacitor.getPlatform();

  if (platform === 'android' || platform === 'ios') {
    // Capacitor Native Notifications (Android/iOS)
    try {
      // Request permission if not granted
      const permission = await LocalNotifications.checkPermissions();
      
      if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
        await LocalNotifications.requestPermissions();
      }

      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title: title,
              body: body,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) }, // Show immediately
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: null
            }
          ]
        });
      }
    } catch (error) {
      console.warn('Failed to show native notification on mobile', error);
    }
  } else if (window.electronAPI) {
    // Electron (Windows/Mac/Linux)
    window.electronAPI.showNotification({ title, body });
  } else if ('Notification' in window) {
    // Web Notifications API fallback
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  }
};
```

### 4. Request Notification Permission on App Start (Android)

Add to `src/App.tsx` or your main component:

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

useEffect(() => {
  const requestNotificationPermission = async () => {
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      const permission = await LocalNotifications.checkPermissions();
      
      if (permission.display === 'prompt' || permission.display === 'prompt-with-rationale') {
        await LocalNotifications.requestPermissions();
      }
    }
  };

  requestNotificationPermission();
}, []);
```

## Features on Android

### ✅ What Works
1. **In-App Toast Notifications** - Already working via Sonner
2. **Native Android Notifications** - After setup above
3. **Notification Preferences** - Saved to Supabase, works across devices
4. **Notification Sounds** - Default Android notification sound
5. **Notification Icons** - Uses app icon
6. **Notification Tray** - Appears in Android notification drawer

### 🎯 Android-Specific Features You Can Add

1. **Notification Channels** (Android 8.0+)
```typescript
await LocalNotifications.createChannel({
  id: 'inventory_alerts',
  name: 'Inventory Alerts',
  description: 'Notifications for low stock and waybill updates',
  importance: 4, // High importance
  visibility: 1,
  sound: 'default',
  vibration: true
});
```

2. **Action Buttons**
```typescript
notifications: [{
  title: 'Low Stock Alert',
  body: 'Item XYZ is running low',
  id: Date.now(),
  actionTypeId: 'LOW_STOCK',
  extra: { itemId: '123' }
}]
```

3. **Scheduled Notifications**
```typescript
// Schedule weekly report for Friday at 5 PM
await LocalNotifications.schedule({
  notifications: [{
    title: 'Weekly Inventory Report',
    body: 'Your weekly report is ready',
    id: Date.now(),
    schedule: {
      on: {
        weekday: 6, // Friday
        hour: 17,
        minute: 0
      },
      every: 'week'
    }
  }]
});
```

## Testing on Android

### 1. Build and Run
```bash
npm run build
npx cap sync android
npx cap open android
```

### 2. Test Notifications
- Save preferences in the app
- Trigger a test notification
- Check Android notification drawer
- Verify sound/vibration works

### 3. Test Scenarios
- [ ] App in foreground - shows toast + notification
- [ ] App in background - shows notification in drawer
- [ ] App closed - notification wakes app when tapped
- [ ] Preferences disabled - no notifications shown
- [ ] Permission denied - graceful fallback to in-app only

## Platform Comparison

| Feature | Windows (Electron) | Android (Capacitor) | Web Browser |
|---------|-------------------|---------------------|-------------|
| In-App Toasts | ✅ | ✅ | ✅ |
| Native Notifications | ✅ Windows Action Center | ✅ Android Drawer | ✅ Browser Notifications |
| System Tray | ✅ | ❌ (Not applicable) | ❌ |
| Background Notifications | ✅ | ✅ | ⚠️ (Limited) |
| Scheduled Notifications | ⚠️ (Manual) | ✅ Built-in | ❌ |
| Notification Sounds | ✅ | ✅ | ⚠️ (Limited) |
| Action Buttons | ⚠️ (Limited) | ✅ | ⚠️ (Limited) |

## Important Notes

1. **Android 13+ (API 33)**: Requires runtime permission for notifications
2. **Battery Optimization**: Users may need to disable battery optimization for background notifications
3. **Notification Channels**: Required for Android 8.0+ (automatically created by plugin)
4. **Deep Linking**: Can open specific app screens when notification is tapped

## Troubleshooting

### Notifications Not Showing on Android
1. Check app has notification permission in Android Settings
2. Verify battery optimization is disabled for the app
3. Check notification channel is enabled
4. Ensure app is not in "Do Not Disturb" mode

### Permission Denied
- Guide users to Settings > Apps > DCEL Inventory > Notifications
- Show in-app message explaining how to enable

### Background Notifications Not Working
- Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```
