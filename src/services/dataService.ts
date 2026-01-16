/**
 * Data Service Abstraction Layer
 * 
 * This service automatically detects the runtime environment and routes
 * data operations to the appropriate backend:
 * - Desktop (Electron): Uses window.electronAPI with SQLite
 * - Mobile/Web: Uses Supabase PostgreSQL
 */

import { supabase as supabaseClient } from '@/integrations/supabase/client';
// Temporary cast to any to bypass strict type checks until Supabase types are generated
const supabase = supabaseClient as any;
import bcrypt from 'bcryptjs';
import type { User, UserRole } from '@/contexts/AuthContext';
import type {
    Activity,
    Asset,
    QuickCheckout,
    Site,
    Employee,
    Vehicle,
    CompanySettings,
    SiteTransaction,
    Waybill
} from '@/types/asset';
import type { EquipmentLog } from '@/types/equipment';
import {
    transformAssetToDB,
    transformAssetFromDB,
    transformSiteToDB,
    transformSiteFromDB,
    transformEmployeeToDB,
    transformEmployeeFromDB,
    transformWaybillToDB,
    transformWaybillFromDB,
    transformEquipmentLogToDB,
    transformEquipmentLogFromDB,
    transformActivityToDB,
    transformActivityFromDB,
    transformQuickCheckoutToDB,
    transformQuickCheckoutFromDB,
    transformSiteTransactionToDB,
    transformSiteTransactionFromDB,
    transformVehicleToDB,
    transformVehicleFromDB,
} from '@/utils/dataTransform';

// Detect if running in Electron
const isElectron = () => {
    // FORCE SUPABASE: Return false to make the app behave like web/mobile even on desktop
    return false;
    // return typeof window !== 'undefined' && window.electronAPI?.db;
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authService = {
    login: async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
        if (isElectron()) {
            return await window.electronAPI.db.login(username, password);
        }

        // Supabase authentication
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();

            if (error || !data) {
                return { success: false, message: 'Invalid credentials' };
            }

            // Verify password hash
            const isMatch = await bcrypt.compare(password, data.password_hash || '');

            if (!isMatch) {
                return { success: false, message: 'Invalid credentials' };
            }

            const user: User = {
                id: data.id.toString(),
                username: data.username,
                role: data.role as UserRole,
                name: data.name,
                created_at: data.created_at,
                updated_at: data.updated_at
            };

            return { success: true, user };
        } catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    getUsers: async (): Promise<User[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getUsers();
        }

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(user => ({
            id: user.id.toString(),
            username: user.username,
            role: user.role as UserRole,
            name: user.name,
            created_at: user.created_at,
            updated_at: user.updated_at
        }));
    },

    createUser: async (userData: { name: string; username: string; password: string; role: UserRole }): Promise<{ success: boolean; message?: string }> => {
        if (isElectron()) {
            return await window.electronAPI.db.createUser(userData);
        }

        // Hash password before storing
        const password_hash = await bcrypt.hash(userData.password, 10);

        const { error } = await supabase
            .from('users')
            .insert({
                username: userData.username,
                password_hash: password_hash,
                role: userData.role,
                name: userData.name
            });

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true };
    },

    updateUser: async (userId: string, userData: { name: string; username: string; role: UserRole; password?: string }): Promise<{ success: boolean; message?: string }> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateUser(userId, userData);
        }

        const updateData: any = {
            username: userData.username,
            role: userData.role,
            name: userData.name,
            updated_at: new Date().toISOString()
        };

        if (userData.password) {
            updateData.password_hash = await bcrypt.hash(userData.password, 10);
        }

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true };
    },

    deleteUser: async (userId: string): Promise<{ success: boolean; message?: string }> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteUser(userId);
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true };
    }
};

// ============================================================================
// ASSETS
// ============================================================================

export const assetService = {
    getAssets: async (): Promise<Asset[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getAssets();
        }

        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformAssetFromDB);
    },

    createAsset: async (asset: Partial<Asset>): Promise<Asset> => {
        if (isElectron()) {
            return await window.electronAPI.db.createAsset(asset);
        }

        const dbAsset = transformAssetToDB(asset);
        const { data, error } = await supabase
            .from('assets')
            .insert(dbAsset)
            .select()
            .single();

        if (error) throw error;
        return transformAssetFromDB(data);
    },

    updateAsset: async (id: string | number, asset: Partial<Asset>): Promise<Asset> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateAsset(id.toString(), asset);
        }

        const dbAsset = transformAssetToDB(asset);
        const { data, error } = await supabase
            .from('assets')
            .update({ ...dbAsset, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformAssetFromDB(data);
    },

    deleteAsset: async (id: string | number): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteAsset(id.toString());
        }

        const { error } = await supabase
            .from('assets')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// SITES
// ============================================================================

export const siteService = {
    getSites: async (): Promise<Site[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getSites();
        }

        const { data, error } = await supabase
            .from('sites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformSiteFromDB);
    },

    createSite: async (site: Partial<Site>): Promise<Site> => {
        if (isElectron()) {
            return await window.electronAPI.db.createSite(site);
        }

        const dbSite = transformSiteToDB(site);
        const { data, error } = await supabase
            .from('sites')
            .insert(dbSite)
            .select()
            .single();

        if (error) throw error;
        return transformSiteFromDB(data);
    },

    updateSite: async (id: string | number, site: Partial<Site>): Promise<Site> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateSite(id.toString(), site);
        }

        const dbSite = transformSiteToDB(site);
        const { data, error } = await supabase
            .from('sites')
            .update({ ...dbSite, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformSiteFromDB(data);
    },

    deleteSite: async (id: string | number): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteSite(id.toString());
        }

        const { error } = await supabase
            .from('sites')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// EMPLOYEES
// ============================================================================

export const employeeService = {
    getEmployees: async (): Promise<Employee[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getEmployees();
        }

        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformEmployeeFromDB);
    },

    createEmployee: async (employee: Partial<Employee>): Promise<Employee> => {
        if (isElectron()) {
            return await window.electronAPI.db.createEmployee(employee);
        }

        const dbEmployee = transformEmployeeToDB(employee);
        const { data, error } = await supabase
            .from('employees')
            .insert(dbEmployee)
            .select()
            .single();

        if (error) throw error;
        return transformEmployeeFromDB(data);
    },

    updateEmployee: async (id: string | number, employee: Partial<Employee>): Promise<Employee> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateEmployee(id.toString(), employee);
        }

        const dbEmployee = transformEmployeeToDB(employee);
        const { data, error } = await supabase
            .from('employees')
            .update({ ...dbEmployee, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformEmployeeFromDB(data);
    },

    deleteEmployee: async (id: string | number): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteEmployee(id.toString());
        }

        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// VEHICLES
// ============================================================================

export const vehicleService = {
    getVehicles: async (): Promise<Vehicle[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getVehicles();
        }

        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformVehicleFromDB);
    },

    createVehicle: async (vehicle: Partial<Vehicle>): Promise<Vehicle> => {
        if (isElectron()) {
            return await window.electronAPI.db.createVehicle(vehicle);
        }

        const dbVehicle = transformVehicleToDB(vehicle);
        const { data, error } = await supabase
            .from('vehicles')
            .insert(dbVehicle)
            .select()
            .single();

        if (error) throw error;
        return transformVehicleFromDB(data);
    },

    updateVehicle: async (id: string | number, vehicle: Partial<Vehicle>): Promise<Vehicle> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateVehicle(id.toString(), vehicle);
        }

        const dbVehicle = transformVehicleToDB(vehicle);
        const { data, error } = await supabase
            .from('vehicles')
            .update({ ...dbVehicle, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformVehicleFromDB(data);
    },

    deleteVehicle: async (id: string | number): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteVehicle(id.toString());
        }

        const { error } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// QUICK CHECKOUTS
// ============================================================================

export const quickCheckoutService = {
    getQuickCheckouts: async (): Promise<QuickCheckout[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getQuickCheckouts();
        }

        const { data, error } = await supabase
            .from('quick_checkouts')
            .select('*')
            .order('checkout_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformQuickCheckoutFromDB);
    },

    createQuickCheckout: async (checkout: Partial<QuickCheckout>): Promise<QuickCheckout> => {
        if (isElectron()) {
            return await window.electronAPI.db.createQuickCheckout(checkout);
        }

        const dbCheckout = transformQuickCheckoutToDB(checkout);
        const { data, error } = await supabase
            .from('quick_checkouts')
            .insert(dbCheckout)
            .select()
            .single();

        if (error) throw error;
        return transformQuickCheckoutFromDB(data);
    },

    updateQuickCheckout: async (id: string | number, checkout: Partial<QuickCheckout>): Promise<QuickCheckout> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateQuickCheckout(id.toString(), checkout);
        }

        const dbCheckout = transformQuickCheckoutToDB(checkout);
        const { data, error } = await supabase
            .from('quick_checkouts')
            .update({ ...dbCheckout, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformQuickCheckoutFromDB(data);
    },

    deleteQuickCheckout: async (id: string | number): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteQuickCheckout(id.toString());
        }

        const { error } = await supabase
            .from('quick_checkouts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// WAYBILLS
// ============================================================================

export const waybillService = {
    getWaybills: async (): Promise<Waybill[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getWaybills();
        }

        const { data, error } = await supabase
            .from('waybills')
            .select('*')
            .order('issue_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformWaybillFromDB);
    },

    createWaybill: async (waybill: Partial<Waybill>): Promise<Waybill> => {
        if (isElectron()) {
            return await window.electronAPI.db.createWaybill(waybill);
        }

        const dbWaybill = transformWaybillToDB(waybill);
        const { data, error } = await supabase
            .from('waybills')
            .insert(dbWaybill)
            .select()
            .single();

        if (error) throw error;
        return transformWaybillFromDB(data);
    },

    updateWaybill: async (id: string, waybill: Partial<Waybill>): Promise<Waybill> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateWaybill(id, waybill);
        }

        const dbWaybill = transformWaybillToDB(waybill);
        const { data, error } = await supabase
            .from('waybills')
            .update({ ...dbWaybill, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformWaybillFromDB(data);
    },

    deleteWaybill: async (id: string): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteWaybill(id);
        }

        const { error } = await supabase
            .from('waybills')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// EQUIPMENT LOGS
// ============================================================================

export const equipmentLogService = {
    getEquipmentLogs: async (): Promise<EquipmentLog[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getEquipmentLogs();
        }

        const { data, error } = await supabase
            .from('equipment_logs')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformEquipmentLogFromDB);
    },

    createEquipmentLog: async (log: Partial<EquipmentLog>): Promise<EquipmentLog> => {
        if (isElectron()) {
            return await window.electronAPI.db.createEquipmentLog(log);
        }

        const dbLog = transformEquipmentLogToDB(log);
        const { data, error } = await supabase
            .from('equipment_logs')
            .insert(dbLog)
            .select()
            .single();

        if (error) throw error;
        return transformEquipmentLogFromDB(data);
    },

    updateEquipmentLog: async (id: number, log: Partial<EquipmentLog>): Promise<EquipmentLog> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateEquipmentLog(id.toString(), log);
        }

        const dbLog = transformEquipmentLogToDB(log);
        const { data, error } = await supabase
            .from('equipment_logs')
            .update({ ...dbLog, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformEquipmentLogFromDB(data);
    },

    deleteEquipmentLog: async (id: number): Promise<void> => {
        if (isElectron()) {
            return await window.electronAPI.db.deleteEquipmentLog(id.toString());
        }

        const { error } = await supabase
            .from('equipment_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// COMPANY SETTINGS
// ============================================================================

export const companySettingsService = {
    getCompanySettings: async (): Promise<CompanySettings> => {
        if (isElectron()) {
            return await window.electronAPI.db.getCompanySettings();
        }

        const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data || {} as CompanySettings;
    },

    updateCompanySettings: async (settings: Partial<CompanySettings>): Promise<CompanySettings> => {
        if (isElectron()) {
            return await window.electronAPI.db.updateCompanySettings((settings as any).id?.toString() || '1', settings);
        }

        // Get the first (and only) settings record
        const { data: existing } = await supabase
            .from('company_settings')
            .select('id')
            .limit(1)
            .maybeSingle();

        if (existing) {
            const { data, error } = await supabase
                .from('company_settings')
                .update({ ...settings, updated_at: new Date().toISOString() })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('company_settings')
                .insert(settings)
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    }
};

// ============================================================================
// SITE TRANSACTIONS
// ============================================================================

export const siteTransactionService = {
    getSiteTransactions: async (): Promise<SiteTransaction[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getSiteTransactions();
        }

        const { data, error } = await supabase
            .from('site_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformSiteTransactionFromDB);
    },

    createSiteTransaction: async (transaction: Partial<SiteTransaction>): Promise<SiteTransaction> => {
        if (isElectron()) {
            await window.electronAPI.db.addSiteTransaction(transaction);
            return transaction as SiteTransaction;
        }

        const dbTransaction = transformSiteTransactionToDB(transaction);
        const { data, error } = await supabase
            .from('site_transactions')
            .insert(dbTransaction)
            .select()
            .single();

        if (error) throw error;
        return transformSiteTransactionFromDB(data);
    }
};

// ============================================================================
// ACTIVITY LOGS
// ============================================================================

export const activityService = {
    getActivities: async (): Promise<Activity[]> => {
        if (isElectron()) {
            return await window.electronAPI.db.getActivities();
        }

        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformActivityFromDB);
    },

    createActivity: async (activity: Partial<Activity>): Promise<void> => {
        if (isElectron()) {
            await window.electronAPI.db.createActivity(activity);
            return;
        }

        const dbActivity = transformActivityToDB(activity);
        const { error } = await supabase
            .from('activities')
            .insert(dbActivity);

        if (error) throw error;
    },

    clearActivities: async (): Promise<void> => {
        if (isElectron()) {
            await window.electronAPI.db.clearActivities();
            return;
        }

        const { error } = await supabase
            .from('activities')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (error) throw error;
    }
};

// Export all services
export const dataService = {
    auth: authService,
    assets: assetService,
    sites: siteService,
    employees: employeeService,
    vehicles: vehicleService,
    quickCheckouts: quickCheckoutService,
    waybills: waybillService,
    equipmentLogs: equipmentLogService,
    companySettings: companySettingsService,
    siteTransactions: siteTransactionService,
    activities: activityService
};
