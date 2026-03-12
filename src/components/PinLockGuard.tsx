import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PinLockScreen } from '@/components/PinLockScreen';

const PIN_UNLOCKED_KEY = 'pin_unlocked';

/**
 * Wraps children with a PIN lock screen.
 * On app reopen (sessionStorage cleared), if the user has a PIN set,
 * the lock screen is shown until the correct PIN is entered.
 */
export const PinLockGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, currentUser, logout } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) {
      setChecking(false);
      setIsLocked(false);
      return;
    }

    // If already unlocked this session, skip
    if (sessionStorage.getItem(PIN_UNLOCKED_KEY) === 'true') {
      setChecking(false);
      setIsLocked(false);
      return;
    }

    const checkPin = async () => {
      const userId = currentUser.id;
      const statusKey = `pin_status_${userId}`;
      const hashKey = `pin_hash_${userId}`;

      const cachedStatus = localStorage.getItem(statusKey);
      const cachedHash = localStorage.getItem(hashKey);

      // Optimistic check: if we know they have a PIN, lock immediately
      if (cachedStatus === 'enabled' || cachedHash) {
        setIsLocked(true);
        setChecking(false);
        // We can still try to refresh in background if we want, but for now just trust cache to be fast
      }

      try {
        // Check PIN status via server-side edge function (never fetch pin_hash to client)
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const edgeFunctionUrl = `https://${projectId}.supabase.co/functions/v1/auth`;
        const resp = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
          },
          body: JSON.stringify({ action: 'check-pin-status', userId }),
        });
        const result = await resp.json();

        if (result.hasPinSet) {
          // PIN is enabled
          localStorage.setItem(statusKey, 'enabled');
          setIsLocked(true);
        } else {
          // No PIN set
          localStorage.setItem(statusKey, 'disabled');
          localStorage.removeItem(hashKey);

          // Server confirms no PIN, so we unlock regardless of optimistic state
          sessionStorage.setItem(PIN_UNLOCKED_KEY, 'true');
          setIsLocked(false);
        }
      } catch (err) {
        // Offline or error
        console.warn('Error checking PIN status:', err);

        // FALLBACK LOGIC
        if (cachedStatus === 'disabled') {
          // we know they don't have one
          sessionStorage.setItem(PIN_UNLOCKED_KEY, 'true');
          setIsLocked(false);
        } else {
          // If 'enabled' or UNKNOWN, we MUST LOCK to prevent bypass.
          // Even if unknown, it's safer to lock.
          setIsLocked(true);
        }
      } finally {
        setChecking(false);
      }
    };

    checkPin();
  }, [isAuthenticated, currentUser?.id]);

  const handleUnlock = () => {
    sessionStorage.setItem(PIN_UNLOCKED_KEY, 'true');
    setIsLocked(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(PIN_UNLOCKED_KEY);
    logout();
  };

  if (checking && isAuthenticated) {
    // Show nothing while checking PIN status to avoid flash
    return null;
  }

  if (isLocked && isAuthenticated) {
    return (
      <PinLockScreen
        onUnlock={handleUnlock}
        onLogout={handleLogout}
        userName={currentUser?.name}
        avatarLetter={currentUser?.name?.charAt(0)?.toUpperCase()}
      />
    );
  }

  return <>{children}</>;
};
