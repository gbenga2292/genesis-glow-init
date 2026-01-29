import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppData } from "@/contexts/AppDataContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { RequestForm } from "@/components/requests/RequestForm";
import { RequestList } from "@/components/requests/RequestList";
import { MachinesSection } from "@/components/sites/MachinesSection";
import { ConsumablesSection } from "@/components/sites/ConsumablesSection";
import { SiteAssetDetailsPage } from "@/pages/SiteAssetDetailsPage";
import { Asset, Site } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { dataService } from "@/services/dataService";
import { LogOut, Wrench, FileText, ClipboardList, Clock, ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SiteWorkerDashboardProps {
    onExit?: () => void;
    isSimulated?: boolean;
}

export const SiteWorkerDashboard = ({ onExit, isSimulated }: SiteWorkerDashboardProps) => {
    const { currentUser, logout } = useAuth();
    const { sites, equipmentLogs, setEquipmentLogs, employees } = useAppData();

    // Local state for data not in AppDataContext
    const [assets, setAssets] = useState<Asset[]>([]);
    const [waybills, setWaybills] = useState<any[]>([]);
    const [consumableLogs, setConsumableLogs] = useState<ConsumableUsageLog[]>([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [loadedAssets, loadedWaybills, loadedConsumableLogs] = await Promise.all([
                    dataService.assets.getAssets(),
                    dataService.waybills.getWaybills(),
                    dataService.consumableLogs.getConsumableLogs()
                ]);

                setAssets(loadedAssets.map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt),
                    updatedAt: new Date(item.updatedAt),
                    siteQuantities: typeof item.siteQuantities === 'string' ? JSON.parse(item.siteQuantities) : item.siteQuantities || {}
                })));

                setWaybills(loadedWaybills.map((item: any) => ({
                    ...item,
                    issueDate: new Date(item.issueDate),
                    createdAt: new Date(item.createdAt)
                })));

                setConsumableLogs(loadedConsumableLogs.map((item: any) => ({
                    ...item,
                    date: new Date(item.date),
                    createdAt: new Date(item.createdAt)
                })));

            } catch (error) {
                console.error("Failed to load dashboard data", error);
            }
        };
        loadData();
    }, []);

    // View State
    const [view, setView] = useState<'dashboard' | 'asset-details'>('dashboard');
    const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<{ site: Site, asset: Asset } | null>(null);
    const [activeTab, setActiveTab] = useState("requests");

    // Filter sites? For now show all active sites.
    const activeSites = sites.filter(s => s.status === 'active');

    const handleViewAssetDetails = (site: Site, asset: Asset) => {
        setSelectedAssetForDetails({ site, asset });
        setView('asset-details');
    };

    const handleBackToDashboard = () => {
        setView('dashboard');
        setSelectedAssetForDetails(null);
    };

    const handleAddEquipmentLog = async (log: EquipmentLog) => {
        try {
            const saved = await dataService.equipmentLogs.createEquipmentLog(log);
            setEquipmentLogs(prev => [...prev, saved]);
        } catch (error) {
            console.error(error);
            // Error handling usually in component
        }
    };

    const handleUpdateEquipmentLog = async (log: EquipmentLog) => {
        try {
            const saved = await dataService.equipmentLogs.updateEquipmentLog(Number(log.id), log); // Ensure ID type match
            setEquipmentLogs(prev => prev.map(l => l.id === log.id ? saved : l));
        } catch (error) {
            console.error(error);
        }
    };

    // Consumable logs handlers (if needed by SiteAssetDetailsPage)
    const handleAddConsumableLog = async (log: ConsumableUsageLog) => {
        try {
            const saved = await dataService.consumableLogs.createConsumableLog(log);
            setConsumableLogs(prev => [...prev, saved]);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateConsumableLog = async (log: ConsumableUsageLog) => {
        try {
            const saved = await dataService.consumableLogs.updateConsumableLog(log.id, log);
            setConsumableLogs(prev => prev.map(l => l.id === log.id ? saved : l));
        } catch (error) {
            console.error(error);
        }
    };

    if (view === 'asset-details' && selectedAssetForDetails) {
        return (
            <SiteAssetDetailsPage
                site={selectedAssetForDetails.site}
                asset={selectedAssetForDetails.asset}
                equipmentLogs={equipmentLogs}
                consumableLogs={consumableLogs}
                waybills={waybills}
                employees={employees}
                onBack={handleBackToDashboard}
                onAddEquipmentLog={handleAddEquipmentLog}
                onUpdateEquipmentLog={handleUpdateEquipmentLog}
                onAddConsumableLog={handleAddConsumableLog}
                onUpdateConsumableLog={handleUpdateConsumableLog}
            />
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col transition-colors duration-300">
            {/* Minimal Header */}
            <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-foreground">Site Worker Portal</h1>
                    <p className="text-sm text-muted-foreground">Welcome, {currentUser?.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                </Button>
            </header>

            {isSimulated && (
                <div className="bg-yellow-500/15 border-b border-yellow-500/30 px-6 py-2 flex justify-between items-center text-yellow-700 dark:text-yellow-400 text-sm backdrop-blur-sm">
                    <span>You are viewing as Site Worker (Admin View)</span>
                    <Button variant="outline" size="sm" onClick={onExit} className="bg-background border-yellow-500/50 hover:bg-yellow-500/10 text-yellow-900 dark:text-yellow-400">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Exit Application View
                    </Button>
                </div>
            )}

            <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="requests">
                            <FileText className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Requests</span>
                            <span className="sm:hidden">Reqs</span>
                        </TabsTrigger>
                        <TabsTrigger value="machines">
                            <Wrench className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Machines</span>
                            <span className="sm:hidden">Mach</span>
                        </TabsTrigger>
                        <TabsTrigger value="consumables">
                            <Package className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Consumables</span>
                            <span className="sm:hidden">Cons</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="requests" className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold flex items-center">
                                    <ClipboardList className="h-5 w-5 mr-2" />
                                    New Request
                                </h2>
                                <RequestForm onSuccess={() => {
                                    // Trigger refresh of list if needed
                                }} />
                            </div>
                            <div className="space-y-6">
                                <h2 className="text-lg font-semibold flex items-center">
                                    <Clock className="h-5 w-5 mr-2" />
                                    My Requests
                                </h2>
                                <RequestList />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="machines" className="space-y-6 mt-6">
                        <h2 className="text-lg font-semibold">Select Machine to Log</h2>
                        {activeSites.map(site => (
                            <MachinesSection
                                key={site.id}
                                site={site}
                                assets={assets}
                                equipmentLogs={equipmentLogs}
                                employees={employees}
                                waybills={waybills}
                                onAddEquipmentLog={handleAddEquipmentLog}
                                onUpdateEquipmentLog={handleUpdateEquipmentLog}
                                onViewAssetDetails={(asset) => handleViewAssetDetails(site, asset)}
                                onViewAnalytics={undefined}
                                onViewAssetHistory={undefined}
                                onViewAssetAnalytics={undefined}
                            />
                        ))}
                    </TabsContent>

                    <TabsContent value="consumables" className="space-y-6 mt-6">
                        <h2 className="text-lg font-semibold">Select Consumable to Log</h2>
                        {activeSites.map(site => (
                            <ConsumablesSection
                                key={site.id}
                                site={site}
                                assets={assets}
                                employees={employees}
                                waybills={waybills}
                                consumableLogs={consumableLogs}
                                onAddConsumableLog={handleAddConsumableLog}
                                onUpdateConsumableLog={handleUpdateConsumableLog}
                                onViewAssetDetails={(asset) => handleViewAssetDetails(site, asset)}
                                onViewAnalytics={undefined}
                                onViewAssetHistory={undefined}
                                onViewAssetAnalytics={undefined}
                            />
                        ))}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
};
