import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog as EquipmentLogType, DowntimeEntry } from "@/types/equipment";
import { Wrench, Calendar as CalendarIcon, Plus, Eye, BarChart3, Package } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { SiteMachineAnalytics } from "./SiteMachineAnalytics";
import { useAuth } from "@/contexts/AuthContext";

interface MachinesSectionProps {
  site: Site;
  assets: Asset[];
  equipmentLogs: EquipmentLogType[];
  employees: Employee[];
  onAddEquipmentLog: (log: EquipmentLogType) => void;
  onUpdateEquipmentLog: (log: EquipmentLogType) => void;
}

export const MachinesSection = ({
  site,
  assets,
  equipmentLogs,
  employees,
  onAddEquipmentLog,
  onUpdateEquipmentLog
}: MachinesSectionProps) => {
  const { hasPermission } = useAuth();
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Asset | null>(null);
  const [selectedItem, setSelectedItem] = useState<Asset | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedViewLogs, setSelectedViewLogs] = useState<EquipmentLogType[]>([]);
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

  // Filter equipment for the site - only show equipment that requires logging
  const siteEquipment = assets.filter(asset =>
    asset.type === 'equipment' &&
    asset.requiresLogging === true &&
    (asset.siteId === site.id || (asset.siteQuantities && asset.siteQuantities[site.id] > 0))
  );

  const handleEquipmentSelect = (equipment: Asset) => {
    setSelectedEquipment(equipment);
    setShowCalendar(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setShowCalendar(false);
      setShowLogDialog(true);

      // Check for existing log
      const existingLog = equipmentLogs.find(log =>
        log.equipmentId === selectedEquipment!.id &&
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
    if (!selectedEquipment || !selectedDate) return;

    const existingLog = equipmentLogs.find(log =>
      log.equipmentId === selectedEquipment.id &&
      format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    const logData: EquipmentLogType = {
      id: existingLog?.id || Date.now().toString(),
      equipmentId: selectedEquipment.id,
      equipmentName: selectedEquipment.name,
      siteId: site.id,
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
      onUpdateEquipmentLog(logData);
    } else {
      onAddEquipmentLog(logData);
    }

    setShowLogDialog(false);
    setSelectedEquipment(null);
    setSelectedDate(undefined);
  };

  const getLogForEquipmentAndDate = (equipmentId: string, date: Date) => {
    return equipmentLogs.find(log =>
      log.equipmentId === equipmentId &&
      format(log.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  const getLoggedDatesForEquipment = (equipmentId: string) => {
    return equipmentLogs
      .filter(log => log.equipmentId === equipmentId)
      .map(log => log.date);
  };

  const getLoggedDatesForEquipmentAndSite = (equipmentId: string) => {
    return equipmentLogs
      .filter(log => log.equipmentId === equipmentId && log.siteId === site.id)
      .map(log => log.date);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Machines</h3>
      </div>

      {siteEquipment.length === 0 ? (
        <p className="text-muted-foreground">No equipment assigned to this dewatering site.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {siteEquipment.map((equipment) => (
            <Card key={equipment.id} className="border-0 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  {equipment.name}
                  <Badge variant="outline">{equipment.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Serial: {equipment.id}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEquipmentSelect(equipment)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={!hasPermission('print_documents')}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Month
                  </Button>
                  <Button
                    onClick={() => {
                      const equipmentLogsForSite = equipmentLogs.filter(log => log.siteId === site.id);
                      setSelectedViewLogs(equipmentLogsForSite);
                      setShowViewDialog(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="px-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      // Open analytics for this specific machine
                      setSelectedEquipment(equipment);
                      setShowAnalyticsDialog(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="px-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedItem(equipment);
                      setShowItemDialog(true);
                    }}
                    variant="ghost"
                    size="sm"
                    className="px-2"
                  >
                    <Package className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar Dialog */}
      <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Date for {selectedEquipment?.name}</DialogTitle>
            <DialogDescription>
              Choose a date to add or view the equipment log entry.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              modifiers={{
                logged: selectedEquipment ? getLoggedDatesForEquipmentAndSite(selectedEquipment.id) : []
              }}
              modifiersStyles={{
                logged: {
                  backgroundColor: 'blue',
                  color: 'white',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md border"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Entry Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Log Entry - {selectedEquipment?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'PPP')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
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
                onClick={() => setShowLogDialog(false)}
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
        </DialogContent>
      </Dialog>

      {/* View Logs Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipment Logs - {site.name}</DialogTitle>
            <DialogDescription>
              View all equipment log entries for this site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedViewLogs.length === 0 ? (
              <p className="text-muted-foreground">No equipment logs found for this site.</p>
            ) : (
              <div className="space-y-4">
                {selectedViewLogs.map((log) => (
                  <Card key={log.id} className="border-0 shadow-soft">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>{log.equipmentName}</span>
                        <Badge variant={log.active ? "default" : "secondary"}>
                          {log.active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {format(log.date, 'PPP')}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {log.active && (
                        <div className="space-y-3">
                          {log.downtimeEntries && log.downtimeEntries.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Downtime Entries:</Label>
                              {log.downtimeEntries.map((entry, index) => (
                                <div key={entry.id} className="border rounded p-3 bg-muted/50">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div><strong>Downtime:</strong> {entry.downtime || 'N/A'}</div>
                                    <div><strong>Uptime:</strong> {entry.uptime || 'N/A'}</div>
                                    <div><strong>Reason:</strong> {entry.downtimeReason || 'N/A'}</div>
                                    <div><strong>Action:</strong> {entry.downtimeAction || 'N/A'}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {log.maintenanceDetails && (
                            <div className="text-sm">
                              <strong>Maintenance Details:</strong> {log.maintenanceDetails}
                            </div>
                          )}

                          {log.dieselEntered && (
                            <div className="text-sm">
                              <strong>Diesel Entered:</strong> {log.dieselEntered} L
                            </div>
                          )}

                          {log.supervisorOnSite && (
                            <div className="text-sm">
                              <strong>Supervisor on Site:</strong> {log.supervisorOnSite}
                            </div>
                          )}

                          {log.clientFeedback && (
                            <div className="text-sm">
                              <strong>Client Feedback:</strong> {log.clientFeedback}
                            </div>
                          )}

                          {log.issuesOnSite && (
                            <div className="text-sm">
                              <strong>Issues on Site:</strong> {log.issuesOnSite}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analytics - {selectedEquipment?.name}</DialogTitle>
            <DialogDescription>
              View detailed analytics for this equipment.
            </DialogDescription>
          </DialogHeader>
          {selectedEquipment && (
            <SiteMachineAnalytics
              site={site}
              equipment={[selectedEquipment]}
              equipmentLogs={equipmentLogs.filter(log => log.equipmentId === selectedEquipment.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Show Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Equipment Details - {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Detailed information about this equipment asset.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Asset ID</Label>
                  <div className="text-sm text-muted-foreground">{selectedItem.id}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Name</Label>
                  <div className="text-sm text-muted-foreground">{selectedItem.name}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="text-sm text-muted-foreground">{selectedItem.type}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant="outline">{selectedItem.status}</Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Site ID</Label>
                  <div className="text-sm text-muted-foreground">{selectedItem.siteId}</div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Site Name</Label>
                  <div className="text-sm text-muted-foreground">{site.name}</div>
                </div>
              </div>

              {/* Equipment Logs Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Recent Logs</h4>
                {equipmentLogs.filter(log => log.equipmentId === selectedItem.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logs found for this equipment.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {equipmentLogs
                      .filter(log => log.equipmentId === selectedItem.id)
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .slice(0, 5)
                      .map((log) => (
                        <Card key={log.id} className="border-0 shadow-soft">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm">
                                <span className="font-medium">{format(log.date, 'PPP')}</span>
                                <Badge variant={log.active ? "default" : "secondary"} className="ml-2">
                                  {log.active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                            {log.active && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {log.maintenanceDetails && <div>Maintenance: {log.maintenanceDetails}</div>}
                                {log.dieselEntered && <div>Diesel: {log.dieselEntered} L</div>}
                                {log.supervisorOnSite && <div>Supervisor: {log.supervisorOnSite}</div>}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>

              {/* Analytics Summary */}
              <div className="space-y-4">
                <h4 className="font-medium">Analytics Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {equipmentLogs.filter(log => log.equipmentId === selectedItem.id && log.active).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Days</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {equipmentLogs.filter(log => log.equipmentId === selectedItem.id && !log.active).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Inactive Days</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {equipmentLogs.filter(log => log.equipmentId === selectedItem.id).length}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Logs</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
