import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Asset, Site, Waybill, CompanySettings, Employee } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { SiteInventoryItem } from "@/types/inventory";
import { MapPin, FileText, Package, Activity, Eye, ArrowLeft } from "lucide-react";
import { MachinesSection } from "./MachinesSection";
import { ConsumablesSection } from "./ConsumablesSection";
import { cn } from "@/lib/utils";

interface SiteInventoryPageProps {
    site: Site;
    assets: Asset[];
    waybills: Waybill[];
    equipmentLogs: EquipmentLog[];
    consumableLogs: ConsumableUsageLog[];
    employees: Employee[];
    companySettings?: CompanySettings;
    getSiteInventory: (siteId: string) => SiteInventoryItem[];
    isMobile?: boolean;
    onBack: () => void;
    onCreateReturnWaybill: () => void;
    onShowTransactions: () => void;
    onGenerateReport: () => void;
    onViewWaybill: (waybill: Waybill) => void;
    onAddEquipmentLog: (log: EquipmentLog) => void;
    onUpdateEquipmentLog: (log: EquipmentLog) => void;
    onAddConsumableLog: (log: ConsumableUsageLog) => void;
    onUpdateConsumableLog: (log: ConsumableUsageLog) => void;
    onViewAnalyticsEquipment?: () => void;
    onViewAnalyticsConsumables?: () => void;
    onViewAssetDetails?: (asset: Asset) => void;
    onViewAssetHistory?: (asset: Asset) => void;
    onViewAssetAnalytics?: (asset: Asset) => void;
}

type TabId = 'materials' | 'machines' | 'consumables' | 'waybills';

export const SiteInventoryPage: React.FC<SiteInventoryPageProps> = ({
    site, assets, waybills, equipmentLogs, consumableLogs, employees,
    companySettings, getSiteInventory, onBack, onCreateReturnWaybill,
    onShowTransactions, onGenerateReport, onViewWaybill,
    onAddEquipmentLog, onUpdateEquipmentLog, onAddConsumableLog, onUpdateConsumableLog,
    onViewAnalyticsEquipment, onViewAnalyticsConsumables,
    onViewAssetDetails, onViewAssetHistory, onViewAssetAnalytics,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('materials');
    const materialsAtSite = getSiteInventory(site.id);
    const siteWaybills = waybills.filter(w => String(w.siteId) === String(site.id));

    const tabs: { id: TabId; label: string; count: number | null }[] = [
        { id: 'materials', label: 'Materials', count: materialsAtSite.length },
        { id: 'machines', label: 'Machines', count: null },
        { id: 'consumables', label: 'Consumables', count: null },
        { id: 'waybills', label: 'Waybills', count: siteWaybills.length },
    ];

    return (
        <div className="flex flex-col h-full animate-fade-in">

            {/* ── Compact sticky header ── */}
            <div className="flex items-center justify-between gap-3 pb-3 mb-0 border-b border-border/60">
                <div className="flex items-center gap-3 min-w-0">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-base font-semibold text-foreground truncate leading-tight">
                            {site.name}
                        </h1>
                        {site.location && (
                            <p className="text-xs text-muted-foreground truncate">{site.location}</p>
                        )}
                    </div>
                    <Badge
                        variant={site.status === 'active' ? 'default' : 'secondary'}
                        className="text-[10px] h-4 px-1.5 shrink-0"
                    >
                        {site.status}
                    </Badge>
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" className="h-8 text-xs px-3" onClick={onCreateReturnWaybill}>
                                    <FileText className="h-3.5 w-3.5 mr-1.5" />
                                    Return Waybill
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Create Return Waybill</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={onShowTransactions}>
                                    <Activity className="h-3.5 w-3.5 mr-1.5" />
                                    Transactions
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>View Transactions</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={onGenerateReport}>
                                    <FileText className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Generate Report</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {/* ── Tab strip ── */}
            <div className="flex border-b border-border/60 gap-0 -mx-0 mb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab.label}
                        {tab.count !== null && (
                            <span className={cn(
                                "rounded-full px-1.5 text-[10px] font-semibold",
                                activeTab === tab.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                            )}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto">

                {/* Materials */}
                {activeTab === 'materials' && (
                    <div>
                        {materialsAtSite.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">No materials currently at this site.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {materialsAtSite.map((item) => (
                                    <div key={item.assetId} className="flex items-center justify-between py-3 gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{item.itemName}</p>
                                                {item.itemType && (
                                                    <p className="text-xs text-muted-foreground">{item.itemType}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={cn("text-sm font-semibold", item.quantity === 0 ? 'text-destructive' : 'text-foreground')}>
                                                {item.quantity}{' '}
                                                <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(item.lastUpdated).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Machines */}
                {activeTab === 'machines' && (
                    <MachinesSection
                        site={site}
                        assets={assets}
                        equipmentLogs={equipmentLogs}
                        employees={employees}
                        waybills={waybills}
                        companySettings={companySettings}
                        onAddEquipmentLog={onAddEquipmentLog}
                        onUpdateEquipmentLog={onUpdateEquipmentLog}
                        onViewAnalytics={onViewAnalyticsEquipment}
                        onViewAssetDetails={onViewAssetDetails}
                        onViewAssetHistory={onViewAssetHistory}
                        onViewAssetAnalytics={onViewAssetAnalytics}
                    />
                )}

                {/* Consumables */}
                {activeTab === 'consumables' && (
                    <ConsumablesSection
                        site={site}
                        assets={assets}
                        employees={employees}
                        waybills={waybills}
                        consumableLogs={consumableLogs}
                        onAddConsumableLog={onAddConsumableLog}
                        onUpdateConsumableLog={onUpdateConsumableLog}
                        onViewAnalytics={onViewAnalyticsConsumables}
                        onViewAssetDetails={onViewAssetDetails}
                        onViewAssetHistory={onViewAssetHistory}
                        onViewAssetAnalytics={onViewAssetAnalytics}
                    />
                )}

                {/* Waybills */}
                {activeTab === 'waybills' && (
                    <div>
                        {siteWaybills.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">No waybills for this site.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {siteWaybills.map((waybill) => {
                                    const statusColor =
                                        waybill.status === 'return_completed' ? 'text-emerald-500' :
                                            waybill.status === 'outstanding' ? 'text-amber-500' :
                                                waybill.status === 'partial_returned' ? 'text-blue-500' : 'text-muted-foreground';
                                    return (
                                        <div key={waybill.id} className="flex items-center justify-between py-3 gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate font-mono">{waybill.id}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {waybill.driverName} · {waybill.items.length} item{waybill.items.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className={cn("text-xs font-medium capitalize", statusColor)}>
                                                    {waybill.status.replace(/_/g, ' ')}
                                                </span>
                                                <Button
                                                    onClick={() => onViewWaybill(waybill)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
