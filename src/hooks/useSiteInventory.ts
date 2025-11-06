import { useMemo } from 'react';
import { Waybill, Asset } from '@/types/asset';
import { SiteInventoryItem } from '@/types/inventory';

export const useSiteInventory = (waybills: Waybill[], assets: Asset[]) => {
  const siteInventory = useMemo(() => {
    // Use the asset's siteQuantities field which is accurately maintained by backend
    const inventory: SiteInventoryItem[] = [];
    const itemMap = new Map<string, SiteInventoryItem>();

    // Include current quantities per site from assets (including zero)
    assets.forEach(asset => {
      if (asset.siteQuantities) {
        Object.entries(asset.siteQuantities).forEach(([siteId, quantity]) => {
          if (quantity !== undefined) {
            const key = `${siteId}-${asset.id}`;
            itemMap.set(key, {
              assetId: asset.id,
              itemName: asset.name,
              quantity: quantity as number,
              unit: asset.unitOfMeasurement,
              category: asset.category,
              itemType: asset.type,
              lastUpdated: asset.updatedAt
            });
          }
        });
      }
    });

    // Also include historical items from waybills so zeroed/removed entries remain visible
    waybills.forEach(w => {
      w.items.forEach(it => {
        const asset = assets.find(a => String(a.id) === String(it.assetId));
        if (!asset) return;
        const key = `${w.siteId}-${asset.id}`;
        if (!itemMap.has(key)) {
          itemMap.set(key, {
            assetId: asset.id,
            itemName: asset.name,
            quantity: asset.siteQuantities?.[w.siteId] ?? 0,
            unit: asset.unitOfMeasurement,
            category: asset.category,
            itemType: asset.type,
            lastUpdated: asset.updatedAt
          });
        }
      });
    });

    return Array.from(itemMap.values());
  }, [assets, waybills]);

  const getSiteInventory = (siteId: string): SiteInventoryItem[] => {
    // Build current items for the site (including zero)
    const list: SiteInventoryItem[] = assets
      .filter(asset => asset.siteQuantities && asset.siteQuantities[siteId] !== undefined)
      .map(asset => ({
        assetId: asset.id,
        itemName: asset.name,
        quantity: asset.siteQuantities![siteId],
        unit: asset.unitOfMeasurement,
        category: asset.category,
        itemType: asset.type,
        lastUpdated: asset.updatedAt
      }));

    const presentIds = new Set(list.map(i => i.assetId));

    // Add historical items from waybills for this site if missing (quantity defaults to 0)
    waybills
      .filter(w => String(w.siteId) === String(siteId))
      .forEach(w => {
        w.items.forEach(it => {
          const asset = assets.find(a => String(a.id) === String(it.assetId));
          if (!asset) return;
          if (!presentIds.has(asset.id)) {
            list.push({
              assetId: asset.id,
              itemName: asset.name,
              quantity: 0,
              unit: asset.unitOfMeasurement,
              category: asset.category,
              itemType: asset.type,
              lastUpdated: asset.updatedAt
            });
            presentIds.add(asset.id);
          }
        });
      });

    return list;
  };

  return {
    siteInventory,
    getSiteInventory
  };
};
