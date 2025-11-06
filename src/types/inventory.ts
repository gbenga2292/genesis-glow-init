export interface SiteInventoryItem {
  assetId: string;
  itemName: string;
  quantity: number;
  unit: string;
  category: 'dewatering' | 'waterproofing';
  itemType?: string; // Add item type (consumable, equipment, material, etc.)
  lastUpdated: Date;
}
