import { Activity } from "@/types/asset";
import { logger } from "@/lib/logger";
import { dataService } from "@/services/dataService";

/**
 * Activity Logger - Database-backed
 * Uses dataService for platform-agnostic logging (Supabase/Electron)
 */

export const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp' | 'userName'>): Promise<void> => {
  try {
    // Get current user from localStorage (session data)
    const currentUserData = localStorage.getItem('currentUser');
    let userName = 'Unknown User';
    if (currentUserData) {
      try {
        const currentUser = JSON.parse(currentUserData);
        userName = currentUser.name || currentUser.username || 'Unknown User';
      } catch (error) {
        logger.error('Error parsing current user data', error);
      }
    }

    const newActivity: Partial<Activity> = {
      ...activity,
      userName, // Add current username
    };

    // Save to database via unified dataService
    await dataService.activities.createActivity({
      ...newActivity,
      timestamp: new Date()
    });

  } catch (error) {
    logger.error('Failed to log activity', error);
  }
};

export const getActivities = async (): Promise<Activity[]> => {
  try {
    return await dataService.activities.getActivities();
  } catch (error) {
    logger.error('Failed to get activities', error);
    return [];
  }
};

export const clearActivities = async (): Promise<void> => {
  try {
    await dataService.activities.clearActivities();
  } catch (error) {
    logger.error('Failed to clear activities', error);
  }
};

export const exportActivitiesToTxt = async (): Promise<string> => {
  const activities = await getActivities();
  if (activities.length === 0) return "No activities logged.";

  let txt = "Inventory Activity Log\n";
  txt += "======================\n\n";

  activities.forEach(activity => {
    const date = activity.timestamp.toLocaleString();
    txt += `[${date}] User: ${activity.userName || activity.userId || 'System'}\n`;
    txt += `Action: ${activity.action} on ${activity.entity}${activity.entityId ? ` (${activity.entityId})` : ''}\n`;
    txt += `Details: ${activity.details || 'N/A'}\n\n`;
  });

  return txt;
};
