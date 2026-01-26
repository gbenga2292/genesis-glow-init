import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile'; // Assuming this hook exists based on Index.tsx usage
import { Loader2 } from 'lucide-react';

interface PullToRefreshLayoutProps {
    children: React.ReactNode;
}

export const PullToRefreshLayout: React.FC<PullToRefreshLayoutProps> = ({ children }) => {
    const queryClient = useQueryClient();
    const isMobile = useIsMobile();

    const handleRefresh = async () => {
        // Invalidate all queries to trigger a refetch
        await queryClient.invalidateQueries();
        // Also trigger the custom event for asset refresh if legacy parts use it
        window.dispatchEvent(new CustomEvent('refreshAssets'));
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
