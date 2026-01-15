import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { QuickCheckout, Site, CompanySettings as CompanySettingsType, Employee, SiteTransaction, Vehicle } from '@/types/asset';
import { EquipmentLog } from '@/types/equipment';
import { logger } from '@/lib/logger';
import { dataService } from '@/services/dataService';

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

  const loadQuickCheckouts = useCallback(async () => {
    try {
      const loadedCheckouts = await dataService.quickCheckouts.getQuickCheckouts();
      setQuickCheckouts(loadedCheckouts.map((item: any) => ({
        ...item,
        checkoutDate: new Date(item.checkoutDate || item.checkout_date)
      })));
    } catch (error) {
      logger.error('Failed to load quick checkouts from database', error);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const loadedEmployees = await dataService.employees.getEmployees();
      setEmployees(loadedEmployees.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at),
        updatedAt: new Date(item.updatedAt || item.updated_at)
      })));
    } catch (error) {
      logger.error('Failed to load employees from database', error);
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const loadedVehicles = await dataService.vehicles.getVehicles();
      setVehicles(loadedVehicles.map((item: any) => ({
        ...item,
        createdAt: new Date(item.created_at || item.createdAt),
        updatedAt: new Date(item.updated_at || item.updatedAt)
      })));
    } catch (error) {
      logger.error('Failed to load vehicles from database', error);
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      const loadedSites = await dataService.sites.getSites();
      setSites(loadedSites.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at),
        updatedAt: new Date(item.updatedAt || item.updated_at)
      })));
    } catch (error) {
      logger.error('Failed to load sites from database', error);
    }
  }, []);

  const loadCompanySettings = useCallback(async () => {
    try {
      const loadedSettings = await dataService.companySettings.getCompanySettings();
      setCompanySettings(loadedSettings || ({} as CompanySettingsType));
    } catch (error) {
      logger.error('Failed to load company settings from database', error);
    }
  }, []);

  const loadSiteTransactions = useCallback(async () => {
    try {
      const loadedTransactions = await dataService.siteTransactions.getSiteTransactions();
      setSiteTransactions(loadedTransactions.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at)
      })));
    } catch (error) {
      logger.error('Failed to load site transactions from database', error);
    }
  }, []);

  const loadEquipmentLogs = useCallback(async () => {
    try {
      const logs = await dataService.equipmentLogs.getEquipmentLogs();
      setEquipmentLogs(logs.map((item: any) => ({
        ...item,
        date: new Date(item.date),
        createdAt: new Date(item.created_at || item.createdAt),
        updatedAt: new Date(item.updated_at || item.updatedAt)
      })));
    } catch (error) {
      logger.error('Failed to load equipment logs from database', error);
    }
  }, []);

  useEffect(() => {
    loadQuickCheckouts();
    loadEmployees();
    loadVehicles();
    loadSites();
    loadCompanySettings();
    loadSiteTransactions();
    loadEquipmentLogs();
  }, [loadQuickCheckouts, loadEmployees, loadVehicles, loadSites, loadCompanySettings, loadSiteTransactions, loadEquipmentLogs]);

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
  }, [loadQuickCheckouts, loadEmployees, loadVehicles, loadSites, loadCompanySettings, loadSiteTransactions, loadEquipmentLogs]);

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
      refreshAllData
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
