import { toast } from 'sonner';

interface NotificationOptions {
    title: string;
    body: string;
    type?: 'info' | 'success' | 'warning' | 'error';
    force?: boolean;
}

export const sendNotification = ({ title, body, type = 'info', force = false }: NotificationOptions) => {
    // Check preferences
    let inAppEnabled = true;

    try {
        const prefsStr = localStorage.getItem('user_preferences');
        if (prefsStr) {
            const prefs = JSON.parse(prefsStr);
            // If preference exists and is false, disable. If missing, default to true.
            if (prefs.inAppNotifications === false) {
                inAppEnabled = false;
            }
        }
    } catch (e) {
        console.warn('Failed to parse notifications preferences', e);
    }

    // If force is true, bypass preference check (e.g. critical errors)
    if (!inAppEnabled && !force) {
        return;
    }

    // Determines the type of toast
    const showToast = (message: string, description: string) => {
        switch (type) {
            case 'success':
                toast.success(message, { description });
                break;
            case 'error':
                toast.error(message, { description });
                break;
            case 'warning':
                toast.warning(message, { description });
                break;
            case 'info':
            default:
                toast.info(message, { description });
        }
    };

    // 1. Show In-App Toast
    showToast(title, body);

    // 2. Trigger Native Notification (Electron)
    // Check if running in Electron environment
    if (window.electronAPI) {
        // Only send native notification if app is not focused? 
        // Or always? Usually native notifications are for background/minimized.
        // However, user asked "there should be a pc notification in the pc notification pan".
        // Many apps show both or suppress native if focused.
        // For now, allow both as requested.
        window.electronAPI.showNotification({ title, body });
    } else if ('Notification' in window && Notification.permission === 'granted') {
        // Web Native Notification fallback
        new Notification(title, { body, icon: '/favicon.ico' });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, { body, icon: '/favicon.ico' });
            }
        });
    }
};
