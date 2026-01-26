import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Asset, Waybill, QuickCheckout, Activity, Site, Employee, Vehicle } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { MaintenanceLog } from "@/types/maintenance";
import { Package, FileText, ShoppingCart, AlertTriangle, TrendingDown, CheckCircle, Wrench, BarChart3, ChevronDown, ChevronUp, MapPin, User } from "lucide-react";
import { SiteMachineAnalytics } from "@/components/sites/SiteMachineAnalytics";
import { NotificationPanel } from "./NotificationPanel";
import { TrendChart } from "./TrendChart";
import { useMetricsSnapshots, getMetricsHistory } from "@/hooks/useMetricsSnapshots";
import { format, subDays, addMonths, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
interface DashboardProps {
  assets: Asset[];
  waybills: Waybill[];
  quickCheckouts: QuickCheckout[];
  sites: Site[];
  equipmentLogs: EquipmentLog[];
  maintenanceLogs: MaintenanceLog[];
  employees: Employee[];
  vehicles: Vehicle[];
  onQuickLogEquipment: (log: EquipmentLog) => void;
  onNavigate: (tab: string, params?: {
    availability: 'out' | 'restock';
  }) => void;
}
export const Dashboard = ({
  assets,
  waybills,
  quickCheckouts,
  sites,
  equipmentLogs,
  maintenanceLogs,
  employees,
  vehicles,
  onQuickLogEquipment,
  onNavigate
}: DashboardProps) => {
  const [selectedEquipment, setSelectedEquipment] = useState<Asset | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  const [isEquipmentLoggingExpanded, setIsEquipmentLoggingExpanded] = useState(true);
  const {
    toast
  } = useToast();
  const totalAssets = assets.length;
  const totalQuantity = assets.reduce((sum, asset) => sum + asset.quantity, 0);
  const outOfStockCount = assets.filter(asset => asset.quantity === 0).length;
  const lowStockCount = assets.filter(asset => asset.quantity > 0 && asset.quantity < 10).length;
  const outstandingWaybills = (waybills || []).filter(w => w.status === 'outstanding').length;
  const outstandingCheckouts = (quickCheckouts || []).filter(c => c.status === 'outstanding').length;

  // Total machines includes both equipment assets and vehicles (matching MachineMaintenancePage)
  const equipmentCount = assets.filter(a => a.type === 'equipment').length;
  const vehicleCount = vehicles?.length || 0;
  const totalMachines = equipmentCount + vehicleCount;

  // Calculate machines due based on latest maintenance logs (Sync with MachineMaintenancePage logic)
  const latestLogs = new Map<string, MaintenanceLog>();
  (maintenanceLogs || []).forEach(log => {
    if (!log.machineId) return;
    const existing = latestLogs.get(log.machineId);
    if (!existing || new Date(log.dateStarted) > new Date(existing.dateStarted)) {
      latestLogs.set(log.machineId, log);
    }
  });

  const activeMachines = assets.filter(a => a.type === 'equipment' && a.status === 'active');
  let maintenanceDueCount = 0;

  const now = new Date();
  activeMachines.forEach(machine => {
    const log = latestLogs.get(machine.id);
    const deploymentDate = machine.deploymentDate ? new Date(machine.deploymentDate) : new Date(machine.createdAt);
    const serviceInterval = machine.serviceInterval || 2;

    const expectedServiceDate = log?.nextServiceDue
      ? new Date(log.nextServiceDue)
      : (log
        ? addMonths(new Date(log.dateStarted), serviceInterval)
        : addMonths(deploymentDate, serviceInterval));

    const daysRemaining = differenceInDays(expectedServiceDate, now);
    if (daysRemaining <= 14) {
      maintenanceDueCount++;
    }
  });



  // Store current metrics as snapshot
  useMetricsSnapshots({
    totalAssets,
    totalQuantity,
    outstandingWaybills,
    outstandingCheckouts,
    outOfStockCount,
    lowStockCount
  });

  // Load activities and metrics history on mount
  useEffect(() => {
    const loadData = async () => {
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
      switch (metricKey) {
        case 'totalAssets':
          return snapshot.total_assets;
        case 'totalQuantity':
          return snapshot.total_quantity;
        case 'outstandingWaybills':
          return snapshot.outstanding_waybills;
        case 'outstandingCheckouts':
          return snapshot.outstanding_checkouts;
        case 'outOfStock':
          return snapshot.out_of_stock;
        case 'lowStock':
          return snapshot.low_stock;
        default:
          return currentValue;
      }
    });

    // Always include current value as the last data point
    return [...data, currentValue];
  };
  const getTrend = (data: number[]): {
    trend: "up" | "down" | "neutral";
    percentage: number;
  } => {
    const first = data[0];
    const last = data[data.length - 1];
    const diff = last - first;
    const percentage = first === 0 ? 0 : Math.round(diff / first * 100);
    if (Math.abs(percentage) < 5) return {
      trend: "neutral",
      percentage: 0
    };
    return {
      trend: diff > 0 ? "up" : "down",
      percentage
    };
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
    return <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            {title}
          </div>
          {assets.length > 3 && <Button variant="ghost" size="sm" onClick={() => toggleCategoryExpansion(category)} className="h-6 w-6 p-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>}
        </CardTitle>
        <CardDescription>
          {assets.length} items - {assets.reduce((sum, a) => sum + a.quantity, 0)} units
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {displayAssets.map((asset, index) => <div key={asset.id || index} className="flex justify-between items-center">
            <span className="text-sm">{asset.name}</span>
            <span className={`text-sm font-medium ${asset.quantity === 0 ? 'text-destructive' : asset.quantity < 10 ? 'text-warning' : 'text-success'}`}>
              {asset.quantity} {asset.unitOfMeasurement}
            </span>
          </div>)}
          {assets.length > 3 && !isExpanded && <Button variant="ghost" size="sm" onClick={() => toggleCategoryExpansion(category)} className="w-full text-sm text-muted-foreground hover:text-foreground">
            +{assets.length - 3} more items
          </Button>}
        </div>
      </CardContent>
    </Card>;
  };

  // Get all equipment requiring logging
  const equipmentRequiringLogging = assets.filter(asset => asset.type === 'equipment' && asset.requiresLogging === true);

  // Helper function to get site name
  const getSiteName = (asset: Asset): string => {
    if (asset.siteId) {
      const site = sites.find(s => s.id === asset.siteId);
      return site?.name || 'Unknown Site';
    }
    // Check siteQuantities for multi-site equipment
    if (asset.siteQuantities) {
      const sitesWithEquipment = Object.entries(asset.siteQuantities).filter(([_, qty]) => qty !== undefined).map(([siteId]) => {
        const site = sites.find(s => s.id === siteId);
        return site?.name || siteId;
      });
      return sitesWithEquipment.join(', ') || 'Not assigned';
    }
    return 'Not assigned';
  };

  // Helper function to get latest log status
  const getLatestStatus = (equipmentId: string): {
    active: boolean;
    date?: Date;
  } => {
    const logs = equipmentLogs.filter(log => log.equipmentId === equipmentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (logs.length > 0) {
      return {
        active: logs[0].active,
        date: logs[0].date
      };
    }
    return {
      active: false
    };
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
  const stats = useMemo(() => [{
    title: "Total Assets",
    value: totalAssets,
    description: "Items in inventory",
    icon: Package,
    color: "text-primary",
    trendData: getTrendDataFromHistory('totalAssets', totalAssets),
    getTrendInfo: function () {
      return getTrend(this.trendData);
    }
  }, {
    title: "Total Quantity",
    value: totalQuantity,
    description: "Units in stock",
    icon: Package,
    color: "text-success",
    trendData: getTrendDataFromHistory('totalQuantity', totalQuantity),
    getTrendInfo: function () {
      return getTrend(this.trendData);
    }
  }, {
    title: "Outstanding Waybills",
    value: outstandingWaybills,
    description: "Items out for projects",
    icon: FileText,
    color: "text-warning",
    trendData: getTrendDataFromHistory('outstandingWaybills', outstandingWaybills),
    getTrendInfo: function () {
      return getTrend(this.trendData);
    }
  }, {
    title: "Quick Checkouts",
    value: outstandingCheckouts,
    description: "Items checked out",
    icon: ShoppingCart,
    color: "text-primary",
    trendData: getTrendDataFromHistory('outstandingCheckouts', outstandingCheckouts),
    getTrendInfo: function () {
      return getTrend(this.trendData);
    }
  }, {
    title: "Out of Stock",
    value: outOfStockCount,
    description: "Items needing reorder",
    icon: AlertTriangle,
    color: "text-destructive",
    trendData: getTrendDataFromHistory('outOfStock', outOfStockCount),
    getTrendInfo: function () {
      return getTrend(this.trendData);
    }
  }, {
    title: "Low Stock",
    value: lowStockCount,
    description: "Items running low",
    icon: TrendingDown,
    color: "text-warning",
    trendData: getTrendDataFromHistory('lowStock', lowStockCount),
    getTrendInfo: function () {
      return getTrend(this.trendData);
    }
  }], [totalAssets, totalQuantity, outstandingWaybills, outstandingCheckouts, outOfStockCount, lowStockCount, metricsHistory]);


  return <div className="space-y-4 md:space-y-8">

    {/* Header - Mobile Optimized */}
    <div className="px-1">
      <h1 className="text-2xl md:text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
        Dashboard
      </h1>
      <p className="text-muted-foreground text-sm md:text-base mt-1">
        Inventory & asset overview
      </p>
    </div>

    {/* Action Modules Grid - Mobile Optimized */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
      {/* 1. Inventory Overview */}
      <Card className="border-0 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden active:scale-[0.98]" onClick={() => onNavigate('assets')}>
        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Package className="h-16 md:h-24 w-16 md:w-24 text-primary" />
        </div>
        <CardHeader className="pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <Package className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Inventory
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Tools, equipment & consumables</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-primary">{totalAssets}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Inventory</div>
            </div>
            <div className="text-right">
              <div className="text-xl md:text-2xl font-bold text-success">{totalQuantity}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Total Qty</div>
            </div>
          </div>
          {(outOfStockCount > 0 || lowStockCount > 0) && <div className="mt-3 flex flex-wrap gap-2">
            {outOfStockCount > 0 && <Badge variant="destructive" className="flex gap-1 items-center text-xs hover:bg-destructive/80 transition-colors z-10 relative" onClick={e => {
              e.stopPropagation();
              onNavigate('assets', {
                availability: 'out'
              });
            }}>
              <AlertTriangle className="h-3 w-3" />
              {outOfStockCount} Out
            </Badge>}
            {lowStockCount > 0 && <Badge variant="outline" className="text-warning border-warning flex gap-1 items-center text-xs hover:bg-warning/10 transition-colors z-10 relative" onClick={e => {
              e.stopPropagation();
              onNavigate('assets', {
                availability: 'restock'
              });
            }}>
              <TrendingDown className="h-3 w-3" />
              {lowStockCount} Low
            </Badge>}
          </div>}
        </CardContent>
      </Card>

      {/* 2. Project Waybills */}
      <Card className="border-0 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden active:scale-[0.98]" onClick={() => onNavigate('waybills')}>
        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <FileText className="h-16 md:h-24 w-16 md:w-24 text-warning" />
        </div>
        <CardHeader className="pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <FileText className="h-5 w-5 md:h-6 md:w-6 text-warning" />
            Waybills
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Track site deployments</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold text-warning">{outstandingWaybills}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Outstanding</div>
          <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-warning/50 w-3/4 rounded-full" />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <p className="text-[10px] md:text-xs text-muted-foreground">Overall Waybills</p>
            <Badge variant="outline" className="text-[10px] md:text-xs">
              {waybills.length} Total
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 3. Returns Processing */}
      <Card className="border-0 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden active:scale-[0.98]" onClick={() => onNavigate('returns')}>
        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <CheckCircle className="h-16 md:h-24 w-16 md:w-24 text-blue-500" />
        </div>
        <CardHeader className="pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
            Returns
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Process returned items</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold text-blue-500">
            {waybills.filter(w => w.type === 'return' && w.status === 'outstanding').length}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">Pending Returns</div>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-2">Items awaiting processing</p>
        </CardContent>
      </Card>

      {/* 4. Employee Quick Checkouts */}
      <Card className="border-0 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden active:scale-[0.98]" onClick={() => onNavigate('employee-analytics')}>
        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShoppingCart className="h-16 md:h-24 w-16 md:w-24 text-purple-500" />
        </div>
        <CardHeader className="pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
            Checkouts
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Tool assignments</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold text-purple-500">{outstandingCheckouts}</div>
          <div className="text-xs md:text-sm text-muted-foreground">Active</div>
          <div className="mt-3 flex -space-x-2 overflow-hidden">
            {[1, 2, 3].map(i => <div key={i} className="inline-block h-5 w-5 md:h-6 md:w-6 rounded-full ring-2 ring-background bg-slate-200 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-slate-500">
              U
            </div>)}
          </div>
        </CardContent>
      </Card>

      {/* 5. Sites */}
      <Card className="border-0 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden active:scale-[0.98]" onClick={() => onNavigate('sites')}>
        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <MapPin className="h-16 md:h-24 w-16 md:w-24 text-green-500" />
        </div>
        <CardHeader className="pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <MapPin className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
            Sites
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Project locations</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold text-green-500">
            {sites.filter(s => s.status === 'active').length}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">Active Sites</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <p className="text-[10px] md:text-xs text-muted-foreground">Total sites</p>
            <Badge variant="outline" className="text-[10px] md:text-xs">
              {sites.length}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 6. Machine Maintenance */}
      <Card className="border-0 shadow-soft hover:shadow-lg transition-all duration-300 cursor-pointer group relative overflow-hidden active:scale-[0.98]" onClick={() => onNavigate('machine-maintenance')}>
        <div className="absolute top-0 right-0 p-2 md:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Wrench className="h-16 md:h-24 w-16 md:w-24 text-red-500" />
        </div>
        <CardHeader className="pb-2 p-3 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-xl">
            <Wrench className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
            Maintenance
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">Machine service status</CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <div className="text-2xl md:text-3xl font-bold text-red-500">
            {maintenanceDueCount}
          </div>
          <div className="text-xs md:text-sm text-muted-foreground">Machines Due</div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <p className="text-[10px] md:text-xs text-muted-foreground">Total Machines</p>
            <Badge variant="outline" className="text-[10px] md:text-xs">
              {totalMachines}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>





    {/* Notification Panel */}
    <NotificationPanel assets={assets} sites={sites} equipmentLogs={equipmentLogs} employees={employees} onQuickLogEquipment={onQuickLogEquipment} />

    {/* Category Breakdown - Hidden on very small screens, collapsible */}
    <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
      {renderCategoryCard("Dewatering", dewateringAssets, <Package className="h-5 w-5 text-primary" />, "dewatering", "0.6s")}
      {renderCategoryCard("Waterproofing", waterproofingAssets, <CheckCircle className="h-5 w-5 text-accent" />, "waterproofing", "0.7s")}
      {renderCategoryCard("Tiling", tilingAssets, <Package className="h-5 w-5 text-blue-500" />, "tiling", "0.8s")}
      {renderCategoryCard("PPE", ppeAssets, <User className="h-5 w-5 text-orange-500" />, "ppe", "0.9s")}
      {renderCategoryCard("Office", officeAssets, <FileText className="h-5 w-5 text-green-500" />, "office", "1.0s")}
    </div>

    {/* Equipment Requiring Logging */}
    {equipmentRequiringLogging.length > 0 && <Card className="border-0 shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Equipment Requiring Logging
            </CardTitle>
            <CardDescription>
              {equipmentRequiringLogging.length} equipment items across sites
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEquipmentLoggingExpanded(!isEquipmentLoggingExpanded)}>
            {isEquipmentLoggingExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {isEquipmentLoggingExpanded && <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {equipmentRequiringLogging.map((equipment, index) => {
            const status = getLatestStatus(equipment.id);
            const siteName = getSiteName(equipment);
            const site = getSiteForEquipment(equipment);
            return <Card key={equipment.id || index} className="border-0 shadow-soft hover:shadow-medium transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="truncate">{equipment.name}</span>
                  <Badge variant={status.active ? "default" : "secondary"} className="text-xs ml-2">
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
                  {status.date && <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Log:</span>
                    <span className="font-medium text-xs">
                      {format(new Date(status.date), 'MMM dd, yyyy')}
                    </span>
                  </div>}
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => {
                  if (site) {
                    setSelectedEquipment(equipment);
                    setSelectedSite(site);
                    setShowAnalytics(true);
                  }
                }} disabled={!site}>
                  <BarChart3 className="h-4 w-4" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>;
          })}
        </div>
      </CardContent>}
    </Card>}



    {/* Analytics Dialog */}
    {selectedEquipment && selectedSite && <Dialog open={showAnalytics} onOpenChange={setShowAnalytics}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Equipment Analytics - {selectedEquipment.name} at {selectedSite.name}
          </DialogTitle>
        </DialogHeader>
        <SiteMachineAnalytics site={selectedSite} equipment={[selectedEquipment]} equipmentLogs={equipmentLogs.filter(log => log.equipmentId === selectedEquipment.id && log.siteId === selectedSite.id)} selectedEquipmentId={selectedEquipment.id} />
      </DialogContent>
    </Dialog>}
  </div>;
};