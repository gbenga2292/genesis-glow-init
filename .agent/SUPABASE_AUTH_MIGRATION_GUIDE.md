# Supabase Auth Migration Guide

## Overview
This guide explains how to migrate from the custom authentication system to Supabase Auth.

**⚠️ CRITICAL:** This migration will invalidate all existing user sessions. Users will need to log in again.

---

## What's Changing

### Before (Insecure ❌)
```typescript
// Password hashes exposed to client
const { data } = await supabase
  .from('users')
  .select('*')  // Includes password_hash!
  .eq('username', username);

// Client-side password verification
const isMatch = await bcrypt.compare(password, data.password_hash);

// Client-side only permissions
if (!hasPermission('delete')) return; // Bypassable!
```

### After (Secure ✅)
```typescript
// Supabase Auth handles authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

// Password never leaves Supabase servers
// RLS policies enforce permissions at database level
// No password hashes exposed to client
```

---

## Migration Steps

### Step 1: Apply Database Migrations

```bash
# 1. Backup your database first!
pg_dump -h your-db-host -U postgres -d your-db > backup_$(date +%Y%m%d).sql

# 2. Apply RLS migration
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20260217_enable_rls.sql

# 3. Apply policies migration
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20260217_create_policies.sql

# 4. Verify
psql -h your-db-host -U postgres -d your-db -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

### Step 2: Migrate Existing Users

Run the user migration script to create Supabase Auth accounts for all existing users:

```bash
# This script will:
# 1. Read all users from the 'users' table
# 2. Create Supabase Auth accounts
# 3. Link them to the new 'profiles' table
# 4. Preserve all user data

npm run migrate:users
```

**Note:** Users will need to reset their passwords using the "Forgot Password" flow since we cannot decrypt existing password hashes.

### Step 3: Update Frontend Code

```bash
# 1. Backup current AuthContext
cp src/contexts/AuthContext.tsx src/contexts/AuthContext.old.tsx

# 2. Replace with new secure version
cp src/contexts/AuthContext.new.tsx src/contexts/AuthContext.tsx

# 3. Update imports if needed
# Most components should work without changes
```

### Step 4: Test Authentication

1. **Test Login Flow**
   - Try logging in with existing user
   - Verify profile data loads correctly
   - Check permissions work

2. **Test User Creation**
   - Create new user as admin
   - Verify email confirmation
   - Test login with new user

3. **Test RLS Policies**
   - Login as different roles (admin, manager, staff)
   - Verify data access restrictions
   - Test CRUD operations

### Step 5: Deploy

1. **Staging Deployment**
   - Deploy to staging environment
   - Run full test suite
   - Verify all features work

2. **Production Deployment**
   - Schedule maintenance window
   - Notify users of upcoming changes
   - Deploy migrations
   - Deploy frontend changes
   - Monitor for errors

3. **Post-Deployment**
   - Send password reset emails to all users
   - Monitor error logs
   - Provide support for login issues

---

## User Migration Script

Create `scripts/migrate-users.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key for admin operations
);

async function migrateUsers() {
  console.log('Starting user migration...');

  // 1. Fetch all users from old 'users' table
  const { data: oldUsers, error: fetchError } = await supabase
    .from('users')
    .select('*');

  if (fetchError) {
    console.error('Error fetching users:', fetchError);
    return;
  }

  console.log(`Found ${oldUsers.length} users to migrate`);

  let successCount = 0;
  let errorCount = 0;

  // 2. Create Supabase Auth account for each user
  for (const user of oldUsers) {
    try {
      // Generate temporary password (user will need to reset)
      const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email || `${user.username}@temp.local`,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          name: user.name,
          role: user.role,
          migrated_from_old_system: true,
        },
      });

      if (authError) {
        console.error(`Error creating auth user for ${user.username}:`, authError);
        errorCount++;
        continue;
      }

      // 3. Update profile with user data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: user.username,
          name: user.name,
          role: user.role,
          email: user.email,
          bio: user.bio,
          phone: user.phone,
          avatar: user.avatar,
          avatar_color: user.avatar_color,
          is_active: user.status === 'active',
          preferences: user.preferences,
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error(`Error updating profile for ${user.username}:`, profileError);
        errorCount++;
        continue;
      }

      console.log(`✓ Migrated user: ${user.username}`);
      successCount++;

    } catch (error) {
      console.error(`Exception migrating user ${user.username}:`, error);
      errorCount++;
    }
  }

  console.log('\nMigration complete!');
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log('\n⚠️  IMPORTANT: All users need to reset their passwords!');
}

migrateUsers();
```

Add to `package.json`:
```json
{
  "scripts": {
    "migrate:users": "tsx scripts/migrate-users.ts"
  }
}
```

---

## Breaking Changes

### 1. User ID Format
- **Old:** BIGINT (numeric)
- **New:** UUID (string)
- **Impact:** Any code that assumes numeric IDs needs updating

### 2. Login Method
- **Old:** Username + Password
- **New:** Email + Password
- **Impact:** Login form needs email field

### 3. Session Management
- **Old:** localStorage only
- **New:** Supabase session tokens
- **Impact:** Better security, automatic refresh

### 4. Password Reset
- **Old:** Admin resets password
- **New:** Self-service email reset
- **Impact:** Users can reset own passwords

---

## Rollback Plan

If issues occur, you can rollback:

```bash
# 1. Restore database from backup
psql -h your-db-host -U postgres -d your-db < backup_YYYYMMDD.sql

# 2. Revert frontend code
git revert <commit-hash>

# 3. Redeploy old version
npm run build
npm run deploy
```

---

## Testing Checklist

- [ ] Database migrations applied successfully
- [ ] RLS policies active on all tables
- [ ] Users migrated to Supabase Auth
- [ ] Login works with email + password
- [ ] Logout works correctly
- [ ] Session persists across page refresh
- [ ] Admin can create new users
- [ ] Admin can update user roles
- [ ] Admin can deactivate users
- [ ] RLS enforces permissions (test with different roles)
- [ ] Password reset flow works
- [ ] Profile updates work
- [ ] Avatar upload works
- [ ] Signature upload works
- [ ] Activity logging works
- [ ] No password hashes in network requests
- [ ] No unauthorized data access

---

## Post-Migration Tasks

1. **Send Password Reset Emails**
   ```typescript
   // Script to send reset emails to all users
   for (const user of users) {
     await supabase.auth.resetPasswordForEmail(user.email);
   }
   ```

2. **Update Documentation**
   - Update user manual with new login process
   - Document password reset flow
   - Update admin guide

3. **Monitor & Support**
   - Watch error logs for auth issues
   - Provide support for users having trouble
   - Document common issues and solutions

---

## Security Improvements

### ✅ What We Fixed

1. **Password Hash Exposure**
   - Before: Password hashes sent to client
   - After: Passwords never leave Supabase servers

2. **Client-Side Authorization**
   - Before: Permissions checked only on client
   - After: RLS enforces permissions at database level

3. **Session Security**
   - Before: Simple localStorage tokens
   - After: Secure JWT tokens with automatic refresh

4. **Password Reset**
   - Before: Admin must manually reset
   - After: Secure self-service email reset

5. **Account Lockout**
   - Before: No protection against brute force
   - After: Supabase Auth rate limiting

---

## Support

If you encounter issues during migration:

1. Check the error logs
2. Verify database migrations applied correctly
3. Test with different user roles
4. Review the rollback plan
5. Contact support if needed

---

**Migration Status:** 🟡 Ready to Execute  
**Estimated Downtime:** 15-30 minutes  
**User Impact:** All users must log in again and reset passwords
