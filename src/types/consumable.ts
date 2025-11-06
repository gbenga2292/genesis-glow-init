export interface ConsumableUsageLog {
  id: string;
  consumableId: string;
  consumableName: string;
  siteId: string;
  date: Date;
  quantityUsed: number;
  quantityRemaining: number;
  unit: string;
  usedFor: string; // What the consumable was used for
  usedBy: string; // Who used it
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsumableUsageStats {
  consumableId: string;
  consumableName: string;
  totalUsed: number;
  unit: string;
  usageCount: number; // Number of times used
  averagePerUsage: number;
  lastUsedDate?: Date;
  usageFrequency: number; // Days between usage on average
  monthlyTrend: {
    month: string;
    quantity: number;
  }[];
}
