export interface SiteInventoryItem {
  assetId: string;
  itemName: string;
  quantity: number;
  unit: string;
  category: 'dewatering' | 'waterproofing';
  lastUpdated: Date;
}
