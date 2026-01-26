import { logger } from "@/lib/logger";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Site, Asset, Employee } from "@/types/asset";
import { ConsumableUsageLog } from "@/types/consumable";
import { Waybill } from "@/types/asset";
import { Package2, ChevronDown, Plus, TrendingUp, Eye, BarChart3, LineChart } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activityLogger";
interface ConsumablesSectionProps {
  site: Site;
  assets: Asset[];
  employees: Employee[];
  waybills: Waybill[];
  consumableLogs: ConsumableUsageLog[];
  onAddConsumableLog: (log: ConsumableUsageLog) => void;
  onUpdateConsumableLog: (log: ConsumableUsageLog) => void;
  onViewAnalytics?: () => void;
  onViewAssetDetails?: (asset: Asset) => void;
  onViewAssetHistory?: (asset: Asset) => void;
  onViewAssetAnalytics?: (asset: Asset) => void;
}
export const ConsumablesSection = ({
  site,
  assets,
  employees,
  waybills,
  consumableLogs,
  onAddConsumableLog,
  onUpdateConsumableLog,
  onViewAnalytics,
  onViewAssetDetails,
  onViewAssetHistory,
  onViewAssetAnalytics
}: ConsumablesSectionProps) => {
  const {
    hasPermission
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isOpen, setIsOpen] = useState(true);

  // Use String() for safe comparison
  const siteId = String(site.id);

  // Filter consumables and non-consumables at the site (INCLUDING depleted/zero and historical via waybills/logs)
  const siteConsumables = assets.filter(asset => {
    // Include only consumable types (no reuseables/non-consumables)
    if (asset.type !== 'consumable') return false;

    // Check if item has usage logs at this site
    const hasLogs = consumableLogs.some(log => String(log.consumableId) === String(asset.id) && String(log.siteId) === siteId);

    // Check if item currently has quantity at this site (including 0)
    const hasSiteQuantity = asset.siteQuantities && (asset.siteQuantities[siteId] !== undefined || asset.siteQuantities[site.id] !== undefined);

    // Check if item was ever sent to this site via waybill
    const hasWaybillHistory = waybills.some(wb => String(wb.siteId) === siteId && wb.items.some(item => String(item.assetId) === String(asset.id)));

    // Show item if it has logs, current site quantity, OR waybill history
    // This ensures items remain visible even if fully consumed/returned
    return hasLogs || hasSiteQuantity || hasWaybillHistory;
  });
  const getConsumableLogs = (consumableId: string) => {
    const filtered = consumableLogs.filter(log => {
      // Convert both to strings for comparison to avoid type mismatch
      const logConsumableId = String(log.consumableId);
      const logSiteId = String(log.siteId);
      const targetConsumableId = String(consumableId);
      const targetSiteId = String(site.id);
      logger.info('Filtering logs', {
        data: {
          logConsumableId,
          logSiteId,
          targetConsumableId,
          targetSiteId,
          matches: logConsumableId === targetConsumableId && logSiteId === targetSiteId
        }
      });
      return logConsumableId === targetConsumableId && logSiteId === targetSiteId;
    });
    logger.info('Consumable logs debug', {
      data: {
        allLogs: consumableLogs,
        filteredLogs: filtered
      }
    });
    return filtered;
  };
  const getTotalUsed = (consumableId: string) => {
    return consumableLogs.filter(log => String(log.consumableId) === String(consumableId) && String(log.siteId) === String(site.id)).reduce((sum, log) => sum + log.quantityUsed, 0);
  };
  return <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Consumables Tracking</h3>
          
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onViewAnalytics} className="gap-2" disabled={!onViewAnalytics}>
            <LineChart className="h-4 w-4" />
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
        {siteConsumables.length === 0 ? <p className="text-muted-foreground">No materials at this site.</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {siteConsumables.map(consumable => {
          const currentQty = consumable.siteQuantities?.[site.id] ?? 0;
          const totalUsed = getTotalUsed(consumable.id);
          const logs = getConsumableLogs(consumable.id);
          return <Card key={consumable.id} className={`border-0 shadow-soft ${currentQty === 0 ? 'opacity-75' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{consumable.name}</span>
                      <Badge variant={currentQty === 0 ? 'destructive' : 'outline'} className="ml-2">
                        {currentQty} {consumable.unitOfMeasurement}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">At Site:</span>
                        <span className={`font-medium ${currentQty === 0 ? 'text-destructive' : ''}`}>
                          {currentQty} {consumable.unitOfMeasurement}
                          {currentQty === 0 && ' (Empty)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Used:</span>
                        <span className="font-medium">{totalUsed} {consumable.unitOfMeasurement}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage Count:</span>
                        <span className="font-medium">{logs.length}x</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => onViewAssetDetails?.(consumable)} variant="outline" size="sm" className="flex-1" disabled={!hasPermission('print_documents') || currentQty === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        {currentQty === 0 ? 'Depleted' : 'Log Usage'}
                      </Button>
                      <Button onClick={() => onViewAssetHistory?.(consumable)} variant="ghost" size="sm" className="px-2" title="View History">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => onViewAssetAnalytics?.(consumable)} variant="ghost" size="sm" className="px-2" title="View Analytics">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>;
        })}
          </div>}
      </CollapsibleContent>
    </Collapsible>;
};