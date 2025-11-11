import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Asset, CompanySettings } from "@/types/asset";
import { FileText, Download } from "lucide-react";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";

interface InventoryReportProps {
  assets: Asset[];
  companySettings?: CompanySettings;
}

const defaultCompanySettings: CompanySettings = {
  companyName: "Dewatering Construction Etc Limited",
  logo: "/logo.png",
  address: "7 Musiliu Smith St, formerly Panti Street, Adekunle, Lagos 101212, Lagos",
  phone: "+2349030002182",
  email: "",
  website: "https://dewaterconstruct.com/",
  currency: "USD",
  dateFormat: "MM/dd/yyyy",
  theme: "light",
  notifications: {
    email: true,
    push: true,
  },
};

export const InventoryReport = ({ assets, companySettings }: InventoryReportProps) => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState("all");
  const [previewData, setPreviewData] = useState<{ assets: Asset[]; title: string } | null>(null);

  // Use provided companySettings or default to company information
  const effectiveCompanySettings = companySettings || defaultCompanySettings;

  const generateReport = (filteredAssets: Asset[], title: string) => {
    setLoading(true);

    // Calculate summary statistics
    const totalAssets = filteredAssets.length;
    const totalQuantity = filteredAssets.reduce((sum, asset) => sum + asset.quantity, 0);
    const totalValue = filteredAssets.reduce((sum, asset) => sum + (asset.cost * asset.quantity), 0);
    const activeAssets = filteredAssets.filter(a => a.status === 'active').length;
    const equipmentCount = filteredAssets.filter(a => a.type === 'equipment').length;
    const consumablesCount = filteredAssets.filter(a => a.type === 'consumable').length;

    // Transform data for unified generator
    const reportData = filteredAssets.map(asset => ({
      name: asset.name,
      quantity: asset.quantity,
      unit: asset.unitOfMeasurement,
      category: asset.category,
      type: asset.type,
      location: asset.location || '-',
      description: asset.description || '-'
    }));

    generateUnifiedReport({
      title: 'Inventory Report',
      subtitle: title,
      reportType: 'INVENTORY',
      companySettings: effectiveCompanySettings,
      orientation: 'landscape',
      columns: [
        { header: 'Name', dataKey: 'name', width: 40 },
        { header: 'Quantity', dataKey: 'quantity', width: 20 },
        { header: 'Unit', dataKey: 'unit', width: 20 },
        { header: 'Category', dataKey: 'category', width: 25 },
        { header: 'Type', dataKey: 'type', width: 25 },
        { header: 'Location', dataKey: 'location', width: 30 },
        { header: 'Description', dataKey: 'description', width: 50 }
      ],
      data: reportData,
      summaryStats: [
        { label: 'Total Assets', value: totalAssets },
        { label: 'Total Quantity', value: totalQuantity },
        { label: 'Total Value', value: `$${totalValue.toFixed(2)}` },
        { label: 'Active Assets', value: activeAssets },
        { label: 'Equipment Items', value: equipmentCount },
        { label: 'Consumables', value: consumablesCount }
      ]
    });

    setLoading(false);
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

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setIsDialogOpen(true)} disabled={loading}>
        <FileText className="h-4 w-4" />
        Export Report
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
              <div className="flex justify-end">
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
