import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog as EquipmentLogType, DowntimeEntry } from "@/types/equipment";
import { Wrench, Calendar as CalendarIcon, Plus, Eye, BarChart3, Package, ChevronDown, LineChart } from "lucide-react";
import { format, isSameDay } from "date-fns";


import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/utils/activityLogger";
import { getDieselOverdueDays } from "@/utils/defaultLogTemplate";

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
  const { hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Asset | null>(null);

  // Use String() for safe comparison
  const siteId = String(site.id);

  // Filter equipment for the site - show ALL equipment using siteQuantities or ID match
  // This ensures we can still see and log machines even if they're temporarily removed
  const siteEquipment = assets.filter(asset =>
    asset.type === 'equipment' &&
    asset.requiresLogging === true &&
    (String(asset.siteId) === siteId || 
     (asset.siteQuantities && (asset.siteQuantities[siteId] !== undefined || asset.siteQuantities[site.id] !== undefined)))
  );



  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Machines</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onViewAnalytics}
            variant="outline"
            size="sm"
            disabled={!onViewAnalytics}
          >
            <LineChart className="h-4 w-4 mr-2" />
            Site Analytics
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="space-y-4">
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
                  {(() => {
                    const overdueDays = getDieselOverdueDays(equipmentLogs, equipment.id);
                    return overdueDays > 0 ? (
                      <div className="text-xs text-orange-600 font-medium">
                        ⚠️ Diesel refill overdue by {overdueDays} day{overdueDays > 1 ? 's' : ''}
                      </div>
                    ) : null;
                  })()}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onViewAssetDetails?.(equipment)}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!hasPermission('write_assets')}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Logs
                    </Button>
                    <Button
                      onClick={() => onViewAssetHistory?.(equipment)}
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      title="View History"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => onViewAssetAnalytics?.(equipment)}
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      title="View Analytics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CollapsibleContent>

    </Collapsible>
  );
};
