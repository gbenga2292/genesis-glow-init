import { Activity } from "@/types/asset";
import { logger } from "@/lib/logger";

/**
 * Activity Logger - Database-backed
 * All activities are now stored in the SQLite database instead of localStorage
 */

export const logActivity = async (activity: Omit<Activity, 'id' | 'timestamp' | 'userName'>): Promise<void> => {
  if (!window.db) {
    logger.warn('Database not available for activity logging');
    return;
  }

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

    const newActivity: Activity = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userName,
      ...activity
    };

    // Save to database
    await window.db.createActivity(newActivity);
  } catch (error) {
    logger.error('Failed to log activity', error);
  }
};

export const getActivities = async (): Promise<Activity[]> => {
  if (!window.db) {
    logger.warn('Database not available for getting activities');
    return [];
  }

  try {
    const activities = await window.db.getActivities();
    return activities.map((activity: any) => ({
      ...activity,
      timestamp: new Date(activity.timestamp)
    }));
  } catch (error) {
    logger.error('Failed to get activities', error);
    return [];
  }
};

export const clearActivities = async (): Promise<void> => {
  if (!window.db) {
    logger.warn('Database not available for clearing activities');
    return;
  }

  try {
    await window.db.clearActivities();
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
    txt += `[${date}] User: ${activity.userName || activity.userId}\n`;
    txt += `Action: ${activity.action} on ${activity.entity}${activity.entityId ? ` (${activity.entityId})` : ''}\n`;
    txt += `Details: ${activity.details || 'N/A'}\n\n`;
  });
  
  return txt;
};
