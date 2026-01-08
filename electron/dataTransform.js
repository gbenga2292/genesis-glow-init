// Utility functions for transforming data between frontend and database formats

/**
 * Transform asset data from database format to frontend format
 */
export function transformAssetFromDB(dbAsset) {
  return {
    ...dbAsset,
    id: String(dbAsset.id), // Ensure ID is string
    siteId: dbAsset.site_id ? String(dbAsset.site_id) : undefined, // Ensure string
    unitOfMeasurement: dbAsset.unit_of_measurement || dbAsset.unitOfMeasurement || 'pcs',
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
    damagedCount: dbAsset.damaged_count || 0,
    missingCount: dbAsset.missing_count || 0,
    usedCount: dbAsset.used_count || 0,
    // Machine fields
    model: dbAsset.model,
    serialNumber: dbAsset.serial_number,
    serviceInterval: dbAsset.service_interval,
    deploymentDate: dbAsset.deployment_date ? new Date(dbAsset.deployment_date) : undefined,
  };
}

/**
 * Transform asset data from frontend format to database format
 */
export function transformAssetToDB(asset) {
  const data = {
    name: asset.name,
    description: asset.description,
    quantity: asset.quantity,
    unit_of_measurement: asset.unitOfMeasurement || asset.unit_of_measurement,
    category: asset.category,
    type: asset.type,
    location: asset.location,
    site_id: asset.siteId || asset.site_id,
    service: asset.service,
    status: asset.status,
    condition: asset.condition,
    missing_count: asset.missingCount || asset.missing_count,
    damaged_count: asset.damagedCount || asset.damaged_count,
    used_count: asset.usedCount || asset.used_count,
    low_stock_level: asset.lowStockLevel || asset.low_stock_level,
    critical_stock_level: asset.criticalStockLevel || asset.critical_stock_level,
    purchase_date: asset.purchaseDate || asset.purchase_date,
    cost: asset.cost,
    power_source: asset.powerSource || asset.power_source,
    fuel_capacity: asset.fuelCapacity || asset.fuel_capacity,
    fuel_consumption_rate: asset.fuelConsumptionRate || asset.fuel_consumption_rate,
    electricity_consumption: asset.electricityConsumption || asset.electricity_consumption,
    requires_logging: (asset.requiresLogging || asset.requires_logging) ? 1 : 0,
    reserved_quantity: asset.reservedQuantity || asset.reserved_quantity,
    available_quantity: asset.availableQuantity || asset.available_quantity,
    site_quantities: asset.siteQuantities ? JSON.stringify(asset.siteQuantities) : (typeof asset.site_quantities === 'string' ? asset.site_quantities : JSON.stringify(asset.site_quantities || {})),
    // Machine fields
    model: asset.model,
    serial_number: asset.serialNumber,
    service_interval: asset.serviceInterval,
    deployment_date: asset.deploymentDate instanceof Date ? asset.deploymentDate.toISOString() : asset.deploymentDate,
  };
  if (asset.id) data.id = asset.id;
  return data;
}

/**
 * Transform site data from database format to frontend format
 */
export function transformSiteFromDB(dbSite) {
  return {
    ...dbSite,
    id: String(dbSite.id), // Ensure ID is string
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
  const data = {
    name: site.name,
    location: site.location,
    description: site.description,
    client_name: site.clientName,
    contact_person: site.contactPerson,
    phone: site.phone,
    service: JSON.stringify(site.service || []),
    status: site.status,
  };
  if (site.id) data.id = site.id;
  return data;
}

/**
 * Transform employee data from database format to frontend format
 */
export function transformEmployeeFromDB(dbEmployee) {
  return {
    ...dbEmployee,
    id: String(dbEmployee.id), // Ensure ID is string
    createdAt: new Date(dbEmployee.created_at),
    updatedAt: new Date(dbEmployee.updated_at),
    delistedDate: dbEmployee.delisted_date ? new Date(dbEmployee.delisted_date) : undefined,
  };
}

/**
 * Transform activity data from frontend format to database format
 */
export function transformActivityToDB(activity) {
  return {
    id: activity.id,
    user_id: activity.userId, // Map userId to user_id (snake_case)
    userName: activity.userName,
    action: activity.action,
    entity: activity.entity,
    entityId: activity.entityId,
    details: activity.details,
    timestamp: activity.timestamp instanceof Date ? activity.timestamp.toISOString() : activity.timestamp,
  };
}

/**
 * Transform activity data from database format to frontend format
 */
export function transformActivityFromDB(dbActivity) {
  return {
    id: dbActivity.id,
    userId: dbActivity.user_id, // Map user_id to userId (camelCase)
    userName: dbActivity.userName,
    action: dbActivity.action,
    entity: dbActivity.entity,
    entityId: dbActivity.entityId,
    details: dbActivity.details,
    timestamp: new Date(dbActivity.timestamp),
  };
}

/**
 * Transform site transaction data from database format to frontend format
 */
export function transformSiteTransactionFromDB(dbTransaction) {
  return {
    id: String(dbTransaction.id), // Ensure ID is string
    siteId: String(dbTransaction.site_id), // Always string
    assetId: String(dbTransaction.asset_id), // Always string
    assetName: dbTransaction.asset_name,
    quantity: dbTransaction.quantity,
    type: dbTransaction.type,
    transactionType: dbTransaction.transaction_type,
    referenceId: String(dbTransaction.reference_id),
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
  const data = {
    site_id: transaction.siteId || transaction.site_id,
    asset_id: transaction.assetId || transaction.asset_id,
    asset_name: transaction.assetName || transaction.asset_name,
    quantity: transaction.quantity,
    type: transaction.type,
    transaction_type: transaction.transactionType || transaction.transaction_type,
    reference_id: transaction.referenceId || transaction.reference_id,
    reference_type: transaction.referenceType || transaction.reference_type,
    condition: transaction.condition,
    notes: transaction.notes,
    created_by: transaction.createdBy || transaction.created_by,
  };
  if (transaction.id) data.id = transaction.id;
  return data;
}

/**
 * Transform employee data from frontend format to database format
 */
export function transformEmployeeToDB(employee) {
  const data = {
    name: employee.name,
    role: employee.role,
    phone: employee.phone,
    email: employee.email,
    status: employee.status,
    delisted_date: employee.delistedDate,
  };
  if (employee.id) data.id = employee.id;
  return data;
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
    // Parse stored AI config JSON if present
    ai: (function () {
      if (!dbSettings || !dbSettings.ai_config) return undefined;
      try {
        return JSON.parse(dbSettings.ai_config);
      } catch (e) {
        console.warn('Failed to parse ai_config from DB', e);
        return undefined;
      }
    })(),
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
    // Persist AI config as JSON string (store null/empty as null)
    ai_config: settings.ai ? JSON.stringify(settings.ai) : null,
  };
}

/**
 * Transform equipment log from database format to frontend format
 */
export function transformEquipmentLogFromDB(dbLog) {
  return {
    id: String(dbLog.id), // Ensure ID is string
    equipmentId: String(dbLog.equipment_id), // Always string
    equipmentName: dbLog.equipment_name,
    siteId: String(dbLog.site_id), // Always string
    date: new Date(dbLog.date),
    active: Boolean(dbLog.active),
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
    id: log.id,
    equipment_id: log.equipmentId,
    equipment_name: log.equipmentName,
    site_id: log.siteId,
    date: log.date instanceof Date ? log.date.toISOString() : log.date,
    active: log.active,
    downtime_entries: JSON.stringify(log.downtimeEntries || []),
    maintenance_details: log.maintenanceDetails,
    diesel_entered: log.dieselEntered,
    supervisor_on_site: log.supervisorOnSite,
    client_feedback: log.clientFeedback,
    issues_on_site: log.issuesOnSite,
    created_at: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    updated_at: log.updatedAt instanceof Date ? log.updatedAt.toISOString() : log.updatedAt,
  };
}

/**
 * Transform waybill data from database format to frontend format
 */
export function transformWaybillFromDB(dbWaybill) {
  return {
    ...dbWaybill,
    id: String(dbWaybill.id), // Ensure ID is string
    siteId: dbWaybill.siteId ? String(dbWaybill.siteId) : undefined,
    returnToSiteId: dbWaybill.returnToSiteId ? String(dbWaybill.returnToSiteId) : undefined,
    items: dbWaybill.items ? JSON.parse(dbWaybill.items) : [],
    // Convert snake_case date fields to camelCase
    issueDate: dbWaybill.issue_date || dbWaybill.issueDate,
    expectedReturnDate: dbWaybill.expected_return_date || dbWaybill.expectedReturnDate,
    sentToSiteDate: dbWaybill.sent_to_site_date || dbWaybill.sentToSiteDate,
    createdAt: dbWaybill.created_at || dbWaybill.createdAt,
    updatedAt: dbWaybill.updated_at || dbWaybill.updatedAt,
  };
}

/**
 * Transform waybill data from frontend format to database format
 */
export function transformWaybillToDB(waybill) {
  const data = {
    ...waybill,
    items: JSON.stringify(waybill.items || []),
  };
  if (waybill.id) data.id = waybill.id;
  return data;
}

/**
 * Transform consumable log from database format to frontend format
 */
export function transformConsumableLogFromDB(dbLog) {
  return {
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
export function transformConsumableLogToDB(log) {
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
 * Transform quick checkout data from database format to frontend format
 */
export function transformQuickCheckoutFromDB(dbCheckout) {
  return {
    id: String(dbCheckout.id),
    assetId: String(dbCheckout.asset_id),
    assetName: dbCheckout.asset_name,
    employee: dbCheckout.employee_name || (dbCheckout.employee_id ? String(dbCheckout.employee_id) : dbCheckout.employee), // Use joined name, fallback to ID/legacy column
    quantity: dbCheckout.quantity,
    checkoutDate: new Date(dbCheckout.checkout_date),
    expectedReturnDays: dbCheckout.expected_return_days,
    status: dbCheckout.status,
    returnedQuantity: dbCheckout.returned_quantity || 0,
    createdAt: new Date(dbCheckout.created_at),
    updatedAt: new Date(dbCheckout.updated_at),
  };
}

/**
 * Transform quick checkout data from frontend format to database format
 */
export function transformQuickCheckoutToDB(checkout) {
  // Ensure strict mapping to DB schema (snake_case)
  // quick_checkouts table columns: id, asset_id, employee_id, quantity, checkout_date, expected_return_days, status, returned_quantity, created_at, updated_at

  const dbData = {
    asset_id: checkout.assetId, // Use as-is (number or string)
    // employee_id: is handled in database.js by looking up name if needed
    quantity: parseInt(checkout.quantity, 10),
    checkout_date: checkout.checkoutDate instanceof Date ? checkout.checkoutDate.toISOString() : checkout.checkoutDate,
    expected_return_days: parseInt(checkout.expectedReturnDays, 10),
    status: checkout.status || 'outstanding',
    returned_quantity: checkout.returnedQuantity ? parseInt(checkout.returnedQuantity, 10) : 0,
    created_at: checkout.createdAt instanceof Date ? checkout.createdAt.toISOString() : checkout.createdAt,
    updated_at: checkout.updatedAt instanceof Date ? checkout.updatedAt.toISOString() : checkout.updatedAt,
  };

  // Remove undefined values to let DB defaults handle them if valid
  Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);

  if (checkout.id) dbData.id = checkout.id;

  return dbData;
}

/**
 * Transform maintenance log from database format to frontend format
 */
export function transformMaintenanceLogFromDB(dbLog) {
  return {
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
export function transformMaintenanceLogToDB(log) {
  const assetId = log.machineId || log.assetId;
  return {
    id: log.id,
    machine_id: assetId,
    maintenance_type: log.maintenanceType,
    reason: log.reason,
    date_started: log.dateStarted instanceof Date ? log.dateStarted.toISOString() : log.dateStarted,
    date_completed: log.dateCompleted ? (log.dateCompleted instanceof Date ? log.dateCompleted.toISOString() : log.dateCompleted) : null,
    machine_active_at_time: log.machineActiveAtTime ? 1 : 0,
    downtime: log.downtime,
    work_done: log.workDone,
    parts_replaced: log.partsReplaced,
    technician: log.technician,
    cost: log.cost,
    location: log.location,
    remarks: log.remarks,
    service_reset: log.serviceReset ? 1 : 0,
    next_service_due: log.nextServiceDue ? (log.nextServiceDue instanceof Date ? log.nextServiceDue.toISOString() : log.nextServiceDue) : null,
    created_at: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
    updated_at: log.updatedAt instanceof Date ? log.updatedAt.toISOString() : log.updatedAt,
  };
}
