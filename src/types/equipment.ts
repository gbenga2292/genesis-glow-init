export interface DowntimeEntry {
  id: string;
  downtime: string;
  downtimeReason: string;
  downtimeAction: string;
  uptime?: string;
}

export interface EquipmentLog {
  id: string;
  equipmentId: string; // References the asset ID
  equipmentName: string;
  siteId: string;
  date: Date;
  active: boolean;
  downtimeEntries: DowntimeEntry[]; // Array of downtime entries
  maintenanceDetails?: string;
  dieselEntered?: number;
  supervisorOnSite?: string;
  clientFeedback?: string;
  issuesOnSite?: string;
  createdAt: Date;
  updatedAt: Date;
}
