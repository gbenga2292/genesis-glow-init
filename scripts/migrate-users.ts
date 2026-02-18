/**
 * User Migration Script
 * 
 * Migrates users from the old 'users' table to Supabase Auth + profiles table
 * 
 * Usage:
 *   npm install tsx
 *   tsx scripts/migrate-users.ts
 * 
 * Environment variables required:
 *   VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
    console.error('\nPlease set these in your .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

interface OldUser {
    id: number;
    username: string;
    name: string;
    role: string;
    email?: string;
    bio?: string;
    phone?: string;
    avatar?: string;
    avatar_color?: string;
    status?: string;
    preferences?: any;
    created_at: string;
}

async function migrateUsers() {
    console.log('🚀 Starting user migration from old system to Supabase Auth...\n');

    // 1. Fetch all users from old 'users' table
    console.log('📋 Fetching users from old "users" table...');
    const { data: oldUsers, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

    if (fetchError) {
        console.error('❌ Error fetching users:', fetchError);
        return;
    }

    if (!oldUsers || oldUsers.length === 0) {
        console.log('⚠️  No users found to migrate');
        return;
    }

    console.log(`✓ Found ${oldUsers.length} users to migrate\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors: Array<{ username: string; error: string }> = [];

    // 2. Migrate each user
    for (let i = 0; i < oldUsers.length; i++) {
        const user = oldUsers[i] as OldUser;
        const progress = `[${i + 1}/${oldUsers.length}]`;

        try {
            // Generate email if not present
            const email = user.email || `${user.username}@temp.local`;

            // Check if user already exists in auth.users
            const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
            const userExists = existingAuthUser?.users.some(u => u.email === email);

            if (userExists) {
                console.log(`${progress} ⏭️  Skipped: ${user.username} (already migrated)`);
                skippedCount++;
                continue;
            }

            // Generate temporary password (user will need to reset)
            const tempPassword = `Temp${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}!A1`;

            // Create Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: tempPassword,
                email_confirm: true, // Auto-confirm for migrated users
                user_metadata: {
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    migrated_from_old_system: true,
                    migrated_at: new Date().toISOString(),
                    old_user_id: user.id,
                },
            });

            if (authError) {
                console.error(`${progress} ❌ Error creating auth user for ${user.username}:`, authError.message);
                errors.push({ username: user.username, error: authError.message });
                errorCount++;
                continue;
            }

            if (!authData.user) {
                console.error(`${progress} ❌ No user data returned for ${user.username}`);
                errors.push({ username: user.username, error: 'No user data returned' });
                errorCount++;
                continue;
            }

            // 3. Update profile with user data (profile created automatically by trigger)
            // Wait a bit for trigger to complete
            await new Promise(resolve => setTimeout(resolve, 100));

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    email: email,
                    bio: user.bio || null,
                    phone: user.phone || null,
                    avatar: user.avatar || null,
                    avatar_color: user.avatar_color || null,
                    is_active: user.status === 'active' || !user.status,
                    preferences: user.preferences || {
                        emailNotifications: true,
                        inAppNotifications: true,
                        lowStockAlerts: true,
                        waybillUpdates: true,
                        weeklyReport: false,
                    },
                })
                .eq('id', authData.user.id);

            if (profileError) {
                console.error(`${progress} ❌ Error updating profile for ${user.username}:`, profileError.message);
                errors.push({ username: user.username, error: `Profile update: ${profileError.message}` });
                errorCount++;

                // Clean up auth user if profile update failed
                await supabase.auth.admin.deleteUser(authData.user.id);
                continue;
            }

            console.log(`${progress} ✓ Migrated: ${user.username} (${user.role})`);
            successCount++;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`${progress} ❌ Exception migrating ${user.username}:`, errorMessage);
            errors.push({ username: user.username, error: errorMessage });
            errorCount++;
        }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total users:     ${oldUsers.length}`);
    console.log(`✓ Migrated:      ${successCount}`);
    console.log(`⏭️  Skipped:       ${skippedCount}`);
    console.log(`❌ Errors:        ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0) {
        console.log('\n❌ Errors encountered:');
        errors.forEach(({ username, error }) => {
            console.log(`   - ${username}: ${error}`);
        });
    }

    if (successCount > 0) {
        console.log('\n⚠️  IMPORTANT NEXT STEPS:');
        console.log('1. All migrated users need to reset their passwords');
        console.log('2. Send password reset emails to all users:');
        console.log('   - Use Supabase Dashboard > Authentication > Users');
        console.log('   - Or run: npm run send-reset-emails');
        console.log('\n3. Test login with migrated users');
        console.log('4. Verify RLS policies are working');
        console.log('5. Once confirmed, you can archive the old "users" table');
    }

    console.log('\n✅ Migration complete!\n');
}

// Run migration
migrateUsers()
    .then(() => {
        console.log('👋 Exiting...');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Fatal error:', error);
        process.exit(1);
    });
