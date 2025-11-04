import * as XLSX from 'xlsx';
import { Asset } from '@/types/asset';

export interface ExcelAssetData {
  name: string;
  description?: string;
  quantity: number;
  unitOfMeasurement: string;
  category: 'dewatering' | 'waterproofing';
  type: 'consumable' | 'non-consumable' | 'tools' | 'equipment';
  location?: string;
  service?: string;
  status?: 'active' | 'damaged' | 'missing' | 'maintenance';
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  cost?: number;
}

export const parseExcelFile = (file: File): Promise<ExcelAssetData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel file must have at least a header row and one data row'));
          return;
        }
        
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1) as any[][];
        
        // Map headers to expected fields
        const headerMap: { [key: string]: keyof ExcelAssetData } = {
          'name': 'name',
          'asset name': 'name',
          'description': 'description',
          'quantity': 'quantity',
          'qty': 'quantity',
          'unit': 'unitOfMeasurement',
          'unit of measurement': 'unitOfMeasurement',
          'uom': 'unitOfMeasurement',
          'category': 'category',
          'type': 'type',
          'location': 'location',
          'service': 'service',
          'status': 'status',
          'condition': 'condition',
          'cost': 'cost',
          'price': 'cost'
        };
        
        const assets: ExcelAssetData[] = [];
        
        rows.forEach((row, index) => {
          if (row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
            const asset: Partial<ExcelAssetData> = {};
            
            headers.forEach((header, colIndex) => {
              const normalizedHeader = header.toLowerCase().trim();
              const fieldName = headerMap[normalizedHeader];
              
              if (fieldName && row[colIndex] !== null && row[colIndex] !== undefined && row[colIndex] !== '') {
                const value = row[colIndex];
                
                switch (fieldName) {
                  case 'quantity':
                  case 'cost':
                    asset[fieldName] = parseFloat(value) || 0;
                    break;
                  case 'category':
                    if (['dewatering', 'waterproofing'].includes(value.toLowerCase())) {
                      asset[fieldName] = value.toLowerCase() as 'dewatering' | 'waterproofing';
                    }
                    break;
                  case 'type':
                    if (['consumable', 'non-consumable', 'tools', 'equipment'].includes(value.toLowerCase())) {
                      asset[fieldName] = value.toLowerCase() as 'consumable' | 'non-consumable' | 'tools' | 'equipment';
                    }
                    break;
                  case 'status':
                    if (['active', 'damaged', 'missing', 'maintenance'].includes(value.toLowerCase())) {
                      asset[fieldName] = value.toLowerCase() as 'active' | 'damaged' | 'missing' | 'maintenance';
                    }
                    break;
                  case 'condition':
                    if (['excellent', 'good', 'fair', 'poor'].includes(value.toLowerCase())) {
                      asset[fieldName] = value.toLowerCase() as 'excellent' | 'good' | 'fair' | 'poor';
                    }
                    break;
                  default:
                    asset[fieldName] = String(value).trim();
                }
              }
            });
            
            // Validate required fields
            if (asset.name && asset.quantity !== undefined) {
              assets.push({
                name: asset.name,
                description: asset.description || '',
                quantity: asset.quantity,
                unitOfMeasurement: asset.unitOfMeasurement || 'pcs',
                category: asset.category || 'dewatering',
                type: asset.type || 'equipment',
                location: asset.location || '',
                service: asset.service || '',
                status: asset.status || 'active',
                condition: asset.condition || 'good',
                cost: asset.cost || 0
              });
            }
          }
        });
        
        resolve(assets);
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const getExcelTemplate = () => {
  const template = [
    ['Name', 'Description', 'Quantity', 'Unit of Measurement', 'Category', 'Type', 'Location', 'Service', 'Status', 'Condition', 'Cost'],
    ['Industrial Water Pump', 'High-capacity centrifugal pump', 3, 'pcs', 'dewatering', 'equipment', 'Warehouse A', 'Pumping', 'active', 'good', 1500],
    ['Waterproof Membrane', 'Heavy-duty waterproofing sheets', 150, 'rolls', 'waterproofing', 'consumable', 'Storage B', 'Sealing', 'active', 'excellent', 25],
    ['Safety Helmets', 'Construction safety helmets', 20, 'pcs', 'dewatering', 'tools', 'Safety Storage', 'Safety', 'active', 'good', 30]
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Assets Template');
  
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
};