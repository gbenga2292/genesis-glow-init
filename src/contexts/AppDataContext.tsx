import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { QuickCheckout, Site, CompanySettings as CompanySettingsType, Employee, SiteTransaction, Vehicle } from '@/types/asset';
import { EquipmentLog } from '@/types/equipment';
import { logger } from '@/lib/logger';
import { dataService } from '@/services/dataService';
import { performanceMonitor } from '@/utils/performanceMonitor';

interface AppDataContextType {
  quickCheckouts: QuickCheckout[];
  employees: Employee[];
  vehicles: Vehicle[];
  sites: Site[];
  companySettings: CompanySettingsType;
  siteTransactions: SiteTransaction[];
  equipmentLogs: EquipmentLog[];
  setQuickCheckouts: React.Dispatch<React.SetStateAction<QuickCheckout[]>>;
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  setSites: React.Dispatch<React.SetStateAction<Site[]>>;
  setCompanySettings: React.Dispatch<React.SetStateAction<CompanySettingsType>>;
  setSiteTransactions: React.Dispatch<React.SetStateAction<SiteTransaction[]>>;
  setEquipmentLogs: React.Dispatch<React.SetStateAction<EquipmentLog[]>>;
  refreshAllData: () => Promise<void>;
  isLoading: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [quickCheckouts, setQuickCheckouts] = useState<QuickCheckout[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsType>({} as CompanySettingsType);
  const [siteTransactions, setSiteTransactions] = useState<SiteTransaction[]>([]);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadQuickCheckouts = useCallback(async () => {
    performanceMonitor.start('load-quick-checkouts');
    try {
      const loadedCheckouts = await dataService.quickCheckouts.getQuickCheckouts();
      setQuickCheckouts(loadedCheckouts.map((item: any) => ({
        ...item,
        checkoutDate: new Date(item.checkoutDate || item.checkout_date)
      })));
      performanceMonitor.end('load-quick-checkouts', { count: loadedCheckouts.length });
    } catch (error) {
      performanceMonitor.end('load-quick-checkouts', { error: true });
      logger.error('Failed to load quick checkouts from database', error);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    performanceMonitor.start('load-employees');
    try {
      const loadedEmployees = await dataService.employees.getEmployees();
      setEmployees(loadedEmployees.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at),
        updatedAt: new Date(item.updatedAt || item.updated_at)
      })));
      performanceMonitor.end('load-employees', { count: loadedEmployees.length });
    } catch (error) {
      performanceMonitor.end('load-employees', { error: true });
      logger.error('Failed to load employees from database', error);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    performanceMonitor.start('load-vehicles');
    try {
      const loadedVehicles = await dataService.vehicles.getVehicles();
      setVehicles(loadedVehicles.map((item: any) => ({
        ...item,
        createdAt: new Date(item.created_at || item.createdAt),
        updatedAt: new Date(item.updated_at || item.updatedAt)
      })));
      performanceMonitor.end('load-vehicles', { count: loadedVehicles.length });
    } catch (error) {
      performanceMonitor.end('load-vehicles', { error: true });
      logger.error('Failed to load vehicles from database', error);
    }
  }, []);

  const loadSites = useCallback(async () => {
    performanceMonitor.start('load-sites');
    try {
      const loadedSites = await dataService.sites.getSites();
      setSites(loadedSites.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at),
        updatedAt: new Date(item.updatedAt || item.updated_at)
      })));
      performanceMonitor.end('load-sites', { count: loadedSites.length });
    } catch (error) {
      performanceMonitor.end('load-sites', { error: true });
      logger.error('Failed to load sites from database', error);
    }
  }, []);

  const loadCompanySettings = useCallback(async () => {
    performanceMonitor.start('load-company-settings');
    try {
      const loadedSettings = await dataService.companySettings.getCompanySettings();
      setCompanySettings(loadedSettings || ({} as CompanySettingsType));
      performanceMonitor.end('load-company-settings');
    } catch (error) {
      performanceMonitor.end('load-company-settings', { error: true });
      logger.error('Failed to load company settings from database', error);
    }
  }, []);

  const loadSiteTransactions = useCallback(async () => {
    performanceMonitor.start('load-site-transactions');
    try {
      const loadedTransactions = await dataService.siteTransactions.getSiteTransactions();
      setSiteTransactions(loadedTransactions.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at)
      })));
      performanceMonitor.end('load-site-transactions', { count: loadedTransactions.length });
    } catch (error) {
      performanceMonitor.end('load-site-transactions', { error: true });
      logger.error('Failed to load site transactions from database', error);
    }
  }, []);

  const loadEquipmentLogs = useCallback(async () => {
    performanceMonitor.start('load-equipment-logs');
    try {
      const logs = await dataService.equipmentLogs.getEquipmentLogs();
      setEquipmentLogs(logs.map((item: any) => ({
        ...item,
        date: new Date(item.date),
        createdAt: new Date(item.created_at || item.createdAt),
        updatedAt: new Date(item.updated_at || item.updatedAt)
      })));
      performanceMonitor.end('load-equipment-logs', { count: logs.length });
    } catch (error) {
      performanceMonitor.end('load-equipment-logs', { error: true });
      logger.error('Failed to load equipment logs from database', error);
    }
  }, []);

  // Track if initial load has been done to prevent double loading in React Strict Mode
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Prevent double loading in React 18 Strict Mode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    performanceMonitor.start('app-data-context-total-load');
    const loadData = async () => {
      try {
        await Promise.all([
          loadQuickCheckouts(),
          loadEmployees(),
          loadVehicles(),
          loadSites(),
          loadCompanySettings(),
          loadSiteTransactions(),
          loadEquipmentLogs()
        ]);
        performanceMonitor.end('app-data-context-total-load');

        // Print performance report after initial load
        setTimeout(() => {
          performanceMonitor.printReport();
        }, 100);
      } catch (error) {
        logger.error("Failed to load app data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - load only once

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      loadQuickCheckouts(),
      loadEmployees(),
      loadVehicles(),
      loadSites(),
      loadCompanySettings(),
      loadSiteTransactions(),
      loadEquipmentLogs()
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - load only once

  return (
    <AppDataContext.Provider value={{
      quickCheckouts,
      employees,
      vehicles,
      sites,
      companySettings,
      siteTransactions,
      equipmentLogs,
      setQuickCheckouts,
      setEmployees,
      setVehicles,
      setSites,
      setCompanySettings,
      setSiteTransactions,
      setEquipmentLogs,
      refreshAllData,
      isLoading
    }}>
      {children}
    </AppDataContext.Provider>
  );
};

