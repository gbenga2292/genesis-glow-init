import { EquipmentLog, DowntimeEntry } from "@/types/equipment";

export interface DefaultLogTemplate {
  active: boolean;
  downtimeEntries: DowntimeEntry[];
  maintenanceDetails?: string;
  dieselEntered?: number;
  supervisorOnSite?: string;
  clientFeedback?: string;
  issuesOnSite?: string;
}

/**
 * Creates a default log template for equipment that is operational
 * with "site operational, machine active, no issues" values
 */
export const createDefaultOperationalLog = (
  supervisorName?: string,
  dieselEntered?: number
): DefaultLogTemplate => {
  return {
    active: true,
    downtimeEntries: [],
    maintenanceDetails: "Routine check completed - all systems operational",
    dieselEntered: dieselEntered, // Will be filled if needed (60L every 4 days)
    supervisorOnSite: supervisorName || undefined,
    clientFeedback: "Site operational and progressing as planned",
    issuesOnSite: "No issues on site"
  };
};

/**
 * Creates a default log template for equipment that is inactive
 */
export const createDefaultInactiveLog = (
  supervisorName?: string
): DefaultLogTemplate => {
  return {
    active: false,
    downtimeEntries: [],
    maintenanceDetails: "Equipment inactive - scheduled downtime",
    dieselEntered: undefined,
    supervisorOnSite: supervisorName || undefined,
    clientFeedback: "Equipment not in use today",
    issuesOnSite: "No issues on site"
  };
};

/**
 * Applies a default template to an existing equipment log
 */
export const applyDefaultTemplate = (
  existingLog: Partial<EquipmentLog>,
  template: DefaultLogTemplate
): EquipmentLog => {
  return {
    id: existingLog.id || Date.now().toString(),
    equipmentId: existingLog.equipmentId || "",
    equipmentName: existingLog.equipmentName || "",
    siteId: existingLog.siteId || "",
    date: existingLog.date || new Date(),
    active: template.active,
    downtimeEntries: template.downtimeEntries,
    maintenanceDetails: template.maintenanceDetails,
    dieselEntered: template.dieselEntered,
    supervisorOnSite: template.supervisorOnSite,
    clientFeedback: template.clientFeedback,
    issuesOnSite: template.issuesOnSite,
    createdAt: existingLog.createdAt || new Date(),
    updatedAt: new Date()
  };
};

/**
 * Checks if an equipment log matches the default operational template
 */
export const isDefaultOperationalLog = (log: EquipmentLog): boolean => {
  return (
    log.active === true &&
    log.downtimeEntries.length === 0 &&
    log.maintenanceDetails === "Routine check completed - all systems operational" &&
    log.clientFeedback === "Site operational and progressing as planned" &&
    log.issuesOnSite === "No issues on site"
  );
};

/**
 * Calculates if diesel refill is due (every 4 days) and returns the amount (60L)
 */
export const calculateDieselRefill = (equipmentLogs: EquipmentLog[], equipmentId: string): number | undefined => {
  const equipmentLogsForMachine = equipmentLogs
    .filter(log => log.equipmentId === equipmentId)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first

  if (equipmentLogsForMachine.length === 0) {
    return 60; // First log, assume refill needed
  }

  const lastRefillLog = equipmentLogsForMachine.find(log => log.dieselEntered && log.dieselEntered > 0);
  if (!lastRefillLog) {
    return 60; // No previous refill, assume needed
  }

  const daysSinceLastRefill = Math.floor((new Date().getTime() - lastRefillLog.date.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceLastRefill >= 4) {
    return 60; // Due for refill
  }

  return undefined; // Not due yet
};

/**
 * Calculates how many days overdue the diesel refill is
 */
export const getDieselOverdueDays = (equipmentLogs: EquipmentLog[], equipmentId: string): number => {
  const equipmentLogsForMachine = equipmentLogs
    .filter(log => log.equipmentId === equipmentId)
    .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first

  const lastRefillLog = equipmentLogsForMachine.find(log => log.dieselEntered && log.dieselEntered > 0);
  if (!lastRefillLog) {
    return 0; // No previous refill, not overdue
  }

  const daysSinceLastRefill = Math.floor((new Date().getTime() - lastRefillLog.date.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, daysSinceLastRefill - 4); // Overdue if more than 4 days
};
