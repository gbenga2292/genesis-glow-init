import { useState, useEffect } from "react";
import { ResponsiveFormContainer } from "@/components/ui/responsive-form-container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Site, Asset, Employee } from "@/types/asset";
import { EquipmentLog, DowntimeEntry } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, Wrench, Package2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BulkLogDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    site: Site;
    assets: Asset[];
    employees: Employee[];
    type: 'equipment' | 'consumable';
    onSaveEquipmentLogs?: (logs: EquipmentLog[]) => Promise<void>;
    onSaveConsumableLogs?: (logs: ConsumableUsageLog[]) => Promise<void>;
}

export const BulkLogDialog = ({
    open,
    onOpenChange,
    site,
    assets,
    employees,
    type,
    onSaveEquipmentLogs,
    onSaveConsumableLogs
}: BulkLogDialogProps) => {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

    const [itemValues, setItemValues] = useState<Record<string, { quantity?: string; diesel?: string }>>({});

    // Shared form state for bulk entry
    const [sharedEquipmentForm, setSharedEquipmentForm] = useState({
        active: true,
        supervisorOnSite: "",
        clientFeedback: "",
        issuesOnSite: "",
        maintenanceDetails: ""
    });

    const [sharedConsumableForm, setSharedConsumableForm] = useState({
        usedFor: "",
        usedBy: "",
        notes: ""
    });

    // Filter assets by type and site
    const siteAssets = assets.filter(asset => {
        if (type === 'equipment') {
            return asset.type === 'equipment' && asset.requiresLogging;
        }
        return asset.type === 'consumable';
    }).filter(asset => {
        const siteId = String(site.id);
        return String(asset.siteId) === siteId ||
            (asset.siteQuantities && (asset.siteQuantities[siteId] !== undefined || asset.siteQuantities[site.id] !== undefined));
    });

    // Reset form when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedAssetIds([]);
            setSelectedDate(new Date());
            setItemValues({});
            setSharedEquipmentForm({
                active: true,
                supervisorOnSite: "",
                clientFeedback: "",
                issuesOnSite: "",
                maintenanceDetails: ""
            });
            setSharedConsumableForm({
                usedFor: "",
                usedBy: "",
                notes: ""
            });
        }
    }, [open]);

    const toggleAsset = (assetId: string) => {
        setSelectedAssetIds(prev =>
            prev.includes(assetId)
                ? prev.filter(id => id !== assetId)
                : [...prev, assetId]
        );
    };

    const selectAll = () => {
        if (selectedAssetIds.length === siteAssets.length) {
            setSelectedAssetIds([]);
        } else {
            setSelectedAssetIds(siteAssets.map(a => a.id));
        }
    };

    const handleSave = async () => {
        if (selectedAssetIds.length === 0) {
            toast({ title: "No items selected", description: "Please select at least one item to log.", variant: "destructive" });
            return;
        }

        setSaving(true);

        try {
            if (type === 'equipment' && onSaveEquipmentLogs) {
                const logs: EquipmentLog[] = selectedAssetIds.map(assetId => {
                    const asset = assets.find(a => a.id === assetId);
                    const dieselVal = itemValues[assetId]?.diesel;
                    return {
                        id: `${Date.now()}-${assetId}`,
                        equipmentId: assetId,
                        equipmentName: asset?.name || "Unknown",
                        siteId: site.id,
                        date: selectedDate,
                        active: sharedEquipmentForm.active,
                        downtimeEntries: [],
                        maintenanceDetails: sharedEquipmentForm.maintenanceDetails || undefined,
                        dieselEntered: dieselVal ? parseFloat(dieselVal) : undefined,
                        supervisorOnSite: sharedEquipmentForm.supervisorOnSite || undefined,
                        clientFeedback: sharedEquipmentForm.clientFeedback || undefined,
                        issuesOnSite: sharedEquipmentForm.issuesOnSite || undefined,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    } as EquipmentLog;
                });

                await onSaveEquipmentLogs(logs);
                toast({ title: "Logs Created", description: `Created ${logs.length} equipment logs for ${format(selectedDate, 'PPP')}.` });
            } else if (type === 'consumable' && onSaveConsumableLogs) {
                // Validate quantities
                const invalidItems = selectedAssetIds.filter(id => {
                    const qty = parseFloat(itemValues[id]?.quantity || "0");
                    return isNaN(qty) || qty <= 0;
                });

                if (invalidItems.length > 0) {
                    toast({
                        title: "Invalid Quantity",
                        description: `Please enter valid quantities for all selected items.`,
                        variant: "destructive"
                    });
                    setSaving(false);
                    return;
                }

                const logs: ConsumableUsageLog[] = selectedAssetIds.map(assetId => {
                    const asset = assets.find(a => a.id === assetId);
                    const currentQty = asset?.siteQuantities?.[site.id] || 0;
                    const quantityUsed = parseFloat(itemValues[assetId]?.quantity || "0");

                    return {
                        id: `${Date.now()}-${assetId}`,
                        consumableId: assetId,
                        consumableName: asset?.name || "Unknown",
                        siteId: site.id,
                        date: selectedDate,
                        quantityUsed: quantityUsed,
                        quantityRemaining: Math.max(0, currentQty - quantityUsed),
                        unit: asset?.unitOfMeasurement || "units",
                        usedFor: sharedConsumableForm.usedFor,
                        usedBy: sharedConsumableForm.usedBy,
                        notes: sharedConsumableForm.notes || undefined,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    } as ConsumableUsageLog;
                });

                await onSaveConsumableLogs(logs);
                toast({ title: "Logs Created", description: `Created ${logs.length} consumable usage logs for ${format(selectedDate, 'PPP')}.` });
            }

            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save logs.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <ResponsiveFormContainer
            open={open}
            onOpenChange={onOpenChange}
            title={`Bulk ${type === 'equipment' ? 'Machine' : 'Consumable'} Log`}
            subtitle={`Log the same data for multiple ${type === 'equipment' ? 'machines' : 'consumables'} at once. Great for on-site bulk entries.`}
            icon={type === 'equipment' ? <Wrench className="h-5 w-5" /> : <Package2 className="h-5 w-5" />}
        >

            <div className="space-y-4">
                {/* Date Picker */}
                <div className="space-y-2">
                    <Label>Log Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn("w-full justify-start text-left font-normal")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(selectedDate, "PPP")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => date && setSelectedDate(date)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Asset Selection */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Select {type === 'equipment' ? 'Machines' : 'Consumables'} ({selectedAssetIds.length}/{siteAssets.length})</Label>
                        <Button variant="ghost" size="sm" onClick={selectAll}>
                            {selectedAssetIds.length === siteAssets.length ? 'Deselect All' : 'Select All'}
                        </Button>
                    </div>
                    <div className="h-[300px] overflow-y-auto border rounded-md p-2">
                        <div className="space-y-2">
                            {siteAssets.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No {type === 'equipment' ? 'machines' : 'consumables'} at this site.
                                </p>
                            ) : (
                                siteAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        className={cn(
                                            "flex flex-col gap-2 p-2 rounded-md border transition-colors",
                                            selectedAssetIds.includes(asset.id)
                                                ? "bg-primary/5 border-primary/30"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleAsset(asset.id)}>
                                            <Checkbox
                                                checked={selectedAssetIds.includes(asset.id)}
                                                onCheckedChange={() => toggleAsset(asset.id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{asset.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {asset.id}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="shrink-0">
                                                {asset.status || 'Active'}
                                            </Badge>
                                        </div>

                                        {/* Per-item Inputs */}
                                        {selectedAssetIds.includes(asset.id) && (
                                            <div className="pl-7 pr-1 pb-1 animate-in slide-in-from-top-1 duration-200">
                                                {type === 'equipment' ? (
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs w-20 shrink-0">Diesel (L):</Label>
                                                        <Input
                                                            type="number"
                                                            className="h-8 bg-background"
                                                            placeholder="Litres"
                                                            value={itemValues[asset.id]?.diesel || ''}
                                                            onChange={(e) => setItemValues(prev => ({
                                                                ...prev,
                                                                [asset.id]: { ...prev[asset.id], diesel: e.target.value }
                                                            }))}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-xs w-20 shrink-0">Quantity:</Label>
                                                        <Input
                                                            type="number"
                                                            className="h-8 bg-background"
                                                            placeholder={`Used (${asset.unitOfMeasurement || 'units'})`}
                                                            value={itemValues[asset.id]?.quantity || ''}
                                                            onChange={(e) => setItemValues(prev => ({
                                                                ...prev,
                                                                [asset.id]: { ...prev[asset.id], quantity: e.target.value }
                                                            }))}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Form Fields */}
                {type === 'equipment' ? (
                    <div className="space-y-4 border-t pt-4">
                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="active"
                                checked={sharedEquipmentForm.active}
                                onCheckedChange={(checked) => setSharedEquipmentForm(prev => ({ ...prev, active: !!checked }))}
                            />
                            <Label htmlFor="active">Machines were operational today</Label>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Diesel input removed from here - now per machine */}
                            <div className="space-y-2">
                                <Label htmlFor="supervisor">Supervisor on Site</Label>
                                <Select
                                    value={sharedEquipmentForm.supervisorOnSite}
                                    onValueChange={(v) => setSharedEquipmentForm(prev => ({ ...prev, supervisorOnSite: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supervisor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issues">Issues on Site</Label>
                            <Textarea
                                id="issues"
                                placeholder="Any issues encountered..."
                                value={sharedEquipmentForm.issuesOnSite}
                                onChange={(e) => setSharedEquipmentForm(prev => ({ ...prev, issuesOnSite: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="feedback">Client Feedback</Label>
                            <Textarea
                                id="feedback"
                                placeholder="Client feedback if any..."
                                value={sharedEquipmentForm.clientFeedback}
                                onChange={(e) => setSharedEquipmentForm(prev => ({ ...prev, clientFeedback: e.target.value }))}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 border-t pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Quantity input removed from here - now per item */}
                            <div className="space-y-2">
                                <Label htmlFor="usedBy">Used By</Label>
                                <Select
                                    value={sharedConsumableForm.usedBy}
                                    onValueChange={(v) => setSharedConsumableForm(prev => ({ ...prev, usedBy: v }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select person" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees.map(emp => (
                                            <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="usedFor">Used For</Label>
                            <Input
                                id="usedFor"
                                placeholder="e.g., Daily operations, Emergency repair..."
                                value={sharedConsumableForm.usedFor}
                                onChange={(e) => setSharedConsumableForm(prev => ({ ...prev, usedFor: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional notes..."
                                value={sharedConsumableForm.notes}
                                onChange={(e) => setSharedConsumableForm(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 justify-end border-t pt-4 mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving || selectedAssetIds.length === 0}>
                    {saving ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Save {selectedAssetIds.length} Log{selectedAssetIds.length !== 1 ? 's' : ''}
                        </>
                    )}
                </Button>
            </div>
        </ResponsiveFormContainer>
    );
};
