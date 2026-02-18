import { sendNotification } from './notifications';

/**
 * Low Stock Notification Manager
 * Tracks which items have been notified to avoid spam
 */
class LowStockNotificationManager {
    private notifiedItems: Set<string> = new Set();
    private lastCheckTime: number = 0;
    private readonly CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

    /**
     * Check for low stock items and notify if needed
     * @param assets - All assets/consumables to check
     */
    checkLowStock(assets: any[]) {
        const now = Date.now();

        // Only check every 30 minutes to avoid spam
        if (now - this.lastCheckTime < this.CHECK_INTERVAL) {
            return;
        }

        this.lastCheckTime = now;

        // Find consumables that are low on stock
        const lowStockItems = assets.filter(asset => {
            // Check if it's a consumable with stock tracking
            if (!asset.lowStockThreshold || asset.lowStockThreshold === 0) {
                return false;
            }

            const currentStock = asset.quantity || 0;
            const threshold = asset.lowStockThreshold;

            // Item is low on stock
            return currentStock <= threshold && currentStock > 0;
        });

        // Find items we haven't notified about yet
        const newLowStockItems = lowStockItems.filter(
            item => !this.notifiedItems.has(item.id)
        );

        if (newLowStockItems.length === 0) {
            return;
        }

        // Mark items as notified
        newLowStockItems.forEach(item => this.notifiedItems.add(item.id));

        // Send a single notification for all low stock items
        const itemCount = newLowStockItems.length;
        const firstItem = newLowStockItems[0];

        let title = 'Low Stock Alert';
        let body = '';

        if (itemCount === 1) {
            body = `${firstItem.name} is running low (${firstItem.quantity} remaining)`;
        } else {
            body = `${itemCount} items are running low on stock. Click to view details.`;
        }

        sendNotification({
            title,
            body,
            type: 'warning'
        });

        // Store in localStorage for the notification panel
        this.storeLowStockNotification(newLowStockItems);
    }

    /**
     * Reset notification for a specific item (when restocked)
     */
    resetItem(itemId: string) {
        this.notifiedItems.delete(itemId);
    }

    /**
     * Reset all notifications (e.g., when user views the low stock page)
     */
    resetAll() {
        this.notifiedItems.clear();
    }

    /**
     * Store notification in localStorage for notification panel
     */
    private storeLowStockNotification(items: any[]) {
        try {
            const notifications = JSON.parse(localStorage.getItem('app_notifications') || '[]');

            notifications.push({
                id: Date.now().toString(),
                type: 'low_stock',
                title: 'Low Stock Alert',
                message: `${items.length} item(s) running low on stock`,
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    threshold: item.lowStockThreshold
                })),
                timestamp: new Date().toISOString(),
                read: false,
                actionUrl: '/inventory?filter=low-stock'
            });

            // Keep only last 50 notifications
            if (notifications.length > 50) {
                notifications.splice(0, notifications.length - 50);
            }

            localStorage.setItem('app_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error('Failed to store notification', e);
        }
    }
}

/**
 * Waybill Status Notification Manager
 */
class WaybillNotificationManager {
    private lastStatuses: Map<string, string> = new Map();

    /**
     * Check if waybill status has changed and notify
     */
    checkStatusChange(waybillId: string, newStatus: string, waybillNumber: string, oldStatus?: string) {
        // If we have a previous status and it's different, notify
        const previousStatus = oldStatus || this.lastStatuses.get(waybillId);

        if (previousStatus && previousStatus !== newStatus) {
            this.notifyStatusChange(waybillId, waybillNumber, previousStatus, newStatus);
        }

        // Update tracked status
        this.lastStatuses.set(waybillId, newStatus);
    }

    /**
     * Send notification for status change
     */
    private notifyStatusChange(waybillId: string, waybillNumber: string, oldStatus: string, newStatus: string) {
        const statusMessages: Record<string, string> = {
            'pending': 'is pending approval',
            'approved': 'has been approved',
            'sent_to_site': 'has been sent to site',
            'in_transit': 'is in transit',
            'delivered': 'has been delivered',
            'returned': 'has been returned',
            'cancelled': 'has been cancelled'
        };

        const message = statusMessages[newStatus] || `status changed to ${newStatus}`;

        sendNotification({
            title: 'Waybill Update',
            body: `Waybill ${waybillNumber} ${message}`,
            type: newStatus === 'delivered' ? 'success' : 'info'
        });

        // Store notification
        this.storeWaybillNotification(waybillId, waybillNumber, oldStatus, newStatus);
    }

    /**
     * Store notification in localStorage
     */
    private storeWaybillNotification(waybillId: string, waybillNumber: string, oldStatus: string, newStatus: string) {
        try {
            const notifications = JSON.parse(localStorage.getItem('app_notifications') || '[]');

            notifications.push({
                id: Date.now().toString(),
                type: 'waybill_status',
                title: 'Waybill Update',
                message: `Waybill ${waybillNumber} status: ${oldStatus} → ${newStatus}`,
                waybillId,
                waybillNumber,
                oldStatus,
                newStatus,
                timestamp: new Date().toISOString(),
                read: false,
                actionUrl: `/waybills?id=${waybillId}`
            });

            if (notifications.length > 50) {
                notifications.splice(0, notifications.length - 50);
            }

            localStorage.setItem('app_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error('Failed to store notification', e);
        }
    }
}

/**
 * Weekly Report Manager
 */
class WeeklyReportManager {
    private readonly REPORT_DAY = 5; // Friday (0 = Sunday, 5 = Friday)
    private readonly REPORT_HOUR = 17; // 5 PM
    private lastReportDate: string | null = null;

    constructor() {
        // Load last report date from localStorage
        this.lastReportDate = localStorage.getItem('last_weekly_report_date');

        // Check on initialization
        this.checkAndSendReport();

        // Check every hour
        setInterval(() => this.checkAndSendReport(), 60 * 60 * 1000);
    }

    /**
     * Check if it's time to send weekly report
     */
    private checkAndSendReport() {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

        // Already sent today
        if (this.lastReportDate === today) {
            return;
        }

        // Check if it's Friday at 5 PM or later
        const dayOfWeek = now.getDay();
        const hour = now.getHours();

        if (dayOfWeek === this.REPORT_DAY && hour >= this.REPORT_HOUR) {
            this.sendWeeklyReport();
            this.lastReportDate = today;
            localStorage.setItem('last_weekly_report_date', today);
        }
    }

    /**
     * Generate and send weekly report notification
     */
    private sendWeeklyReport() {
        sendNotification({
            title: 'Weekly Inventory Report',
            body: 'Your weekly inventory summary is ready. Click to view details.',
            type: 'info'
        });

        // Store notification
        this.storeReportNotification();
    }

    /**
     * Store report notification
     */
    private storeReportNotification() {
        try {
            const notifications = JSON.parse(localStorage.getItem('app_notifications') || '[]');

            notifications.push({
                id: Date.now().toString(),
                type: 'weekly_report',
                title: 'Weekly Report',
                message: 'Your weekly inventory report is ready',
                timestamp: new Date().toISOString(),
                read: false,
                actionUrl: '/reports?type=weekly'
            });

            if (notifications.length > 50) {
                notifications.splice(0, notifications.length - 50);
            }

            localStorage.setItem('app_notifications', JSON.stringify(notifications));
        } catch (e) {
            console.error('Failed to store notification', e);
        }
    }

    /**
     * Manually trigger report (for testing or admin action)
     */
    triggerManualReport() {
        this.sendWeeklyReport();
    }
}

// Export singleton instances
export const lowStockManager = new LowStockNotificationManager();
export const waybillNotificationManager = new WaybillNotificationManager();
export const weeklyReportManager = new WeeklyReportManager();

// Helper function to get all notifications
export const getNotifications = () => {
    try {
        return JSON.parse(localStorage.getItem('app_notifications') || '[]');
    } catch (e) {
        return [];
    }
};

// Helper function to mark notification as read
export const markNotificationAsRead = (notificationId: string) => {
    try {
        const notifications = JSON.parse(localStorage.getItem('app_notifications') || '[]');
        const notification = notifications.find((n: any) => n.id === notificationId);

        if (notification) {
            notification.read = true;
            localStorage.setItem('app_notifications', JSON.stringify(notifications));
        }
    } catch (e) {
        console.error('Failed to mark notification as read', e);
    }
};

// Helper function to clear all notifications
export const clearAllNotifications = () => {
    localStorage.setItem('app_notifications', '[]');
};

// Helper function to get unread count
export const getUnreadCount = () => {
    try {
        const notifications = JSON.parse(localStorage.getItem('app_notifications') || '[]');
        return notifications.filter((n: any) => !n.read).length;
    } catch (e) {
        return 0;
    }
};
