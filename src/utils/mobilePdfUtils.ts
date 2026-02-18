import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';
import type { jsPDF } from 'jspdf';

/**
 * Handles PDF actions (Print/Download) for mobile devices using Capacitor plugins
 * 
 * For Android:
 * - Print: Opens the native Android print service via share intent with proper MIME type
 * - Download: Saves to Downloads folder and shows share dialog for folder selection
 */
export async function handleMobilePdfAction(
    pdf: jsPDF,
    fileName: string,
    action: 'print' | 'download'
): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.warn('handleMobilePdfAction called on non-native platform');
        // Fallback for web
        if (action === 'print') {
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
        } else {
            pdf.save(fileName);
        }
        return;
    }

    try {
        // Get Base64 content from jsPDF
        const dataUri = pdf.output('datauristring');
        const base64Data = dataUri.split(',')[1];

        const validFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
        const timestamp = Date.now();

        if (action === 'print') {
            // For printing on Android, save to cache and share with print intent
            const cachePath = `print_${timestamp}_${validFileName}`;

            const result = await Filesystem.writeFile({
                path: cachePath,
                data: base64Data,
                directory: Directory.Cache,
            });

            // Use Share with explicit title to hint at print action
            // On Android, this opens the share sheet where user can select "Print" option
            await Share.share({
                title: 'Print Document',
                url: result.uri,
                dialogTitle: 'Select Print Service'
            });

            toast({
                title: "Print Ready",
                description: "Select your printer from the options above",
                variant: "default"
            });

        } else if (action === 'download') {
            // For download, we need to handle Android's scoped storage
            const platform = Capacitor.getPlatform();
            
            if (platform === 'android') {
                // Try to save to External storage (Downloads folder)
                try {
                    // First save to cache
                    const cachePath = `download_${timestamp}_${validFileName}`;
                    const cacheResult = await Filesystem.writeFile({
                        path: cachePath,
                        data: base64Data,
                        directory: Directory.Cache,
                    });

                    // Use Share to let user choose where to save
                    // This triggers Android's "Save to..." dialog
                    await Share.share({
                        title: validFileName,
                        url: cacheResult.uri,
                        dialogTitle: 'Save PDF to...'
                    });

                    toast({
                        title: "Download Ready",
                        description: "Choose 'Save to Files' or a folder to save the PDF",
                        variant: "default"
                    });

                } catch (saveError: any) {
                    console.error('Error saving PDF on Android:', saveError);
                    
                    // Fallback: Save to Documents and notify user
                    try {
                        await Filesystem.writeFile({
                            path: validFileName,
                            data: base64Data,
                            directory: Directory.Documents,
                            recursive: true
                        });

                        toast({
                            title: "Download Complete",
                            description: `Saved to Documents/${validFileName}`,
                            variant: "default"
                        });
                    } catch (docError) {
                        throw new Error('Could not save file. Please try again.');
                    }
                }
            } else {
                // iOS - Save to Documents
                try {
                    const result = await Filesystem.writeFile({
                        path: validFileName,
                        data: base64Data,
                        directory: Directory.Documents,
                        recursive: true
                    });

                    // Share to let user save to Files app
                    await Share.share({
                        title: validFileName,
                        url: result.uri,
                        dialogTitle: 'Save PDF'
                    });

                    toast({
                        title: "Download Complete",
                        description: `PDF saved successfully`,
                        variant: "default"
                    });
                } catch (iosError: any) {
                    console.error('Error saving PDF on iOS:', iosError);
                    throw iosError;
                }
            }
        }
    } catch (error: any) {
        console.error('Mobile PDF Action Error:', error);
        toast({
            title: "Action Failed",
            description: error.message || "Failed to process PDF on device",
            variant: "destructive"
        });
    }
}

/**
 * Handles Excel file actions for mobile devices
 */
export async function handleMobileExcelAction(
    workbookData: ArrayBuffer,
    fileName: string
): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.warn('handleMobileExcelAction called on non-native platform');
        return;
    }

    try {
        // Convert ArrayBuffer to base64
        const uint8Array = new Uint8Array(workbookData);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Data = btoa(binary);

        const validFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
        const timestamp = Date.now();
        const cachePath = `excel_${timestamp}_${validFileName}`;

        const result = await Filesystem.writeFile({
            path: cachePath,
            data: base64Data,
            directory: Directory.Cache,
        });

        await Share.share({
            title: validFileName,
            url: result.uri,
            dialogTitle: 'Save Excel File'
        });

        toast({
            title: "Export Ready",
            description: "Choose where to save the Excel file",
            variant: "default"
        });

    } catch (error: any) {
        console.error('Mobile Excel Action Error:', error);
        toast({
            title: "Export Failed",
            description: error.message || "Failed to export Excel on device",
            variant: "destructive"
        });
    }
}

/**
 * Handles JSON backup file actions for mobile devices
 */
export async function handleMobileBackupAction(
    jsonData: string,
    fileName: string
): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.warn('handleMobileBackupAction called on non-native platform');
        return;
    }

    try {
        const validFileName = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
        const timestamp = Date.now();
        const cachePath = `backup_${timestamp}_${validFileName}`;

        // Convert string to base64
        const base64Data = btoa(unescape(encodeURIComponent(jsonData)));

        const result = await Filesystem.writeFile({
            path: cachePath,
            data: base64Data,
            directory: Directory.Cache,
        });

        await Share.share({
            title: validFileName,
            url: result.uri,
            dialogTitle: 'Save Backup File'
        });

        toast({
            title: "Backup Ready",
            description: "Choose where to save the backup file",
            variant: "default"
        });

    } catch (error: any) {
        console.error('Mobile Backup Action Error:', error);
        toast({
            title: "Backup Failed",
            description: error.message || "Failed to save backup on device",
            variant: "destructive"
        });
    }
}
