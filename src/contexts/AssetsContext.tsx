import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Asset } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

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
    if (window.db) {
      try {
        const loadedAssets = await window.db.getAssets();
        setAssets(loadedAssets.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        })));
      } catch (error) {
        logger.error('Failed to load assets from database', error);
      }
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
  useEffect(() => {
    setAssets(prev => prev.map(asset => {
      if (!asset.siteId) {
        const reservedQuantity = asset.reservedQuantity || 0;
        const damagedCount = asset.damagedCount || 0;
        const missingCount = asset.missingCount || 0;
        const totalQuantity = asset.quantity;
        return {
          ...asset,
          availableQuantity: totalQuantity - reservedQuantity - damagedCount - missingCount
        };
      }
      return asset;
    }));
  }, [assets.length]);

  const addAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!window.db) {
      toast({
        title: "Database Not Available",
        description: "This app needs to run in Electron mode to access the database.",
        variant: "destructive"
      });
      return;
    }

    const newAsset: Asset = {
      ...assetData,
      id: Date.now().toString(),
      status: assetData.status || 'active',
      condition: assetData.condition || 'good',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const savedAssets = await window.db.addAsset(newAsset);
      const savedAsset = savedAssets[0];
      setAssets(prev => [...prev, savedAsset]);
      
      toast({
        title: "Asset Added",
        description: `${newAsset.name} has been added successfully`
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
      availableQuantity: !updatedAsset.siteId ? 
        (updatedAsset.quantity - (updatedAsset.reservedQuantity || 0)) : 
        updatedAsset.availableQuantity,
      updatedAt: new Date()
    };

    try {
      if (window.db) {
        await window.db.updateAsset(id, assetWithUpdatedDate);
      }
      
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
      await window.db.deleteAsset(id);
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
