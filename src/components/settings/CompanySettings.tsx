import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CompanySettings as CompanySettingsType, Employee, Asset, Waybill, QuickCheckout, Site, SiteTransaction, Activity, Vehicle } from "@/types/asset";
import { Settings, Upload, Save, Building, Phone, Globe, Trash2, Download, UploadCloud, Loader2, Sun, FileText, Activity as ActivityIcon, Users, UserPlus, Edit, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { saveAs } from "file-saver";
import { logActivity, exportActivitiesToTxt, getActivities, clearActivities } from "@/utils/activityLogger";
import { useAuth, User, UserRole } from "@/contexts/AuthContext";

interface CompanySettingsProps {
  settings: CompanySettingsType;
  onSave: (settings: CompanySettingsType) => void;
  employees: Employee[];
  onEmployeesChange: (employees: Employee[]) => void;
  vehicles: Vehicle[];
  onVehiclesChange: (vehicles: Vehicle[]) => void;
  assets: Asset[];
  onAssetsChange: (assets: Asset[]) => void;
  waybills: Waybill[];
  onWaybillsChange: (waybills: Waybill[]) => void;
  quickCheckouts: QuickCheckout[];
  onQuickCheckoutsChange: (quickCheckouts: QuickCheckout[]) => void;
  sites: Site[];
  onSitesChange: (sites: Site[]) => void;
  siteTransactions: SiteTransaction[];
  onSiteTransactionsChange: (siteTransactions: SiteTransaction[]) => void;
  onResetAllData: () => void;
}

export const CompanySettings = ({ settings, onSave, employees, onEmployeesChange, vehicles, onVehiclesChange, assets, onAssetsChange, waybills, onWaybillsChange, quickCheckouts, onQuickCheckoutsChange, sites, onSitesChange, siteTransactions, onSiteTransactionsChange, onResetAllData }: CompanySettingsProps) => {
  const defaultSettings: CompanySettingsType = {
    companyName: "Dewatering Construction Etc Limited",
    logo: undefined,
    address: "7 Musiliu Smith St, formerly Panti Street, Adekunle, Lagos 101212, Lagos",
    phone: "+2349030002182",
    email: "",
    website: "https://dewaterconstruct.com/",
    currency: "USD",
    dateFormat: "dd/MM/yyyy",
    theme: "light",
    notifications: { email: true, push: true }
  };

  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState<CompanySettingsType>({ ...defaultSettings, ...settings });
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("driver");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isDelistEmployeeDialogOpen, setIsDelistEmployeeDialogOpen] = useState(false);
  const [employeeToDelist, setEmployeeToDelist] = useState<Employee | null>(null);
  const [delistDate, setDelistDate] = useState("");
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  const [selectedBackupItems, setSelectedBackupItems] = useState(new Set([
    'assets', 'waybills', 'quickCheckouts', 'sites', 'siteTransactions', 'employees', 'vehicles', 'companySettings'
  ]));

  const [selectedResetItems, setSelectedResetItems] = useState(new Set([
    'assets', 'waybills', 'quickCheckouts', 'sites', 'siteTransactions', 'employees', 'vehicles', 'companySettings', 'equipmentLogs', 'activities', 'activeTab'
  ]));

  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [tempEmployeeName, setTempEmployeeName] = useState("");
  const [tempEmployeeRole, setTempEmployeeRole] = useState("driver");
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
  const [tempVehicleName, setTempVehicleName] = useState("");

  const backupOptions = [
    { id: 'assets', label: 'Assets' },
    { id: 'waybills', label: 'Waybills & Returns' },
    { id: 'quickCheckouts', label: 'Quick Checkouts' },
    { id: 'sites', label: 'Sites' },
    { id: 'siteTransactions', label: 'Site Transactions' },
    { id: 'employees', label: 'Employees' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'companySettings', label: 'Company Settings' }
  ];

  const resetOptions = [
    { id: 'assets', label: 'Assets' },
    { id: 'waybills', label: 'Waybills & Returns' },
    { id: 'quickCheckouts', label: 'Quick Checkouts' },
    { id: 'sites', label: 'Sites' },
    { id: 'siteTransactions', label: 'Site Transactions' },
    { id: 'employees', label: 'Employees' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'companySettings', label: 'Company Settings' },
    { id: 'activities', label: 'Activity Logs' },
    { id: 'activeTab', label: 'Active Tab State' }
  ];


  // Load activities on mount
  useEffect(() => {
    const loadActivities = async () => {
      const loadedActivities = await getActivities();
      setActivities(loadedActivities);
    };
    loadActivities();
  }, [showActivityLog]); // Reload when activity log dialog opens

  const handleClearActivities = async () => {
    await clearActivities();
    setActivities([]);
    setShowActivityLog(false);
    setIsClearConfirmOpen(false);
    toast({
      title: "Activity Log Cleared",
      description: "All activity logs have been deleted.",
      variant: "destructive"
    });
    await logActivity({
      action: 'clear',
      entity: 'activities',
      details: 'Cleared all activity logs'
    });
  };

  const handleAddEmployee = async () => {
    if (!employeeName.trim()) return;

    try {
      if (window.db) {
        // Persist to DB (timestamps handled by DB)
        await window.db.createEmployee({
          name: employeeName.trim(),
          role: employeeRole,
          email: employeeEmail.trim() || undefined,
          status: 'active',
        });
        // Reload from DB to ensure IDs and timestamps are correct
        const latest = await window.db.getEmployees();
        const mapped = latest.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          delistedDate: item.delistedDate ? new Date(item.delistedDate) : undefined,
        }));
        onEmployeesChange(mapped);
      } else {
        // Fallback (non-Electron)
        onEmployeesChange([
          ...employees,
          {
            id: Date.now().toString(),
            name: employeeName.trim(),
            role: employeeRole,
            email: employeeEmail.trim() || undefined,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Employee,
        ]);
      }

      await logActivity({
        action: 'add_employee',
        entity: 'employee',
        details: `Added employee ${employeeName.trim()} as ${employeeRole}`
      });

      setEmployeeName('');
      setEmployeeRole('driver');
      setEmployeeEmail('');
      setIsAddEmployeeDialogOpen(false);

      toast({
        title: 'Employee Added',
        description: `${employeeName.trim()} has been added successfully`
      });
    } catch (error) {
      logger.error('Failed to add employee', error);
      toast({
        title: 'Error',
        description: 'Failed to add employee to database',
        variant: 'destructive'
      });
    }
  };

  const handleDelistEmployee = async () => {
    if (!employeeToDelist || !delistDate) return;
    
    const updatedEmployee = {
      ...employeeToDelist,
      status: "inactive" as const,
      delistedDate: new Date(delistDate),
      updatedAt: new Date()
    };

    try {
      // Save to database first if available
      if (window.db) {
        await window.db.updateEmployee(employeeToDelist.id, updatedEmployee);
      }

      const updatedEmployees = employees.map(emp =>
        emp.id === employeeToDelist.id ? updatedEmployee : emp
      );
      onEmployeesChange(updatedEmployees);

      // Log employee delisting
      logActivity({
        action: 'update',
        entity: 'employee',
        entityId: employeeToDelist.id,
        details: `Delisted employee ${employeeToDelist.name} on ${delistDate}`
      });

      setEmployeeToDelist(null);
      setDelistDate("");
      setIsDelistEmployeeDialogOpen(false);

      toast({
        title: "Employee Delisted",
        description: `${updatedEmployee.name} has been delisted`
      });
    } catch (error) {
      logger.error('Failed to delist employee', error);
      toast({
        title: "Error",
        description: "Failed to update employee in database",
        variant: "destructive"
      });
    }
  };

  const handleRemoveEmployee = async (id: string) => {
    try {
      // Delete from database first if available
      if (window.db) {
        await window.db.deleteEmployee(id);
      }
      
      onEmployeesChange(employees.filter(emp => emp.id !== id));

      toast({
        title: "Employee Removed",
        description: "Employee has been removed successfully"
      });
    } catch (error) {
      logger.error('Failed to remove employee', error);
      toast({
        title: "Error",
        description: "Failed to remove employee from database",
        variant: "destructive"
      });
    }
  };

  const handleAddVehicle = async () => {
    if (!vehicleName.trim()) return;
    
    try {
      if (window.db) {
        await window.db.createVehicle({ name: vehicleName.trim(), status: 'active' });
        const latest = await window.db.getVehicles();
        const mapped = latest.map((item: any) => ({
          ...item,
          createdAt: new Date(item.created_at || item.createdAt),
          updatedAt: new Date(item.updated_at || item.updatedAt),
        }));
        onVehiclesChange(mapped);
      } else {
        onVehiclesChange([
          ...vehicles,
          { id: Date.now().toString(), name: vehicleName.trim(), status: 'active', createdAt: new Date(), updatedAt: new Date() } as Vehicle,
        ]);
      }

      await logActivity({
        action: 'create',
        entity: 'vehicle',
        details: `Added vehicle ${vehicleName.trim()}`
      });

      setVehicleName('');
      
      toast({
        title: 'Vehicle Added',
        description: `${vehicleName.trim()} has been added successfully`
      });
    } catch (error) {
      logger.error('Failed to add vehicle', error);
      toast({
        title: 'Error',
        description: 'Failed to add vehicle to database',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveVehicle = async (id: string) => {
    try {
      // Delete from database first if available
      if (window.db) {
        await window.db.deleteVehicle(id);
      }
      
      onVehiclesChange(vehicles.filter(v => v.id !== id));

      toast({
        title: "Vehicle Removed",
        description: "Vehicle has been removed successfully"
      });
    } catch (error) {
      logger.error('Failed to remove vehicle', error);
      toast({
        title: "Error",
        description: "Failed to remove vehicle from database",
        variant: "destructive"
      });
    }
  };

  const handleEditEmployee = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
      setEditingEmployeeId(id);
      setTempEmployeeName(employee.name);
      setTempEmployeeRole(employee.role);
    }
  };

  const handleSaveEmployeeEdit = async () => {
    if (!editingEmployeeId || !tempEmployeeName.trim()) return;
    
    const employee = employees.find(emp => emp.id === editingEmployeeId);
    if (!employee) return;

    const updatedEmployee = {
      ...employee,
      name: tempEmployeeName.trim(),
      role: tempEmployeeRole,
      updatedAt: new Date()
    };

    try {
      // Save to database first if available
      if (window.db) {
        await window.db.updateEmployee(editingEmployeeId, updatedEmployee);
      }

      const updatedEmployees = employees.map(emp =>
        emp.id === editingEmployeeId ? updatedEmployee : emp
      );
      onEmployeesChange(updatedEmployees);

      // Log employee update
      logActivity({
        action: 'update',
        entity: 'employee',
        entityId: editingEmployeeId,
        details: `Updated employee ${tempEmployeeName} to role ${tempEmployeeRole}`
      });

      setEditingEmployeeId(null);
      setTempEmployeeName("");
      setTempEmployeeRole("driver");

      toast({
        title: "Employee Updated",
        description: `${updatedEmployee.name} has been updated successfully`
      });
    } catch (error) {
      logger.error('Failed to update employee', error);
      toast({
        title: "Error",
        description: "Failed to update employee in database",
        variant: "destructive"
      });
    }
  };

  const handleCancelEmployeeEdit = () => {
    setEditingEmployeeId(null);
    setTempEmployeeName("");
    setTempEmployeeRole("driver");
  };

  const handleEditVehicle = (id: string) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (vehicle) {
      setEditingVehicleIndex(vehicles.indexOf(vehicle));
      setTempVehicleName(vehicle.name);
    }
  };

  const handleSaveVehicleEdit = async () => {
    if (editingVehicleIndex === null || !tempVehicleName.trim()) return;
    
    const vehicle = vehicles[editingVehicleIndex];
    if (!vehicle) return;

    try {
      if (window.db) {
        await window.db.updateVehicle(vehicle.id, { name: tempVehicleName.trim() });
        const latest = await window.db.getVehicles();
        const mapped = latest.map((item: any) => ({
          ...item,
          createdAt: new Date(item.created_at || item.createdAt),
          updatedAt: new Date(item.updated_at || item.updatedAt),
        }));
        onVehiclesChange(mapped);
      } else {
        const updatedVehicles = [...vehicles];
        updatedVehicles[editingVehicleIndex] = { ...vehicle, name: tempVehicleName.trim(), updatedAt: new Date() } as Vehicle;
        onVehiclesChange(updatedVehicles);
      }

      await logActivity({
        action: 'update',
        entity: 'vehicle',
        details: `Updated vehicle from ${vehicle.name} to ${tempVehicleName.trim()}`
      });

      setEditingVehicleIndex(null);
      setTempVehicleName('');

      toast({
        title: 'Vehicle Updated',
        description: 'Vehicle has been updated successfully'
      });
    } catch (error) {
      logger.error('Failed to update vehicle', error);
      toast({
        title: 'Error',
        description: 'Failed to update vehicle in database',
        variant: 'destructive'
      });
    }
  };


  const handleCancelVehicleEdit = () => {
    setEditingVehicleIndex(null);
    setTempVehicleName("");
  };

  const handleSave = () => {
    onSave(formData);
    toast({
      title: "Settings Saved",
      description: "Company settings have been updated successfully."
    });
  };

  const handleReset = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Reset all data in parent
      onResetAllData();
      // Reset local state
      onAssetsChange([]);
      onWaybillsChange([]);
      onQuickCheckoutsChange([]);
      onSitesChange([]);
      onSiteTransactionsChange([]);
      onEmployeesChange([]);
      onVehiclesChange([]);
      setFormData(defaultSettings);
      setLogoPreview(null);
      onSave(defaultSettings);
      toast({
        title: "Data Reset",
        description: "All data has been cleared successfully."
      });
    } catch (err) {
      setError("Failed to reset data. Please try again.");
      toast({
        title: "Reset Failed",
        description: "An error occurred while resetting data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsResetOpen(false);
    }
  };

  const handleBackup = async (selectedItems: Set<string>) => {
    setIsLoading(true);
    setError(null);
    try {
      // Collect selected current app state
      const backupData: any = {};

      if (selectedItems.has('assets')) {
        backupData.assets = assets.map(asset => ({
          ...asset,
          createdAt: asset.createdAt.toISOString(),
          updatedAt: asset.updatedAt.toISOString()
        }));
      }

      if (selectedItems.has('waybills')) {
        backupData.waybills = waybills.map(waybill => ({
          ...waybill,
          issueDate: waybill.issueDate.toISOString(),
          expectedReturnDate: waybill.expectedReturnDate?.toISOString(),
          createdAt: waybill.createdAt.toISOString(),
          updatedAt: waybill.updatedAt.toISOString()
        }));
      }

      if (selectedItems.has('quickCheckouts')) {
        backupData.quick_checkouts = quickCheckouts.map(checkout => ({
          ...checkout,
          checkoutDate: checkout.checkoutDate.toISOString()
        }));
      }

      if (selectedItems.has('sites')) {
        backupData.sites = sites.map(site => ({
          ...site,
          createdAt: site.createdAt.toISOString(),
          updatedAt: site.updatedAt.toISOString()
        }));
      }

      if (selectedItems.has('siteTransactions')) {
        backupData.site_transactions = siteTransactions.map(transaction => ({
          ...transaction,
          createdAt: transaction.createdAt.toISOString()
        }));
      }

      if (selectedItems.has('employees')) {
        backupData.employees = employees.map(emp => ({
          ...emp,
          createdAt: emp.createdAt.toISOString(),
          updatedAt: emp.updatedAt.toISOString()
        }));
      }

      if (selectedItems.has('vehicles')) {
        backupData.vehicles = vehicles;
      }

      if (selectedItems.has('companySettings')) {
        backupData.company_settings = [{
          ...settings,
          logo: settings.logo // Keep as is, assuming string or null
        }];
      }

      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-'); // YYYY-MM-DDTHH-MM-SS format
      const filename = `inventory-backup-${timestamp}.json`;

      const backupBlob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      saveAs(backupBlob, filename);
      toast({
        title: "Backup Created",
        description: `Selected data has been backed up to ${filename}.`
      });

      // Log backup activity
      logActivity({
        userId: 'current_user', // TODO: Get from AuthContext
        action: 'backup',
        entity: 'activities',
        details: `Backed up ${Array.from(selectedItems).join(', ')}`
      });
    } catch (err) {
      setError("Failed to create backup. Please try again.");
      toast({
        title: "Backup Failed",
        description: "An error occurred while creating backup.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupConfirm = () => {
    handleBackup(selectedBackupItems);
    setIsBackupDialogOpen(false);
  };

  const handleBackupCancel = () => {
    setIsBackupDialogOpen(false);
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setIsLoading(true);
    setError(null);
    try {
      const text = await restoreFile.text();
      const backupData = JSON.parse(text);
      // Update local state from backup
      if (backupData.assets) {
        onAssetsChange(backupData.assets.map((asset: any) => ({ ...asset, createdAt: new Date(asset.createdAt), updatedAt: new Date(asset.updatedAt) })));
      }
      if (backupData.waybills) {
        onWaybillsChange(backupData.waybills.map((waybill: any) => ({ ...waybill, issueDate: new Date(waybill.issueDate), expectedReturnDate: waybill.expectedReturnDate ? new Date(waybill.expectedReturnDate) : undefined, createdAt: new Date(waybill.createdAt), updatedAt: new Date(waybill.updatedAt) })));
      }
      if (backupData.quick_checkouts) {
        onQuickCheckoutsChange(backupData.quick_checkouts.map((checkout: any) => ({ ...checkout, checkoutDate: new Date(checkout.checkoutDate), expectedReturnDays: checkout.expectedReturnDays })));
      }
      if (backupData.sites) {
        onSitesChange(backupData.sites.map((site: any) => ({ ...site, createdAt: new Date(site.createdAt), updatedAt: new Date(site.updatedAt) })));
      }
      if (backupData.site_transactions) {
        onSiteTransactionsChange(backupData.site_transactions.map((transaction: any) => ({ ...transaction, createdAt: new Date(transaction.createdAt) })));
      }
      if (backupData.employees) {
        onEmployeesChange(backupData.employees.map((emp: any) => ({ ...emp, createdAt: new Date(emp.createdAt), updatedAt: new Date(emp.updatedAt) })));
      }
      if (backupData.vehicles) {
        onVehiclesChange(backupData.vehicles || []);
      }
      if (backupData.company_settings && backupData.company_settings.length > 0) {
        const restoredSettings = { ...defaultSettings, ...backupData.company_settings[0] };
        setFormData(restoredSettings);
        setLogoPreview(restoredSettings.logo || null);
        onSave(restoredSettings);
      }
      toast({
        title: "Data Restored",
        description: "Data has been restored successfully."
      });

      // Log restore activity
      logActivity({
        userId: 'current_user', // TODO: Get from AuthContext
        action: 'restore',
        entity: 'activities',
        details: 'Restored data from backup file'
      });
    } catch (err) {
      setError("Failed to restore data. Invalid file or error occurred.");
      toast({
        title: "Restore Failed",
        description: "An error occurred while restoring data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRestoreOpen(false);
      setRestoreFile(null);
    }
  };

  const handleBackupActivities = async () => {
    try {
      const txtContent = await exportActivitiesToTxt();
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `activities-log-${timestamp}.txt`;

      const txtBlob = new Blob([txtContent], { type: 'text/plain' });
      saveAs(txtBlob, filename);
      toast({
        title: "Activities Log Backed Up",
        description: `Activities log has been exported to ${filename}.`
      });

      // Log the backup activity
      await logActivity({
        userId: 'current_user', // TODO: Get from AuthContext
        action: 'backup',
        entity: 'activities',
        details: 'Exported activities log to TXT'
      });
    } catch (err) {
      logger.error('Failed to backup activities', err);
      toast({
        title: "Backup Failed",
        description: "An error occurred while exporting activities log.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.json')) {
      setRestoreFile(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON backup file.",
        variant: "destructive"
      });
    }
  };

  const { currentUser, hasPermission, getUsers, createUser, updateUser, deleteUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  // User management state
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('staff');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [showPermissionsTable, setShowPermissionsTable] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (hasPermission('manage_users')) {
        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
      }
    };
    fetchUsers();
  }, [hasPermission, getUsers]);

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserUsername.trim() || !newUserPassword.trim()) return;

    const result = await createUser({
      name: newUserName.trim(),
      username: newUserUsername.trim(),
      password: newUserPassword.trim(),
      role: newUserRole
    });

    if (result.success) {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      setNewUserRole('staff');
      toast({
        title: "User Created",
        description: "New user has been created successfully."
      });
    } else {
      toast({
        title: "Creation Failed",
        description: result.message || "Failed to create user.",
        variant: "destructive"
      });
    }
  };

  const handleEditUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUserId(userId);
      setEditUserName(user.name);
      setEditUserUsername(user.username);
      setEditUserRole(user.role);
      setEditUserEmail(user.email || '');
    }
  };

  const handleSaveUserEdit = async () => {
    if (!editingUserId || !editUserName.trim() || !editUserUsername.trim()) return;

    const result = await updateUser(editingUserId, {
      name: editUserName.trim(),
      username: editUserUsername.trim(),
      role: editUserRole,
      email: editUserEmail.trim() || undefined
    });

    if (result.success) {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
      setEditingUserId(null);
      setEditUserName('');
      setEditUserUsername('');
      setEditUserRole('staff');
      setEditUserEmail('');
      toast({
        title: "User Updated",
        description: "User has been updated successfully."
      });
    } else {
      toast({
        title: "Update Failed",
        description: result.message || "Failed to update user.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const result = await deleteUser(userId);
    if (result.success) {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully."
      });
    } else {
      toast({
        title: "Deletion Failed",
        description: result.message || "Failed to delete user.",
        variant: "destructive"
      });
    }
  };

  const handleCancelUserEdit = () => {
    setEditingUserId(null);
    setEditUserName('');
    setEditUserUsername('');
    setEditUserRole('staff');
    setEditUserEmail('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Company Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your company information and preferences
        </p>
      </div>

      {/* User Management */}
      {hasPermission('manage_users') && (
        <>
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">User Management</h4>
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddUserDialogOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                  <Button variant="outline" onClick={() => setShowPermissionsTable(!showPermissionsTable)}>
                    {showPermissionsTable ? 'View Users List' : 'View Permissions Table'}
                  </Button>
                </div>
              </div>

              {showPermissionsTable ? (
                <div className="space-y-2">
                  <h4 className="font-medium">User Permissions</h4>
                  {users.length === 0 ? (
                    <p className="text-muted-foreground">No users created yet.</p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map(user => (
                            <TableRow key={user.id}>
                              {editingUserId === user.id ? (
                                <>
                                  <TableCell>
                                    <Input
                                      value={editUserName}
                                      onChange={(e) => setEditUserName(e.target.value)}
                                      placeholder="Full Name"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={editUserUsername}
                                      onChange={(e) => setEditUserUsername(e.target.value)}
                                      placeholder="Username"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Select value={editUserRole} onValueChange={(value: UserRole) => setEditUserRole(value)}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="data_entry_supervisor">Data Entry Supervisor</SelectItem>
                                        <SelectItem value="regulatory">Regulatory</SelectItem>
                                        <SelectItem value="manager">Manager</SelectItem>
                                        <SelectItem value="staff">Staff</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={editUserEmail}
                                      onChange={(e) => setEditUserEmail(e.target.value)}
                                      placeholder="Email"
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button size="sm" onClick={handleSaveUserEdit}>Save</Button>
                                      <Button size="sm" variant="outline" onClick={handleCancelUserEdit}>Cancel</Button>
                                    </div>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="font-medium">{user.name}</TableCell>
                                  <TableCell>@{user.username}</TableCell>
                                  <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                                  <TableCell>{user.email || 'No email'}</TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="outline" onClick={() => handleEditUser(user.id)}>
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      {user.id !== 'admin' && (
                                        <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                                          <UserMinus className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="font-medium">Existing Users</h4>
                  {users.length === 0 ? (
                    <p className="text-muted-foreground">No users created yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between border p-3 rounded">
                          {editingUserId === user.id ? (
                            <div className="flex gap-2 flex-1">
                              <Input
                                value={editUserName}
                                onChange={(e) => setEditUserName(e.target.value)}
                                placeholder="Full Name"
                                className="flex-1"
                              />
                              <Input
                                value={editUserUsername}
                                onChange={(e) => setEditUserUsername(e.target.value)}
                                placeholder="Username"
                                className="flex-1"
                              />
                              <Select value={editUserRole} onValueChange={(value: UserRole) => setEditUserRole(value)}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="data_entry_supervisor">Data Entry Supervisor</SelectItem>
                                  <SelectItem value="regulatory">Regulatory</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={editUserEmail}
                                onChange={(e) => setEditUserEmail(e.target.value)}
                                placeholder="Email"
                                className="flex-1"
                              />
                              <Button size="sm" onClick={handleSaveUserEdit}>Save</Button>
                              <Button size="sm" variant="outline" onClick={handleCancelUserEdit}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  @{user.username} • {user.role.replace('_', ' ')} • {user.email || 'No email'}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" onClick={() => handleEditUser(user.id)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                {user.id !== 'admin' && (
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
                                    <UserMinus className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              )}

            </CardContent>

          </Card>

          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>

            <DialogContent>

              <DialogHeader>

                <DialogTitle>Add New User</DialogTitle>

                <DialogDescription>Enter the details for the new user.</DialogDescription>

              </DialogHeader>

              <div className="space-y-4">

                <Select value={newUserName} onValueChange={(value) => setNewUserName(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.filter(employee => employee.status === 'active').map(employee => (
                      <SelectItem key={employee.id} value={employee.name}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input

                  value={newUserUsername}

                  onChange={(e) => setNewUserUsername(e.target.value)}

                  placeholder="Username"

                />

                <Input

                  type="password"

                  value={newUserPassword}

                  onChange={(e) => setNewUserPassword(e.target.value)}

                  placeholder="Password"

                />

                <Select value={newUserRole} onValueChange={(value: UserRole) => setNewUserRole(value)}>

                  <SelectTrigger>

                    <SelectValue />

                  </SelectTrigger>

                  <SelectContent>

                    <SelectItem value="admin">Admin</SelectItem>

                    <SelectItem value="data_entry_supervisor">Data Entry Supervisor</SelectItem>

                    <SelectItem value="regulatory">Regulatory</SelectItem>

                    <SelectItem value="manager">Manager</SelectItem>

                    <SelectItem value="staff">Staff</SelectItem>

                  </SelectContent>

                </Select>

                <Input

                  value={newUserEmail}

                  onChange={(e) => setNewUserEmail(e.target.value)}

                  placeholder="Email (optional)"

                />

              </div>

              <DialogFooter>

                <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Cancel</Button>

                <Button onClick={handleCreateUser}>Create User</Button>

              </DialogFooter>

            </DialogContent>

          </Dialog>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Information */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <p className="text-lg font-medium">{defaultSettings.companyName}</p>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <p className="text-sm text-muted-foreground">{defaultSettings.address}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <p className="text-sm">{defaultSettings.phone}</p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <p className="text-sm">
                  <a href={defaultSettings.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {defaultSettings.website}
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Logo */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle>Company Logo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden">
                <img
                  src="./logo.png"
                  alt="Company Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employee Management */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Employees
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Active Employees</h4>
              <Button onClick={() => setIsAddEmployeeDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Employee
              </Button>
            </div>
            <div>
              {employees.filter(emp => emp.status === 'active').length === 0 ? (
                <p className="text-muted-foreground">No active employees added yet.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {employees.filter(emp => emp.status === 'active').map(emp => (
                    <li key={emp.id} className="flex justify-between items-center border p-2 rounded">
                      {editingEmployeeId === emp.id ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={tempEmployeeName}
                            onChange={(e) => setTempEmployeeName(e.target.value)}
                            placeholder="Employee Name"
                            className="flex-1"
                          />
                          <Select
                            value={tempEmployeeRole}
                            onValueChange={(value) => setTempEmployeeRole(value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="driver">Driver</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={handleSaveEmployeeEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEmployeeEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{emp.name} ({emp.role}) {emp.email && `- ${emp.email}`}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditEmployee(emp.id)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setEmployeeToDelist(emp); setIsDelistEmployeeDialogOpen(true); }}>Delist</Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {employees.filter(emp => emp.status === 'inactive').length > 0 && (
              <div>
                <h4 className="font-medium mt-4">Past Employees</h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {employees.filter(emp => emp.status === 'inactive').map(emp => (
                    <li key={emp.id} className="flex justify-between items-center border p-2 rounded opacity-75">
                      <span>{emp.name} ({emp.role}) {emp.email && `- ${emp.email}`} - Delisted: {emp.delistedDate ? new Date(emp.delistedDate).toLocaleDateString() : 'N/A'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>Enter the details for the new employee.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="Employee Name"
              />
              <Select value={employeeRole} onValueChange={(value) => setEmployeeRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Head of Admin">Head of Admin</SelectItem>
                  <SelectItem value="Head of Operations">Head of Operations</SelectItem>
                  <SelectItem value="Projects Supervisor">Projects Supervisor</SelectItem>
                  <SelectItem value="Logistics and Warehouse Officer">Logistics and Warehouse Officer</SelectItem>
                  <SelectItem value="Admin Manager">Admin Manager</SelectItem>
                  <SelectItem value="Admin Assistant">Admin Assistant</SelectItem>
                  <SelectItem value="Foreman">Foreman</SelectItem>
                  <SelectItem value="Engineer">Engineer</SelectItem>
                  <SelectItem value="Trainee Site Manager">Trainee Site Manager</SelectItem>
                  <SelectItem value="Site Supervisor">Site Supervisor</SelectItem>
                  <SelectItem value="Admin Clerk">Admin Clerk</SelectItem>
                  <SelectItem value="Assistant Supervisor">Assistant Supervisor</SelectItem>
                  <SelectItem value="Site Worker">Site Worker</SelectItem>
                  <SelectItem value="Driver">Driver</SelectItem>
                  <SelectItem value="Security">Security</SelectItem>
                  <SelectItem value="Adhoc Staff">Adhoc Staff</SelectItem>
                  <SelectItem value="Consultant">Consultant</SelectItem>
                  <SelectItem value="IT Student">IT Student</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={employeeEmail}
                onChange={(e) => setEmployeeEmail(e.target.value)}
                placeholder="Email (optional)"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEmployeeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddEmployee}>Add Employee</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDelistEmployeeDialogOpen} onOpenChange={setIsDelistEmployeeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delist Employee</DialogTitle>
              <DialogDescription>Enter the delisting date for {employeeToDelist?.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                type="date"
                value={delistDate}
                onChange={(e) => setDelistDate(e.target.value)}
                placeholder="Delisting Date"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDelistEmployeeDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleDelistEmployee}>Delist Employee</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Vehicle Management */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Vehicle Name/Plate"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddVehicle}>Add</Button>
            </div>
            <div>
              {vehicles.length === 0 ? (
                <p className="text-muted-foreground">No vehicles added yet.</p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <li key={vehicle.id} className="flex justify-between items-center border p-2 rounded">
                      {editingVehicleIndex === vehicles.indexOf(vehicle) ? (
                        <div className="flex gap-2 flex-1">
                          <Input
                            value={tempVehicleName}
                            onChange={(e) => setTempVehicleName(e.target.value)}
                            placeholder="Vehicle Name/Plate"
                            className="flex-1"
                          />
                          <Button size="sm" onClick={handleSaveVehicleEdit}>Save</Button>
                          <Button size="sm" variant="outline" onClick={handleCancelVehicleEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{vehicle.name}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleEditVehicle(vehicle.id)}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleRemoveVehicle(vehicle.id)}>Remove</Button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Data Management */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Backup, restore, or reset all your inventory data. Use these features carefully as some actions cannot be undone.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isLoading} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset All Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all assets, waybills, returns, sites, employees, vehicles, and settings data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Reset All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isLoading} className="gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4" />}
                  Backup Data
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Select Backup Items</DialogTitle>
                  <DialogDescription>
                    Choose which data types to include in the backup. All are selected by default.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {backupOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.id}
                        checked={selectedBackupItems.has(option.id)}
                        onCheckedChange={(checked) => {
                          const newSet = new Set(selectedBackupItems);
                          if (checked) {
                            newSet.add(option.id);
                          } else {
                            newSet.delete(option.id);
                          }
                          setSelectedBackupItems(newSet);
                        }}
                      />
                      <Label htmlFor={option.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={handleBackupCancel}>
                    Cancel
                  </Button>
                  <Button onClick={handleBackupConfirm} disabled={isLoading || selectedBackupItems.size === 0}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create Backup
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>



            <Dialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={isLoading} className="gap-2">
                  <UploadCloud className="h-4 w-4" />
                  Restore Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restore Data from Backup</DialogTitle>
                  <DialogDescription>
                    Select a JSON backup file to restore your data. This will replace all current data.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="restore-file">Backup File</Label>
                    <Input
                      id="restore-file"
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="mt-1"
                    />
                    {restoreFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Selected: {restoreFile.name}
                      </p>
                    )}
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRestore} disabled={!restoreFile || isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Restore Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ActivityIcon className="h-4 w-4" />
              View Activity Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Activity Log</DialogTitle>
              <DialogDescription>
                View all system activities and user actions. {activities.length} total activities.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" onClick={handleBackupActivities} size="sm">
                  <Download className="h-3 w-3 mr-1" />
                  Export TXT
                </Button>
                <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={!isAdmin}>
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear Log
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Activity Log</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all activity logs. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearActivities} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Clear Log
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {activities.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  No activities recorded yet.
                </div>
              ) : (
                <div className="overflow-auto max-h-[calc(80vh-200px)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...activities].reverse().map((activity) => (
                        <TableRow key={activity.id}>
                          <TableCell className="font-mono text-xs">
                            {new Date(activity.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell>{activity.userName}</TableCell>
                          <TableCell className="capitalize">{activity.action}</TableCell>
                          <TableCell className="capitalize">{activity.entity}</TableCell>
                          <TableCell>{activity.entityId || '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{activity.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Button
          onClick={handleSave}
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
