import React, { useState, useEffect } from 'react';
import { Sparkles, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { cn } from '@/lib/utils';

// NOTE: This component is mounted outside <HashRouter> in App.tsx,
// so we cannot use useNavigate(). We navigate via window.location.hash instead.

interface UpdateNotificationBannerProps {
  className?: string;
}

/**
 * Non-invasive update notification popup.
 * 
 * Behaviour:
 * - Appears as a small floating card in the bottom-right corner.
 * - Does NOT block any UI or require immediate action.
 * - User can dismiss it entirely (it won't show again this session).
 * - "Go to Settings" button navigates them to the update page.
 * - Animates in smoothly after a short delay once update is detected.
 */
export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({
  className
}) => {
  const { available, downloaded, updateInfo, dismissUpdate, platform } = useAppUpdate();

  // Once dismissed this session, don't show again even if hook re-triggers
  const [dismissed, setDismissed] = useState(false);
  // Animate in with a slight delay so it doesn't feel jarring
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ((available || downloaded) && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [available, downloaded, dismissed]);

  // Don't render for web (no native updates) or if dismissed
  if (platform === 'web' || dismissed || (!available && !downloaded)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    dismissUpdate();
  };

  const handleGoToSettings = () => {
    // Index.tsx reads 'pending_active_tab' from sessionStorage on mount to set its activeTab.
    // We use the same mechanism here since this component lives outside <HashRouter>.
    try {
      sessionStorage.setItem('pending_active_tab', 'settings');
    } catch (_) { /* ignore if storage is unavailable */ }
    // Navigate to root — Index.tsx will pick up the pending tab and switch to settings
    window.location.hash = '#/';
  };

  return (
    <div
      className={cn(
        // Fixed position — bottom right, above any navigation
        'fixed bottom-6 right-6 z-50',
        // Card style
        'flex flex-col gap-2 p-4 rounded-xl shadow-2xl',
        'bg-card border border-border/60',
        'max-w-xs w-full',
        // Glassmorphism touch
        'backdrop-blur-sm bg-card/95',
        // Smooth slide-up animation
        'transition-all duration-500 ease-out',
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/15">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {downloaded ? 'Update Ready!' : 'Update Available'}
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              {updateInfo?.version
                ? `v${updateInfo.version} is ready`
                : 'A new version is available'}
            </p>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md hover:bg-muted transition-colors shrink-0"
          aria-label="Dismiss update notification"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Subtle separator */}
      <div className="border-t border-border/40" />

      {/* Action */}
      <Button
        size="sm"
        variant="default"
        onClick={handleGoToSettings}
        className="h-8 text-xs gap-1.5 w-full"
      >
        <Settings className="h-3 w-3" />
        Go to Settings to Update
      </Button>
    </div>
  );
};
