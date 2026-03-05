import { useState, useEffect, useMemo } from "react";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Asset, QuickCheckout, Site, Waybill } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { MaintenanceLog } from "@/types/maintenance";
import {
  BarChart as BarChartIcon, TrendingUp, Clock, AlertTriangle, Package, Wrench, Zap, MapPin, User, Building,
  CheckCircle2, ArrowLeft, FileText, Calendar as CalendarIcon, Filter, Fuel, Activity
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAppData } from "@/contexts/AppDataContext";
import { dataService } from "@/services/dataService";
import { format, subDays, eachDayOfInterval, startOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";

interface AssetAnalyticsPageProps {
  asset: Asset;
  onBack: () => void;
  quickCheckouts?: QuickCheckout[];
  sites?: Site[];
  maintenanceLogs?: MaintenanceLog[];
  waybills?: Waybill[];
}

export const AssetAnalyticsPage = ({ asset, onBack, quickCheckouts = [], sites = [], maintenanceLogs = [], waybills = [] }: AssetAnalyticsPageProps) => {
  const isMobile = useIsMobile();
  const { companySettings } = useAppData();
  const [analytics, setAnalytics] = useState<any>(null);
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [datePickerOpen, setDatePickerOpen] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    if (asset) {
      loadEquipmentLogs(asset.id);
    }
  }, [asset]);

  useEffect(() => {
    if (asset) {
      const calculatedAnalytics = calculateAnalytics(asset, filteredLogs, quickCheckouts);
      setAnalytics(calculatedAnalytics);
    }
  }, [asset, equipmentLogs, quickCheckouts, companySettings, selectedSiteId, dateRange]);

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

  // Sites this equipment has been on (derived from logs)
  const equipmentSites = useMemo(() => {
    const siteIds = new Set<string>();
    equipmentLogs.forEach(log => siteIds.add(String(log.siteId)));
    return sites.filter(s => siteIds.has(String(s.id)));
  }, [equipmentLogs, sites]);

  // Filtered logs based on site and date range
  const filteredLogs = useMemo(() => {
    return equipmentLogs.filter(log => {
      const logDate = new Date(log.date);
      const inDateRange = logDate >= startOfDay(dateRange.from) && logDate <= dateRange.to;
      const inSite = selectedSiteId === 'all' || String(log.siteId) === selectedSiteId;
      return inDateRange && inSite;
    });
  }, [equipmentLogs, selectedSiteId, dateRange]);

  // Site history timeline
  const siteHistory = useMemo(() => {
    const history: { siteId: string; siteName: string; firstLog: Date; lastLog: Date; totalDays: number; totalFuel: number; activeDays: number }[] = [];
    const siteMap = new Map<string, { logs: EquipmentLog[] }>();

    equipmentLogs.forEach(log => {
      const sid = String(log.siteId);
      if (!siteMap.has(sid)) siteMap.set(sid, { logs: [] });
      siteMap.get(sid)!.logs.push(log);
    });

    siteMap.forEach((data, siteId) => {
      const sortedLogs = data.logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const siteName = sites.find(s => String(s.id) === siteId)?.name || `Site ${siteId}`;
      history.push({
        siteId,
        siteName,
        firstLog: new Date(sortedLogs[0].date),
        lastLog: new Date(sortedLogs[sortedLogs.length - 1].date),
        totalDays: sortedLogs.length,
        totalFuel: sortedLogs.reduce((sum, l) => sum + (l.dieselEntered || 0), 0),
        activeDays: sortedLogs.filter(l => l.active).length
      });
    });

    return history.sort((a, b) => b.lastLog.getTime() - a.lastLog.getTime());
  }, [equipmentLogs, sites]);

  // Trend data for charts
  const trendData = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfDay(dateRange.from), end: startOfDay(dateRange.to) });
    return days.map(day => {
      const dayLogs = filteredLogs.filter(log =>
        format(new Date(log.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      const fuel = dayLogs.reduce((sum, l) => sum + (l.dieselEntered || 0), 0);
      const active = dayLogs.some(l => l.active);
      let downtimeHrs = 0;
      dayLogs.forEach(l => {
        (l.downtimeEntries || []).forEach((entry: any) => {
          if (entry.downtime && entry.uptime) {
            try {
              const dp = entry.downtime.split(':').map(Number);
              const up = entry.uptime.split(':').map(Number);
              const diff = (up[0] * 60 + up[1]) - (dp[0] * 60 + dp[1]);
              if (diff > 0) downtimeHrs += diff / 60;
            } catch { }
          }
        });
      });
      return {
        date: format(day, isMobile ? 'dd' : 'MMM dd'),
        fuel: Math.round(fuel * 100) / 100,
        downtime: Math.round(downtimeHrs * 100) / 100,
        active: active ? 1 : 0
      };
    });
  }, [filteredLogs, dateRange, isMobile]);

  // Downtime reason breakdown
  const downtimeReasons = useMemo(() => {
    const reasons: Record<string, { count: number; hours: number }> = {};
    filteredLogs.forEach(log => {
      (log.downtimeEntries || []).forEach((entry: any) => {
        const reason = entry.downtimeReason || 'Unknown';
        if (!reasons[reason]) reasons[reason] = { count: 0, hours: 0 };
        reasons[reason].count++;
        if (entry.downtime && entry.uptime) {
          try {
            const dp = entry.downtime.split(':').map(Number);
            const up = entry.uptime.split(':').map(Number);
            const diff = (up[0] * 60 + up[1]) - (dp[0] * 60 + dp[1]);
            if (diff > 0) reasons[reason].hours += diff / 60;
          } catch { }
        }
      });
    });
    return Object.entries(reasons)
      .map(([reason, data]) => ({ reason, ...data, hours: Math.round(data.hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours);
  }, [filteredLogs]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'];

  const calculateAnalytics = (asset: Asset, logs: EquipmentLog[], checkouts: QuickCheckout[]) => {
    const assetCheckouts = checkouts.filter(c => String(c.assetId) === String(asset.id));
    const utilizationRate = asset.quantity > 0 ? Math.round((asset.reservedQuantity || 0) / asset.quantity * 100) : 0;
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentCheckouts = assetCheckouts.filter(c => new Date(c.checkoutDate) >= thirtyDaysAgo);

    const totalFuel = logs.reduce((sum, l) => sum + (l.dieselEntered || 0), 0);
    const activeDays = logs.filter(l => l.active).length;
    const totalLoggedDays = logs.length;
    const efficiency = totalLoggedDays > 0 ? (activeDays / totalLoggedDays) * 100 : 0;

    let totalDowntimeHrs = 0;
    logs.forEach(l => {
      (l.downtimeEntries || []).forEach((entry: any) => {
        if (entry.downtime && entry.uptime) {
          try {
            const dp = entry.downtime.split(':').map(Number);
            const up = entry.uptime.split(':').map(Number);
            const diff = (up[0] * 60 + up[1]) - (dp[0] * 60 + dp[1]);
            if (diff > 0) totalDowntimeHrs += diff / 60;
          } catch { }
        }
      });
    });

    const configuredFreq = (companySettings as any)?.maintenanceFrequency || 60;
    let nextMaint = "Not Required (Inactive)";
    if (utilizationRate > 0) {
      const maintenanceLogs = logs.filter(log => log.maintenanceDetails);
      if (maintenanceLogs.length > 0) {
        const lastDate = new Date(maintenanceLogs[maintenanceLogs.length - 1].date);
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + configuredFreq);
        nextMaint = nextDate.toLocaleDateString();
      } else {
        nextMaint = "Due Now (Active but no log)";
      }
    }

    return {
      totalQuantity: asset.quantity,
      availableQuantity: asset.availableQuantity || 0,
      reservedQuantity: asset.reservedQuantity || 0,
      missingCount: asset.missingCount || 0,
      damagedCount: asset.damagedCount || 0,
      utilizationRate,
      usageFrequency: recentCheckouts.length,
      totalLogs: logs.length,
      totalFuel,
      activeDays,
      totalLoggedDays,
      efficiency,
      totalDowntimeHrs,
      nextMaintenance: nextMaint,
      maintenanceFrequency: utilizationRate > 0 ? configuredFreq : 0,
      powerSource: asset.powerSource,
      fuelCapacity: asset.fuelCapacity,
      fuelConsumptionRate: asset.fuelConsumptionRate,
      electricityConsumption: asset.electricityConsumption,
    };
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

  const isEquipment = asset.type === 'equipment';

  const presetRanges = [
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '90 Days', days: 90 },
    { label: 'All Time', days: 0 },
  ];

  const handlePresetRange = (days: number) => {
    if (days === 0) {
      // All time - use earliest log date
      const earliest = equipmentLogs.length > 0
        ? new Date(Math.min(...equipmentLogs.map(l => new Date(l.date).getTime())))
        : subDays(new Date(), 365);
      setDateRange({ from: earliest, to: new Date() });
    } else {
      setDateRange({ from: subDays(new Date(), days), to: new Date() });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6 border-b sticky top-0 bg-background z-10">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
              <BarChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-2xl font-bold tracking-tight truncate">{asset.name} Analytics</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="capitalize text-xs">{asset.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {analytics.availableQuantity} / {analytics.totalQuantity} available
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      {isEquipment && equipmentSites.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-6 py-2 border-b bg-muted/30">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          {/* Site filter */}
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-8 text-xs">
              <MapPin className="h-3 w-3 mr-1 shrink-0" />
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              {equipmentSites.map(site => (
                <SelectItem key={String(site.id)} value={String(site.id)}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <Popover open={datePickerOpen === 'from'} onOpenChange={(open) => setDatePickerOpen(open ? 'from' : null)}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2">
                  <CalendarIcon className="h-3 w-3" />
                  {format(dateRange.from, 'MMM dd')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.from}
                  onSelect={(date) => { if (date) { setDateRange(prev => ({ ...prev, from: date })); setDatePickerOpen(null); } }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">to</span>
            <Popover open={datePickerOpen === 'to'} onOpenChange={(open) => setDatePickerOpen(open ? 'to' : null)}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-2">
                  <CalendarIcon className="h-3 w-3" />
                  {format(dateRange.to, 'MMM dd')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateRange.to}
                  onSelect={(date) => { if (date) { setDateRange(prev => ({ ...prev, to: date })); setDatePickerOpen(null); } }}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Preset buttons */}
          <div className="flex gap-1">
            {presetRanges.map(preset => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => handlePresetRange(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            {isMobile ? (
              <Select defaultValue="overview">
                <SelectTrigger className="w-full mb-4">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  {isEquipment && <SelectItem value="trends">Trends</SelectItem>}
                  {isEquipment && <SelectItem value="site-history">Site History</SelectItem>}
                  <SelectItem value="allocation">Allocation</SelectItem>
                  <SelectItem value="usage">Usage History</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <TabsList className={cn("grid w-full", isEquipment ? "grid-cols-5" : "grid-cols-3")}>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                {isEquipment && <TabsTrigger value="trends">Trends</TabsTrigger>}
                {isEquipment && <TabsTrigger value="site-history">Site History</TabsTrigger>}
                <TabsTrigger value="allocation">Allocation</TabsTrigger>
                <TabsTrigger value="usage">Usage History</TabsTrigger>
              </TabsList>
            )}

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-4 sm:mt-6">
              {isEquipment ? (
                <div className="space-y-4">
                  {/* Summary stat cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Active Days</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">{analytics.activeDays}</div>
                        <p className="text-xs text-muted-foreground">of {analytics.totalLoggedDays} logged</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Efficiency</span>
                        </div>
                        <div className={cn("text-xl sm:text-2xl font-bold",
                          analytics.efficiency >= 80 ? "text-green-600" :
                          analytics.efficiency >= 60 ? "text-yellow-600" : "text-destructive"
                        )}>
                          {analytics.efficiency.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Active days ratio</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Fuel className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Total Fuel</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">{analytics.totalFuel.toFixed(1)} L</div>
                        <p className="text-xs text-muted-foreground">In date range</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Downtime</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">{analytics.totalDowntimeHrs.toFixed(1)} hrs</div>
                        <p className="text-xs text-muted-foreground">Total downtime</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Equipment specs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Utilization</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">{analytics.utilizationRate}%</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Next Maintenance</span>
                        </div>
                        <div className="text-sm font-bold">{analytics.nextMaintenance}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Sites Deployed</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">{equipmentSites.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Total Logs</span>
                        </div>
                        <div className="text-xl sm:text-2xl font-bold">{analytics.totalLogs}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Downtime Reasons Breakdown */}
                  {downtimeReasons.length > 0 && (
                    <Card>
                      <CardHeader className="p-3 sm:p-6 pb-2">
                        <CardTitle className="text-sm sm:text-base">Downtime Breakdown</CardTitle>
                        <CardDescription className="text-xs">Reasons for downtime in selected period</CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                              <Pie
                                data={downtimeReasons}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={2}
                                dataKey="hours"
                                nameKey="reason"
                              >
                                {downtimeReasons.map((_, i) => (
                                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(val: number) => `${val} hrs`} />
                              <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="space-y-2">
                            {downtimeReasons.map((item, i) => (
                              <div key={item.reason} className="flex items-center justify-between p-2 rounded-lg border">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                  <span className="text-xs sm:text-sm font-medium truncate">{item.reason}</span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-xs sm:text-sm font-bold">{item.hours} hrs</span>
                                  <span className="text-xs text-muted-foreground ml-1">({item.count}x)</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                /* Non-equipment overview (tools, consumables, etc.) */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                      <BarChartIcon className="h-4 w-4 text-muted-foreground" />
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
              )}
            </TabsContent>

            {/* TRENDS TAB (Equipment only) */}
            {isEquipment && (
              <TabsContent value="trends" className="mt-4 sm:mt-6 space-y-4">
                {/* Fuel Usage Trend */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Fuel className="h-4 w-4" />
                      Fuel Usage Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    {trendData.some(d => d.fuel > 0) ? (
                      <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="fuel" stroke="hsl(var(--primary))" fill="url(#fuelGrad)" name="Fuel (L)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                        No fuel data in selected range
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Downtime Trend */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Downtime Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    {trendData.some(d => d.downtime > 0) ? (
                      <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                        <BarChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="downtime" fill="hsl(var(--destructive))" name="Downtime (hrs)" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                        No downtime data in selected range
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Active/Inactive Status */}
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Daily Activity Status
                    </CardTitle>
                    <CardDescription className="text-xs">Green = Active, gaps = No log</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <ResponsiveContainer width="100%" height={isMobile ? 100 : 120}>
                      <BarChart data={trendData}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <Tooltip formatter={(val: number) => val === 1 ? 'Active' : 'Inactive'} />
                        <Bar dataKey="active" fill="#10b981" name="Status" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* SITE HISTORY TAB (Equipment only) */}
            {isEquipment && (
              <TabsContent value="site-history" className="mt-4 sm:mt-6 space-y-4">
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2">
                    <CardTitle className="text-sm sm:text-base">Deployment History</CardTitle>
                    <CardDescription className="text-xs">Sites this equipment has been deployed to, with log summaries</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-2">
                    {siteHistory.length > 0 ? (
                      <div className="space-y-3">
                        {siteHistory.map((entry, i) => {
                          const efficiency = entry.totalDays > 0 ? (entry.activeDays / entry.totalDays * 100).toFixed(0) : '0';
                          const isCurrentSite = asset.siteQuantities && (
                            (asset.siteQuantities[entry.siteId] as number) > 0
                          );
                          return (
                            <div key={entry.siteId} className="relative">
                              {/* Timeline connector */}
                              {i < siteHistory.length - 1 && (
                                <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
                              )}
                              <div className="flex gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                                  isCurrentSite ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}>
                                  <MapPin className="h-4 w-4" />
                                </div>
                                <div className="flex-1 border rounded-lg p-3 bg-card">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-sm">{entry.siteName}</span>
                                      {isCurrentSite && <Badge variant="default" className="text-xs">Current</Badge>}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs h-7"
                                      onClick={() => setSelectedSiteId(entry.siteId)}
                                    >
                                      View Analytics
                                    </Button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div>
                                      <span className="text-muted-foreground">Period</span>
                                      <p className="font-medium">{format(entry.firstLog, 'MMM dd, yyyy')} → {format(entry.lastLog, 'MMM dd, yyyy')}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Logged Days</span>
                                      <p className="font-medium">{entry.totalDays}</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Fuel Used</span>
                                      <p className="font-medium">{entry.totalFuel.toFixed(1)} L</p>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Efficiency</span>
                                      <p className={cn("font-medium",
                                        Number(efficiency) >= 80 ? "text-green-600" :
                                        Number(efficiency) >= 60 ? "text-yellow-600" : "text-destructive"
                                      )}>{efficiency}%</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <MapPin className="h-10 w-10 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No deployment history found</p>
                        <p className="text-xs text-muted-foreground mt-1">Equipment logs will appear here once this machine has been logged at a site</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* ALLOCATION TAB */}
            <TabsContent value="allocation" className="mt-4 sm:mt-6">
              {(() => {
                const activeStatuses = ['outstanding', 'partial_returned', 'open', 'sent_to_site'];
                const activeWaybillsForAsset = waybills.filter(wb =>
                  activeStatuses.includes(wb.status) && wb.type === 'waybill' &&
                  wb.items.some(it => String(it.assetId) === String(asset.id))
                );

                return (
                  <div className="space-y-6">
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
                          <p className="text-xs text-muted-foreground">Reserved (Waybills)</p>
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
                          <div className="text-2xl font-bold text-destructive">{analytics.missingCount}</div>
                          <p className="text-xs text-muted-foreground">Missing</p>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Active Waybill Reservations
                        {activeWaybillsForAsset.length > 0 && (
                          <Badge variant="outline" className="ml-1">{activeWaybillsForAsset.length}</Badge>
                        )}
                      </h3>
                      {activeWaybillsForAsset.length > 0 ? (
                        <div className="grid gap-3">
                          {activeWaybillsForAsset.map(wb => {
                            const item = wb.items.find(it => String(it.assetId) === String(asset.id));
                            if (!item) return null;
                            const unreturned = Math.max(0, item.quantity - (item.returnedQuantity || 0));
                            return (
                              <div key={wb.id} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">Waybill {wb.id}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {getSiteName(String(wb.siteId))} · {wb.driverName} · {new Date(wb.issueDate).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={wb.status === 'outstanding' ? 'default' : 'secondary'} className="capitalize text-xs">
                                    {wb.status.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-base px-3 font-semibold">
                                    {unreturned}
                                    {item.returnedQuantity > 0 && (
                                      <span className="text-muted-foreground text-xs ml-1">/{item.quantity}</span>
                                    )}
                                  </Badge>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No active waybill reservations for this item.</p>
                      )}
                    </div>

                    {asset.siteQuantities && Object.values(asset.siteQuantities).some(q => (q as number) > 0) && (
                      <div className="border-t pt-4">
                        <h3 className="text-md font-semibold mb-3 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Site Inventory
                        </h3>
                        <div className="grid gap-3">
                          {Object.entries(asset.siteQuantities).map(([siteId, qty]) => {
                            if ((qty as number) <= 0) return null;
                            return (
                              <div key={siteId} className="flex items-center justify-between p-3 border rounded-lg bg-card text-card-foreground shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                                    <MapPin className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{getSiteName(siteId)}</div>
                                    <div className="text-xs text-muted-foreground">On-site quantity</div>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="text-lg px-3">{qty as number}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </TabsContent>

            {/* USAGE HISTORY TAB */}
            <TabsContent value="usage" className="mt-4 sm:mt-6">
              <div className="space-y-6">
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
                                      checkout.status === 'used' ? 'outline' : 'destructive'
                                }
                                className={checkout.status === 'used' ? 'border-purple-500 text-purple-500' : ''}
                              >
                                {checkout.status === 'return_completed' ? 'Returned' :
                                  checkout.status === 'outstanding' ? 'Checked Out' :
                                    checkout.status.charAt(0).toUpperCase() + checkout.status.slice(1)}
                              </Badge>
                              <span className="text-sm font-semibold">Qty: {checkout.quantity}</span>
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
