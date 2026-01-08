import * as XLSX from 'xlsx';
import { Asset, CompanySettings } from '@/types/asset';
import { Machine, MaintenanceLog } from '@/types/maintenance';
import { generateUnifiedReport } from './unifiedReportGenerator';

export const exportAssetsToExcel = (assets: Asset[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(assets.map(asset => ({
        Name: asset.name,
        Category: asset.category,
        Type: asset.type,
        Quantity: asset.quantity,
        'Available Quantity': asset.availableQuantity,
        'Reserved Quantity': asset.reservedQuantity || 0,
        Location: asset.location,
        Status: asset.status,
        'Serial Number': asset.serialNumber || 'N/A',
        'Model': asset.model || 'N/A',
        'Cost': asset.cost || 0,
        'Purchase Date': asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assets");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportMaintenanceLogsToExcel = (logs: MaintenanceLog[], machines: Machine[], fileNamePrefix: string = "Maintenance_Logs") => {
    const data = logs.map(log => {
        const machine = machines.find(m => m.id === log.machineId);
        return {
            'Log ID': log.id,
            'Date Started': new Date(log.dateStarted).toLocaleDateString(),
            'Date Completed': log.dateCompleted ? new Date(log.dateCompleted).toLocaleDateString() : 'Pending',
            'Machine Name': machine ? machine.name : 'Unknown',
            'Machine Serial': machine ? machine.serialNumber : 'N/A',
            'Machine Model': machine ? machine.model : 'N/A',
            'Maintenance Type': log.maintenanceType,
            'Reason': log.reason,
            'Work Done': log.workDone || 'N/A',
            'Parts Replaced': log.partsReplaced || 'None',
            'Technician': log.technician,
            'Cost': log.cost || 0,
            'Location': log.location || 'N/A',
            'Downtime (Hours)': log.downtime || 0,
            'Next Service Due': log.nextServiceDue ? new Date(log.nextServiceDue).toLocaleDateString() : 'N/A',
            'Status': log.dateCompleted ? 'Completed' : 'In Progress',
            'Service Reset': log.serviceReset ? 'Yes' : 'No',
            'Remarks': log.remarks || '',
            'Created At': new Date(log.createdAt).toLocaleString(),
            'Updated At': new Date(log.updatedAt).toLocaleString()
        };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Maintenance Logs");
    XLSX.writeFile(workbook, `${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportMaintenanceLogsToPDF = async (logs: MaintenanceLog[], machines: Machine[], companySettings: CompanySettings) => {
    const data = logs.map(log => {
        const machine = machines.find(m => m.id === log.machineId);
        return {
            date: new Date(log.dateStarted).toLocaleDateString(),
            machine: machine ? `${machine.name} (${machine.serialNumber || '-'})` : 'Unknown',
            type: log.maintenanceType.toUpperCase(),
            details: log.reason || log.workDone || '-',
            technician: log.technician,
            cost: log.cost ? `NGN ${log.cost.toLocaleString()}` : '0',
            status: log.dateCompleted ? 'Completed' : 'In Progress'
        };
    });

    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const completedCount = logs.filter(l => l.dateCompleted).length;

    await generateUnifiedReport({
        title: 'Maintenance Logs Report',
        companySettings,
        columns: [
            { header: 'Date', dataKey: 'date', width: 20 },
            { header: 'Machine', dataKey: 'machine', width: 40 },
            { header: 'Type', dataKey: 'type', width: 25 },
            { header: 'Details', dataKey: 'details', width: 60 },
            { header: 'Technician', dataKey: 'technician', width: 25 },
            { header: 'Cost', dataKey: 'cost', width: 25 },
            { header: 'Status', dataKey: 'status', width: 20 }
        ],
        data: data,
        orientation: 'landscape',
        reportType: 'MAINTENANCE LOGS',
        summaryStats: [
            { label: 'Total Logs', value: logs.length },
            { label: 'Completed', value: completedCount },
            { label: 'Pending', value: logs.length - completedCount },
            { label: 'Total Maintenance Cost', value: `NGN ${totalCost.toLocaleString()}` }
        ]
    });
};
