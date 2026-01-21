import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, QuickCheckout, Site } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { MaintenanceLog } from "@/types/maintenance";
import { BarChart, TrendingUp, Clock, AlertTriangle, Package, Wrench, Zap, MapPin, User, Building, CheckCircle2, ArrowLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppData } from "@/contexts/AppDataContext";
import { dataService } from "@/services/dataService";

interface AssetAnalyticsPageProps {
  asset: Asset;
  onBack: () => void;
  quickCheckouts?: QuickCheckout[];
  sites?: Site[];
  maintenanceLogs?: MaintenanceLog[];
}

export const AssetAnalyticsPage = ({ asset, onBack, quickCheckouts = [], sites = [], maintenanceLogs = [] }: AssetAnalyticsPageProps) => {
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
  }, [asset, equipmentLogs, quickCheckouts, companySettings]);

  const loadEquipmentLogs = async (assetId: string) => {
    try {
      const logs = await dataService.equipmentLogs.getEquipmentLogs();
      const assetLogs = logs.filter((log: EquipmentLog) => String(log.equipmentId) === String(assetId));
      setEquipmentLogs(assetLogs);
    } catch (error) {
      logger.error('Failed to load equipment logs', error);
      setEquipmentLogs([]);
    }
  };

  const calculateAnalytics = (asset: Asset, logs: EquipmentLog[], checkouts: QuickCheckout[]) => {
    const assetCheckouts = checkouts.filter(c => String(c.assetId) === String(asset.id));

    const utilizationRate = asset.quantity > 0
      ? Math.round((asset.reservedQuantity || 0) / asset.quantity * 100)
      : 0;

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
      averageCheckoutDuration: 0,
      usageFrequency: usageFrequency,
      maintenanceFrequency: 0,
      reorderFrequency: 0,
      stockTurnover: 0,
      lastMaintenance: null as string | null,
      nextMaintenance: null as string | null,
      totalLogs: logs.length,
      recentActivity: logs.slice(0, 5),
    };

    if (logs.length > 0) {
      const maintenanceLogs = logs.filter(log => log.maintenanceDetails);
      if (maintenanceLogs.length > 0) {
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
        }
        baseAnalytics.lastMaintenance = new Date(maintenanceLogs[maintenanceLogs.length - 1].date).toLocaleDateString();
      }
    }

    switch (asset.type) {
      case 'tools':
        return {
          ...baseAnalytics,
          averageCheckoutDuration: baseAnalytics.averageCheckoutDuration || 1,
          maintenanceFrequency: baseAnalytics.maintenanceFrequency || 30,
        };

      case 'equipment':
        let maintFreq = 0;
        let nextMaint: string = "Not Required (Inactive)";
        const configuredFreq = (companySettings as any)?.maintenanceFrequency || 60;

        if (utilizationRate > 0) {
          maintFreq = configuredFreq;
          if (baseAnalytics.lastMaintenance) {
            const lastDate = new Date(baseAnalytics.lastMaintenance);
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + configuredFreq);
            nextMaint = nextDate.toLocaleDateString();
          } else {
            nextMaint = "Due Now (Active but no log)";
          }
        }

        return {
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

      case 'consumable':
        const usedInLast30Days = assetCheckouts
          .filter(c => c.status === 'used' && new Date(c.checkoutDate) >= thirtyDaysAgo)
          .reduce((sum, c) => sum + c.quantity, 0);

        return {
          ...baseAnalytics,
          consumptionRate: usedInLast30Days,
          reorderFrequency: 14,
          stockTurnover: usedInLast30Days > 0 ? (asset.quantity / usedInLast30Days) * 12 : 0,
          costPerUnit: 0,
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

  const getSiteName = (siteId: string) => {
    const site = sites.find(s => String(s.id) === String(siteId));
    return site?.name || `Site ${siteId}`;
  };

  const formatCurrency = (val: number | undefined | null) => {
    const symbol = (companySettings as any)?.currencySymbol || '₦';
    const value = typeof val === 'number' ? val : 0;
    return `${symbol}${value.toLocaleString()}`;
  };

  if (!asset || !analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading analytics...</p>
      </div>
    );
  }

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
                  <p className="text-xs text-muted-foreground">
                    {analytics.maintenanceFrequency > 0 ? `Schedule: Every ${analytics.maintenanceFrequency} days (if active)` : 'Maintenance not required (Inactive)'}
                  </p>
                </CardContent>
              </Card>
            </div>
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
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Stock Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.stockTurnover.toFixed(1)}x/year</div>
                <p className="text-xs text-muted-foreground">Annual inventory cycles</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Reorder Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Every {analytics.reorderFrequency} days</div>
                <p className="text-xs text-muted-foreground">Estimated restock cycle</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Current Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.availableQuantity} / {analytics.totalQuantity}</div>
                <p className="text-xs text-muted-foreground">Available / Total</p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <BarChart className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Utilization Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.utilizationRate}%</div>
                <p className="text-xs text-muted-foreground">Current usage efficiency</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium ml-2">Usage Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.usageFrequency} times/month</div>
                <p className="text-xs text-muted-foreground">Monthly activity</p>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
              <BarChart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{asset.name} Analytics</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize">{asset.type}</Badge>
                <span className="text-sm text-muted-foreground">
                  Stock: {analytics.availableQuantity} / {analytics.totalQuantity}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="usage">Usage History</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              {renderAnalyticsContent()}
            </TabsContent>

            <TabsContent value="allocation" className="mt-6">
              <div className="space-y-6">
                {/* Inventory Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">{analytics.availableQuantity}</div>
                      <p className="text-xs text-muted-foreground">Available</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{analytics.reservedQuantity}</div>
                      <p className="text-xs text-muted-foreground">Reserved</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-orange-600">{analytics.damagedCount}</div>
                      <p className="text-xs text-muted-foreground">Damaged</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-red-600">{analytics.missingCount}</div>
                      <p className="text-xs text-muted-foreground">Missing</p>
                    </CardContent>
                  </Card>
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
                        if ((qty as number) <= 0) return null;
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
                            <Badge variant="secondary" className="text-lg px-3">{qty as number}</Badge>
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

            <TabsContent value="usage" className="mt-6">
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
                        {quickCheckouts.filter(c => String(c.assetId) === String(asset.id) && c.status === 'used').length}
                      </div>
                      <p className="text-xs text-muted-foreground">Usage Transactions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {quickCheckouts.filter(c => String(c.assetId) === String(asset.id) && c.status === 'used')
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
                  {quickCheckouts.filter(c => String(c.assetId) === String(asset.id)).length > 0 ? (
                    <div className="grid gap-3">
                      {quickCheckouts
                        .filter(c => String(c.assetId) === String(asset.id))
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
        </div>
      </div>
    </div>
  );
};

export default AssetAnalyticsPage;
