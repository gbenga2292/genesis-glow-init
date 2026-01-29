import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';
import { useAppData } from '@/contexts/AppDataContext';
import { useAssets } from '@/contexts/AssetsContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from "@/lib/logger";

interface PullToRefreshLayoutProps {
    children: React.ReactNode;
}

export const PullToRefreshLayout: React.FC<PullToRefreshLayoutProps> = ({ children }) => {
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();
    const { refreshAllData } = useAppData();
    const { refreshAssets } = useAssets();
    const { toast } = useToast();

    const handleRefresh = async () => {
        try {
            // 1. Invalidate React Query cache (for components using useQuery)
            await queryClient.invalidateQueries();

            // 2. Refresh Context Data (for components using useAppData/useAssets)
            await Promise.all([
                refreshAllData(),
                refreshAssets()
            ]);

            // Legacy event, kept for robustness but updated to be safe empty dispatch
            // Any listeners should check existing data source instead of relying on event detail
            window.dispatchEvent(new CustomEvent('refreshAssets'));

        } catch (error) {
            logger.error('Pull to refresh failed', error);
            toast({
                title: "Refresh Failed",
                description: "Could not update data. Check your internet connection.",
                variant: "destructive"
            });
        }
        return Promise.resolve();
    };

    if (!isMobile) {
        return <>{children}</>;
    }

    return (
        <PullToRefresh
            onRefresh={handleRefresh}
            refreshingContent={
                <div className="w-full flex justify-center items-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            }
            pullingContent={
                <div className="w-full flex justify-center items-center p-4 text-sm text-muted-foreground">
                    Pull down to refresh
                </div>
            }
        >
            <div id="pull-to-refresh-container">
                {children}
            </div>
        </PullToRefresh>
    );
};
