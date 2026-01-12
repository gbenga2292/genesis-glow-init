import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, QuickCheckout, Employee } from "@/types/asset";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, RotateCcw, AlertCircle, CheckCircle2, Package, Wrench, Wallet } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";

interface EmployeeAnalyticsProps {
    employee: Employee;
    assets: Asset[];
    quickCheckouts: QuickCheckout[];
    onUpdateCheckoutStatus: (checkoutId: string, status: 'return_completed' | 'used' | 'lost' | 'damaged', quantity?: number) => void;
    onClose: () => void;
}

export const EmployeeAnalytics = ({
    employee,
    assets,
    quickCheckouts,
    onUpdateCheckoutStatus,
    onClose
}: EmployeeAnalyticsProps) => {
    const [filter, setFilter] = useState<'all' | 'tools' | 'equipment' | 'consumable' | 'non-consumable' | 'ppe'>('all');

    // Filter checkouts for this employee
    // Note: quickCheckouts stored employee name as string, need to match by name
    // In a real DB with relations, we'd use ID. Assuming name match for now as per current schema.
    const employeeCheckouts = quickCheckouts.filter(c => c.employee === employee.name);

    const outstandingItems = employeeCheckouts.filter(c => {
        if (c.status !== 'outstanding') return false;

        if (filter === 'all') return true;

        const asset = assets.find(a => a.id === c.assetId);
        if (!asset) return false;

        if (filter === 'ppe') {
            return asset.category === 'ppe';
        }

        if (filter === 'tools') {
            return asset.type === 'tools';
        }

        if (filter === 'equipment') {
            return asset.type === 'equipment';
        }

        if (filter === 'consumable') {
            return asset.type === 'consumable';
        }

        if (filter === 'non-consumable') {
            return asset.type === 'non-consumable';
        }

        return false;
    });
    const returnedItems = employeeCheckouts.filter(c => c.status === 'return_completed');
    const usedItems = employeeCheckouts.filter(c => c.status === 'used');
    const lostItems = employeeCheckouts.filter(c => c.status === 'lost' || c.status === 'damaged');

    // Calculate stats
    const totalItemsCheckedOut = employeeCheckouts.reduce((sum, c) => sum + c.quantity, 0);
    const currentPossessionCount = outstandingItems.reduce((sum, c) => sum + c.quantity, 0);

    // Group current items by category (Tools vs Consumables)
    const currentTools = outstandingItems.filter(c => {
        const asset = assets.find(a => a.id === c.assetId);
        return asset?.type === 'tools' || asset?.type === 'equipment';
    });

    const currentConsumables = outstandingItems.filter(c => {
        const asset = assets.find(a => a.id === c.assetId);
        return asset?.type === 'consumable' || asset?.type === 'non-consumable';
    });

    const getAssetTypeIcon = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        switch (asset?.type) {
            case 'tools': return <Wrench className="h-4 w-4 text-blue-500" />;
            case 'equipment': return <Package className="h-4 w-4 text-orange-500" />;
            case 'consumable': return <Wallet className="h-4 w-4 text-green-500" />;
            default: return <Package className="h-4 w-4" />;
        }
    };

    return (
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-2">
                    {employee.name}
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                        {employee.role}
                    </Badge>
                </DialogTitle>
                <DialogDescription>
                    Asset checkout history and current inventory
                </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
                <Card className="bg-muted/30 border-0">
                    <CardHeader className="py-3 px-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Current Items
                            <ShoppingCart className="h-4 w-4 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                        <div className="text-2xl font-bold">{currentPossessionCount}</div>
                        <p className="text-xs text-muted-foreground">Outstanding items</p>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-0">
                    <CardHeader className="py-3 px-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Returned
                            <RotateCcw className="h-4 w-4 text-green-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                        <div className="text-2xl font-bold">{returnedItems.length}</div>
                        <p className="text-xs text-muted-foreground">Checkouts returned</p>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-0">
                    <CardHeader className="py-3 px-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Consumed
                            <CheckCircle2 className="h-4 w-4 text-purple-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                        <div className="text-2xl font-bold">{usedItems.length}</div>
                        <p className="text-xs text-muted-foreground">Items marked used</p>
                    </CardContent>
                </Card>

                <Card className="bg-muted/30 border-0">
                    <CardHeader className="py-3 px-4 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                            Lost/Damaged
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-3 pt-0">
                        <div className="text-2xl font-bold">{lostItems.length}</div>
                        <p className="text-xs text-muted-foreground">Items flagged</p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <ScrollArea className="flex-1 min-h-[300px] mt-4">
                <div className="space-y-6 pr-4">

                    {/* Outstanding Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-600">
                            <ShoppingCart className="h-5 w-5" />
                            Outstanding Items ({outstandingItems.length})
                        </h3>

                        {/* Filter Dropdown */}
                        <div className="mb-4 w-full sm:w-[250px]">
                            <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Items</SelectItem>
                                    <SelectItem value="tools">Tools</SelectItem>
                                    <SelectItem value="equipment">Equipment</SelectItem>
                                    <SelectItem value="consumable">Consumables</SelectItem>
                                    <SelectItem value="non-consumable">Reuseables</SelectItem>
                                    <SelectItem value="ppe">PPE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {outstandingItems.length === 0 ? (
                            <p className="text-sm text-muted-foreground pl-7">No outstanding items.</p>
                        ) : (
                            <div className="space-y-3 pl-2">
                                {outstandingItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
                                        <div className="flex items-start gap-3 mb-3 sm:mb-0">
                                            <div className="mt-1 p-2 bg-muted rounded-full">
                                                {getAssetTypeIcon(item.assetId)}
                                            </div>
                                            <div>
                                                <h4 className="font-medium">{item.assetName}</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Qty: {item.quantity} • Checked out {format(new Date(item.checkoutDate), 'MMM d, yyyy')}
                                                </p>
                                                <p className="text-xs text-orange-600 mt-1">
                                                    Due in {item.expectedReturnDays} days
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" variant="outline" onClick={() => onUpdateCheckoutStatus(item.id, 'return_completed', item.quantity)}>
                                                Return
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => onUpdateCheckoutStatus(item.id, 'used', item.quantity)}>
                                                Mark Used
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Separator className="my-4" />

                    {/* History Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                            History
                        </h3>
                        <div className="space-y-2 pl-2 opacity-80">
                            {[...returnedItems, ...usedItems, ...lostItems]
                                .sort((a, b) => new Date(b.checkoutDate).getTime() - new Date(a.checkoutDate).getTime())
                                .slice(0, 50) // Limit history display
                                .map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 border-b last:border-0 text-sm">
                                        <div className="flex items-center gap-3">
                                            {getAssetTypeIcon(item.assetId)}
                                            <div>
                                                <span className="font-medium">{item.assetName}</span>
                                                <span className="text-muted-foreground ml-2">Qty: {item.quantity}</span>
                                            </div>
                                        </div>
                                        <div>
                                            {item.status === 'return_completed' && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Returned</Badge>}
                                            {item.status === 'used' && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Used</Badge>}
                                            {(item.status === 'lost' || item.status === 'damaged') && <Badge variant="destructive">Lost/Damaged</Badge>}
                                        </div>
                                    </div>
                                ))}
                            {employeeCheckouts.length === currentPossessionCount && (
                                <p className="text-sm text-muted-foreground">No history items yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="mt-4 pt-2 border-t">
                <Button variant="outline" onClick={onClose}>Close</Button>
            </DialogFooter>
        </DialogContent>
    );
};
