import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Waybill } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { dataService } from '@/services/dataService';

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
    try {
      const loadedWaybills = await dataService.waybills.getWaybills();
      setWaybills(loadedWaybills.map((item: any) => ({
        ...item,
        issueDate: new Date(item.issueDate || item.issue_date),
        expectedReturnDate: item.expectedReturnDate || item.expected_return_date ? new Date(item.expectedReturnDate || item.expected_return_date) : undefined,
        sentToSiteDate: item.sentToSiteDate || item.sent_to_site_date ? new Date(item.sentToSiteDate || item.sent_to_site_date) : undefined,
        createdAt: new Date(item.createdAt || item.created_at),
        updatedAt: new Date(item.updatedAt || item.updated_at)
      })));
    } catch (error) {
      logger.error('Failed to load waybills from database', error);
    }
  }, []);

  useEffect(() => {
    loadWaybills();
  }, [loadWaybills]);

  const createWaybill = async (waybillData: Partial<Waybill>): Promise<Waybill | null> => {
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

    try {
      const result = await dataService.waybills.createWaybill(newWaybill);

      if (!result) {
        throw new Error('Failed to create waybill');
      }

      // Reload from database to ensure consistency
      await loadWaybills();

      // Also refresh assets to show updated reserved quantities
      try {
        const loadedAssets = await dataService.assets.getAssets();
        // Trigger assets refresh in AssetsContext
        window.dispatchEvent(new CustomEvent('refreshAssets', {
          detail: loadedAssets.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt || item.created_at),
            updatedAt: new Date(item.updatedAt || item.updated_at)
          }))
        }));
      } catch (error) {
        logger.error('Failed to refresh assets after waybill creation', error);
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
      await dataService.waybills.updateWaybill(id, updatedWaybill);
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
      await dataService.waybills.deleteWaybill(id);
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
