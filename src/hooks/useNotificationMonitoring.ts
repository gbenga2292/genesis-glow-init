import { useEffect, useRef } from 'react';
import { lowStockManager, waybillNotificationManager } from '@/utils/notificationTriggers';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to monitor inventory for low stock items
 * Call this in your main App component or Dashboard
 */
export const useLowStockMonitoring = (assets: any[]) => {
    const { currentUser } = useAuth();
    const hasChecked = useRef(false);

    useEffect(() => {
        // Only check if user has low stock alerts enabled
        if (!currentUser?.preferences?.lowStockAlerts) {
            return;
        }

        // Check for low stock items
        if (assets && assets.length > 0 && !hasChecked.current) {
            lowStockManager.checkLowStock(assets);
            hasChecked.current = true;
        }

        // Set up periodic checking (every 30 minutes)
        const interval = setInterval(() => {
            if (currentUser?.preferences?.lowStockAlerts) {
                lowStockManager.checkLowStock(assets);
            }
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [assets, currentUser]);
};

/**
 * Hook to monitor waybill status changes
 * Call this when waybills are loaded or updated
 */
export const useWaybillStatusMonitoring = (waybills: any[]) => {
    const { currentUser } = useAuth();
    const previousStatuses = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        // Only monitor if user has waybill updates enabled
        if (!currentUser?.preferences?.waybillUpdates) {
            return;
        }

        waybills.forEach(waybill => {
            const previousStatus = previousStatuses.current.get(waybill.id);

            if (previousStatus && previousStatus !== waybill.status) {
                // Status has changed
                waybillNotificationManager.checkStatusChange(
                    waybill.id,
                    waybill.status,
                    waybill.waybillNumber || waybill.id,
                    previousStatus
                );
            }

            // Update tracked status
            previousStatuses.current.set(waybill.id, waybill.status);
        });
    }, [waybills, currentUser]);
};

/**
 * Helper to manually trigger waybill status notification
 * Use this when you update a waybill status
 */
export const notifyWaybillStatusChange = (
    waybillId: string,
    waybillNumber: string,
    oldStatus: string,
    newStatus: string
) => {
    waybillNotificationManager.checkStatusChange(
        waybillId,
        newStatus,
        waybillNumber,
        oldStatus
    );
};

/**
 * Helper to reset low stock notification for an item
 * Call this when an item is restocked
 */
export const resetLowStockNotification = (itemId: string) => {
    lowStockManager.resetItem(itemId);
};

/**
 * Helper to reset all low stock notifications
 * Call this when user views the low stock page
 */
export const resetAllLowStockNotifications = () => {
    lowStockManager.resetAll();
};
