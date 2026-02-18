/**
 * Email Notification Service
 * 
 * This service handles sending email notifications to users.
 * It integrates with your backend email service (e.g., SendGrid, AWS SES, or Supabase Edge Functions)
 */

interface EmailNotificationPayload {
    to: string;
    subject: string;
    body: string;
    type: 'low_stock' | 'waybill_status' | 'weekly_report' | 'general';
    data?: any;
}

/**
 * Send email notification via backend
 */
export const sendEmailNotification = async (payload: EmailNotificationPayload): Promise<boolean> => {
    try {
        // TODO: Replace with your actual email service endpoint
        // Option 1: Supabase Edge Function
        // Option 2: Your own backend API
        // Option 3: Direct integration with email service

        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        return response.ok;
    } catch (error) {
        console.error('Failed to send email notification:', error);
        return false;
    }
};

/**
 * Send low stock alert email
 */
export const sendLowStockEmail = async (
    userEmail: string,
    userName: string,
    lowStockItems: Array<{ name: string; quantity: number; threshold: number }>
) => {
    const itemsList = lowStockItems
        .map(item => `- ${item.name}: ${item.quantity} remaining (threshold: ${item.threshold})`)
        .join('\n');

    const subject = `Low Stock Alert - ${lowStockItems.length} Item(s) Running Low`;
    const body = `
Hello ${userName},

This is an automated notification to inform you that the following items are running low on stock:

${itemsList}

Please review your inventory and restock as needed.

You can view the full inventory here: [Your App URL]/inventory?filter=low-stock

---
This is an automated message from DCEL Inventory Management System.
To manage your notification preferences, visit your profile settings.
  `.trim();

    return sendEmailNotification({
        to: userEmail,
        subject,
        body,
        type: 'low_stock',
        data: { items: lowStockItems }
    });
};

/**
 * Send waybill status update email
 */
export const sendWaybillStatusEmail = async (
    userEmail: string,
    userName: string,
    waybillNumber: string,
    oldStatus: string,
    newStatus: string
) => {
    const subject = `Waybill ${waybillNumber} Status Update`;
    const body = `
Hello ${userName},

Waybill ${waybillNumber} status has been updated:

Previous Status: ${oldStatus}
New Status: ${newStatus}

You can view the waybill details here: [Your App URL]/waybills?id=${waybillNumber}

---
This is an automated message from DCEL Inventory Management System.
To manage your notification preferences, visit your profile settings.
  `.trim();

    return sendEmailNotification({
        to: userEmail,
        subject,
        body,
        type: 'waybill_status',
        data: { waybillNumber, oldStatus, newStatus }
    });
};

/**
 * Send weekly report email
 */
export const sendWeeklyReportEmail = async (
    userEmail: string,
    userName: string,
    reportData: {
        totalAssets: number;
        lowStockItems: number;
        activeWaybills: number;
        completedWaybills: number;
    }
) => {
    const subject = `Weekly Inventory Report - Week of ${new Date().toLocaleDateString()}`;
    const body = `
Hello ${userName},

Here's your weekly inventory summary:

📦 Total Assets: ${reportData.totalAssets}
⚠️  Low Stock Items: ${reportData.lowStockItems}
🚚 Active Waybills: ${reportData.activeWaybills}
✅ Completed Waybills: ${reportData.completedWaybills}

View the full report here: [Your App URL]/reports?type=weekly

---
This is an automated message from DCEL Inventory Management System.
To manage your notification preferences, visit your profile settings.
  `.trim();

    return sendEmailNotification({
        to: userEmail,
        subject,
        body,
        type: 'weekly_report',
        data: reportData
    });
};

/**
 * Batch send emails to multiple users
 * Only sends to users who have email notifications enabled
 */
export const batchSendEmails = async (
    users: Array<{ email: string; name: string; preferences?: any }>,
    emailType: 'low_stock' | 'waybill_status' | 'weekly_report',
    emailData: any
) => {
    const results = await Promise.allSettled(
        users
            .filter(user => {
                // Check if user has email notifications enabled
                return user.preferences?.emailNotifications === true;
            })
            .map(async user => {
                switch (emailType) {
                    case 'low_stock':
                        return sendLowStockEmail(user.email, user.name, emailData.items);
                    case 'waybill_status':
                        return sendWaybillStatusEmail(
                            user.email,
                            user.name,
                            emailData.waybillNumber,
                            emailData.oldStatus,
                            emailData.newStatus
                        );
                    case 'weekly_report':
                        return sendWeeklyReportEmail(user.email, user.name, emailData);
                    default:
                        return false;
                }
            })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - successful;

    return { successful, failed, total: results.length };
};
