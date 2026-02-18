import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { logActivity } from '@/utils/activityLogger';
import { supabase } from '@/integrations/supabase/client';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';

// User type and role definitions - preset roles
export type UserRole = 'admin' | 'data_entry_supervisor' | 'regulatory' | 'manager' | 'staff' | 'site_worker' | 'custom';

export interface LoginHistory {
    id: string;
    userId: string;
    timestamp: string;
    ipAddress?: string;
    deviceInfo?: string;
    location?: string;
    loginType: 'password' | 'magic_link' | 'oauth';
    status: 'success' | 'failed';
    failureReason?: string;
}

export interface UserPermission {
    id: string;
    action: string; // e.g., 'read_assets', 'write_waybills', etc.
    label: string; // Human-readable label
    description?: string;
    category: 'assets' | 'waybills' | 'employees' | 'settings' | 'reports' | 'users';
}

export interface CustomRole {
    id: string;
    name: string;
    description?: string;
    isPreset: boolean; // true for admin, data_entry_supervisor, etc.
    permissions: string[]; // Array of permission IDs
    created_at: string;
    updated_at: string;
}

// Profile from database (linked to auth.users)
export interface UserProfile {
    id: string; // UUID from auth.users
    username: string;
    role: UserRole;
    customRoleId?: string;
    name: string;
    avatar?: string;
    avatarColor?: string;
    signatureUrl?: string;
    email?: string;
    bio?: string;
    phone?: string;
    status?: 'active' | 'inactive' | 'pending_invite';
    isOnline?: boolean;
    lastActive?: string;
    created_at: string;
    updated_at: string;
    mfa_enabled?: boolean;
    preferences?: {
        emailNotifications: boolean;
        inAppNotifications: boolean;
        lowStockAlerts: boolean;
        waybillUpdates: boolean;
        weeklyReport: boolean;
    };
}

// Combined user type (Supabase Auth + Profile)
export interface User extends UserProfile {
    // Supabase auth fields
    authId: string; // UUID from auth.users
    emailVerified: boolean;
}

interface AuthContextType {
    isAuthenticated: boolean;
    currentUser: User | null;
    session: Session | null;
    login: (email: string, password: string) => Promise<{ success: boolean; message?: string; mfaRequired?: boolean; userId?: string }>;
    logout: () => Promise<void>;
    verifyMFALogin: (userId: string, code: string) => Promise<{ success: boolean; message?: string }>;
    refreshCurrentUser: () => Promise<void>;
    hasPermission: (permission: string) => boolean;
    getUsers: () => Promise<User[]>;
    createUser: (userData: { name: string; username: string; email: string; password: string; role: UserRole; customRoleId?: string }) => Promise<{ success: boolean; message?: string }>;
    updateUser: (userId: string, userData: Partial<UserProfile> & { password?: string }) => Promise<{ success: boolean; message?: string }>;
    deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
    // Enhanced features
    getLoginHistory: (userId: string) => Promise<LoginHistory[]>;
    getCustomRoles: () => Promise<CustomRole[]>;
    createCustomRole: (roleData: { name: string; description?: string; permissions: string[] }) => Promise<{ success: boolean; role?: CustomRole; message?: string }>;
    updateCustomRole: (roleId: string, roleData: { name?: string; description?: string; permissions?: string[] }) => Promise<{ success: boolean; message?: string }>;
    deleteCustomRole: (roleId: string) => Promise<{ success: boolean; message?: string }>;
    getUserPermissions: () => Promise<UserPermission[]>;
    updateUserAvatar: (userId: string, avatar: string, avatarColor?: string) => Promise<{ success: boolean; message?: string }>;
    updateLastActive: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);

    // Fetch user profile from database
    const fetchUserProfile = async (authUser: SupabaseUser): Promise<User | null> => {
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (error) {
                logger.error('Failed to fetch user profile', error);
                return null;
            }

            if (!profile) {
                logger.error('User profile not found');
                return null;
            }

            // Fetch signature if exists
            let signatureUrl: string | undefined;
            try {
                if (profile.signature) {
                    const { data: signedUrl } = await supabase.storage
                        .from('signatures')
                        .createSignedUrl(profile.signature, 3600);
                    signatureUrl = signedUrl?.signedUrl;
                }
            } catch (e) {
                logger.warn('Failed to fetch signature', e);
            }

            const user: User = {
                id: profile.id,
                authId: authUser.id,
                username: profile.username,
                role: profile.role as UserRole,
                name: profile.name,
                email: profile.email || authUser.email,
                phone: profile.phone,
                avatar: profile.avatar,
                signatureUrl,
                status: profile.is_active ? 'active' : 'inactive',
                lastActive: profile.last_active_at,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
                emailVerified: authUser.email_confirmed_at !== null,
                mfa_enabled: false,
                preferences: {
                    emailNotifications: true,
                    inAppNotifications: true,
                    lowStockAlerts: true,
                    waybillUpdates: true,
                    weeklyReport: false,
                },
            };

            return user;
        } catch (error) {
            logger.error('Error fetching user profile', error);
            return null;
        }
    };

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchUserProfile(session.user).then((user) => {
                    setCurrentUser(user);
                    setIsAuthenticated(!!user);
                    setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);

            if (session?.user) {
                const user = await fetchUserProfile(session.user);
                setCurrentUser(user);
                setIsAuthenticated(!!user);
            } else {
                setCurrentUser(null);
                setIsAuthenticated(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    // Login with Supabase Auth
    const login = async (
        email: string,
        password: string
    ): Promise<{ success: boolean; message?: string; mfaRequired?: boolean; userId?: string }> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                logger.error('Login error', error);

                if (error.message.includes('Email not confirmed')) {
                    return { success: false, message: 'Please verify your email address before logging in.' };
                }

                if (error.message.includes('Invalid login credentials')) {
                    return { success: false, message: 'Invalid email or password.' };
                }

                return { success: false, message: error.message };
            }

            if (data.user) {
                const user = await fetchUserProfile(data.user);

                if (!user) {
                    return { success: false, message: 'User profile not found. Please contact support.' };
                }

                if (user.status === 'inactive') {
                    await supabase.auth.signOut();
                    return { success: false, message: 'Your account has been deactivated. Please contact an administrator.' };
                }

                // Log activity
                await logActivity({
                    action: 'login',
                    entity: 'user',
                    entityId: user.id,
                    details: `User ${user.username} logged in`,
                });

                // Update last active
                await updateLastActive(user.id);

                return { success: true };
            }

            return { success: false, message: 'Login failed. Please try again.' };
        } catch (error) {
            logger.error('Login exception', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    };

    // Logout
    const logout = useCallback(async () => {
        try {
            if (currentUser) {
                await logActivity({
                    action: 'logout',
                    entity: 'user',
                    entityId: currentUser.id,
                    details: `User ${currentUser.username} logged out`,
                });
            }

            await supabase.auth.signOut();
            setSession(null);
            setCurrentUser(null);
            setIsAuthenticated(false);
        } catch (error) {
            logger.error('Logout error', error);
        }
    }, [currentUser]);

    // MFA verification (placeholder - to be implemented with Supabase Auth MFA)
    const verifyMFALogin = async (
        userId: string,
        code: string
    ): Promise<{ success: boolean; message?: string }> => {
        // TODO: Implement Supabase Auth MFA
        return { success: false, message: 'MFA not yet implemented with Supabase Auth' };
    };

    // Refresh current user profile
    const refreshCurrentUser = async () => {
        if (!session?.user) return;

        try {
            const user = await fetchUserProfile(session.user);

            if (!user) {
                logger.warn('User profile not found during refresh');
                await logout();
                return;
            }

            if (user.status === 'inactive') {
                logger.warn('Account has been deactivated');
                await logout();
                return;
            }

            setCurrentUser(user);
        } catch (error) {
            logger.error('Refresh current user error', error);
        }
    };

    // Auto-logout after 24 hours of inactivity
    useSessionTimeout(logout, isAuthenticated);

    // Periodic account status check (every 30 seconds)
    useEffect(() => {
        if (!isAuthenticated || !currentUser?.id) return;

        const checkAccountStatus = async () => {
            try {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_active')
                    .eq('id', currentUser.id)
                    .single();

                if (error || !profile) {
                    logger.warn('Account not found during status check');
                    await logout();
                    return;
                }

                if (!profile.is_active) {
                    logger.warn('Account has been deactivated');
                    await logout();
                }
            } catch (error) {
                logger.error('Account status check error', error);
            }
        };

        // Check immediately
        checkAccountStatus();

        // Then check every 30 seconds
        const interval = setInterval(checkAccountStatus, 30000);

        return () => clearInterval(interval);
    }, [isAuthenticated, currentUser?.id, logout]);

    // Permission logic (server-side enforcement via RLS, client-side for UI)
    const hasPermission = (permission: string): boolean => {
        if (!currentUser) return false;

        const rolePermissions: Record<UserRole, string[]> = {
            admin: ['*'], // Admin has all permissions
            data_entry_supervisor: [
                'read_assets', 'write_assets',
                'read_waybills', 'write_waybills',
                'read_returns', 'write_returns', 'delete_returns',
                'read_sites',
                'read_employees', 'write_employees',
                'write_vehicles',
                'read_quick_checkouts', 'write_quick_checkouts',
                'edit_company_info', 'view_activity_log', 'change_theme',
                'print_documents'
            ],
            regulatory: [
                'read_assets',
                'read_waybills',
                'read_returns',
                'read_sites',
                'read_reports',
                'read_employees',
                'read_quick_checkouts',
                'edit_company_info', 'change_theme',
                'print_documents'
            ],
            manager: [
                'read_assets', 'write_assets',
                'read_waybills', 'write_waybills',
                'read_returns', 'write_returns', 'delete_returns',
                'read_sites',
                'read_employees', 'write_employees', 'delist_employees',
                'read_reports',
                'read_quick_checkouts', 'write_quick_checkouts',
                'write_vehicles', 'delete_vehicles',
                'edit_company_info', 'view_activity_log', 'change_theme',
                'print_documents',
                'manage_requests'
            ],
            staff: [
                'read_assets', 'write_assets',
                'read_waybills', 'write_waybills',
                'read_returns',
                'read_sites',
                'read_quick_checkouts'
            ],
            site_worker: [
                'read_assets',
                'read_sites',
                'submit_requests',
                'view_own_requests',
                'log_equipment'
            ],
            custom: [] // Custom roles get permissions from their CustomRole definition
        };

        const userPermissions = rolePermissions[currentUser.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
    };

    // Get all users (admin only - enforced by RLS)
    const getUsers = async (): Promise<User[]> => {
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                logger.error('Get users error', error);
                return [];
            }

            return (profiles || []).map((profile: any) => ({
                id: profile.id,
                authId: profile.id,
                username: profile.username,
                role: profile.role as UserRole,
                customRoleId: profile.custom_role_id,
                name: profile.name,
                email: profile.email,
                bio: profile.bio,
                phone: profile.phone,
                avatar: profile.avatar,
                avatarColor: profile.avatar_color,
                status: profile.is_active ? 'active' : 'inactive',
                lastActive: profile.last_active_at,
                created_at: profile.created_at,
                updated_at: profile.updated_at,
                emailVerified: true, // Assume verified if in profiles table
                preferences: profile.preferences,
            }));
        } catch (error) {
            logger.error('Get users exception', error);
            return [];
        }
    };

    // Create user (admin only)
    const createUser = async (userData: {
        name: string;
        username: string;
        email: string;
        password: string;
        role: UserRole;
        customRoleId?: string;
    }): Promise<{ success: boolean; message?: string }> => {
        try {
            // Create Supabase Auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: userData.email,
                password: userData.password,
                email_confirm: true, // Auto-confirm for admin-created users
                user_metadata: {
                    username: userData.username,
                    name: userData.name,
                    role: userData.role,
                },
            });

            if (authError) {
                logger.error('Create auth user error', authError);
                return { success: false, message: authError.message };
            }

            // Profile will be created automatically by trigger
            // Just need to update with additional fields
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    username: userData.username,
                    name: userData.name,
                    role: userData.role,
                    custom_role_id: userData.customRoleId,
                })
                .eq('id', authData.user.id);

            if (profileError) {
                logger.error('Update profile error', profileError);
                return { success: false, message: profileError.message };
            }

            await logActivity({
                action: 'create_user',
                entity: 'user',
                details: `Created user ${userData.username} (${userData.role})`,
            });

            return { success: true };
        } catch (error) {
            logger.error('Create user exception', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    };

    // Update user
    const updateUser = async (
        userId: string,
        userData: Partial<UserProfile> & { password?: string }
    ): Promise<{ success: boolean; message?: string }> => {
        try {
            // Update profile
            const profileUpdate: any = {};
            if (userData.username) profileUpdate.username = userData.username;
            if (userData.name) profileUpdate.name = userData.name;
            if (userData.role) profileUpdate.role = userData.role;
            if (userData.email) profileUpdate.email = userData.email;
            if (userData.bio !== undefined) profileUpdate.bio = userData.bio;
            if (userData.phone !== undefined) profileUpdate.phone = userData.phone;
            if (userData.avatar !== undefined) profileUpdate.avatar = userData.avatar;
            if (userData.avatarColor !== undefined) profileUpdate.avatar_color = userData.avatarColor;
            if (userData.status !== undefined) profileUpdate.is_active = userData.status === 'active';
            if (userData.preferences !== undefined) profileUpdate.preferences = userData.preferences;

            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdate)
                .eq('id', userId);

            if (profileError) {
                logger.error('Update profile error', profileError);
                return { success: false, message: profileError.message };
            }

            // Update password if provided
            if (userData.password) {
                const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
                    password: userData.password,
                });

                if (passwordError) {
                    logger.error('Update password error', passwordError);
                    return { success: false, message: passwordError.message };
                }
            }

            // Refresh current user if updating self
            if (currentUser && currentUser.id === userId) {
                await refreshCurrentUser();
            }

            await logActivity({
                action: 'update',
                entity: 'user',
                entityId: userId,
                details: `Updated user ${userData.username || ''}`,
            });

            return { success: true };
        } catch (error) {
            logger.error('Update user exception', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    };

    // Delete user (admin only)
    const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
        try {
            // Delete auth user (profile will be deleted by CASCADE)
            const { error } = await supabase.auth.admin.deleteUser(userId);

            if (error) {
                logger.error('Delete user error', error);
                return { success: false, message: error.message };
            }

            await logActivity({
                action: 'delete_user',
                entity: 'user',
                entityId: userId,
                details: `Deleted user ${userId}`,
            });

            return { success: true };
        } catch (error) {
            logger.error('Delete user exception', error);
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    };

    // Placeholder implementations for enhanced features
    const getLoginHistory = async (userId: string): Promise<LoginHistory[]> => {
        // TODO: Implement login history tracking
        return [];
    };

    const getCustomRoles = async (): Promise<CustomRole[]> => {
        // TODO: Implement custom roles
        return [];
    };

    const createCustomRole = async (roleData: {
        name: string;
        description?: string;
        permissions: string[];
    }): Promise<{ success: boolean; role?: CustomRole; message?: string }> => {
        // TODO: Implement custom roles
        return { success: false, message: 'Not implemented' };
    };

    const updateCustomRole = async (
        roleId: string,
        roleData: { name?: string; description?: string; permissions?: string[] }
    ): Promise<{ success: boolean; message?: string }> => {
        // TODO: Implement custom roles
        return { success: false, message: 'Not implemented' };
    };

    const deleteCustomRole = async (roleId: string): Promise<{ success: boolean; message?: string }> => {
        // TODO: Implement custom roles
        return { success: false, message: 'Not implemented' };
    };

    const getUserPermissions = async (): Promise<UserPermission[]> => {
        // TODO: Implement user permissions
        return [];
    };

    const updateUserAvatar = async (
        userId: string,
        avatar: string,
        avatarColor?: string
    ): Promise<{ success: boolean; message?: string }> => {
        return updateUser(userId, { avatar, avatarColor });
    };

    const updateLastActive = async (userId: string): Promise<void> => {
        try {
            await supabase
                .from('profiles')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', userId);
        } catch (error) {
            logger.error('Update last active error', error);
        }
    };

    if (loading) {
        return null; // Or a loading spinner
    }

    return (
        <AuthContext.Provider
            value={{
                isAuthenticated,
                currentUser,
                session,
                login,
                logout,
                verifyMFALogin,
                refreshCurrentUser,
                hasPermission,
                getUsers,
                createUser,
                updateUser,
                deleteUser,
                getLoginHistory,
                getCustomRoles,
                createCustomRole,
                updateCustomRole,
                deleteCustomRole,
                getUserPermissions,
                updateUserAvatar,
                updateLastActive,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
