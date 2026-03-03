import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog as EquipmentLogType } from "@/types/equipment";
import { Calendar as CalendarIcon, Eye, BarChart3, LineChart, History, Settings, Pencil } from "lucide-react";
import { format } from "date-fns";
import { getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { BulkLogDialog } from "./BulkLogDialog";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

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
}: MachinesSectionProps) => {
  const { toast } = useToast();
  const [showBulkLogDialog, setShowBulkLogDialog] = useState(false);
  const [savingStartDateFor, setSavingStartDateFor] = useState<string | null>(null);
  const [startDateDrafts, setStartDateDrafts] = useState<Record<string, string>>({});
  const [showStartDateDialog, setShowStartDateDialog] = useState(false);
  const [selectedMachineForDate, setSelectedMachineForDate] = useState<Asset | null>(null);

  const isAdmin = currentUser?.role === 'admin';

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
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Active Machines</h3>
            <Badge variant="outline" className="text-xs">{siteEquipment.length}</Badge>
          </div>

          {siteEquipment.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No active equipment assigned to this site.</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {siteEquipment.map((equipment) => {
                const overdueDays = getDieselOverdueDays(equipmentLogs, equipment.id);
                const currentStartDate = getMachineStartDate(equipment);
                const isSavingStartDate = savingStartDateFor === String(equipment.id);

                return (
                  <Card key={equipment.id} className="border shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{equipment.name}</span>
                        <div className="flex items-center gap-1">
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Set Start Date"
                              onClick={() => handleOpenStartDateDialog(equipment)}
                            >
                              <Settings className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Badge variant="outline" className="text-xs shrink-0">{equipment.status}</Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {overdueDays > 0 ? (
                        <div className="text-xs text-warning font-medium">
                          ⚠️ Diesel refill overdue by {overdueDays} day{overdueDays > 1 ? "s" : ""}
                        </div>
                      ) : null}

                      {/* Start Date Info - always visible but subtle */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>Start: {currentStartDate ? format(currentStartDate, "PP") : "Not set"}</span>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-1"
                            title="Edit Start Date"
                            onClick={() => handleOpenStartDateDialog(equipment)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {equipment.deploymentDate && !isAdmin && (
                          <Badge variant="secondary" className="text-[10px] h-5 ml-1">Override</Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => onViewAssetDetails?.(equipment)} variant="outline" size="sm" className="flex-1 text-xs">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                          Logs
                        </Button>
                        <Button onClick={() => onViewAssetHistory?.(equipment)} variant="ghost" size="sm" className="px-2" title="View History">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => onViewAssetAnalytics?.(equipment)} variant="ghost" size="sm" className="px-2" title="View Analytics">
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {isAdmin && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <History className="h-4 w-4" />
              Machine History (Returned)
            </h3>
            <Badge variant="secondary" className="text-xs">{returnedMachines.length}</Badge>
          </div>

          {returnedMachines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No returned machines with history yet.</p>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {returnedMachines.map((equipment) => {
                const logs = siteLogMap.get(String(equipment.id)) || [];
                const lastLog = logs[0];

                return (
                  <Card key={`history-${equipment.id}`} className="border border-dashed">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{equipment.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">Returned</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        {lastLog ? `Last log: ${format(new Date(lastLog.date), "PPP")}` : "No logs found"}
                      </p>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" disabled>
                          <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                          Logs Disabled
                        </Button>
                        <Button
                          onClick={() => onViewAssetHistory?.(equipment, { readOnly: true })}
                          variant="ghost"
                          size="sm"
                          className="px-2"
                          title="View Logs"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        )}
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
