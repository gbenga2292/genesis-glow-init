import { useMemo } from 'react';
import { Waybill, Asset } from '@/types/asset';
import { SiteInventoryItem } from '@/types/inventory';

export const useSiteInventory = (waybills: Waybill[], assets: Asset[]) => {
  const siteInventory = useMemo(() => {
    const inventory: SiteInventoryItem[] = [];
    const itemMap = new Map<string, SiteInventoryItem>();

    // Process all waybills that have been sent to sites
    waybills
      .filter(wb => wb.status === 'sent_to_site' && wb.type === 'waybill')
      .forEach(wb => {
        wb.items.forEach(item => {
          const asset = assets.find(a => a.id === item.assetId);
          if (!asset) return;

          const key = `${wb.siteId}-${item.assetId}`;
          const existing = itemMap.get(key);

          if (existing) {
            existing.quantity += item.quantity;
          } else {
            itemMap.set(key, {
              assetId: item.assetId,
              itemName: item.assetName,
              quantity: item.quantity,
              unit: asset.unitOfMeasurement,
              category: asset.category,
              lastUpdated: wb.sentToSiteDate || wb.updatedAt
            });
          }
        });
      });

    return Array.from(itemMap.values());
  }, [waybills, assets]);

  const getSiteInventory = (siteId: string): SiteInventoryItem[] => {
    return waybills
      .filter(wb => wb.siteId === siteId && wb.status === 'sent_to_site' && wb.type === 'waybill')
      .flatMap(wb => 
        wb.items.map(item => {
          const asset = assets.find(a => a.id === item.assetId);
          return {
            assetId: item.assetId,
            itemName: item.assetName,
            quantity: item.quantity,
            unit: asset?.unitOfMeasurement || 'units',
            category: asset?.category || 'dewatering',
            lastUpdated: wb.sentToSiteDate || wb.updatedAt
          } as SiteInventoryItem;
        })
      )
      .reduce((acc, item) => {
        const existing = acc.find(i => i.assetId === item.assetId);
        if (existing) {
          existing.quantity += item.quantity;
          if (item.lastUpdated > existing.lastUpdated) {
            existing.lastUpdated = item.lastUpdated;
          }
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as SiteInventoryItem[]);
  };

  return {
    siteInventory,
    getSiteInventory
  };
};
