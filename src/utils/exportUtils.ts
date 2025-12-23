import { Asset } from "@/types/asset";
import * as XLSX from 'xlsx';

export const exportAssetsToExcel = (assets: Asset[], filenamePrefix: string = "Assets_Export") => {
    if (!assets || assets.length === 0) return;

    // Export in the same format as the bulk import template
    const excelData = [
        ['Name', 'Description', 'Quantity', 'Unit of Measurement', 'Category', 'Type', 'Location', 'Service', 'Status', 'Condition', 'Cost'],
        ...assets.map(asset => [
            asset.name,
            asset.description || '',
            asset.quantity,
            asset.unitOfMeasurement,
            asset.category,
            asset.type,
            asset.location || '',
            asset.service || '',
            asset.status || 'active',
            asset.condition || 'good',
            asset.cost || 0
        ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assets');

    // Generate filename with date
    const date = new Date().toISOString().split('T')[0];
    const filename = `${filenamePrefix}_${date}.xlsx`;

    XLSX.writeFile(wb, filename);
};
