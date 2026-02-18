import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Asset, CompanySettings } from "@/types/asset";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { handleMobileExcelAction } from '@/utils/mobilePdfUtils';
import { useIsMobile } from "@/hooks/use-mobile";
interface InventoryReportProps {
  assets: Asset[];
  companySettings?: CompanySettings;
}

const defaultCompanySettings: CompanySettings = {
  companyName: "Dewatering Construction Etc Limited",
  logo: "/logo.png",
  address: "7 Musiliu Smith St, formerly Panti Street, Adekunle, Lagos 101212, Lagos",
  phone: "+2349030002182",
  email: "info@dewaterconstruct.com",
  website: "https://dewaterconstruct.com/",
  currency: "NGN",
  dateFormat: "MM/dd/yyyy",
  theme: "light",
  notifications: {
    email: true,
    push: true,
  },
};


// Exporting for external usage
export const exportAssetsToPDF = async (
  assets: Asset[],
  companySettings: CompanySettings = defaultCompanySettings,
  title: string = "Inventory Report"
) => {
  // Merge provided companySettings with defaults
  const effectiveCompanySettings: CompanySettings = {
    ...defaultCompanySettings,
    ...(companySettings ? Object.fromEntries(
      Object.entries(companySettings).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ) : {})
  };

  // Calculate summary statistics
  const totalAssets = assets.length;
  const totalQuantity = assets.reduce((sum, asset) => sum + asset.quantity, 0);
  const totalValue = assets.reduce((sum, asset) => sum + (asset.cost * asset.quantity), 0);
  const activeAssets = assets.filter(a => a.status === 'active').length;
  const equipmentCount = assets.filter(a => a.type === 'equipment').length;
  const consumablesCount = assets.filter(a => a.type === 'consumable').length;

  // Transform data for unified generator
  const reportData = assets.map(asset => ({
    name: asset.name,
    quantity: asset.quantity,
    unit: asset.unitOfMeasurement,
    category: asset.category,
    type: asset.type,
    location: asset.location || '-'
  }));

  await generateUnifiedReport({
    title: 'Inventory Report',
    subtitle: title,
    reportType: 'INVENTORY',
    companySettings: effectiveCompanySettings,
    columns: [
      { header: 'Name', dataKey: 'name', width: 45 },
      { header: 'Qty', dataKey: 'quantity', width: 18 },
      { header: 'Unit', dataKey: 'unit', width: 18 },
      { header: 'Category', dataKey: 'category', width: 30 },
      { header: 'Type', dataKey: 'type', width: 30 },
      { header: 'Location', dataKey: 'location', width: 35 }
    ],
    data: reportData,
    summaryStats: [
      { label: 'Total Assets', value: totalAssets },
      { label: 'Total Quantity', value: totalQuantity },
      { label: 'Total Value', value: `NGN ${totalValue.toFixed(2)}` },
      { label: 'Active Assets', value: activeAssets },
      { label: 'Equipment Items', value: equipmentCount },
      { label: 'Consumables', value: consumablesCount }
    ]
  });
};

export const InventoryReport = ({ assets, companySettings }: InventoryReportProps) => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState("all");
  const [previewData, setPreviewData] = useState<{ assets: Asset[]; title: string } | null>(null);

  // Merge provided companySettings with defaults
  const effectiveCompanySettings: CompanySettings = {
    ...defaultCompanySettings,
    ...(companySettings ? Object.fromEntries(
      Object.entries(companySettings).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ) : {})
  };

  const generateReport = async (filteredAssets: Asset[], title: string) => {
    setLoading(true);
    await exportAssetsToPDF(filteredAssets, effectiveCompanySettings, title);
    setLoading(false);
  };

  const exportToExcel = async (filteredAssets: Asset[], title: string) => {
    // Export in the same format as the bulk import template
    const excelData = [
      ['Name', 'Description', 'Quantity', 'Unit of Measurement', 'Category', 'Type', 'Location', 'Service', 'Status', 'Condition', 'Cost'],
      ...filteredAssets.map(asset => [
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
    const filename = `${title.replace(/\s+/g, '_')}_${date}`;

    if (Capacitor.isNativePlatform()) {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      await handleMobileExcelAction(wbout, filename);
    } else {
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
  };

  const getFilter = (type: string) => {
    switch (type) {
      case "all": return () => true;
      case "low": return (asset: Asset) => asset.quantity > 0 && asset.quantity < 3;
      case "out": return (asset: Asset) => asset.quantity === 0;
      case "missing": return (asset: Asset) => (asset.missingCount || 0) > 0;
      case "damaged": return (asset: Asset) => (asset.damagedCount || 0) > 0;
      default: return () => true;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case "all": return "All Assets";
      case "low": return "Low Stock Assets";
      case "out": return "Out of Stock Assets";
      case "missing": return "Missing Assets";
      case "damaged": return "Damaged Assets";
      default: return "Assets Report";
    }
  };
  const isMobile = useIsMobile();

  return (
    <>
      <Button 
        variant="outline" 
        className="gap-2" 
        onClick={() => setIsDialogOpen(true)} 
        disabled={loading}
        size={isMobile ? "icon" : "default"}
        title="Export Report"
      >
        <FileText className="h-4 w-4" />
        {!isMobile && "Export Report"}
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Inventory Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="low">Low Stock Assets</SelectItem>
                <SelectItem value="out">Out of Stock Assets</SelectItem>
                <SelectItem value="missing">Missing Assets</SelectItem>
                <SelectItem value="damaged">Damaged Assets</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setPreviewData({ assets: assets.filter(getFilter(selectedReport)), title: getTitle(selectedReport) }); setIsDialogOpen(false); }} disabled={loading}>
              Generate Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewData?.title}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.assets.map((asset, index) => (
                    <TableRow key={index}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.quantity}</TableCell>
                      <TableCell>{asset.unitOfMeasurement}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{asset.type}</TableCell>
                      <TableCell>{asset.location || '-'}</TableCell>
                      <TableCell>{asset.description || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => { exportToExcel(previewData.assets, previewData.title); }}
                  disabled={loading}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Download Excel
                </Button>
                <Button onClick={() => { generateReport(previewData.assets, previewData.title); setPreviewData(null); }} disabled={loading}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
