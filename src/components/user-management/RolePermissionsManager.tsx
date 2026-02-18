import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CustomRole, UserPermission } from '@/contexts/AuthContext';
import { Trash2, Edit2, Plus } from 'lucide-react';

export interface RolePermissionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PERMISSION_CATEGORIES = {
  assets: {
    label: 'Assets',
    permissions: [
      { id: 'read_assets', label: 'Read Assets', description: 'View all assets and inventory' },
      { id: 'write_assets', label: 'Write Assets', description: 'Create and edit assets' },
      { id: 'delete_assets', label: 'Delete Assets', description: 'Delete assets from inventory' }
    ]
  },
  waybills: {
    label: 'Waybills',
    permissions: [
      { id: 'read_waybills', label: 'Read Waybills', description: 'View waybills' },
      { id: 'write_waybills', label: 'Write Waybills', description: 'Create and edit waybills' },
      { id: 'delete_waybills', label: 'Delete Waybills', description: 'Delete waybills' }
    ]
  },
  returns: {
    label: 'Returns',
    permissions: [
      { id: 'read_returns', label: 'Read Returns', description: 'View return waybills' },
      { id: 'write_returns', label: 'Write Returns', description: 'Create and edit returns' },
      { id: 'delete_returns', label: 'Delete Returns', description: 'Delete return records' }
    ]
  },
  employees: {
    label: 'Employees',
    permissions: [
      { id: 'read_employees', label: 'Read Employees', description: 'View employee list' },
      { id: 'write_employees', label: 'Write Employees', description: 'Create and edit employees' },
      { id: 'delist_employees', label: 'Delist Employees', description: 'Deactivate employee accounts' }
    ]
  },
  settings: {
    label: 'Settings',
    permissions: [
      { id: 'edit_company_info', label: 'Edit Company Info', description: 'Modify company settings' },
      { id: 'manage_users', label: 'Manage Users', description: 'Create, edit, delete user accounts' },
      { id: 'change_theme', label: 'Change Theme', description: 'Modify application theme' }
    ]
  },
  reports: {
    label: 'Reports & Logs',
    permissions: [
      { id: 'read_reports', label: 'Read Reports', description: 'View reports and analytics' },
      { id: 'view_activity_log', label: 'View Activity Log', description: 'Access activity logs' },
      { id: 'export_data', label: 'Export Data', description: 'Export data to files' }
    ]
  }
};

interface RoleFormData {
  name: string;
  description: string;
  permissions: Set<string>;
}

export const RolePermissionsManager: React.FC<RolePermissionsManagerProps> = ({
  open,
  onOpenChange
}) => {
  const { getCustomRoles, createCustomRole, updateCustomRole, deleteCustomRole } = useAuth();
  const { toast } = useToast();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: new Set()
  });

  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open]);

  const loadRoles = async () => {
    setIsLoading(true);
    try {
      const data = await getCustomRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom roles',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Role name is required',
        variant: 'destructive'
      });
      return;
    }

    if (formData.permissions.size === 0) {
      toast({
        title: 'Validation Error',
        description: 'Select at least one permission',
        variant: 'destructive'
      });
      return;
    }

    try {
      const result = await createCustomRole({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        permissions: Array.from(formData.permissions)
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: `Role "${formData.name}" created successfully`
        });
        setFormData({ name: '', description: '', permissions: new Set() });
        setIsCreateOpen(false);
        loadRoles();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to create role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create role:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while creating the role',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (confirm('Are you sure you want to delete this role? Users assigned to this role will be affected.')) {
      try {
        const result = await deleteCustomRole(roleId);
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Role deleted successfully'
          });
          loadRoles();
        } else {
          toast({
            title: 'Error',
            description: result.message || 'Failed to delete role',
            variant: 'destructive'
          });
        }
      } catch (error) {
        console.error('Failed to delete role:', error);
        toast({
          title: 'Error',
          description: 'An error occurred while deleting the role',
          variant: 'destructive'
        });
      }
    }
  };

  const togglePermission = (permissionId: string) => {
    const newPermissions = new Set(formData.permissions);
    if (newPermissions.has(permissionId)) {
      newPermissions.delete(permissionId);
    } else {
      newPermissions.add(permissionId);
    }
    setFormData({ ...formData, permissions: newPermissions });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Role Management</DialogTitle>
          <DialogDescription>
            Create and manage custom roles with specific permissions
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Existing Roles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Existing Roles</h3>
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                New Role
              </Button>
            </div>

            <ScrollArea className="h-96 border rounded-lg">
              <div className="space-y-2 p-4">
                {isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading roles...</p>
                ) : roles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No custom roles yet</p>
                ) : (
                  roles.map(role => (
                    <div
                      key={role.id}
                      className="p-3 border rounded-lg space-y-2 hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{role.name}</h4>
                          {role.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {role.permissions.slice(0, 3).map(perm => (
                              <span key={perm} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {perm.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {role.permissions.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{role.permissions.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingRole(role)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        {!role.isPreset && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRole(role.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right: Create/Edit Form */}
          <div className="space-y-4">
            <h3 className="font-semibold">
              {isCreateOpen || editingRole ? (editingRole ? 'Edit' : 'Create') + ' Role' : 'Permissions'}
            </h3>

            {(isCreateOpen || editingRole) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Role Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Role Name */}
                  <div className="space-y-2">
                    <Label htmlFor="role-name" className="text-sm">Role Name *</Label>
                    <Input
                      id="role-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Inventory Manager"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="role-desc" className="text-sm">Description (optional)</Label>
                    <Textarea
                      id="role-desc"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe this role's purpose"
                      rows={3}
                    />
                  </div>

                  {/* Permissions */}
                  <div className="space-y-3">
                    <Label className="text-sm">Permissions *</Label>
                    <ScrollArea className="h-64 border rounded-lg p-4">
                      <div className="space-y-4">
                        {Object.entries(PERMISSION_CATEGORIES).map(([category, { label, permissions }]) => (
                          <div key={category}>
                            <h4 className="font-medium text-sm mb-2">{label}</h4>
                            <div className="space-y-2 pl-4">
                              {permissions.map(perm => (
                                <div key={perm.id} className="flex items-start gap-2">
                                  <Checkbox
                                    id={perm.id}
                                    checked={formData.permissions.has(perm.id)}
                                    onCheckedChange={() => togglePermission(perm.id)}
                                    className="mt-1"
                                  />
                                  <div className="flex-1">
                                    <Label
                                      htmlFor={perm.id}
                                      className="text-sm font-normal cursor-pointer"
                                    >
                                      {perm.label}
                                    </Label>
                                    {perm.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {perm.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateOpen(false);
                        setEditingRole(null);
                        setFormData({ name: '', description: '', permissions: new Set() });
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateRole} className="flex-1">
                      {editingRole ? 'Update Role' : 'Create Role'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RolePermissionsManager;
