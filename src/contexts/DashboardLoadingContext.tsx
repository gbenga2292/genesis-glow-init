import { createContext, useContext, ReactNode } from 'react';

interface DashboardLoadingContextType {
    isAssetsLoaded: boolean;
    isWaybillsLoaded: boolean;
    isLogsLoaded: boolean;
    isAllDataLoaded: boolean;
}

const DashboardLoadingContext = createContext<DashboardLoadingContextType | undefined>(undefined);

export const useDashboardLoading = () => {
    const context = useContext(DashboardLoadingContext);
    if (context === undefined) {
        // Return default values if context is not available (e.g., not on dashboard page)
        return {
            isAssetsLoaded: true,
            isWaybillsLoaded: true,
            isLogsLoaded: true,
            isAllDataLoaded: true
        };
    }
    return context;
};

interface DashboardLoadingProviderProps {
    children: ReactNode;
    isAssetsLoaded: boolean;
    isWaybillsLoaded: boolean;
    isLogsLoaded: boolean;
}

export const DashboardLoadingProvider = ({
    children,
    isAssetsLoaded,
    isWaybillsLoaded,
    isLogsLoaded
}: DashboardLoadingProviderProps) => {
    const isAllDataLoaded = isAssetsLoaded && isWaybillsLoaded && isLogsLoaded;

    return (
        <DashboardLoadingContext.Provider
            value={{
                isAssetsLoaded,
                isWaybillsLoaded,
                isLogsLoaded,
                isAllDataLoaded
            }}
        >
            {children}
        </DashboardLoadingContext.Provider>
    );
};
