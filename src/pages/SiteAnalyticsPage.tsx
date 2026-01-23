import { useState } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Site, Asset } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { SiteWideMachineAnalyticsView } from "@/components/sites/SiteWideMachineAnalyticsView";
import { SiteConsumablesAnalyticsView } from "@/components/sites/SiteConsumablesAnalyticsView";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SiteAnalyticsPageProps {
    site: Site;
    assets: Asset[];
    equipmentLogs: EquipmentLog[];
    consumableLogs: ConsumableUsageLog[];
    onBack: () => void;
    defaultTab?: 'equipment' | 'consumables';
}

export const SiteAnalyticsPage = ({
    site,
    assets,
    equipmentLogs,
    consumableLogs,
    onBack,
    defaultTab = 'equipment'
}: SiteAnalyticsPageProps) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<string>(defaultTab);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    const tabs = [
        { value: 'equipment', label: 'Equipment' },
        { value: 'consumables', label: 'Consumables' }
    ];

    return (
        <div className="flex flex-col h-full bg-background animate-fade-in">
            {/* Header - Mobile optimized */}
            <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6 border-b sticky top-0 bg-background z-10">
                <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onBack} 
                    className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-2xl font-bold tracking-tight flex items-center gap-2 truncate">
                        <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-primary shrink-0" />
                        <span className="truncate">{site.name} Analytics</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                        Comprehensive equipment and consumable usage data
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-6">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-4 sm:space-y-6">
                    {/* Mobile dropdown or desktop tabs */}
                    {isMobile ? (
                        <Select value={activeTab} onValueChange={handleTabChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select view" />
                            </SelectTrigger>
                            <SelectContent>
                                {tabs.map(tab => (
                                    <SelectItem key={tab.value} value={tab.value}>
                                        {tab.label} Analytics
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="equipment">Equipment Analytics</TabsTrigger>
                            <TabsTrigger value="consumables">Consumables Tracking</TabsTrigger>
                        </TabsList>
                    )}

                    <TabsContent value="equipment" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        <SiteWideMachineAnalyticsView
                            site={site}
                            equipment={assets}
                            equipmentLogs={equipmentLogs}
                        />
                    </TabsContent>

                    <TabsContent value="consumables" className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-2">
                        <SiteConsumablesAnalyticsView
                            site={site}
                            assets={assets}
                            consumableLogs={consumableLogs}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
