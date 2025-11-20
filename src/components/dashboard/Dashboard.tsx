import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Asset, Waybill, QuickCheckout, Activity, Site, Employee } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { Package, FileText, ShoppingCart, AlertTriangle, TrendingDown, CheckCircle, User, Wrench, BarChart3, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import { getActivities } from "@/utils/activityLogger";
import { SiteMachineAnalytics } from "@/components/sites/SiteMachineAnalytics";
import { NotificationPanel } from "./NotificationPanel";
import { TrendChart } from "./TrendChart";
import { SyncStatusBanner } from "@/components/layout/SyncStatusBanner";
import { useMetricsSnapshots, getMetricsHistory } from "@/hooks/useMetricsSnapshots";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  assets: Asset[];
  waybills: Waybill[];
  quickCheckouts: QuickCheckout[];
  sites: Site[];
  equipmentLogs: EquipmentLog[];
  employees: Employee[];
  onQuickLogEquipment: (log: EquipmentLog) => void;
}

export const Dashboard = ({ assets, waybills, quickCheckouts, sites, equipmentLogs, employees, onQuickLogEquipment }: DashboardProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Asset | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [activityDateRange, setActivityDateRange] = useState({ from: subDays(new Date(), 7), to: new Date() });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const { toast } = useToast();

  const totalAssets = assets.length;
  const totalQuantity = assets.reduce((sum, asset) => sum + asset.quantity, 0);
  const outOfStockCount = assets.filter(asset => asset.quantity === 0).length;
  const lowStockCount = assets.filter(asset => asset.quantity > 0 && asset.quantity < 10).length;
  
  const outstandingWaybills = (waybills || []).filter(w => w.status === 'outstanding').length;
  const outstandingCheckouts = (quickCheckouts || []).filter(c => c.status === 'outstanding').length;

  // Store current metrics as snapshot
  useMetricsSnapshots({
    totalAssets,
    totalQuantity,
    outstandingWaybills,
    outstandingCheckouts,
    outOfStockCount,
    lowStockCount,
  });

  // Load activities and metrics history on mount
  useEffect(() => {
    const loadData = async () => {
      const loadedActivities = await getActivities();
      setActivities(loadedActivities);
      
      const history = await getMetricsHistory(7);
      setMetricsHistory(history);
    };
    loadData();
  }, []);

  // Get real trend data from historical snapshots
  const getTrendDataFromHistory = (metricKey: string, currentValue: number): number[] => {
    if (metricsHistory.length === 0) {
      // Fallback to single data point if no history yet
      return [currentValue];
    }
    
    const data = metricsHistory.map(snapshot => {
      switch(metricKey) {
        case 'totalAssets': return snapshot.total_assets;
        case 'totalQuantity': return snapshot.total_quantity;
        case 'outstandingWaybills': return snapshot.outstanding_waybills;
        case 'outstandingCheckouts': return snapshot.outstanding_checkouts;
        case 'outOfStock': return snapshot.out_of_stock;
        case 'lowStock': return snapshot.low_stock;
        default: return currentValue;
      }
    });
    
    // Always include current value as the last data point
    return [...data, currentValue];
  };

  const getTrend = (data: number[]): { trend: "up" | "down" | "neutral", percentage: number } => {
    const first = data[0];
    const last = data[data.length - 1];
    const diff = last - first;
    const percentage = first === 0 ? 0 : Math.round((diff / first) * 100);
    
    if (Math.abs(percentage) < 5) return { trend: "neutral", percentage: 0 };
    return { trend: diff > 0 ? "up" : "down", percentage };
  };
  
  // Calculate categories
  const dewateringAssets = assets.filter(a => a.category === 'dewatering');
  const waterproofingAssets = assets.filter(a => a.category === 'waterproofing');
  const tilingAssets = assets.filter(a => a.category === 'tiling');
  const ppeAssets = assets.filter(a => a.category === 'ppe');
  const officeAssets = assets.filter(a => a.category === 'office');

  // Helper function to toggle category expansion
  const toggleCategoryExpansion = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Helper function to render category card
  const renderCategoryCard = (title: string, assets: Asset[], icon: any, category: string, delay: string) => {
    const isExpanded = expandedCategories[category];
    const displayAssets = isExpanded ? assets : assets.slice(0, 3);

    return (
      <Card className="border-0 shadow-soft animate-slide-up" style={{animationDelay: delay}}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              {title}
            </div>
            {assets.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCategoryExpansion(category)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            {assets.length} items - {assets.reduce((sum, a) => sum + a.quantity, 0)} units
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {displayAssets.map(asset => (
              <div key={asset.id} className="flex justify-between items-center">
                <span className="text-sm">{asset.name}</span>
                <span className={`text-sm font-medium ${
                  asset.quantity === 0 ? 'text-destructive' :
                  asset.quantity < 10 ? 'text-warning' : 'text-success'
                }`}>
                  {asset.quantity} {asset.unitOfMeasurement}
                </span>
              </div>
            ))}
            {assets.length > 3 && !isExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleCategoryExpansion(category)}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                +{assets.length - 3} more items
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // Get all equipment requiring logging
  const equipmentRequiringLogging = assets.filter(
    asset => asset.type === 'equipment' && asset.requiresLogging === true
  );

  // Helper function to get site name
  const getSiteName = (asset: Asset): string => {
    if (asset.siteId) {
      const site = sites.find(s => s.id === asset.siteId);
      return site?.name || 'Unknown Site';
    }
    // Check siteQuantities for multi-site equipment
    if (asset.siteQuantities) {
      const sitesWithEquipment = Object.entries(asset.siteQuantities)
        .filter(([_, qty]) => qty !== undefined)
        .map(([siteId]) => {
          const site = sites.find(s => s.id === siteId);
          return site?.name || siteId;
        });
      return sitesWithEquipment.join(', ') || 'Not assigned';
    }
    return 'Not assigned';
  };

  // Helper function to get latest log status
  const getLatestStatus = (equipmentId: string): { active: boolean; date?: Date } => {
    const logs = equipmentLogs
      .filter(log => log.equipmentId === equipmentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (logs.length > 0) {
      return { active: logs[0].active, date: logs[0].date };
    }
    return { active: false };
  };

  // Helper function to get site for equipment
  const getSiteForEquipment = (asset: Asset): Site | null => {
    if (asset.siteId) {
      // Convert both to strings for comparison
      return sites.find(s => String(s.id) === String(asset.siteId)) || null;
    }
    // For equipment with siteQuantities, get the first site
    if (asset.siteQuantities) {
      const siteId = Object.keys(asset.siteQuantities)[0];
      return sites.find(s => String(s.id) === String(siteId)) || null;
    }
    return null;
  };
  
  const stats = useMemo(() => [
    {
      title: "Total Assets",
      value: totalAssets,
      description: "Items in inventory",
      icon: Package,
      color: "text-primary",
      trendData: getTrendDataFromHistory('totalAssets', totalAssets),
      getTrendInfo: function() { return getTrend(this.trendData); }
    },
    {
      title: "Total Quantity",
      value: totalQuantity,
      description: "Units in stock",
      icon: Package,
      color: "text-success",
      trendData: getTrendDataFromHistory('totalQuantity', totalQuantity),
      getTrendInfo: function() { return getTrend(this.trendData); }
    },
    {
      title: "Outstanding Waybills",
      value: outstandingWaybills,
      description: "Items out for projects",
      icon: FileText,
      color: "text-warning",
      trendData: getTrendDataFromHistory('outstandingWaybills', outstandingWaybills),
      getTrendInfo: function() { return getTrend(this.trendData); }
    },
    {
      title: "Quick Checkouts",
      value: outstandingCheckouts,
      description: "Items checked out",
      icon: ShoppingCart,
      color: "text-primary",
      trendData: getTrendDataFromHistory('outstandingCheckouts', outstandingCheckouts),
      getTrendInfo: function() { return getTrend(this.trendData); }
    },
    {
      title: "Out of Stock",
      value: outOfStockCount,
      description: "Items needing reorder",
      icon: AlertTriangle,
      color: "text-destructive",
      trendData: getTrendDataFromHistory('outOfStock', outOfStockCount),
      getTrendInfo: function() { return getTrend(this.trendData); }
    },
    {
      title: "Low Stock",
      value: lowStockCount,
      description: "Items running low",
      icon: TrendingDown,
      color: "text-warning",
      trendData: getTrendDataFromHistory('lowStock', lowStockCount),
      getTrendInfo: function() { return getTrend(this.trendData); }
    }
  ], [totalAssets, totalQuantity, outstandingWaybills, outstandingCheckouts, outOfStockCount, lowStockCount, metricsHistory]);

  // Filter activities by date range
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const activityDate = activity.timestamp;
      return activityDate >= activityDateRange.from && activityDate <= activityDateRange.to;
    });
  }, [activities, activityDateRange]);


  return (
    <div className="space-y-8 animate-fade-in">
      {/* Sync Status Banner */}
      <SyncStatusBanner />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Asset Management Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Overview of your inventory, waybills, and asset tracking
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const trendInfo = stat.getTrendInfo();
          return (
            <Card
              key={stat.title}
              className="border-0 shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
                <CardDescription className="mt-2 mb-3">
                  {stat.description}
                </CardDescription>
                <TrendChart 
                  data={stat.trendData}
                  trend={trendInfo.trend}
                  percentage={trendInfo.percentage}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>


      {/* Notification Panel */}
      <NotificationPanel
        assets={assets}
        sites={sites}
        equipmentLogs={equipmentLogs}
        employees={employees}
        onQuickLogEquipment={onQuickLogEquipment}
      />

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {renderCategoryCard("Dewatering Equipment", dewateringAssets, <Package className="h-5 w-5 text-primary" />, "dewatering", "0.6s")}
        {renderCategoryCard("Waterproofing Materials", waterproofingAssets, <CheckCircle className="h-5 w-5 text-accent" />, "waterproofing", "0.7s")}
        {renderCategoryCard("Tiling Materials", tilingAssets, <Package className="h-5 w-5 text-blue-500" />, "tiling", "0.8s")}
        {renderCategoryCard("PPE & Safety", ppeAssets, <User className="h-5 w-5 text-orange-500" />, "ppe", "0.9s")}
        {renderCategoryCard("Office Supplies", officeAssets, <FileText className="h-5 w-5 text-green-500" />, "office", "1.0s")}
      </div>

      {/* Equipment Requiring Logging */}
      {equipmentRequiringLogging.length > 0 && (
        <Card className="border-0 shadow-soft animate-slide-up" style={{animationDelay: '0.8s'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Equipment Requiring Logging
            </CardTitle>
            <CardDescription>
              {equipmentRequiringLogging.length} equipment items across sites
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {equipmentRequiringLogging.map(equipment => {
                const status = getLatestStatus(equipment.id);
                const siteName = getSiteName(equipment);
                const site = getSiteForEquipment(equipment);
                
                return (
                  <Card 
                    key={equipment.id} 
                    className="border-0 shadow-soft hover:shadow-medium transition-all duration-300"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span className="truncate">{equipment.name}</span>
                        <Badge 
                          variant={status.active ? "default" : "secondary"}
                          className="text-xs ml-2"
                        >
                          {status.active ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Site:</span>
                          <span className="font-medium truncate ml-2">{siteName}</span>
                        </div>
                        {status.date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Last Log:</span>
                            <span className="font-medium text-xs">
                              {format(new Date(status.date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => {
                          if (site) {
                            setSelectedEquipment(equipment);
                            setSelectedSite(site);
                            setShowAnalytics(true);
                          }
                        }}
                        disabled={!site}
                      >
                        <BarChart3 className="h-4 w-4" />
                        View Analytics
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="border-0 shadow-soft animate-slide-up" style={{animationDelay: '0.9s'}}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest system activities and user actions</CardDescription>
            </div>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(activityDateRange.from, "MMM dd")} - {format(activityDateRange.to, "MMM dd")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: activityDateRange.from, to: activityDateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setActivityDateRange({ from: range.from, to: range.to });
                      setShowDatePicker(false);
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredActivities.slice(0, 10).map(activity => {
              // Format the action text to be more readable
              const formatAction = (action: string): string => {
                return action
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              };

              // Format the entity text
              const formatEntity = (entity: string): string => {
                return entity
                  .replace(/_/g, ' ')
                  .split(' ')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              };

              // Get site name if entityId is a site ID
              const getDisplayEntityId = (entityId?: string): string => {
                if (!entityId) return '';
                
                // Check if it's a site ID pattern and get the site name
                const site = sites.find(s => s.id === entityId);
                if (site) {
                  return site.name;
                }
                
                return entityId;
              };

              return (
                <div key={activity.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {activity.userName || activity.userId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatAction(activity.action)} {formatEntity(activity.entity)}
                      {activity.entityId && ` - ${getDisplayEntityId(activity.entityId)}`}
                    </div>
                    {activity.details && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {activity.details}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredActivities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activities in selected date range</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Dialog */}
      {selectedEquipment && selectedSite && (
        <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Equipment Analytics - {selectedEquipment.name} at {selectedSite.name}
              </DialogTitle>
            </DialogHeader>
            <SiteMachineAnalytics
              site={selectedSite}
              equipment={[selectedEquipment]}
              equipmentLogs={equipmentLogs.filter(log => 
                log.equipmentId === selectedEquipment.id && 
                log.siteId === selectedSite.id
              )}
              selectedEquipmentId={selectedEquipment.id}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};