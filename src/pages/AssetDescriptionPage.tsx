import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { logger } from "@/lib/logger";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Tag, Layers, MapPin, Box } from "lucide-react";
import { dataService } from "@/services/dataService";
import { Asset } from "@/types/asset";
import { Badge } from "@/components/ui/badge";

const AssetDescriptionPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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
            } catch (error) {
                logger.error('Failed to load asset data', error);
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
                        <FileText className="h-5 w-5" />
                        Asset Details
                    </h1>
                    <p className="text-sm text-muted-foreground">{asset.name}</p>
                </div>
            </div>

            <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
                <Card className="bg-card">
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-lg">{asset.name}</h3>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{asset.category}</Badge>
                                <Badge variant="secondary" className="capitalize">{asset.type}</Badge>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Description</h4>
                            <div className="bg-muted/30 p-4 rounded-md">
                                <p className="text-base leading-relaxed whitespace-pre-wrap">
                                    {asset.description || 'No description available for this asset.'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="flex items-start gap-2">
                                <Box className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Stock</p>
                                    <p className="font-medium">{asset.quantity} {asset.unitOfMeasurement}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                <div>
                                    <p className="text-xs text-muted-foreground">Location</p>
                                    <p className="font-medium truncate">{asset.location || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AssetDescriptionPage;
