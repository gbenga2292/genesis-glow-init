import React, { useState, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CompanySettings as CompanySettingsType, Employee, Asset, Waybill, QuickCheckout, Site, SiteTransaction, Activity, Vehicle } from "@/types/asset";
import { Settings, Upload, Save, Building, Phone, Globe, Trash2, Download, UploadCloud, Loader2, Sun, FileText, Activity as ActivityIcon, Users, UserPlus, Edit, UserMinus, Car, Database, BarChart3, FileJson, ChevronDown, ChevronRight, Mail, Zap, Lock, Pencil, Sparkles, X, Search } from "lucide-react";
import { AppUpdateSettings } from "./AppUpdateSettings";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { saveAs } from "file-saver";
import { logActivity, exportActivitiesToTxt, getActivities, clearActivities } from "@/utils/activityLogger";
import { useAuth, User, UserRole } from "@/contexts/AuthContext";
import { EmployeeAnalytics } from "./EmployeeAnalytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { dataService } from "@/services/dataService";
import { Combobox } from "@/components/ui/combobox";
import { VehicleAnalyticsPage } from "@/pages/VehicleAnalyticsPage";
import { PasswordStrengthMeter } from "@/components/user-management/PasswordStrengthMeter";
import { AvatarGenerator } from "@/components/user-management/AvatarGenerator";
import { LastActiveStatus } from "@/components/user-management/LastActiveStatus";
import { UserCard } from "@/components/user-management/UserCard";
import { LoginHistoryDrawer } from "@/components/user-management/LoginHistoryDrawer";
import { UserTimelineDrawer } from "@/components/user-management/UserTimelineDrawer";
import { RolePermissionsManager } from "@/components/user-management/RolePermissionsManager";
import { BulkActionsBar } from "@/components/user-management/BulkActionsBar";
import { InviteFlow } from "@/components/user-management/InviteFlow";
import { EnhancedUserManagement } from "./EnhancedUserManagement";
import { EnhancedEmployeeManagement } from "./EnhancedEmployeeManagement";
import { EnhancedVehicleManagement } from "./EnhancedVehicleManagement";

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
  onUpdateCheckoutStatus?: (checkoutId: string, status: 'return_completed' | 'used' | 'lost' | 'damaged', quantity?: number) => void;
  equipmentLogs?: any[];
  onEquipmentLogsChange?: (logs: any[]) => void;
  consumableLogs?: any[];
  onConsumableLogsChange?: (logs: any[]) => void;
  activities?: Activity[];
  onActivitiesChange?: (activities: Activity[]) => void;
  onResetAllData: () => void;
}

export const CompanySettings = ({ settings, onSave, employees, onEmployeesChange, vehicles, onVehiclesChange, assets, onAssetsChange, waybills, onWaybillsChange, quickCheckouts, onQuickCheckoutsChange, sites, onSitesChange, siteTransactions, onSiteTransactionsChange, onUpdateCheckoutStatus, equipmentLogs = [], onEquipmentLogsChange, consumableLogs = [], onConsumableLogsChange, activities: activitiesFromProps = [], onActivitiesChange, onResetAllData }: CompanySettingsProps) => {
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
    notifications: { email: true, push: true },
    maintenanceFrequency: 60,
    currencySymbol: "â‚¦",
    electricityRate: 200
  };

  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { currentUser, hasPermission, getUsers, createUser, updateUser, deleteUser } = useAuth();
  const isMobile = useIsMobile();
  const isAdmin = currentUser?.role === 'admin';
  const [formData, setFormData] = useState<CompanySettingsType>({ ...defaultSettings, ...settings });
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("driver");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = useState(false);
  const [isDelistEmployeeDialogOpen, setIsDelistEmployeeDialogOpen] = useState(false);
  const [employeeToDelist, setEmployeeToDelist] = useState<Employee | null>(null);
  const [delistDate, setDelistDate] = useState("");
  const [isDelistVehicleDialogOpen, setIsDelistVehicleDialogOpen] = useState(false);
  const [vehicleToDelist, setVehicleToDelist] = useState<Vehicle | null>(null);
  const [analyticsVehicle, setAnalyticsVehicle] = useState<Vehicle | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  // Backup preview and section selection state
  const [loadedBackupData, setLoadedBackupData] = useState<any>(null);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [restoreSelectedSections, setRestoreSelectedSections] = useState<Set<string>>(new Set());
  const [showRestoreSectionSelector, setShowRestoreSectionSelector] = useState(false);
  // Live restore progress state
  const [isRestoringLive, setIsRestoringLive] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<any>({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
  const [isRestoreComplete, setIsRestoreComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [analyticsEmployee, setAnalyticsEmployee] = useState<Employee | null>(null);
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('staff');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [showPermissionsTable, setShowPermissionsTable] = useState(true);

  // Enhanced User Management State
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [selectedLoginHistoryUserId, setSelectedLoginHistoryUserId] = useState<string | null>(null);
  const [isLoginHistoryOpen, setIsLoginHistoryOpen] = useState(false);
  const [selectedTimelineUserId, setSelectedTimelineUserId] = useState<string | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isRolePermissionsOpen, setIsRolePermissionsOpen] = useState(false);
  const [isInviteFlowOpen, setIsInviteFlowOpen] = useState(false);
  const [useCardLayout, setUseCardLayout] = useState(true);

  const [selectedBackupItems, setSelectedBackupItems] = useState(new Set([
    'users', 'assets', 'waybills', 'quickCheckouts', 'sites', 'siteTransactions', 'employees', 'vehicles', 'companySettings', 'equipmentLogs', 'consumableLogs', 'activities'
  ]));

  // Backup type: Set to allow multiple selection
  const [backupTypes, setBackupTypes] = useState<Set<'json' | 'database'>>(new Set(['json', 'database']));

  const [selectedResetItems, setSelectedResetItems] = useState(new Set([
    'assets', 'waybills', 'quickCheckouts', 'sites', 'siteTransactions', 'employees', 'vehicles', 'companySettings', 'equipmentLogs', 'activities', 'activeTab'
  ]));

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isCompanyInfoEditing, setIsCompanyInfoEditing] = useState(false);

  // Backup Scheduler state
  const [backupSchedulerStatus, setBackupSchedulerStatus] = useState<any>(null);
  const [backupsList, setBackupsList] = useState<any>(null);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [backupRetentionDays, setBackupRetentionDays] = useState(30);
  const [nasAccessible, setNasAccessible] = useState<boolean | null>(null);
  const [isNasJsonOpen, setIsNasJsonOpen] = useState(true);
  const [isNasDbOpen, setIsNasDbOpen] = useState(true);
  const [isBackupInProgress, setIsBackupInProgress] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<number>(0);
  const [activeSettingsTab, setActiveSettingsTab] = useState("company");



  // Load backup scheduler status
  useEffect(() => {
    const loadBackupSchedulerStatus = async () => {
      if (window.backupScheduler) {
        try {
          const status = await window.backupScheduler.getStatus();
          setBackupSchedulerStatus(status);
          setAutoBackupEnabled(status.enabled);
          setBackupRetentionDays(status.maxBackups);
          setNasAccessible(status.nasAccessible);

          // Load backups list
          const backups = await window.backupScheduler.listBackups();
          setBackupsList(backups);
        } catch (err) {
          logger.error('Failed to load backup scheduler status', err);
        }
      }
    };

    loadBackupSchedulerStatus();
  }, []);



  const [showActivityLog, setShowActivityLog] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [tempEmployeeName, setTempEmployeeName] = useState("");
  const [tempEmployeeRole, setTempEmployeeRole] = useState("driver");
  const [editingVehicleIndex, setEditingVehicleIndex] = useState<number | null>(null);
  const [tempVehicleName, setTempVehicleName] = useState("");

  const backupOptions = [
    { id: 'users', label: 'Users (Accounts)' },
    { id: 'assets', label: 'Assets' },
    { id: 'waybills', label: 'Waybills & Returns' },
    { id: 'quickCheckouts', label: 'Quick Checkouts' },
    { id: 'sites', label: 'Sites' },
    { id: 'siteTransactions', label: 'Site Transactions' },
    { id: 'employees', label: 'Employees' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'companySettings', label: 'Company Settings' },
    { id: 'equipmentLogs', label: 'Equipment Logs' },
    { id: 'consumableLogs', label: 'Consumable Usage Logs' },
    { id: 'activities', label: 'Recent Activities & Logs' }
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

  // Load users when users tab is opened
  useEffect(() => {
    if (activeSettingsTab === 'users' && hasPermission('manage_users')) {
      const loadUsers = async () => {
        const loadedUsers = await getUsers();
        setUsers(loadedUsers);
      };
      loadUsers();
    }
  }, [activeSettingsTab, hasPermission]);

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

  // Filtered users based on search query
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) {
      return users;
    }
    const query = userSearchQuery.toLowerCase();
    return users.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.email?.toLowerCase().includes(query))
    );
  }, [users, userSearchQuery]);

  // Handle user selection for bulk operations
  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleAddEmployee = async () => {
    if (!employeeName.trim()) return;

    try {
      // Create new employee object
      const newEmployeeData: Partial<Employee> = {
        name: employeeName.trim(),
        role: employeeRole,
        email: employeeEmail.trim() || undefined,
        status: 'active',
      };

      // Use dataService to persist
      const savedEmployee = await dataService.employees.createEmployee(newEmployeeData);

      // Directly update local state with returned object (which has correct timestamps)
      // Or reload all if preferred, but appending is faster
      // Format dates for UI consistency
      const formattedEmployee = {
        ...savedEmployee,
        createdAt: new Date(savedEmployee.createdAt),
        updatedAt: new Date(savedEmployee.updatedAt),
        delistedDate: savedEmployee.delistedDate ? new Date(savedEmployee.delistedDate) : undefined,
      };

      onEmployeesChange([...employees, formattedEmployee]);

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
      await dataService.employees.updateEmployee(employeeToDelist.id, updatedEmployee);

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
      await dataService.employees.deleteEmployee(id);

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

    // Check for duplicate vehicle name (case-insensitive)
    const isDuplicate = vehicles.some(v => v.name.toLowerCase() === vehicleName.trim().toLowerCase());
    if (isDuplicate) {
      toast({
        title: 'Duplicate Vehicle',
        description: 'A vehicle with this name already exists.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const savedVehicle = await dataService.vehicles.createVehicle({ name: vehicleName.trim(), status: 'active' });

      const formattedVehicle = {
        ...savedVehicle,
        createdAt: new Date(savedVehicle.createdAt),
        updatedAt: new Date(savedVehicle.updatedAt),
      };

      onVehiclesChange([...vehicles, formattedVehicle]);

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
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    // Always use delist flow instead of permanent delete
    setVehicleToDelist(vehicle);
    setIsDelistVehicleDialogOpen(true);
  };

  const handleReactivateVehicle = async (id: string) => {
    const vehicle = vehicles.find(v => v.id === id);
    if (!vehicle) return;

    try {
      // Pass explicit null to clear the date in DB if supported, or handled by dataService
      await dataService.vehicles.updateVehicle(id, { status: 'active', delistedDate: null });

      const updatedVehicles = vehicles.map(v =>
        v.id === id ? { ...v, status: 'active' as const, delistedDate: undefined, updatedAt: new Date() } : v
      );
      onVehiclesChange(updatedVehicles);

      await logActivity({
        action: 'update',
        entity: 'vehicle',
        details: `Reactivated vehicle ${vehicle.name}`
      });

      toast({ title: "Vehicle Reactivated", description: `${vehicle.name} is now active.` });
    } catch (err) {
      logger.error('Failed to reactivate vehicle', err);
      toast({ title: "Error", description: "Failed to reactivate vehicle", variant: "destructive" });
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
      await dataService.employees.updateEmployee(editingEmployeeId, updatedEmployee);

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
      await dataService.vehicles.updateVehicle(vehicle.id, { name: tempVehicleName.trim() });

      const updatedVehicles = [...vehicles];
      updatedVehicles[editingVehicleIndex] = {
        ...vehicle,
        name: tempVehicleName.trim(),
        updatedAt: new Date()
      } as Vehicle;

      onVehiclesChange(updatedVehicles);

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

  const handleConfirmedDelistVehicle = async () => {
    if (!vehicleToDelist) return;

    const delistedDateValue = delistDate ? new Date(delistDate) : new Date();

    try {
      await dataService.vehicles.updateVehicle(vehicleToDelist.id, {
        status: 'inactive',
        delistedDate: delistedDateValue
      });

      handleDelistSuccess(delistedDateValue);
    } catch (error: any) {
      // Handle missing column error (schema mismatch)
      if (error?.code === 'PGRST204' && error?.message?.includes('delisted_date')) {
        try {
          // Retry without the date field
          await dataService.vehicles.updateVehicle(vehicleToDelist.id, {
            status: 'inactive'
          });

          handleDelistSuccess(undefined, "Vehicle delisted (Date not saved - DB schema update required)");
          return;
        } catch (retryError) {
          logger.error('Failed to delist vehicle (retry failed)', retryError);
        }
      }

      logger.error('Failed to delist vehicle', error);
      toast({
        title: "Error",
        description: "Failed to delist vehicle",
        variant: "destructive"
      });
    }
  };

  const handleDelistSuccess = async (date?: Date, customMessage?: string) => {
    if (!vehicleToDelist) return;

    const updatedVehicles = vehicles.map(v =>
      v.id === vehicleToDelist!.id
        ? { ...v, status: 'inactive' as const, delistedDate: date, updatedAt: new Date() }
        : v
    );

    onVehiclesChange(updatedVehicles);

    await logActivity({
      action: 'delete',
      entity: 'vehicle',
      details: `Delisted vehicle ${vehicleToDelist.name}`
    });

    setIsDelistVehicleDialogOpen(false);
    setVehicleToDelist(null);
    setDelistDate("");

    toast({
      title: "Vehicle Delisted",
      description: customMessage || `${vehicleToDelist.name} has been delisted successfully`
    });
  };

  const handleSave = async () => {
    try {
      const savedSettings = await dataService.companySettings.updateCompanySettings(formData);

      // Update parent state with the fresh data
      onSave(savedSettings);

      // Show success message
      toast({
        title: "Settings Saved",
        description: "Company settings have been updated successfully."
      });
    } catch (err) {
      logger.error('Failed to save settings', err);
      toast({
        title: "Save Failed",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    }
  };



  const handleReset = async () => {
    // Confirmation handled by UI Dialog
    setIsLoading(true);
    setError(null);
    try {
      // 1. Wipe DB
      await dataService.system.resetAllData();

      // 2. Clear Parent State
      onResetAllData();

      // 3. Clear Local State
      onAssetsChange([]);
      onWaybillsChange([]);
      onQuickCheckoutsChange([]);
      onSitesChange([]);
      onSiteTransactionsChange([]);
      onEmployeesChange([]);
      onVehiclesChange([]);
      setFormData(defaultSettings);
      setLogoPreview(null);

      // 4. Update settings
      onSave(defaultSettings);

      toast({
        title: "Data Reset",
        description: "All application data has been wiped from the database."
      });

      // Optional: reload to ensure clean slate
      setTimeout(() => window.location.reload(), 1000);

    } catch (err: any) {
      setError(err.message || "Failed to reset data");
      toast({
        title: "Reset Failed",
        description: "An error occurred while cleaning the database.",
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
      const backupData: any = {
        _metadata: {
          version: '1.0',
          timestamp: new Date().toISOString(),
          appName: 'FirstLightEnding'
        }
      };

      // Collect data from props
      if (selectedItems.has('assets')) backupData.assets = assets;
      if (selectedItems.has('waybills')) backupData.waybills = waybills;
      if (selectedItems.has('quickCheckouts')) backupData.quickCheckouts = quickCheckouts;
      if (selectedItems.has('sites')) backupData.sites = sites;
      if (selectedItems.has('siteTransactions')) backupData.siteTransactions = siteTransactions;
      if (selectedItems.has('employees')) backupData.employees = employees;
      if (selectedItems.has('vehicles')) backupData.vehicles = vehicles;
      if (selectedItems.has('companySettings')) backupData.companySettings = formData;
      if (selectedItems.has('activities')) backupData.activities = activities;
      if (selectedItems.has('equipmentLogs')) backupData.equipmentLogs = equipmentLogs;
      if (selectedItems.has('consumableLogs')) backupData.consumableLogs = consumableLogs;

      // Create file and download
      const fileName = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      const fileToSave = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json'
      });
      saveAs(fileToSave, fileName);

      toast({
        title: "Backup Downloaded",
        description: `Saved as ${fileName}`
      });

      setIsBackupDialogOpen(false);
    } catch (err: any) {
      console.error('Backup error:', err);
      setError("Failed to create backup.");
      toast({
        title: "Backup Failed",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };



  // Helper function to calculate checksum
  const calculateChecksum = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Backup Scheduler Handlers
  const handleAutoBackupToggle = async (enabled: boolean) => {
    if (window.backupScheduler) {
      try {
        await window.backupScheduler.setEnabled(enabled);
        setAutoBackupEnabled(enabled);
        toast({
          title: enabled ? "Auto-Backup Enabled" : "Auto-Backup Disabled",
          description: enabled ? "Backups will run daily at 5pm" : "Automatic backups have been disabled"
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update auto-backup setting",
          variant: "destructive"
        });
      }
    }
  };

  const handleRetentionChange = async (days: number) => {
    if (window.backupScheduler) {
      try {
        await window.backupScheduler.setRetention(days);
        setBackupRetentionDays(days);
        toast({
          title: "Retention Updated",
          description: `Backups will be kept for ${days} days`
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to update retention period",
          variant: "destructive"
        });
      }
    }
  };

  const handleManualBackupTrigger = async () => {
    if (window.backupScheduler) {
      // Check if backup is already in progress
      if (isBackupInProgress) {
        toast({
          title: "Backup In Progress",
          description: "Please wait for the current backup to complete",
          variant: "destructive"
        });
        return;
      }

      // Check cooldown period (minimum 10 seconds between backups)
      const now = Date.now();
      const cooldownPeriod = 10000; // 10 seconds
      const timeSinceLastBackup = now - lastBackupTime;

      if (lastBackupTime > 0 && timeSinceLastBackup < cooldownPeriod) {
        const remainingSeconds = Math.ceil((cooldownPeriod - timeSinceLastBackup) / 1000);
        toast({
          title: "Please Wait",
          description: `Please wait ${remainingSeconds} seconds before creating another backup`,
          variant: "destructive"
        });
        return;
      }

      setIsBackupInProgress(true);
      setIsLoading(true);

      try {
        console.log('ðŸ”„ Manual backup triggered from UI (Supabase Mode)');

        // 1. Generate Backup Data locally (using Supabase)
        const backupData = await dataService.system.createBackup();

        // 2. Send to Electron to save
        const result = await window.backupScheduler.save(backupData);

        // Update last backup time
        setLastBackupTime(Date.now());

        // Refresh backups list
        const backups = await window.backupScheduler.listBackups();
        setBackupsList(backups);

        // Refresh status
        const status = await window.backupScheduler.getStatus();
        setBackupSchedulerStatus(status);
        setNasAccessible(status.nasAccessible);

        // Check if both backups succeeded
        const jsonSuccess = result.json?.success || false;
        const dbSuccess = result.database?.success || false;

        if (jsonSuccess && dbSuccess) {
          await logActivity({
            action: 'backup',
            entity: 'database',
            details: `Manual backup created: ${result.nasAccessible ? 'Saved to NAS' : 'Local only'}`
          });
          toast({
            title: "Backup Complete",
            description: result.nasAccessible
              ? "Both JSON and Database backups saved to NAS successfully"
              : "Backup failed - NAS not accessible"
          });
        } else if (jsonSuccess || dbSuccess) {
          const successType = jsonSuccess ? "JSON" : "Database";
          toast({
            title: "Partial Backup Complete",
            description: `${successType} backup created successfully. ${jsonSuccess ? 'Database' : 'JSON'} backup failed.`,
            variant: result.nasAccessible ? "default" : "destructive"
          });
        } else {
          toast({
            title: "Backup Failed",
            description: result.nasAccessible ? "Both backups failed. Check console for details." : "NAS not accessible - backup failed",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('Manual backup error:', err);
        toast({
          title: "Backup Failed",
          description: "An error occurred while creating backup",
          variant: "destructive"
        });
      } finally {
        setIsBackupInProgress(false);
        setIsLoading(false);
      }
    }
  };

  const handleCheckNAS = async () => {
    if (window.backupScheduler) {
      try {
        const result = await window.backupScheduler.checkNAS();
        setNasAccessible(result.accessible);
        toast({
          title: result.accessible ? "NAS Accessible" : "NAS Not Accessible",
          description: result.message,
          variant: result.accessible ? "default" : "destructive"
        });
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to check NAS accessibility",
          variant: "destructive"
        });
      }
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
    if (!loadedBackupData) return;
    setIsLoading(true);
    setError(null);
    setIsRestoreComplete(false);

    try {
      // Use dataService to restore
      const result = await dataService.system.restoreData(
        loadedBackupData,
        Array.from(restoreSelectedSections)
      );

      const combinedErrors = [...(result.errors || [])];

      setRestoreProgress({
        phase: 'Complete',
        total: restoreSelectedSections.size,
        done: result.success ? restoreSelectedSections.size : 0,
        message: result.success ? 'Restore success' : 'Restore failed',
        errors: combinedErrors
      });

      if (result.success && combinedErrors.length === 0) {
        setIsRestoreComplete(true);
        toast({
          title: "Restore Successful",
          description: "Data has been restored to the database. Reloading...",
          variant: "default"
        });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(`Restore completed with ${combinedErrors.length} errors.`);
        toast({ title: "Completed with Errors", description: "Some items failed to restore.", variant: "destructive" });
      }

    } catch (err: any) {
      console.error('Restore critical error:', err);
      setError("Failed to restore data: " + err.message);
      toast({ title: "Restore Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
    return; // Stop here
    /*
    if (!loadedBackupData) return;
    setIsLoading(true);
    setError(null);
    setIsRestoreComplete(false);

    try {
      const backupData = loadedBackupData;

      // Check if running in Electron with database access
      const hasDB = window.electronAPI && window.electronAPI.db;

      // Prepare live progress tracking
      setIsRestoringLive(true);
      const progressState: any = { phase: 'Parsing backup', total: 0, done: 0, message: '', errors: [] };

      // Handle Full Database Binary Restore
      if ((backupData as any).type === 'full_db') {
        if (!hasDB || !window.electronAPI.db.restoreDatabaseBackup || !window.electronAPI.db.getDatabaseInfo) {
          throw new Error("Database restore service not available");
        }

        setRestoreProgress({ ...progressState, phase: 'Restoring Database File', message: 'Replacing current database...' });

        const sourcePath = (backupData as any).path;
        // Get current DB path target
        const dbInfo = await window.electronAPI.db.getDatabaseInfo();
        const targetPath = dbInfo.localDbPath || dbInfo.dbPath;

        if (!targetPath) throw new Error("Could not determine target database location");

        // Perform restore
        const result = await window.electronAPI.db.restoreDatabaseBackup(sourcePath, targetPath);

        if (result.success) {
          setRestoreProgress({ ...progressState, done: 1, total: 1, phase: 'Complete', message: 'Database restored successfully' });
          setIsRestoreComplete(true);
          toast({
            title: "Restore Successful",
            description: "The application database has been replaced. Please restart the app.",
            variant: "default"
          });
          // Optional: Reload window? 
          // window.location.reload(); 
        } else {
          throw new Error(result.error || "Database restore failed");
        }
        return; // Exit here for DB restore
      }

      // Estimate total steps for a finer progress indicator (count only selected sections)
      try {
        if (restoreSelectedSections.has('users') && backupData.users) progressState.total += 1;
        if (restoreSelectedSections.has('assets') && backupData.assets) progressState.total += 1;
        if (restoreSelectedSections.has('waybills') && backupData.waybills) progressState.total += Math.max(1, (backupData.waybills.length || 0));
        if (restoreSelectedSections.has('quick_checkouts') && backupData.quick_checkouts) progressState.total += 1;
        if (restoreSelectedSections.has('sites') && backupData.sites) progressState.total += 1;
        if (restoreSelectedSections.has('site_transactions') && backupData.site_transactions) progressState.total += 1;
        if (restoreSelectedSections.has('employees') && backupData.employees) progressState.total += 1;
        if (restoreSelectedSections.has('vehicles') && backupData.vehicles) progressState.total += 1;
        if (restoreSelectedSections.has('equipment_logs') && backupData.equipment_logs) progressState.total += 1;
        if (restoreSelectedSections.has('consumable_logs') && backupData.consumable_logs) progressState.total += 1;
        if (restoreSelectedSections.has('activities') && backupData.activities) progressState.total += 1;
        if (restoreSelectedSections.has('company_settings') && backupData.company_settings) progressState.total += 1;
      } catch (err) {
        // ignore estimation errors
      }
      setRestoreProgress(progressState);

      // Pre-Restore Cleanup
      if (hasDB) {
      // Pre-Restore Cleanup
      if (hasDB) { // Or if (true) since we want this for Supabase too
        const clearTableSafe = async (table: string) => {
            try {
              // Use the new dataService method
              if (dataService.system.clearTable) {
                 await dataService.system.clearTable(table);
              }
            } catch (e) {
              logger.warn(`Failed to clear table ${table}`, e);
            }
        };

        setRestoreProgress((prev: any) => ({ ...prev, phase: 'Preparation', message: 'Cleaning database...' }));

        // Clear tables in reverse dependency order
        if (restoreSelectedSections.has('site_transactions')) await clearTableSafe('site_transactions');
        if (restoreSelectedSections.has('quick_checkouts')) await clearTableSafe('quick_checkouts');
        if (restoreSelectedSections.has('waybills')) await clearTableSafe('waybills');
        if (restoreSelectedSections.has('equipment_logs')) await clearTableSafe('equipment_logs');
        if (restoreSelectedSections.has('consumable_logs')) await clearTableSafe('consumable_logs');
        if (restoreSelectedSections.has('activities')) await clearTableSafe('activities');
        if (restoreSelectedSections.has('assets')) await clearTableSafe('assets');
        if (restoreSelectedSections.has('vehicles')) await clearTableSafe('vehicles');
        if (restoreSelectedSections.has('employees')) await clearTableSafe('employees');
        if (restoreSelectedSections.has('sites')) await clearTableSafe('sites');
      }

      // Restore users
      if (restoreSelectedSections.has('users') && backupData.users && backupData.users.length > 0) {
        setRestoreProgress((prev) => ({ ...prev, phase: 'Restoring users', message: 'Creating user accounts...' }));
        if (hasDB) {
          let idx = 0;
          for (const user of backupData.users) {
            try {
              logger.info(`User ${user.username} in backup - manual password setup may be needed`);
            } catch (err) {
              logger.warn(`Could not restore user ${user.username}`, err);
              progressState.errors.push({ section: 'users', id: user.username, error: String(err) });
            }
            idx++;
            setRestoreProgress((prev) => ({ ...prev, done: (prev.done || 0) + 1, message: `${idx}/${backupData.users.length} users processed` }));
          }
        }
      }

      // Restore sites
      if (restoreSelectedSections.has('sites') && backupData.sites) {
        const sites = backupData.sites.map((site: any) => ({
          ...site,
          createdAt: new Date(site.createdAt),
          updatedAt: new Date(site.updatedAt)
        }));

        if (hasDB) {
          for (const site of sites) {
            try {
              const existingSites = await window.electronAPI.db.getSites();
              const exists = existingSites.some((s: any) => s.id === site.id);
              if (exists) {
                await window.electronAPI.db.updateSite(site.id, site);
              } else {
                await window.electronAPI.db.createSite(site);
              }
            } catch (err) {
              logger.warn(`Could not restore site ${site.id}`, err);
            }
          }
        }

        onSitesChange(sites);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring sites' }));
      }

      // Restore employees
      if (restoreSelectedSections.has('employees') && backupData.employees) {
        const employees = backupData.employees.map((emp: any) => ({
          ...emp,
          createdAt: new Date(emp.createdAt),
          updatedAt: new Date(emp.updatedAt)
        }));

        if (hasDB) {
          for (const emp of employees) {
            try {
              const existingEmployees = await window.electronAPI.db.getEmployees();
              const exists = existingEmployees.some((e: any) => e.id === emp.id);
              if (exists) {
                await window.electronAPI.db.updateEmployee(emp.id, emp);
              } else {
                await window.electronAPI.db.createEmployee(emp);
              }
            } catch (err) {
              logger.warn(`Could not restore employee ${emp.id}`, err);
            }
          }
        }

        onEmployeesChange(employees);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring employees' }));
      }

      // Restore vehicles
      if (restoreSelectedSections.has('vehicles') && backupData.vehicles) {
        const vehicles = backupData.vehicles || [];

        if (hasDB) {
          for (const vehicle of vehicles) {
            try {
              const existingVehicles = await window.electronAPI.db.getVehicles();
              const exists = existingVehicles.some((v: any) => v.id === vehicle.id);
              if (exists) {
                await window.electronAPI.db.updateVehicle(vehicle.id, vehicle);
              } else {
                await window.electronAPI.db.createVehicle(vehicle);
              }
            } catch (err) {
              logger.warn(`Could not restore vehicle ${vehicle.id}`, err);
            }
          }
        }

        onVehiclesChange(vehicles);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring vehicles' }));
      }

      // Restore assets
      if (restoreSelectedSections.has('assets') && backupData.assets) {
        const assets = backupData.assets.map((asset: any) => ({
          ...asset,
          unitOfMeasurement: asset.unitOfMeasurement || 'units',
          createdAt: new Date(asset.createdAt),
          updatedAt: new Date(asset.updatedAt)
        }));

        if (hasDB) {
          setRestoreProgress((p: any) => ({ ...p, phase: 'Restoring assets', message: 'Saving assets to database...' }));
          for (const asset of assets) {
            try {
              const existingAssets = await window.electronAPI.db.getAssets();
              const exists = existingAssets.some((a: any) => a.id === asset.id);
              if (exists) {
                await window.electronAPI.db.updateAsset(asset.id, asset);
              } else {
                await window.electronAPI.db.createAsset(asset);
              }
            } catch (err) {
              logger.warn(`Could not restore asset ${asset.id}`, err);
              progressState.errors.push({ section: 'assets', id: asset.id, error: String(err) });
            }
          }
          setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1 }));
        }

        onAssetsChange(assets);
        window.dispatchEvent(new CustomEvent('refreshAssets', { detail: assets }));
      }

      // Restore waybills
      if (restoreSelectedSections.has('waybills') && backupData.waybills) {
        const waybills = backupData.waybills.map((waybill: any) => {
          let items = waybill.items;
          if (typeof items === 'string') {
            try { items = JSON.parse(items); } catch { items = []; }
          }
          return {
            ...waybill,
            items: Array.isArray(items) ? items : [],
            issueDate: new Date(waybill.issueDate),
            expectedReturnDate: waybill.expectedReturnDate ? new Date(waybill.expectedReturnDate) : undefined,
            createdAt: new Date(waybill.createdAt),
            updatedAt: new Date(waybill.updatedAt)
          };
        });

        const waybillPersistErrors: Array<{ id?: string; error: any }> = [];
        if (hasDB) {
          setRestoreProgress((p: any) => ({ ...p, phase: 'Restoring waybills', message: `0/${waybills.length} waybills restored` }));
          let idx = 0;
          for (const waybill of waybills) {
            try {
              await window.electronAPI.db.createWaybill(waybill, { skipStockUpdate: true });
            } catch (err) {
              logger.warn(`Could not restore waybill ${waybill.id} - may already exist`, err);
              waybillPersistErrors.push({ id: waybill.id, error: err });
              progressState.errors.push({ section: 'waybills', id: waybill.id, error: String(err) });
            }
            idx++;
            setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, message: `${idx}/${waybills.length} waybills restored` }));
          }
        }

        onWaybillsChange(waybills);
        window.dispatchEvent(new Event('refreshWaybills'));

        // Reload waybills from database after restore
        if (hasDB) {
          try {
            const persistedWaybills = await window.electronAPI.db.getWaybills();
            if (persistedWaybills && typeof onWaybillsChange === 'function') {
              onWaybillsChange(persistedWaybills);
              window.dispatchEvent(new Event('refreshWaybills'));
            }
          } catch (err) {
            console.warn('Failed to reload waybills after restore', err);
          }
        }

        if (waybillPersistErrors.length > 0) {
          logger.error('Waybill restore errors (details)', { data: { waybillPersistErrors } });
          logger.warn('Waybill restore errors', { data: waybillPersistErrors.map(e => ({ id: e.id, message: e.error?.message || e.error || String(e) })) });
          const firstMsg = waybillPersistErrors[0].error?.message || waybillPersistErrors[0].error || 'Unknown error';
          toast({
            title: 'Restore Partial Failure',
            description: `${waybillPersistErrors.length} waybill(s) failed to persist. First error: ${firstMsg}`,
            variant: 'destructive'
          });
        }
      }

      // Restore quick checkouts
      if (restoreSelectedSections.has('quick_checkouts') && backupData.quick_checkouts) {
        const checkouts = backupData.quick_checkouts.map((checkout: any) => {
          let date = new Date(checkout.checkoutDate);
          if (isNaN(date.getTime())) date = new Date(); // Fallback to now if invalid
          return {
            ...checkout,
            assetId: checkout.assetId || checkout.asset_id, // Ensure assetId is present
            checkoutDate: date,
            expectedReturnDays: checkout.expectedReturnDays
          };
        });

        if (hasDB) {
          for (const checkout of checkouts) {
            try {
              await window.electronAPI.db.createQuickCheckout(checkout);
            } catch (err) {
              logger.warn(`Could not restore quick checkout ${checkout.id} - may already exist`, err);
            }
          }
        }

        onQuickCheckoutsChange(checkouts);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring quick checkouts' }));
      }

      // Restore site transactions
      if (restoreSelectedSections.has('site_transactions') && backupData.site_transactions) {
        const transactions = backupData.site_transactions.map((transaction: any) => {
          let dateStr = transaction.created_at || transaction.createdAt;
          if (!dateStr || String(dateStr).startsWith('0NaN')) {
            dateStr = new Date().toISOString();
          }

          // Generic DB insert bypasses transform, so we must map to snake_case manually
          return {
            id: transaction.id,
            site_id: transaction.siteId || transaction.site_id,
            asset_id: transaction.assetId || transaction.asset_id,
            asset_name: transaction.assetName || transaction.asset_name,
            quantity: transaction.quantity,
            type: transaction.type,
            transaction_type: transaction.transactionType || transaction.transaction_type,
            reference_id: transaction.referenceId || transaction.reference_id,
            reference_type: transaction.referenceType || transaction.reference_type,
            condition: transaction.condition,
            notes: transaction.notes,
            created_by: transaction.createdBy || transaction.created_by,
            created_at: dateStr
          };
        });

        if (hasDB) {
          for (const transaction of transactions) {
            try {
              await window.electronAPI.db.addSiteTransaction(transaction);
            } catch (err) {
              logger.warn(`Could not restore site transaction ${transaction.id} - may already exist`, err);
            }
          }
        }

        onSiteTransactionsChange(transactions);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring site transactions' }));
      }

      // Restore equipment logs
      if (restoreSelectedSections.has('equipment_logs') && backupData.equipment_logs && onEquipmentLogsChange) {
        const logs = backupData.equipment_logs.map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt),
          updatedAt: log.updatedAt ? new Date(log.updatedAt) : undefined
        }));

        if (hasDB) {
          for (const log of logs) {
            try {
              await window.electronAPI.db.createEquipmentLog(log);
            } catch (err) {
              logger.warn(`Could not restore equipment log ${log.id} - may already exist`, err);
            }
          }
        }

        onEquipmentLogsChange(logs);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring equipment logs' }));
      }

      // Restore consumable logs
      if (restoreSelectedSections.has('consumable_logs') && backupData.consumable_logs && onConsumableLogsChange) {
        const logs = backupData.consumable_logs.map((log: any) => ({
          ...log,
          createdAt: new Date(log.createdAt),
          updatedAt: log.updatedAt ? new Date(log.updatedAt) : undefined
        }));

        if (hasDB) {
          for (const log of logs) {
            try {
              await window.electronAPI.db.createConsumableLog(log);
            } catch (err) {
              logger.warn(`Could not restore consumable log ${log.id} - may already exist`, err);
            }
          }
        }

        onConsumableLogsChange(logs);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring consumable logs' }));
      }

      // Restore activities
      if (restoreSelectedSections.has('activities') && backupData.activities && onActivitiesChange) {
        const activities = backupData.activities.map((activity: any) => ({
          ...activity,
          createdAt: new Date(activity.createdAt)
        }));

        if (hasDB) {
          for (const activity of activities) {
            try {
              await window.electronAPI.db.createActivity(activity);
            } catch (err) {
              logger.warn(`Could not restore activity ${activity.id} - may already exist`, err);
            }
          }
        }

        onActivitiesChange(activities);
        setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring activities' }));
      }

      // Restore company settings
      if (restoreSelectedSections.has('company_settings') && backupData.company_settings && backupData.company_settings.length > 0) {
        try {
          const restoredSettings = { ...defaultSettings, ...backupData.company_settings[0] };

          if (!restoredSettings.companyName) {
            restoredSettings.companyName = defaultSettings.companyName || 'Company';
          }

          if (hasDB) {
            try {
              await window.electronAPI.db.updateCompanySettings(null, restoredSettings);
            } catch (err) {
              logger.warn('Could not restore company settings to database', err);
            }
          }

          setFormData(restoredSettings);
          setLogoPreview(restoredSettings.logo || null);
          onSave(restoredSettings);
          setRestoreProgress((p: any) => ({ ...p, done: (p.done || 0) + 1, phase: 'Restoring company settings' }));
        } catch (err) {
          logger.warn('Error processing company settings from backup', err);
        }
      }

      // finalize progress
      setRestoreProgress((p: any) => ({ ...p, phase: 'Completed', done: p.total || p.done, message: 'Restore completed successfully!' }));
      setIsRestoreComplete(true);
      setIsRestoringLive(false);

      toast({
        title: "Data Restored",
        description: `Data has been restored successfully${hasDB ? ' and saved to database' : ' (data not persisted - database unavailable)'}.`
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
      setRestoreProgress((p: any) => ({ ...p, phase: 'Error', message: String(err) }));
      toast({
        title: "Restore Failed",
        description: "An error occurred while restoring data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  */ };

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

  const handleRestoreFromNAS = async (filePath: string) => {
    setIsLoading(true);
    try {
      // Handle Database Backup (.db / .sqlite)
      if (filePath.endsWith('.db') || filePath.endsWith('.sqlite')) {
        const fileName = filePath.split(/[\\/]/).pop() || 'database.db';
        setLoadedBackupData({ type: 'full_db', path: filePath, name: fileName } as any);
        const sections = ['full_database']; // Special section indicating full binary restore
        setAvailableSections(sections);
        setRestoreSelectedSections(new Set(sections));
        setShowRestoreSectionSelector(true);
        setIsRestoreOpen(true);
        setIsLoading(false);
        return;
      }

      if (window.backupScheduler && window.backupScheduler.readBackupFile) {
        const result = await window.backupScheduler.readBackupFile(filePath);

        if (result.success && result.data) {
          let backupData = result.data;

          // Handle wrapped data structure (metadata + data)
          if (backupData.data && !backupData.users && !backupData.assets) {
            backupData = backupData.data;
          }

          setLoadedBackupData(backupData);

          // Detect available sections
          const sections: string[] = [];
          if (backupData.users) sections.push('users');
          if (backupData.assets) sections.push('assets');
          if (backupData.waybills) sections.push('waybills');
          if (backupData.quick_checkouts) sections.push('quick_checkouts');
          if (backupData.sites) sections.push('sites');
          if (backupData.site_transactions) sections.push('site_transactions');
          if (backupData.employees) sections.push('employees');
          if (backupData.vehicles) sections.push('vehicles');
          if (backupData.equipment_logs) sections.push('equipment_logs');
          if (backupData.consumable_logs) sections.push('consumable_logs');
          if (backupData.activities) sections.push('activities');
          if (backupData.company_settings) sections.push('company_settings');

          setAvailableSections(sections);
          setRestoreSelectedSections(new Set(sections));

          // Open restore dialog and show section selector
          setIsRestoreOpen(true);
          setShowRestoreSectionSelector(true);

          toast({
            title: "Backup Loaded",
            description: "Please select sections to restore."
          });
        } else {
          throw new Error(result.error || "Failed to read backup file");
        }
      } else {
        throw new Error("Backup service not available");
      }
    } catch (err: any) {
      logger.error('Error loading NAS backup', err);
      toast({
        title: "Load Failed",
        description: err.message || "Could not load backup file from NAS.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Support .db / .sqlite files for full database restore
    if (file && (file.name.endsWith('.db') || file.name.endsWith('.sqlite'))) {
      setRestoreFile(file);
      // Special marker for DB restore - verify path exists (Electron specific)
      const path = (file as any).path;
      if (path) {
        setLoadedBackupData({ type: 'full_db', path: path, name: file.name } as any);
        const sections = ['full_database']; // Special section indicating full binary restore
        setAvailableSections(sections);
        setRestoreSelectedSections(new Set(sections));
        setShowRestoreSectionSelector(true);
      } else {
        toast({
          title: "File Path Error",
          description: "Cannot determine file path. Full DB restore requires local file access.",
          variant: "destructive"
        });
      }
      return;
    }

    if (file && file.name.endsWith('.json')) {
      setRestoreFile(file);
      // Automatically load and parse the backup file to show available sections
      file.text().then(text => {
        try {
          const backupData = JSON.parse(text);
          setLoadedBackupData(backupData);

          // Detect available sections
          const sections: string[] = [];
          if (backupData.users) sections.push('users');
          if (backupData.assets) sections.push('assets');
          if (backupData.waybills) sections.push('waybills');
          if (backupData.quick_checkouts) sections.push('quick_checkouts');
          if (backupData.sites) sections.push('sites');
          if (backupData.site_transactions) sections.push('site_transactions');
          if (backupData.employees) sections.push('employees');
          if (backupData.vehicles) sections.push('vehicles');
          if (backupData.equipment_logs) sections.push('equipment_logs');
          if (backupData.consumable_logs) sections.push('consumable_logs');
          if (backupData.activities) sections.push('activities');
          if (backupData.company_settings) sections.push('company_settings');

          setAvailableSections(sections);
          // By default select all available sections
          setRestoreSelectedSections(new Set(sections));
          setShowRestoreSectionSelector(true);
        } catch (err) {
          toast({
            title: "Invalid Backup File",
            description: "The selected file is not a valid backup JSON.",
            variant: "destructive"
          });
        }
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON backup file.",
        variant: "destructive"
      });
    }
  };

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
      setIsAddUserDialogOpen(false);
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
      setEditUserPassword('');
      setEditUserRole(user.role);
    }
  };

  const handleSaveUserEdit = async () => {
    if (!editingUserId || !editUserName.trim() || !editUserUsername.trim()) return;

    const updateData: any = {
      name: editUserName.trim(),
      username: editUserUsername.trim(),
      role: editUserRole,
    };

    // Only include password if it's been entered
    if (editUserPassword.trim()) {
      updateData.password = editUserPassword.trim();
    }

    const result = await updateUser(editingUserId, updateData);

    if (result.success) {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
      setEditingUserId(null);
      setEditUserName('');
      setEditUserUsername('');
      setEditUserPassword('');
      setEditUserRole('staff');
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
    setEditUserPassword('');
    setEditUserRole('staff');
    setEditUserRole('staff');
  };

  // Build tabs list dynamically based on permissions
  const settingsTabs = React.useMemo(() => {
    const tabs = [
      { value: "company", label: "Company Info", shortLabel: "Company", icon: <Building className="h-4 w-4" /> },
    ];

    if (hasPermission('manage_users')) {
      tabs.push({ value: "users", label: "User Management", shortLabel: "Users", icon: <Users className="h-4 w-4" /> });
    }

    if (currentUser?.role !== 'staff') {
      tabs.push(
        { value: "employees", label: "Employees", shortLabel: "Staff", icon: <UserPlus className="h-4 w-4" /> },
        { value: "vehicles", label: "Vehicles", shortLabel: "Cars", icon: <Car className="h-4 w-4" /> },
        { value: "data", label: "Data Management", shortLabel: "Data", icon: <Database className="h-4 w-4" /> },
        { value: "updates", label: "App Updates", shortLabel: "Updates", icon: <Sparkles className="h-4 w-4" /> }
      );
    }

    return tabs;
  }, [currentUser?.role, hasPermission]);

  // Derived list of roles for Combobox (Standard + Custom/Existing)
  const employeeRoles = useMemo(() => {
    const standardRoles = [
      "Head of Admin",
      "Head of Operations",
      "Projects Supervisor",
      "Logistics and Warehouse Officer",
      "Admin Manager",
      "Admin Assistant",
      "Foreman",
      "Engineer",
      "Trainee Site Manager",
      "Site Supervisor",
      "Admin Clerk",
      "Assistant Supervisor",
      "Site Worker",
      "Driver",
      "Security",
      "Adhoc Staff",
      "Consultant",
      "IT Student",
      "Manager",
      "Staff"
    ];

    // Add any roles that exist in the employee list but aren't in standard
    const currentRoles = employees.map(e => e.role).filter(Boolean);
    const allRoles = Array.from(new Set([...standardRoles, ...currentRoles]));

    return allRoles.sort().map(role => ({
      value: role,
      label: role
    }));
  }, [employees]);

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      <div className="px-0">
        <h1 className="text-xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2">
          Configure your company and app settings
        </p>
      </div>

      {/* Mobile: Dropdown selector for tabs */}
      {isMobile ? (
        <div className="w-full">
          <Select value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
            <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl text-base font-medium">
              <div className="flex items-center gap-2">
                {settingsTabs.find(t => t.value === activeSettingsTab)?.icon}
                <SelectValue>
                  {settingsTabs.find(t => t.value === activeSettingsTab)?.label}
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-[60vh]">
              {settingsTabs.map((tab) => (
                <SelectItem
                  key={tab.value}
                  value={tab.value}
                  className="py-3 text-base"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        // Desktop: Standard tabs
        <div className="w-full">
          <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
            <TabsList className="h-auto w-full flex flex-wrap justify-start bg-muted/50 p-1 gap-1">
              {settingsTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 min-w-[140px] flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Settings Content */}
      {activeSettingsTab === "company" && (
        <div className="space-y-4 md:space-y-6 mt-4">
          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
            {/* Company Information */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Company Information
                </CardTitle>
                {isAdmin ? (
                  <Button
                    variant={isCompanyInfoEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsCompanyInfoEditing(!isCompanyInfoEditing)}
                  >
                    {isCompanyInfoEditing ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Lock
                      </>
                    ) : (
                      <>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </>
                    )}
                  </Button>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    View Only
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName || ""}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    disabled={!isCompanyInfoEditing}
                    className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isCompanyInfoEditing}
                    className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      disabled={!isCompanyInfoEditing}
                      className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="company@example.com"
                      disabled={!isCompanyInfoEditing}
                      className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website" className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Website
                  </Label>
                  <Input
                    id="website"
                    value={formData.website || ""}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    disabled={!isCompanyInfoEditing}
                    className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4 border-t sm:grid-cols-2 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="maintenanceFrequency">Maintenance Frequency (Days)</Label>
                    <Input
                      id="maintenanceFrequency"
                      type="number"
                      value={formData.maintenanceFrequency ?? 60}
                      onChange={(e) => setFormData({ ...formData, maintenanceFrequency: parseInt(e.target.value) || 60 })}
                      disabled={!isCompanyInfoEditing}
                      className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                    />
                    <p className="text-xs text-muted-foreground">Default interval for equipment maintenance alerts</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currencySymbol">Currency Symbol</Label>
                    <Input
                      id="currencySymbol"
                      value={formData.currencySymbol || ""}
                      onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                      disabled={!isCompanyInfoEditing}
                      className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                    />
                    <p className="text-xs text-muted-foreground">Currency symbol displayed throughout the app</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="electricityRate" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Electricity Rate (per kWh)
                    </Label>
                    <Input
                      id="electricityRate"
                      type="number"
                      value={formData.electricityRate ?? 200}
                      onChange={(e) => setFormData({ ...formData, electricityRate: parseFloat(e.target.value) || 200 })}
                      disabled={!isCompanyInfoEditing}
                      className={!isCompanyInfoEditing ? "bg-muted cursor-not-allowed" : ""}
                    />
                    <p className="text-xs text-muted-foreground">Cost per kWh for electricity calculations</p>
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
                  <div className="w-32 h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                    <img
                      src={logoPreview || formData.logo || "./logo.png"}
                      alt="Company Logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback if logo.png is missing or broken
                        e.currentTarget.src = "./favicon.ico";
                      }}
                    />
                  </div>
                  {isCompanyInfoEditing && (
                    <div className="flex flex-col items-center w-full">
                      <Label htmlFor="logo-upload" className="cursor-pointer">
                        <Button variant="outline" size="sm" className="pointer-events-none">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Logo
                        </Button>
                      </Label>
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const result = reader.result as string;
                              setLogoPreview(result);
                              setFormData({ ...formData, logo: result });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <p className="text-[10px] text-muted-foreground mt-2">Recommended: 200x200px PNG/JPG</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {isCompanyInfoEditing && isAdmin && (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  handleSave();
                  setIsCompanyInfoEditing(false);
                }}
                className="bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
                disabled={isLoading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </div>
          )}
        </div>
      )}

      {/* User Management Tab */}
      {activeSettingsTab === "users" && hasPermission('manage_users') && (
        <EnhancedUserManagement
          users={users}
          onUsersChange={setUsers}
          employees={employees}
          activities={activities}
          onSave={handleSave}
          isLoading={isLoading}
        />
      )}

      {/* Old User Management Tab - Archived */}
      {false && (
        <div className="space-y-4 md:space-y-6 mt-4">
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-3 md:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <h4 className="font-medium text-sm md:text-base">Manage Users</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => setIsAddUserDialogOpen(true)} className="gap-2 flex-1 sm:flex-none" size={isMobile ? "sm" : "default"}>
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                  <Button
                    variant="secondary"
                    size={isMobile ? "sm" : "default"}
                    className="gap-2 flex-1 sm:flex-none"
                    onClick={() => {
                      const baseUrl = window.location.origin + window.location.pathname;
                      const inviteLink = `${baseUrl}#/signup?invite=dcel-inv-2024`;
                      const subject = encodeURIComponent('You have been invited to join DCEL Inventory');
                      const body = encodeURIComponent(`Hello,\n\nYou have been invited to create an account on DCEL Inventory.\n\nClick the link below to sign up:\n${inviteLink}\n\nThis link will take you to the registration page.\n\nRegards,\n${currentUser?.name || 'Admin'}`);
                      window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
                      toast({
                        title: "Invite Email",
                        description: "Your email client should open with the invite link. You can also copy the link manually."
                      });
                      navigator.clipboard.writeText(inviteLink).catch(() => { });
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Send Invite
                  </Button>
                  <Button variant="outline" onClick={() => setShowPermissionsTable(!showPermissionsTable)} size={isMobile ? "sm" : "default"} className="flex-1 sm:flex-none text-xs sm:text-sm">
                    {showPermissionsTable ? 'List View' : 'Table View'}
                  </Button>
                </div>
              </div>

              {/* User Permissions Table (Desktop Only) */}
              {!isMobile && showPermissionsTable ? (
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
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user, idx) => (
                            <TableRow key={user.id || user.username || idx}>
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
                                    <div className="flex gap-1">
                                      <Button size="sm" onClick={handleSaveUserEdit}>Save</Button>
                                      <Button size="sm" variant="outline" onClick={handleCancelUserEdit}>Cancel</Button>
                                    </div>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell>{user.name}</TableCell>
                                  <TableCell>@{user.username}</TableCell>
                                  <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
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
                        <div key={user.id} className={`flex items-center justify-between border p-3 rounded ${isMobile ? 'flex-col items-stretch gap-4' : ''}`}>
                          {editingUserId === user.id ? (
                            <div className={`flex gap-2 flex-1 ${isMobile ? 'flex-col' : ''}`}>
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
                              <Input
                                type="password"
                                value={editUserPassword}
                                onChange={(e) => setEditUserPassword(e.target.value)}
                                placeholder="New Password (optional)"
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
                                  <SelectItem value="site_worker">Site Worker</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button size="sm" onClick={handleSaveUserEdit}>Save</Button>
                              <Button size="sm" variant="outline" onClick={handleCancelUserEdit}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <div>
                                <div className="font-medium">{user.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  @{user.username} • {user.role.replace('_', ' ')}
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
            <DialogContent className="sm:max-w-md w-full h-screen sm:h-auto flex flex-col p-0 sm:p-6 gap-0 bg-background">
              <DialogHeader className="px-6 py-4 border-b sm:border-0 sticky top-0 bg-background z-10 flex flex-row items-center justify-between space-y-0 text-left">
                <div>
                  <DialogTitle className="text-lg font-semibold">Add New User</DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    Enter user details below.
                  </DialogDescription>
                </div>
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => setIsAddUserDialogOpen(false)} className="-mr-2">
                    <X className="h-5 w-5" />
                  </Button>
                )}
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="employee-select">Employee</Label>
                  <Select value={newUserName} onValueChange={(value) => setNewUserName(value)}>
                    <SelectTrigger id="employee-select" className="w-full">
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={newUserUsername}
                    onChange={(e) => setNewUserUsername(e.target.value)}
                    placeholder="johndoe"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">User will login with this username (no email required)</p>
                </div>

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

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUserRole} onValueChange={(value: UserRole) => setNewUserRole(value)}>
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="data_entry_supervisor">Data Entry Supervisor</SelectItem>
                      <SelectItem value="regulatory">Regulatory</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="site_worker">Site Worker</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t sm:border-0 bg-background sticky bottom-0 z-10 gap-2 sm:gap-0">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => setIsAddUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1 sm:flex-none" onClick={handleCreateUser}>
                  Create User
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Live Restore Progress Dialog */}
          <Dialog open={isRestoringLive} onOpenChange={(v) => { if (!v) setIsRestoringLive(false); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Restoring Data</DialogTitle>
                <DialogDescription>
                  The restore is running â€” progress updates will appear here.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="text-sm">Phase: <strong>{restoreProgress.phase}</strong></div>
                <div className="text-sm">Status: {restoreProgress.message || ''}</div>
                <div className="text-sm">Completed: {restoreProgress.done || 0}{restoreProgress.total ? ` / ${restoreProgress.total}` : ''}</div>
                {restoreProgress.errors && restoreProgress.errors.length > 0 && (
                  <div className="pt-2">
                    <div className="font-medium">Errors</div>
                    <ul className="text-xs text-destructive max-h-40 overflow-auto">
                      {restoreProgress.errors.map((e: any, i: number) => (
                        <li key={i} className="truncate">{e.section}: {e.id || ''} â€” {String(e.error || e.message || e)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsRestoringLive(false); }}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex justify-end">
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
      )}
      {/* End of archived User Management Tab */}

      {/* Employees Tab */}
      {activeSettingsTab === "employees" && (
        <EnhancedEmployeeManagement
          employees={employees}
          onEmployeesChange={onEmployeesChange}
          employeeRoles={employeeRoles}
          hasPermission={hasPermission}
          onAnalytics={(emp) => setAnalyticsEmployee(emp)}
        />
      )}

      {/* Old Employee Management Tab - Archived */}
      {false && (
        <>
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Employee Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex justify-between items-center ${isMobile ? 'flex-col items-start gap-4 mb-4' : ''}`}>
                <h4 className="font-medium">Active Employees</h4>
                {hasPermission('write_employees') && (
                  <Button onClick={() => setIsAddEmployeeDialogOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Employee
                  </Button>
                )}
              </div>
              <div>
                {employees.filter(emp => emp.status === 'active').length === 0 ? (
                  <p className="text-muted-foreground">No active employees added yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {employees.filter(emp => emp.status === 'active').map(emp => (
                      <li key={emp.id} className={`flex justify-between items-center border p-2 rounded ${isMobile ? 'flex-col items-stretch gap-3' : ''}`}>
                        {editingEmployeeId === emp.id ? (
                          <div className={`flex gap-2 flex-1 ${isMobile ? 'flex-col' : ''}`}>
                            <Input
                              value={tempEmployeeName}
                              onChange={(e) => setTempEmployeeName(e.target.value)}
                              placeholder="Employee Name"
                              className="flex-1"
                            />
                            <Combobox
                              options={employeeRoles}
                              value={tempEmployeeRole}
                              onValueChange={(value) => setTempEmployeeRole(value)}
                              placeholder="Select Role"
                              className="w-48"
                            />
                            <Button size="sm" onClick={handleSaveEmployeeEdit}>Save</Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEmployeeEdit}>Cancel</Button>
                          </div>
                        ) : (
                          <>
                            <span>{emp.name} ({emp.role}) {emp.email && `- ${emp.email}`}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setAnalyticsEmployee(emp)} title="View Analytics">
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                              {hasPermission('write_employees') && (
                                <Button size="sm" variant="outline" onClick={() => handleEditEmployee(emp.id)}>Edit</Button>
                              )}
                              {hasPermission('delist_employees') && (
                                <Button size="sm" variant="destructive" onClick={() => { setEmployeeToDelist(emp); setIsDelistEmployeeDialogOpen(true); }}>Delist</Button>
                              )}
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
                <Combobox
                  options={employeeRoles}
                  value={employeeRole}
                  onValueChange={(value) => setEmployeeRole(value)}
                  placeholder="Select or Type Role"
                  className="w-full"
                />
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

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
              disabled={isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </>
      )}
      {/* End of archived Employee Management Tab */}

      {/* Vehicles Tab */}
      {activeSettingsTab === "vehicles" && (
        <EnhancedVehicleManagement
          vehicles={vehicles}
          onVehiclesChange={onVehiclesChange}
          hasPermission={hasPermission}
          onAnalytics={(veh) => setAnalyticsVehicle(veh)}
        />
      )}

      {/* Old Vehicle Management Tab - Archived */}
      {false && (
        <div className="space-y-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex gap-2 ${isMobile ? 'flex-col items-stretch' : ''}`}>
                <Input
                  placeholder="Vehicle Name/Plate"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  className="flex-1"
                />
                {hasPermission('write_vehicles') && (
                  <Button onClick={handleAddVehicle}>Add</Button>
                )}
              </div>

              {/* Active Vehicles */}
              <div>
                <h4 className="font-medium mb-2">Active Vehicles</h4>
                {vehicles.filter(v => v.status === 'active').length === 0 ? (
                  <p className="text-muted-foreground">No active vehicles added yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {vehicles.filter(v => v.status === 'active').map((vehicle) => (
                      <li key={vehicle.id} className={`flex justify-between items-center border p-2 rounded ${isMobile ? 'flex-col items-stretch gap-3' : ''}`}>
                        {editingVehicleIndex === vehicles.indexOf(vehicle) ? (
                          <div className={`flex gap-2 flex-1 ${isMobile ? 'flex-col' : ''}`}>
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
                              {hasPermission('write_vehicles') && (
                                <Button size="sm" variant="ghost" onClick={() => setAnalyticsVehicle(vehicle)} title="View Analytics">
                                  <BarChart3 className="h-4 w-4" />
                                </Button>
                              )}
                              {hasPermission('write_vehicles') && (
                                <Button size="sm" variant="outline" onClick={() => handleEditVehicle(vehicle.id)}>Edit</Button>
                              )}
                              {hasPermission('delete_vehicles') && (
                                <Button size="sm" variant="destructive" onClick={() => handleRemoveVehicle(vehicle.id)}>Delist</Button>
                              )}
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Past Vehicles */}
              {vehicles.filter(v => v.status === 'inactive').length > 0 && (
                <div>
                  <h4 className="font-medium mt-4 mb-2">Past Vehicles (Delisted)</h4>
                  <ul className="space-y-2 max-h-48 overflow-y-auto">
                    {vehicles.filter(v => v.status === 'inactive').map((vehicle) => (
                      <li key={vehicle.id} className="flex justify-between items-center border p-2 rounded opacity-75">
                        <span>
                          {vehicle.name}
                          {vehicle.delistedDate ? ` - Delisted: ${new Date(vehicle.delistedDate).toLocaleDateString()}` : ''}
                        </span>
                        {hasPermission('write_vehicles') && (
                          <Button size="sm" variant="outline" onClick={() => handleReactivateVehicle(vehicle.id)}>Reactivate</Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </CardContent>
          </Card>

          <Dialog open={isDelistVehicleDialogOpen} onOpenChange={setIsDelistVehicleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delist Vehicle</DialogTitle>
                <DialogDescription>
                  Delisting a vehicle marks it as inactive while preserving its history.
                  You can reactivate it later if needed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm font-medium">Delist {vehicleToDelist?.name}</p>
                <div className="space-y-2">
                  <Label>Delisting Date</Label>
                  <Input
                    type="date"
                    value={delistDate}
                    onChange={(e) => setDelistDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDelistVehicleDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmedDelistVehicle}>Delist Vehicle</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex justify-end">
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
      )}
      {/* End of archived Vehicle Management Tab */}


      {/* Data Management Tab */}
      {activeSettingsTab === "data" && (
        <div className="space-y-6 mt-4">

          {/* Top action cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Backup card */}
            <Card className="border-0 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="h-5 w-5 text-primary" />
                  Backup Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Download a JSON snapshot of all selected data sections. Store it safely — you can restore from it later.
                </p>
                <Button className="w-full gap-2" variant="outline" disabled={isLoading} onClick={() => setIsBackupDialogOpen(true)}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Create Backup
                </Button>
              </CardContent>
            </Card>

            {/* Restore card */}
            {hasPermission('restore_data') && (
              <Card className="border-0 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UploadCloud className="h-5 w-5 text-amber-500" />
                    Restore Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Upload a previously created JSON backup file to restore your data into the database.
                  </p>
                  <Button className="w-full gap-2" variant="outline" disabled={isLoading} onClick={() => setIsRestoreOpen(true)}>
                    <UploadCloud className="h-4 w-4" />
                    Restore from File
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Reset card */}
            {hasPermission('reset_data') && (
              <Card className="border border-destructive/30 bg-destructive/5 shadow-soft">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <Trash2 className="h-5 w-5" />
                    Reset All Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Permanently wipe all inventory data from the database. <strong>This cannot be undone.</strong>
                  </p>
                  <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full gap-2" disabled={isLoading}>
                        <Trash2 className="h-4 w-4" />
                        Reset All Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset All Data</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete all assets, waybills, returns, sites, employees, vehicles, and settings. This action <strong>cannot be undone</strong>. Make sure you have a backup first.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Yes, Reset Everything
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Activity Log */}
          <Card className="border-0 shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ActivityIcon className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">View and export a record of all user actions in the system.</p>
              <Button variant="outline" className="gap-2" onClick={() => setShowActivityLog(true)}>
                <ActivityIcon className="h-4 w-4" />
                View Activity Log
              </Button>
            </CardContent>
          </Card>

          {/* Automatic Backup Scheduler Panel (Electron only) */}
          {window.backupScheduler && (
            <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Automatic Backup Scheduler
                </CardTitle>
                <p className="text-sm text-muted-foreground">Configure automatic daily backups to NAS and local storage</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <div className="text-2xl font-bold mt-1">
                      {autoBackupEnabled ? <span className="text-green-600">Enabled</span> : <span className="text-gray-500">Disabled</span>}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">Next Backup</div>
                    <div className="text-lg font-semibold mt-1">
                      {backupSchedulerStatus?.nextRun
                        ? (() => { try { const d = new Date(backupSchedulerStatus.nextRun); return !isNaN(d.getTime()) ? d.toLocaleString() : 'Today at 5:00 PM'; } catch { return 'Today at 5:00 PM'; } })()
                        : 'Today at 5:00 PM'}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">NAS Status</div>
                    <div className="text-lg font-semibold mt-1 flex items-center gap-2">
                      {nasAccessible === null ? <span className="text-gray-500">Checking...</span>
                        : nasAccessible
                          ? <><span className="h-2 w-2 rounded-full bg-green-500" /><span className="text-green-600">Accessible</span></>
                          : <><span className="h-2 w-2 rounded-full bg-red-500" /><span className="text-red-600">Not Accessible</span></>}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-base font-semibold">Enable Automatic Backups</Label>
                      <p className="text-sm text-muted-foreground">Backups run daily at 5:00 PM (17:00)</p>
                    </div>
                    {hasPermission('restore_data') && (
                      <Switch checked={autoBackupEnabled} onCheckedChange={handleAutoBackupToggle} />
                    )}
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold">Retention Period</Label>
                    <p className="text-sm text-muted-foreground">Number of days to keep backups</p>
                    <div className="flex items-center gap-4">
                      <Input type="number" min="1" max="365" value={backupRetentionDays}
                        onChange={(e) => { const d = parseInt(e.target.value); if (d > 0 && d <= 365) setBackupRetentionDays(d); }}
                        className="w-24" />
                      <span className="text-sm text-muted-foreground">days</span>
                      <Button size="sm" onClick={() => handleRetentionChange(backupRetentionDays)} disabled={isLoading || !hasPermission('restore_data')}>Apply</Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg space-y-3">
                    <Label className="text-base font-semibold">NAS Backup Path</Label>
                    <p className="text-sm text-muted-foreground">{backupSchedulerStatus?.nasBackupPath || '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System\\Backups'}</p>
                    <Button variant="outline" size="sm" onClick={handleCheckNAS} disabled={isLoading}>Check NAS Accessibility</Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={async () => { if (window.backupScheduler) { const b = await window.backupScheduler.listBackups(); setBackupsList(b); toast({ title: "Backups List Refreshed" }); } }} className="gap-2">
                    <ActivityIcon className="h-4 w-4" />
                    Refresh List
                  </Button>
                </div>

                {backupsList && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold">Recent NAS Backups</h3>
                    {nasAccessible && (
                      <div className="space-y-4">
                        <div className="border rounded-md">
                          <button onClick={() => setIsNasJsonOpen(!isNasJsonOpen)} className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              {isNasJsonOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <h4 className="font-semibold text-sm">NAS JSON Backups</h4>
                            </div>
                            <span className="text-xs text-muted-foreground mr-2">{backupsList.nas?.json?.length || 0} files</span>
                          </button>
                          {isNasJsonOpen && (
                            <div className="px-3 pb-3">
                              {backupsList.nas?.json?.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                  {backupsList.nas.json.map((backup) => (
                                    <div key={backup.path} className="flex items-center justify-between p-2 rounded-lg border bg-green-50/50 dark:bg-green-950/20">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm flex items-center gap-2"><FileText className="h-3 w-3 text-green-600" />{backup.name}</div>
                                        <div className="text-xs text-muted-foreground ml-5">{new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old</div>
                                      </div>
                                      {hasPermission('restore_data') && (
                                        <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0" onClick={() => handleRestoreFromNAS(backup.path)} disabled={isLoading} title="Restore from this backup">
                                          <UploadCloud className="h-4 w-4 text-green-700 dark:text-green-400" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-sm text-muted-foreground py-2 italic ml-5">No NAS JSON backups found</p>}
                            </div>
                          )}
                        </div>

                        <div className="border rounded-md">
                          <button onClick={() => setIsNasDbOpen(!isNasDbOpen)} className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-2">
                              {isNasDbOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              <h4 className="font-semibold text-sm">NAS Database Backups</h4>
                            </div>
                            <span className="text-xs text-muted-foreground mr-2">{backupsList.nas?.database?.length || 0} files</span>
                          </button>
                          {isNasDbOpen && (
                            <div className="px-3 pb-3">
                              {backupsList.nas?.database?.length > 0 ? (
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                  {backupsList.nas.database.map((backup) => (
                                    <div key={backup.path} className="flex items-center justify-between p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20">
                                      <div className="flex-1">
                                        <div className="font-medium text-sm flex items-center gap-2"><Database className="h-3 w-3 text-blue-600" />{backup.name}</div>
                                        <div className="text-xs text-muted-foreground ml-5">{new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old</div>
                                      </div>
                                      {hasPermission('restore_data') && (
                                        <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0" onClick={() => handleRestoreFromNAS(backup.path)} disabled={isLoading} title="Restore from this backup">
                                          <UploadCloud className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : <p className="text-sm text-muted-foreground py-2 italic ml-5">No NAS database backups found</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Backup Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" />Create Backup</DialogTitle>
            <DialogDescription>Select which data sections to include in the backup file.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-72 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data Sections</Label>
              <button className="text-xs text-primary underline" onClick={() => setSelectedBackupItems(new Set(backupOptions.map(o => o.id)))}>Select All</button>
            </div>
            {backupOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  id={`bk-${option.id}`}
                  checked={selectedBackupItems.has(option.id)}
                  onCheckedChange={(checked) => {
                    const s = new Set(selectedBackupItems);
                    checked ? s.add(option.id) : s.delete(option.id);
                    setSelectedBackupItems(s);
                  }}
                />
                <Label htmlFor={`bk-${option.id}`} className="cursor-pointer text-sm">{option.label}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBackupConfirm} disabled={isLoading || selectedBackupItems.size === 0} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={isRestoreOpen} onOpenChange={(open) => {
        setIsRestoreOpen(open);
        if (!open) {
          setLoadedBackupData(null); setAvailableSections([]); setRestoreSelectedSections(new Set());
          setShowRestoreSectionSelector(false); setIsRestoreComplete(false);
          setRestoreProgress({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
          setRestoreFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          {!showRestoreSectionSelector && !isRestoringLive && !isRestoreComplete && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5 text-amber-500" />Restore Data from Backup</DialogTitle>
                <DialogDescription>Select a JSON backup file to restore your data.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <label htmlFor="restore-file-input"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <UploadCloud className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">{restoreFile ? restoreFile.name : 'Click to browse or drag & drop'}</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports .json backup files</p>
                  <input id="restore-file-input" type="file" accept=".json,.db,.sqlite" onChange={handleFileSelect} className="hidden" />
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>Cancel</Button>
              </DialogFooter>
            </>
          )}

          {showRestoreSectionSelector && !isRestoringLive && !isRestoreComplete && (
            <>
              <DialogHeader>
                <DialogTitle>Select Sections to Restore</DialogTitle>
                <DialogDescription>Choose which data sections to restore from the backup ({availableSections.length} available).</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-72 overflow-y-auto py-2">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Sections</Label>
                  <button className="text-xs text-primary underline" onClick={() => setRestoreSelectedSections(new Set(availableSections))}>Select All</button>
                </div>
                {availableSections.map((section) => (
                  <div key={section} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent">
                    <Checkbox
                      id={`rs-${section}`}
                      checked={restoreSelectedSections.has(section)}
                      onCheckedChange={(checked) => {
                        const s = new Set(restoreSelectedSections);
                        checked ? s.add(section) : s.delete(section);
                        setRestoreSelectedSections(s);
                      }}
                      disabled={isLoading}
                    />
                    <Label htmlFor={`rs-${section}`} className="flex-1 cursor-pointer">
                      {section.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowRestoreSectionSelector(false); setRestoreFile(null); setLoadedBackupData(null); }} disabled={isLoading}>Back</Button>
                <Button onClick={handleRestore} disabled={restoreSelectedSections.size === 0 || isLoading} className="gap-2">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  Start Restore
                </Button>
              </DialogFooter>
            </>
          )}

          {(isRestoringLive || isRestoreComplete) && (
            <>
              <DialogHeader>
                <DialogTitle>{isRestoreComplete ? 'Restore Completed' : 'Restoring Data...'}</DialogTitle>
                <DialogDescription>{restoreProgress.phase}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{restoreProgress.message}</span>
                    <span className="text-muted-foreground">{restoreProgress.done}/{restoreProgress.total}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${isRestoreComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${restoreProgress.total > 0 ? (restoreProgress.done / restoreProgress.total) * 100 : isRestoreComplete ? 100 : 30}%` }} />
                  </div>
                </div>
                {restoreProgress.errors?.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <h3 className="font-semibold text-sm mb-2 text-destructive">Errors ({restoreProgress.errors.length})</h3>
                    <ul className="space-y-1">
                      {restoreProgress.errors.map((err, idx) => (
                        <li key={idx} className="text-xs text-destructive/80"><span className="font-medium">{err.section}:</span> {err.message || err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {isRestoreComplete && (
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <p className="text-sm text-green-800 dark:text-green-300">Restore completed successfully!</p>
                  </div>
                )}
              </div>
              {isRestoreComplete && (
                <DialogFooter>
                  <Button onClick={() => {
                    setIsRestoreOpen(false); setLoadedBackupData(null); setAvailableSections([]);
                    setRestoreSelectedSections(new Set()); setShowRestoreSectionSelector(false);
                    setIsRestoreComplete(false); setRestoreProgress({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
                    setRestoreFile(null);
                  }}>Close</Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={showActivityLog} onOpenChange={setShowActivityLog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Activity Log</DialogTitle>
            <DialogDescription>View all system activities and user actions. {activities.length} total activities.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <Button variant="outline" onClick={handleBackupActivities} size="sm">
                <Download className="h-3 w-3 mr-1" />Export TXT
              </Button>
              <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={!isAdmin}><Trash2 className="h-3 w-3 mr-1" />Clear Log</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Activity Log</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete all activity logs. This action cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearActivities} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Clear Log</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            {activities.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">No activities recorded yet.</div>
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
                    {[...activities].reverse().map((activity, idx) => (
                      <TableRow key={activity.id || idx}>
                        <TableCell className="font-mono text-xs">{new Date(activity.timestamp).toLocaleString()}</TableCell>
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

      {/* App Updates Tab */}
      {activeSettingsTab === 'updates' && (
        <div className="space-y-4">
          <AppUpdateSettings />
        </div>
      )}


      {/* Employee Analytics Dialog */}
      <Dialog open={!!analyticsEmployee} onOpenChange={(open) => !open && setAnalyticsEmployee(null)}>
        {analyticsEmployee && (
          <EmployeeAnalytics
            employee={analyticsEmployee}
            assets={assets}
            quickCheckouts={quickCheckouts}
            onUpdateCheckoutStatus={onUpdateCheckoutStatus}
            onClose={() => setAnalyticsEmployee(null)}
          />
        )}
      </Dialog>

      {/* Vehicle Analytics Dialog */}
      {isMobile ? (
        // Full page view on mobile
        analyticsVehicle && (
          <div className="fixed inset-0 z-[100] bg-background">
            <VehicleAnalyticsPage
              vehicles={vehicles}
              waybills={waybills}
              onBack={() => setAnalyticsVehicle(null)}
              initialVehicle={analyticsVehicle}
            />
          </div>
        )
      ) : (
        // Dialog view on desktop
        <Dialog open={!!analyticsVehicle} onOpenChange={(open) => !open && setAnalyticsVehicle(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-7xl h-[90vh] overflow-hidden p-0">
            {analyticsVehicle && (
              <div className="h-full w-full p-2 md:p-6 min-h-0 overflow-hidden flex flex-col">
                <VehicleAnalyticsPage
                  vehicles={vehicles}
                  waybills={waybills}
                  onBack={() => setAnalyticsVehicle(null)}
                  initialVehicle={analyticsVehicle}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
