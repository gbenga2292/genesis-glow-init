import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Asset, Site, Employee } from "@/types/asset";
import { EquipmentLog, DowntimeEntry } from "@/types/equipment";
import { MaintenanceLog } from "@/types/maintenance";
import { AlertTriangle, CheckCircle, Clock, Wrench, Zap, Plus, X, MapPin, Calendar as CalendarIcon, Layers } from "lucide-react";
import { format } from "date-fns";
import { createDefaultOperationalLog, calculateDieselRefill, getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface NotificationPanelProps {
  assets: Asset[];
  sites: Site[];
  equipmentLogs: EquipmentLog[];
  maintenanceLogs: MaintenanceLog[];
  employees: Employee[];
  onQuickLogEquipment: (log: EquipmentLog) => void;
  onBulkLogEquipment?: (logs: EquipmentLog[]) => Promise<void>;
}

interface PendingLogItem {
  equipment: Asset;
  site: Site;
  lastLogDate?: Date;
  missingDays: number;
  isOverdue: boolean;
}

interface MaintenanceDueItem {
  asset: Asset;
  nextServiceDue?: Date;
  daysUntilDue: number;
  isOverdue: boolean;
  lastMaintenance?: MaintenanceLog;
}

type FilterPriority = "all" | "critical" | "warning" | "normal";
type NotificationTab = "logs" | "maintenance";

export const NotificationPanel = ({
  assets,
  sites,
  equipmentLogs,
  maintenanceLogs,
  employees,
  onQuickLogEquipment,
  onBulkLogEquipment
}: NotificationPanelProps) => {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const [notificationTab, setNotificationTab] = useState<NotificationTab>("logs");
  const [showQuickLogDialog, setShowQuickLogDialog] = useState(false);
  const [showBulkLogDialog, setShowBulkLogDialog] = useState(false);
  const [selectedPendingItem, setSelectedPendingItem] = useState<PendingLogItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [selectedBulkItems, setSelectedBulkItems] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    active: true,
    supervisorOnSite: "",
    clientFeedback: "Site operational and progressing as planned",
    issuesOnSite: "No issues on site",
    maintenanceDetails: "Routine check completed - all systems operational"
  });
  const [bulkDieselValues, setBulkDieselValues] = useState<Record<string, string>>({});
  const [logForm, setLogForm] = useState<{
    active: boolean;
    downtimeEntries: DowntimeEntry[];
    maintenanceDetails: string;
    dieselEntered: string;
    supervisorOnSite: string;
    clientFeedback: string;
    issuesOnSite: string;
  }>({
    active: false,
    downtimeEntries: [{ id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }],
    maintenanceDetails: "",
    dieselEntered: "",
    supervisorOnSite: "",
    clientFeedback: "",
    issuesOnSite: ""
  });

  // Get equipment that requires logging
  const equipmentRequiringLogging = assets.filter(
    asset => asset.type === 'equipment' && asset.requiresLogging === true
  );

  // Get sites where equipment is allocated
  const getEquipmentSites = (equipment: Asset): Site[] => {
    const equipmentSites: Site[] = [];

    if (equipment.siteId) {
      const site = sites.find(s => s.id === equipment.siteId);
      if (site) equipmentSites.push(site);
    }

    if (equipment.siteQuantities) {
      Object.keys(equipment.siteQuantities).forEach(siteId => {
        const site = sites.find(s => s.id === siteId);
        if (site && !equipmentSites.find(s => s.id === site.id)) {
          equipmentSites.push(site);
        }
      });
    }

    return equipmentSites;
  };

  // Calculate pending logs
  const getPendingLogs = (): PendingLogItem[] => {
    const pending: PendingLogItem[] = [];

    equipmentRequiringLogging.forEach(equipment => {
      const equipmentSites = getEquipmentSites(equipment);

      equipmentSites.forEach(site => {
        const siteLogs = equipmentLogs
          .filter(log => log.equipmentId === equipment.id && log.siteId === site.id)
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (siteLogs.length === 0) {
          pending.push({
            equipment,
            site,
            lastLogDate: undefined,
            missingDays: 1,
            isOverdue: false
          });
        } else {
          const lastLog = siteLogs[siteLogs.length - 1];
          const lastLogDate = new Date(lastLog.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          lastLogDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff > 0) {
            pending.push({
              equipment,
              site,
              lastLogDate: lastLog.date,
              missingDays: daysDiff,
              isOverdue: daysDiff > 1
            });
          }
        }
      });
    });

    return pending.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.missingDays - a.missingDays;
    });
  };

  // Calculate maintenance due items
  const getMaintenanceDueItems = (): MaintenanceDueItem[] => {
    const dueItems: MaintenanceDueItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all equipment that have service intervals
    const machinesWithService = assets.filter(
      asset => asset.type === 'equipment' && asset.serviceInterval
    );

    machinesWithService.forEach(asset => {
      // Find the latest maintenance log for this asset
      const assetLogs = maintenanceLogs
        .filter(log => log.machineId === asset.id)
        .sort((a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime());

      const lastMaintenance = assetLogs[0];
      let nextServiceDue: Date | undefined;
      let daysUntilDue = 0;

      if (lastMaintenance?.nextServiceDue) {
        // Use the explicitly set next service due date
        nextServiceDue = new Date(lastMaintenance.nextServiceDue);
      } else if (lastMaintenance && asset.serviceInterval) {
        // Calculate based on last maintenance + service interval (serviceInterval is in months)
        nextServiceDue = new Date(lastMaintenance.dateStarted);
        nextServiceDue.setMonth(nextServiceDue.getMonth() + asset.serviceInterval);
      } else if (asset.deploymentDate && asset.serviceInterval) {
        // Calculate based on deployment date if no maintenance history
        nextServiceDue = new Date(asset.deploymentDate);
        nextServiceDue.setMonth(nextServiceDue.getMonth() + asset.serviceInterval);
      }

      if (nextServiceDue) {
        nextServiceDue.setHours(0, 0, 0, 0);
        daysUntilDue = Math.floor((nextServiceDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Show if due within 30 days or overdue
        if (daysUntilDue <= 30) {
          dueItems.push({
            asset,
            nextServiceDue,
            daysUntilDue,
            isOverdue: daysUntilDue < 0,
            lastMaintenance
          });
        }
      }
    });

    // Sort: overdue first, then by days until due
    return dueItems.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.daysUntilDue - b.daysUntilDue;
    });
  };

  const pendingLogs = getPendingLogs();
  const maintenanceDueItems = getMaintenanceDueItems();

  const getPriority = (item: PendingLogItem): FilterPriority => {
    if (item.isOverdue) return "critical";
    if (item.missingDays > 1) return "warning";
    return "normal";
  };

  const getMaintenancePriority = (item: MaintenanceDueItem): FilterPriority => {
    if (item.isOverdue) return "critical";
    if (item.daysUntilDue <= 7) return "warning";
    return "normal";
  };

  const filteredLogs = pendingLogs.filter(item => {
    const itemId = `${item.equipment.id}-${item.site.id}`;
    if (dismissedItems.has(itemId)) return false;
    if (filterPriority === "all") return true;
    return getPriority(item) === filterPriority;
  });

  const criticalCount = pendingLogs.filter(item => getPriority(item) === "critical").length;
  const warningCount = pendingLogs.filter(item => getPriority(item) === "warning").length;
  const normalCount = pendingLogs.filter(item => getPriority(item) === "normal").length;

  const getLoggedDatesForEquipment = (equipmentId: string) => {
    return equipmentLogs
      .filter(log => String(log.equipmentId) === String(equipmentId))
      .map(log => log.date);
  };

  const handleAutoFillDefaults = () => {
    if (!selectedPendingItem) return;

    const dieselRefill = calculateDieselRefill(equipmentLogs, selectedPendingItem.equipment.id);
    const defaultSupervisor = employees.find(emp => emp.status === 'active')?.name;
    const defaultTemplate = createDefaultOperationalLog(defaultSupervisor, dieselRefill);

    setLogForm({
      active: defaultTemplate.active,
      downtimeEntries: defaultTemplate.downtimeEntries,
      maintenanceDetails: defaultTemplate.maintenanceDetails || "",
      dieselEntered: defaultTemplate.dieselEntered?.toString() || "",
      supervisorOnSite: defaultTemplate.supervisorOnSite || "",
      clientFeedback: defaultTemplate.clientFeedback || "",
      issuesOnSite: defaultTemplate.issuesOnSite || ""
    });
  };

  const handleQuickLog = (item: PendingLogItem) => {
    setSelectedPendingItem(item);
    setSelectedDate(new Date());
    handleAutoFillDefaults();
    setShowQuickLogDialog(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && selectedPendingItem) {
      setSelectedDate(date);

      const existingLog = equipmentLogs.find(log =>
        log.equipmentId === selectedPendingItem.equipment.id &&
        format(log.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );

      if (existingLog) {
        setLogForm({
          active: existingLog.active,
          downtimeEntries: existingLog.downtimeEntries.length > 0 ? existingLog.downtimeEntries : [{ id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }],
          maintenanceDetails: existingLog.maintenanceDetails || "",
          dieselEntered: existingLog.dieselEntered?.toString() || "",
          supervisorOnSite: existingLog.supervisorOnSite || "",
          clientFeedback: existingLog.clientFeedback || "",
          issuesOnSite: existingLog.issuesOnSite || ""
        });
      } else {
        setLogForm({
          active: true,
          downtimeEntries: [{ id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }],
          maintenanceDetails: "",
          dieselEntered: "",
          supervisorOnSite: "",
          clientFeedback: "",
          issuesOnSite: ""
        });
      }
    }
  };

  const handleSaveLog = () => {
    if (!selectedPendingItem || !selectedDate) return;

    const existingLog = equipmentLogs.find(log =>
      log.equipmentId === selectedPendingItem.equipment.id &&
      format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    const logData: EquipmentLog = {
      id: existingLog?.id || Date.now().toString(),
      equipmentId: selectedPendingItem.equipment.id,
      equipmentName: selectedPendingItem.equipment.name,
      siteId: selectedPendingItem.site.id,
      date: selectedDate,
      active: logForm.active,
      downtimeEntries: logForm.downtimeEntries,
      maintenanceDetails: logForm.maintenanceDetails || undefined,
      dieselEntered: logForm.dieselEntered ? parseFloat(logForm.dieselEntered) : undefined,
      supervisorOnSite: logForm.supervisorOnSite || undefined,
      clientFeedback: logForm.clientFeedback || undefined,
      issuesOnSite: logForm.issuesOnSite || undefined,
      createdAt: existingLog?.createdAt || new Date(),
      updatedAt: new Date()
    };

    onQuickLogEquipment(logData);
    setShowQuickLogDialog(false);
    setSelectedPendingItem(null);
    setSelectedDate(undefined);
  };

  const handleDismiss = (item: PendingLogItem) => {
    const itemId = `${item.equipment.id}-${item.site.id}`;
    setDismissedItems(prev => new Set(prev).add(itemId));
  };

  const handleOpenBulkLog = () => {
    // Pre-select all filtered items
    const allIds = new Set(filteredLogs.map(item => `${item.equipment.id}-${item.site.id}`));
    setSelectedBulkItems(allIds);
    // Pre-fill diesel values based on calculations
    const dieselVals: Record<string, string> = {};
    filteredLogs.forEach(item => {
      const diesel = calculateDieselRefill(equipmentLogs, item.equipment.id);
      if (diesel) {
        dieselVals[`${item.equipment.id}-${item.site.id}`] = diesel.toString();
      }
    });
    setBulkDieselValues(dieselVals);
    setShowBulkLogDialog(true);
  };

  const handleBulkSave = async () => {
    if (selectedBulkItems.size === 0) {
      toast({ title: "No items selected", description: "Please select at least one equipment to log.", variant: "destructive" });
      return;
    }

    if (!onBulkLogEquipment) {
      toast({ title: "Bulk log not available", description: "Bulk logging is not configured.", variant: "destructive" });
      return;
    }

    setBulkSaving(true);
    try {
      const logs: EquipmentLog[] = [];
      filteredLogs.forEach(item => {
        const key = `${item.equipment.id}-${item.site.id}`;
        if (selectedBulkItems.has(key)) {
          const dieselVal = bulkDieselValues[key];
          logs.push({
            id: `${Date.now()}-${item.equipment.id}`,
            equipmentId: item.equipment.id,
            equipmentName: item.equipment.name,
            siteId: item.site.id,
            date: selectedDate || new Date(),
            active: bulkForm.active,
            downtimeEntries: [],
            maintenanceDetails: bulkForm.maintenanceDetails || undefined,
            dieselEntered: dieselVal ? parseFloat(dieselVal) : undefined,
            supervisorOnSite: bulkForm.supervisorOnSite || undefined,
            clientFeedback: bulkForm.clientFeedback || undefined,
            issuesOnSite: bulkForm.issuesOnSite || undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      });

      await onBulkLogEquipment(logs);
      toast({ title: "Bulk Logs Created", description: `Created ${logs.length} equipment logs.` });
      setShowBulkLogDialog(false);
      setSelectedBulkItems(new Set());
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to save bulk logs.", variant: "destructive" });
    } finally {
      setBulkSaving(false);
    }
  };

  const toggleBulkItem = (itemKey: string) => {
    setSelectedBulkItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  const selectAllBulk = () => {
    if (selectedBulkItems.size === filteredLogs.length) {
      setSelectedBulkItems(new Set());
    } else {
      setSelectedBulkItems(new Set(filteredLogs.map(item => `${item.equipment.id}-${item.site.id}`)));
    }
  };

  // All logged state
  if (pendingLogs.length === 0 && maintenanceDueItems.length === 0 && dismissedItems.size === 0) {
    return (
      <Card className="border-0 shadow-soft bg-success/10">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-success">All Up to Date</p>
              <p className="text-sm text-success/80">Equipment logs and maintenance are current</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPriorityStyles = (priority: FilterPriority) => {
    switch (priority) {
      case "critical":
        return {
          border: "border-l-destructive",
          bg: "bg-destructive/5",
          badge: "bg-destructive text-destructive-foreground",
          icon: "text-destructive"
        };
      case "warning":
        return {
          border: "border-l-warning",
          bg: "bg-warning/5",
          badge: "bg-warning text-warning-foreground",
          icon: "text-warning"
        };
      default:
        return {
          border: "border-l-muted-foreground",
          bg: "bg-muted/30",
          badge: "bg-muted text-muted-foreground",
          icon: "text-muted-foreground"
        };
    }
  };

  return (
    <>
      <Card className="border-0 shadow-soft overflow-hidden">
        {/* Mobile-optimized Header */}
        <CardHeader className="pb-3 space-y-3">
          {/* Main Notification Type Tabs */}
          <Tabs value={notificationTab} onValueChange={(v) => setNotificationTab(v as NotificationTab)} className="w-full">
            <TabsList className="w-full h-10 p-1 grid grid-cols-2">
              <TabsTrigger value="logs" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Wrench className="h-4 w-4 mr-2" />
                Equipment Logs
                {pendingLogs.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {pendingLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="maintenance" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance Due
                {maintenanceDueItems.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                    {maintenanceDueItems.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
                {notificationTab === "logs" ? (
                  <Wrench className="h-4 w-4 text-warning" />
                ) : (
                  <Wrench className="h-4 w-4 text-warning" />
                )}
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold truncate">
                  {notificationTab === "logs" ? "Pending Equipment Logs" : "Maintenance Due"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {notificationTab === "logs" ? "Equipment requiring daily logs" : "Machines requiring scheduled maintenance"}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {notificationTab === "logs" && filteredLogs.length > 1 && onBulkLogEquipment && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenBulkLog}
                  disabled={!hasPermission('write_assets')}
                  className="h-7 text-xs gap-1.5"
                >
                  <Layers className="h-3.5 w-3.5" />
                  Bulk Log
                </Button>
              )}
            </div>
          </div>

          {/* Priority Filter Tabs (only for equipment logs) */}
          {notificationTab === "logs" && (
            <Tabs value={filterPriority} onValueChange={(v) => setFilterPriority(v as FilterPriority)} className="w-full">
              <TabsList className="w-full h-9 p-1 grid grid-cols-4">
                <TabsTrigger value="all" className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  All ({pendingLogs.length})
                </TabsTrigger>
                <TabsTrigger value="critical" className="text-xs px-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                  {criticalCount}
                </TabsTrigger>
                <TabsTrigger value="warning" className="text-xs px-2 data-[state=active]:bg-warning data-[state=active]:text-warning-foreground">
                  {warningCount}
                </TabsTrigger>
                <TabsTrigger value="normal" className="text-xs px-2">
                  {normalCount}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {notificationTab === "logs" ? (
            <>
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 px-4 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No pending logs in this category</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="divide-y divide-border">
                    {filteredLogs.map((item) => {
                      const priority = getPriority(item);
                      const styles = getPriorityStyles(priority);

                      return (
                        <div
                          key={`${item.equipment.id}-${item.site.id}`}
                          className={cn(
                            "p-3 border-l-4 transition-colors",
                            styles.border,
                            styles.bg
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5 shrink-0", styles.icon)}>
                              <Wrench className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{item.equipment.name}</p>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{item.site.name}</span>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDismiss(item)}
                                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.isOverdue && (
                                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Overdue
                                  </Badge>
                                )}
                                <span className="text-[11px] text-muted-foreground">
                                  {item.lastLogDate ? (
                                    <>Last: {format(item.lastLogDate, 'MMM dd')} • {item.missingDays}d missing</>
                                  ) : (
                                    "Never logged"
                                  )}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleQuickLog(item)}
                                disabled={!hasPermission('write_assets')}
                                className="w-full h-9 mt-1 gap-1.5"
                              >
                                <Zap className="h-3.5 w-3.5" />
                                Quick Log
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </>
          ) : (
            <>
              {maintenanceDueItems.length === 0 ? (
                <div className="text-center py-8 px-4 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No maintenance due at this time</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="divide-y divide-border">
                    {maintenanceDueItems.map((item) => {
                      const priority = getMaintenancePriority(item);
                      const styles = getPriorityStyles(priority);

                      return (
                        <div
                          key={item.asset.id}
                          className={cn(
                            "p-3 border-l-4 transition-colors",
                            styles.border,
                            styles.bg
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5 shrink-0", styles.icon)}>
                              <Wrench className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{item.asset.name}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {item.asset.category || 'Equipment'}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.isOverdue ? (
                                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {Math.abs(item.daysUntilDue)}d Overdue
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Due in {item.daysUntilDue}d
                                  </Badge>
                                )}
                                {item.nextServiceDue && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Due: {format(item.nextServiceDue, 'MMM dd, yyyy')}
                                  </span>
                                )}
                              </div>
                              {item.lastMaintenance && (
                                <p className="text-[11px] text-muted-foreground">
                                  Last: {format(new Date(item.lastMaintenance.dateStarted), 'MMM dd')} — {item.lastMaintenance.maintenanceType}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Log Dialog - Mobile Optimized */}
      <Dialog open={showQuickLogDialog} onOpenChange={setShowQuickLogDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <DialogTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Log
                </DialogTitle>
                <DialogDescription className="text-xs truncate">
                  {selectedPendingItem?.equipment.name} • {selectedDate && format(selectedDate, 'PPP')}
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAutoFillDefaults}
                className="shrink-0 h-8 text-xs"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Auto-Fill
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1" style={{ maxHeight: 'calc(95vh - 80px)' }}>
            <div className="p-4 space-y-4">
              {/* Calendar Section - Collapsed on mobile */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Select Date
                </Label>
                <div className="flex justify-center bg-muted/30 rounded-lg p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && handleDateSelect(date)}
                    modifiers={{
                      logged: selectedPendingItem ? getLoggedDatesForEquipment(selectedPendingItem.equipment.id) : []
                    }}
                    modifiersStyles={{
                      logged: {
                        backgroundColor: 'hsl(var(--primary))',
                        color: 'white',
                        fontWeight: 'bold'
                      }
                    }}
                    className="rounded-md border bg-card"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center">
                  Blue dates have existing logs
                </p>
              </div>

              {/* Form Section */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                  <Checkbox
                    id="active"
                    checked={logForm.active}
                    onCheckedChange={(checked) => setLogForm({ ...logForm, active: checked as boolean })}
                  />
                  <Label htmlFor="active" className="text-sm font-medium cursor-pointer">
                    Equipment Active Today
                  </Label>
                </div>

                {logForm.active && (
                  <div className="space-y-4">
                    {/* Downtime Entries */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Downtime Entries</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setLogForm({
                            ...logForm,
                            downtimeEntries: [...logForm.downtimeEntries, { id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }]
                          })}
                          className="h-8 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add
                        </Button>
                      </div>

                      {logForm.downtimeEntries.map((entry, index) => (
                        <Card key={entry.id} className="border shadow-none">
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Entry {index + 1}</span>
                              {logForm.downtimeEntries.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLogForm({
                                    ...logForm,
                                    downtimeEntries: logForm.downtimeEntries.filter((_, i) => i !== index)
                                  })}
                                  className="h-6 text-xs text-destructive hover:text-destructive"
                                >
                                  Remove
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Time Off</Label>
                                <Input
                                  value={entry.downtime}
                                  onChange={(e) => {
                                    const newEntries = [...logForm.downtimeEntries];
                                    newEntries[index].downtime = e.target.value;
                                    setLogForm({ ...logForm, downtimeEntries: newEntries });
                                  }}
                                  placeholder="14:30"
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Time Back</Label>
                                <Input
                                  value={entry.uptime}
                                  onChange={(e) => {
                                    const newEntries = [...logForm.downtimeEntries];
                                    newEntries[index].uptime = e.target.value;
                                    setLogForm({ ...logForm, downtimeEntries: newEntries });
                                  }}
                                  placeholder="16:00"
                                  className="h-9 text-sm"
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Reason</Label>
                              <Input
                                value={entry.downtimeReason}
                                onChange={(e) => {
                                  const newEntries = [...logForm.downtimeEntries];
                                  newEntries[index].downtimeReason = e.target.value;
                                  setLogForm({ ...logForm, downtimeEntries: newEntries });
                                }}
                                placeholder="Reason for downtime"
                                className="h-9 text-sm"
                              />
                            </div>

                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Action Taken</Label>
                              <Textarea
                                value={entry.downtimeAction}
                                onChange={(e) => {
                                  const newEntries = [...logForm.downtimeEntries];
                                  newEntries[index].downtimeAction = e.target.value;
                                  setLogForm({ ...logForm, downtimeEntries: newEntries });
                                }}
                                placeholder="Actions taken"
                                rows={2}
                                className="text-sm resize-none"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Diesel & Supervisor */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Diesel (L)</Label>
                        <Input
                          type="number"
                          value={logForm.dieselEntered}
                          onChange={(e) => setLogForm({ ...logForm, dieselEntered: e.target.value })}
                          placeholder="0.00"
                          className="h-10"
                        />
                        {selectedPendingItem && (() => {
                          const overdueDays = getDieselOverdueDays(equipmentLogs, selectedPendingItem.equipment.id);
                          const refillAmount = calculateDieselRefill(equipmentLogs, selectedPendingItem.equipment.id);
                          return overdueDays > 0 ? (
                            <p className="text-[10px] text-warning">
                              ⚠️ {refillAmount}L due ({overdueDays}d overdue)
                            </p>
                          ) : refillAmount ? (
                            <p className="text-[10px] text-primary">
                              💡 Suggested: {refillAmount}L
                            </p>
                          ) : null;
                        })()}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Supervisor</Label>
                        <Select
                          value={logForm.supervisorOnSite}
                          onValueChange={(value) => setLogForm({ ...logForm, supervisorOnSite: value })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee.id} value={employee.name}>
                                {employee.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Maintenance Details */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Maintenance Details</Label>
                      <Textarea
                        value={logForm.maintenanceDetails}
                        onChange={(e) => setLogForm({ ...logForm, maintenanceDetails: e.target.value })}
                        placeholder="Maintenance performed"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Client Feedback */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Client Feedback</Label>
                      <Textarea
                        value={logForm.clientFeedback}
                        onChange={(e) => setLogForm({ ...logForm, clientFeedback: e.target.value })}
                        placeholder="Client comments"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>

                    {/* Issues */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Issues on Site</Label>
                      <Textarea
                        value={logForm.issuesOnSite}
                        onChange={(e) => setLogForm({ ...logForm, issuesOnSite: e.target.value })}
                        placeholder="Any issues encountered"
                        rows={2}
                        className="text-sm resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Sticky Footer */}
          <div className="p-4 border-t bg-card shrink-0">
            <div className="flex gap-3">
              <Button
                onClick={() => setShowQuickLogDialog(false)}
                variant="outline"
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveLog}
                className="flex-1 h-11"
              >
                Save Log
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Log Dialog */}
      <Dialog open={showBulkLogDialog} onOpenChange={setShowBulkLogDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <DialogTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Bulk Equipment Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log multiple machines at once with shared parameters
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Log Date</Label>
                <div className="flex justify-center bg-muted/30 rounded-lg p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md"
                  />
                </div>
              </div>

              {/* Equipment Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Select Equipment ({selectedBulkItems.size}/{filteredLogs.length})
                  </Label>
                  <Button variant="ghost" size="sm" onClick={selectAllBulk} className="h-7 text-xs">
                    {selectedBulkItems.size === filteredLogs.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <ScrollArea className="h-[200px] border rounded-md p-2">
                  <div className="space-y-2">
                    {filteredLogs.map(item => {
                      const key = `${item.equipment.id}-${item.site.id}`;
                      const isSelected = selectedBulkItems.has(key);
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex flex-col gap-2 p-2 rounded-md border transition-colors",
                            isSelected ? "bg-primary/5 border-primary/30" : "hover:bg-muted"
                          )}
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => toggleBulkItem(key)}
                          >
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleBulkItem(key)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.equipment.name}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {item.site.name}
                              </p>
                            </div>
                            {item.isOverdue && (
                              <Badge variant="destructive" className="text-[10px] h-5 shrink-0">
                                Overdue
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <div className="pl-7 pr-1 animate-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs w-20 shrink-0">Diesel (L):</Label>
                                <Input
                                  type="number"
                                  className="h-8 bg-background"
                                  placeholder="Litres"
                                  value={bulkDieselValues[key] || ''}
                                  onChange={(e) => setBulkDieselValues(prev => ({
                                    ...prev,
                                    [key]: e.target.value
                                  }))}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Shared Form Fields */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="bulk-active"
                    checked={bulkForm.active}
                    onCheckedChange={(checked) => setBulkForm(prev => ({ ...prev, active: !!checked }))}
                  />
                  <Label htmlFor="bulk-active">Machines were operational today</Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Supervisor on Site</Label>
                  <Select
                    value={bulkForm.supervisorOnSite}
                    onValueChange={(v) => setBulkForm(prev => ({ ...prev, supervisorOnSite: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select supervisor" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Maintenance Details</Label>
                  <Textarea
                    value={bulkForm.maintenanceDetails}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, maintenanceDetails: e.target.value }))}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Client Feedback</Label>
                  <Textarea
                    value={bulkForm.clientFeedback}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, clientFeedback: e.target.value }))}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Issues on Site</Label>
                  <Textarea
                    value={bulkForm.issuesOnSite}
                    onChange={(e) => setBulkForm(prev => ({ ...prev, issuesOnSite: e.target.value }))}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Sticky Footer */}
          <div className="p-4 border-t bg-card shrink-0">
            <div className="flex gap-3">
              <Button
                onClick={() => setShowBulkLogDialog(false)}
                variant="outline"
                className="flex-1 h-11"
                disabled={bulkSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkSave}
                className="flex-1 h-11"
                disabled={bulkSaving || selectedBulkItems.size === 0}
              >
                {bulkSaving ? 'Saving...' : `Log ${selectedBulkItems.size} Items`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
