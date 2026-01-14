# Supabase Migration Checklist

## ✅ What I've Done For You

- [x] Created SQL migration file (`supabase/migrations/001_initial_schema.sql`)
- [x] Created unified data service (`src/services/dataService.ts`)
- [x] Created comprehensive migration guide (`SUPABASE_MIGRATION_GUIDE.md`)

## 📝 What You Need To Do

### Phase 1: Database Setup (30 minutes)

- [ ] **1.1** Go to Supabase Dashboard: https://supabase.com/dashboard/project/joiucyklhwtspwrwkuei
- [ ] **1.2** Open SQL Editor
- [ ] **1.3** Copy contents of `supabase/migrations/001_initial_schema.sql`
- [ ] **1.4** Paste and run in SQL Editor
- [ ] **1.5** Verify all 16 tables were created in Table Editor

### Phase 2: Code Refactoring (2-3 hours)

- [ ] **2.1** Update `src/contexts/AuthContext.tsx`
  - Replace `window.electronAPI.db.login` with `dataService.auth.login`
  - Replace `window.electronAPI.db.getUsers` with `dataService.auth.getUsers`
  - Replace `window.electronAPI.db.createUser` with `dataService.auth.createUser`
  - Replace `window.electronAPI.db.updateUser` with `dataService.auth.updateUser`
  - Replace `window.electronAPI.db.deleteUser` with `dataService.auth.deleteUser`

- [ ] **2.2** Update `src/contexts/AppDataContext.tsx`
  - Replace all `window.electronAPI.db.*` calls with `dataService.*` equivalents

- [ ] **2.3** Update `src/contexts/AssetsContext.tsx`
  - Replace all asset-related `window.electronAPI.db.*` calls

- [ ] **2.4** Update `src/contexts/WaybillsContext.tsx`
  - Replace all waybill-related `window.electronAPI.db.*` calls

- [ ] **2.5** Search and replace remaining calls
  - Run: `npx grep-search "window.electronAPI.db" src/`
  - Replace each occurrence with appropriate `dataService` call

### Phase 3: Testing (1 hour)

- [ ] **3.1** Test Desktop App (Electron)
  ```powershell
  npm run build
  npm run electron:dev
  ```
  - [ ] Login works
  - [ ] Can view assets
  - [ ] Can create waybills
  - [ ] Quick checkout works

- [ ] **3.2** Test Web App (Supabase)
  ```powershell
  npm run build
  npm run preview
  ```
  - [ ] Login works (you may need to create a user in Supabase first)
  - [ ] Can view assets
  - [ ] Can create waybills

### Phase 4: Mobile Setup (1-2 hours)

- [ ] **4.1** Install Capacitor
  ```powershell
  npm install @capacitor/core @capacitor/cli @capacitor/android
  ```

- [ ] **4.2** Initialize Capacitor
  ```powershell
  npx cap init "Genesis Glow" com.dcel.assetmanager --web-dir dist
  ```

- [ ] **4.3** Add Android platform
  ```powershell
  npx cap add android
  ```

- [ ] **4.4** Build and sync
  ```powershell
  npm run build
  npx cap sync
  ```

- [ ] **4.5** Open in Android Studio
  ```powershell
  npx cap open android
  ```

- [ ] **4.6** Download Android Studio if you don't have it
  - Download from: https://developer.android.com/studio
  - Install and set up an Android emulator

- [ ] **4.7** Run on Android
  - Click green "Run" button in Android Studio
  - Test basic functionality

### Phase 5: Security Hardening (1 hour)

- [ ] **5.1** Implement password hashing
  ```powershell
  npm install bcryptjs
  npm install --save-dev @types/bcryptjs
  ```
  - Update `dataService.ts` to hash passwords

- [ ] **5.2** Refine RLS policies in Supabase
  - Add role-based access control
  - Test with different user roles

### Phase 6: Data Migration (Optional, 1-2 hours)

- [ ] **6.1** Export existing SQLite data
- [ ] **6.2** Import to Supabase
- [ ] **6.3** Verify data integrity

## 🎯 Quick Start (Minimum Viable Migration)

If you want to get started quickly, do these steps first:

1. **Run SQL migration in Supabase** (Phase 1)
2. **Update AuthContext only** (Phase 2.1)
3. **Test login on web** (Phase 3.2)

This will prove the concept works before doing the full migration.

## 📊 Estimated Time

- **Minimum (proof of concept)**: 1-2 hours
- **Full migration**: 6-10 hours
- **With Android app**: 8-12 hours

## 🆘 Stuck? Check These

- [ ] `.env` file has correct Supabase credentials
- [ ] Supabase project is active and not paused
- [ ] RLS policies are configured correctly
- [ ] TypeScript imports are correct
- [ ] Build completed without errors

## 📞 Support Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/joiucyklhwtspwrwkuei
- **Supabase Docs**: https://supabase.com/docs
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Migration Guide**: See `SUPABASE_MIGRATION_GUIDE.md` for detailed instructions
