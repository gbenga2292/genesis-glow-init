import React, { useState } from "react";
import { Waybill, ReturnItem } from "@/types/asset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Package, AlertTriangle, CheckCircle2 } from "lucide-react";

interface ReturnProcessingPageProps {
    waybill: Waybill;
    onBack: () => void;
    onSubmit: (returnData: { waybillId: string; items: ReturnItem[] }) => void;
}

interface ItemCondition {
    damaged: number;
    missing: number;
}

export const ReturnProcessingPage = ({ waybill, onBack, onSubmit }: ReturnProcessingPageProps) => {
    const [conditions, setConditions] = useState<Record<string, ItemCondition>>(() => {
        const initial: Record<string, ItemCondition> = {};
        waybill.items.forEach(item => {
            initial[item.assetId] = { damaged: 0, missing: 0 };
        });
        return initial;
    });

    const handleChange = (assetId: string, field: keyof ItemCondition, value: number) => {
        setConditions(prev => ({
            ...prev,
            [assetId]: {
                ...prev[assetId],
                [field]: value < 0 ? 0 : value,
            }
        }));
    };

    const validate = () => {
        for (const item of waybill.items) {
            const cond = conditions[item.assetId];
            if (!cond) return false;
            const total = cond.damaged + cond.missing;
            const remainingQuantity = item.quantity - (item.returnedQuantity || 0);
            if (total > remainingQuantity) return false;
        }
        return true;
    };

    const handleSubmit = () => {
        if (!validate()) {
            alert("Invalid input: Damaged + Missing quantities cannot exceed item quantity.");
            return;
        }
        const returnItems: ReturnItem[] = waybill.items.map(item => {
            const cond = conditions[item.assetId];
            const remainingQuantity = item.quantity - (item.returnedQuantity || 0);
            const goodQuantity = remainingQuantity - (cond.damaged + cond.missing);
            return {
                assetId: item.assetId,
                assetName: item.assetName,
                quantity: goodQuantity,
                condition: "good" as const,
            };
        }).filter(item => item.quantity > 0);

        waybill.items.forEach(item => {
            const cond = conditions[item.assetId];
            if (cond.damaged > 0) {
                returnItems.push({
                    assetId: item.assetId,
                    assetName: item.assetName,
                    quantity: cond.damaged,
                    condition: "damaged" as const,
                });
            }
            if (cond.missing > 0) {
                returnItems.push({
                    assetId: item.assetId,
                    assetName: item.assetName,
                    quantity: cond.missing,
                    condition: "missing" as const,
                });
            }
        });

        onSubmit({ waybillId: waybill.id, items: returnItems });
    };

    const getTotalStats = () => {
        let totalRemaining = 0;
        let totalDamaged = 0;
        let totalMissing = 0;
        let totalGood = 0;

        waybill.items.forEach(item => {
            const cond = conditions[item.assetId];
            const remaining = item.quantity - (item.returnedQuantity || 0);
            totalRemaining += remaining;
            totalDamaged += cond?.damaged || 0;
            totalMissing += cond?.missing || 0;
            totalGood += remaining - (cond?.damaged || 0) - (cond?.missing || 0);
        });

        return { totalRemaining, totalDamaged, totalMissing, totalGood };
    };

    const stats = getTotalStats();

    return (
        <div className="flex flex-col h-full bg-background animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                        Process Return - Waybill {waybill.id}
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Review and process the returned items. Specify the quantity of damaged or missing items.
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{stats.totalRemaining}</p>
                                    <p className="text-xs text-muted-foreground">Total Remaining</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-green-200 bg-green-50/50">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{stats.totalGood}</p>
                                    <p className="text-xs text-muted-foreground">Good Condition</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-orange-200 bg-orange-50/50">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-600">{stats.totalDamaged}</p>
                                    <p className="text-xs text-muted-foreground">Damaged</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-red-200 bg-red-50/50">
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-red-600">{stats.totalMissing}</p>
                                    <p className="text-xs text-muted-foreground">Missing</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Items Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Return Items</CardTitle>
                            <CardDescription>
                                Enter the quantity of damaged or missing items for each asset
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="p-3 text-left font-medium">Item</th>
                                            <th className="p-3 text-center font-medium">Remaining Qty</th>
                                            <th className="p-3 text-center font-medium">
                                                <span className="flex items-center justify-center gap-1">
                                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                                    Damaged
                                                </span>
                                            </th>
                                            <th className="p-3 text-center font-medium">
                                                <span className="flex items-center justify-center gap-1 text-red-600">
                                                    Missing
                                                </span>
                                            </th>
                                            <th className="p-3 text-center font-medium">
                                                <span className="flex items-center justify-center gap-1">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    Good
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waybill.items.map(item => {
                                            const cond = conditions[item.assetId];
                                            const damaged = cond?.damaged || 0;
                                            const missing = cond?.missing || 0;
                                            const remainingQty = item.quantity - (item.returnedQuantity || 0);
                                            const good = remainingQty - damaged - missing;
                                            const isValid = good >= 0;

                                            return (
                                                <tr key={item.assetId} className={`border-b ${!isValid ? 'bg-red-50' : ''}`}>
                                                    <td className="p-3">
                                                        <div className="font-medium">{item.assetName}</div>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="font-semibold">{remainingQty}</span>
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={remainingQty}
                                                            value={damaged}
                                                            onChange={e => handleChange(item.assetId, "damaged", parseInt(e.target.value) || 0)}
                                                            className="w-24 mx-auto text-center"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            max={remainingQty}
                                                            value={missing}
                                                            onChange={e => handleChange(item.assetId, "missing", parseInt(e.target.value) || 0)}
                                                            className="w-24 mx-auto text-center"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className={`font-semibold ${good >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {good >= 0 ? good : 'Invalid'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={onBack}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={!validate()} className="bg-gradient-primary">
                            Submit Return
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
