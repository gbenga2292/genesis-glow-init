import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Waybill, Site, CompanySettings } from "@/types/asset";
import { generateProfessionalPDF } from "@/utils/professionalPDFGenerator";
import { Printer, Calendar, User, Truck, ArrowLeft, MapPin, Download } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { handleMobilePdfAction } from "@/utils/mobilePdfUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReturnWaybillDocumentPageProps {
    waybill: Waybill;
    sites: Site[];
    companySettings: CompanySettings;
    onBack: () => void;
}

export const ReturnWaybillDocumentPage = ({ waybill, sites, companySettings, onBack }: ReturnWaybillDocumentPageProps) => {
    const { hasPermission } = useAuth();
    const isMobile = useIsMobile();

    const handlePrint = async () => {
        const { pdf } = await generateProfessionalPDF({
            waybill,
            companySettings,
            sites,
            type: 'return'
        });

        if (Capacitor.isNativePlatform()) {
            await handleMobilePdfAction(pdf, `Return_Waybill_${waybill.id}`, 'print');
            return;
        }

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
            type: 'return'
        });
        const fileName = `Return_Waybill_${waybill.id}.pdf`;

        if (Capacitor.isNativePlatform()) {
            await handleMobilePdfAction(pdf, fileName, 'download');
            return;
        }

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
        <div className="flex flex-col h-full bg-background animate-fade-in">
            {/* Header - Sticky at top */}
            <div className="flex-shrink-0 border-b bg-background sticky top-0 z-10">
                <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-primary rounded-full flex items-center justify-center shrink-0">
                                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base sm:text-xl md:text-2xl font-bold tracking-tight truncate">Return Waybill {waybill.id}</h1>
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                                    {getStatusBadge(waybill.status)}
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                        {new Date(waybill.createdAt).toLocaleDateString('en-GB')}
                                    </span>
                                    {waybill.status === 'return_completed' && (
                                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                                            Returned: {new Date(waybill.updatedAt).toLocaleDateString('en-GB')}
                                        </span>
                                    )}
                                    {waybill.siteId && (
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate max-w-[100px] sm:max-w-[150px]">
                                                {sites.find(site => site.id === waybill.siteId)?.name || 'Unknown Site'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Desktop action buttons */}
                    {!isMobile && (
                        <div className="flex gap-2 shrink-0">
                            <Button
                                onClick={handlePrint}
                                variant="outline"
                                size="icon"
                                className="xl:w-auto xl:px-4"
                                disabled={!hasPermission('print_documents')}
                            >
                                <Printer className="h-4 w-4" />
                                <span className="hidden xl:inline xl:ml-2">Print</span>
                            </Button>
                            <Button
                                onClick={handleDownloadPDF}
                                size="icon"
                                className="bg-gradient-primary xl:w-auto xl:px-4"
                                disabled={!hasPermission('print_documents')}
                            >
                                <Download className="h-4 w-4" />
                                <span className="hidden xl:inline xl:ml-2">Download PDF</span>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6 pb-20 sm:pb-6">
                    {/* Header Information */}
                    <div className="bg-muted/30 p-3 sm:p-4 md:p-6 rounded-lg">
                        <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-2 sm:mb-3 md:mb-4">Return Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                            <div className="space-y-2 sm:space-y-3">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Issue Date</p>
                                        <p className="font-medium text-xs sm:text-sm md:text-base">{new Date(waybill.issueDate).toLocaleDateString('en-GB')}</p>
                                    </div>
                                </div>

                                {waybill.expectedReturnDate && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Expected Return</p>
                                            <p className="font-medium text-xs sm:text-sm md:text-base">{new Date(waybill.expectedReturnDate).toLocaleDateString('en-GB')}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <div className="flex items-center gap-2">
                                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Driver</p>
                                        <p className="font-medium text-xs sm:text-sm md:text-base truncate">{waybill.driverName}</p>
                                    </div>
                                </div>

                                {waybill.vehicle && (
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Vehicle</p>
                                            <p className="font-medium text-xs sm:text-sm md:text-base truncate">{waybill.vehicle}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-3 sm:mt-4">
                            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground mb-1">Purpose</p>
                            <p className="font-medium text-xs sm:text-sm md:text-base">{waybill.purpose}</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Items Table */}
                    <div>
                        <h2 className="text-sm sm:text-base md:text-lg font-semibold mb-2 sm:mb-3 md:mb-4">Items Returned</h2>
                        {isMobile ? (
                            // Mobile View: Cards
                            <div className="space-y-2 sm:space-y-3">
                                {waybill.items.map((item, index) => (
                                    <div key={index} className="border rounded-lg p-2.5 sm:p-3 bg-card">
                                        <div className="font-medium text-xs sm:text-sm mb-1.5 sm:mb-2">{item.assetName}</div>
                                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                            <div>
                                                <span className="text-muted-foreground">Expected:</span>
                                                <span className="ml-1 font-medium">{item.quantity}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Returned:</span>
                                                <span className="ml-1 font-medium">{item.returnedQuantity}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <Badge
                                                    variant={
                                                        item.status === 'outstanding' ? 'secondary' :
                                                            item.status === 'return_completed' ? 'default' : 'outline'
                                                    }
                                                    className="text-[10px] sm:text-xs"
                                                >
                                                    {item.status.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Desktop View: Table
                            <div className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/50 px-4 py-3 font-medium grid grid-cols-4 gap-4 text-sm">
                                    <div>Asset Name</div>
                                    <div>Quantity Expected</div>
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
                                                    item.status === 'outstanding' ? 'secondary' :
                                                        item.status === 'return_completed' ? 'default' : 'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {item.status.replace('_', ' ').toUpperCase()}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Summary */}
                    <div className="bg-muted/30 p-2.5 sm:p-3 md:p-4 rounded-lg">
                        <div className="flex justify-between items-center text-[10px] sm:text-xs md:text-sm">
                            <span>Total Items:</span>
                            <span className="font-medium">{waybill.items.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] sm:text-xs md:text-sm mt-1">
                            <span>Total Quantity Expected:</span>
                            <span className="font-medium">
                                {waybill.items.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] sm:text-xs md:text-sm mt-1">
                            <span>Total Quantity Returned:</span>
                            <span className="font-medium">
                                {waybill.items.reduce((sum, item) => sum + item.returnedQuantity, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Action Bar - Sticky */}
            {isMobile && (
                <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur-sm p-3 sticky bottom-0 z-10">
                    <div className="flex gap-2">
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            disabled={!hasPermission('print_documents')}
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            onClick={handleDownloadPDF}
                            size="sm"
                            className="flex-1 gap-2 bg-gradient-primary"
                            disabled={!hasPermission('print_documents')}
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
