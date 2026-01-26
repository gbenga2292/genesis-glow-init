import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const NetworkStatus = () => {
    const isOnline = useNetworkStatus();
    const [hasChanged, setHasChanged] = useState(false);

    useEffect(() => {
        // Skip the initial check to avoid toast on load, or show "Connected" if that's desired.
        // But user asked for "status that show when app is connected".

        if (hasChanged) {
            if (isOnline) {
                toast.success("Connection Restored", {
                    description: "You are back online. Data synchronization enabled.",
                    icon: <Wifi className="w-4 h-4" />,
                });
            } else {
                toast.warning("You are Offline", {
                    description: "You are in view-only mode. Changes cannot be saved.",
                    icon: <WifiOff className="w-4 h-4" />,
                    duration: Infinity, // Stay until back online
                    id: "offline-toast" // ID to allow dismissal programmaticallly if needed
                });
            }
        }
        setHasChanged(true);
    }, [isOnline]);

    // Cleanup the offline toast when we come back online is handled by sonner automatically if we want, 
    // but better to just dismiss it manually:
    useEffect(() => {
        if (isOnline && hasChanged) {
            toast.dismiss("offline-toast");
        }
    }, [isOnline]);

    if (isOnline) return null; // "Invasive" check: Don't show persistent UI if online, just the toast. 
    // Actually, let's keep a small indicator if offline.

    return (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md transition-all duration-300",
                "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
            )}>
                <WifiOff className="w-3 h-3" />
                <span>Offline Mode (Read Only)</span>
            </div>
        </div>
    );
};
