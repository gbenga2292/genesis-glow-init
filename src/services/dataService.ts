/**
 * Data Service Abstraction Layer
 * 
 * This service provides a unified API for data operations.
 * All platforms (Web, Android, Electron Desktop) use Supabase PostgreSQL.
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
import type { ConsumableUsageLog } from '@/types/consumable';
import type { MaintenanceLog } from '@/types/maintenance';
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
    transformConsumableLogToDB,
    transformConsumableLogFromDB,
    transformMaintenanceLogToDB,
    transformMaintenanceLogFromDB,
} from '@/utils/dataTransform';

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authService = {
    login: async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
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
        const { data, error } = await supabase
            .from('assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase getAssets error:', error);
            throw error;
        }
        console.log('Supabase getAssets data:', data);
        return (data || []).map(transformAssetFromDB);
    },

    createAsset: async (asset: Partial<Asset>): Promise<Asset> => {
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
        const { data, error } = await supabase
            .from('sites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformSiteFromDB);
    },

    createSite: async (site: Partial<Site>): Promise<Site> => {
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
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformEmployeeFromDB);
    },

    createEmployee: async (employee: Partial<Employee>): Promise<Employee> => {
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
        const { data, error } = await supabase
            .from('vehicles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformVehicleFromDB);
    },

    createVehicle: async (vehicle: Partial<Vehicle>): Promise<Vehicle> => {
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
        // Fetch checkouts, assets, and employees to enrich the data
        const [checkoutsResult, assetsResult, employeesResult] = await Promise.all([
            supabase
                .from('quick_checkouts')
                .select('*')
                .order('checkout_date', { ascending: false }),
            supabase
                .from('assets')
                .select('id, name'),
            supabase
                .from('employees')
                .select('id, name')
        ]);

        if (checkoutsResult.error) throw checkoutsResult.error;
        
        const assets = assetsResult.data || [];
        const employees = employeesResult.data || [];
        
        return (checkoutsResult.data || []).map(checkout => 
            transformQuickCheckoutFromDB(checkout, assets, employees)
        );
    },

    createQuickCheckout: async (checkout: Partial<QuickCheckout>): Promise<QuickCheckout> => {
        const dbCheckout = transformQuickCheckoutToDB(checkout);
        const { data, error } = await supabase
            .from('quick_checkouts')
            .insert(dbCheckout)
            .select()
            .single();

        if (error) throw error;
        
        // Fetch asset and employee for enrichment
        const [assetResult, employeeResult] = await Promise.all([
            supabase.from('assets').select('id, name').eq('id', data.asset_id).single(),
            data.employee_id 
                ? supabase.from('employees').select('id, name').eq('id', data.employee_id).single()
                : Promise.resolve({ data: null })
        ]);
        
        return transformQuickCheckoutFromDB(
            data, 
            assetResult.data ? [assetResult.data] : [], 
            employeeResult.data ? [employeeResult.data] : []
        );
    },

    updateQuickCheckout: async (id: string | number, checkout: Partial<QuickCheckout>): Promise<QuickCheckout> => {
        const dbCheckout = transformQuickCheckoutToDB(checkout);
        const { data, error } = await supabase
            .from('quick_checkouts')
            .update({ ...dbCheckout, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        
        // Fetch asset and employee for enrichment
        const [assetResult, employeeResult] = await Promise.all([
            supabase.from('assets').select('id, name').eq('id', data.asset_id).single(),
            data.employee_id 
                ? supabase.from('employees').select('id, name').eq('id', data.employee_id).single()
                : Promise.resolve({ data: null })
        ]);
        
        return transformQuickCheckoutFromDB(
            data, 
            assetResult.data ? [assetResult.data] : [], 
            employeeResult.data ? [employeeResult.data] : []
        );
    },

    deleteQuickCheckout: async (id: string | number): Promise<void> => {
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
        const { data, error } = await supabase
            .from('waybills')
            .select('*')
            .order('issue_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformWaybillFromDB);
    },

    createWaybill: async (waybill: Partial<Waybill>): Promise<Waybill> => {
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
        const { data, error } = await supabase
            .from('equipment_logs')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformEquipmentLogFromDB);
    },

    createEquipmentLog: async (log: Partial<EquipmentLog>): Promise<EquipmentLog> => {
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
        const { error } = await supabase
            .from('equipment_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// CONSUMABLE LOGS
// ============================================================================

export const consumableLogService = {
    getConsumableLogs: async (): Promise<ConsumableUsageLog[]> => {
        const { data, error } = await supabase
            .from('consumable_logs')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformConsumableLogFromDB);
    },

    createConsumableLog: async (log: Partial<ConsumableUsageLog>): Promise<ConsumableUsageLog> => {
        const dbLog = transformConsumableLogToDB(log);
        const { data, error } = await supabase
            .from('consumable_logs')
            .insert(dbLog)
            .select()
            .single();

        if (error) throw error;
        return transformConsumableLogFromDB(data);
    },

    updateConsumableLog: async (id: string, log: Partial<ConsumableUsageLog>): Promise<ConsumableUsageLog> => {
        const dbLog = transformConsumableLogToDB(log);
        const { data, error } = await supabase
            .from('consumable_logs')
            .update({ ...dbLog, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformConsumableLogFromDB(data);
    },

    deleteConsumableLog: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('consumable_logs')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================================================
// MAINTENANCE LOGS
// ============================================================================

export const maintenanceLogService = {
    getMaintenanceLogs: async (): Promise<MaintenanceLog[]> => {
        const { data, error } = await supabase
            .from('maintenance_logs')
            .select('*')
            .order('date_started', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformMaintenanceLogFromDB);
    },

    createMaintenanceLog: async (log: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
        const dbLog = transformMaintenanceLogToDB(log);
        const { data, error } = await supabase
            .from('maintenance_logs')
            .insert(dbLog)
            .select()
            .single();

        if (error) throw error;
        return transformMaintenanceLogFromDB(data);
    },

    updateMaintenanceLog: async (id: string, log: Partial<MaintenanceLog>): Promise<MaintenanceLog> => {
        const dbLog = transformMaintenanceLogToDB(log);
        const { data, error } = await supabase
            .from('maintenance_logs')
            .update({ ...dbLog, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return transformMaintenanceLogFromDB(data);
    },

    deleteMaintenanceLog: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('maintenance_logs')
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
        const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data || {} as CompanySettings;
    },

    updateCompanySettings: async (settings: Partial<CompanySettings>): Promise<CompanySettings> => {
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
        const { data, error } = await supabase
            .from('site_transactions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformSiteTransactionFromDB);
    },

    createSiteTransaction: async (transaction: Partial<SiteTransaction>): Promise<SiteTransaction> => {
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
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;
        return (data || []).map(transformActivityFromDB);
    },

    createActivity: async (activity: Partial<Activity>): Promise<void> => {
        const dbActivity = transformActivityToDB(activity);
        const { error } = await supabase
            .from('activities')
            .insert(dbActivity);

        if (error) throw error;
    },

    clearActivities: async (): Promise<void> => {
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
    consumableLogs: consumableLogService,
    maintenanceLogs: maintenanceLogService,
    companySettings: companySettingsService,
    siteTransactions: siteTransactionService,
    activities: activityService,

    // ============================================================================
    // METRICS SNAPSHOTS
    // ============================================================================
    metrics: {
        getTodaySnapshot: async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('metrics_snapshots')
                .select('*')
                .eq('snapshot_date', today)
                .maybeSingle();

            if (error) throw error;
            return data;
        },

        createSnapshot: async (data: any) => {
            const today = new Date().toISOString().split('T')[0];
            const { error } = await supabase
                .from('metrics_snapshots')
                .upsert({
                    snapshot_date: today,
                    total_assets: data.total_assets || 0,
                    total_quantity: data.total_quantity || 0,
                    outstanding_waybills: data.outstanding_waybills || 0,
                    outstanding_checkouts: data.outstanding_checkouts || 0,
                    out_of_stock: data.out_of_stock || 0,
                    low_stock: data.low_stock || 0
                }, { onConflict: 'snapshot_date' });

            if (error) throw error;
        },

        getHistory: async (days: number = 7) => {
            const date = new Date();
            date.setDate(date.getDate() - days);
            const { data, error } = await supabase
                .from('metrics_snapshots')
                .select('*')
                .gte('snapshot_date', date.toISOString().split('T')[0])
                .order('snapshot_date', { ascending: true });

            if (error) throw error;
            return data || [];
        }
    }
};
