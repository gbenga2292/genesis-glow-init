// Utility functions for transforming data between frontend and database formats

/**
 * Transform asset data from database format to frontend format
 */
export function transformAssetFromDB(dbAsset) {
  return {
    ...dbAsset,
    createdAt: new Date(dbAsset.created_at),
    updatedAt: new Date(dbAsset.updated_at),
    purchaseDate: dbAsset.purchase_date ? new Date(dbAsset.purchase_date) : undefined,
    siteQuantities: dbAsset.site_quantities ? JSON.parse(dbAsset.site_quantities) : {},
    lowStockLevel: dbAsset.low_stock_level || 10,
    criticalStockLevel: dbAsset.critical_stock_level || 5,
    powerSource: dbAsset.power_source,
    fuelCapacity: dbAsset.fuel_capacity,
    fuelConsumptionRate: dbAsset.fuel_consumption_rate,
    electricityConsumption: dbAsset.electricity_consumption,
    requiresLogging: Boolean(dbAsset.requires_logging),
    reservedQuantity: dbAsset.reserved_quantity || 0,
    availableQuantity: dbAsset.available_quantity || 0,
  };
}

/**
 * Transform asset data from frontend format to database format
 */
export function transformAssetToDB(asset) {
  return {
    name: asset.name,
    description: asset.description,
    quantity: asset.quantity,
    unit_of_measurement: asset.unitOfMeasurement,
    category: asset.category,
    type: asset.type,
    location: asset.location,
    site_id: asset.siteId,
    service: asset.service,
    status: asset.status,
    condition: asset.condition,
    missing_count: asset.missingCount,
    damaged_count: asset.damagedCount,
    low_stock_level: asset.lowStockLevel,
    critical_stock_level: asset.criticalStockLevel,
    purchase_date: asset.purchaseDate,
    cost: asset.cost,
    power_source: asset.powerSource,
    fuel_capacity: asset.fuelCapacity,
    fuel_consumption_rate: asset.fuelConsumptionRate,
    electricity_consumption: asset.electricityConsumption,
    requires_logging: asset.requiresLogging ? 1 : 0,
    reserved_quantity: asset.reservedQuantity,
    available_quantity: asset.availableQuantity,
    site_quantities: JSON.stringify(asset.siteQuantities || {}),
  };
}

/**
 * Transform site data from database format to frontend format
 */
export function transformSiteFromDB(dbSite) {
  return {
    ...dbSite,
    createdAt: new Date(dbSite.created_at),
    updatedAt: new Date(dbSite.updated_at),
    service: dbSite.service ? JSON.parse(dbSite.service) : undefined,
    clientName: dbSite.client_name,
  };
}

/**
 * Transform site data from frontend format to database format
 */
export function transformSiteToDB(site) {
  return {
    name: site.name,
    location: site.location,
    description: site.description,
    client_name: site.clientName,
    contact_person: site.contactPerson,
    phone: site.phone,
    service: JSON.stringify(site.service || []),
    status: site.status,
  };
}

/**
 * Transform employee data from database format to frontend format
 */
export function transformEmployeeFromDB(dbEmployee) {
  return {
    ...dbEmployee,
    createdAt: new Date(dbEmployee.created_at),
    updatedAt: new Date(dbEmployee.updated_at),
    delistedDate: dbEmployee.delisted_date ? new Date(dbEmployee.delisted_date) : undefined,
  };
}

/**
 * Transform site transaction data from database format to frontend format
 */
export function transformSiteTransactionFromDB(dbTransaction) {
  return {
    id: dbTransaction.id,
    siteId: dbTransaction.site_id,
    assetId: dbTransaction.asset_id,
    assetName: dbTransaction.asset_name,
    quantity: dbTransaction.quantity,
    type: dbTransaction.type,
    transactionType: dbTransaction.transaction_type,
    referenceId: dbTransaction.reference_id,
    referenceType: dbTransaction.reference_type,
    condition: dbTransaction.condition,
    notes: dbTransaction.notes,
    createdAt: new Date(dbTransaction.created_at),
    createdBy: dbTransaction.created_by,
  };
}

/**
 * Transform site transaction data from frontend format to database format
 */
export function transformSiteTransactionToDB(transaction) {
  return {
    site_id: transaction.siteId,
    asset_id: transaction.assetId,
    asset_name: transaction.assetName,
    quantity: transaction.quantity,
    type: transaction.type,
    transaction_type: transaction.transactionType,
    reference_id: transaction.referenceId,
    reference_type: transaction.referenceType,
    condition: transaction.condition,
    notes: transaction.notes,
    created_by: transaction.createdBy,
  };
}

/**
 * Transform employee data from frontend format to database format
 */
export function transformEmployeeToDB(employee) {
  return {
    name: employee.name,
    role: employee.role,
    phone: employee.phone,
    email: employee.email,
    status: employee.status,
    delisted_date: employee.delistedDate,
  };
}

/**
 * Transform company settings from database format to frontend format
 */
export function transformCompanySettingsFromDB(dbSettings) {
  return {
    ...dbSettings,
    notifications: {
      email: dbSettings.notifications_email,
      push: dbSettings.notifications_push,
    },
  };
}

/**
 * Transform company settings from frontend format to database format
 */
export function transformCompanySettingsToDB(settings) {
  return {
    company_name: settings.companyName,
    logo: settings.logo,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    currency: settings.currency,
    date_format: settings.dateFormat,
    theme: settings.theme,
    notifications_email: settings.notifications.email,
    notifications_push: settings.notifications.push,
  };
}

/**
 * Transform equipment log from database format to frontend format
 */
export function transformEquipmentLogFromDB(dbLog) {
  return {
    id: dbLog.id,
    equipmentId: dbLog.equipment_id ? dbLog.equipment_id.toString() : dbLog.equipment_id,
    equipmentName: dbLog.equipment_name,
    siteId: dbLog.site_id ? dbLog.site_id.toString() : dbLog.site_id,
    date: new Date(dbLog.date),
    active: dbLog.active,
    downtimeEntries: dbLog.downtime_entries ? JSON.parse(dbLog.downtime_entries) : [],
    maintenanceDetails: dbLog.maintenance_details,
    dieselEntered: dbLog.diesel_entered,
    supervisorOnSite: dbLog.supervisor_on_site,
    clientFeedback: dbLog.client_feedback,
    issuesOnSite: dbLog.issues_on_site,
    createdAt: new Date(dbLog.created_at),
    updatedAt: new Date(dbLog.updated_at),
  };
}

/**
 * Transform equipment log from frontend format to database format
 */
export function transformEquipmentLogToDB(log) {
  return {
    equipment_id: log.equipmentId,
    equipment_name: log.equipmentName,
    site_id: log.siteId,
    date: log.date,
    active: log.active,
    downtime_entries: JSON.stringify(log.downtimeEntries || []),
    maintenance_details: log.maintenanceDetails,
    diesel_entered: log.dieselEntered,
    supervisor_on_site: log.supervisorOnSite,
    client_feedback: log.clientFeedback,
    issues_on_site: log.issuesOnSite,
  };
}

/**
 * Transform waybill data from database format to frontend format
 */
export function transformWaybillFromDB(dbWaybill) {
  return {
    ...dbWaybill,
    items: dbWaybill.items ? JSON.parse(dbWaybill.items) : [],
  };
}

/**
 * Transform waybill data from frontend format to database format
 */
export function transformWaybillToDB(waybill) {
  return {
    ...waybill,
    items: JSON.stringify(waybill.items || []),
  };
}

/**
 * Transform consumable log from database format to frontend format
 */
export function transformConsumableLogFromDB(dbLog) {
  return {
    id: dbLog.id,
    consumableId: dbLog.consumable_id ? dbLog.consumable_id.toString() : dbLog.consumable_id,
    consumableName: dbLog.consumable_name,
    siteId: dbLog.site_id ? dbLog.site_id.toString() : dbLog.site_id,
    date: new Date(dbLog.date),
    quantityUsed: dbLog.quantity_used,
    quantityRemaining: dbLog.quantity_remaining,
    unit: dbLog.unit,
    usedFor: dbLog.used_for,
    usedBy: dbLog.used_by,
    notes: dbLog.notes,
    createdAt: new Date(dbLog.created_at),
    updatedAt: new Date(dbLog.updated_at),
  };
}

/**
 * Transform consumable log from frontend format to database format
 */
export function transformConsumableLogToDB(log) {
  return {
    id: log.id,
    consumable_id: log.consumableId,
    consumable_name: log.consumableName,
    site_id: log.siteId,
    date: log.date,
    quantity_used: log.quantityUsed,
    quantity_remaining: log.quantityRemaining,
    unit: log.unit,
    used_for: log.usedFor,
    used_by: log.usedBy,
    notes: log.notes,
  };
}
