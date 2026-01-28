import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Package, ArrowLeft } from "lucide-react";
import { dataService } from "@/services/dataService";
import { Asset } from "@/types/asset";

const RestockHistoryPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [restockLogs, setRestockLogs] = useState<any[]>([]);
    const [asset, setAsset] = useState<Asset | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                // Fetch asset details
                const assets = await dataService.assets.getAssets();
                const foundAsset = assets.find((a: Asset) => a.id === id);
                setAsset(foundAsset || null);

                // Fetch logs
                if (window.electronAPI && window.electronAPI.db) {
                    const logs = await window.electronAPI.db.getEquipmentLogs();
                    const filteredLogs = logs.filter((log: any) =>
                        log.type === 'restock' && log.assetId === id
                    );
                    setRestockLogs(filteredLogs);
                }
            } catch (error) {
                logger.error('Failed to load restock history data', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    if (loading) {
        return <div className="p-4 text-center">Loading...</div>;
    }

    if (!asset) {
        return (
            <div className="p-4 flex flex-col items-center justify-center min-h-screen">
                <p className="text-muted-foreground mb-4">Asset not found</p>
                <Button onClick={() => navigate(-1)}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-4 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-lg font-semibold flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Restock History
                    </h1>
                    <p className="text-sm text-muted-foreground">{asset.name}</p>
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
                {restockLogs.length === 0 ? (
                    <div className="text-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No restock history found for this asset</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {restockLogs.map((log) => (
                            <Card key={log.id} className="bg-card">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default">
                                                Restock
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-primary">
                                                +{log.quantity} units
                                            </div>
                                            {log.unitCost && (
                                                <div className="text-sm text-muted-foreground">
                                                    Unit Cost: ₦{log.unitCost.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {log.notes && (
                                        <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RestockHistoryPage;
