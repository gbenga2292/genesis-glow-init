import React, { useMemo, useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

export interface LastActiveStatusProps {
  lastActive?: string | Date;
  isOnline?: boolean;
  showLabel?: boolean;
  className?: string;
}

const getTimeAgo = (date: string | Date): string => {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Never';
  }
};

export const LastActiveStatus: React.FC<LastActiveStatusProps> = ({
  lastActive,
  isOnline = false,
  showLabel = true,
  className = ''
}) => {
  const [, setUpdateTrigger] = useState(0);

  useEffect(() => {
    // Force re-render every minute to update relative dates
    const interval = setInterval(() => {
      setUpdateTrigger(prev => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const timeAgo = useMemo(() => {
    if (!lastActive) return 'Never';
    return getTimeAgo(lastActive);
  }, [lastActive]);

  const isRecent = useMemo(() => {
    if (!lastActive) return false;
    const d = typeof lastActive === 'string' ? new Date(lastActive) : lastActive;
    const now = new Date();
    const diffMinutes = (now.getTime() - d.getTime()) / (1000 * 60);
    return diffMinutes < 5; // Consider "online" if active within last 5 minutes
  }, [lastActive]);

  const actualOnline = isOnline || isRecent;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status dot */}
      <div className="relative inline-block">
        <div
          className={`w-2 h-2 rounded-full ${
            actualOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        {actualOnline && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        )}
      </div>

      {/* Status text */}
      {showLabel && (
        <div className="flex flex-col gap-0">
          <span className="text-xs font-medium">
            {actualOnline ? 'Online' : 'Last Active'}
          </span>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      )}
    </div>
  );
};

export default LastActiveStatus;
