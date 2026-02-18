import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Waybill, Site, CompanySettings, Vehicle } from "@/types/asset";
import { generateProfessionalPDF } from "@/utils/professionalPDFGenerator";
import { FileText, Printer, Calendar, User, Truck, MapPin, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveFormContainer } from "@/components/ui/responsive-form-container";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";
import { handleMobilePdfAction } from "@/utils/mobilePdfUtils";
import { useToast } from "@/hooks/use-toast";
import { PDFPreviewDialog } from "@/components/ui/pdf-preview-dialog";
import { useState } from "react";

interface WaybillDocumentProps {
  waybill: Waybill;
  sites: Site[];
  vehicles?: Vehicle[];
  companySettings?: CompanySettings;
  onClose: () => void;
}

export const WaybillDocument = ({ waybill, sites, vehicles, companySettings, onClose }: WaybillDocumentProps) => {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const documentType = waybill.type === 'return' ? 'Return Waybill' : 'Waybill';
  const [showPreview, setShowPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  const handlePrint = async () => {
    try {
      const { pdf } = await generateProfessionalPDF({
        waybill,
        companySettings,
        sites,
        vehicles,
        type: waybill.type,
        signatureUrl: waybill.signatureUrl,
        signatureName: waybill.signatureName
      });

      // Use native mobile print on Android/iOS
      if (Capacitor.isNativePlatform()) {
        await handleMobilePdfAction(pdf, `Waybill_${waybill.id}`, 'print');
        return;
      }

      // Web/Desktop/Electron print - use iframe for better compatibility
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);

      // Create hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.print();
          // Clean up after a delay
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        } catch (e) {
          console.error('Print error:', e);
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
          toast({
            title: "Print Failed",
            description: "Could not print the PDF. Try downloading instead.",
            variant: "destructive"
          });
        }
      };
    } catch (error) {
      console.error("Print failed:", error);
      toast({
        title: "Print Failed",
        description: "Could not generate or print the PDF.",
        variant: "destructive"
      });
    }
  };

  const handleSharePDF = async () => {
    try {
      const { pdf } = await generateProfessionalPDF({
        waybill,
        companySettings,
        sites,
        vehicles,
        type: waybill.type,
        signatureUrl: waybill.signatureUrl,
        signatureName: waybill.signatureName
      });
      const fileName = `${documentType.replace(' ', '_').toLowerCase()}_${waybill.id}.pdf`;

      // Use native mobile share on Android/iOS
      if (Capacitor.isNativePlatform()) {
        await handleMobilePdfAction(pdf, fileName, 'download');
        return;
      }

      // Web Share API
      const blob = pdf.output('blob');
      const file = new File([blob], fileName, { type: 'application/pdf' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          return;
        } catch (e) {
          // User cancelled, fall back to download
        }
      }

      pdf.save(fileName);
      toast({
        title: "Download Started",
        description: `Downloading ${fileName}...`
      });
    } catch (error) {
      console.error("Share failed:", error);
      toast({
        title: "Share Failed",
        description: "Could not generate or share the PDF.",
        variant: "destructive"
      });
    }
  };

  const handlePreview = async () => {
    try {
      const { pdf } = await generateProfessionalPDF({
        waybill,
        companySettings,
        sites,
        vehicles,
        type: waybill.type,
        signatureUrl: waybill.signatureUrl,
        signatureName: waybill.signatureName
      });

      const blob = pdf.output('blob');
      setPdfBlob(blob);
      setShowPreview(true);
    } catch (error) {
      console.error("Preview failed:", error);
      toast({
        title: "Preview Failed",
        description: "Could not generate the PDF preview.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: Waybill['status']) => {
    switch (status) {
      case 'outstanding':
        return <Badge className="bg-gradient-warning text-warning-foreground">Outstanding</Badge>;
      case 'partial_returned':
        return <Badge className="bg-orange-500 text-white">Partial Return</Badge>;
      case 'return_completed':
        return <Badge className="bg-gradient-success">Returned</Badge>;
      case 'sent_to_site':
        return <Badge className="bg-blue-500 text-white">Sent to Site</Badge>;
    }
  };

  const siteObj = sites.find(site => site.id === waybill.siteId);
  const siteName = siteObj
    ? (siteObj.clientName ? `${siteObj.name} (${siteObj.clientName})` : siteObj.name)
    : 'Unknown Site';

  return (
    <>
      <ResponsiveFormContainer
        open={true}
        onOpenChange={onClose}
        title={`Waybill ${waybill.id}`}
        subtitle={waybill.siteId ? siteName : undefined}
        icon={<FileText className="h-5 w-5" />}
        maxWidth="max-w-6xl"
      >
        {/* Mobile Action Buttons */}
        {isMobile && (
          <div className="flex gap-2 mb-4">
            <Button
              onClick={handlePreview}
              variant="outline"
              className="flex-1 gap-2"
              disabled={!hasPermission('print_documents')}
            >
              <Printer className="h-4 w-4" />
              Preview
            </Button>
            <Button
              onClick={handleSharePDF}
              className="flex-1 gap-2 bg-gradient-primary"
              disabled={!hasPermission('print_documents')}
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        )}

        {/* Desktop Header with Actions */}
        {!isMobile && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {getStatusBadge(waybill.status)}
              <span className="text-sm text-muted-foreground">
                Created: {new Date(waybill.createdAt).toLocaleDateString('en-GB')}
              </span>
              {waybill.siteId && (
                <div className="flex items-center gap-1 ml-4">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">{siteName}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePreview} variant="outline" className="gap-2" disabled={!hasPermission('print_documents')}>
                <Printer className="h-4 w-4" />
                Preview & Print
              </Button>
              <Button onClick={handleSharePDF} className="gap-2 bg-gradient-primary" disabled={!hasPermission('print_documents')}>
                <Share2 className="h-4 w-4" />
                Share PDF
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Status Badge */}
        {isMobile && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {getStatusBadge(waybill.status)}
            <span className="text-sm text-muted-foreground">
              Created: {new Date(waybill.createdAt).toLocaleDateString('en-GB')}
            </span>
          </div>
        )}

        <div className="space-y-6 print:space-y-4 min-h-0">
          {/* Header Information */}
          <div className="bg-muted/30 p-6 rounded-lg print:bg-transparent print:border print:p-4">
            <h2 className="text-lg font-semibold mb-4">Delivery Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sent to Site Date</p>
                    <p className="font-medium">
                      {waybill.sentToSiteDate
                        ? new Date(waybill.sentToSiteDate).toLocaleDateString('en-GB')
                        : <span className="text-muted-foreground italic">Not sent yet</span>
                      }
                    </p>
                  </div>
                </div>

                {waybill.expectedReturnDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="font-medium">{new Date(waybill.expectedReturnDate).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Driver</p>
                    <p className="font-medium">{waybill.driverName}</p>
                  </div>
                </div>

                {waybill.vehicle && (
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicle</p>
                      <p className="font-medium">{waybill.vehicle}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-1">Purpose</p>
              <p className="font-medium">{waybill.purpose}</p>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Items Issued</h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 font-medium grid grid-cols-3 gap-4 text-sm">
                <div>Asset Name</div>
                <div>Quantity Issued</div>
                <div>Status</div>
              </div>

              {waybill.items.map((item, index) => (
                <div key={index} className="px-4 py-3 border-t grid grid-cols-3 gap-4 text-sm">
                  <div className="font-medium">{item.assetName}</div>
                  <div>{item.quantity}</div>
                  <div>
                    <Badge
                      variant={
                        item.status === 'outstanding'
                          ? (waybill.status === 'sent_to_site' || waybill.status === 'partial_returned' ? 'default' : 'secondary')
                          : item.status === 'return_completed' ? 'default' : 'outline'
                      }
                      className={`text-xs ${item.status === 'outstanding' && (waybill.status === 'sent_to_site' || waybill.status === 'partial_returned') ? 'bg-blue-500 hover:bg-blue-600 text-white border-transparent' : ''}`}
                    >
                      {item.status === 'outstanding' && (waybill.status === 'sent_to_site' || waybill.status === 'partial_returned')
                        ? 'SENT TO SITE'
                        : item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/30 p-4 rounded-lg print:bg-transparent print:border">
            <div className="flex justify-between items-center text-sm">
              <span>Total Items:</span>
              <span className="font-medium">{waybill.items.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Total Quantity Issued:</span>
              <span className="font-medium">
                {waybill.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Close Button */}
        {!isMobile && (
          <div className="flex justify-end gap-3 pt-6 print:hidden">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </ResponsiveFormContainer>

      <PDFPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        pdfBlob={pdfBlob}
        title={`${documentType} ${waybill.id} - Preview`}
        fileName={`${documentType.replace(' ', '_').toLowerCase()}_${waybill.id}.pdf`}
        onPrint={handlePrint}
        onDownload={handleSharePDF}
      />
    </>
  );
};