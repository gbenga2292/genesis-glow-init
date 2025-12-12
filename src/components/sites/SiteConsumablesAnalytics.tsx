import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Site, Asset } from "@/types/asset";
import { ConsumableUsageLog } from "@/types/consumable";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Package, DollarSign, Calendar } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface SiteConsumablesAnalyticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site;
  assets: Asset[];
  consumableLogs: ConsumableUsageLog[];
}

export const SiteConsumablesAnalytics = ({
  open,
  onOpenChange,
  site,
  assets,
  consumableLogs
}: SiteConsumablesAnalyticsProps) => {
  // Filter consumables at this site
  const siteConsumables = assets.filter(asset =>
    asset.type === 'consumable' &&
    asset.siteQuantities &&
    asset.siteQuantities[site.id] > 0
  );

  // Filter logs for this site
  const siteLogs = consumableLogs.filter(log => log.siteId === site.id);

  // Usage trends over last 30 days
  const getLast30DaysData = () => {
    const days = eachDayOfInterval({
      start: startOfDay(subDays(new Date(), 29)),
      end: startOfDay(new Date())
    });

    return days.map(day => {
      const dayStr = format(day, 'MMM dd');
      const dayLogs = siteLogs.filter(log =>
        format(new Date(log.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      const totalUsed = dayLogs.reduce((sum, log) => sum + log.quantityUsed, 0);
      return { date: dayStr, usage: totalUsed, count: dayLogs.length };
    });
  };

  // Top consumed items
  const getTopConsumables = () => {
    const consumableUsage = siteConsumables.map(consumable => {
      const logs = siteLogs.filter(log => log.consumableId === consumable.id);
      const totalUsed = logs.reduce((sum, log) => sum + log.quantityUsed, 0);
      const currentQty = consumable.siteQuantities![site.id];

      return {
        name: consumable.name,
        used: totalUsed,
        remaining: currentQty,
        unit: consumable.unitOfMeasurement,
        usageCount: logs.length,
        cost: consumable.cost || 0
      };
    }).sort((a, b) => b.used - a.used);

    return consumableUsage;
  };

  // Stock levels distribution
  const getStockDistribution = () => {
    let lowStock = 0;
    let mediumStock = 0;
    let goodStock = 0;

    siteConsumables.forEach(consumable => {
      const qty = consumable.siteQuantities![site.id];
      const criticalLevel = consumable.criticalStockLevel || 5;
      const lowLevel = consumable.lowStockLevel || 10;

      if (qty <= criticalLevel) lowStock++;
      else if (qty <= lowLevel) mediumStock++;
      else goodStock++;
    });

    return [
      { name: 'Critical Stock', value: lowStock, color: '#ef4444' },
      { name: 'Low Stock', value: mediumStock, color: '#f59e0b' },
      { name: 'Good Stock', value: goodStock, color: '#10b981' }
    ];
  };

  // Calculate cost analysis
  const getCostAnalysis = () => {
    const totalCost = siteLogs.reduce((sum, log) => {
      const consumable = assets.find(a => a.id === log.consumableId);
      const unitCost = consumable?.cost || 0;
      return sum + (log.quantityUsed * unitCost);
    }, 0);

    const last7Days = siteLogs.filter(log =>
      new Date(log.date) >= subDays(new Date(), 7)
    ).reduce((sum, log) => {
      const consumable = assets.find(a => a.id === log.consumableId);
      const unitCost = consumable?.cost || 0;
      return sum + (log.quantityUsed * unitCost);
    }, 0);

    return { totalCost, last7DaysCost: last7Days };
  };

  // Get operational insights
  const getInsights = () => {
    const insights = [];
    const topConsumables = getTopConsumables();
    const stockDist = getStockDistribution();
    const { totalCost, last7DaysCost } = getCostAnalysis();

    // Critical stock alert
    if (stockDist[0].value > 0) {
      insights.push({
        type: 'critical',
        icon: AlertTriangle,
        title: 'Critical Stock Alert',
        description: `${stockDist[0].value} consumable(s) are at critical stock levels and need immediate restocking.`,
        color: 'text-destructive'
      });
    }

    // High usage item
    if (topConsumables.length > 0 && topConsumables[0].used > 0) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        title: 'Highest Consumption',
        description: `${topConsumables[0].name} is your most consumed item with ${topConsumables[0].used} ${topConsumables[0].unit} used.`,
        color: 'text-primary'
      });
    }

    // Cost insight
    if (last7DaysCost > 0) {
      const projectedMonthlyCost = (last7DaysCost / 7) * 30;
      insights.push({
        type: 'info',
        icon: DollarSign,
        title: 'Cost Projection',
        description: `Based on last 7 days usage, projected monthly consumables cost: NGN ${projectedMonthlyCost.toFixed(2)}`,
        color: 'text-blue-600'
      });
    }

    // Usage frequency
    const recentUsage = siteLogs.filter(log =>
      new Date(log.date) >= subDays(new Date(), 7)
    ).length;

    if (recentUsage > 0) {
      insights.push({
        type: 'info',
        icon: Calendar,
        title: 'Usage Frequency',
        description: `${recentUsage} consumable usage entries logged in the last 7 days.`,
        color: 'text-green-600'
      });
    }

    // Efficiency recommendation
    if (topConsumables.length >= 3) {
      const top3Usage = topConsumables.slice(0, 3).reduce((sum, c) => sum + c.used, 0);
      const totalUsage = topConsumables.reduce((sum, c) => sum + c.used, 0);
      const percentage = totalUsage > 0 ? (top3Usage / totalUsage * 100) : 0;

      if (percentage > 80) {
        insights.push({
          type: 'recommendation',
          icon: Package,
          title: 'Inventory Optimization',
          description: `Top 3 items account for ${percentage.toFixed(0)}% of usage. Consider bulk ordering these items for cost savings.`,
          color: 'text-purple-600'
        });
      }
    }

    return insights;
  };

  const trendData = getLast30DaysData();
  const topConsumables = getTopConsumables();
  const stockDistribution = getStockDistribution();
  const insights = getInsights();
  const { totalCost } = getCostAnalysis();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Site Consumables Analytics - {site.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Consumables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{siteConsumables.length}</div>
                  <p className="text-xs text-muted-foreground">Items at this site</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Usage Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{siteLogs.length}</div>
                  <p className="text-xs text-muted-foreground">All time entries</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Estimated Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Total consumption cost</p>
                </CardContent>
              </Card>
            </div>

            {/* Stock Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Level Distribution</CardTitle>
                <CardDescription>Current inventory status across all consumables</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stockDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stockDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Consumables */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Most Used Consumables</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topConsumables.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="used" fill="hsl(var(--primary))" name="Quantity Used" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trend - Last 30 Days</CardTitle>
                <CardDescription>Daily consumption patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="usage" stroke="hsl(var(--primary))" name="Total Usage" strokeWidth={2} />
                    <Line type="monotone" dataKey="count" stroke="hsl(var(--chart-2))" name="Log Entries" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consumable-Specific Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topConsumables.slice(0, 5).map((consumable) => {
                    const logs = siteLogs.filter(log => log.consumableName === consumable.name);
                    const last7Days = logs.filter(log =>
                      new Date(log.date) >= subDays(new Date(), 7)
                    ).length;
                    const previous7Days = logs.filter(log => {
                      const logDate = new Date(log.date);
                      return logDate >= subDays(new Date(), 14) && logDate < subDays(new Date(), 7);
                    }).length;

                    const trend = last7Days > previous7Days ? 'up' : 'down';
                    const change = previous7Days > 0
                      ? Math.abs(((last7Days - previous7Days) / previous7Days) * 100).toFixed(0)
                      : 0;

                    return (
                      <div key={consumable.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{consumable.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {consumable.used} {consumable.unit} total • {consumable.usageCount} uses
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {trend === 'up' ? (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{change}%
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              -{change}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Consumable</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topConsumables.map((consumable) => {
                    const totalCost = consumable.used * consumable.cost;
                    return (
                      <div key={consumable.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{consumable.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {consumable.used} {consumable.unit} × ${consumable.cost.toFixed(2)}/{consumable.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">${totalCost.toFixed(2)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  No insights available yet. Start logging consumable usage to see operational recommendations.
                </CardContent>
              </Card>
            ) : (
              insights.map((insight, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <insight.icon className={`h-5 w-5 ${insight.color}`} />
                      {insight.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{insight.description}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};