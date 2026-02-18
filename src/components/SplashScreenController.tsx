import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { useAssets } from '@/contexts/AssetsContext';
import { useWaybills } from '@/contexts/WaybillsContext';
import { useAppData } from '@/contexts/AppDataContext';
import { useDashboardLoading } from '@/contexts/DashboardLoadingContext';
import { logger } from '@/lib/logger';

const MAX_SPLASH_DURATION = 3000; // Maximum 3 seconds


export const SplashScreenController = () => {
    const { isLoading: isAssetsLoading } = useAssets();
    const { isLoading: isWaybillsLoading } = useWaybills();
    const { isLoading: isAppDataLoading } = useAppData();
    const { isAllDataLoaded: isDashboardDataLoaded } = useDashboardLoading();

    const hasHiddenRef = useRef(false);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        const checkAndHideSplash = async () => {
            const platform = Capacitor.getPlatform();
            const isNative = platform === 'android' || platform === 'ios';
            const isElectron = !!(window as any).electronAPI;

            if (hasHiddenRef.current) return;

            // Wait for both context data AND dashboard page data to be loaded
            const isAllDataLoaded = !isAssetsLoading && !isWaybillsLoading && !isAppDataLoading && isDashboardDataLoaded;
            const elapsedTime = Date.now() - startTimeRef.current;
            const hasTimedOut = elapsedTime >= MAX_SPLASH_DURATION;

            if (isAllDataLoaded || hasTimedOut) {
                hasHiddenRef.current = true;

                if (hasTimedOut && !isAllDataLoaded) {
                    logger.warn('Splash screen timeout - showing dashboard with partial data');
                }

                if (isNative) {
                    // Mobile: Hide native splash screen
                    try {
                        await new Promise(resolve => setTimeout(resolve, 300));
                        await SplashScreen.hide({ fadeOutDuration: 300 });
                        logger.info('Mobile splash screen hidden - All data loaded');
                    } catch (e) {
                        logger.warn('Failed to hide splash screen', e);
                    }
                } else if (isElectron) {
                    // Electron: Signal to main process that data is loaded
                    try {
                        (window as any).electronAPI.signalDataLoaded();
                        logger.info('Electron: Signaled data loaded');
                    } catch (e) {
                        logger.warn('Failed to signal Electron data loaded', e);
                    }
                } else {
                    // Web: Just log
                    logger.info('Web: All data loaded');
                }
            } else {
                logger.info('Waiting for data to load before hiding splash screen', {
                    data: {
                        contextAssets: isAssetsLoading,
                        contextWaybills: isWaybillsLoading,
                        contextAppData: isAppDataLoading,
                        dashboardData: !isDashboardDataLoaded,
                        elapsedTime: `${elapsedTime}ms`
                    }
                });
            }
        };

        checkAndHideSplash();

        // Safety timeout to ensure splash is hidden even if data loading hangs
        const timeoutId = setTimeout(() => {
            checkAndHideSplash();
        }, MAX_SPLASH_DURATION);

        return () => clearTimeout(timeoutId);
    }, [isAssetsLoading, isWaybillsLoading, isAppDataLoading, isDashboardDataLoaded]);


    return null;
};
