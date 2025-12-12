import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Waybill, Site, CompanySettings } from "@/types/asset";
import { generateProfessionalPDF } from "@/utils/professionalPDFGenerator";
import { FileText, Printer, Calendar, User, Truck, MapPin, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface WaybillDocumentProps {
  waybill: Waybill;
  sites: Site[];
  companySettings?: CompanySettings;
  onClose: () => void;
}

export const WaybillDocument = ({ waybill, sites, companySettings, onClose }: WaybillDocumentProps) => {
  const { hasPermission } = useAuth();
  const documentType = waybill.type === 'return' ? 'Return Waybill' : 'Waybill';

  const handlePrint = async () => {
    const { pdf } = await generateProfessionalPDF({
      waybill,
      companySettings,
      sites,
      type: waybill.type
    });
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
          URL.revokeObjectURL(url);
        };
      };
    }
  };

  const handleDownloadPDF = async () => {
    const { pdf } = await generateProfessionalPDF({
      waybill,
      companySettings,
      sites,
      type: waybill.type
    });
    const fileName = `${documentType.replace(' ', '_').toLowerCase()}_${waybill.id}.pdf`;
    pdf.save(fileName);
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-0 shadow-strong">
        <DialogHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Waybill {waybill.id}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(waybill.status)}
                  <span className="text-sm text-muted-foreground">
                    Created: {new Date(waybill.createdAt).toLocaleDateString('en-GB')}
                  </span>
                  {waybill.siteId && (
                    <div className="flex items-center gap-1 ml-4">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground font-medium">
                        {sites.find(site => site.id === waybill.siteId)?.name || 'Unknown Site'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" className="gap-2" disabled={waybill.status === 'outstanding' || !hasPermission('print_documents')}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} className="gap-2 bg-gradient-primary" disabled={waybill.status === 'outstanding' || !hasPermission('print_documents')}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 print:space-y-4">
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
              <div className="bg-muted/50 px-4 py-3 font-medium grid grid-cols-4 gap-4 text-sm">
                <div>Asset Name</div>
                <div>Quantity Issued</div>
                <div>Quantity Returned</div>
                <div>Status</div>
              </div>

              {waybill.items.map((item, index) => (
                <div key={index} className="px-4 py-3 border-t grid grid-cols-4 gap-4 text-sm">
                  <div className="font-medium">{item.assetName}</div>
                  <div>{item.quantity}</div>
                  <div>{item.returnedQuantity}</div>
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
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Total Quantity Returned:</span>
              <span className="font-medium">
                {waybill.items.reduce((sum, item) => sum + item.returnedQuantity, 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};