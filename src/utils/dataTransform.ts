// Utility functions for transforming data between frontend and database formats

/**
 * Transform asset data from database format to frontend format
 */
export function transformAssetFromDB(dbAsset: any): any {
  // Parse site_quantities safely
  let siteQuantities = {};
  if (dbAsset.site_quantities) {
    try {
      siteQuantities = typeof dbAsset.site_quantities === 'string'
        ? JSON.parse(dbAsset.site_quantities)
        : dbAsset.site_quantities;
    } catch {
      siteQuantities = {};
    }
  }

  return {
    ...dbAsset,
    id: String(dbAsset.id), // Convert to string for frontend consistency
    unitOfMeasurement: dbAsset.unit_of_measurement || dbAsset.unitOfMeasurement || 'pcs',
    createdAt: new Date(dbAsset.created_at),
    updatedAt: new Date(dbAsset.updated_at),
    purchaseDate: dbAsset.purchase_date ? new Date(dbAsset.purchase_date) : undefined,
    siteQuantities,
    lowStockLevel: dbAsset.low_stock_level || 10,
    criticalStockLevel: dbAsset.critical_stock_level || 5,
    powerSource: dbAsset.power_source,
    fuelCapacity: dbAsset.fuel_capacity,
    fuelConsumptionRate: dbAsset.fuel_consumption_rate,
    electricityConsumption: dbAsset.electricity_consumption,
    reservedQuantity: dbAsset.reserved_quantity || 0,
    availableQuantity: dbAsset.available_quantity || 0,
    siteId: dbAsset.site_id,
    missingCount: dbAsset.missing_count || 0,
    damagedCount: dbAsset.damaged_count || 0,
    usedCount: dbAsset.used_count || 0,
    requiresLogging: dbAsset.requires_logging || false,
  };
}

/**
 * Transform asset data from frontend format to database format
 */
export function transformAssetToDB(asset: any): any {
  return {
    id: asset.id,
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
    used_count: asset.usedCount,
    low_stock_level: asset.lowStockLevel,
    critical_stock_level: asset.criticalStockLevel,
    purchase_date: asset.purchaseDate,
    cost: asset.cost,
    // Equipment/Machine specific fields
    model: asset.model,
    serial_number: asset.serialNumber,
    service_interval: asset.serviceInterval,
    deployment_date: asset.deploymentDate,
    requires_logging: asset.requiresLogging,
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
  // Parse service field safely
  let service = undefined;
  if (dbSite.service) {
    try {
      service = typeof dbSite.service === 'string' ? JSON.parse(dbSite.service) : dbSite.service;
    } catch {
      service = dbSite.service;
    }
  }

  return {
    ...dbSite,
    id: String(dbSite.id), // Convert to string for frontend consistency
    createdAt: new Date(dbSite.created_at),
    updatedAt: new Date(dbSite.updated_at),
    service,
    clientName: dbSite.client_name,
    contactPerson: dbSite.contact_person,
  };
}

/**
 * Transform site data from frontend format to database format
 */
export function transformSiteToDB(site: any): any {
  return {
    id: site.id,
    name: site.name,
    location: site.location,
    description: site.description,
    client_name: site.clientName,
    contact_person: site.contactPerson,
    phone: site.phone,
    service: site.service ? JSON.stringify(site.service) : null,
    status: site.status,
  };
}

/**
 * Transform employee data from database format to frontend format
 */
export function transformEmployeeFromDB(dbEmployee: any): any {
  return {
    ...dbEmployee,
    id: String(dbEmployee.id), // Convert to string for frontend consistency
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
    id: employee.id,
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

/**
 * Transform activity data from frontend format to database format
 */
export function transformActivityToDB(activity: any): any {
  return {
    id: activity.id || crypto.randomUUID(), // Generate UUID if not provided
    user_id: activity.userId,
    user_name: activity.userName || 'System',
    action: activity.action,
    entity: activity.entity,
    entity_id: activity.entityId,
    details: activity.details,
    timestamp: activity.timestamp instanceof Date ? activity.timestamp.toISOString() : (activity.timestamp || new Date().toISOString()),
  };
}

/**
 * Transform activity data from database format to frontend format
 */
export function transformActivityFromDB(dbActivity: any): any {
  return {
    ...dbActivity,
    userId: dbActivity.user_id,
    userName: dbActivity.user_name,
    entityId: dbActivity.entity_id,
    timestamp: new Date(dbActivity.timestamp),
  };
}

/**
 * Transform quick checkout from frontend format to database format
 * Matches Supabase quick_checkouts table schema:
 * asset_id, employee_id, quantity, checkout_date, expected_return_days, returned_quantity, status
 */
export function transformQuickCheckoutToDB(checkout: any): any {
  return {
    id: checkout.id,
    asset_id: parseInt(checkout.assetId) || checkout.asset_id,
    employee_id: checkout.employeeId ? parseInt(checkout.employeeId) : (checkout.employee_id ? parseInt(checkout.employee_id) : null),
    quantity: checkout.quantity,
    returned_quantity: checkout.returnedQuantity || 0,
    checkout_date: checkout.checkoutDate instanceof Date ? checkout.checkoutDate.toISOString() : checkout.checkoutDate,
    expected_return_days: checkout.expectedReturnDays || 0,
    status: checkout.status || 'outstanding',
  };
}

/**
 * Transform quick checkout from database format to frontend format
 * Enriches data with asset/employee names from joins
 */
export function transformQuickCheckoutFromDB(dbCheckout: any, assets?: any[], employees?: any[]): any {
  // Find asset name from assets array if provided
  const asset = assets?.find(a => String(a.id) === String(dbCheckout.asset_id));
  const employee = employees?.find(e => String(e.id) === String(dbCheckout.employee_id));

  return {
    id: String(dbCheckout.id),
    assetId: String(dbCheckout.asset_id),
    assetName: asset?.name || `Asset #${dbCheckout.asset_id}`,
    employeeId: dbCheckout.employee_id ? String(dbCheckout.employee_id) : undefined,
    employee: employee?.name || (dbCheckout.employee_id ? `Employee #${dbCheckout.employee_id}` : 'Unknown'),
    quantity: dbCheckout.quantity,
    returnedQuantity: dbCheckout.returned_quantity || 0,
    checkoutDate: new Date(dbCheckout.checkout_date),
    expectedReturnDays: dbCheckout.expected_return_days,
    status: dbCheckout.status || 'outstanding',
    createdAt: dbCheckout.created_at ? new Date(dbCheckout.created_at) : new Date(),
    updatedAt: dbCheckout.updated_at ? new Date(dbCheckout.updated_at) : new Date(),
  };
}

/**
 * Transform site transaction from frontend format to database format
 */
export function transformSiteTransactionToDB(transaction: any): any {
  return {
    id: transaction.id || crypto.randomUUID(), // Generate UUID if not provided
    site_id: parseInt(transaction.siteId) || transaction.site_id,
    asset_id: parseInt(transaction.assetId) || transaction.asset_id,
    asset_name: transaction.assetName || transaction.asset_name,
    quantity: transaction.quantity,
    type: transaction.type,
    transaction_type: transaction.transactionType || transaction.transaction_type,
    reference_id: transaction.referenceId || transaction.reference_id,
    reference_type: transaction.referenceType || transaction.reference_type,
    condition: transaction.condition,
    notes: transaction.notes,
    created_at: transaction.createdAt instanceof Date ? transaction.createdAt.toISOString() : (transaction.createdAt || new Date().toISOString()),
    created_by: transaction.createdBy || transaction.created_by,
  };
}

/**
 * Transform site transaction from database format to frontend format
 */
export function transformSiteTransactionFromDB(dbTransaction: any): any {
  return {
    ...dbTransaction,
    siteId: String(dbTransaction.site_id),
    assetId: String(dbTransaction.asset_id),
    assetName: dbTransaction.asset_name,
    transactionType: dbTransaction.transaction_type,
    referenceId: dbTransaction.reference_id,
    referenceType: dbTransaction.reference_type,
    createdAt: new Date(dbTransaction.created_at),
    createdBy: dbTransaction.created_by,
  };
}

/**
 * Transform vehicle from frontend format to database format
 */
export function transformVehicleToDB(vehicle: any): any {
  return {
    id: vehicle.id,
    name: vehicle.name,
    type: vehicle.type,
    registration_number: vehicle.registrationNumber || vehicle.registration_number,
    status: vehicle.status,
  };
}

/**
 * Transform vehicle from database format to frontend format
 */
export function transformVehicleFromDB(dbVehicle: any): any {
  return {
    ...dbVehicle,
    id: String(dbVehicle.id), // Convert to string for frontend consistency
    registrationNumber: dbVehicle.registration_number,
    createdAt: dbVehicle.created_at ? new Date(dbVehicle.created_at) : new Date(),
    updatedAt: dbVehicle.updated_at ? new Date(dbVehicle.updated_at) : new Date(),
  };
}
/**
 * Transform consumable log from database format to frontend format
 */
export function transformConsumableLogFromDB(dbLog: any): any {
  return {
    ...dbLog,
    id: String(dbLog.id), // Ensure ID is string
    consumableId: String(dbLog.consumable_id), // Always string
    consumableName: dbLog.consumable_name,
    siteId: String(dbLog.site_id), // Always string
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
export function transformConsumableLogToDB(log: any): any {
  return {
    id: log.id,
    consumable_id: log.consumableId,
    consumable_name: log.consumableName,
    site_id: log.siteId,
    date: log.date instanceof Date ? log.date.toISOString() : log.date,
    quantity_used: log.quantityUsed,
    quantity_remaining: log.quantityRemaining,
    unit: log.unit,
    used_for: log.usedFor,
    used_by: log.usedBy,
    notes: log.notes,
    created_at: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    updated_at: log.updatedAt instanceof Date ? log.updatedAt.toISOString() : log.updatedAt,
  };
}

/**
 * Transform maintenance log from database format to frontend format
 */
export function transformMaintenanceLogFromDB(dbLog: any): any {
  return {
    ...dbLog,
    id: String(dbLog.id),
    assetId: String(dbLog.machine_id),
    machineId: String(dbLog.machine_id),
    maintenanceType: dbLog.maintenance_type,
    reason: dbLog.reason,
    dateStarted: new Date(dbLog.date_started),
    dateCompleted: dbLog.date_completed ? new Date(dbLog.date_completed) : undefined,
    machineActiveAtTime: Boolean(dbLog.machine_active_at_time),
    downtime: dbLog.downtime,
    workDone: dbLog.work_done,
    partsReplaced: dbLog.parts_replaced,
    technician: dbLog.technician,
    cost: dbLog.cost,
    location: dbLog.location,
    remarks: dbLog.remarks,
    serviceReset: Boolean(dbLog.service_reset),
    nextServiceDue: dbLog.next_service_due ? new Date(dbLog.next_service_due) : undefined,
    createdAt: new Date(dbLog.created_at),
    updatedAt: new Date(dbLog.updated_at),
  };
}

/**
 * Transform maintenance log from frontend format to database format
 */
export function transformMaintenanceLogToDB(log: any): any {
  const assetId = log.machineId || log.assetId;
  return {
    id: log.id,
    machine_id: assetId,
    maintenance_type: log.maintenanceType,
    reason: log.reason,
    date_started: log.dateStarted instanceof Date ? log.dateStarted.toISOString() : log.dateStarted,
    date_completed: log.dateCompleted ? (log.dateCompleted instanceof Date ? log.dateCompleted.toISOString() : log.dateCompleted) : null,
    machine_active_at_time: log.machineActiveAtTime,
    downtime: log.downtime,
    work_done: log.workDone,
    parts_replaced: log.partsReplaced,
    technician: log.technician,
    cost: log.cost,
    location: log.location,
    remarks: log.remarks,
    service_reset: log.serviceReset,
    next_service_due: log.nextServiceDue ? (log.nextServiceDue instanceof Date ? log.nextServiceDue.toISOString() : log.nextServiceDue) : null,
    created_at: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    updated_at: log.updatedAt instanceof Date ? log.updatedAt.toISOString() : log.updatedAt,
  };
}
