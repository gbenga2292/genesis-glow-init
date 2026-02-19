import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Waybill } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { dataService } from '@/services/dataService';
import { performanceMonitor } from '@/utils/performanceMonitor';

/**
 * Recalculates reserved_quantity for all assets based on active waybills.
 * This ensures the reserved count is always accurate regardless of waybill edits/deletions.
 */
async function recalculateReservedQuantities(waybills: Waybill[]): Promise<void> {
  try {
    // Build a map of assetId -> total reserved quantity from active waybills
    const reservedMap = new Map<string, number>();

    const activeStatuses = ['outstanding', 'partial_returned', 'open', 'sent_to_site'];
    for (const waybill of waybills) {
      if (!activeStatuses.includes(waybill.status) || waybill.type !== 'waybill') continue;
      for (const item of waybill.items) {
        const unreturned = Math.max(0, item.quantity - (item.returnedQuantity || 0));
        reservedMap.set(
          String(item.assetId),
          (reservedMap.get(String(item.assetId)) || 0) + unreturned
        );
      }
    }

    // Fetch current assets
    const assets = await dataService.assets.getAssets();

    // Update assets whose reserved_quantity differs from the calculated value
    const updatePromises: Promise<any>[] = [];
    for (const asset of assets) {
      const calculatedReserved = reservedMap.get(String(asset.id)) || 0;
      const currentReserved = asset.reservedQuantity || 0;

      if (calculatedReserved !== currentReserved) {
        const newAvailable = Math.max(
          0,
          asset.quantity - calculatedReserved - (asset.damagedCount || 0) - (asset.missingCount || 0) - (asset.usedCount || 0)
        );
        updatePromises.push(
          dataService.assets.updateAsset(Number(asset.id), {
            ...asset,
            reservedQuantity: calculatedReserved,
            availableQuantity: newAvailable,
          })
        );
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      // Refresh assets in AssetsContext
      const refreshedAssets = await dataService.assets.getAssets();
      window.dispatchEvent(new CustomEvent('refreshAssets', {
        detail: refreshedAssets.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt || item.created_at),
          updatedAt: new Date(item.updatedAt || item.updated_at)
        }))
      }));
    }
  } catch (error) {
    logger.error('Failed to recalculate reserved quantities', error);
  }
}

interface WaybillsContextType {
  waybills: Waybill[];
  createWaybill: (waybillData: Partial<Waybill>) => Promise<Waybill | null>;
  updateWaybill: (id: string, updatedWaybill: Waybill) => Promise<void>;
  deleteWaybill: (id: string) => Promise<void>;
  getWaybillById: (id: string) => Waybill | undefined;
  refreshWaybills: () => Promise<void>;
  isLoading: boolean;
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
  const [isLoading, setIsLoading] = useState(true);

  const loadWaybills = useCallback(async () => {
    performanceMonitor.start('load-waybills');
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
      performanceMonitor.end('load-waybills', { count: loadedWaybills.length });
      // Recalculate reserved quantities on load to fix any stale data
      recalculateReservedQuantities(loadedWaybills).catch(err =>
        logger.error('Startup reserved recalculation failed', err)
      );
    } catch (error) {
      performanceMonitor.end('load-waybills', { error: true });
      logger.error('Failed to load waybills from database', error);
    } finally {
      setIsLoading(false);
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

      // Reload waybills then recalculate reserved quantities from source of truth
      await loadWaybills();
      const freshWaybills = await dataService.waybills.getWaybills();
      await recalculateReservedQuantities(freshWaybills);

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

      // Recalculate reserved quantities across all assets after any waybill change
      const freshWaybills = await dataService.waybills.getWaybills();
      await recalculateReservedQuantities(freshWaybills);

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

      // After deletion, recalculate reserved quantities so they drop back correctly
      const freshWaybills = await dataService.waybills.getWaybills();
      await recalculateReservedQuantities(freshWaybills);

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
      refreshWaybills,
      isLoading
    }}>
      {children}
    </WaybillsContext.Provider>
  );
};
