
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from '@/hooks/use-toast';
import type { jsPDF } from 'jspdf';

/**
 * Handles PDF actions (Print/Download) for mobile devices using Capacitor plugins
 */
export async function handleMobilePdfAction(
    pdf: jsPDF,
    fileName: string,
    action: 'print' | 'download'
): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
        console.warn('handleMobilePdfAction called on non-native platform');
        return;
    }

    try {
        // 1. Get Base64 content from jsPDF
        // jsPDF's output('datauristring') returns "data:application/pdf;base64,..."
        // We need just the base64 part for Capacitor Filesystem
        const dataUri = pdf.output('datauristring');
        const base64Data = dataUri.split(',')[1];

        const validFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

        if (action === 'print') {
            // For printing, we save to Cache and Share
            const path = `temp_print_${Date.now()}_${validFileName}`;

            const result = await Filesystem.writeFile({
                path: path,
                data: base64Data,
                directory: Directory.Cache,
                // encoding: Encoding.UTF8 // Base64 data doesn't need encoding flag usually, implies text? 
                // Actually for base64 string data, usually valid.
            });

            // Share the file
            await Share.share({
                title: 'Print Document',
                text: 'Print this document',
                url: result.uri,
                dialogTitle: 'Print or Share PDF'
            });

        } else if (action === 'download') {
            // For download, attempt to save to Documents
            try {
                // Try saving to Documents folder
                await Filesystem.writeFile({
                    path: validFileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true
                });

                toast({
                    title: "Download Successful",
                    description: `File saved to Documents/${validFileName}`,
                    variant: "default"
                });

                // Optional: Also open/share it so user can see it immediately
                // const uriResult = await Filesystem.getUri({
                //     path: validFileName,
                //     directory: Directory.Documents
                // });
                // await Share.share({ url: uriResult.uri });

            } catch (fsError: any) {
                console.error('Failed to save to Documents:', fsError);

                // Fallback: Save to Cache and Share (User can "Save to Files")
                const cachePath = `download_${validFileName}`;
                const result = await Filesystem.writeFile({
                    path: cachePath,
                    data: base64Data,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: 'Save PDF',
                    url: result.uri,
                    dialogTitle: 'Save PDF to...'
                });

                toast({
                    title: "Saved via Share",
                    description: "Please select 'Save to Files' or similar option.",
                });
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
