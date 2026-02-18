export interface Asset {
  id: string;
  name: string;
  description?: string;
  quantity: number; // Total company inventory - only changes on physical additions/edits
  reservedQuantity: number; // Reserved for pending waybills
  availableQuantity: number; // Calculated: quantity - reservedQuantity - sum of siteQuantities
  siteQuantities: Record<string, number>; // Quantities allocated to specific sites
  unitOfMeasurement: string;
  category: 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office';
  type: 'consumable' | 'non-consumable' | 'tools' | 'equipment';
  location?: string;
  siteId?: string; // Link asset to a specific site
  service?: string; // Service classification for sorting
  status: 'active' | 'damaged' | 'missing' | 'maintenance';
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  missingCount?: number;
  damagedCount?: number;
  usedCount?: number;
  lowStockLevel: number;
  criticalStockLevel: number;
  purchaseDate?: Date;
  cost: number;
  // Machine/Equipment details
  model?: string;
  serialNumber?: string;
  serviceInterval?: number; // in months, default 2
  deploymentDate?: Date;
  // Equipment-specific operational details
  powerSource?: 'fuel' | 'electricity' | 'hybrid' | 'manual';
  fuelCapacity?: number; // Tank capacity in liters
  fuelConsumptionRate?: number; // Consumption in liters per 24 hours
  electricityConsumption?: number; // Power consumption in kW or kWh per day
  requiresLogging?: boolean; // Whether this equipment requires daily logging
  createdAt: Date;
  updatedAt: Date;
}

export interface Waybill {
  id: string;
  items: WaybillItem[];
  siteId: string;
  driverName: string;
  vehicle: string;
  issueDate: Date;
  sentToSiteDate?: Date;
  expectedReturnDate?: Date;
  purpose: string;
  service: string;
  returnToSiteId?: string;
  status: 'outstanding' | 'partial_returned' | 'return_completed' | 'sent_to_site' | 'open';
  type: 'waybill' | 'return';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  signatureUrl?: string; // Frozen signature image captured at creation time
  signatureName?: string; // Name of person who signed
  signatureRole?: string; // Role of person who signed
}

export interface WaybillItem {
  assetId: string;
  assetName: string;
  quantity: number;
  returnedQuantity: number;
  status: 'outstanding' | 'partial_returned' | 'return_completed' | 'lost' | 'damaged';
  returnBreakdown?: {
    good: number;
    damaged: number;
    missing: number;
  };
}

export interface QuickCheckout {
  id: string;
  assetId: string;
  assetName: string;
  quantity: number;
  returnedQuantity: number;
  employee: string;
  employeeId?: string;
  checkoutDate: Date;
  expectedReturnDays: number;
  returnDate?: Date;
  status: 'outstanding' | 'return_completed' | 'lost' | 'damaged' | 'used';
  notes?: string; // Optional notes for return/update clarification
}

export interface ReturnBill {
  id: string;
  waybillId: string;
  items: ReturnItem[];
  returnDate: Date;
  receivedBy: string;
  condition: 'good' | 'damaged' | 'missing';
  notes?: string;
  status: 'initiated' | 'completed';
}

export interface ReturnItem {
  assetId: string;
  assetName: string;
  quantity: number;
  condition: 'good' | 'damaged' | 'missing';
}

export interface Site {
  id: string;
  name: string;
  location: string;
  description?: string;
  clientName?: string;
  contactPerson?: string;
  phone?: string;
  service?: ('dewatering' | 'waterproofing' | 'tiling' | 'sales' | 'repairs' | 'maintenance')[];
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySettings {
  companyName: string;
  logo?: string; // base64 or URL
  address: string;
  phone: string;
  email: string;
  website?: string;
  currency: string;
  dateFormat: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
  };
  maintenanceFrequency?: number; // Global default maintenance frequency in days
  currencySymbol?: string; // e.g. ₦, $, €
  electricityRate?: number; // Electricity cost per kWh (e.g., 200 for ₦200/kWh)
}

export interface Employee {
  id: string;
  name: string;
  role: string; // e.g., 'driver', 'manager', etc.
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  delistedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  name: string;
  type?: string;
  registration_number?: string;
  status: 'active' | 'inactive';
  delistedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SiteTransaction {
  id: string;
  siteId: string;
  assetId: string;
  assetName: string;
  quantity: number;
  type: 'in' | 'out'; // 'in' for materials coming to site, 'out' for materials leaving site
  transactionType: 'waybill' | 'return'; // what caused this transaction
  referenceId: string; // waybill id or return id
  referenceType: 'waybill' | 'return_waybill';
  condition?: 'good' | 'damaged' | 'missing'; // for returns
  notes?: string;
  createdAt: Date;
  createdBy?: string; // user who performed the action
}

export interface Activity {
  id: string;
  userId?: string;
  userName?: string;
  action: 'create' | 'update' | 'delete' | 'process_return' | 'add_site' | 'update_site' | 'delete_site' | 'add_asset' | 'update_asset' | 'delete_asset' | 'add_employee' | 'backup' | 'restore' | 'clear' | 'login' | 'logout' | 'create_user' | 'update_user' | 'delete_user' | 'checkout' | 'return' | 'move' | 'reset' | 'restock';
  entity: 'waybill' | 'return' | 'site' | 'asset' | 'employee' | 'company_settings' | 'activities' | 'vehicle' | 'equipment_log' | 'consumable_log' | 'user' | 'checkout' | 'system' | 'database' | 'maintenance' | 'machine';
  entityId?: string;
  details?: string;
  timestamp: Date;
}

export interface EquipmentLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  siteId: string;
  date: Date;
  active: boolean;
  downtimeEntries: any[]; // JSON array
  maintenanceDetails?: string;
  dieselEntered?: number;
  supervisorOnSite?: string;
  clientFeedback?: string;
  issuesOnSite?: string;
  createdAt: Date;
  updatedAt: Date;
}
