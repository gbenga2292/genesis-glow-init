/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    db: {
      login: (username: string, password: string) => Promise<{ success: boolean; user?: any; message?: string }>;
      createUser: (userData: { name: string; username: string; password: string; role: string; email?: string }) => Promise<{ success: boolean; user?: any; message?: string }>;
      updateUser: (userId: string, userData: { name: string; username: string; role: string; email?: string; password?: string }) => Promise<{ success: boolean; user?: any; message?: string }>;
      deleteUser: (userId: string) => Promise<{ success: boolean; message?: string }>;
      getUsers: () => Promise<any[]>;
      getSites: () => Promise<any[]>;
      getSiteById: (id: string) => Promise<any>;
      createSite: (data: any) => Promise<any>;
      updateSite: (id: string, data: any) => Promise<any>;
      deleteSite: (id: string) => Promise<any>;
      getEmployees: () => Promise<any[]>;
      createEmployee: (data: any) => Promise<any>;
      updateEmployee: (id: string, data: any) => Promise<any>;
      deleteEmployee: (id: string) => Promise<any>;
      getVehicles: () => Promise<any[]>;
      createVehicle: (data: any) => Promise<any>;
      updateVehicle: (id: string, data: any) => Promise<any>;
      deleteVehicle: (id: string) => Promise<any>;
      getAssets: () => Promise<any[]>;
      createAsset: (data: any) => Promise<any>;
      addAsset: (data: any) => Promise<any>;
      updateAsset: (id: string, data: any) => Promise<any>;
      deleteAsset: (id: string) => Promise<any>;
      getWaybills: () => Promise<any[]>;
      createWaybill: (data: any, options?: any) => Promise<any>;
      updateWaybill: (id: string, data: any) => Promise<any>;
      deleteWaybill: (id: string) => Promise<any>;
      getWaybillItems: () => Promise<any[]>;
      createWaybillItem: (data: any) => Promise<any>;
      updateWaybillItem: (id: string, data: any) => Promise<any>;
      deleteWaybillItem: (id: string) => Promise<any>;
      getQuickCheckouts: () => Promise<any[]>;
      createQuickCheckout: (data: any) => Promise<any>;
      updateQuickCheckout: (id: string, data: any) => Promise<any>;
      deleteQuickCheckout: (id: string) => Promise<any>;
      getReturnBills: () => Promise<any[]>;
      createReturnBill: (data: any) => Promise<any>;
      updateReturnBill: (id: string, data: any) => Promise<any>;
      deleteReturnBill: (id: string) => Promise<any>;
      getReturnItems: () => Promise<any[]>;
      createReturnItem: (data: any) => Promise<any>;
      updateReturnItem: (id: string, data: any) => Promise<any>;
      deleteReturnItem: (id: string) => Promise<any>;
      getEquipmentLogs: () => Promise<any[]>;
      createEquipmentLog: (data: any) => Promise<any>;
      updateEquipmentLog: (id: string, data: any) => Promise<any>;
      deleteEquipmentLog: (id: string) => Promise<any>;
      getConsumableLogs: () => Promise<any[]>;
      createConsumableLog: (data: any) => Promise<any>;
      updateConsumableLog: (id: string, data: any) => Promise<any>;
      deleteConsumableLog: (id: string) => Promise<any>;
      getCompanySettings: () => Promise<any>;
      createCompanySettings: (data: any) => Promise<any[]>;
      updateCompanySettings: (id: string, data: any) => Promise<any>;
      getSiteTransactions: () => Promise<any[]>;
      addSiteTransaction: (transaction: any) => Promise<{ success: boolean }>;
      updateSiteTransaction: (id: string, transaction: any) => Promise<{ success: boolean }>;
      deleteSiteTransaction: (id: string) => Promise<{ success: boolean }>;
      getActivities: () => Promise<any[]>;
      createActivity: (data: any) => Promise<any>;
      clearActivities: () => Promise<any>;
      getMetricsSnapshots: (days?: number) => Promise<any[]>;
      getTodayMetricsSnapshot: () => Promise<any>;
      createMetricsSnapshot: (data: any) => Promise<any[]>;
      createWaybillWithTransaction: (waybillData: any, options?: any) => Promise<{ success: boolean; waybill?: any; error?: string }>;
      processReturnWithTransaction: (returnData: any) => Promise<{ success: boolean; returnBill?: any; error?: string }>;
      sendToSiteWithTransaction: (waybillId: string, sentToSiteDate?: string) => Promise<{ success: boolean; error?: string }>;
      deleteWaybillWithTransaction: (waybillId: string) => Promise<{ success: boolean; error?: string }>;
      updateWaybillWithTransaction: (waybillId: string, updatedData: any) => Promise<{ success: boolean; error?: string }>;
      getSavedApiKeys: () => Promise<any[]>;
      createSavedApiKey: (data: { key_name: string; provider: string; api_key: string; endpoint?: string; model?: string }) => Promise<any[]>;
      updateSavedApiKey: (id: number, data: any) => Promise<any[]>;
      setActiveApiKey: (id: number) => Promise<any[]>;
      deleteSavedApiKey: (id: number) => Promise<any>;
      getActiveApiKey: () => Promise<any>;
      migrateSavedKeysToKeytar: () => Promise<{ migrated: number }>;
      getApiKeyFromKeyRef: (keyRef: string) => Promise<string | null>;
      getDatabaseInfo: () => Promise<{ storageType: string; dbPath: string; masterDbPath: string; localDbPath: string; lockingEnabled: boolean }>;
      wipeLocalDatabase: () => Promise<{ success: boolean; message?: string; error?: string }>;
      createJsonBackup: (selectedSections: string[]) => Promise<{ success: boolean; data?: any; error?: string }>;
      restoreJsonBackup: (backupData: any, selectedSections: string[]) => Promise<{ success: boolean; errors?: any[]; message?: string; error?: string }>;
      createDatabaseBackup: (destinationPath: string) => Promise<{ success: boolean; path?: string; size?: number; message?: string; error?: string }>;
      restoreDatabaseBackup: (sourcePath: string, targetPath: string) => Promise<{ success: boolean; message?: string; error?: string }>;
      clearTable: (tableName: string) => Promise<{ success: boolean; error?: string }>;
    };
    getSyncStatus: () => Promise<any>;
    manualSync: () => Promise<any>;
    window: {
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      toggleDevTools: () => Promise<void>;
    };
  };
  backupScheduler?: {
    getStatus: () => Promise<{
      enabled: boolean;
      scheduledTime: string;
      localBackupDirectory: string;
      nasBackupPath: string;
      nasAccessible: boolean;
      totalLocalBackups: number;
      maxBackups: number;
      nextRun: Date | null;
    }>;
    triggerManual: (options?: any) => Promise<{
      json: { success: boolean; local: string | null; nas: string | null; error: string | null };
      database: { success: boolean; local: string | null; nas: string | null; error: string | null };
      nasAccessible: boolean;
      errors: string[];
    }>;
    setEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
    setRetention: (days: number) => Promise<{ success: boolean }>;
    listBackups: () => Promise<{
      local: Array<{
        name: string;
        path: string;
        size: number;
        created: Date;
        age: number;
      }>;
      nas: {
        json: Array<{
          name: string;
          path: string;
          size: number;
          created: Date;
          age: number;
        }>;
        database: Array<{
          name: string;
          path: string;
          size: number;
          created: Date;
          age: number;
        }>;
      };
    }>;
    checkNAS: () => Promise<{ accessible: boolean; message: string }>;
    setNASPath: (nasPath: string) => Promise<{ success: boolean }>;
    readBackupFile: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  };
}
