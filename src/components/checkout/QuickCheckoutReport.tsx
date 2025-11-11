import { useState } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickCheckout, CompanySettings } from "@/types/asset";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";
import * as XLSX from 'xlsx';

interface QuickCheckoutReportProps {
  quickCheckouts: QuickCheckout[];
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


export const QuickCheckoutReport = ({ quickCheckouts, companySettings }: QuickCheckoutReportProps) => {
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState("all");
  const [previewData, setPreviewData] = useState<{ checkouts: QuickCheckout[]; title: string } | null>(null);

  const generatePDFReport = (filteredCheckouts: QuickCheckout[], title: string) => {
    setLoading(true);

    const effectiveSettings = companySettings || defaultCompanySettings;

    // Calculate summary statistics
    const totalCheckouts = filteredCheckouts.length;
    const outstandingCheckouts = filteredCheckouts.filter(c => c.status === 'outstanding').length;
    const returnedCheckouts = filteredCheckouts.filter(c => c.status === 'return_completed').length;
    const totalItemsCheckedOut = filteredCheckouts.reduce((sum, c) => sum + c.quantity, 0);
    const totalItemsReturned = filteredCheckouts.reduce((sum, c) => sum + c.returnedQuantity, 0);

    // Transform data
    const reportData = filteredCheckouts.map(checkout => ({
      assetName: checkout.assetName,
      quantityOut: checkout.quantity,
      quantityReturned: checkout.returnedQuantity,
      employee: checkout.employee,
      checkoutDate: checkout.checkoutDate.toLocaleDateString(),
      returnDate: checkout.returnDate ? checkout.returnDate.toLocaleDateString() : 'Not returned',
      expectedDays: checkout.expectedReturnDays,
      status: checkout.status.replace('_', ' ').toUpperCase()
    }));

    generateUnifiedReport({
      title: 'Quick Checkout Report',
      subtitle: title,
      reportType: 'CHECKOUTS',
      companySettings: effectiveSettings,
      orientation: 'landscape',
      columns: [
        { header: 'Asset Name', dataKey: 'assetName', width: 50 },
        { header: 'Qty Out', dataKey: 'quantityOut', width: 20 },
        { header: 'Qty Returned', dataKey: 'quantityReturned', width: 25 },
        { header: 'Employee', dataKey: 'employee', width: 35 },
        { header: 'Checkout Date', dataKey: 'checkoutDate', width: 30 },
        { header: 'Return Date', dataKey: 'returnDate', width: 30 },
        { header: 'Expected Days', dataKey: 'expectedDays', width: 28 },
        { header: 'Status', dataKey: 'status', width: 30 }
      ],
      data: reportData,
      summaryStats: [
        { label: 'Total Checkouts', value: totalCheckouts },
        { label: 'Outstanding', value: outstandingCheckouts },
        { label: 'Returned', value: returnedCheckouts },
        { label: 'Total Items Out', value: totalItemsCheckedOut },
        { label: 'Total Items Returned', value: totalItemsReturned },
        { label: 'Outstanding Items', value: totalItemsCheckedOut - totalItemsReturned }
      ]
    });

    setLoading(false);
  };

  const generateExcelReport = (filteredCheckouts: QuickCheckout[], title: string) => {
    const ws_data = [
      ['Asset Name', 'Qty Checked Out', 'Qty Returned', 'Employee', 'Checkout Date', 'Return Date', 'Expected Days', 'Status'],
      ...filteredCheckouts.map(checkout => [
        checkout.assetName,
        checkout.quantity,
        checkout.returnedQuantity,
        checkout.employee,
        checkout.checkoutDate.toLocaleDateString(),
        checkout.returnDate ? checkout.returnDate.toLocaleDateString() : 'Not returned',
        checkout.expectedReturnDays,
        checkout.status.replace('_', ' ').toUpperCase()
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quick Checkouts');

    XLSX.writeFile(wb, `${title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
  };

  const getFilter = (type: string) => {
    switch (type) {
      case "all": return () => true;
      case "outstanding": return (checkout: QuickCheckout) => checkout.status === 'outstanding';
      case "returned": return (checkout: QuickCheckout) => checkout.status === 'return_completed';
      case "overdue": return (checkout: QuickCheckout) => {
        if (checkout.status !== 'outstanding') return false;
        const expectedReturnDate = new Date(checkout.checkoutDate);
        expectedReturnDate.setDate(expectedReturnDate.getDate() + checkout.expectedReturnDays);
        return new Date() > expectedReturnDate;
      };
      case "lost": return (checkout: QuickCheckout) => checkout.status === 'lost';
      case "damaged": return (checkout: QuickCheckout) => checkout.status === 'damaged';
      default: return () => true;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case "all": return "All Quick Checkouts";
      case "outstanding": return "Outstanding Checkouts";
      case "returned": return "Returned Checkouts";
      case "overdue": return "Overdue Checkouts";
      case "lost": return "Lost Items";
      case "damaged": return "Damaged Items";
      default: return "Quick Checkout Report";
    }
  };

  const getStatusBadge = (status: QuickCheckout['status']) => {
    switch (status) {
      case 'outstanding':
        return <Badge className="bg-gradient-warning text-warning-foreground">Outstanding</Badge>;
      case 'return_completed':
        return <Badge className="bg-gradient-success">Returned</Badge>;
      case 'lost':
        return <Badge variant="destructive">Lost</Badge>;
      case 'damaged':
        return <Badge className="bg-gradient-warning text-warning-foreground">Damaged</Badge>;
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
            <DialogTitle>Export Quick Checkout Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger>
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Checkouts</SelectItem>
                <SelectItem value="outstanding">Outstanding Checkouts</SelectItem>
                <SelectItem value="returned">Returned Checkouts</SelectItem>
                <SelectItem value="overdue">Overdue Checkouts</SelectItem>
                <SelectItem value="lost">Lost Items</SelectItem>
                <SelectItem value="damaged">Damaged Items</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => { setPreviewData({ checkouts: quickCheckouts.filter(getFilter(selectedReport)), title: getTitle(selectedReport) }); setIsDialogOpen(false); }} disabled={loading}>
              Generate Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewData?.title}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Qty Out</TableHead>
                    <TableHead>Qty Returned</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Checkout Date</TableHead>
                    <TableHead>Return Date</TableHead>
                    <TableHead>Expected Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.checkouts.map((checkout, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{checkout.assetName}</TableCell>
                      <TableCell>{checkout.quantity}</TableCell>
                      <TableCell>{checkout.returnedQuantity}</TableCell>
                      <TableCell>{checkout.employee}</TableCell>
                      <TableCell>{checkout.checkoutDate.toLocaleDateString()}</TableCell>
                      <TableCell>{checkout.returnDate ? checkout.returnDate.toLocaleDateString() : 'Not returned'}</TableCell>
                      <TableCell>{checkout.expectedReturnDays}</TableCell>
                      <TableCell>{getStatusBadge(checkout.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { generateExcelReport(previewData.checkouts, previewData.title); }} disabled={loading}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button onClick={() => { generatePDFReport(previewData.checkouts, previewData.title); setPreviewData(null); }} disabled={loading}>
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
