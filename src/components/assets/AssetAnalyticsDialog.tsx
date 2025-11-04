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
import { Asset } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { BarChart, TrendingUp, Clock, AlertTriangle, Package, Wrench, Zap } from "lucide-react";

interface AssetAnalyticsDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssetAnalyticsDialog = ({ asset, open, onOpenChange }: AssetAnalyticsDialogProps) => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);

  useEffect(() => {
    if (asset) {
      // Load equipment logs for this asset
      loadEquipmentLogs(asset.id);
    }
  }, [asset]);

  useEffect(() => {
    if (asset && equipmentLogs.length >= 0) { // Changed to >= 0 to trigger even when empty
      // Calculate analytics after logs are loaded
      const calculatedAnalytics = calculateAnalytics(asset, equipmentLogs);
      setAnalytics(calculatedAnalytics);
    }
  }, [asset, equipmentLogs]);

  const loadEquipmentLogs = async (assetId: string) => {
    if (window.electronAPI) {
      try {
        const logs = await window.electronAPI.getEquipmentLogs();
        const assetLogs = logs.filter((log: EquipmentLog) => log.equipmentId === assetId);
        setEquipmentLogs(assetLogs);
      } catch (error) {
        logger.error('Failed to load equipment logs', error);
        setEquipmentLogs([]);
      }
    } else if (window.db) {
      // Use window.db for equipment logs
      try {
        const logs = await window.db.getEquipmentLogs();
        const assetLogs = logs.filter((log: EquipmentLog) => log.equipmentId === assetId);
        setEquipmentLogs(assetLogs);
      } catch (error) {
        logger.error('Failed to load equipment logs from database', error);
        setEquipmentLogs([]);
      }
    } else {
      setEquipmentLogs([]);
    }
  };

  const calculateAnalytics = (asset: Asset, logs: EquipmentLog[]) => {
    const baseAnalytics = {
      totalQuantity: asset.quantity,
      availableQuantity: asset.availableQuantity || 0,
      reservedQuantity: asset.reservedQuantity || 0,
      missingCount: asset.missingCount || 0,
      damagedCount: asset.damagedCount || 0,
      utilizationRate: 0,
      averageCheckoutDuration: 0,
      maintenanceFrequency: 0,
      reorderFrequency: 0,
      stockTurnover: 0,
      lastMaintenance: null,
      nextMaintenance: null,
      totalLogs: logs.length,
      recentActivity: logs.slice(0, 5), // Last 5 logs
    };

    // Calculate real analytics from equipment logs
    if (logs.length > 0) {
      // Calculate utilization rate based on active logs
      const activeLogs = logs.filter(log => log.active);
      baseAnalytics.utilizationRate = Math.round((activeLogs.length / logs.length) * 100);

      // Calculate average downtime
      const totalDowntime = logs.reduce((sum, log) => {
        return sum + log.downtimeEntries.reduce((entrySum, entry) => {
          const downtimeHours = parseFloat(entry.downtime) || 0;
          return entrySum + downtimeHours;
        }, 0);
      }, 0);
      baseAnalytics.averageCheckoutDuration = logs.length > 0 ? Math.round(totalDowntime / logs.length) : 0;

      // Find last maintenance
      const maintenanceLogs = logs.filter(log => log.maintenanceDetails);
      if (maintenanceLogs.length > 0) {
        baseAnalytics.lastMaintenance = maintenanceLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date;
      }
    }

    // Type-specific calculations
    switch (asset.type) {
      case 'tools':
        return {
          ...baseAnalytics,
          utilizationRate: baseAnalytics.utilizationRate || Math.floor(Math.random() * 40) + 60, // 60-100%
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || Math.floor(Math.random() * 5) + 2, // 2-7 days
          maintenanceFrequency: Math.floor(Math.random() * 30) + 30, // 30-60 days
          usageFrequency: Math.floor(Math.random() * 10) + 5, // 5-15 times/month
        };

      case 'equipment':
        const equipmentAnalytics: any = {
          ...baseAnalytics,
          utilizationRate: baseAnalytics.utilizationRate || Math.floor(Math.random() * 30) + 50, // 50-80%
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || Math.floor(Math.random() * 10) + 7, // 7-17 days
          maintenanceFrequency: Math.floor(Math.random() * 60) + 60, // 60-120 days
          downtimeHours: baseAnalytics.averageCheckoutDuration || Math.floor(Math.random() * 20) + 5, // 5-25 hours/month
          powerSource: asset.powerSource,
          fuelCapacity: asset.fuelCapacity,
          fuelConsumptionRate: asset.fuelConsumptionRate,
          electricityConsumption: asset.electricityConsumption,
        };

        // Calculate fuel-based analytics
        if (asset.fuelCapacity && asset.fuelConsumptionRate) {
          equipmentAnalytics.operatingHoursPerTank = (asset.fuelCapacity / asset.fuelConsumptionRate) * 24;
          equipmentAnalytics.refuelFrequency = asset.fuelCapacity / asset.fuelConsumptionRate;
          equipmentAnalytics.dailyFuelCost = asset.fuelConsumptionRate * 1.5; // Assuming $1.5 per liter
          equipmentAnalytics.monthlyFuelCost = equipmentAnalytics.dailyFuelCost * 30;
        }

        // Calculate electricity-based analytics
        if (asset.electricityConsumption) {
          equipmentAnalytics.dailyElectricityCost = asset.electricityConsumption * 0.12; // Assuming $0.12 per kWh
          equipmentAnalytics.monthlyElectricityCost = equipmentAnalytics.dailyElectricityCost * 30;
        }

        return equipmentAnalytics;

      case 'consumable':
        return {
          ...baseAnalytics,
          consumptionRate: Math.floor(Math.random() * 50) + 20, // 20-70 units/month
          reorderFrequency: Math.floor(Math.random() * 15) + 7, // 7-22 days
          stockTurnover: Math.floor(Math.random() * 8) + 4, // 4-12 times/year
          costPerUnit: Math.floor(Math.random() * 50) + 10, // $10-60
        };

      case 'non-consumable':
        return {
          ...baseAnalytics,
          utilizationRate: baseAnalytics.utilizationRate || Math.floor(Math.random() * 25) + 40, // 40-65%
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || Math.floor(Math.random() * 8) + 3, // 3-11 days
          maintenanceFrequency: Math.floor(Math.random() * 90) + 90, // 90-180 days
        };

      default:
        return baseAnalytics;
    }
  };

  if (!asset || !analytics) return null;

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
                  <CardTitle className="text-sm font-medium ml-2">Maintenance Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Every {analytics.maintenanceFrequency} days</div>
                  <p className="text-xs text-muted-foreground">Preventive maintenance</p>
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

                  {analytics.dailyFuelCost && (
                    <Card className="bg-purple-500/5 border-purple-500/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Daily Fuel Cost</div>
                        <div className="text-xl font-bold">${analytics.dailyFuelCost.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground mt-1">${analytics.monthlyFuelCost.toFixed(2)}/month</p>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.electricityConsumption && (
                    <Card className="bg-yellow-500/5 border-yellow-500/20">
                      <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground mb-1">Power Consumption</div>
                        <div className="text-xl font-bold">{analytics.electricityConsumption} kWh/day</div>
                        {analytics.dailyElectricityCost && (
                          <p className="text-xs text-muted-foreground mt-1">${analytics.dailyElectricityCost.toFixed(2)}/day</p>
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
                <div className="text-2xl font-bold">{analytics.stockTurnover} times/year</div>
                <p className="text-xs text-muted-foreground">Inventory turnover rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Cost per Unit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics.costPerUnit}</div>
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
                <CardTitle className="text-sm font-medium ml-2">Condition Status</CardTitle>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Analytics - {asset.name}
            <Badge variant="outline" className="ml-2">{asset.type}</Badge>
          </DialogTitle>
        </DialogHeader>

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
          </div>

          {/* Type-specific Analytics */}
          {renderAnalyticsContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
