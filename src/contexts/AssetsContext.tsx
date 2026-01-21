import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Asset } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { dataService } from '@/services/dataService';

interface AssetsContextType {
  assets: Asset[];
  addAsset: (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAsset: (id: string, updatedAsset: Asset) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  getAssetById: (id: string) => Asset | undefined;
  refreshAssets: () => Promise<void>;
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export const useAssets = () => {
  const context = useContext(AssetsContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetsProvider');
  }
  return context;
};

export const AssetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);

  const loadAssets = useCallback(async () => {
    try {
      const loadedAssets = await dataService.assets.getAssets();
      setAssets(loadedAssets.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt || item.created_at),
        updatedAt: new Date(item.updatedAt || item.updated_at)
      })));
    } catch (error) {
      logger.error('Failed to load assets from database', error);
    }
  }, []);

  // Listen for refresh events from other contexts
  useEffect(() => {
    const handleRefreshAssets = (event: CustomEvent) => {
      const loadedAssets = event.detail;
      setAssets(loadedAssets.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      })));
    };

    window.addEventListener('refreshAssets', handleRefreshAssets as EventListener);
    return () => {
      window.removeEventListener('refreshAssets', handleRefreshAssets as EventListener);
    };
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Recalculate availableQuantity for all assets
  // Formula: quantity - reserved - damaged - missing (NOT subtracting siteQuantities)


  const addAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Don't set id - let Supabase auto-generate it
    const newAssetData = {
      ...assetData,
      status: assetData.status || 'active',
      condition: assetData.condition || 'good',
    };

    try {
      const savedAsset = await dataService.assets.createAsset(newAssetData);
      setAssets(prev => [...prev, {
        ...savedAsset,
        createdAt: new Date(savedAsset.createdAt),
        updatedAt: new Date(savedAsset.updatedAt)
      }]);

      toast({
        title: "Asset Added",
        description: `${savedAsset.name} has been added successfully`
      });
    } catch (error) {
      logger.error('Failed to add asset', error);
      toast({
        title: "Error",
        description: `Failed to add asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const updateAsset = async (id: string, updatedAsset: Asset) => {
    const assetWithUpdatedDate = {
      ...updatedAsset,
      availableQuantity: updatedAsset.availableQuantity,
      updatedAt: new Date()
    };

    try {
      await dataService.assets.updateAsset(Number(id), assetWithUpdatedDate);
      setAssets(prev => prev.map(asset => asset.id === id ? assetWithUpdatedDate : asset));

      toast({
        title: "Asset Updated",
        description: `${assetWithUpdatedDate.name} has been updated successfully`
      });
    } catch (error) {
      logger.error('Failed to update asset in database', error);
      toast({
        title: "Error",
        description: "Failed to update asset in database",
        variant: "destructive"
      });
    }
  };

  const deleteAsset = async (id: string) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    try {
      await dataService.assets.deleteAsset(Number(id));
      setAssets(prev => prev.filter(asset => asset.id !== id));

      toast({
        title: "Asset Deleted",
        description: `${asset.name} has been deleted successfully`
      });
    } catch (error) {
      logger.error('Failed to delete asset from database', error);
      toast({
        title: "Error",
        description: "Failed to delete asset from database",
        variant: "destructive"
      });
    }
  };

  const getAssetById = (id: string) => assets.find(asset => asset.id === id);

  const refreshAssets = async () => {
    await loadAssets();
  };

  return (
    <AssetsContext.Provider value={{
      assets,
      addAsset,
      updateAsset,
      deleteAsset,
      getAssetById,
      refreshAssets
    }}>
      {children}
    </AssetsContext.Provider>
  );
};
