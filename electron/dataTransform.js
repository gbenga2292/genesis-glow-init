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
    ...dbLog,
    createdAt: new Date(dbLog.created_at),
    updatedAt: new Date(dbLog.updated_at),
    date: new Date(dbLog.date),
    downtimeEntries: dbLog.downtime_entries ? JSON.parse(dbLog.downtime_entries) : [],
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
