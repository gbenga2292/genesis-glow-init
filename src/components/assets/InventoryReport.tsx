import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Asset, CompanySettings } from "@/types/asset";
import { FileText, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    const doc = new jsPDF();

    // Add company logo in top left corner using default company information
    if (defaultCompanySettings.logo) {
      try {
        doc.addImage(defaultCompanySettings.logo, 'PNG', 10, 10, 80, 25);
      } catch (e) {
        // Ignore logo errors
      }
    }

    // Company name and title positioned to the right of logo using default company information
    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text(defaultCompanySettings.companyName, 100, 20);
    doc.setFontSize(14);
    doc.text(title, 100, 30);

    const tableData = filteredAssets.map(asset => [
      asset.name,
      asset.quantity.toString(),
      asset.unitOfMeasurement,
      asset.category,
      asset.type,
      asset.location || "",
      asset.description || ""
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Name', 'Quantity', 'Unit', 'Category', 'Type', 'Location', 'Description']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [43, 101, 236] }
    });

    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
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
