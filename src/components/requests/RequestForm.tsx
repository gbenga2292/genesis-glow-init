import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { dataService } from "@/services/dataService";
import { useAppData } from "@/contexts/AppDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { RequestItem, SiteRequest } from "@/types/request";
import { Plus, Trash, Loader2, FileText } from "lucide-react";
import RequestBulkInput from "./RequestBulkInput";

export const RequestForm = ({ onSuccess }: { onSuccess?: () => void }) => {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const { sites } = useAppData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // For site worker, we might infer site from their assignment or let them pick if they rove
    // Assuming currentUser might have a siteId or we ask them. 
    // Since User type doesn't have siteId, we'll let them pick from sites (maybe they are at a specific site today).
    const [selectedSiteId, setSelectedSiteId] = useState<string>("");

    const [items, setItems] = useState<RequestItem[]>([
        { name: "", quantity: 1, notes: "" }
    ]);
    const [bulkMode, setBulkMode] = useState(false);
    const [priority, setPriority] = useState<"normal" | "urgent">("normal");
    const [generalNotes, setGeneralNotes] = useState("");

    const handleAddItem = () => {
        setItems([...items, { name: "", quantity: 1, notes: "" }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof RequestItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleBulkImport = (bulkItems: RequestItem[]) => {
        setItems([...items, ...bulkItems]);
        setBulkMode(false);
        toast({
            title: "Items Imported",
            description: `${bulkItems.length} item(s) added to your request.`
        });
    };

    const handleSubmit = async () => {
        if (!selectedSiteId) {
            toast({ title: "Site Required", description: "Please select a site.", variant: "destructive" });
            return;
        }

        if (items.some(i => !i.name.trim())) {
            toast({ title: "Incomplete Items", description: "Please specify item names.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const site = sites.find(s => s.id === selectedSiteId);
            const requestData: Partial<SiteRequest> = {
                requesterId: currentUser?.id || "unknown",
                requesterName: currentUser?.name || "Unknown",
                siteId: selectedSiteId,
                siteName: site?.name || "Unknown Site",
                items: items,
                status: "pending",
                priority: priority,
                notes: generalNotes,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await dataService.requests.createRequest(requestData);

            toast({
                title: "Request Submitted",
                description: "Measurements/Items have been requested successfully."
            });

            // Reset form
            setItems([{ name: "", quantity: 1, notes: "" }]);
            setGeneralNotes("");
            setPriority("normal");
            onSuccess?.();

        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to submit request.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit Request</CardTitle>
                <CardDescription>Request tools, consumables, or equipment for your site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Site</Label>
                    <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Site" />
                        </SelectTrigger>
                        <SelectContent>
                            {sites.map(site => (
                                <SelectItem key={site.id} value={site.id}>
                                    {site.name}{site.clientName ? ` (${site.clientName})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <Label>Items Needed</Label>
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                            <Button
                                size="sm"
                                variant={!bulkMode ? 'default' : 'ghost'}
                                onClick={() => setBulkMode(false)}
                                className="h-8 text-xs"
                                type="button"
                            >
                                Single Item
                            </Button>
                            <Button
                                size="sm"
                                variant={bulkMode ? 'default' : 'ghost'}
                                onClick={() => setBulkMode(true)}
                                className="h-8 text-xs"
                                type="button"
                            >
                                Bulk Input
                            </Button>
                        </div>
                    </div>

                    {bulkMode ? (
                        <RequestBulkInput onImport={handleBulkImport} />
                    ) : (
                        <>
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col md:flex-row gap-2 items-start md:items-end border p-3 rounded-md">
                                    <div className="w-full md:flex-1 space-y-1">
                                        <Label className="text-xs">Item Name / Asset</Label>
                                        <Input
                                            placeholder="e.g. Cement, Shovel"
                                            value={item.name}
                                            onChange={e => handleItemChange(index, "name", e.target.value)}
                                        />
                                    </div>
                                    <div className="w-full md:w-24 space-y-1">
                                        <Label className="text-xs">Qty</Label>
                                        <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                    <div className="w-full md:w-1/3 space-y-1">
                                        <Label className="text-xs">Notes (Optional)</Label>
                                        <Input
                                            placeholder="Specs etc."
                                            value={item.notes}
                                            onChange={e => handleItemChange(index, "notes", e.target.value)}
                                        />
                                    </div>
                                    {items.length > 1 && (
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} className="text-red-500" type="button">
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={handleAddItem} className="w-full" type="button">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Item
                            </Button>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                        <Label>Priority</Label>
                        <div className="flex gap-4">
                            <Button
                                variant={priority === 'normal' ? 'default' : 'outline'}
                                onClick={() => setPriority('normal')}
                                className="flex-1"
                            >
                                Normal
                            </Button>
                            <Button
                                variant={priority === 'urgent' ? 'destructive' : 'outline'}
                                onClick={() => setPriority('urgent')}
                                className="flex-1"
                            >
                                Urgent
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Additional Notes</Label>
                    <Textarea
                        placeholder="Any other details..."
                        value={generalNotes}
                        onChange={e => setGeneralNotes(e.target.value)}
                    />
                </div>

                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Request
                </Button>
            </CardContent>
        </Card>
    );
};
