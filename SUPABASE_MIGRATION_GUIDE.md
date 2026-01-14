# Supabase Migration Guide

This guide will help you migrate your Genesis Glow Asset Manager from Electron-only (SQLite) to a hybrid system that works on both Desktop (Electron) and Mobile (Android/iOS) using Supabase as the backend.

## 📋 Prerequisites

1. **Supabase Account**: You already have one configured at `https://joiucyklhwtspwrwkuei.supabase.co`
2. **Node.js**: Installed (you already have this)
3. **Android Studio**: Required for building Android apps (download from https://developer.android.com/studio)

## 🗄️ Step 1: Set Up Supabase Database

### 1.1 Run the SQL Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/joiucyklhwtspwrwkuei
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Paste it into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)

This will create all your tables, indexes, and Row Level Security policies.

### 1.2 Verify Tables Were Created

1. Click on **Table Editor** in the left sidebar
2. You should see all these tables:
   - users
   - sites
   - employees
   - vehicles
   - assets
   - waybills
   - quick_checkouts
   - equipment_logs
   - consumable_logs
   - return_bills
   - return_items
   - company_settings
   - saved_api_keys
   - site_transactions
   - activities
   - metrics_snapshots

### 1.3 Configure Authentication (Important!)

Since your app uses custom username/password authentication (not email), you need to:

**Option A: Keep Custom Auth (Recommended for now)**
- Your app will continue using the `users` table directly
- Password hashing will be handled in the app
- This is what the current `dataService.ts` does

**Option B: Use Supabase Auth (More Secure, but requires more changes)**
- Would require migrating to Supabase's built-in auth system
- Users would need email addresses
- More secure but requires more refactoring

For now, stick with **Option A**.

## 🔧 Step 2: Update Your Code to Use Data Service

You need to replace all direct `window.electronAPI.db` calls with the new `dataService`.

### 2.1 Update AuthContext

Open `src/contexts/AuthContext.tsx` and replace the database calls:

**Before:**
```typescript
const result = await window.electronAPI.db.login(username, password);
```

**After:**
```typescript
import { dataService } from '@/services/dataService';

const result = await dataService.auth.login(username, password);
```

Do this for all auth methods:
- `login` → `dataService.auth.login`
- `getUsers` → `dataService.auth.getUsers`
- `createUser` → `dataService.auth.createUser`
- `updateUser` → `dataService.auth.updateUser`
- `deleteUser` → `dataService.auth.deleteUser`

### 2.2 Update AppDataContext

Open `src/contexts/AppDataContext.tsx`:

**Before:**
```typescript
const loadedEmployees = await window.electronAPI.db.getEmployees();
```

**After:**
```typescript
import { dataService } from '@/services/dataService';

const loadedEmployees = await dataService.employees.getEmployees();
```

Replace all methods:
- `getQuickCheckouts` → `dataService.quickCheckouts.getQuickCheckouts`
- `getEmployees` → `dataService.employees.getEmployees`
- `getVehicles` → `dataService.vehicles.getVehicles`
- `getSites` → `dataService.sites.getSites`
- `getCompanySettings` → `dataService.companySettings.getCompanySettings`
- `getSiteTransactions` → `dataService.siteTransactions.getSiteTransactions`
- `getEquipmentLogs` → `dataService.equipmentLogs.getEquipmentLogs`

### 2.3 Update AssetsContext

Open `src/contexts/AssetsContext.tsx`:

Replace all asset-related calls:
- `getAssets` → `dataService.assets.getAssets`
- `createAsset` → `dataService.assets.createAsset`
- `updateAsset` → `dataService.assets.updateAsset`
- `deleteAsset` → `dataService.assets.deleteAsset`

### 2.4 Update WaybillsContext

Open `src/contexts/WaybillsContext.tsx`:

Replace all waybill-related calls:
- `getWaybills` → `dataService.waybills.getWaybills`
- `createWaybill` → `dataService.waybills.createWaybill`
- `updateWaybill` → `dataService.waybills.updateWaybill`
- `deleteWaybill` → `dataService.waybills.deleteWaybill`

### 2.5 Search for All Other electronAPI Calls

Run this command to find all remaining direct calls:
```powershell
npx grep-search "window.electronAPI.db" src/
```

Replace each one with the appropriate `dataService` call.

## 📱 Step 3: Add Capacitor for Mobile Support

### 3.1 Install Capacitor

```powershell
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 3.2 Initialize Capacitor

```powershell
npx cap init "Genesis Glow" com.dcel.assetmanager --web-dir dist
```

### 3.3 Add Android Platform

```powershell
npx cap add android
```

### 3.4 Update Capacitor Config

Edit `capacitor.config.ts` (it will be created):

```typescript
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.dcel.assetmanager',
  appName: 'Genesis Glow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

## 🏗️ Step 4: Build and Test

### 4.1 Test Desktop (Electron) - Should Still Work

```powershell
npm run build
npm run electron:dev
```

The app should work exactly as before because `dataService` detects Electron and uses the local SQLite database.

### 4.2 Build for Web (Uses Supabase)

```powershell
npm run build
npm run preview
```

Open http://localhost:4173 in your browser. This will use Supabase.

### 4.3 Build for Android

```powershell
# Build the web app
npm run build

# Sync with Capacitor
npx cap sync

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle to finish syncing
2. Click the green **Run** button
3. Select an emulator or connected device

## 🔐 Step 5: Security Considerations

### 5.1 Password Hashing

Currently, the Supabase implementation doesn't hash passwords properly. You need to:

1. Install bcrypt for the browser:
```powershell
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

2. Update `dataService.ts` to hash passwords before storing them

### 5.2 Row Level Security (RLS)

The current RLS policies allow any authenticated user to access all data. You should refine these based on user roles:

```sql
-- Example: Only admins can delete users
CREATE POLICY "Only admins can delete users" ON users
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );
```

## 📊 Step 6: Data Migration (Optional)

If you want to migrate existing SQLite data to Supabase:

### 6.1 Export from SQLite

Create a script to export your data:

```javascript
// export-data.js
const db = require('better-sqlite3')('database.db');

const tables = ['users', 'sites', 'employees', 'vehicles', 'assets', /* ... */];

tables.forEach(table => {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  require('fs').writeFileSync(
    `export/${table}.json`,
    JSON.stringify(rows, null, 2)
  );
});
```

### 6.2 Import to Supabase

Use the Supabase dashboard or create an import script using the Supabase client.

## 🧪 Step 7: Testing Checklist

- [ ] Desktop app still works with Electron
- [ ] Web app works with Supabase
- [ ] Login works on both platforms
- [ ] Can create/read/update/delete assets
- [ ] Can create waybills
- [ ] Quick checkout works
- [ ] Equipment logs work
- [ ] Company settings sync properly
- [ ] Android app builds successfully
- [ ] Android app can connect to Supabase

## 🚨 Common Issues

### Issue: "Cannot find module '@/services/dataService'"

**Solution**: Make sure the file exists and your TypeScript paths are configured correctly in `tsconfig.json`.

### Issue: "Supabase RLS policy prevents access"

**Solution**: Check your RLS policies in Supabase dashboard. For testing, you can temporarily disable RLS on a table.

### Issue: "Android app shows blank screen"

**Solution**: 
1. Check the browser console in Android Studio (View → Tool Windows → Logcat)
2. Make sure your `.env` variables are being loaded
3. Verify Supabase credentials are correct

### Issue: "Password authentication fails on Supabase"

**Solution**: You need to implement proper password hashing. See Step 5.1.

## 📚 Next Steps

1. **Implement proper password hashing** for security
2. **Refine RLS policies** based on user roles
3. **Add offline support** using Capacitor's Storage plugin
4. **Implement real-time sync** using Supabase Realtime subscriptions
5. **Add push notifications** for mobile
6. **Build iOS version** using `npx cap add ios`

## 🆘 Need Help?

- Supabase Docs: https://supabase.com/docs
- Capacitor Docs: https://capacitorjs.com/docs
- Your current Supabase project: https://supabase.com/dashboard/project/joiucyklhwtspwrwkuei
