import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Asset, Site, Employee } from "@/types/asset";
import { EquipmentLog, DowntimeEntry } from "@/types/equipment";
import { AlertTriangle, CheckCircle, Clock, Wrench, Zap, Calendar as CalendarIcon, Plus } from "lucide-react";
import { format, isToday } from "date-fns";
import { createDefaultOperationalLog, applyDefaultTemplate, calculateDieselRefill, getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationPanelProps {
  assets: Asset[];
  sites: Site[];
  equipmentLogs: EquipmentLog[];
  employees: Employee[];
  onQuickLogEquipment: (log: EquipmentLog) => void;
}

interface PendingLogItem {
  equipment: Asset;
  site: Site;
  lastLogDate?: Date;
  missingDays: number;
  isOverdue: boolean;
}

export const NotificationPanel = ({
  assets,
  sites,
  equipmentLogs,
  employees,
  onQuickLogEquipment
}: NotificationPanelProps) => {
  const { hasPermission } = useAuth();
  const [showQuickLogDialog, setShowQuickLogDialog] = useState(false);
  const [selectedPendingItem, setSelectedPendingItem] = useState<PendingLogItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

  // Calculate pending logs
  const getPendingLogs = (): PendingLogItem[] => {
    const pending: PendingLogItem[] = [];

    equipmentRequiringLogging.forEach(equipment => {
      // Get all sites where this equipment is allocated
      const equipmentSites = getEquipmentSites(equipment);

      equipmentSites.forEach(site => {
        // Get all logs for this equipment at this site, sorted by date
        const siteLogs = equipmentLogs
          .filter(log => log.equipmentId === equipment.id && log.siteId === site.id)
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (siteLogs.length === 0) {
          // No logs at all - equipment was never logged at this site
          // Assume it was allocated recently and needs logging from today
          pending.push({
            equipment,
            site,
            lastLogDate: undefined,
            missingDays: 1, // At least today
            isOverdue: false
          });
        } else {
          // Check for missing days from last log to today
          const lastLog = siteLogs[siteLogs.length - 1];
          const lastLogDate = new Date(lastLog.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          lastLogDate.setHours(0, 0, 0, 0);

          const daysDiff = Math.floor((today.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff > 0) {
            // Missing logs for daysDiff days
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

    // Sort by overdue status and missing days
    return pending.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return b.missingDays - a.missingDays;
    });
  };

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

  const pendingLogs = getPendingLogs();
  const overdueCount = pendingLogs.filter(item => item.isOverdue).length;
  const todayPendingCount = pendingLogs.length;

  const getLoggedDatesForEquipment = (equipmentId: string) => {
    return equipmentLogs
      .filter(log => String(log.equipmentId) === String(equipmentId))
      .map(log => log.date);
  };

  const handleQuickLog = (item: PendingLogItem) => {
    setSelectedPendingItem(item);
    setSelectedDate(new Date());

    // Calculate diesel refill based on schedule (60L every 4 days)
    const dieselRefill = calculateDieselRefill(equipmentLogs, item.equipment.id);

    // Get default supervisor (first active employee)
    const defaultSupervisor = employees.find(emp => emp.status === 'active')?.name;

    // Create default operational log with calculated diesel
    const defaultTemplate = createDefaultOperationalLog(defaultSupervisor, dieselRefill);

    // Populate form with default template
    setLogForm({
      active: defaultTemplate.active,
      downtimeEntries: defaultTemplate.downtimeEntries,
      maintenanceDetails: defaultTemplate.maintenanceDetails || "",
      dieselEntered: defaultTemplate.dieselEntered?.toString() || "",
      supervisorOnSite: defaultTemplate.supervisorOnSite || "",
      clientFeedback: defaultTemplate.clientFeedback || "",
      issuesOnSite: defaultTemplate.issuesOnSite || ""
    });

    setShowQuickLogDialog(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && selectedPendingItem) {
      setSelectedDate(date);

      // Check for existing log
      const existingLog = equipmentLogs.find(log =>
        log.equipmentId === selectedPendingItem.equipment.id &&
        format(log.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );

      if (existingLog) {
        // Populate form with existing data
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
        // Reset form for new entry - default to active
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

    if (existingLog) {
      onQuickLogEquipment(logData); // This should be onUpdateEquipmentLog, but since it's not passed, using onQuickLogEquipment
    } else {
      onQuickLogEquipment(logData);
    }

    setShowQuickLogDialog(false);
    setSelectedPendingItem(null);
    setSelectedDate(undefined);
  };

  if (todayPendingCount === 0) {
    return (
      <Card className="border-0 shadow-soft bg-green-50 dark:bg-green-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            All Equipment Logged
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-600 dark:text-green-500">
            All equipment requiring daily logs have been logged for today.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Pending Equipment Logs
            </div>
            <div className="flex gap-2">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {overdueCount} Overdue
                </Badge>
              )}
              <Badge variant="secondary">
                {todayPendingCount} Pending
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Equipment requiring daily logs - missing entries from the day they were allocated to site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingLogs.slice(0, 5).map((item, index) => (
              <Alert key={`${item.equipment.id}-${item.site.id}`} className={item.isOverdue ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20" : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{item.equipment.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.site.name}
                      {item.lastLogDate && (
                        <span className="ml-2">
                          • Last logged {format(item.lastLogDate, 'MMM dd')} ({item.missingDays} day{item.missingDays > 1 ? 's' : ''} missing)
                        </span>
                      )}
                      {!item.lastLogDate && (
                        <span className="ml-2">
                          • Never logged at this site
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.isOverdue && (
                      <Badge variant="destructive" className="text-xs">
                        Overdue
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickLog(item)}
                      className="gap-1"
                      disabled={!hasPermission('write_assets')}
                    >
                      <Zap className="h-3 w-3" />
                      Quick Log
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}

            {pendingLogs.length > 5 && (
              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  +{pendingLogs.length - 5} more pending logs
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Log Form Dialog */}
      <Dialog open={showQuickLogDialog} onOpenChange={setShowQuickLogDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Log Equipment
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'PPP')} - {selectedPendingItem?.equipment.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar on the Left */}
            <div className="space-y-2">
              <Label>Date</Label>
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
                className="rounded-md border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Blue dates have existing logs
              </p>
            </div>

            {/* Form on the Right */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="active"
                  checked={logForm.active}
                  onCheckedChange={(checked) => setLogForm({...logForm, active: checked as boolean})}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              {logForm.active && (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Downtime Entries</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setLogForm({
                          ...logForm,
                          downtimeEntries: [...logForm.downtimeEntries, { id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }]
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Entry
                      </Button>
                    </div>

                    {logForm.downtimeEntries.map((entry, index) => (
                      <div key={entry.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">Entry {index + 1}</h4>
                          {logForm.downtimeEntries.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setLogForm({
                                ...logForm,
                                downtimeEntries: logForm.downtimeEntries.filter((_, i) => i !== index)
                              })}
                            >
                              Remove
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor={`downtime-${index}`}>Downtime (Time Machine Went Off)</Label>
                            <Input
                              id={`downtime-${index}`}
                              value={entry.downtime}
                              onChange={(e) => {
                                const newEntries = [...logForm.downtimeEntries];
                                newEntries[index].downtime = e.target.value;
                                setLogForm({...logForm, downtimeEntries: newEntries});
                              }}
                              placeholder="e.g., 14:30"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`uptime-${index}`}>Uptime (Time Machine Came Back On)</Label>
                            <Input
                              id={`uptime-${index}`}
                              value={entry.uptime}
                              onChange={(e) => {
                                const newEntries = [...logForm.downtimeEntries];
                                newEntries[index].uptime = e.target.value;
                                setLogForm({...logForm, downtimeEntries: newEntries});
                              }}
                              placeholder="e.g., 16:00"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`downtimeReason-${index}`}>Downtime Reason</Label>
                          <Input
                            id={`downtimeReason-${index}`}
                            value={entry.downtimeReason}
                            onChange={(e) => {
                              const newEntries = [...logForm.downtimeEntries];
                              newEntries[index].downtimeReason = e.target.value;
                              setLogForm({...logForm, downtimeEntries: newEntries});
                            }}
                            placeholder="Reason for downtime"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`downtimeAction-${index}`}>Action Taken</Label>
                          <Textarea
                            id={`downtimeAction-${index}`}
                            value={entry.downtimeAction}
                            onChange={(e) => {
                              const newEntries = [...logForm.downtimeEntries];
                              newEntries[index].downtimeAction = e.target.value;
                              setLogForm({...logForm, downtimeEntries: newEntries});
                            }}
                            placeholder="Actions taken to resolve"
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maintenanceDetails">Maintenance Details</Label>
                    <Textarea
                      id="maintenanceDetails"
                      value={logForm.maintenanceDetails}
                      onChange={(e) => setLogForm({...logForm, maintenanceDetails: e.target.value})}
                      placeholder="Maintenance performed"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dieselEntered">Diesel Entered (L)</Label>
                      <Input
                        id="dieselEntered"
                        type="number"
                        value={logForm.dieselEntered}
                        onChange={(e) => setLogForm({...logForm, dieselEntered: e.target.value})}
                        placeholder="0.00"
                      />
                      {selectedPendingItem && (() => {
                        const overdueDays = getDieselOverdueDays(equipmentLogs, selectedPendingItem.equipment.id);
                        const refillAmount = calculateDieselRefill(equipmentLogs, selectedPendingItem.equipment.id);
                        return overdueDays > 0 ? (
                          <p className="text-xs text-orange-600">
                            ⚠️ Refill due: {refillAmount}L (overdue by {overdueDays} day{overdueDays > 1 ? 's' : ''})
                          </p>
                        ) : refillAmount ? (
                          <p className="text-xs text-blue-600">
                            💡 Suggested refill: {refillAmount}L
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supervisorOnSite">Supervisor on Site</Label>
                      <Select
                        value={logForm.supervisorOnSite}
                        onValueChange={(value) => setLogForm({...logForm, supervisorOnSite: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supervisor" />
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

                  <div className="space-y-2">
                    <Label htmlFor="clientFeedback">Client Feedback</Label>
                    <Textarea
                      id="clientFeedback"
                      value={logForm.clientFeedback}
                      onChange={(e) => setLogForm({...logForm, clientFeedback: e.target.value})}
                      placeholder="Client feedback and comments"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="issuesOnSite">Issues on Site</Label>
                    <Textarea
                      id="issuesOnSite"
                      value={logForm.issuesOnSite}
                      onChange={(e) => setLogForm({...logForm, issuesOnSite: e.target.value})}
                      placeholder="Any issues encountered"
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setShowQuickLogDialog(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLog}
                  className="flex-1"
                >
                  Save Log Entry
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
