import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Asset } from '@/types/asset';
import { CompanySettings } from '@/types/asset';
import { logger } from '@/lib/logger';
import { Capacitor } from '@capacitor/core';
import { handleMobileExcelAction } from './mobilePdfUtils';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export interface ReportConfig {
  title: string;
  assets: Asset[];
  companySettings: CompanySettings;
  reportType: 'all' | 'low-stock' | 'damaged' | 'missing';
}

import { generateUnifiedReport } from './unifiedReportGenerator';

export const generatePDFReport = async (config: ReportConfig): Promise<void> => {
  const { title, assets, companySettings, reportType } = config;

  // Filter assets based on report type
  let filteredAssets = assets;
  switch (reportType) {
    case 'low-stock':
      filteredAssets = assets.filter(asset => asset.quantity < 10);
      break;
    case 'damaged':
      filteredAssets = assets.filter(asset => asset.status === 'damaged');
      break;
    case 'missing':
      filteredAssets = assets.filter(asset => asset.status === 'missing');
      break;
    default:
      filteredAssets = assets;
  }

  // Calculate summary statistics
  const totalAssets = filteredAssets.length;
  const totalValue = filteredAssets.reduce((sum, asset) => sum + (asset.cost || 0), 0);
  const activeAssets = filteredAssets.filter(asset => asset.status === 'active').length;
  const damagedAssets = filteredAssets.filter(asset => asset.status === 'damaged').length;
  const missingAssets = filteredAssets.filter(asset => asset.status === 'missing').length;
  const lowStockAssets = filteredAssets.filter(asset => asset.quantity < 10).length;

  // Transform data for unified generator
  const reportData = filteredAssets.map(asset => ({
    name: asset.name,
    description: asset.description || '-',
    quantity: asset.quantity,
    unit: asset.unitOfMeasurement,
    category: asset.category,
    type: asset.type,
    location: asset.location || '-',
    service: asset.service || '-',
    status: asset.status,
    condition: asset.condition || '-',
    cost: asset.cost ? `NGN ${asset.cost.toFixed(2)}` : '-'
  }));

  await generateUnifiedReport({
    title,
    subtitle: `Report Type: ${reportType.toUpperCase().replace('-', ' ')}`,
    reportType: 'ASSET INVENTORY',
    companySettings,
    orientation: 'landscape',
    columns: [
      { header: 'Name', dataKey: 'name', width: 25 },
      { header: 'Description', dataKey: 'description', width: 30 },
      { header: 'Qty', dataKey: 'quantity', width: 15 },
      { header: 'Unit', dataKey: 'unit', width: 15 },
      { header: 'Category', dataKey: 'category', width: 20 },
      { header: 'Type', dataKey: 'type', width: 20 },
      { header: 'Location', dataKey: 'location', width: 20 },
      { header: 'Service', dataKey: 'service', width: 20 },
      { header: 'Status', dataKey: 'status', width: 18 },
      { header: 'Condition', dataKey: 'condition', width: 18 },
      { header: 'Cost', dataKey: 'cost', width: 20 }
    ],
    data: reportData,
    summaryStats: [
      { label: 'Total Assets', value: totalAssets },
      { label: 'Total Value', value: `NGN ${totalValue.toFixed(2)}` },
      { label: 'Active Assets', value: activeAssets },
      { label: 'Damaged Assets', value: damagedAssets },
      { label: 'Missing Assets', value: missingAssets },
      { label: 'Low Stock Items', value: lowStockAssets }
    ]
  });
};

export const exportAssetsToExcel = async (assets: Asset[], filename: string) => {
  const ws_data = [
    ['Name', 'Description', 'Quantity', 'Unit', 'Category', 'Type', 'Location', 'Service', 'Status', 'Condition', 'Cost', 'Updated'],
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
      asset.cost || 0,
      asset.updatedAt instanceof Date ? asset.updatedAt.toLocaleDateString() : new Date(asset.updatedAt).toLocaleDateString()
    ])
  ];

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assets');

  if (Capacitor.isNativePlatform()) {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    await handleMobileExcelAction(wbout, filename);
  } else {
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }
};