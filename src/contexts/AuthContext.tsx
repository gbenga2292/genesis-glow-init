import React, { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { logActivity } from '@/utils/activityLogger';
import { dataService } from '@/services/dataService';

// User type and role definitions remain the same
export type UserRole = 'admin' | 'data_entry_supervisor' | 'regulatory' | 'manager' | 'staff';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  created_at: string;
  updated_at: string;
}
interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  getUsers: () => Promise<User[]>;
  createUser: (userData: { name: string; username: string; password: string; role: UserRole }) => Promise<{ success: boolean; message?: string }>;
  updateUser: (userId: string, userData: { name: string; username: string; role: UserRole }) => Promise<{ success: boolean; message?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
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

  // Login: Uses unified dataService which automatically detects platform
  // - Desktop (Electron): Uses local SQLite database
  // - Mobile/Web: Uses Supabase PostgreSQL
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
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

      // If dataService login fails, try hardcoded admin fallback
      if (username === 'admin' && password === 'admin123') {
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

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    // Clear authentication state from localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');

    if (currentUser) {
      logActivity({
        action: 'logout',
        entity: 'user',
        entityId: currentUser.id,
        details: `User ${currentUser.username} logged out`
      });
    }
  };

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
        'print_documents'
      ],
      staff: [
        'read_assets', 'write_assets',
        'read_waybills', 'write_waybills',
        'read_returns',
        'read_sites',
        'read_quick_checkouts'
      ]
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

  const updateUser = async (userId: string, userData: { name: string; username: string; role: UserRole; password?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await dataService.auth.updateUser(userId, userData);
      if (result.success) {
        await logActivity({
          action: 'update_user',
          entity: 'user',
          entityId: userId,
          details: `Updated user ${userData.username}`
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

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      currentUser,
      login,
      logout,
      hasPermission,
      getUsers,
      createUser,
      updateUser,
      deleteUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
