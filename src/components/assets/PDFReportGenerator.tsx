import { useState } from "react";
import { logger } from "@/lib/logger";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, CompanySettings } from "@/types/asset";
import { generatePDFReport, exportAssetsToExcel } from "@/utils/pdfGenerator";
import { FileText, Download, Loader2, FileSpreadsheet } from "lucide-react";

interface PDFReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  companySettings: CompanySettings;
}

export const PDFReportGenerator = ({ open, onClose, assets, companySettings }: PDFReportGeneratorProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    {
      id: 'all',
      title: 'Complete Inventory Report',
      description: 'All assets in the system with detailed information',
      count: assets.length,
      color: 'bg-gradient-primary'
    },
    {
      id: 'low-stock',
      title: 'Low Stock Items Report',
      description: 'Assets with quantity below 10 units',
      count: assets.filter(asset => asset.quantity < 10).length,
      color: 'bg-gradient-warning'
    },
    {
      id: 'damaged',
      title: 'Damaged Assets Report',
      description: 'Assets marked as damaged or in poor condition',
      count: assets.filter(asset => asset.status === 'damaged').length,
      color: 'bg-gradient-warning'
    },
    {
      id: 'missing',
      title: 'Missing Assets Report',
      description: 'Assets marked as missing or lost',
      count: assets.filter(asset => asset.status === 'missing').length,
      color: 'destructive'
    }
  ];

  const handleGenerateReport = async (reportType: string) => {
    setIsGenerating(true);

    try {
      const reportConfig = reportTypes.find(r => r.id === reportType);
      if (!reportConfig) return;

      await generatePDFReport({
        title: reportConfig.title,
        assets,
        companySettings,
        reportType: reportType as 'all' | 'low-stock' | 'damaged' | 'missing'
      });
    } catch (error) {
      logger.error('Failed to generate PDF report', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportExcel = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    exportAssetsToExcel(assets, `assets-export-${timestamp}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-strong">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Generate Reports</DialogTitle>
              <p className="text-muted-foreground mt-1">
                Export your asset data as PDF reports or Excel spreadsheets
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Excel Export */}
          <div className="bg-muted/30 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-success" />
                  Excel Export
                </h3>
                <p className="text-sm text-muted-foreground">
                  Export all asset data to Excel format for analysis and editing
                </p>
              </div>
              <Button onClick={handleExportExcel} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export to Excel
              </Button>
            </div>
          </div>

          {/* PDF Reports */}
          <div>
            <h3 className="font-semibold mb-4">PDF Reports</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportTypes.map((report) => (
                <Card key={report.id} className="border-0 shadow-soft hover:shadow-medium transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold leading-tight">
                          {report.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.description}
                        </p>
                      </div>
                      <Badge className={report.color} variant="default">
                        {report.count} items
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Button
                      onClick={() => handleGenerateReport(report.id)}
                      disabled={isGenerating || report.count === 0}
                      className="w-full gap-2"
                      variant={report.count === 0 ? "outline" : "default"}
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      {isGenerating ? 'Generating...' : 'Generate PDF'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Report Features */}
          <div className="bg-muted/30 p-6 rounded-lg">
            <h4 className="font-semibold mb-3">Report Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium mb-2">PDF Reports Include:</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Company logo and information</li>
                  <li>Detailed asset tables</li>
                  <li>Summary statistics</li>
                  <li>Professional formatting</li>
                  <li>Date and report type stamps</li>
                </ul>
              </div>

              <div>
                <h5 className="font-medium mb-2">Excel Export Contains:</h5>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>All asset data fields</li>
                  <li>Editable format</li>
                  <li>Sortable columns</li>
                  <li>Compatible with Excel/LibreOffice</li>
                  <li>Perfect for data analysis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">{assets.length}</div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </div>
            <div className="text-center p-4 bg-success/5 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {assets.filter(a => a.status === 'active').length}
              </div>
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-center p-4 bg-warning/5 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {assets.filter(a => a.quantity < 10).length}
              </div>
              <div className="text-sm text-muted-foreground">Low Stock</div>
            </div>
            <div className="text-center p-4 bg-destructive/5 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {assets.filter(a => a.status === 'missing').length}
              </div>
              <div className="text-sm text-muted-foreground">Missing</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};