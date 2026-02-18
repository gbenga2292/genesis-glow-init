import { useEffect, useRef, useCallback } from 'react';

const TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const LAST_ACTIVITY_KEY = 'lastActivityTime';

export const useSessionTimeout = (onTimeout: () => void, isAuthenticated: boolean) => {
  const timeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateLastActivity = useCallback(() => {
    if (isAuthenticated) {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timeoutRef.current) clearInterval(timeoutRef.current);
      return;
    }

    // Set initial activity timestamp if not present
    if (!localStorage.getItem(LAST_ACTIVITY_KEY)) {
      updateLastActivity();
    }

    // Listen for user activity events
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, updateLastActivity, { passive: true }));

    // Periodically check if session has expired
    timeoutRef.current = setInterval(() => {
      const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10);
      if (lastActivity > 0 && Date.now() - lastActivity > TIMEOUT_MS) {
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        onTimeout();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      events.forEach(event => window.removeEventListener(event, updateLastActivity));
      if (timeoutRef.current) clearInterval(timeoutRef.current);
    };
  }, [isAuthenticated, onTimeout, updateLastActivity]);
};
