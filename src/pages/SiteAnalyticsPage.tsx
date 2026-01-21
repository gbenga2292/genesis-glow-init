import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Site, Asset } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { SiteWideMachineAnalyticsView } from "@/components/sites/SiteWideMachineAnalyticsView";
import { SiteConsumablesAnalyticsView } from "@/components/sites/SiteConsumablesAnalyticsView";

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
    return (
        <div className="flex flex-col h-full bg-background animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        {site.name} Analytics
                    </h1>
                    <p className="text-muted-foreground">
                        Comprehensive equipment and consumable usage data and insights
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                <Tabs defaultValue={defaultTab} className="w-full space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="equipment">Equipment Analytics</TabsTrigger>
                        <TabsTrigger value="consumables">Consumables Tracking</TabsTrigger>
                    </TabsList>

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
