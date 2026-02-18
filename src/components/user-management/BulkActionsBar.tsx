import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { User } from '@/contexts/AuthContext';
import { Trash2, Shield, LockOpen, Lock, Download, AlertTriangle } from 'lucide-react';

export interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  selectedUserIds: Set<string>;
  onDeactivateSelected?: (userIds: string[]) => void;
  onActivateSelected?: (userIds: string[]) => void;
  onDeleteSelected?: (userIds: string[]) => void;
  onExportSelected?: (userIds: string[]) => void;
  onBulkRoleChange?: (userIds: string[], role: string) => void;
  isLoading?: boolean;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  totalCount,
  selectedUserIds,
  onDeactivateSelected,
  onActivateSelected,
  onDeleteSelected,
  onExportSelected,
  onBulkRoleChange,
  isLoading = false
}) => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = React.useState(false);

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-40 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            {/* Selection info */}
            <div className="text-sm">
              <span className="font-semibold">{selectedCount}</span>
              <span className="text-muted-foreground ml-1">
                of {totalCount} selected
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {onActivateSelected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onActivateSelected(Array.from(selectedUserIds))}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <LockOpen className="h-4 w-4" />
                  Activate
                </Button>
              )}

              {onDeactivateSelected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeactivateConfirmOpen(true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Deactivate
                </Button>
              )}

              {onExportSelected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onExportSelected(Array.from(selectedUserIds))}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              )}

              {onDeleteSelected && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate confirmation */}
      <AlertDialog open={deactivateConfirmOpen} onOpenChange={setDeactivateConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Deactivate Users
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to deactivate <span className="font-semibold">{selectedCount}</span> user{selectedCount !== 1 ? 's' : ''}.
              They will no longer be able to log in, but their data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeactivateSelected?.(Array.from(selectedUserIds));
                setDeactivateConfirmOpen(false);
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Deactivate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Users
            </AlertDialogTitle>
            <AlertDialogDescription>
              You're about to permanently delete <span className="font-semibold">{selectedCount}</span> user{selectedCount !== 1 ? 's' : ''}.
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDeleteSelected?.(Array.from(selectedUserIds));
                setDeleteConfirmOpen(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;
