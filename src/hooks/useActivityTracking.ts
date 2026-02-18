import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to track user activity and update lastActive timestamp
 * Updates lastActive every 5 minutes when user is actively using the app
 */
export const useActivityTracking = () => {
  const { currentUser, updateLastActive } = useAuth();
  const lastUpdateRef = useRef<number>(0);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;

    // Function to update last active
    const recordActivity = async () => {
      const now = Date.now();
      // Only update if 5 minutes have passed since last update
      if (now - lastUpdateRef.current > 5 * 60 * 1000) {
        try {
          await updateLastActive(currentUser.id);
          lastUpdateRef.current = now;
        } catch (error) {
          console.error('Failed to update last active:', error);
        }
      }
    };

    // Record activity on mount
    recordActivity();

    // Track user activity through mouse, keyboard, and page visibility
    let isActive = true;

    const handleActivity = () => {
      if (!isActive) {
        isActive = true;
        recordActivity();
      }
      // Reset inactivity timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      activityTimeoutRef.current = setTimeout(() => {
        isActive = false;
      }, 15 * 60 * 1000); // Mark as inactive after 15 minutes of no activity
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User came back to the tab
        recordActivity();
      }
    };

    // Add event listeners for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic update every 5 minutes regardless of activity
    trackingIntervalRef.current = setInterval(() => {
      recordActivity();
    }, 5 * 60 * 1000);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [currentUser?.id, updateLastActive]);
};

export default useActivityTracking;
