import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Waybill, Site, CompanySettings } from "@/types/asset";
import { generateProfessionalPDF } from "@/utils/professionalPDFGenerator";
import { Printer, Calendar, User, Truck, ArrowLeft, MapPin, Share2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveFormContainer } from "@/components/ui/responsive-form-container";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";
import { handleMobilePdfAction } from "@/utils/mobilePdfUtils";
import { PDFPreviewDialog } from "@/components/ui/pdf-preview-dialog";
import { useState, useEffect } from "react";

interface ReturnWaybillDocumentProps {
  waybill: Waybill;
  sites: Site[];
  companySettings: CompanySettings;
  onClose: () => void;
}

export const ReturnWaybillDocument = ({ waybill, sites, companySettings, onClose }: ReturnWaybillDocumentProps) => {
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Lock body scroll when component is mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handlePrint = async () => {
    const { pdf } = await generateProfessionalPDF({
      waybill,
      companySettings,
      sites,
      type: 'return',
      signatureUrl: waybill.signatureUrl,
      signatureName: waybill.signatureName
    });

    // Use native mobile print on Android/iOS
    if (Capacitor.isNativePlatform()) {
      await handleMobilePdfAction(pdf, `Return_Waybill_${waybill.id}`, 'print');
      return;
    }

    // Web/Desktop print
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);

    // Remove any existing print iframes
    const existingIframe = document.getElementById('print-iframe');
    if (existingIframe) {
      document.body.removeChild(existingIframe);
    }

    // Create an invisible iframe for printing
    const iframe = document.createElement('iframe');
    iframe.id = 'print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.src = url;
    document.body.appendChild(iframe);

    iframe.onload = () => {
      if (iframe.contentWindow) {
        iframe.contentWindow.print();
      }

      // Cleanup after a delay to allow print dialog to open
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }
      }, 60000); // 1 minute timeout
    };
  };

  const handleSharePDF = async () => {
    const { pdf } = await generateProfessionalPDF({
      waybill,
      companySettings,
      sites,
      type: 'return',
      signatureUrl: waybill.signatureUrl,
      signatureName: waybill.signatureName
    });
    const fileName = `Return_Waybill_${waybill.id}.pdf`;

    // Use native mobile share on Android/iOS
    if (Capacitor.isNativePlatform()) {
      await handleMobilePdfAction(pdf, fileName, 'download');
      return;
    }

    // Web Share API fallback
    const blob = pdf.output('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return;
      } catch (e) {
        // User cancelled or share failed, fall back to download
      }
    }
    pdf.save(fileName);
  };

  const handlePreview = async () => {
    const { pdf } = await generateProfessionalPDF({
      waybill,
      companySettings,
      sites,
      type: 'return',
      signatureUrl: waybill.signatureUrl,
      signatureName: waybill.signatureName
    });

    const blob = pdf.output('blob');
    setPdfBlob(blob);
    setShowPreview(true);
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

  const siteName = sites.find((site) => site.id === waybill.siteId)?.name || 'Unknown Site';

  return (
    <>
      <ResponsiveFormContainer
        open={true}
        onOpenChange={onClose}
        title={`Return Waybill ${waybill.id}`}
        subtitle={waybill.siteId ? siteName : undefined}
        icon={<ArrowLeft className="h-5 w-5" />}
        maxWidth="max-w-6xl">

        {/* Mobile Action Buttons */}
        {isMobile &&
        <div className="flex gap-2 mb-4">
            <Button
            onClick={handlePreview}
            variant="outline"
            className="flex-1 gap-2"
            disabled={!hasPermission('print_documents')}>

              <Printer className="h-4 w-4" />
              Preview
            </Button>
            <Button
            onClick={handleSharePDF}
            className="flex-1 gap-2 bg-gradient-primary"
            disabled={!hasPermission('print_documents')}>

              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        }

        {/* Desktop Header with Actions */}
        {!isMobile &&
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(waybill.status)}
              <span className="text-sm text-muted-foreground">
                Created: {new Date(waybill.createdAt).toLocaleDateString('en-GB')}
              </span>
              {waybill.status === 'return_completed' &&
            <span className="text-sm text-muted-foreground ml-2">
                  Actual Return: {new Date(waybill.updatedAt).toLocaleDateString('en-GB')}
                </span>
            }
              {waybill.siteId &&
            <div className="flex items-center gap-1 ml-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">{siteName}</span>
                </div>
            }
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
        }

        {/* Mobile Status Badge */}
        {isMobile &&
        <div className="flex flex-wrap items-center gap-2 mb-4">
            {getStatusBadge(waybill.status)}
            <span className="text-sm text-muted-foreground">
              Created: {new Date(waybill.createdAt).toLocaleDateString('en-GB')}
            </span>
            {waybill.status === 'return_completed' &&
          <span className="text-sm text-muted-foreground">
                Returned: {new Date(waybill.updatedAt).toLocaleDateString('en-GB')}
              </span>
          }
          </div>
        }

        <div className="space-y-6 print:space-y-4">
          {/* Header Information */}
          <div className="bg-muted/30 p-6 rounded-lg print:bg-transparent print:border print:p-4">
            <h2 className="text-lg font-semibold mb-4">Return Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Date</p>
                    <p className="font-medium">{new Date(waybill.issueDate).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                {waybill.expectedReturnDate &&
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="font-medium">{new Date(waybill.expectedReturnDate).toLocaleDateString('en-GB')}</p>
                    </div>
                  </div>
                }
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Driver</p>
                    <p className="font-medium">{waybill.driverName}</p>
                  </div>
                </div>

                {waybill.vehicle &&
                <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicle</p>
                      <p className="font-medium">{waybill.vehicle}</p>
                    </div>
                  </div>
                }
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
            <h2 className="text-lg font-semibold mb-4">Items Returned</h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 font-medium grid grid-cols-4 gap-4 text-sm">
                <div>Asset Name</div>
                <div>Quantity Expected</div>
                <div>Quantity Returned</div>
                <div>Status</div>
              </div>

              {waybill.items.map((item, index) =>
              <div key={index} className="px-4 py-3 border-t grid grid-cols-4 gap-4 text-sm">
                  <div className="font-medium">{item.assetName}</div>
                  <div>{item.quantity}</div>
                  <div>{item.returnedQuantity}</div>
                  <div>
                    <Badge
                    variant={
                    item.status === 'outstanding' ? 'secondary' :
                    item.status === 'return_completed' ? 'default' : 'outline'
                    }
                    className="text-xs">

                      {item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/30 p-4 rounded-lg print:bg-transparent print:border">
            <div className="flex justify-between items-center text-sm">
              <span>Total Items:</span>
              <span className="font-medium">{waybill.items.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Total Quantity Expected:</span>
              <span className="font-medium">
                {waybill.items.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Total Quantity Returned:</span>
              <span className="font-medium">
                {waybill.items.reduce((sum, item) => sum + item.returnedQuantity, 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Close Button */}
        {!isMobile &&
        <div className="flex justify-end gap-3 pt-6 print:hidden">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      </ResponsiveFormContainer>

      <PDFPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        pdfBlob={pdfBlob}
        title={`Return Waybill ${waybill.id} - Preview`}
        fileName={`Return_Waybill_${waybill.id}.pdf`}
        onPrint={handlePrint}
        onDownload={handleSharePDF} />

    </>);

};