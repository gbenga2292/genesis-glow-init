import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Point the worker at the bundled worker file.
// Using a CDN URL is the most reliable approach for Capacitor WebViews
// because local worker URLs may be blocked by Android's file:// restrictions.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfJsViewerProps {
    /** Raw PDF blob to render */
    pdfBlob: Blob;
    className?: string;
}

export const PdfJsViewer = ({ pdfBlob, className = "" }: PdfJsViewerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(0);
    const [renderedPages, setRenderedPages] = useState(0);

    useEffect(() => {
        if (!pdfBlob) return;

        let cancelled = false;

        const renderPdf = async () => {
            setLoading(true);
            setError(null);
            setTotalPages(0);
            setRenderedPages(0);

            // Clear any previous canvases
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }

            try {
                // Convert Blob → ArrayBuffer
                const arrayBuffer = await pdfBlob.arrayBuffer();
                const typedArray = new Uint8Array(arrayBuffer);

                const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
                if (cancelled) return;

                setTotalPages(pdf.numPages);

                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    if (cancelled) break;

                    const page = await pdf.getPage(pageNum);
                    if (cancelled) break;

                    // Scale to fit device pixel ratio and container width
                    const devicePixelRatio = window.devicePixelRatio || 1;
                    const containerWidth = containerRef.current?.clientWidth || window.innerWidth;

                    const unscaledViewport = page.getViewport({ scale: 1 });
                    const scale = (containerWidth / unscaledViewport.width) * devicePixelRatio;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement("canvas");
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    // Display at CSS pixels (unscaled by devicePixelRatio)
                    canvas.style.width = `${viewport.width / devicePixelRatio}px`;
                    canvas.style.height = `${viewport.height / devicePixelRatio}px`;
                    canvas.style.display = "block";
                    canvas.style.marginBottom = "8px";
                    canvas.style.borderRadius = "4px";
                    canvas.style.boxShadow = "0 1px 6px rgba(0,0,0,0.18)";

                    const context = canvas.getContext("2d");
                    if (context) {
                        await page.render({ canvasContext: context, viewport, canvas }).promise;
                    }

                    if (cancelled) break;

                    containerRef.current?.appendChild(canvas);
                    setRenderedPages(pageNum);
                }

                if (!cancelled) setLoading(false);
            } catch (err: any) {
                if (!cancelled) {
                    console.error("PdfJsViewer error:", err);
                    setError(err?.message || "Failed to render PDF");
                    setLoading(false);
                }
            }
        };

        renderPdf();
        return () => { cancelled = true; };
    }, [pdfBlob]);

    return (
        <div
            className={`relative w-full h-full overflow-y-auto overflow-x-hidden bg-muted/30 ${className}`}
            style={{ touchAction: "pan-y pinch-zoom", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
            {/* Loading overlay — stays until fully rendered */}
            {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 z-10">
                    <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    <p className="text-sm text-muted-foreground">
                        {totalPages > 0
                            ? `Rendering page ${renderedPages} of ${totalPages}…`
                            : "Loading PDF…"}
                    </p>
                </div>
            )}

            {/* Error state */}
            {error && (
                <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                    <p className="text-destructive font-semibold text-sm">Unable to render PDF</p>
                    <p className="text-xs text-muted-foreground">{error}</p>
                </div>
            )}

            {/* Canvas pages are injected here by the effect */}
            <div ref={containerRef} className="p-2" />
        </div>
    );
};
