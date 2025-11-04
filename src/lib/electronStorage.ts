// Electron storage wrapper - uses Electron IPC when available, falls back to localStorage for web
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (window.electronAPI) {
      // Use Electron database
      return null; // We'll use direct DB calls instead
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (window.electronAPI) {
      // Use Electron database
      return; // We'll use direct DB calls instead
    }
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (window.electronAPI) {
      // Use Electron database
      return; // We'll use direct DB calls instead
    }
    localStorage.removeItem(key);
  }
};

// Type declaration for electronAPI
declare global {
  interface Window {
    electronAPI?: {
      // Assets
      getAssets: () => Promise<any[]>;
      addAsset: (asset: any) => Promise<{ success: boolean }>;
      updateAsset: (asset: any) => Promise<{ success: boolean }>;
      deleteAsset: (id: string) => Promise<{ success: boolean }>;

      // Waybills
      getWaybills: () => Promise<any[]>;
      addWaybill: (waybill: any) => Promise<{ success: boolean }>;
      updateWaybill: (waybill: any) => Promise<{ success: boolean }>;
      deleteWaybill: (id: string) => Promise<{ success: boolean }>;

      // Quick Checkouts
      getQuickCheckouts: () => Promise<any[]>;
      addQuickCheckout: (checkout: any) => Promise<{ success: boolean }>;
      updateQuickCheckout: (checkout: any) => Promise<{ success: boolean }>;

      // Sites
      getSites: () => Promise<any[]>;
      addSite: (site: any) => Promise<{ success: boolean }>;
      updateSite: (site: any) => Promise<{ success: boolean }>;
      deleteSite: (id: string) => Promise<{ success: boolean }>;

      // Employees
      getEmployees: () => Promise<any[]>;
      addEmployee: (employee: any) => Promise<{ success: boolean }>;
      updateEmployee: (employee: any) => Promise<{ success: boolean }>;
      deleteEmployee: (id: string) => Promise<{ success: boolean }>;

      // Site Transactions
      getSiteTransactions: () => Promise<any[]>;
      addSiteTransaction: (transaction: any) => Promise<{ success: boolean }>;
      updateSiteTransaction: (id: string, transaction: any) => Promise<{ success: boolean }>;
      deleteSiteTransaction: (id: string) => Promise<{ success: boolean }>;

      // Company Settings
      getCompanySettings: () => Promise<any>;
      saveCompanySettings: (settings: any) => Promise<{ success: boolean; message?: string }>;

      // Vehicles
      getVehicles: () => Promise<string[]>;
      addVehicle: (vehicleName: string) => Promise<{ success: boolean; error?: string }>;
      deleteVehicle: (vehicleName: string) => Promise<{ success: boolean }>;

      // Equipment Logs
      getEquipmentLogs: () => Promise<any[]>;
      addEquipmentLog: (log: any) => Promise<{ success: boolean }>;
      updateEquipmentLog: (log: any) => Promise<{ success: boolean }>;
      deleteEquipmentLog: (id: string) => Promise<{ success: boolean }>;

      // Auth
      login: (username: string, password: string) => Promise<{ success: boolean }>;
      signup: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;

      // Backup/Restore
      backup: () => Promise<any>;
      restore: (data: any) => Promise<{ success: boolean; error?: string }>;
      reset: () => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export const isElectron = () => !!window.electronAPI;
