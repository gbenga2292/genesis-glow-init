import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog as EquipmentLogType } from "@/types/equipment";
import { Calendar as CalendarIcon, Eye, BarChart3, LineChart, History } from "lucide-react";
import { format } from "date-fns";
import { getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { BulkLogDialog } from "./BulkLogDialog";
import { useToast } from "@/hooks/use-toast";

interface MachinesSectionProps {
  site: Site;
  assets: Asset[];
  equipmentLogs: EquipmentLogType[];
  employees: Employee[];
  waybills: any[];
  companySettings?: any;
  onAddEquipmentLog: (log: EquipmentLogType) => void;
  onUpdateEquipmentLog: (log: EquipmentLogType) => void;
  onViewAnalytics?: () => void;
  onViewAssetDetails?: (asset: Asset) => void;
  onViewAssetHistory?: (asset: Asset, options?: { readOnly?: boolean; selectedDate?: Date }) => void;
  onViewAssetAnalytics?: (asset: Asset) => void;
  onSetMachineStartDate?: (asset: Asset, startDate: Date) => Promise<void> | void;
}

export const MachinesSection = ({
  site,
  assets,
  equipmentLogs,
  employees,
  waybills,
  companySettings,
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

  const handleSaveStartDate = async (equipment: Asset) => {
    if (!onSetMachineStartDate) return;

    const value = startDateDrafts[String(equipment.id)];
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
      setSavingStartDateFor(String(equipment.id));
      await onSetMachineStartDate(equipment, parsed);
      toast({ title: "Start date saved", description: `${equipment.name} start date updated.` });
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
                        <Badge variant="outline" className="text-xs shrink-0">{equipment.status}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {overdueDays > 0 ? (
                        <div className="text-xs text-warning font-medium">
                          ⚠️ Diesel refill overdue by {overdueDays} day{overdueDays > 1 ? "s" : ""}
                        </div>
                      ) : null}

                      <div className="space-y-1.5">
                        <Label className="text-xs">Machine start date (site override)</Label>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={startDateDrafts[String(equipment.id)] || ""}
                            max={toDateInputValue(new Date())}
                            onChange={(e) =>
                              setStartDateDrafts((prev) => ({
                                ...prev,
                                [String(equipment.id)]: e.target.value,
                              }))
                            }
                            className="h-8 text-xs"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={!onSetMachineStartDate || isSavingStartDate}
                            onClick={() => handleSaveStartDate(equipment)}
                          >
                            {isSavingStartDate ? "Saving..." : "Set"}
                          </Button>
                        </div>
                        {currentStartDate ? (
                          <p className="text-[11px] text-muted-foreground">Current: {format(currentStartDate, "PPP")}</p>
                        ) : null}
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
      </div>

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
