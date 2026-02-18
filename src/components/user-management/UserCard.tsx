import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { User } from '@/contexts/AuthContext';
import { AvatarGenerator } from './AvatarGenerator';
import { LastActiveStatus } from './LastActiveStatus';
import { Edit, Trash2, History, Clock, MoreVertical } from 'lucide-react';

export interface UserCardProps {
  user: User;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
  onViewActivity?: () => void;
  onViewLoginHistory?: () => void;
  onMoreOptions?: () => void;
  isCurrentUser?: boolean;
}

const getRoleColor = (role: string | undefined): string => {
  switch (role) {
    case 'admin':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'data_entry_supervisor':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'regulatory':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'manager':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'staff':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'site_worker':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getRoleLabel = (role: string | undefined): string => {
  if (!role) return 'Unknown Role';
  return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  onDeactivate,
  onActivate,
  onViewActivity,
  onViewLoginHistory,
  onMoreOptions,
  isCurrentUser = false
}) => {
  return (
    <Card className={`p-4 transition-all duration-200 ${
      isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-lg'
    }`}>
      {/* Header with avatar and status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox for bulk selection */}
          {onSelect && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              className="mt-1"
            />
          )}

          {/* Avatar */}
          <AvatarGenerator
            name={user.name}
            size="md"
            avatarColor={user.avatarColor}
            className="flex-shrink-0"
          />

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm truncate">{user.name}</h3>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">You</Badge>
              )}
              {user.status === 'pending_invite' && (
                <Badge variant="outline" className="text-xs">Pending</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          </div>

          {/* More options menu */}
          {onMoreOptions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={onMoreOptions}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Role Badge */}
      <div className="mb-4">
        <Badge className={`${getRoleColor(user.role)} border`}>
          {getRoleLabel(user.role)}
          {user.role && user.role === 'admin' && ' ✨'}
        </Badge>
      </div>

      {/* Activity Status */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <LastActiveStatus
          lastActive={user.lastActive}
          isOnline={user.isOnline}
          showLabel={true}
        />
      </div>

      {/* Metadata */}
      {(user.email || user.phone) && (
        <div className="mb-4 space-y-1 text-xs text-muted-foreground">
          {user.email && (
            <div className="truncate" title={user.email}>
              📧 {user.email}
            </div>
          )}
          {user.phone && (
            <div className="truncate" title={user.phone}>
              📱 {user.phone}
            </div>
          )}
        </div>
      )}

      {/* Account Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Status:</span>
          <span className={`font-medium ${
            user.status === 'active' ? 'text-green-600' :
            user.status === 'inactive' ? 'text-red-600' :
            'text-yellow-600'
          }`}>
            {(user.status || 'active').replace('_', ' ')}
          </span>
        </div>
        {user.isLocked && (
          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
            🔒 Account locked
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="w-full text-xs"
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
          {user.status === 'active' && onDeactivate && user.id !== 'admin' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onDeactivate}
              className="w-full text-xs"
            >
              🔒 Deactivate
            </Button>
          )}
          {user.status === 'inactive' && onActivate && (
            <Button
              size="sm"
              variant="outline"
              onClick={onActivate}
              className="w-full text-xs"
            >
              🔓 Activate
            </Button>
          )}
          {onDelete && user.id !== 'admin' && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onDelete}
              className="w-full text-xs text-[10px]"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          {onViewActivity && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewActivity}
              className="w-full text-xs h-8"
            >
              <History className="h-3 w-3 mr-1" />
              Activity
            </Button>
          )}
          {onViewLoginHistory && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onViewLoginHistory}
              className="w-full text-xs h-8"
            >
              <Clock className="h-3 w-3 mr-1" />
              Sessions
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default UserCard;
