import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Asset } from "@/types/asset";
import { Trash2, Edit, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activityLogger";

interface BulkAssetOperationsProps {
    selectedAssets: Asset[];
    onClearSelection: () => void;
    onBulkDelete: (assetIds: string[]) => Promise<void>;
    onBulkUpdate: (assetIds: string[], updates: Partial<Asset>) => Promise<void>;
}

export const BulkAssetOperations = ({
    selectedAssets,
    onClearSelection,
    onBulkDelete,
    onBulkUpdate,
}: BulkAssetOperationsProps) => {
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Bulk edit state
    const [bulkEditData, setBulkEditData] = useState<{
        status?: Asset['status'];
        condition?: Asset['condition'];
        category?: Asset['category'];
        type?: Asset['type'];
        location?: string;
        lowStockLevel?: number;
        criticalStockLevel?: number;
    }>({});

    const handleBulkDelete = async () => {
        setIsProcessing(true);
        try {
            const assetIds = selectedAssets.map(a => a.id);
            await onBulkDelete(assetIds);

            await logActivity({
                action: 'delete',
                entity: 'asset',
                details: `Bulk deleted ${selectedAssets.length} assets: ${selectedAssets.map(a => a.name).join(', ')}`
            });

            toast({
                title: "Assets Deleted",
                description: `Successfully deleted ${selectedAssets.length} asset(s)`,
            });

            setShowDeleteDialog(false);
            onClearSelection();
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete assets",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkEdit = async () => {
        // Filter out undefined values
        const updates: Partial<Asset> = {};
        Object.entries(bulkEditData).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                (updates as Record<string, unknown>)[key] = value;
            }
        });

        if (Object.keys(updates).length === 0) {
            toast({
                title: "No Changes",
                description: "Please select at least one field to update",
                variant: "destructive",
            });
            return;
        }

        setIsProcessing(true);
        try {
            const assetIds = selectedAssets.map(a => a.id);
            await onBulkUpdate(assetIds, updates);

            await logActivity({
                action: 'update',
                entity: 'asset',
                details: `Bulk updated ${selectedAssets.length} assets with: ${Object.keys(updates).join(', ')}`
            });

            toast({
                title: "Assets Updated",
                description: `Successfully updated ${selectedAssets.length} asset(s)`,
            });

            setShowEditDialog(false);
            setBulkEditData({});
            onClearSelection();
        } catch (error) {
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update assets",
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    if (selectedAssets.length === 0) return null;

    return (
        <>
            {/* Floating Action Bar */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
                <div className="bg-card border shadow-2xl rounded-full px-6 py-3 flex items-center gap-4">
                    <Badge variant="secondary" className="px-3 py-1">
                        {selectedAssets.length} selected
                    </Badge>

                    <div className="h-6 w-px bg-border" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEditDialog(true)}
                        className="gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Bulk Edit
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                        className="gap-2 text-destructive hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete All
                    </Button>

                    <div className="h-6 w-px bg-border" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearSelection}
                        className="gap-2"
                    >
                        <X className="h-4 w-4" />
                        Clear
                    </Button>
                </div>
            </div>

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Bulk Delete
                        </DialogTitle>
                        <DialogDescription>
                            You are about to permanently delete {selectedAssets.length} asset(s). This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-60 overflow-y-auto space-y-2 my-4">
                        <p className="text-sm font-medium mb-2">Assets to be deleted:</p>
                        {selectedAssets.map(asset => (
                            <div key={asset.id} className="flex items-center justify-between p-2 bg-muted rounded-md">
                                <span className="text-sm font-medium">{asset.name}</span>
                                <Badge variant="outline">{asset.category}</Badge>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBulkDelete}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Deleting..." : `Delete ${selectedAssets.length} Asset(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Bulk Edit Assets</DialogTitle>
                        <DialogDescription>
                            Update {selectedAssets.length} asset(s) at once. Only fields you change will be updated.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 my-4">
                        {/* Status */}
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                value={bulkEditData.status || ""}
                                onValueChange={(value) => setBulkEditData({ ...bulkEditData, status: value as Asset['status'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Keep current status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="damaged">Damaged</SelectItem>
                                    <SelectItem value="missing">Missing</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Condition */}
                        <div className="space-y-2">
                            <Label>Condition</Label>
                            <Select
                                value={bulkEditData.condition || ""}
                                onValueChange={(value) => setBulkEditData({ ...bulkEditData, condition: value as Asset['condition'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Keep current condition" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="excellent">Excellent</SelectItem>
                                    <SelectItem value="good">Good</SelectItem>
                                    <SelectItem value="fair">Fair</SelectItem>
                                    <SelectItem value="poor">Poor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select
                                value={bulkEditData.category || ""}
                                onValueChange={(value) => setBulkEditData({ ...bulkEditData, category: value as Asset['category'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Keep current category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="dewatering">Dewatering</SelectItem>
                                    <SelectItem value="waterproofing">Waterproofing</SelectItem>
                                    <SelectItem value="tiling">Tiling</SelectItem>
                                    <SelectItem value="ppe">PPE</SelectItem>
                                    <SelectItem value="office">Office</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Type */}
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                value={bulkEditData.type || ""}
                                onValueChange={(value) => setBulkEditData({ ...bulkEditData, type: value as Asset['type'] })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Keep current type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="equipment">Equipment</SelectItem>
                                    <SelectItem value="tools">Tools</SelectItem>
                                    <SelectItem value="consumable">Consumable</SelectItem>
                                    <SelectItem value="non-consumable">Reuseables</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Input
                                placeholder="Keep current location"
                                value={bulkEditData.location || ""}
                                onChange={(e) => setBulkEditData({ ...bulkEditData, location: e.target.value })}
                            />
                        </div>

                        {/* Stock Levels */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Low Stock Level</Label>
                                <Input
                                    type="number"
                                    placeholder="Keep current"
                                    value={bulkEditData.lowStockLevel || ""}
                                    onChange={(e) => setBulkEditData({ ...bulkEditData, lowStockLevel: parseInt(e.target.value) || undefined })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Critical Stock Level</Label>
                                <Input
                                    type="number"
                                    placeholder="Keep current"
                                    value={bulkEditData.criticalStockLevel || ""}
                                    onChange={(e) => setBulkEditData({ ...bulkEditData, criticalStockLevel: parseInt(e.target.value) || undefined })}
                                />
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="border rounded-md p-4 bg-muted/50">
                            <p className="text-sm font-medium mb-2">Assets to be updated:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {selectedAssets.map(asset => (
                                    <div key={asset.id} className="text-sm text-muted-foreground">
                                        • {asset.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowEditDialog(false);
                                setBulkEditData({});
                            }}
                            disabled={isProcessing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkEdit}
                            disabled={isProcessing}
                            className="bg-gradient-primary"
                        >
                            {isProcessing ? "Updating..." : `Update ${selectedAssets.length} Asset(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
