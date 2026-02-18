import { Minus, Square, X, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface WindowControlsProps {
    className?: string;
}

export function WindowControls({ className }: WindowControlsProps) {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        // Check initial state
        if ((window as any).electronAPI?.window?.isMaximized) {
            (window as any).electronAPI.window.isMaximized().then(setIsMaximized);
        }

        // Listen for window state changes if exposed via IPC events
        // Assuming we have a way to listen, but for now we'll toggle local state optimistically
        // or rely on user interaction.
    }, []);

    const minimize = () => {
        (window as any).electronAPI?.window?.minimize();
    };

    const maximize = () => {
        (window as any).electronAPI?.window?.maximize().then((maximized: boolean) => {
            setIsMaximized(maximized);
        });
    };

    const close = () => {
        (window as any).electronAPI?.window?.close();
    };

    return (
        <div className={cn("flex items-center h-full app-no-drag", className)}>
            <button
                onClick={minimize}
                className="h-full px-4 hover:bg-white/10 transition-colors flex items-center justify-center group"
                title="Minimize"
            >
                <Minus className="h-3.5 w-3.5 text-foreground/80 group-hover:text-foreground" />
            </button>
            <button
                onClick={maximize}
                className="h-full px-4 hover:bg-white/10 transition-colors flex items-center justify-center group"
                title={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? (
                    <Copy className="h-3.5 w-3.5 text-foreground/80 group-hover:text-foreground rotate-180" />
                ) : (
                    <Square className="h-3.5 w-3.5 text-foreground/80 group-hover:text-foreground" />
                )}
            </button>
            <button
                onClick={close}
                className="h-full px-4 hover:bg-red-500 transition-colors flex items-center justify-center group"
                title="Close"
            >
                <X className="h-4 w-4 text-foreground/80 group-hover:text-white" />
            </button>
        </div>
    );
}
