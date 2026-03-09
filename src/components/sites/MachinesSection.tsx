import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog as EquipmentLogType } from "@/types/equipment";
import { Calendar as CalendarIcon, Eye, BarChart3, LineChart, History, Settings, Pencil, Package } from "lucide-react";
import { format } from "date-fns";
import { getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { BulkLogDialog } from "./BulkLogDialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MachinesSectionProps {
  site: Site;
  assets: Asset[];
  equipmentLogs: EquipmentLogType[];
  employees: Employee[];
  waybills: any[];
  companySettings?: any;
  currentUser?: { role: string; name: string; avatar?: string; id?: string; username?: string } | null | undefined;
  onAddEquipmentLog: (log: EquipmentLogType) => void;
  onUpdateEquipmentLog: (log: EquipmentLogType) => void;
  onViewAnalytics?: () => void;
  onViewAssetDetails?: (asset: Asset) => void;
  onViewAssetHistory?: (asset: Asset, options?: { readOnly?: boolean; selectedDate?: Date }) => void;
  onViewAssetAnalytics?: (asset: Asset) => void;
  onSetMachineStartDate?: (asset: Asset, startDate: Date) => Promise<void> | void;
  /** When false, hides admin-only controls (edit start date, machine history) regardless of role */
  showAdminControls?: boolean;
}

export const MachinesSection = ({
  site,
  assets,
  equipmentLogs,
  employees,
  waybills,
  companySettings,
  currentUser,
  onAddEquipmentLog,
  onUpdateEquipmentLog,
  onViewAnalytics,
  onViewAssetDetails,
  onViewAssetHistory,
  onViewAssetAnalytics,
  onSetMachineStartDate,
  showAdminControls = true,
}: MachinesSectionProps) => {
  const { toast } = useToast();
  const [showBulkLogDialog, setShowBulkLogDialog] = useState(false);
  const [savingStartDateFor, setSavingStartDateFor] = useState<string | null>(null);
  const [startDateDrafts, setStartDateDrafts] = useState<Record<string, string>>({});
  const [showStartDateDialog, setShowStartDateDialog] = useState(false);
  const [selectedMachineForDate, setSelectedMachineForDate] = useState<Asset | null>(null);

  const isAdmin = currentUser?.role === 'admin' && showAdminControls;

  const siteId = String(site.id);

  const siteEquipment = useMemo(
    () =>
      assets.filter(
        (asset) =>
          asset.type === "equipment" &&
          asset.requiresLogging === true &&
          (String(asset.siteId) === siteId ||
            (asset.siteQuantities &&
              (asset.siteQuantities[siteId] !== undefined || asset.siteQuantities[site.id] !== undefined)))
      ),
    [assets, siteId, site.id]
  );

  const siteLogMap = useMemo(() => {
    const map = new Map<string, EquipmentLogType[]>();
    equipmentLogs
      .filter((log) => String(log.siteId) === siteId)
      .forEach((log) => {
        const key = String(log.equipmentId);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(log);
      });

    map.forEach((logs) => logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    return map;
  }, [equipmentLogs, siteId]);

  const returnedMachines = useMemo(() => {
    const activeIds = new Set(siteEquipment.map((a) => String(a.id)));
    return assets.filter(
      (asset) =>
        asset.type === "equipment" &&
        asset.requiresLogging === true &&
        !activeIds.has(String(asset.id)) &&
        (siteLogMap.get(String(asset.id))?.length || 0) > 0
    );
  }, [assets, siteEquipment, siteLogMap]);

  const getFallbackStartDate = (equipment: Asset) => {
    const waybillDates = waybills
      .filter(
        (waybill) =>
          String(waybill.siteId) === siteId &&
          waybill.items?.some((item: any) => String(item.assetId) === String(equipment.id))
      )
      .map((waybill) => new Date(waybill.issueDate));

    const logDates = (siteLogMap.get(String(equipment.id)) || []).map((log) => new Date(log.date));
    const candidates = [...waybillDates, ...logDates].filter((d) => !isNaN(d.getTime()));
    if (candidates.length === 0) return null;

    return new Date(Math.min(...candidates.map((d) => d.getTime())));
  };

  const getMachineStartDate = (equipment: Asset) => {
    if (equipment.deploymentDate) return new Date(equipment.deploymentDate);
    return getFallbackStartDate(equipment);
  };

  const toDateInputValue = (date?: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const drafts: Record<string, string> = {};
    siteEquipment.forEach((equipment) => {
      drafts[String(equipment.id)] = toDateInputValue(getMachineStartDate(equipment));
    });
    setStartDateDrafts(drafts);
  }, [siteEquipment]);

  const handleBulkSaveEquipmentLogs = async (logs: EquipmentLogType[]) => {
    await Promise.all(logs.map((log) => onAddEquipmentLog(log)));
  };

  const handleOpenStartDateDialog = (equipment: Asset) => {
    setSelectedMachineForDate(equipment);
    setStartDateDrafts((prev) => ({
      ...prev,
      [String(equipment.id)]: toDateInputValue(getMachineStartDate(equipment)),
    }));
    setShowStartDateDialog(true);
  };

  const handleSaveStartDate = async () => {
    if (!onSetMachineStartDate || !selectedMachineForDate) return;

    const value = startDateDrafts[String(selectedMachineForDate.id)];
    if (!value) {
      toast({ title: "Missing date", description: "Select a start date first.", variant: "destructive" });
      return;
    }

    const parsed = new Date(`${value}T00:00:00`);
    if (isNaN(parsed.getTime())) {
      toast({ title: "Invalid date", description: "Please choose a valid start date.", variant: "destructive" });
      return;
    }

    try {
      setSavingStartDateFor(String(selectedMachineForDate.id));
      await onSetMachineStartDate(selectedMachineForDate, parsed);
      toast({ title: "Start date saved", description: `${selectedMachineForDate.name} start date updated.` });
      setShowStartDateDialog(false);
      setSelectedMachineForDate(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to save start date.", variant: "destructive" });
    } finally {
      setSavingStartDateFor(null);
    }
  };

  return (
    <>
      {onViewAnalytics && (
        <div className="flex justify-end mb-3">
          <Button onClick={onViewAnalytics} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <LineChart className="h-3.5 w-3.5 mr-1.5" />
            Site Analytics
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* Table-based layout for Active Machines and Machine History */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Active Machines
              <Badge variant="outline" className="ml-1 text-xs">{siteEquipment.length}</Badge>
            </TabsTrigger>
            {showAdminControls !== false && (
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Machine History
                <Badge variant="secondary" className="ml-1 text-xs">{returnedMachines.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Active Machines Table */}
          <TabsContent value="active" className="space-y-3">
            {siteEquipment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No active equipment assigned to this site.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Machine Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {siteEquipment.map((equipment) => {
                      const overdueDays = getDieselOverdueDays(equipmentLogs, equipment.id);
                      const currentStartDate = getMachineStartDate(equipment);
                      const logs = siteLogMap.get(String(equipment.id)) || [];
                      const lastLog = logs[0];

                      return (
                        <TableRow key={equipment.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{equipment.name}</span>
                              {overdueDays > 0 && (
                                <Badge variant="destructive" className="text-[10px] h-5">
                                  ⚠️ {overdueDays}d overdue
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{equipment.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {currentStartDate ? format(currentStartDate, "PP") : "Not set"}
                              </span>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  title="Edit Start Date"
                                  onClick={() => handleOpenStartDateDialog(equipment)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {lastLog ? format(new Date(lastLog.date), "PP") : "No logs"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button onClick={() => onViewAssetDetails?.(equipment)} variant="outline" size="sm" className="h-8 text-xs">
                                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                                Logs
                              </Button>
                              <Button onClick={() => onViewAssetHistory?.(equipment)} variant="ghost" size="sm" className="h-8 w-8 p-0" title="View History">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button onClick={() => onViewAssetAnalytics?.(equipment)} variant="ghost" size="sm" className="h-8 w-8 p-0" title="View Analytics">
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Machine History Table */}
          <TabsContent value="history" className="space-y-3">
            {returnedMachines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <History className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No returned machines with history yet.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Machine Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Last Log Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnedMachines.map((equipment) => {
                      const logs = siteLogMap.get(String(equipment.id)) || [];
                      const lastLog = logs[0];

                      return (
                        <TableRow key={`history-${equipment.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <History className="h-4 w-4 text-muted-foreground" />
                              <span>{equipment.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">Returned</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {lastLog ? (lastLog.active ? "Active" : "Inactive") : "No logs"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {lastLog ? format(new Date(lastLog.date), "PPP") : "No logs"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                onClick={() => onViewAssetHistory?.(equipment, { readOnly: true })}
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                View History
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Start Date Dialog */}
      <Dialog open={showStartDateDialog} onOpenChange={setShowStartDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Machine Start Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Machine</Label>
              <p className="font-medium">{selectedMachineForDate?.name}</p>
            </div>
            <div className="space-y-2">
              <Label>Start Date (Site Override)</Label>
              <Input
                type="date"
                value={selectedMachineForDate ? startDateDrafts[String(selectedMachineForDate.id)] || "" : ""}
                max={toDateInputValue(new Date())}
                onChange={(e) =>
                  setStartDateDrafts((prev) => ({
                    ...prev,
                    [String(selectedMachineForDate!.id)]: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                This overrides the default start date (waybill date or first log date)
              </p>
            </div>
            {selectedMachineForDate && getMachineStartDate(selectedMachineForDate) && (
              <p className="text-xs text-muted-foreground">
                Current: {format(getMachineStartDate(selectedMachineForDate), "PPP")}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveStartDate} disabled={savingStartDateFor !== null}>
              {savingStartDateFor ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkLogDialog
        open={showBulkLogDialog}
        onOpenChange={setShowBulkLogDialog}
        site={site}
        assets={assets}
        employees={employees}
        type="equipment"
        onSaveEquipmentLogs={handleBulkSaveEquipmentLogs}
      />
    </>
  );
};
