// Machine Maintenance Types

export interface Machine {
    id: string;
    name: string;
    model?: string;
    serialNumber?: string;
    site?: string;
    deploymentDate: Date;
    status: 'active' | 'idle' | 'under-maintenance' | 'deployed' | 'maintenance' | 'retired' | 'standby' | 'missing';
    operatingPattern: string; // e.g., "24/7"
    serviceInterval: number; // in months
    responsibleSupervisor?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MaintenanceLog {
    id: string;
    machineId: string;
    maintenanceType: 'scheduled' | 'unscheduled' | 'emergency';
    reason: string;
    dateStarted: Date;
    dateCompleted?: Date;
    machineActiveAtTime: boolean;
    downtime?: number; // in hours
    workDone: string;
    partsReplaced?: string;
    technician: string;
    cost?: number;
    location?: string;
    remarks?: string;
    serviceReset: boolean; // Whether this maintenance resets the service cycle
    nextServiceDue?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ServiceSchedule {
    machineId: string;
    machineName: string;
    lastMaintenanceDate?: Date;
    lastMaintenanceType?: string;
    isActive: boolean;
    expectedServiceDate?: Date;
    daysRemaining?: number;
    serviceStatus: 'ok' | 'due-soon' | 'overdue';
}

export interface MaintenanceDashboard {
    totalMachines: number;
    activeMachines: number;
    machinesDueSoon: number; // Due in next 14 days
    overdueMachines: number;
    totalDowntimeThisMonth: number;
    unscheduledMaintenanceCount: number;
    maintenanceCostThisMonth: number;
}
