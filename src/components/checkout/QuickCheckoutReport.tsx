import { useState } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { QuickCheckout, CompanySettings } from "@/types/asset";
import { FileText, Download, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
    const doc = new jsPDF('landscape');

    // Add company logo in top left corner if available
    if (defaultCompanySettings.logo) {
      try {
        doc.addImage(defaultCompanySettings.logo, 'PNG', 10, 10, 80, 25);
      } catch (e) {
        logger.warn('Logo error in QuickCheckoutReport', { context: 'QuickCheckoutReport' });
        // Ignore logo errors
      }
    }

    // Company name and title positioned to the right of logo
    doc.setFont("times", "normal");
    doc.setFontSize(18);
    doc.text(defaultCompanySettings.companyName, 100, 20);
    doc.setFontSize(14);
    doc.text(title, 100, 30);

    // Add generation date
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 100, 40);

    const tableData = filteredCheckouts.map(checkout => [
      checkout.assetName,
      checkout.quantity.toString(),
      checkout.returnedQuantity.toString(),
      checkout.employee,
      checkout.checkoutDate.toLocaleDateString(),
      checkout.returnDate ? checkout.returnDate.toLocaleDateString() : 'Not returned',
      checkout.expectedReturnDays.toString(),
      checkout.status.replace('_', ' ').toUpperCase()
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Asset Name', 'Qty Checked Out', 'Qty Returned', 'Employee', 'Checkout Date', 'Return Date', 'Expected Days', 'Status']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [43, 101, 236] },
      columnStyles: {
        0: { cellWidth: 50 }, // Asset Name
        1: { cellWidth: 20 }, // Qty Checked Out
        2: { cellWidth: 20 }, // Qty Returned
        3: { cellWidth: 35 }, // Employee
        4: { cellWidth: 35 }, // Checkout Date
        5: { cellWidth: 35 }, // Return Date
        6: { cellWidth: 30 }, // Expected Days
        7: { cellWidth: 35 }  // Status
      }
    });

    // Add summary statistics
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary Statistics:', 20, finalY + 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const totalCheckouts = filteredCheckouts.length;
    const outstandingCheckouts = filteredCheckouts.filter(c => c.status === 'outstanding').length;
    const returnedCheckouts = filteredCheckouts.filter(c => c.status === 'return_completed').length;
    const lostCheckouts = filteredCheckouts.filter(c => c.status === 'lost').length;
    const damagedCheckouts = filteredCheckouts.filter(c => c.status === 'damaged').length;
    const totalItemsCheckedOut = filteredCheckouts.reduce((sum, c) => sum + c.quantity, 0);
    const totalItemsReturned = filteredCheckouts.reduce((sum, c) => sum + c.returnedQuantity, 0);

    const summaryY = finalY + 30;
    doc.text(`Total Checkouts: ${totalCheckouts}`, 20, summaryY);
    doc.text(`Outstanding: ${outstandingCheckouts}`, 20, summaryY + 8);
    doc.text(`Returned: ${returnedCheckouts}`, 20, summaryY + 16);
    doc.text(`Lost: ${lostCheckouts}`, 120, summaryY);
    doc.text(`Damaged: ${damagedCheckouts}`, 120, summaryY + 8);
    doc.text(`Total Items Out: ${totalItemsCheckedOut}`, 20, summaryY + 24);
    doc.text(`Total Items Returned: ${totalItemsReturned}`, 120, summaryY + 16);

    doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
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
