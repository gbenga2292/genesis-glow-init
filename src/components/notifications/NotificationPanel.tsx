import React, { useEffect, useState } from 'react';
import { Bell, X, Package, FileText, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationAsRead, clearAllNotifications, getUnreadCount } from '@/utils/notificationTriggers';

interface Notification {
    id: string;
    type: 'low_stock' | 'waybill_status' | 'weekly_report';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
    items?: any[];
    waybillId?: string;
    waybillNumber?: string;
}

export const NotificationPanel: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    // Load notifications
    const loadNotifications = () => {
        const allNotifications = getNotifications();
        setNotifications(allNotifications.reverse()); // Most recent first
        setUnreadCount(getUnreadCount());
    };

    useEffect(() => {
        loadNotifications();

        // Refresh every 30 seconds
        const interval = setInterval(loadNotifications, 30000);

        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = (notification: Notification) => {
        // Mark as read
        markNotificationAsRead(notification.id);
        loadNotifications();

        // Navigate to action URL if provided
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
            setIsOpen(false);
        }
    };

    const handleClearAll = () => {
        clearAllNotifications();
        loadNotifications();
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'low_stock':
                return <Package className="h-5 w-5 text-orange-500" />;
            case 'waybill_status':
                return <FileText className="h-5 w-5 text-blue-500" />;
            case 'weekly_report':
                return <BarChart3 className="h-5 w-5 text-green-500" />;
            default:
                return <Bell className="h-5 w-5" />;
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    return (
        <div className="relative">
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <Badge
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Panel */}
                    <Card className="absolute right-0 top-12 w-96 max-h-[600px] z-50 shadow-lg">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                <h3 className="font-semibold">Notifications</h3>
                                {unreadCount > 0 && (
                                    <Badge variant="secondary">{unreadCount} new</Badge>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Notifications List */}
                        <ScrollArea className="h-[400px]">
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                    <Bell className="h-12 w-12 mb-2 opacity-20" />
                                    <p className="text-sm">No notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-4 cursor-pointer hover:bg-accent transition-colors ${!notification.read ? 'bg-accent/50' : ''
                                                }`}
                                        >
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 mt-1">
                                                    {getIcon(notification.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <p className="font-medium text-sm">
                                                            {notification.title}
                                                        </p>
                                                        {!notification.read && (
                                                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-2">
                                                        {formatTimestamp(notification.timestamp)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-3 border-t">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleClearAll}
                                    className="w-full"
                                >
                                    Clear All
                                </Button>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};
