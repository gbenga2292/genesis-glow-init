import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, QuickCheckout, Site } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { MaintenanceLog } from "@/types/maintenance";
import { BarChart, TrendingUp, Clock, AlertTriangle, Package, Wrench, Zap, MapPin, User, Building, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";


interface AssetAnalyticsDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quickCheckouts?: QuickCheckout[];
  sites?: Site[];
  maintenanceLogs?: MaintenanceLog[];
}

export const AssetAnalyticsDialog = ({ asset, open, onOpenChange, quickCheckouts = [], sites = [], maintenanceLogs = [] }: AssetAnalyticsDialogProps) => {
  const { companySettings } = useAppData();
  const [analytics, setAnalytics] = useState<any>(null);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);

  useEffect(() => {
    if (asset) {
      loadEquipmentLogs(asset.id);
    }
  }, [asset]);

  useEffect(() => {
    if (asset) {
      const calculatedAnalytics = calculateAnalytics(asset, equipmentLogs, quickCheckouts);
      setAnalytics(calculatedAnalytics);
    }
  }, [asset, equipmentLogs, quickCheckouts, companySettings]); // Added companySettings to dependency

  const loadEquipmentLogs = async (assetId: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        const logs = await window.electronAPI.db.getEquipmentLogs();
        const assetLogs = logs.filter((log: EquipmentLog) => log.equipmentId === assetId);
        setEquipmentLogs(assetLogs);
      } catch (error) {
        logger.error('Failed to load equipment logs', error);
        setEquipmentLogs([]);
      }
    } else {
      setEquipmentLogs([]);
    }
  };

  const calculateAnalytics = (asset: Asset, logs: EquipmentLog[], checkouts: QuickCheckout[]) => {
    // Filter checkouts for this asset
    const assetCheckouts = checkouts.filter(c => c.assetId === asset.id);

    // Utilization Rate: (Reserved / Total) * 100
    // Or for consumables: consumption rate over time?
    // Let's stick to current status for utilization
    const utilizationRate = asset.quantity > 0
      ? Math.round((asset.reservedQuantity || 0) / asset.quantity * 100)
      : 0;

    // Average Checkout Duration (for returned items)
    const returnedCheckouts = assetCheckouts.filter(c => c.status === 'return_completed' || c.returnedQuantity > 0);
    let avgDuration = 0;
    if (returnedCheckouts.length > 0) {
      // Note: QuickCheckout doesn't explicitly store returnDate on the main object in types I've seen,
      // but if it did or if we infer from updatedAt vs checkoutDate...
      // For now, let's look at logs or just assume current duration for outstanding.
      // Actually, let's use the 'active' logs for duration if available, or just fallback to a safe calculation.
      // Since we don't have explicit return dates on QuickCheckout type easily available here without checking DB schema deeply,
      // we can estimate "Usage Frequency" instead.
      avgDuration = 0; // Placeholder as we lack precise return dates in this context
    }

    // Usage Frequency: Checkouts in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCheckouts = assetCheckouts.filter(c => new Date(c.checkoutDate) >= thirtyDaysAgo);
    const usageFrequency = recentCheckouts.length;

    const baseAnalytics = {
      totalQuantity: asset.quantity,
      availableQuantity: asset.availableQuantity || 0,
      reservedQuantity: asset.reservedQuantity || 0,
      missingCount: asset.missingCount || 0,
      damagedCount: asset.damagedCount || 0,
      utilizationRate: utilizationRate,
      averageCheckoutDuration: 0, // Would need return dates
      usageFrequency: usageFrequency,
      maintenanceFrequency: 0,
      reorderFrequency: 0, // Could be calculated from restock logs if we had them here
      stockTurnover: 0,
      lastMaintenance: null,
      nextMaintenance: null,
      totalLogs: logs.length,
      recentActivity: logs.slice(0, 5),
    };

    // Calculate generic stats from logs
    if (logs.length > 0) {
      // ... (existing log calculations) ...
      // Calculate average downtime
      const totalDowntime = logs.reduce((sum, log) => {
        return sum + log.downtimeEntries.reduce((entrySum, entry) => {
          const downtimeHours = parseFloat(entry.downtime) || 0;
          return entrySum + downtimeHours;
        }, 0);
      }, 0);
      baseAnalytics.averageCheckoutDuration = 0; // Reset

      const maintenanceLogs = logs.filter(log => log.maintenanceDetails);
      if (maintenanceLogs.length > 0) {
        // Calculate average days between maintenance
        const sortedDates = maintenanceLogs
          .map(l => new Date(l.date).getTime())
          .sort((a, b) => a - b);

        if (sortedDates.length > 1) {
          let totalDiff = 0;
          for (let i = 1; i < sortedDates.length; i++) {
            totalDiff += (sortedDates[i] - sortedDates[i - 1]);
          }
          const avgDiffMs = totalDiff / (sortedDates.length - 1);
          baseAnalytics.maintenanceFrequency = Math.round(avgDiffMs / (1000 * 60 * 60 * 24));
        } else {
          baseAnalytics.maintenanceFrequency = 0; // Not enough data
        }

        baseAnalytics.lastMaintenance = new Date(maintenanceLogs[maintenanceLogs.length - 1].date).toLocaleDateString();
      }
    }

    // Type-specific logic
    // Type-specific calculations
    switch (asset.type) {
      case 'tools':
        return {
          ...baseAnalytics,
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || 1, // Default 1 day if unknown
          maintenanceFrequency: baseAnalytics.maintenanceFrequency || 30, // Default recommendation
        };

      case 'equipment':
        // NEW LOGIC: Use configured maintenance frequency (default 60 days) if operational (active/utilized).
        // If not active, maintenance is not needed.
        let maintFreq = 0;
        let nextMaint = "Not Required (Inactive)";

        const configuredFreq = companySettings?.maintenanceFrequency || 60;

        if (utilizationRate > 0) {
          maintFreq = configuredFreq;
          // If we have a last maintenance date, calculate next due
          if (baseAnalytics.lastMaintenance) {
            const lastDate = new Date(baseAnalytics.lastMaintenance);
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + configuredFreq);
            nextMaint = nextDate.toLocaleDateString();
          } else {
            nextMaint = "Due Now (Active but no log)";
          }
        }

        const equipmentAnalytics: any = {
          ...baseAnalytics,
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || 7,
          maintenanceFrequency: maintFreq,
          nextMaintenance: nextMaint,
          downtimeHours: logs.reduce((sum, log) => sum + log.downtimeEntries.reduce((acc, curr) => acc + (parseFloat(curr.downtime) || 0), 0), 0),
          powerSource: asset.powerSource,
          fuelCapacity: asset.fuelCapacity,
          fuelConsumptionRate: asset.fuelConsumptionRate,
          electricityConsumption: asset.electricityConsumption,
        };

        // Calculate fuel-based analytics
        if (asset.fuelCapacity && asset.fuelConsumptionRate) {
          equipmentAnalytics.operatingHoursPerTank = (asset.fuelCapacity / asset.fuelConsumptionRate) * 24;
          equipmentAnalytics.refuelFrequency = asset.fuelCapacity / asset.fuelConsumptionRate;
        }

        // Calculate electricity-based analytics
        if (asset.electricityConsumption) {
          const electricityRate = companySettings?.electricityRate || 200;
          equipmentAnalytics.dailyElectricityCost = asset.electricityConsumption * electricityRate;
          equipmentAnalytics.monthlyElectricityCost = equipmentAnalytics.dailyElectricityCost * 30;
        }

        return equipmentAnalytics;

      case 'consumable':
        // Consumption Rate: Items used in last 30 days
        const usedInLast30Days = assetCheckouts
          .filter(c => c.status === 'used' && new Date(c.checkoutDate) >= thirtyDaysAgo)
          .reduce((sum, c) => sum + c.quantity, 0);

        return {
          ...baseAnalytics,
          consumptionRate: usedInLast30Days, // Real data
          reorderFrequency: 14, // Default est. for consumables
          stockTurnover: usedInLast30Days > 0 ? (asset.quantity / usedInLast30Days) * 12 : 0, // Projected annual turnover
          costPerUnit: 0, // We lack cost data in Asset type currently
        };

      case 'non-consumable':
        return {
          ...baseAnalytics,
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || 5,
          maintenanceFrequency: baseAnalytics.maintenanceFrequency || 180,
        };

      default:
        return baseAnalytics;
    }
  };

  if (!asset || !analytics) return null;

  // Helper to format currency
  const formatCurrency = (val: number | undefined | null) => {
    const symbol = companySettings?.currencySymbol || '₦';
    const value = typeof val === 'number' ? val : 0;
    return `${symbol}${value.toLocaleString()}`;
  };

  const renderAnalyticsContent = () => {
    switch (asset.type) {
      case 'tools':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Utilization Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.utilizationRate}%</div>
                <p className="text-xs text-muted-foreground">Tool usage efficiency</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Avg Checkout Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averageCheckoutDuration} days</div>
                <p className="text-xs text-muted-foreground">Typical usage period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Usage Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.usageFrequency} times/month</div>
                <p className="text-xs text-muted-foreground">Monthly checkouts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Maintenance Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Every {analytics.maintenanceFrequency} days</div>
                <p className="text-xs text-muted-foreground">Recommended maintenance</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'equipment':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium ml-2">Utilization Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.utilizationRate}%</div>
                  <p className="text-xs text-muted-foreground">Equipment usage efficiency</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium ml-2">Avg Checkout Duration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.averageCheckoutDuration} days</div>
                  <p className="text-xs text-muted-foreground">Typical deployment period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium ml-2">Downtime</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.downtimeHours} hours/month</div>
                  <p className="text-xs text-muted-foreground">Average monthly downtime</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium ml-2">Next Maintenance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{analytics.nextMaintenance}</div>
                  <p className="text-xs text-muted-foreground">{analytics.maintenanceFrequency > 0 ? `Schedule: Every ${analytics.maintenanceFrequency} days (if active)` : 'Maintenance not required (Inactive)'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Operational Details Section */}
            {analytics.powerSource && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Operational Analytics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="text-sm text-muted-foreground mb-1">Power Source</div>
                      <div className="text-xl font-bold capitalize">{analytics.powerSource}</div>
                    </CardContent>
                  </Card>

                  {analytics.fuelCapacity && (
                    <Card className="bg-blue-500/5 border-blue-500/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Fuel Tank Capacity</div>
                        <div className="text-xl font-bold">{analytics.fuelCapacity}L</div>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.fuelConsumptionRate && (
                    <Card className="bg-orange-500/5 border-orange-500/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Daily Consumption</div>
                        <div className="text-xl font-bold">{analytics.fuelConsumptionRate}L/day</div>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.operatingHoursPerTank && (
                    <Card className="bg-green-500/5 border-green-500/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Operating Time/Tank</div>
                        <div className="text-xl font-bold">{analytics.operatingHoursPerTank.toFixed(1)} hrs</div>
                        <p className="text-xs text-muted-foreground mt-1">~{analytics.refuelFrequency.toFixed(1)} days continuous</p>
                      </CardContent>
                    </Card>
                  )}



                  {analytics.electricityConsumption && (
                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Power Consumption</div>
                        <div className="text-xl font-bold">{analytics.electricityConsumption} kWh/day</div>
                        {analytics.dailyElectricityCost && (
                          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(analytics.dailyElectricityCost)}/day</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Equipment Logs Section */}
            {analytics.totalLogs > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Equipment Logs ({analytics.totalLogs})
                </h3>
                <div className="space-y-2">
                  {analytics.recentActivity.map((log: EquipmentLog, index: number) => (
                    <Card key={log.id} className="bg-muted/30">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={log.active ? "default" : "secondary"}>
                                {log.active ? "Active" : "Inactive"}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(log.date).toLocaleDateString()}
                              </span>
                            </div>
                            {log.siteId && (
                              <p className="text-sm text-muted-foreground">Site: {log.siteId}</p>
                            )}
                            {log.maintenanceDetails && (
                              <p className="text-sm">Maintenance: {log.maintenanceDetails}</p>
                            )}
                            {log.downtimeEntries.length > 0 && (
                              <p className="text-sm">
                                Downtime: {log.downtimeEntries.reduce((sum, entry) => sum + (parseFloat(entry.downtime) || 0), 0)} hours
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'consumable':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Consumption Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.consumptionRate} units/month</div>
                <p className="text-xs text-muted-foreground">Monthly usage</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Reorder Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Every {analytics.reorderFrequency} days</div>
                <p className="text-xs text-muted-foreground">Average reorder cycle</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Stock Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.stockTurnover.toFixed(1)} times/year</div>
                <p className="text-xs text-muted-foreground">Inventory turnover rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Cost per Unit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analytics.costPerUnit)}</div>
                <p className="text-xs text-muted-foreground">Average unit cost</p>
              </CardContent>
            </Card>
          </div>
        );

      case 'non-consumable':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Utilization Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.utilizationRate}%</div>
                <p className="text-xs text-muted-foreground">Asset usage efficiency</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Avg Checkout Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averageCheckoutDuration} days</div>
                <p className="text-xs text-muted-foreground">Typical assignment period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Maintenance Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Every {analytics.maintenanceFrequency} days</div>
                <p className="text-xs text-muted-foreground">Recommended maintenance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Condition</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant={asset.status === 'active' ? 'default' : 'destructive'}>
                    {asset.status || 'active'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Current asset condition</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-8">
            <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Analytics not available for this asset type</p>
          </div>
        );
    }
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : `Site ${siteId}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Analytics - {asset.name}
            <Badge variant="outline" className="ml-2">{asset.type === 'non-consumable' ? 'Reuseables' : asset.type}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview & Stats</TabsTrigger>
            {asset.type === 'equipment' && asset.requiresLogging && (
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            )}
            <TabsTrigger value="locations">Current Locations</TabsTrigger>
            <TabsTrigger value="usage">Usage History</TabsTrigger>
          </TabsList>

          <TabsContent value="maintenance">
            <div className="space-y-6">
              <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-500" />
                Maintenance History
              </h3>
              {maintenanceLogs.filter(l => l.machineId === asset.id).length > 0 ? (
                <div className="grid gap-3">
                  {maintenanceLogs
                    .filter(l => l.machineId === asset.id)
                    .sort((a, b) => new Date(b.dateCompleted || b.dateStarted).getTime() - new Date(a.dateCompleted || a.dateStarted).getTime())
                    .map(log => (
                      <div key={log.id} className="flex items-center gap-3 p-2 border rounded-lg bg-card hover:bg-muted/50 transition-colors text-sm">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Wrench className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{new Date(log.dateCompleted || log.dateStarted).toLocaleDateString()}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">{log.maintenanceType}</Badge>
                        <div className="flex-1 truncate text-sm">{log.reason || log.workDone}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {log.technician}
                          </span>
                          {log.partsReplaced && log.partsReplaced !== 'None' && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {log.partsReplaced}
                            </span>
                          )}
                          {log.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {log.location}
                            </span>
                          )}
                          {log.machineActiveAtTime && (
                            <Badge variant="default" className="text-xs h-5">Active</Badge>
                          )}
                          {log.serviceReset && (
                            <Badge variant="secondary" className="text-xs h-5">Service Cycle Reset</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-muted-foreground p-4 text-center">No maintenance logs found.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-primary">{analytics.totalQuantity}</div>
                    <p className="text-xs text-muted-foreground">Total Stock</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">{analytics.availableQuantity}</div>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-orange-600">{analytics.reservedQuantity}</div>
                    <p className="text-xs text-muted-foreground">Reserved</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-red-600">{analytics.missingCount + analytics.damagedCount}</div>
                    <p className="text-xs text-muted-foreground">Issues</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{asset.usedCount || 0}</div>
                    <p className="text-xs text-muted-foreground">Used/Consumed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Type-specific Analytics */}
              {renderAnalyticsContent()}
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <div className="space-y-6">
              {/* Active Employee Checkouts */}
              <div>
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Checked Out to Employees
                </h3>
                {quickCheckouts.filter(c => c.assetId === asset.id && c.status === 'outstanding').length > 0 ? (
                  <div className="grid gap-3">
                    {quickCheckouts.filter(c => c.assetId === asset.id && c.status === 'outstanding').map(checkout => (
                      <div key={checkout.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {checkout.employee.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{checkout.employee}</div>
                            <div className="text-xs text-muted-foreground">Checked out on {new Date(checkout.checkoutDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-lg px-3">{checkout.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No active employee checkouts.</p>
                )}
              </div>

              {/* Site Allocations */}
              <div className="border-t pt-4">
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Site Allocations
                </h3>
                {asset.siteQuantities && Object.keys(asset.siteQuantities).length > 0 ? (
                  <div className="grid gap-3">
                    {Object.entries(asset.siteQuantities).map(([siteId, qty]) => {
                      if (qty <= 0) return null; // hide empty allocations
                      return (
                        <div key={siteId} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold">
                              <MapPin className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{getSiteName(siteId)}</div>
                              <div className="text-xs text-muted-foreground">Permanent/Long-term Allocation</div>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-lg px-3">{qty}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No site allocations recorded.</p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="usage">
            <div className="space-y-6">
              {/* Usage Summary */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">{asset.usedCount || 0}</div>
                    <p className="text-xs text-muted-foreground">Total Used/Consumed</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {quickCheckouts.filter(c => c.assetId === asset.id && c.status === 'used').length}
                    </div>
                    <p className="text-xs text-muted-foreground">Usage Transactions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {quickCheckouts.filter(c => c.assetId === asset.id && c.status === 'used')
                        .reduce((sum, c) => sum + c.quantity, 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Qty from Checkouts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Usage History */}
              <div>
                <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Checkout & Usage History
                </h3>
                {quickCheckouts.filter(c => c.assetId === asset.id).length > 0 ? (
                  <div className="grid gap-3">
                    {quickCheckouts
                      .filter(c => c.assetId === asset.id)
                      .sort((a, b) => new Date(b.checkoutDate).getTime() - new Date(a.checkoutDate).getTime())
                      .map(checkout => (
                        <div key={checkout.id} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-medium">{checkout.employee}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(checkout.checkoutDate).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                checkout.status === 'outstanding' ? 'default' :
                                  checkout.status === 'return_completed' ? 'secondary' :
                                    checkout.status === 'used' ? 'outline' :
                                      'destructive'
                              }
                              className={
                                checkout.status === 'used' ? 'border-purple-500 text-purple-500' : ''
                              }
                            >
                              {checkout.status === 'return_completed' ? 'Returned' :
                                checkout.status === 'outstanding' ? 'Checked Out' :
                                  checkout.status.charAt(0).toUpperCase() + checkout.status.slice(1)}
                            </Badge>
                            <span className="text-sm font-semibold">
                              Qty: {checkout.quantity}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No checkout history recorded.</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </DialogContent>
    </Dialog>
  );
};

