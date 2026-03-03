import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RequestForm } from "@/components/requests/RequestForm";
import { RequestList } from "@/components/requests/RequestList";
import { MachinesSection } from "@/components/sites/MachinesSection";
import { ConsumablesSection } from "@/components/sites/ConsumablesSection";
import { SiteAssetDetailsPage } from "@/pages/SiteAssetDetailsPage";
import { AssetAnalyticsPage } from "@/pages/AssetAnalyticsPage";
import { SiteWideMachineAnalyticsView } from "@/components/sites/SiteWideMachineAnalyticsView";
import { SiteConsumablesAnalyticsView } from "@/components/sites/SiteConsumablesAnalyticsView";
import { BulkLogDialog } from "@/components/sites/BulkLogDialog";
import { Asset, Site } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { dataService } from "@/services/dataService";
import {
  LogOut, Wrench, FileText, ClipboardList, Clock,
  ArrowLeft, Package, Layers, MapPin, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SiteWorkerDashboardProps {
  onExit?: () => void;
  isSimulated?: boolean;
}

type ViewType =
  | "dashboard"
  | "asset-details"
  | "asset-analytics"
  | "site-machine-analytics"
  | "site-consumable-analytics";

export const SiteWorkerDashboard = ({ onExit, isSimulated }: SiteWorkerDashboardProps) => {
  const { currentUser, logout } = useAuth();
  const { sites, equipmentLogs, setEquipmentLogs, employees, companySettings } = useAppData();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [waybills, setWaybills] = useState<any[]>([]);
  const [consumableLogs, setConsumableLogs] = useState<ConsumableUsageLog[]>([]);

  const loadData = async () => {
    try {
      const [loadedAssets, loadedWaybills, loadedConsumableLogs] = await Promise.all([
        dataService.assets.getAssets(),
        dataService.waybills.getWaybills(),
        dataService.consumableLogs.getConsumableLogs(),
      ]);
      setAssets(
        loadedAssets.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
          siteQuantities:
            typeof item.siteQuantities === "string"
              ? JSON.parse(item.siteQuantities)
              : item.siteQuantities || {},
        }))
      );
      setWaybills(
        loadedWaybills.map((item: any) => ({
          ...item,
          issueDate: new Date(item.issueDate),
          createdAt: new Date(item.createdAt),
        }))
      );
      setConsumableLogs(
        loadedConsumableLogs.map((item: any) => ({
          ...item,
          date: new Date(item.date),
          createdAt: new Date(item.createdAt),
        }))
      );
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  };

  // Load on mount
  useEffect(() => {
    loadData();
  }, []);

  // Re-sync data when tab/window regains focus (picks up admin changes like start date overrides)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    const handleFocus = () => loadData();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const [view, setView] = useState<ViewType>("dashboard");
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<{
    site: Site;
    asset: Asset;
    initialTab?: string;
  } | null>(null);
  const [selectedSiteForAnalytics, setSelectedSiteForAnalytics] = useState<Site | null>(null);
  const [activeTab, setActiveTab] = useState("requests");

  const [bulkLogOpen, setBulkLogOpen] = useState(false);
  const [bulkLogType, setBulkLogType] = useState<"equipment" | "consumable">("equipment");
  const [bulkLogSite, setBulkLogSite] = useState<Site | null>(null);

  const activeSites = sites.filter((s) => s.status === "active");

  const handleViewAssetDetails = (site: Site, asset: Asset, initialTab = "log-entry") => {
    setSelectedAssetForDetails({ site, asset, initialTab });
    setView("asset-details");
  };
  const handleViewAssetAnalytics = (site: Site, asset: Asset) => {
    setSelectedAssetForDetails({ site, asset });
    setView("asset-analytics");
  };
  const handleViewSiteMachineAnalytics = (site: Site) => {
    setSelectedSiteForAnalytics(site);
    setView("site-machine-analytics");
  };
  const handleViewSiteConsumableAnalytics = (site: Site) => {
    setSelectedSiteForAnalytics(site);
    setView("site-consumable-analytics");
  };
  const handleBackToDashboard = () => {
    setView("dashboard");
    setSelectedAssetForDetails(null);
    setSelectedSiteForAnalytics(null);
  };
  const handleOpenBulkLog = (site: Site, type: "equipment" | "consumable") => {
    setBulkLogSite(site);
    setBulkLogType(type);
    setBulkLogOpen(true);
  };

  const handleAddEquipmentLog = async (log: EquipmentLog) => {
    try {
      const saved = await dataService.equipmentLogs.createEquipmentLog(log);
      setEquipmentLogs((prev) => [...prev, saved]);
    } catch (error) {
      console.error(error);
    }
  };
  const handleUpdateEquipmentLog = async (log: EquipmentLog) => {
    try {
      const saved = await dataService.equipmentLogs.updateEquipmentLog(Number(log.id), log);
      setEquipmentLogs((prev) => prev.map((l) => (l.id === log.id ? saved : l)));
    } catch (error) {
      console.error(error);
    }
  };
  const handleBulkSaveEquipmentLogs = async (logs: EquipmentLog[]) => {
    for (const log of logs) await handleAddEquipmentLog(log);
  };
  const handleAddConsumableLog = async (log: ConsumableUsageLog) => {
    try {
      const saved = await dataService.consumableLogs.createConsumableLog(log);
      setConsumableLogs((prev) => [...prev, saved]);
    } catch (error) {
      console.error(error);
    }
  };
  const handleUpdateConsumableLog = async (log: ConsumableUsageLog) => {
    try {
      const saved = await dataService.consumableLogs.updateConsumableLog(log.id, log);
      setConsumableLogs((prev) => prev.map((l) => (l.id === log.id ? saved : l)));
    } catch (error) {
      console.error(error);
    }
  };
  const handleBulkSaveConsumableLogs = async (logs: ConsumableUsageLog[]) => {
    for (const log of logs) await handleAddConsumableLog(log);
  };

  // ── Sub-views ─────────────────────────────────────────────────────────────
  if (view === "asset-details" && selectedAssetForDetails) {
    return (
      <SiteAssetDetailsPage
        site={selectedAssetForDetails.site}
        asset={selectedAssetForDetails.asset}
        equipmentLogs={equipmentLogs}
        consumableLogs={consumableLogs}
        waybills={waybills}
        employees={employees}
        currentUser={currentUser}
        onBack={handleBackToDashboard}
        onAddEquipmentLog={handleAddEquipmentLog}
        onUpdateEquipmentLog={handleUpdateEquipmentLog}
        onAddConsumableLog={handleAddConsumableLog}
        onUpdateConsumableLog={handleUpdateConsumableLog}
        initialTab={selectedAssetForDetails.initialTab}
        companySettings={companySettings}
        isReadOnly={true}
      />
    );
  }
  if (view === "asset-analytics" && selectedAssetForDetails) {
    return (
      <AssetAnalyticsPage
        asset={selectedAssetForDetails.asset}
        onBack={handleBackToDashboard}
        sites={sites}
      />
    );
  }
  if (view === "site-machine-analytics" && selectedSiteForAnalytics) {
    const siteEquipment = assets.filter((a) => a.type === "equipment");
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleBackToDashboard}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{selectedSiteForAnalytics.name} — Machine Analytics</h1>
            <p className="text-sm text-muted-foreground">Equipment performance overview</p>
          </div>
        </div>
        <div className="p-4">
          <SiteWideMachineAnalyticsView
            site={selectedSiteForAnalytics}
            equipmentLogs={equipmentLogs}
            equipment={siteEquipment}
          />
        </div>
      </div>
    );
  }
  if (view === "site-consumable-analytics" && selectedSiteForAnalytics) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center gap-4 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={handleBackToDashboard}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">
              {selectedSiteForAnalytics.name} — Consumable Analytics
            </h1>
            <p className="text-sm text-muted-foreground">Usage and consumption overview</p>
          </div>
        </div>
        <div className="p-4">
          <SiteConsumablesAnalyticsView
            site={selectedSiteForAnalytics}
            consumableLogs={consumableLogs}
            assets={assets}
          />
        </div>
      </div>
    );
  }

  // ── Site header card helper ───────────────────────────────────────────────
  const SiteHeader = ({
    site,
    type,
    itemCount,
  }: {
    site: Site;
    type: "equipment" | "consumable";
    itemCount: number;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-primary/10 shrink-0">
          {type === "equipment" ? (
            <Wrench className="h-4 w-4 text-primary" />
          ) : (
            <Package className="h-4 w-4 text-primary" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base leading-tight">{site.name}</h3>
            {site.clientName && (
              <Badge variant="outline" className="text-xs font-normal">
                {site.clientName}
              </Badge>
            )}
            <Badge
              variant={site.status === "active" ? "default" : "secondary"}
              className="text-xs"
            >
              {site.status}
            </Badge>
          </div>
          {site.location && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{site.location}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {itemCount} {type === "equipment" ? "machine" : "consumable"}
            {itemCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 self-start sm:self-center"
        onClick={() => handleOpenBulkLog(site, type)}
      >
        <Layers className="h-3.5 w-3.5 mr-1.5" />
        Bulk Log
      </Button>
    </div>
  );

  // ── Main Dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-base sm:text-xl font-bold text-foreground">Site Worker Portal</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Welcome, {currentUser?.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </header>

      {/* Admin simulation banner */}
      {isSimulated && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-4 sm:px-6 py-2 flex justify-between items-center text-yellow-700 dark:text-yellow-400 text-sm backdrop-blur-sm">
          <span className="text-xs sm:text-sm">You are viewing as Site Worker (Admin View)</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onExit}
            className="bg-background border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-900 dark:text-yellow-400 text-xs"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Exit Application View
          </Button>
        </div>
      )}

      <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-5xl mx-auto w-full space-y-4 sm:space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab triggers — always show label text */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="requests" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4 shrink-0" />
              Requests
            </TabsTrigger>
            <TabsTrigger value="machines" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Wrench className="h-4 w-4 shrink-0" />
              Machines
            </TabsTrigger>
            <TabsTrigger value="consumables" className="flex items-center gap-1.5 text-xs sm:text-sm">
              <Package className="h-4 w-4 shrink-0" />
              Consumables
            </TabsTrigger>
          </TabsList>

          {/* ── Requests tab ── */}
          <TabsContent value="requests" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  New Request
                </h2>
                <RequestForm onSuccess={() => { }} />
              </div>
              <div className="space-y-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  My Requests
                </h2>
                <RequestList />
              </div>
            </div>
          </TabsContent>

          {/* ── Machines tab ── */}
          <TabsContent value="machines" className="mt-4 space-y-6">
            {activeSites.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">No active sites</p>
                  <p className="text-sm text-muted-foreground">
                    There are currently no active sites with machines assigned.
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeSites.map((site, idx) => {
                const siteEquipment = assets.filter(
                  (a) =>
                    a.type === "equipment" &&
                    a.requiresLogging === true &&
                    (String(a.siteId) === String(site.id) ||
                      (a.siteQuantities &&
                        (a.siteQuantities[String(site.id)] !== undefined ||
                          a.siteQuantities[site.id] !== undefined)))
                );
                return (
                  <div key={site.id}>
                    {idx > 0 && <Separator className="mb-6" />}
                    <Card className="border border-border/60">
                      <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
                        <SiteHeader site={site} type="equipment" itemCount={siteEquipment.length} />
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4">
                        <MachinesSection
                          site={site}
                          assets={assets}
                          equipmentLogs={equipmentLogs}
                          employees={employees}
                          waybills={waybills}
                          currentUser={currentUser}
                          showAdminControls={false}
                          onAddEquipmentLog={handleAddEquipmentLog}
                          onUpdateEquipmentLog={handleUpdateEquipmentLog}
                          onViewAssetDetails={(asset) => handleViewAssetDetails(site, asset)}
                          onViewAnalytics={() => handleViewSiteMachineAnalytics(site)}
                          onViewAssetHistory={(asset) =>
                            handleViewAssetDetails(site, asset, "history")
                          }
                          onViewAssetAnalytics={(asset) =>
                            handleViewAssetDetails(site, asset, "analytics")
                          }
                        />
                      </CardContent>
                    </Card>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ── Consumables tab ── */}
          <TabsContent value="consumables" className="mt-4 space-y-6">
            {activeSites.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <Package className="h-10 w-10 text-muted-foreground" />
                  <p className="text-muted-foreground font-medium">No active sites</p>
                  <p className="text-sm text-muted-foreground">
                    There are currently no active sites with consumables assigned.
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeSites.map((site, idx) => {
                const siteConsumables = assets.filter(
                  (a) =>
                    a.type === "consumable" &&
                    (String(a.siteId) === String(site.id) ||
                      (a.siteQuantities &&
                        (a.siteQuantities[String(site.id)] !== undefined ||
                          a.siteQuantities[site.id] !== undefined)))
                );
                return (
                  <div key={site.id}>
                    {idx > 0 && <Separator className="mb-6" />}
                    <Card className="border border-border/60">
                      <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
                        <SiteHeader site={site} type="consumable" itemCount={siteConsumables.length} />
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4">
                        <ConsumablesSection
                          site={site}
                          assets={assets}
                          employees={employees}
                          waybills={waybills}
                          consumableLogs={consumableLogs}
                          onAddConsumableLog={handleAddConsumableLog}
                          onUpdateConsumableLog={handleUpdateConsumableLog}
                          onViewAssetDetails={(asset) => handleViewAssetDetails(site, asset)}
                          onViewAnalytics={() => handleViewSiteConsumableAnalytics(site)}
                          onViewAssetHistory={(asset) =>
                            handleViewAssetDetails(site, asset, "history")
                          }
                          onViewAssetAnalytics={(asset) =>
                            handleViewAssetDetails(site, asset, "analytics")
                          }
                        />
                      </CardContent>
                    </Card>
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Bulk Log Dialog */}
      {bulkLogSite && (
        <BulkLogDialog
          open={bulkLogOpen}
          onOpenChange={setBulkLogOpen}
          site={bulkLogSite}
          assets={assets}
          employees={employees}
          type={bulkLogType}
          onSaveEquipmentLogs={handleBulkSaveEquipmentLogs}
          onSaveConsumableLogs={handleBulkSaveConsumableLogs}
        />
      )}
    </div>
  );
};
