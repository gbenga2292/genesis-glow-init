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
import { Settings, Upload, Save, Building, Phone, Globe, Trash2, Download, UploadCloud, Loader2, Sun, FileText, Activity as ActivityIcon, Users, UserPlus, Edit, UserMinus, Car, Database, Bot, BarChart3, FileJson, ChevronDown, ChevronRight, Mail, Zap, Lock, Pencil } from "lucide-react";
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
    currencySymbol: "₦",
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

  // AI (remote) settings - simplified: enable remote AI via API key
  const [aiEnabled, setAiEnabled] = useState<boolean>(false);
  const [aiProvider, setAiProvider] = useState<string>('openai');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiEndpoint, setAiEndpoint] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('');
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [keyStatus, setKeyStatus] = useState<any>(null);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [googleModels, setGoogleModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  // Initialize AI settings from props
  useEffect(() => {
    if (settings?.ai?.remote) {
      const r = settings.ai.remote;
      // Handle various truthy/falsy formats stored in DB
      const isEnabled = !!r.enabled && r.enabled !== 'false' && r.enabled !== '0';
      setAiEnabled(isEnabled);
      setAiProvider(r.provider || 'openai');
      setAiApiKey(r.apiKey || '');
      setAiEndpoint(r.endpoint || '');
      setAiModel(r.model || '');
      setHasInitializedFromSettings(true);
    }
  }, [settings]);

  const [hasInitializedFromSettings, setHasInitializedFromSettings] = useState(false);

  // Function to fetch Google AI models
  const fetchGoogleModels = async () => {
    if (!aiApiKey || aiProvider !== 'google') {
      toast({
        title: "Error",
        description: "API key required and provider must be Google",
        variant: "destructive"
      });
      return;
    }

    setModelsLoading(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${aiApiKey}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const models = data.models?.map((model: any) => model.name.replace('models/', '')) || [];
      setGoogleModels(models);
      toast({
        title: "Models Fetched",
        description: `Found ${models.length} Google AI models`
      });
    } catch (error) {
      logger.error('Failed to fetch Google models', error);
      toast({
        title: "Fetch Failed",
        description: "Failed to fetch models from Google AI",
        variant: "destructive"
      });
      setGoogleModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  // Multi-key management
  const [savedApiKeys, setSavedApiKeys] = useState<Record<string, any>>({});
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [newKeyValue, setNewKeyValue] = useState<string>('');
  const [newKeyProvider, setNewKeyProvider] = useState<string>('openai');
  const [newKeyEndpoint, setNewKeyEndpoint] = useState<string>('');
  const [newKeyModel, setNewKeyModel] = useState<string>('');
  const [editingKeyId, setEditingKeyId] = useState<number | null>(null);
  const [selectedSavedKey, setSelectedSavedKey] = useState<string>('');
  const [showSavedClientsDialog, setShowSavedClientsDialog] = useState(false);
  const [usingSavedClient, setUsingSavedClient] = useState<boolean>(false);

  // Initialize AI settings from props on component mount
  useEffect(() => {
    // Prevent re-initialization if we have already loaded settings
    if (hasInitializedFromSettings) return;

    let isActive = true;

    (async () => {
      try {
        if (!isActive) return;

        // Initialize directly from settings prop
        if (settings && (settings as any)?.ai?.remote) {
          const remote = (settings as any).ai.remote;
          const r = remote.enabled;
          setAiEnabled(r !== false && r !== 0 && r !== '0' && r !== 'false');
          setAiProvider(remote.provider || 'openai');
          setAiApiKey(remote.apiKey || '');
          setAiEndpoint(remote.endpoint || '');

          if (remote.model) {
            setAiModel(remote.model);
          }
          setHasInitializedFromSettings(true);
        }
      } catch (err) {
        logger.error('Failed to load AI settings', err);
      }
    })();


    return () => { isActive = false; };
  }, [settings, hasInitializedFromSettings]);

  useEffect(() => {
    if (!aiEndpoint.trim()) {
      if (aiProvider === 'openai') {
        setAiEndpoint('https://api.openai.com/v1/chat/completions');
      } else if (aiProvider === 'anthropic') {
        setAiEndpoint('https://api.anthropic.com/v1/messages');
      } else if (aiProvider === 'google') {
        setAiEndpoint('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
      } else if (aiProvider === 'grok') {
        setAiEndpoint('https://api.x.ai/v1/chat/completions');
      }
    }
  }, [aiProvider, aiEndpoint]);

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

  // Set default model for providers if not set (only on first mount, before settings load)
  useEffect(() => {
    // Only set default if:
    // 1. Model is empty AND
    // 2. No saved key selected AND
    // 3. We haven't loaded from settings yet (prevents overwriting on settings reload)
    if (!aiModel.trim() && !selectedSavedKey && !hasInitializedFromSettings) {
      if (aiProvider === 'openai') {
        setAiModel('gpt-3.5-turbo');
      } else if (aiProvider === 'anthropic') {
        setAiModel('claude-3-haiku-20240307');
      } else if (aiProvider === 'google') {
        setAiModel('gemini-1.5-flash');
      } else if (aiProvider === 'grok') {
        setAiModel('grok-beta');
      }
    }
  }, [aiProvider, aiModel, selectedSavedKey, hasInitializedFromSettings]);

  // Derive provider from endpoint when endpoint changes
  useEffect(() => {
    if (!aiEndpoint.trim()) return;
    let derived = 'custom';
    if (aiEndpoint.includes('openai.com')) derived = 'openai';
    else if (aiEndpoint.includes('googleapis.com') || aiEndpoint.includes('generativelanguage.googleapis.com')) derived = 'google';
    else if (aiEndpoint.includes('api.anthropic.com')) derived = 'anthropic';
    else if (aiEndpoint.includes('api.x.ai')) derived = 'grok';
    if (derived !== aiProvider) {
      setAiProvider(derived);
    }
  }, [aiEndpoint, aiProvider]);

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
    try {
      await dataService.vehicles.deleteVehicle(id);

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

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "Company settings have been updated successfully."
    });

    // Persist AI settings into company settings record (best-effort)
    const aiConfigToSave: any = {
      remote: {
        enabled: !!aiEnabled,
        provider: aiProvider,
        apiKey: aiApiKey || null,
        endpoint: aiEndpoint || null,
        model: aiModel || null,
        selectedSavedKey: selectedSavedKey || null
      }
    };

    (async () => {
      try {
        // Merge AI config with existing form data
        const updated = { ...(formData as any), ai: aiConfigToSave };

        // Save using dataService
        const savedSettings = await dataService.companySettings.updateCompanySettings(updated);
        logger.info('AI settings saved to Supabase', { data: { savedSettings } });

        // Update parent state with the fresh data
        onSave(savedSettings);

        // Show success message
        toast({
          title: "AI Settings Saved",
          description: "Your AI configuration has been persisted."
        });
      } catch (err) {
        logger.error('Failed to persist AI settings', err);
        toast({
          title: "Save Failed",
          description: "Failed to save AI settings. Please try again.",
          variant: "destructive"
        });
      }
    })();

    // Configure runtime via IPC bridge (main process will accept remote config)
    try {
      if ((window as any).llm?.configure) {
        (window as any).llm.configure(aiConfigToSave).catch(() => { });
      }
    } catch (err) {
      // ignore
    }
  };

  const handleAddApiKey = () => {
    if (!newKeyName.trim() || !newKeyValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter both a name and API key",
        variant: "destructive"
      });
      return;
    }

    // Validate API key format based on endpoint
    let endpoint = newKeyEndpoint.trim();
    let derivedProvider = 'custom';
    if (endpoint.includes('openai.com')) {
      derivedProvider = 'openai';
    } else if (endpoint.includes('googleapis.com') || endpoint.includes('generativelanguage.googleapis.com')) {
      derivedProvider = 'google';
    } else if (endpoint.includes('api.anthropic.com')) {
      derivedProvider = 'anthropic';
    } else if (endpoint.includes('api.x.ai')) {
      derivedProvider = 'grok';
    }

    // Set default endpoint if not provided
    if (!endpoint) {
      if (derivedProvider === 'openai') endpoint = 'https://api.openai.com/v1/chat/completions';
      else if (derivedProvider === 'anthropic') endpoint = 'https://api.anthropic.com/v1/messages';
      else if (derivedProvider === 'grok') endpoint = 'https://api.x.ai/v1/chat/completions';
      else if (derivedProvider === 'google') endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    }

    // Validate key format
    const key = newKeyValue.trim();
    let isValidKey = true;
    let keyError = '';

    if (derivedProvider === 'openai' && !key.startsWith('sk-')) {
      isValidKey = false;
      keyError = 'OpenAI API keys should start with "sk-". Please check your key.';
    } else if (derivedProvider === 'google' && !key.startsWith('AIzaSy')) {
      isValidKey = false;
      keyError = 'Google API keys should start with "AIzaSy". Please check your key.';
    } else if (derivedProvider === 'anthropic' && !key.startsWith('sk-ant-')) {
      isValidKey = false;
      keyError = 'Anthropic API keys should start with "sk-ant-". Please check your key.';
    } else if (derivedProvider === 'grok' && !key.startsWith('xai-')) {
      isValidKey = false;
      keyError = 'Grok API keys should start with "xai-". Please check your key.';
    }

    if (!isValidKey) {
      toast({
        title: "Invalid API Key Format",
        description: keyError,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    (async () => {
      try {
        // Save to database (create or update depending on editingKeyId)
        // Ensure model is always set from newKeyModel, aiModel, or default
        const payload = {
          key_name: newKeyName.trim(),
          provider: derivedProvider,
          api_key: key,
          endpoint: endpoint,
          model: (newKeyModel || aiModel || 'gpt-3.5-turbo').trim() || 'gpt-3.5-turbo'
        };
        let result: any;
        if (editingKeyId) {
          result = await window.electronAPI.db.updateSavedApiKey(editingKeyId, payload);
        } else {
          result = await window.electronAPI.db.createSavedApiKey(payload);
        }

        // Reload saved keys from database
        const updatedKeys = await window.electronAPI.db.getSavedApiKeys();
        const keysMap: Record<string, any> = {};
        updatedKeys.forEach((key: any) => {
          keysMap[key.key_name] = key;
        });
        setSavedApiKeys(keysMap);

        // Mark newly created/updated key as active and persist to settings
        try {
          let newId: number | null = null;
          if (editingKeyId) {
            newId = editingKeyId;
          } else if (result && Array.isArray(result) && result[0] && result[0].id) {
            newId = result[0].id;
          } else if (result && result.id) {
            newId = result.id;
          }
          if (newId && window.electronAPI.db?.setActiveApiKey) {
            await window.electronAPI.db.setActiveApiKey(newId);

            // Also update the selected key in settings
            setSelectedSavedKey(newKeyName.trim());
            // reflect active flag in local state
            const refreshed = await window.electronAPI.db.getSavedApiKeys();
            const refreshedMap: Record<string, any> = {};
            refreshed.forEach((k: any) => { refreshedMap[k.key_name] = k; });
            setSavedApiKeys(refreshedMap);
            setSelectedSavedKey(newKeyName.trim());
          }
        } catch (err) {
          logger.warn('Failed to set active key after save', err);
        }

        toast({
          title: "Key Saved",
          description: `API key "${newKeyName.trim()}" has been saved to database.`
        });

        // Reset form
        setNewKeyName('');
        setNewKeyValue('');
        setNewKeyEndpoint('');
        setNewKeyModel('gpt-4');
        setEditingKeyId(null);
        setShowApiKeyDialog(false);
      } catch (err) {
        console.error('Failed to save API key', err);
        toast({
          title: "Save Failed",
          description: "Failed to save API key to database",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const handleSelectSavedKey = async (keyName: string, providedKeyData?: any, isAutoLoad = false) => {
    try {
      const keyData = providedKeyData || savedApiKeys[keyName];
      if (!keyData) {
        console.warn('Saved key not found', keyName);
        return;
      }
      if (typeof keyData === 'string') {
        // Old localStorage format
        const parsed = JSON.parse(keyData);
        setAiProvider(parsed.provider || 'openai');
        setAiApiKey(parsed.apiKey || '');
        setAiEndpoint(parsed.endpoint || '');
        // Preserve in-memory aiModel if parsed.model is empty
        if (parsed.model) {
          setAiModel(parsed.model);
        }
      } else {
        // New database format: prefer key_ref (secure store) if present
        setAiProvider(keyData.provider || 'openai');
        setAiEndpoint(keyData.endpoint || '');
        // Preserve in-memory aiModel if keyData.model is empty
        if (keyData.model) {
          setAiModel(keyData.model);
        }
        if (keyData.key_ref && window.electronAPI.db?.getApiKeyFromKeyRef) {
          // retrieve from secure store
          try {
            const secret = await window.electronAPI.db.getApiKeyFromKeyRef(keyData.key_ref);
            if (secret) setAiApiKey(secret);
          } catch (err) {
            console.error('Failed to retrieve API key from secure store', err);
          }
        } else {
          setAiApiKey(keyData.api_key || '');
        }
      }

      if (!isAutoLoad) {
        toast({
          title: "Key Loaded",
          description: `API key "${keyName}" has been loaded.`
        });
      }
      // Auto-enable remote AI when a saved client is loaded
      setAiEnabled(true);
      setUsingSavedClient(true);

      // Auto-configure and start the LLM
      try {
        const aiConfigToSave: any = {
          remote: {
            enabled: true,
            provider: aiProvider,
            apiKey: aiApiKey || null,
            endpoint: aiEndpoint || null,
            model: aiModel || null
          }
        };
        await (window as any).llm?.configure(aiConfigToSave);
        const startRes = await (window as any).llm?.start();
        if (!isAutoLoad && startRes?.success) {
          toast({
            title: 'AI Ready',
            description: startRes.message || 'Remote AI provider configured and started.'
          });
        }
      } catch (err) {
        console.warn('Auto-configure/start failed', err);
      }
    } catch (err) {
      console.error('Failed to load key', err);
      // Suppress API key related error notifications
      if (!err.message?.includes('API key') && !err.message?.includes('Authentication failed')) {
        toast({
          title: "Error",
          description: "Failed to load saved key",
          variant: "destructive"
        });
      }
    }
  };

  const handleEditSavedKey = (keyName: string) => {
    try {
      const keyData = savedApiKeys[keyName];
      if (!keyData) return;
      // keyData may be string (old) or object (db)
      let parsed: any = keyData;
      if (typeof keyData === 'string') parsed = JSON.parse(keyData);

      setEditingKeyId(parsed.id || null);
      setNewKeyName(keyName);
      setNewKeyValue(parsed.api_key || parsed.apiKey || '');
      setNewKeyEndpoint(parsed.endpoint || '');
      setNewKeyModel(parsed.model || 'gpt-3.5-turbo');
      setShowApiKeyDialog(true);
    } catch (err) {
      console.error('Failed to open edit dialog', err);
      toast({ title: 'Error', description: 'Failed to open edit dialog', variant: 'destructive' });
    }
  };

  const handleDeleteApiKey = (keyName: string) => {
    setIsLoading(true);
    (async () => {
      try {
        const keyData = savedApiKeys[keyName];
        let keyId = keyData?.id;

        if (!keyId && typeof keyData === 'string') {
          // Old localStorage format, just delete from state
          const updatedKeys = { ...savedApiKeys };
          delete updatedKeys[keyName];
          setSavedApiKeys(updatedKeys);
          localStorage.setItem('ai_api_keys', JSON.stringify(updatedKeys));
        } else if (keyId) {
          // Delete from database
          await window.electronAPI.db.deleteSavedApiKey(keyId);

          // Reload saved keys from database
          const updatedKeys = await window.electronAPI.db.getSavedApiKeys();
          const keysMap: Record<string, any> = {};
          updatedKeys.forEach((key: any) => {
            keysMap[key.key_name] = key;
          });
          setSavedApiKeys(keysMap);
        }

        toast({
          title: "Key Deleted",
          description: `API key "${keyName}" has been removed.`
        });
      } catch (err) {
        console.error('Failed to delete API key', err);
        toast({
          title: "Delete Failed",
          description: "Failed to delete API key",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    })();
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
        console.log('🔄 Manual backup triggered from UI (Supabase Mode)');

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

        if (hasDB && (window as any).electronAPI?.manualSync) {
          try {
            const syncRes = await (window as any).electronAPI.manualSync();
            if (!syncRes || !syncRes.success) {
              logger.warn('Manual sync after restore reported failure', { data: { syncRes } });
            }
          } catch (err) {
            logger.warn('Manual sync after restore failed', err);
          }

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

  // Fetch key status from main (secure store / DB) for display
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await (window as any).llm?.getKeyStatus();
        if (mounted) setKeyStatus(s);
      } catch (err) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

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
        { value: "ai", label: "AI Settings", shortLabel: "AI", icon: <Bot className="h-4 w-4" /> },
        { value: "data", label: "Data Management", shortLabel: "Data", icon: <Database className="h-4 w-4" /> }
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

  const [activeSettingsTab, setActiveSettingsTab] = useState("company");

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

              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateUser}>Create User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Live Restore Progress Dialog */}
          <Dialog open={isRestoringLive} onOpenChange={(v) => { if (!v) setIsRestoringLive(false); }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Restoring Data</DialogTitle>
                <DialogDescription>
                  The restore is running — progress updates will appear here.
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
                        <li key={i} className="truncate">{e.section}: {e.id || ''} — {String(e.error || e.message || e)}</li>
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

      {/* Employees Tab */}
      {activeSettingsTab === "employees" && (
        <div className="space-y-6">
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
        </div>
      )}

      {/* Vehicles Tab */}
      {activeSettingsTab === "vehicles" && (
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
              <div>
                {vehicles.length === 0 ? (
                  <p className="text-muted-foreground">No vehicles added yet.</p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto">
                    {vehicles.map((vehicle) => (
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
                                <Button size="sm" variant="outline" onClick={() => handleEditVehicle(vehicle.id)}>Edit</Button>
                              )}
                              {hasPermission('delete_vehicles') && (
                                <Button size="sm" variant="destructive" onClick={() => handleRemoveVehicle(vehicle.id)}>Remove</Button>
                              )}
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

      {/* AI Assistant (Remote/API key) Configuration Tab */}
      {activeSettingsTab === "ai" && (
        <div className="space-y-6">
          {/* Top-level controls: Add / View saved AI clients are now compact dialogs */}

          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Assistant Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Master AI Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="space-y-1">
                  <Label htmlFor="ai-enabled" className="text-base font-semibold">Enable AI Assistant</Label>
                  <p className="text-sm text-muted-foreground">
                    Turn on to use AI-powered natural language task execution throughout the app
                  </p>
                </div>
                <Switch
                  id="ai-enabled"
                  checked={aiEnabled}
                  onCheckedChange={setAiEnabled}
                />
              </div>

              {aiEnabled && (
                <>
                  <p className="text-sm text-muted-foreground mb-2">Compact AI client manager — add clients, choose which client to use, then test/start the remote provider.</p>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowApiKeyDialog(true)}>
                      <Upload className="h-4 w-4 mr-2" /> Add AI Client
                    </Button>

                    <Button variant="ghost" onClick={() => setShowSavedClientsDialog(true)}>
                      View Saved AI Clients
                    </Button>
                  </div>

                  {/* Add / Edit AI Client Dialog */}
                  <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingKeyId ? 'Edit AI Client' : 'Add AI Client'}</DialogTitle>
                        <DialogDescription>Provide a name, API key, endpoint (optional) and model (optional).</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="keyName">Name</Label>
                          <Input id="keyName" placeholder="e.g., Work OpenAI" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                        </div>

                        {/* Provider is now derived from endpoint: if an endpoint is provided the client is treated as 'custom', otherwise 'openai' */}

                        <div>
                          <Label htmlFor="keyValue">API Key</Label>
                          <Input id="keyValue" type="password" placeholder="sk-..." value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} />
                        </div>

                        <div>
                          <Label htmlFor="keyEndpoint">Endpoint (optional)</Label>
                          <Input id="keyEndpoint" placeholder="https://api.openai.com/v1/chat/completions" value={newKeyEndpoint} onChange={(e) => setNewKeyEndpoint(e.target.value)} />
                        </div>


                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setShowApiKeyDialog(false); setEditingKeyId(null); }}>Cancel</Button>
                        <Button onClick={handleAddApiKey} className="bg-gradient-primary">{editingKeyId ? 'Save Changes' : 'Save Client'}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <div className="mt-2">
                    <Label htmlFor="aiClientSelect">Select AI Client</Label>
                    <Select value={selectedSavedKey || undefined} onValueChange={(v) => {
                      setSelectedSavedKey(v);
                      handleSelectSavedKey(v);
                    }}>
                      <SelectTrigger id="aiClientSelect">
                        <SelectValue placeholder="Choose client" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Saved AI clients (select to auto-load) */}
                        {Object.keys(savedApiKeys).map(k => {
                          const d = savedApiKeys[k];
                          const provider = typeof d === 'string' ? JSON.parse(d).provider : d.provider;
                          return <SelectItem key={k} value={k}>{`${k} (${provider})`}</SelectItem>;
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="apiKey">API Key</Label>
                      <Input id="apiKey" type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} placeholder="Enter API Key" />
                    </div>
                    <div>
                      <Label htmlFor="endpoint">Endpoint</Label>
                      <Input id="endpoint" value={aiEndpoint} onChange={(e) => setAiEndpoint(e.target.value)} placeholder="https://api.openai.com/v1/chat/completions" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="model">Model</Label>
                      {aiProvider === 'google' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fetchGoogleModels()}
                          disabled={modelsLoading || !aiApiKey}
                          className="text-xs"
                        >
                          {modelsLoading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Fetching...
                            </>
                          ) : (
                            'Fetch Models'
                          )}
                        </Button>
                      )}
                    </div>
                    {aiProvider === 'google' && googleModels.length > 0 ? (
                      <Select value={aiModel} onValueChange={setAiModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Google Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {googleModels.map(model => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input id="model" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="gpt-3.5-turbo" />
                    )}
                  </div>



                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          // Configure remote settings first (persist key to secure store if possible)
                          // Ensure remote is enabled for the test; also reflect in UI toggle
                          setAiEnabled(true);
                          const cfg = { remote: { enabled: true, provider: aiProvider, apiKey: aiApiKey || null, endpoint: aiEndpoint || null, model: aiModel || null } };
                          await (window as any).llm?.configure(cfg).catch(() => { });

                          // Use start() which now runs a detailed connectivity check and returns a message
                          const startRes = await (window as any).llm?.start();
                          const status = await (window as any).llm?.status();
                          setAiStatus(status);

                          if (startRes?.success) {
                            toast({ title: 'AI Ready', description: startRes.message || 'Remote AI provider configured and reachable.' });
                          } else {
                            toast({ title: 'AI Not Reachable', description: startRes?.error || 'The provider did not respond as expected. Check your API key and endpoint.', variant: 'destructive' });
                          }
                        } catch (err) {
                          toast({ title: 'Connection Failed', description: String(err), variant: 'destructive' });
                        } finally { setIsLoading(false); }
                      }}
                    >
                      Test Connection
                    </Button>

                    <Button
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const res = await (window as any).llm?.start();
                          if (res?.success) toast({ title: 'AI Started', description: res.message });
                          else toast({ title: 'Start Failed', description: res?.error || 'Failed to start', variant: 'destructive' });
                        } finally { setIsLoading(false); }
                      }}
                    >
                      Start
                    </Button>

                    <Button
                      variant="outline"
                      onClick={async () => {
                        setIsLoading(true);
                        try {
                          const res = await (window as any).llm?.stop();
                          if (res?.success) toast({ title: 'AI Stopped', description: res.message });
                        } finally { setIsLoading(false); }
                      }}
                    >
                      Stop
                    </Button>
                  </div>

                  {aiStatus && (
                    <div className="mt-2 p-3 rounded-md bg-muted text-sm space-y-1">
                      <p className="font-medium">Status: {aiStatus.available ? '✓ Available' : '✗ Not Available'}</p>
                      {aiStatus.url && <p className="text-xs text-muted-foreground">URL: {aiStatus.url}</p>}
                    </div>
                  )}

                  {/* Saved Clients viewer dialog */}
                  <Dialog open={showSavedClientsDialog} onOpenChange={setShowSavedClientsDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Saved AI Clients</DialogTitle>
                        <DialogDescription>View and manage your saved AI client configurations.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2 py-2">
                        {Object.keys(savedApiKeys).length === 0 ? (
                          <p className="text-sm text-muted-foreground">No saved clients</p>
                        ) : (
                          Object.keys(savedApiKeys).map((k) => {
                            const d = savedApiKeys[k];
                            const provider = typeof d === 'string' ? JSON.parse(d).provider : d.provider;
                            return (
                              <div key={k} className="flex items-center justify-between p-2 border rounded">
                                <div>
                                  <div className="font-medium">{k}</div>
                                  <div className="text-xs text-muted-foreground">{provider}</div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => { handleSelectSavedKey(k); setShowSavedClientsDialog(false); }}>Load</Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleEditSavedKey(k)}>Edit</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteApiKey(k)}>Delete</Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSavedClientsDialog(false)}>Close</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>


                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-sm">
                          <div className="font-medium">API Key Storage</div>
                          <div className="text-xs text-muted-foreground">{keyStatus ? (keyStatus.inSecureStore ? 'Stored in secure OS credential store' : (keyStatus.inDB ? 'Stored in database only' : 'No API key saved')) : 'Checking...'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            setIsLoading(true);
                            try {
                              const res = await (window as any).llm?.migrateKeys();
                              toast({ title: res?.success ? 'Migration started' : 'Migration failed', description: res?.message || res?.error || '' });
                              const s = await (window as any).llm?.getKeyStatus();
                              setKeyStatus(s);
                            } catch (err) {
                              toast({ title: 'Migration Error', description: String(err), variant: 'destructive' });
                            } finally { setIsLoading(false); }
                          }}
                        >
                          Migrate Key to Secure Store
                        </Button>

                        <Button
                          variant="outline"
                          onClick={async () => {
                            setIsLoading(true);
                            try {
                              if (window.electronAPI?.db?.migrateSavedKeysToKeytar) {
                                const r = await window.electronAPI.db.migrateSavedKeysToKeytar();
                                toast({ title: 'Saved Keys Migration', description: `Migrated ${r?.migrated || 0} saved keys to secure store` });
                                // reload saved keys
                                const updatedKeys = await window.electronAPI.db.getSavedApiKeys();
                                const keysMap: Record<string, any> = {};
                                updatedKeys.forEach((k: any) => { keysMap[k.key_name] = k; });
                                setSavedApiKeys(keysMap);
                              } else {
                                toast({ title: 'Not Available', description: 'Migration helper not available', variant: 'destructive' });
                              }
                            } catch (err) {
                              logger.error('Saved keys migration failed', err);
                              toast({ title: 'Migration Failed', description: String(err), variant: 'destructive' });
                            } finally { setIsLoading(false); }
                          }}
                        >
                          Migrate Saved Keys
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={async () => {
                            setIsLoading(true);
                            try {
                              // clear only secure store copy by default
                              await (window as any).llm?.clearKey({ removeFromDB: false });
                              const s = await (window as any).llm?.getKeyStatus();
                              setKeyStatus(s);
                              toast({ title: 'Cleared', description: 'Cleared secure store copy of API key.' });
                            } catch (err) {
                              toast({ title: 'Clear Failed', description: String(err), variant: 'destructive' });
                            } finally { setIsLoading(false); }
                          }}
                        >
                          Clear Secure Key
                        </Button>

                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button onClick={handleSave} className="bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium" disabled={isLoading}>
                        <Save className="h-4 w-4 mr-2" />
                        Save AI Settings
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {!aiEnabled && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm font-medium">AI Assistant is currently disabled</p>
                  <p className="text-xs mt-2">Enable the toggle above to configure and use AI features</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Data Management Tab */}
      {activeSettingsTab === "data" && (
        <div className="space-y-6">
          <Card className="border-0 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Backup, restore, or reset all your inventory data. Use these features carefully as some actions cannot be undone.
              </p>

              <div className="flex flex-wrap gap-3">
                {hasPermission('reset_data') && (
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
                )}

                <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" disabled={isLoading} className="gap-2">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4" />}
                      Backup Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Create Backup</DialogTitle>
                      <DialogDescription>
                        Select which data to backup. Backups will be saved to NAS automatically.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Backup Type Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Backup Type (Select One or Both)</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="backup-json"
                              checked={backupTypes.has('json')}
                              onCheckedChange={(checked) => {
                                const newTypes = new Set(backupTypes);
                                if (checked) {
                                  newTypes.add('json');
                                } else {
                                  newTypes.delete('json');
                                }
                                setBackupTypes(newTypes);
                              }}
                            />
                            <Label htmlFor="backup-json" className="flex items-center gap-2 cursor-pointer">
                              <FileJson className="h-4 w-4" />
                              <span>JSON Backup</span>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="backup-database"
                              checked={backupTypes.has('database')}
                              onCheckedChange={(checked) => {
                                const newTypes = new Set(backupTypes);
                                if (checked) {
                                  newTypes.add('database');
                                } else {
                                  newTypes.delete('database');
                                }
                                setBackupTypes(newTypes);
                              }}
                            />
                            <Label htmlFor="backup-database" className="flex items-center gap-2 cursor-pointer">
                              <Database className="h-4 w-4" />
                              <span>Database Backup</span>
                            </Label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {backupTypes.has('json') && backupTypes.has('database')
                            ? '📦 Both backups will be saved to NAS'
                            : backupTypes.has('json')
                              ? '📄 JSON backup will be saved to NAS'
                              : backupTypes.has('database')
                                ? '💾 Database backup will be saved to NAS'
                                : '⚠️ Please select at least one backup type'}
                        </p>
                      </div>

                      {/* Section Selector (only for JSON backup) */}
                      {backupTypes.has('json') && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Select Data Sections</Label>
                          <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-3">
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
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleBackupCancel}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleBackupConfirm}
                        disabled={isLoading || backupTypes.size === 0 || (backupTypes.has('json') && selectedBackupItems.size === 0)}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Create Backup
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Backup Data button restored - now saves to NAS automatically */}

                <Dialog open={isRestoreOpen} onOpenChange={(open) => {
                  setIsRestoreOpen(open);
                  if (!open) {
                    setLoadedBackupData(null);
                    setAvailableSections([]);
                    setRestoreSelectedSections(new Set());
                    setShowRestoreSectionSelector(false);
                    setIsRestoreComplete(false);
                    setRestoreProgress({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
                  }
                }}>
                  {hasPermission('restore_data') && (
                    <DialogTrigger asChild>
                      <Button variant="outline" disabled={isLoading} className="gap-2">
                        <UploadCloud className="h-4 w-4" />
                        Restore Data
                      </Button>
                    </DialogTrigger>
                  )}
                  <DialogContent className="max-w-2xl">
                    {!showRestoreSectionSelector && !isRestoringLive ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>Restore Data from Backup</DialogTitle>
                          <DialogDescription>
                            Select a backup file (.json or .db) to restore your data.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="restore-file">Backup File</Label>
                            <Input
                              id="restore-file"
                              type="file"
                              accept=".json,.db,.sqlite"
                              onChange={handleFileSelect}
                              className="mt-1"
                              disabled={isLoading}
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
                      </>
                    ) : showRestoreSectionSelector && !isRestoringLive ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>Select Sections to Restore</DialogTitle>
                          <DialogDescription>
                            Choose which data sections you want to restore from the backup ({availableSections.length} available).
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 max-h-80 overflow-y-auto">
                          {availableSections.map((section) => (
                            <div key={section} className="flex items-center space-x-3 p-2 rounded hover:bg-accent">
                              <input
                                type="checkbox"
                                id={`restore-${section}`}
                                checked={restoreSelectedSections.has(section)}
                                onChange={(e) => {
                                  const newSections = new Set(restoreSelectedSections);
                                  if (e.target.checked) {
                                    newSections.add(section);
                                  } else {
                                    newSections.delete(section);
                                  }
                                  setRestoreSelectedSections(newSections);
                                }}
                                disabled={isLoading}
                              />
                              <Label htmlFor={`restore-${section}`} className="flex-1 cursor-pointer">
                                {section.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => {
                            setShowRestoreSectionSelector(false);
                            setRestoreFile(null);
                            setLoadedBackupData(null);
                          }} disabled={isLoading}>
                            Back
                          </Button>
                          <Button onClick={handleRestore} disabled={restoreSelectedSections.size === 0 || isLoading}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Start Restore
                          </Button>
                        </DialogFooter>
                      </>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle>
                            {isRestoreComplete ? '✓ Restore Completed' : 'Restoring Data'}
                          </DialogTitle>
                          <DialogDescription>
                            {restoreProgress.phase}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6">
                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{restoreProgress.message}</span>
                              <span className="text-muted-foreground">
                                {restoreProgress.done}/{restoreProgress.total}
                              </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${isRestoreComplete ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                style={{
                                  width: `${restoreProgress.total > 0 ? (restoreProgress.done / restoreProgress.total) * 100 : 0}%`
                                }}
                              />
                            </div>
                          </div>

                          {/* Error List */}
                          {restoreProgress.errors.length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-h-48 overflow-y-auto">
                              <h3 className="font-semibold text-sm mb-2 text-destructive">Errors ({restoreProgress.errors.length})</h3>
                              <ul className="space-y-1">
                                {restoreProgress.errors.map((err: any, idx: number) => (
                                  <li key={idx} className="text-xs text-destructive/80">
                                    <span className="font-medium">{err.section}:</span> {err.id} - {err.error}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Completion Message */}
                          {isRestoreComplete && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm text-green-800">
                                ✓ Restore completed successfully! All selected data has been restored.
                              </p>
                            </div>
                          )}
                        </div>

                        {isRestoreComplete && (
                          <DialogFooter>
                            <Button onClick={() => {
                              setIsRestoreOpen(false);
                              setLoadedBackupData(null);
                              setAvailableSections([]);
                              setRestoreSelectedSections(new Set());
                              setShowRestoreSectionSelector(false);
                              setIsRestoreComplete(false);
                              setRestoreProgress({ phase: 'idle', total: 0, done: 0, message: '', errors: [] });
                              setRestoreFile(null);
                            }}>
                              Close
                            </Button>
                          </DialogFooter>
                        )}
                      </>
                    )}

                    {!isRestoringLive && !isRestoreComplete && showRestoreSectionSelector === false && restoreFile === null && (
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRestoreOpen(false)}>
                          Cancel
                        </Button>
                      </DialogFooter>
                    )}
                  </DialogContent>
                </Dialog>

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
                              {[...activities].reverse().map((activity, idx) => (
                                <TableRow key={activity.id || idx}>
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
              </div>

              {/* Automatic Backup Scheduler Panel */}
              {window.backupScheduler && (
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" />
                      Automatic Backup Scheduler
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Configure automatic daily backups to NAS and local storage
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Status Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="text-sm font-medium text-muted-foreground">Status</div>
                        <div className="text-2xl font-bold mt-1">
                          {autoBackupEnabled ? (
                            <span className="text-green-600">Enabled</span>
                          ) : (
                            <span className="text-gray-500">Disabled</span>
                          )}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="text-sm font-medium text-muted-foreground">Next Backup</div>
                        <div className="text-lg font-semibold mt-1">
                          {backupSchedulerStatus?.nextRun
                            ? (() => {
                              try {
                                const nextRun = backupSchedulerStatus.nextRun;
                                // Handle different date formats
                                const date = nextRun instanceof Date ? nextRun : new Date(nextRun);
                                return !isNaN(date.getTime()) ? date.toLocaleString() : 'Today at 5:00 PM';
                              } catch {
                                return 'Today at 5:00 PM';
                              }
                            })()
                            : 'Today at 5:00 PM'}
                        </div>
                      </div>
                      <div className="p-4 border rounded-lg bg-card">
                        <div className="text-sm font-medium text-muted-foreground">NAS Status</div>
                        <div className="text-lg font-semibold mt-1 flex items-center gap-2">
                          {nasAccessible === null ? (
                            <span className="text-gray-500">Checking...</span>
                          ) : nasAccessible ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-green-500"></span>
                              <span className="text-green-600">Accessible</span>
                            </>
                          ) : (
                            <>
                              <span className="h-2 w-2 rounded-full bg-red-500"></span>
                              <span className="text-red-600">Not Accessible</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-semibold">Enable Automatic Backups</Label>
                          <p className="text-sm text-muted-foreground">
                            Backups run daily at 5:00 PM (17:00)
                          </p>
                        </div>
                        {hasPermission('restore_data') && (
                          <Switch
                            checked={autoBackupEnabled}
                            onCheckedChange={handleAutoBackupToggle}
                          />
                        )}
                      </div>

                      <div className="p-4 border rounded-lg space-y-3">
                        <div>
                          <Label className="text-base font-semibold">Retention Period</Label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Number of days to keep backups
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            value={backupRetentionDays}
                            onChange={(e) => {
                              const days = parseInt(e.target.value);
                              if (days > 0 && days <= 365) {
                                setBackupRetentionDays(days);
                              }
                            }}
                            className="w-24"
                          />
                          <span className="text-sm text-muted-foreground">days</span>
                          <Button
                            size="sm"
                            onClick={() => handleRetentionChange(backupRetentionDays)}
                            disabled={isLoading || !hasPermission('restore_data')}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg space-y-3">
                        <div>
                          <Label className="text-base font-semibold">NAS Backup Path</Label>
                          <p className="text-sm text-muted-foreground">
                            {backupSchedulerStatus?.nasBackupPath || '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System\\Backups'}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCheckNAS}
                            disabled={isLoading}
                          >
                            Check NAS Accessibility
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-3">
                      {/* Backup Now button removed - use "Backup Data" dialog at top of page */}
                      <Button
                        variant="outline"
                        onClick={async () => {
                          if (window.backupScheduler) {
                            const backups = await window.backupScheduler.listBackups();
                            setBackupsList(backups);
                            toast({ title: "Backups List Refreshed" });
                          }
                        }}
                        className="gap-2"
                      >
                        <ActivityIcon className="h-4 w-4" />
                        Refresh List
                      </Button>
                    </div>

                    {/* Backups List */}
                    {backupsList && (
                      <div className="space-y-4">
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-3">Recent NAS Backups</h3>

                          {/* Local Backups - Disabled (only saving to NAS) */}
                          {/* <div className="mb-4">
                            <h4 className="text-sm font-medium text-muted-foreground mb-2">
                              Local Backups ({backupsList.local?.length || 0})
                            </h4>
                            {backupsList.local && backupsList.local.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {backupsList.local.slice(0, 5).map((backup: any) => (
                                  <div key={backup.path} className="flex items-center justify-between p-2 border rounded text-sm">
                                    <div className="flex-1">
                                      <div className="font-medium">{backup.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No local backups found</p>
                            )}
                          </div> */}

                          {/* NAS Backups */}
                          {nasAccessible && (
                            <div className="space-y-4">
                              {/* JSON Backups */}
                              <div className="border rounded-md">
                                <button
                                  onClick={() => setIsNasJsonOpen(!isNasJsonOpen)}
                                  className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {isNasJsonOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <h4 className="font-semibold text-sm">NAS JSON Backups</h4>
                                  </div>
                                  <span className="text-xs text-muted-foreground mr-2">{backupsList.nas?.json?.length || 0} files</span>
                                </button>

                                {isNasJsonOpen && (
                                  <div className="px-3 pb-3">
                                    {backupsList.nas?.json && backupsList.nas.json.length > 0 ? (
                                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {backupsList.nas.json.map((backup: any) => (
                                          <div key={backup.path} className="flex items-center justify-between p-2 rounded-lg border bg-green-50/50 dark:bg-green-950/20 hover:bg-green-100/50 dark:hover:bg-green-900/30 transition-colors">
                                            <div className="flex-1">
                                              <div className="font-medium text-sm flex items-center gap-2">
                                                <FileText className="h-3 w-3 text-green-600" />
                                                {backup.name}
                                              </div>
                                              <div className="text-xs text-muted-foreground ml-5">
                                                {new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old
                                              </div>
                                            </div>
                                            {hasPermission('restore_data') && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-2 h-8 w-8 p-0"
                                                onClick={() => handleRestoreFromNAS(backup.path)}
                                                disabled={isLoading}
                                                title="Restore from this backup"
                                              >
                                                <UploadCloud className="h-4 w-4 text-green-700 dark:text-green-400" />
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground py-2 italic ml-5">No NAS JSON backups found</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* DB Backups */}
                              <div className="border rounded-md">
                                <button
                                  onClick={() => setIsNasDbOpen(!isNasDbOpen)}
                                  className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    {isNasDbOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <h4 className="font-semibold text-sm">NAS Database Backups</h4>
                                  </div>
                                  <span className="text-xs text-muted-foreground mr-2">{backupsList.nas?.database?.length || 0} files</span>
                                </button>

                                {isNasDbOpen && (
                                  <div className="px-3 pb-3">
                                    {backupsList.nas?.database && backupsList.nas.database.length > 0 ? (
                                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {backupsList.nas.database.map((backup: any) => (
                                          <div key={backup.path} className="flex items-center justify-between p-2 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors">
                                            <div className="flex-1">
                                              <div className="font-medium text-sm flex items-center gap-2">
                                                <Database className="h-3 w-3 text-blue-600" />
                                                {backup.name}
                                              </div>
                                              <div className="text-xs text-muted-foreground ml-5">
                                                {new Date(backup.created).toLocaleString()} • {(backup.size / 1024 / 1024).toFixed(2)} MB • {backup.age} days old
                                              </div>
                                            </div>
                                            {hasPermission('restore_data') && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="ml-2 h-8 w-8 p-0"
                                                onClick={() => handleRestoreFromNAS(backup.path)}
                                                disabled={isLoading}
                                                title="Restore from this backup"
                                              >
                                                <UploadCloud className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                              </Button>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground py-2 italic ml-5">No NAS database backups found</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

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
    </div>
  );
};
