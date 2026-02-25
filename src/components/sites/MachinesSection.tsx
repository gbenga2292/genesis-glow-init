import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog as EquipmentLogType, DowntimeEntry } from "@/types/equipment";
import { Wrench, Calendar as CalendarIcon, Plus, Eye, BarChart3, Package, ChevronDown, LineChart, Layers } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/utils/activityLogger";
import { getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { BulkLogDialog } from "./BulkLogDialog";
import { useIsMobile } from "@/hooks/use-mobile";

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
  onViewAssetHistory?: (asset: Asset) => void;
  onViewAssetAnalytics?: (asset: Asset) => void;
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
  onViewAssetAnalytics
}: MachinesSectionProps) => {
  const {
    hasPermission
  } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Asset | null>(null);
  const [showBulkLogDialog, setShowBulkLogDialog] = useState(false);

  // Use String() for safe comparison
  const siteId = String(site.id);

  // Filter equipment for the site - show ALL equipment using siteQuantities or ID match
  // This ensures we can still see and log machines even if they're temporarily removed
  const siteEquipment = assets.filter(asset => asset.type === 'equipment' && asset.requiresLogging === true && (String(asset.siteId) === siteId || asset.siteQuantities && (asset.siteQuantities[siteId] !== undefined || asset.siteQuantities[site.id] !== undefined)));

  const handleBulkSaveEquipmentLogs = async (logs: EquipmentLogType[]) => {
    for (const log of logs) {
      await onAddEquipmentLog(log);
    }
  };

  return (
    <>
      {/* Site Analytics button */}
      {onViewAnalytics && (
        <div className="flex justify-end mb-3">
          <Button onClick={onViewAnalytics} variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <LineChart className="h-3.5 w-3.5 mr-1.5" />
            Site Analytics
          </Button>
        </div>
      )}

      {/* Equipment grid — always visible */}
      {siteEquipment.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No equipment assigned to this site.</p>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {siteEquipment.map(equipment => (
            <Card key={equipment.id} className="border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{equipment.name}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{equipment.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const overdueDays = getDieselOverdueDays(equipmentLogs, equipment.id);
                  return overdueDays > 0 ? (
                    <div className="text-xs text-warning font-medium">
                      ⚠️ Diesel refill overdue by {overdueDays} day{overdueDays > 1 ? 's' : ''}
                    </div>
                  ) : null;
                })()}
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
          ))}
        </div>
      )}

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
