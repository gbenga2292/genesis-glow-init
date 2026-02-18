import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { logActivity } from '@/utils/activityLogger';
import { dataService } from '@/services/dataService';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

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

export interface User {
  id: string;
  username: string;
  role: UserRole;
  customRoleId?: string; // If role is 'custom', references CustomRole
  name: string;
  avatar?: string; // Base64 or generated avatar string
  avatarColor?: string; // Color for generated avatar (e.g., '#FF5733')
  signatureUrl?: string; // Base64 or URL to user's signature image
  email?: string;
  bio?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'pending_invite';
  isOnline?: boolean;
  lastActive?: string; // ISO timestamp
  passwordHash?: string;
  passwordChangedAt?: string;
  loginAttempts?: number;
  isLocked?: boolean;
  lockedUntil?: string;
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
interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; mfaRequired?: boolean; userId?: string }>;
  logout: () => void;
  verifyMFALogin: (userId: string, code: string) => Promise<{ success: boolean; message?: string }>;
  refreshCurrentUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  getUsers: () => Promise<User[]>;
  createUser: (userData: { name: string; username: string; password: string; role: UserRole; customRoleId?: string }) => Promise<{ success: boolean; message?: string }>;
  registerUser: (userData: { name: string; username: string; password: string; role: UserRole; displayUsername?: string }) => Promise<{ success: boolean; message?: string }>;
  updateUser: (userId: string, userData: { name?: string; username?: string; role?: UserRole; customRoleId?: string; avatar?: string; avatarColor?: string; email?: string; bio?: string; phone?: string; password?: string; status?: 'active' | 'inactive' | 'pending_invite'; mfa_enabled?: boolean; mfa_secret?: string | null; preferences?: any; }) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
  // New methods for enhanced features
  getLoginHistory: (userId: string) => Promise<LoginHistory[]>;
  recordLogin: (userId: string, ipAddress?: string, deviceInfo?: string, loginType?: 'password' | 'magic_link' | 'oauth') => Promise<void>;
  getCustomRoles: () => Promise<CustomRole[]>;
  createCustomRole: (roleData: { name: string; description?: string; permissions: string[] }) => Promise<{ success: boolean; role?: CustomRole; message?: string }>;
  updateCustomRole: (roleId: string, roleData: { name?: string; description?: string; permissions?: string[] }) => Promise<{ success: boolean; message?: string }>;
  deleteCustomRole: (roleId: string) => Promise<{ success: boolean; message?: string }>;
  getUserPermissions: () => Promise<UserPermission[]>;
  updateUserAvatar: (userId: string, avatar: string, avatarColor?: string) => Promise<{ success: boolean; message?: string }>;
  updateLastActive: (userId: string) => Promise<void>;
  generateInviteLink: (userId: string) => Promise<{ success: boolean; link?: string; message?: string }>;
  sendInviteEmail: (email: string, userName: string, inviteLink: string) => Promise<{ success: boolean; message?: string }>;
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check if user was previously authenticated
    const saved = localStorage.getItem('isAuthenticated');
    return saved === 'true';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Restore user from localStorage
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  // Login: Uses Supabase PostgreSQL for all platforms (Web, Android, Electron Desktop)
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string; mfaRequired?: boolean; userId?: string }> => {
    try {
      const result = await dataService.auth.login(username, password);

      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        await logActivity({
          action: 'login',
          entity: 'user',
          entityId: result.user.id,
          details: `User ${result.user.username} logged in`
        });
        return { success: true };
      }

      if (result.mfaRequired) {
        return { success: false, mfaRequired: true, userId: result.userId, message: 'MFA Required' };
      }

      // If dataService login fails, try hardcoded admin fallback (DEV ONLY)
      if (import.meta.env.DEV && username === 'admin' && password === 'admin123') {
        const hardcodedAdmin: User = {
          id: 'admin',
          username: 'admin',
          role: 'admin',
          name: 'Administrator',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setCurrentUser(hardcodedAdmin);
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(hardcodedAdmin));
        await logActivity({
          action: 'login',
          entity: 'user',
          entityId: 'admin',
          details: 'Admin user logged in (hardcoded fallback)'
        });
        return { success: true };
      }

      return { success: false, message: result.message || 'Invalid credentials' };
    } catch (error) {
      logger.error('Login error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('lastActivityTime');

    if (currentUser) {
      logActivity({
        action: 'logout',
        entity: 'user',
        entityId: currentUser.id,
        details: `User ${currentUser.username} logged out`
      });
    }
  }, [currentUser]);

  const verifyMFALogin = async (userId: string, code: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.verifyMFALogin(userId, code);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        // Activity log is handled in dataService
        return { success: true };
      }
      return { success: false, message: result.message || 'Invalid code' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const refreshCurrentUser = async () => {
    if (!currentUser?.id) return;

    // Skip refresh for dev mode hardcoded admin
    if (import.meta.env.DEV && currentUser.id === 'admin') {
      return;
    }

    try {
      // Fetch fresh user data from database
      const users = await dataService.auth.getUsers();
      const updatedUser = users.find(u => u.id === currentUser.id);

      if (updatedUser) {
        // Check if account has been deactivated
        if (updatedUser.status === 'inactive') {
          logger.warn('Account has been deactivated by admin');
          logout();
          return;
        }

        // Fetch signature separately
        try {
          const sigResult = await (dataService.auth as any).getSignature?.(updatedUser.id);
          if (sigResult?.success && sigResult.url) {
            updatedUser.signatureUrl = sigResult.url;
          }
        } catch (e) {
          console.warn('Failed to fetch signature during refresh', e);
        }

        setCurrentUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      } else {
        // User no longer exists in database
        logger.warn('User account not found in database');
        logout();
      }
    } catch (error) {
      logger.error('Refresh current user user error', error);
    }
  };

  // Auto-logout after 24 hours of inactivity
  useSessionTimeout(logout, isAuthenticated);

  // Periodic account status check (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    // Skip status check for dev mode hardcoded admin
    if (import.meta.env.DEV && currentUser.id === 'admin') {
      return;
    }

    const checkAccountStatus = async () => {
      try {
        const users = await dataService.auth.getUsers();
        const user = users.find(u => u.id === currentUser.id);

        if (!user) {
          // Account deleted
          logger.warn('Account has been deleted');
          logout();
        } else if (user.status === 'inactive') {
          // Account deactivated
          logger.warn('Account has been deactivated');
          logout();
        }
      } catch (error) {
        logger.error('Account status check error', error);
      }
    };

    // Check immediately on mount
    checkAccountStatus();

    // Then check every 30 seconds
    const interval = setInterval(checkAccountStatus, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser?.id, logout]);

  // Permission logic remains the same, as it's based on the role in currentUser state
  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;

    const rolePermissions: Record<UserRole, string[]> = {
      admin: ['*'], // Admin has all permissions
      data_entry_supervisor: [
        'read_assets', 'write_assets',
        'read_waybills', 'write_waybills',
        'read_returns', 'write_returns', 'delete_returns',
        'read_sites',
        'read_employees', 'write_employees', // removed delete_employees
        'write_vehicles', // removed delete_vehicles
        'read_quick_checkouts', 'write_quick_checkouts', // Added access but no delete
        'edit_company_info', 'view_activity_log', 'change_theme',
        'print_documents'
      ],
      regulatory: [
        'read_assets',
        'read_waybills',
        'read_returns',
        'read_sites',
        'read_reports',
        'read_employees', // Changed from write to read
        'read_quick_checkouts', // Added read-only access
        'edit_company_info', 'change_theme',
        'print_documents'
      ],
      manager: [
        'read_assets', 'write_assets',
        'read_waybills', 'write_waybills',
        'read_returns', 'write_returns', 'delete_returns', // Matches data_entry_supervisor
        'read_sites',
        'read_employees', 'write_employees', 'delist_employees', // Manager can delist
        'read_reports',
        'read_quick_checkouts', 'write_quick_checkouts', // Manager can write, but NO delete
        'write_vehicles', 'delete_vehicles', // Manager can delete vehicles
        'edit_company_info', 'view_activity_log', 'change_theme', // Matches data_entry_supervisor
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
        'read_assets', // To see available items
        'read_sites', // To select site
        'submit_requests',
        'view_own_requests',
        'log_equipment'
      ],
      custom: [] // Custom roles get permissions from their CustomRole definition
    };

    const userPermissions = rolePermissions[currentUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  const getUsers = async (): Promise<User[]> => {
    try {
      return await dataService.auth.getUsers();
    } catch (error) {
      logger.error('Get users error', error);
      return [];
    }
  };

  const createUser = async (userData: { name: string; username: string; password: string; role: UserRole }): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.createUser(userData);
      if (result.success) {
        await logActivity({
          action: 'create_user',
          entity: 'user',
          details: `Created user ${userData.username} (${userData.role})`
        });
      }
      return result;
    } catch (error) {
      logger.error('Create user error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const registerUser = async (userData: { name: string; username: string; password: string; role: UserRole; displayUsername?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      // Use dataService.auth.register for self-registration which triggers email flow
      const result = await dataService.auth.register(userData);
      if (result.success) {
        // Log the attempt
        await logActivity({
          action: 'create_user',
          entity: 'user',
          details: `New user registration: ${userData.username}`
        });
      }
      return result;
    } catch (error) {
      logger.error('Register user error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateUser = async (userId: string, userData: { name?: string; username?: string; role?: UserRole; password?: string; bio?: string; avatar?: string; avatarColor?: string; status?: 'active' | 'inactive' | 'pending_invite'; mfa_enabled?: boolean; mfa_secret?: string | null; preferences?: any; }): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.updateUser(userId, userData as any);
      if (result.success) {
        if (currentUser && currentUser.id === userId) {
          const updatedUser = { ...currentUser, ...userData };
          setCurrentUser(updatedUser as User);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        await logActivity({
          action: 'update',
          entity: 'user',
          entityId: userId,
          details: `Updated user ${userData.username || ''}`
        });
      }
      return result;
    } catch (error) {
      logger.error('Update user error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.deleteUser(userId);
      if (result.success) {
        await logActivity({
          action: 'delete_user',
          entity: 'user',
          entityId: userId,
          details: `Deleted user ${userId}`
        });
      }
      return result;
    } catch (error) {
      logger.error('Delete user error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Enhanced features implementations
  const getLoginHistory = async (userId: string): Promise<LoginHistory[]> => {
    try {
      // This will be implemented by dataService
      return await dataService.auth.getLoginHistory?.(userId) || [];
    } catch (error) {
      logger.error('Get login history error', error);
      return [];
    }
  };

  const recordLogin = async (userId: string, ipAddress?: string, deviceInfo?: string, loginType: 'password' | 'magic_link' | 'oauth' = 'password'): Promise<void> => {
    try {
      await dataService.auth.recordLogin?.(userId, { ipAddress, deviceInfo, loginType });
    } catch (error) {
      logger.error('Record login error', error);
    }
  };

  const getCustomRoles = async (): Promise<CustomRole[]> => {
    try {
      return await dataService.auth.getCustomRoles?.() || [];
    } catch (error) {
      logger.error('Get custom roles error', error);
      return [];
    }
  };

  const createCustomRole = async (roleData: { name: string; description?: string; permissions: string[] }): Promise<{ success: boolean; role?: CustomRole; message?: string }> => {
    try {
      const result = await dataService.auth.createCustomRole?.(roleData);
      if (result?.success) {
        await logActivity({
          action: 'create',
          entity: 'user',
          details: `Created custom role: ${roleData.name}`
        });
      }
      return result || { success: false, message: 'Not implemented' };
    } catch (error) {
      logger.error('Create custom role error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateCustomRole = async (roleId: string, roleData: { name?: string; description?: string; permissions?: string[] }): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.updateCustomRole?.(roleId, roleData);
      if (result?.success) {
        await logActivity({
          action: 'update',
          entity: 'user',
          entityId: roleId,
          details: `Updated custom role`
        });
      }
      return result || { success: false, message: 'Not implemented' };
    } catch (error) {
      logger.error('Update custom role error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteCustomRole = async (roleId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.deleteCustomRole?.(roleId);
      if (result?.success) {
        await logActivity({
          action: 'delete',
          entity: 'user',
          entityId: roleId,
          details: `Deleted custom role`
        });
      }
      return result || { success: false, message: 'Not implemented' };
    } catch (error) {
      logger.error('Delete custom role error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const getUserPermissions = async (): Promise<UserPermission[]> => {
    try {
      return await dataService.auth.getUserPermissions?.() || [];
    } catch (error) {
      logger.error('Get user permissions error', error);
      return [];
    }
  };

  const updateUserAvatar = async (userId: string, avatar: string, avatarColor?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.updateUserAvatar?.(userId, avatar, avatarColor);
      if (result?.success) {
        // Update local state if the updated user is the current user
        if (currentUser && currentUser.id === userId) {
          const updatedUser = {
            ...currentUser,
            avatar,
            avatarColor: avatarColor || currentUser.avatarColor
          };
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        await logActivity({
          action: 'update',
          entity: 'user',
          entityId: userId,
          details: `Updated user avatar`
        });
      }
      return result || { success: false, message: 'Not implemented' };
    } catch (error) {
      logger.error('Update user avatar error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateLastActive = async (userId: string): Promise<void> => {
    try {
      await dataService.auth.updateLastActive?.(userId);
    } catch (error) {
      logger.error('Update last active error', error);
    }
  };

  const generateInviteLink = async (userId: string): Promise<{ success: boolean; link?: string; message?: string }> => {
    try {
      return await dataService.auth.generateInviteLink?.(userId) || { success: false, message: 'Not implemented' };
    } catch (error) {
      logger.error('Generate invite link error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const sendInviteEmail = async (email: string, userName: string, inviteLink: string): Promise<{ success: boolean; message?: string }> => {
    try {
      return await dataService.auth.sendInviteEmail?.(email, userName, inviteLink) || { success: false, message: 'Not implemented' };
    } catch (error) {
      logger.error('Send invite email error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      login,
      logout,
      verifyMFALogin,
      refreshCurrentUser,
      hasPermission,
      getUsers,
      createUser,
      registerUser,
      updateUser,
      deleteUser,
      getLoginHistory,
      recordLogin,
      getCustomRoles,
      createCustomRole,
      updateCustomRole,
      deleteCustomRole,
      getUserPermissions,
      updateUserAvatar,
      updateLastActive,
      generateInviteLink,
      sendInviteEmail,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
