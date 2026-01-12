import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { FileSpreadsheet, Download, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { parseExcelFile, getExcelTemplate, type ExcelAssetData } from "@/utils/excelParser";
import * as XLSX from 'xlsx';

interface ExcelImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (assets: ExcelAssetData[]) => void;
}

export const ExcelImportDialog = ({ open, onClose, onImport }: ExcelImportDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ExcelAssetData[] | null>(null);

  const downloadTemplate = () => {
    try {
      const templateData = getExcelTemplate();
      const blob = new Blob([templateData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'assets-template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download template');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreviewData(null);

    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.xlsx') && !selectedFile.name.toLowerCase().endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setIsProcessing(true);
    setProgress(20);

    try {
      setProgress(50);
      const assets = await parseExcelFile(selectedFile);
      setProgress(80);

      if (assets.length === 0) {
        setError('No valid asset data found in the Excel file');
        return;
      }

      setPreviewData(assets);
      setProgress(100);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to process Excel file');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleImport = () => {
    if (previewData) {
      onImport(previewData);
      onClose();
      resetDialog();
    }
  };

  const resetDialog = () => {
    setFile(null);
    setError(null);
    setPreviewData(null);
    setProgress(0);
    setIsProcessing(false);
  };

  const handleClose = () => {
    onClose();
    resetDialog();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-strong">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Import Assets from Excel</DialogTitle>
              <DialogDescription>
                Upload an Excel file with your asset data to bulk import assets
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <div className="bg-muted/30 p-6 rounded-lg">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Excel File Requirements
            </h3>

            <div className="space-y-3 text-sm">
              <div>
                <h4 className="font-medium mb-2">Required Columns:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Name</strong> - Asset name (required)</li>
                  <li><strong>Quantity</strong> - Number of items (required)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Optional Columns:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Description</strong> - Asset description</li>
                  <li><strong>Unit of Measurement</strong> - Unit (pcs, kg, meters, etc.)</li>
                  <li><strong>Category</strong> - dewatering, waterproofing, tiling, ppe, or office</li>
                  <li><strong>Type</strong> - consumable, reuseables, tools, or equipment</li>
                  <li><strong>Location</strong> - Storage location</li>
                  <li><strong>Service</strong> - Service classification</li>
                  <li><strong>Status</strong> - active, damaged, missing, or maintenance</li>
                  <li><strong>Condition</strong> - excellent, good, fair, or poor</li>
                  <li><strong>Cost</strong> - Asset cost/price</li>
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Download Excel Template
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="excel-file">Select Excel File</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
              />
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing file...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Preview Data */}
            {previewData && (
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  Preview ({previewData.length} assets found)
                </h4>

                <div className="max-h-60 overflow-y-auto">
                  <div className="grid gap-2">
                    {previewData.slice(0, 5).map((asset, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-background rounded text-sm">
                        <div>
                          <span className="font-medium">{asset.name}</span>
                          {asset.description && (
                            <span className="text-muted-foreground ml-2">- {asset.description}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div>{asset.quantity} {asset.unitOfMeasurement}</div>
                          <div className="text-xs text-muted-foreground">{asset.category} • {asset.type}</div>
                        </div>
                      </div>
                    ))}

                    {previewData.length > 5 && (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        ... and {previewData.length - 5} more assets
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!previewData || isProcessing}
              className="bg-gradient-primary gap-2"
            >
              <Upload className="h-4 w-4" />
              Import {previewData?.length || 0} Assets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};