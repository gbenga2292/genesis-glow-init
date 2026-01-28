import React from 'react';
import { X, Sparkles, Download, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { cn } from '@/lib/utils';

interface UpdateNotificationBannerProps {
  className?: string;
}

export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({ 
  className 
}) => {
  const {
    available,
    downloading,
    downloaded,
    progress,
    updateInfo,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    platform
  } = useAppUpdate();

  // Don't show for web platform or when no update is available
  if (platform === 'web' || (!available && !downloaded)) {
    return null;
  }

  return (
    <div 
      className={cn(
        "relative flex items-center justify-between gap-3 px-4 py-2",
        "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground",
        "animate-fade-in",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium truncate">
          {downloaded 
            ? 'Update ready to install!'
            : downloading 
              ? `Downloading update... ${Math.round(progress)}%`
              : `New version ${updateInfo?.version || ''} available`}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {downloaded ? (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={installUpdate}
            className="h-7 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Restart Now
          </Button>
        ) : downloading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">{Math.round(progress)}%</span>
          </div>
        ) : platform === 'electron' ? (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={downloadUpdate}
            className="h-7 text-xs"
          >
            <Download className="mr-1 h-3 w-3" />
            Download
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="secondary"
            onClick={installUpdate}
            className="h-7 text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Update
          </Button>
        )}

        <button
          onClick={dismissUpdate}
          className="p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
