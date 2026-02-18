import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Employee } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, UserPlus, Edit, Trash2, BarChart3, X, Save, Mail, Phone, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import { logActivity } from '@/utils/activityLogger';
import { Combobox } from '@/components/ui/combobox';
import { BulkImportDialog } from './BulkImportDialog';
import { dataService } from '@/services/dataService';

export interface EnhancedEmployeeManagementProps {
  employees: Employee[];
  onEmployeesChange: (employees: Employee[]) => void;
  employeeRoles: Array<{ label: string; value: string }>;
  hasPermission: (permission: string) => boolean;
  onAnalytics?: (employee: Employee) => void;
}

export const EnhancedEmployeeManagement: React.FC<EnhancedEmployeeManagementProps> = ({
  employees,
  onEmployeesChange,
  employeeRoles,
  hasPermission,
  onAnalytics
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [useCardLayout, setUseCardLayout] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [delistDate, setDelistDate] = useState('');
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) {
      return employees;
    }
    const query = searchQuery.toLowerCase();
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.role.toLowerCase().includes(query) ||
      emp.email?.toLowerCase().includes(query) ||
      emp.phone?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const activeEmployees = useMemo(() => filteredEmployees.filter(e => e.status === 'active'), [filteredEmployees]);
  const inactiveEmployees = useMemo(() => filteredEmployees.filter(e => e.status === 'inactive'), [filteredEmployees]);

  // Handlers
  const handleSelectEmployee = (empId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(empId);
    } else {
      newSelected.delete(empId);
    }
    setSelectedIds(newSelected);
  };

  const handleAddEmployee = async () => {
    if (!newName.trim() || !newRole.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const saved = await dataService.employees.createEmployee({
        name: newName.trim(),
        role: newRole,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        status: 'active',
      });

      const formatted: Employee = {
        ...saved,
        createdAt: new Date(saved.createdAt),
        updatedAt: new Date(saved.updatedAt),
      };

      onEmployeesChange([...employees, formatted]);
      toast({ title: 'Success', description: 'Employee added successfully' });
      setNewName('');
      setNewRole('');
      setNewEmail('');
      setNewPhone('');
      setIsAddDialogOpen(false);
      logActivity({ action: 'create', entity: 'employee', details: `Added employee ${newName}` });
    } catch (err) {
      console.error('Failed to add employee', err);
      toast({ title: 'Error', description: 'Failed to save employee to database', variant: 'destructive' });
    }
  };

  const handleEditEmployee = (empId: string) => {
    const emp = employees.find(e => e.id === empId);
    if (emp) {
      setEditingId(empId);
      setEditName(emp.name);
      setEditRole(emp.role);
      setEditEmail(emp.email || '');
      setEditPhone(emp.phone || '');
    }
  };

  const handleSaveEmployee = async () => {
    if (!editName.trim() || !editRole.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      await dataService.employees.updateEmployee(editingId!, {
        name: editName,
        role: editRole,
        email: editEmail || undefined,
        phone: editPhone || undefined,
      });

      const updated = employees.map(e =>
        e.id === editingId
          ? { ...e, name: editName, role: editRole, email: editEmail, phone: editPhone, updatedAt: new Date() }
          : e
      );
      onEmployeesChange(updated);
      toast({ title: 'Success', description: 'Employee updated successfully' });
      setEditingId(null);
      setIsAddDialogOpen(false);
      logActivity({ action: 'update', entity: 'employee', details: `Updated employee ${editName}` });
    } catch (err) {
      console.error('Failed to update employee', err);
      toast({ title: 'Error', description: 'Failed to update employee in database', variant: 'destructive' });
    }
  };

  const handleDelistEmployee = async () => {
    if (!employeeToDelete || !delistDate) return;

    try {
      await dataService.employees.updateEmployee(employeeToDelete.id, {
        status: 'inactive',
        delistedDate: new Date(delistDate),
      });

      const updated = employees.map(e =>
        e.id === employeeToDelete.id
          ? { ...e, status: 'inactive' as const, delistedDate: new Date(delistDate), updatedAt: new Date() }
          : e
      );
      onEmployeesChange(updated);
      toast({ title: 'Success', description: 'Employee delisted successfully' });
      setIsDelistDialogOpen(false);
      setEmployeeToDelete(null);
      setDelistDate('');
      logActivity({ action: 'update', entity: 'employee', details: `Delisted employee ${employeeToDelete.name}` });
    } catch (err) {
      console.error('Failed to delist employee', err);
      toast({ title: 'Error', description: 'Failed to update employee in database', variant: 'destructive' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditRole('');
    setEditEmail('');
    setEditPhone('');
  };

  const getRoleColor = (role: string): string => {
    const lowerRole = role.toLowerCase();
    if (lowerRole.includes('manager')) return 'bg-blue-100 text-blue-800';
    if (lowerRole.includes('supervisor')) return 'bg-purple-100 text-purple-800';
    if (lowerRole.includes('driver')) return 'bg-green-100 text-green-800';
    if (lowerRole.includes('operator')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const EMPLOYEE_COLUMNS = [
    { key: 'name', label: 'Name', required: true, aliases: ['full name', 'employee name'] },
    { key: 'role', label: 'Role', required: true, aliases: ['position', 'job title'] },
    { key: 'email', label: 'Email', required: false, aliases: ['email address'] },
    { key: 'phone', label: 'Phone', required: false, aliases: ['phone number', 'mobile', 'contact'] },
  ];

  const handleBulkImport = async (importedRows: Record<string, string>[]) => {
    const saved: Employee[] = [];
    let failed = 0;

    for (const row of importedRows) {
      try {
        const result = await dataService.employees.createEmployee({
          name: row.name,
          role: row.role,
          email: row.email || undefined,
          phone: row.phone || undefined,
          status: 'active',
        });
        saved.push({
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        });
      } catch (err) {
        console.error('Failed to import employee row:', row, err);
        failed++;
      }
    }

    if (saved.length > 0) {
      onEmployeesChange([...employees, ...saved]);
    }

    toast({
      title: failed === 0 ? 'Import Successful' : 'Import Completed with Errors',
      description: `${saved.length} employee${saved.length !== 1 ? 's' : ''} imported${failed > 0 ? `, ${failed} failed` : ''}.`,
      variant: failed > 0 && saved.length === 0 ? 'destructive' : 'default',
    });

    if (saved.length > 0) {
      logActivity({
        action: 'create',
        entity: 'employee',
        details: `Bulk imported ${saved.length} employees via Excel`,
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 mt-4">
      {/* Header */}
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <UserPlus className="h-5 w-5" />
              Employee Management
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                size={isMobile ? "sm" : "default"}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {!isMobile && 'Import Excel'}
              </Button>
              {hasPermission('write_employees') && (
                <Button onClick={() => {
                  handleCancelEdit();
                  setIsAddDialogOpen(true);
                }} className="gap-2" size={isMobile ? "sm" : "default"}>
                  <UserPlus className="h-4 w-4" />
                  Add Employee
                </Button>
              )}
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

        {/* Search */}
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name, role, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {activeEmployees.length} active {activeEmployees.length !== 1 ? 'employees' : 'employee'}
            {inactiveEmployees.length > 0 && `, ${inactiveEmployees.length} inactive`}
          </div>
        </CardContent>
      </Card>

      {/* Active Employees - Card Layout */}
      {activeEmployees.length > 0 && useCardLayout && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Active Employees</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeEmployees.map(emp => (
              <Card key={emp.id} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <Badge className={getRoleColor(emp.role)}>
                      {emp.role}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">{emp.name}</h4>
                    {emp.email && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {emp.email}
                      </p>
                    )}
                    {emp.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {emp.phone}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {hasPermission('write_employees') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleEditEmployee(emp.id);
                          setIsAddDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {hasPermission('delist_employees') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEmployeeToDelete(emp);
                          setIsDelistDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        🔒 Delist
                      </Button>
                    )}
                  </div>
                  {onAnalytics && hasPermission('read_employees') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAnalytics(emp)}
                      className="w-full"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Employees - Table Layout */}
      {activeEmployees.length > 0 && !useCardLayout && (
        <Card className="border-0 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedIds.size === activeEmployees.length && activeEmployees.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(activeEmployees.map(e => e.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeEmployees.map(emp => (
                  <TableRow key={emp.id} className={selectedIds.has(emp.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(emp.id)}
                        onCheckedChange={(checked) => handleSelectEmployee(emp.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.email || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {hasPermission('write_employees') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleEditEmployee(emp.id);
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {onAnalytics && hasPermission('read_employees') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAnalytics(emp)}
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        )}
                        {hasPermission('delist_employees') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEmployeeToDelete(emp);
                              setIsDelistDialogOpen(true);
                            }}
                          >
                            🔒
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

      {/* Inactive Employees */}
      {inactiveEmployees.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 text-muted-foreground">Past Employees ({inactiveEmployees.length})</h3>
          <Card className="border-dashed opacity-75">
            <CardContent className="pt-6">
              <div className="space-y-2">
                {inactiveEmployees.map(emp => (
                  <div key={emp.id} className="flex justify-between items-center p-2 border rounded text-sm">
                    <span>{emp.name} - {emp.role}</span>
                    <span className="text-muted-foreground">Delisted: {emp.delistedDate ? new Date(emp.delistedDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeEmployees.length === 0 && inactiveEmployees.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <UserPlus className="h-12 w-12 mx-auto opacity-30 mb-4" />
            <p className="text-muted-foreground mb-4">No employees found</p>
            {hasPermission('write_employees') && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Employee
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update employee details below.' : 'Enter details for the new employee.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={editingId ? editName : newName}
                onChange={(e) => editingId ? setEditName(e.target.value) : setNewName(e.target.value)}
                placeholder="Employee Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Combobox
                options={employeeRoles}
                value={editingId ? editRole : newRole}
                onValueChange={(value) => editingId ? setEditRole(value) : setNewRole(value)}
                placeholder="Select Role"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editingId ? editEmail : newEmail}
                onChange={(e) => editingId ? setEditEmail(e.target.value) : setNewEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editingId ? editPhone : newPhone}
                onChange={(e) => editingId ? setEditPhone(e.target.value) : setNewPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                handleCancelEdit();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingId ? handleSaveEmployee : handleAddEmployee}>
              {editingId ? 'Update' : 'Add'} Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delist Dialog */}
      <Dialog open={isDelistDialogOpen} onOpenChange={setIsDelistDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delist Employee</DialogTitle>
            <DialogDescription>
              Enter the delisting date for {employeeToDelete?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delist-date">Delisting Date *</Label>
              <Input
                id="delist-date"
                type="date"
                value={delistDate}
                onChange={(e) => setDelistDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDelistDialogOpen(false);
                setEmployeeToDelete(null);
                setDelistDate('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelistEmployee}>
              Delist Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="Import Employees from Excel"
        description="Upload a spreadsheet with employee data. Download the template to see the expected format."
        columns={EMPLOYEE_COLUMNS}
        onImport={handleBulkImport}
        templateFileName="employees_template.xlsx"
      />
    </div>
  );
};

export default EnhancedEmployeeManagement;
