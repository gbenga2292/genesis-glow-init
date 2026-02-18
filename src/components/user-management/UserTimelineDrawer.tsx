import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Activity } from '@/types/asset';
import { formatDistanceToNow } from 'date-fns';
import { History } from 'lucide-react';

export interface UserTimelineDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
  allActivities?: Activity[];
}

export const UserTimelineDrawer: React.FC<UserTimelineDrawerProps> = ({
  open,
  onOpenChange,
  userId,
  userName = 'User',
  allActivities = []
}) => {
  const [userActivities, setUserActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (open) {
      // Filter activities for this user
      const filtered = allActivities.filter(
        activity => activity.userId === userId || activity.entityId === userId
      );
      setUserActivities(filtered);
    }
  }, [open, userId, allActivities]);

  const getActionBadgeColor = (action: string): string => {
    switch (action) {
      case 'login':
      case 'logout':
        return 'bg-blue-100 text-blue-800';
      case 'create':
      case 'add':
        return 'bg-green-100 text-green-800';
      case 'update':
      case 'edit':
        return 'bg-yellow-100 text-yellow-800';
      case 'delete':
      case 'remove':
        return 'bg-red-100 text-red-800';
      case 'export':
      case 'import':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'login':
        return '🔓';
      case 'logout':
        return '🔒';
      case 'create':
      case 'add':
        return '➕';
      case 'update':
      case 'edit':
        return '✏️';
      case 'delete':
      case 'remove':
        return '🗑️';
      case 'export':
        return '📤';
      case 'import':
        return '📥';
      default:
        return '📋';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Activity Timeline - {userName}
          </DialogTitle>
          <DialogDescription>
            Chronological view of all actions performed by this user
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {userActivities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activities found for this user
            </div>
          ) : (
            <div className="space-y-4">
              {userActivities.map((activity, idx) => (
                <div
                  key={activity.id || idx}
                  className="relative pb-4 before:absolute before:left-[11px] before:top-8 before:bottom-0 before:w-0.5 before:bg-gray-200 last:before:hidden"
                >
                  {/* Timeline dot */}
                  <div className="flex items-start gap-4">
                    <div className="relative z-10 flex-shrink-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-gray-200">
                        <span className="text-sm">{getActionIcon(activity.action)}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="space-y-1">
                        {/* Action and entity */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionBadgeColor(activity.action)}`}>
                            {activity.action.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            on <span className="font-medium">{activity.entity}</span>
                          </span>
                        </div>

                        {/* Details */}
                        {activity.details && (
                          <p className="text-sm text-muted-foreground">
                            {activity.details}
                          </p>
                        )}

                        {/* Timestamp */}
                        <time className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true
                          })}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {userActivities.length > 0 && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Showing {userActivities.length} activities
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserTimelineDrawer;
