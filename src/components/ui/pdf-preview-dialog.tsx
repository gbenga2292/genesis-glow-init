import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, ArrowLeft, FileText, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { useToast } from "@/hooks/use-toast";

interface PDFPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    pdfBlob: Blob | null;
    title: string;
    fileName: string;
    onPrint?: () => void;
    onDownload?: () => void;
}

export const PDFPreviewDialog = ({
    open,
    onOpenChange,
    pdfBlob,
    title,
    fileName,
    onPrint,
    onDownload
}: PDFPreviewDialogProps) => {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const isMobile = useIsMobile();
    const isNative = Capacitor.isNativePlatform();
    const { toast } = useToast();

    useEffect(() => {
        if (pdfBlob && !isNative) {
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            return () => { URL.revokeObjectURL(url); };
        }
    }, [pdfBlob, isNative]);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve(result.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleNativeShare = async (dialogTitle: string) => {
        if (!pdfBlob) return;
        try {
            const base64Data = await blobToBase64(pdfBlob);
            const validFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
            const cachePath = `preview_${Date.now()}_${validFileName}`;

            const result = await Filesystem.writeFile({
                path: cachePath,
                data: base64Data,
                directory: Directory.Cache,
            });

            await Share.share({
                title: validFileName,
                url: result.uri,
                dialogTitle,
            });
        } catch (error: any) {
            console.error('Native PDF action error:', error);
            toast({
                title: "Action Failed",
                description: error.message || "Failed to process PDF on device",
                variant: "destructive"
            });
        }
    };

    const handlePrint = () => {
        if (isNative) {
            handleNativeShare('Select Print Service');
            return;
        }
        if (onPrint) {
            onPrint();
        } else if (pdfUrl) {
            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => { printWindow.print(); };
            }
        }
    };

    const handleDownload = () => {
        if (isNative) {
            handleNativeShare('Save PDF');
            return;
        }
        if (onDownload) {
            onDownload();
        } else if (pdfUrl) {
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = fileName;
            link.click();
        }
    };

    // Native mobile view — no iframe, direct action buttons
    if (isNative) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !p-0 !m-0 !gap-0 !rounded-none !border-none !flex !flex-col !bg-background !translate-x-0 !translate-y-0 !left-0 !top-0 shadow-none outline-none ring-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-sm font-semibold truncate">{title}</h2>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="h-12 w-12 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold">{title}</h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                PDF preview is not supported on this device. Use the buttons below to download, print, or share the document.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 p-4 border-t bg-background sticky bottom-0">
                        <Button onClick={handleDownload} className="w-full gap-2 bg-gradient-primary">
                            <Share2 className="h-4 w-4" />
                            Download / Share PDF
                        </Button>
                        <Button onClick={handlePrint} variant="outline" className="w-full gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile web full-page view
    if (isMobile) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !p-0 !m-0 !gap-0 !rounded-none !border-none !flex !flex-col !bg-background !translate-x-0 !translate-y-0 !left-0 !top-0 shadow-none outline-none ring-0">
                    <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-10">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-sm font-semibold truncate">{title}</h2>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden bg-muted/30">
                        {pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-muted-foreground">Loading preview...</p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2 p-4 border-t bg-background sticky bottom-0">
                        <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                        <Button onClick={handleDownload} className="flex-1 gap-2 bg-gradient-primary">
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Desktop dialog view
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseLeft
                className="!fixed !inset-0 !z-50 !w-screen !h-screen !max-w-none !p-0 !m-0 !gap-0 !rounded-none !border-none !flex !flex-col !bg-background !translate-x-0 !translate-y-0 !left-0 !top-0 shadow-none outline-none ring-0"
            >
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="ml-6">{title}</DialogTitle>
                        <div className="flex gap-2 mr-8">
                            <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2">
                                <Printer className="h-4 w-4" />
                                Print
                            </Button>
                            <Button onClick={handleDownload} size="sm" className="gap-2 bg-gradient-primary">
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-muted/30">
                    {pdfUrl ? (
                        <iframe src={pdfUrl} className="w-full h-full border-0" title="PDF Preview" />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-muted-foreground">Loading preview...</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};