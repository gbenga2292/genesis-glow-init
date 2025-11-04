// Utility functions for transforming data between frontend and database formats

/**
 * Transform asset data from database format to frontend format
 */
export function transformAssetFromDB(dbAsset: any): any {
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
    reservedQuantity: dbAsset.reserved_quantity || 0,
    availableQuantity: dbAsset.available_quantity || 0,
  };
}

/**
 * Transform asset data from frontend format to database format
 */
export function transformAssetToDB(asset: any): any {
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
    reserved_quantity: asset.reservedQuantity,
    available_quantity: asset.availableQuantity,
    site_quantities: JSON.stringify(asset.siteQuantities || {}),
  };
}

/**
 * Transform site data from database format to frontend format
 */
export function transformSiteFromDB(dbSite: any): any {
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
export function transformSiteToDB(site: any): any {
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
export function transformEmployeeFromDB(dbEmployee: any): any {
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
export function transformEmployeeToDB(employee: any): any {
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
export function transformCompanySettingsFromDB(dbSettings: any): any {
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
export function transformCompanySettingsToDB(settings: any): any {
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
export function transformEquipmentLogFromDB(dbLog: any): any {
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
export function transformEquipmentLogToDB(log: any): any {
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
export function transformWaybillFromDB(dbWaybill: any): any {
  return {
    ...dbWaybill,
    issueDate: new Date(dbWaybill.issue_date || dbWaybill.issueDate),
    sentToSiteDate: dbWaybill.sent_to_site_date ? new Date(dbWaybill.sent_to_site_date) : undefined,
    expectedReturnDate: dbWaybill.expected_return_date ? new Date(dbWaybill.expected_return_date) : undefined,
    createdAt: new Date(dbWaybill.created_at || dbWaybill.createdAt),
    updatedAt: new Date(dbWaybill.updated_at || dbWaybill.updatedAt),
    items: typeof dbWaybill.items === 'string' ? JSON.parse(dbWaybill.items) : dbWaybill.items || [],
    driverName: dbWaybill.driver_name || dbWaybill.driverName,
    siteId: dbWaybill.site_id || dbWaybill.siteId,
    returnToSiteId: dbWaybill.return_to_site_id || dbWaybill.returnToSiteId,
    createdBy: dbWaybill.created_by || dbWaybill.createdBy,
  };
}

/**
 * Transform waybill data from frontend format to database format
 */
export function transformWaybillToDB(waybill: any): any {
  return {
    id: waybill.id,
    items: JSON.stringify(waybill.items || []),
    site_id: waybill.siteId,
    driver_name: waybill.driverName,
    vehicle: waybill.vehicle,
    issue_date: waybill.issueDate,
    sent_to_site_date: waybill.sentToSiteDate,
    expected_return_date: waybill.expectedReturnDate,
    purpose: waybill.purpose,
    service: waybill.service,
    return_to_site_id: waybill.returnToSiteId,
    status: waybill.status,
    type: waybill.type,
    created_at: waybill.createdAt,
    updated_at: waybill.updatedAt,
    created_by: waybill.createdBy,
  };
}
