import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, UserRole } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Activity, Employee } from '@/types/asset';
import {
  Users, UserPlus, Mail, Lock, Search, Edit, Trash2, History, Clock, X, Save, Loader2
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveAs } from 'file-saver';
import { logActivity } from '@/utils/activityLogger';

import { PasswordStrengthMeter } from '@/components/user-management/PasswordStrengthMeter';
import { AvatarGenerator } from '@/components/user-management/AvatarGenerator';
import { UserCard } from '@/components/user-management/UserCard';
import { LoginHistoryDrawer } from '@/components/user-management/LoginHistoryDrawer';
import { UserTimelineDrawer } from '@/components/user-management/UserTimelineDrawer';
import { RolePermissionsManager } from '@/components/user-management/RolePermissionsManager';
import { BulkActionsBar } from '@/components/user-management/BulkActionsBar';
import { InviteFlow } from '@/components/user-management/InviteFlow';

export interface EnhancedUserManagementProps {
  users: User[];
  onUsersChange: (users: User[]) => void;
  employees: Employee[];
  activities: Activity[];
  onSave: () => void;
  isLoading?: boolean;
}

export const EnhancedUserManagement: React.FC<EnhancedUserManagementProps> = ({
  users,
  onUsersChange,
  employees,
  activities,
  onSave,
  isLoading = false
}) => {
  const { toast } = useToast();
  const { createUser, updateUser, deleteUser, getUsers } = useAuth();
  const isMobile = useIsMobile();

  // State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedLoginHistoryUserId, setSelectedLoginHistoryUserId] = useState<string | null>(null);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [selectedTimelineUserId, setSelectedTimelineUserId] = useState<string | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isRolePermissionsOpen, setIsRolePermissionsOpen] = useState(false);
  const [isInviteFlowOpen, setIsInviteFlowOpen] = useState(false);
  const [useCardLayout, setUseCardLayout] = useState(true);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Confirmation dialogs state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'deactivate' | 'activate' | 'delete' | null>(null);
  const [confirmDialogUserId, setConfirmDialogUserId] = useState<string | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Form state for create/edit
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('staff');

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) {
      return users;
    }
    const query = userSearchQuery.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      (user.role ? user.role.toLowerCase().includes(query) : false) ||
      (user.email?.toLowerCase().includes(query))
    );
  }, [users, userSearchQuery]);

  // Handlers
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUserId(userId);
      setEditUserName(user.name);
      setEditUserUsername(user.username);
      setEditUserPassword('');
      setEditUserRole(user.role as UserRole);
      setEditUserEmail(user.email || '');
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    const result = await createUser({
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      password: newUserPassword.trim(),
      role: newUserRole
    });

    if (result.success) {
      const fetchedUsers = await getUsers();
      onUsersChange(fetchedUsers);
      toast({
        title: 'Success',
        description: 'User created successfully'
      });
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserEmail('');
      setNewUserRole('staff');
      setIsAddUserDialogOpen(false);
      await logActivity({
        action: 'create_user',
        entity: 'user',
        details: `Created user ${newUserUsername}`
      });
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Failed to create user',
        variant: 'destructive'
      });
    }
  };

  const handleSaveUserEdit = async () => {
    if (!editingUserId || !editUserName.trim() || !editUserUsername.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields',
        variant: 'destructive'
      });
      return;
    }

    const updateData: any = {
      name: editUserName.trim(),
      username: editUserUsername.trim(),
      role: editUserRole,
    };

    if (editUserPassword.trim()) {
      updateData.password = editUserPassword.trim();
    }

    const result = await updateUser(editingUserId, updateData);

    if (result.success) {
      const fetchedUsers = await getUsers();
      onUsersChange(fetchedUsers);
      toast({
        title: 'Success',
        description: 'User updated successfully'
      });
      handleCancelUserEdit();
      setIsAddUserDialogOpen(false);
      await logActivity({
        action: 'update_user',
        entity: 'user',
        entityId: editingUserId,
        details: `Updated user ${editUserUsername}`
      });
    } else {
      toast({
        title: 'Error',
        description: result.message || 'Failed to update user',
        variant: 'destructive'
      });
    }
  };

  const openConfirmDialog = (type: 'deactivate' | 'activate' | 'delete', userId: string) => {
    if (userId === 'admin' && (type === 'deactivate' || type === 'delete')) {
      toast({
        title: 'Error',
        description: `Cannot ${type} the admin user`,
        variant: 'destructive'
      });
      return;
    }
    setConfirmDialogType(type);
    setConfirmDialogUserId(userId);
    setConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmDialogUserId || !confirmDialogType) return;

    setIsConfirmLoading(true);
    try {
      const user = users.find(u => u.id === confirmDialogUserId);
      if (!user) return;

      let result;
      if (confirmDialogType === 'deactivate') {
        result = await updateUser(confirmDialogUserId, { status: 'inactive' });
      } else if (confirmDialogType === 'activate') {
        result = await updateUser(confirmDialogUserId, { status: 'active' });
      } else if (confirmDialogType === 'delete') {
        result = await deleteUser(confirmDialogUserId);
      }

      if (result?.success) {
        const fetchedUsers = await getUsers();
        onUsersChange(fetchedUsers);

        const messages = {
          deactivate: 'User deactivated successfully',
          activate: 'User reactivated successfully',
          delete: 'User deleted permanently'
        };

        toast({
          title: 'Success',
          description: messages[confirmDialogType]
        });

        const actions = {
          deactivate: 'update',
          activate: 'update',
          delete: 'delete_user'
        };

        await logActivity({
          action: actions[confirmDialogType] as any,
          entity: 'user',
          entityId: confirmDialogUserId,
          details: `${confirmDialogType.charAt(0).toUpperCase() + confirmDialogType.slice(1)} user ${user.username}`
        });
      } else {
        toast({
          title: 'Error',
          description: result?.message || `Failed to ${confirmDialogType} user`,
          variant: 'destructive'
        });
      }
    } finally {
      setIsConfirmLoading(false);
      setConfirmDialogOpen(false);
      setConfirmDialogType(null);
      setConfirmDialogUserId(null);
    }
  };

  const handleDeactivateUser = (userId: string) => {
    openConfirmDialog('deactivate', userId);
  };

  const handleActivateUser = (userId: string) => {
    openConfirmDialog('activate', userId);
  };

  const handleDeleteUser = (userId: string) => {
    openConfirmDialog('delete', userId);
  };

  const handleCancelUserEdit = () => {
    setEditingUserId(null);
    setEditUserName('');
    setEditUserUsername('');
    setEditUserPassword('');
    setEditUserRole('staff');
    setEditUserEmail('');
  };

  return (
    <div className="space-y-4 md:space-y-6 mt-4">
      {/* Header with Title and Actions */}
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => {
                // Reset form for new user
                handleCancelUserEdit();
                setIsAddUserDialogOpen(true);
              }} className="gap-2" size={isMobile ? "sm" : "default"}>
                <UserPlus className="h-4 w-4" />
                Add User
              </Button>
              <Button
                variant="secondary"
                className="gap-2"
                size={isMobile ? "sm" : "default"}
                onClick={() => setIsInviteFlowOpen(true)}
              >
                <Mail className="h-4 w-4" />
                Send Invite
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsRolePermissionsOpen(true)}
                size={isMobile ? "sm" : "default"}
              >
                <Lock className="h-4 w-4 mr-1" />
                Roles
              </Button>
              <Button
                variant="outline"
                onClick={() => setUseCardLayout(!useCardLayout)}
                size={isMobile ? "sm" : "default"}
              >
                {useCardLayout ? '📋 Table' : '🎴 Cards'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Search and Filter */}
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, username, role, or email..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
              {userSearchQuery && ` (filtered from ${users.length})`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Users Display */}
      {users.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto opacity-30 mb-4" />
            <p className="text-muted-foreground mb-4">No users created yet</p>
            <Button onClick={() => setIsAddUserDialogOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create First User
            </Button>
          </CardContent>
        </Card>
      ) : useCardLayout ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <UserCard
              key={user.id}
              user={user}
              isSelected={selectedUserIds.has(user.id)}
              onSelect={(checked) => handleSelectUser(user.id, checked)}
              onEdit={() => {
                handleEditUser(user.id);
                setIsAddUserDialogOpen(true);
              }}
              onDeactivate={() => handleDeactivateUser(user.id)}
              onActivate={() => handleActivateUser(user.id)}
              onDelete={() => handleDeleteUser(user.id)}
              onViewActivity={() => {
                setSelectedTimelineUserId(user.id);
                setIsTimelineOpen(true);
              }}
              onViewLoginHistory={() => {
                setSelectedLoginHistoryUserId(user.id);
                setIsLoginHistoryOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
                        } else {
                          setSelectedUserIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} className={selectedUserIds.has(user.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <AvatarGenerator name={user.name} size="sm" />
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>@{user.username}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            handleEditUser(user.id);
                            setIsAddUserDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedLoginHistoryUserId(user.id);
                            setIsLoginHistoryOpen(true);
                          }}
                        >
                          <Clock className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedTimelineUserId(user.id);
                            setIsTimelineOpen(true);
                          }}
                        >
                          <History className="h-3 w-3" />
                        </Button>
                        {user.status === 'active' && user.id !== 'admin' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            title="Deactivate user"
                            onClick={() => handleDeactivateUser(user.id)}
                          >
                            🔒
                          </Button>
                        )}
                        {user.status === 'inactive' && (
                          <Button
                            size="sm"
                            variant="outline"
                            title="Activate user"
                            onClick={() => handleActivateUser(user.id)}
                          >
                            🔓
                          </Button>
                        )}
                        {user.id !== 'admin' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            title="Permanently delete"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmDialogType === 'deactivate' && '🔒 Deactivate User'}
              {confirmDialogType === 'activate' && '🔓 Reactivate User'}
              {confirmDialogType === 'delete' && '⚠️ Delete User Permanently'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialogType === 'deactivate' && 'The user will not be able to log in to the system.'}
              {confirmDialogType === 'activate' && 'The user will be able to log in again.'}
              {confirmDialogType === 'delete' && 'This action cannot be undone. All user data will be permanently removed.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isConfirmLoading}
            >
              Cancel
            </Button>
            <Button
              variant={confirmDialogType === 'delete' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={isConfirmLoading}
            >
              {isConfirmLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialogType === 'deactivate' && 'Deactivate'}
              {confirmDialogType === 'activate' && 'Reactivate'}
              {confirmDialogType === 'delete' && 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedUserIds.size}
        totalCount={users.length}
        selectedUserIds={selectedUserIds}
        onDeleteSelected={async (userIds) => {
          for (const userId of userIds) {
            await handleDeleteUser(userId);
          }
          setSelectedUserIds(new Set());
          const updatedUsers = await getUsers();
          onUsersChange(updatedUsers);
        }}
        onExportSelected={async (userIds) => {
          const selectedUsers = users.filter(u => userIds.includes(u.id));
          const csv = [
            ['Name', 'Username', 'Email', 'Phone', 'Role', 'Status'].join(','),
            ...selectedUsers.map(u => [
              `"${u.name}"`,
              `"${u.username}"`,
              `"${u.email || ''}"`,
              `"${u.phone || ''}"`,
              `"${u.role}"`,
              `"${u.status}"`
            ].join(','))
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          saveAs(blob, `users-export-${new Date().toISOString().split('T')[0]}.csv`);
          toast({
            title: 'Success',
            description: `Exported ${selectedUsers.length} user(s)`
          });
        }}
      />

      {/* Create/Edit User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent className="sm:max-w-md w-full h-screen sm:h-auto flex flex-col p-0 sm:p-6 gap-0 bg-background">
          <DialogHeader className="px-6 py-4 border-b sm:border-0 sticky top-0 bg-background z-10 flex flex-row items-center justify-between space-y-0 text-left">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {editingUserId ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {editingUserId ? 'Update user details below.' : 'Enter details for the new user.'}
              </DialogDescription>
            </div>
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setIsAddUserDialogOpen(false)} className="-mr-2">
                <X className="h-5 w-5" />
              </Button>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* User Name/Employee Select */}
            <div className="space-y-2">
              <Label htmlFor="employee-select">Name/Employee</Label>
              <Select
                value={editingUserId ? editUserName : newUserName}
                onValueChange={(value) => editingUserId ? setEditUserName(value) : setNewUserName(value)}
              >
                <SelectTrigger id="employee-select" className="w-full">
                  <SelectValue placeholder="Select or Enter Name" />
                </SelectTrigger>
                <SelectContent>
                  {employees.filter(employee => employee.status === 'active').map(employee => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editingUserId ? editUserUsername : newUserUsername}
                onChange={(e) => editingUserId ? setEditUserUsername(e.target.value) : setNewUserUsername(e.target.value)}
                placeholder="johndoe"
                autoComplete="off"
              />
            </div>

            {/* Password with Strength Meter */}
            {!editingUserId && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                </div>

                {newUserPassword && (
                  <PasswordStrengthMeter password={newUserPassword} showLabel={true} />
                )}
              </>
            )}

            {editingUserId && (
              <div className="space-y-2">
                <Label htmlFor="password-edit">New Password (leave blank to keep unchanged)</Label>
                <Input
                  id="password-edit"
                  type="password"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {editUserPassword && (
                  <PasswordStrengthMeter password={editUserPassword} showLabel={true} />
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={editingUserId ? editUserEmail : newUserEmail}
                onChange={(e) => editingUserId ? setEditUserEmail(e.target.value) : setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={editingUserId ? editUserRole : newUserRole}
                onValueChange={(value: UserRole) => editingUserId ? setEditUserRole(value) : setNewUserRole(value)}
              >
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">👑 Admin</SelectItem>
                  <SelectItem value="data_entry_supervisor">👔 Data Entry Supervisor</SelectItem>
                  <SelectItem value="regulatory">📋 Regulatory</SelectItem>
                  <SelectItem value="manager">💼 Manager</SelectItem>
                  <SelectItem value="staff">👤 Staff</SelectItem>
                  <SelectItem value="site_worker">🏗️ Site Worker</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preset roles with predefined permissions
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t sm:border-0 bg-background sticky bottom-0 z-10 gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setIsAddUserDialogOpen(false);
                handleCancelUserEdit();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={editingUserId ? handleSaveUserEdit : handleCreateUser}
            >
              {editingUserId ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Login History Drawer */}
      {selectedLoginHistoryUserId && (
        <LoginHistoryDrawer
          open={isLoginHistoryOpen}
          onOpenChange={setIsLoginHistoryOpen}
          userId={selectedLoginHistoryUserId}
          userName={users.find(u => u.id === selectedLoginHistoryUserId)?.name}
        />
      )}

      {/* User Timeline Drawer */}
      {selectedTimelineUserId && (
        <UserTimelineDrawer
          open={isTimelineOpen}
          onOpenChange={setIsTimelineOpen}
          userId={selectedTimelineUserId}
          userName={users.find(u => u.id === selectedTimelineUserId)?.name}
          allActivities={activities}
        />
      )}

      {/* Role Management Dialog */}
      <RolePermissionsManager
        open={isRolePermissionsOpen}
        onOpenChange={setIsRolePermissionsOpen}
      />

      {/* Invite Flow Dialog */}
      <InviteFlow
        open={isInviteFlowOpen}
        onOpenChange={setIsInviteFlowOpen}
        onInviteSent={(email) => {
          toast({
            title: 'Invite Sent',
            description: `Invite link sent to ${email}`
          });
        }}
      />

      <div className="flex justify-end">
        <Button
          onClick={onSave}
          className="bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default EnhancedUserManagement;
