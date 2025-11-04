import React, { createContext, useContext, useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

// User type and role definitions remain the same
export type UserRole = 'admin' | 'data_entry_supervisor' | 'regulatory' | 'manager' | 'staff';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
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
  createUser: (userData: { name: string; username: string; password: string; role: UserRole; email?: string }) => Promise<{ success: boolean; message?: string }>;
  updateUser: (userId: string, userData: { name: string; username: string; role: UserRole; email?: string }) => Promise<{ success: boolean; message?: string }>;
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

  // Login: Supports two modes
  // 1. Database authentication (primary) - when Electron database is available
  // 2. Hardcoded admin fallback (secondary) - for testing without database
  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Try database login first if available
      if (window.db) {
        const result = await window.db.login(username, password);
        if (result.success && result.user) {
          setCurrentUser(result.user);
          setIsAuthenticated(true);
          localStorage.setItem('isAuthenticated', 'true');
          localStorage.setItem('currentUser', JSON.stringify(result.user));
          return { success: true };
        }
        // If database login fails, fall through to hardcoded admin check
      }
      
      // Hardcoded admin fallback (only used if database login fails or unavailable)
      if (username === 'admin' && password === 'admin123') {
        const hardcodedAdmin: User = {
          id: 'admin',
          username: 'admin',
          role: 'admin',
          name: 'Administrator',
          email: 'admin@example.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setCurrentUser(hardcodedAdmin);
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', JSON.stringify(hardcodedAdmin));
        return { success: true };
      }
      
      // If we reach here, credentials were invalid
      return { success: false, message: 'Invalid credentials' };
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
          'read_employees', 'write_employees', 'delete_employees',
          'write_vehicles', 'delete_vehicles',
          'manage_users',
          'edit_company_info', 'view_activity_log', 'change_theme',
          'print_documents'
        ],
        regulatory: [
          'read_assets',
          'read_waybills',
          'read_returns',
          'read_sites',
          'read_reports',
          'write_employees',
          'write_vehicles',
          'edit_company_info', 'change_theme',
          'print_documents'
        ],
        manager: [
          'read_assets', 'write_assets',
          'read_waybills', 'write_waybills',
          'read_returns', 'write_returns',
          'read_sites',
          'read_employees',
          'read_reports',
          'read_quick_checkouts', 'write_quick_checkouts',
          'print_documents'
        ],
        staff: [
          'read_assets',
          'read_waybills',
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
      if (!window.db) {
        return [];
      }
      return await window.db.getUsers();
    } catch (error) {
      logger.error('Get users error', error);
      return [];
    }
  };

  const createUser = async (userData: { name: string; username: string; password: string; role: UserRole; email?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!window.db) {
        return { success: false, message: 'Database not available' };
      }
      const result = await window.db.createUser(userData);
      return result;
    } catch (error) {
      logger.error('Create user error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const updateUser = async (userId: string, userData: { name: string; username: string; role: UserRole; email?: string; password?: string }): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!window.db) {
        return { success: false, message: 'Database not available' };
      }
      const result = await window.db.updateUser(userId, userData);
      return result;
    } catch (error) {
      logger.error('Update user error', error);
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; message?: string }> => {
    try {
      if (!window.db) {
        return { success: false, message: 'Database not available' };
      }
      const result = await window.db.deleteUser(userId);
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
