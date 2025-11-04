import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Waybill } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface WaybillsContextType {
  waybills: Waybill[];
  createWaybill: (waybillData: Partial<Waybill>) => Promise<Waybill | null>;
  updateWaybill: (id: string, updatedWaybill: Waybill) => Promise<void>;
  deleteWaybill: (id: string) => Promise<void>;
  getWaybillById: (id: string) => Waybill | undefined;
  refreshWaybills: () => Promise<void>;
}

const WaybillsContext = createContext<WaybillsContextType | undefined>(undefined);

export const useWaybills = () => {
  const context = useContext(WaybillsContext);
  if (context === undefined) {
    throw new Error('useWaybills must be used within a WaybillsProvider');
  }
  return context;
};

export const WaybillsProvider: React.FC<{ children: React.ReactNode; currentUserName?: string }> = ({ 
  children, 
  currentUserName = 'Unknown User' 
}) => {
  const { toast } = useToast();
  const [waybills, setWaybills] = useState<Waybill[]>([]);

  const loadWaybills = useCallback(async () => {
    if (window.db) {
      try {
        const loadedWaybills = await window.db.getWaybills();
        setWaybills(loadedWaybills.map((item: any) => ({
          ...item,
          issueDate: new Date(item.issueDate),
          expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
          sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        })));
      } catch (error) {
        logger.error('Failed to load waybills from database', error);
      }
    }
  }, []);

  useEffect(() => {
    loadWaybills();
  }, [loadWaybills]);

  const createWaybill = async (waybillData: Partial<Waybill>): Promise<Waybill | null> => {
    if (!window.db) {
      toast({
        title: "Database Not Available",
        description: "This app needs to run in Electron mode to access the database.",
        variant: "destructive"
      });
      return null;
    }

    const newWaybill: Partial<Waybill> = {
      ...waybillData,
      issueDate: waybillData.issueDate || new Date(),
      status: waybillData.status || 'outstanding',
      service: waybillData.service || 'dewatering',
      type: 'waybill',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUserName,
      items: (waybillData.items || []).map(item => ({
        ...item,
        status: item.status || 'outstanding'
      }))
    };

    // Prepare data for database insertion (ID will be generated in database)
    const dbWaybillData = {
      siteId: newWaybill.siteId,
      driverName: newWaybill.driverName,
      vehicle: newWaybill.vehicle,
      issueDate: newWaybill.issueDate!.toISOString(),
      expectedReturnDate: newWaybill.expectedReturnDate ? newWaybill.expectedReturnDate.toISOString() : null,
      purpose: newWaybill.purpose,
      service: newWaybill.service,
      status: newWaybill.status,
      type: newWaybill.type,
      createdAt: newWaybill.createdAt!.toISOString(),
      updatedAt: newWaybill.updatedAt!.toISOString(),
      createdBy: currentUserName,
      items: newWaybill.items
    };

    try {
      const result = await window.db.createWaybill(dbWaybillData);
      
      if (!result) {
        throw new Error('Failed to create waybill');
      }
      
      // Reload from database to ensure consistency
      await loadWaybills();

      // Also refresh assets to show updated reserved quantities
      if (window.db) {
        try {
          const loadedAssets = await window.db.getAssets();
          // Trigger assets refresh in AssetsContext
          window.dispatchEvent(new CustomEvent('refreshAssets', { detail: loadedAssets.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          })) }));
        } catch (error) {
          logger.error('Failed to refresh assets after waybill creation', error);
        }
      }

      toast({
        title: "Waybill Created",
        description: `Waybill ${result.id} created successfully. Reserved quantities updated.`
      });

      return result as Waybill;
    } catch (error) {
      logger.error('Failed to create waybill', error);
      toast({
        title: "Error",
        description: `Failed to create waybill: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateWaybill = async (id: string, updatedWaybill: Waybill) => {
    try {
      if (window.db) {
        await window.db.updateWaybill(id, updatedWaybill);
      }
      
      setWaybills(prev => prev.map(wb => wb.id === id ? updatedWaybill : wb));
      
      toast({
        title: "Waybill Updated",
        description: `Waybill ${id} has been updated successfully`
      });
    } catch (error) {
      logger.error('Failed to update waybill', error);
      toast({
        title: "Error",
        description: "Failed to update waybill in database",
        variant: "destructive"
      });
    }
  };

  const deleteWaybill = async (id: string) => {
    try {
      await window.db.deleteWaybill(id);
      setWaybills(prev => prev.filter(wb => wb.id !== id));
      
      toast({
        title: "Waybill Deleted",
        description: `Waybill ${id} has been deleted successfully`
      });
    } catch (error) {
      logger.error('Failed to delete waybill', error);
      toast({
        title: "Error",
        description: "Failed to delete waybill from database",
        variant: "destructive"
      });
    }
  };

  const getWaybillById = (id: string) => waybills.find(wb => wb.id === id);

  const refreshWaybills = async () => {
    await loadWaybills();
  };

  return (
    <WaybillsContext.Provider value={{
      waybills,
      createWaybill,
      updateWaybill,
      deleteWaybill,
      getWaybillById,
      refreshWaybills
    }}>
      {children}
    </WaybillsContext.Provider>
  );
};
