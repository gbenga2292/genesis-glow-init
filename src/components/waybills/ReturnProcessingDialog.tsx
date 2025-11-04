import React, { useState } from "react";
import { Waybill, ReturnItem } from "@/types/asset";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReturnProcessingDialogProps {
  waybill: Waybill;
  onClose: () => void;
  onSubmit: (returnData: { waybillId: string; items: ReturnItem[] }) => void;
}

interface ItemCondition {
  damaged: number;
  missing: number;
}

export const ReturnProcessingDialog = ({ waybill, onClose, onSubmit }: ReturnProcessingDialogProps) => {
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
      // Validate against remaining quantity that can be returned (total sent minus already returned)
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
    }).filter(item => item.quantity > 0); // Only include items with positive quantities

    // Add damaged and missing items as separate entries with their quantities and conditions
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

  return (
    <Dialog open={true} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Process Return - Waybill {waybill.id}</DialogTitle>
          <DialogDescription>
            Review and process the returned items. Specify the quantity of damaged or missing items.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full table-auto border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 text-left">Item</th>
                <th className="border border-gray-300 p-2 text-center">Remaining Quantity</th>
                <th className="border border-gray-300 p-2 text-center">Damaged</th>
                <th className="border border-gray-300 p-2 text-center">Missing</th>
                <th className="border border-gray-300 p-2 text-center">Good</th>
              </tr>
            </thead>
            <tbody>
              {waybill.items.map(item => {
                const cond = conditions[item.assetId];
                const damaged = cond?.damaged || 0;
                const missing = cond?.missing || 0;
                const good = item.quantity - damaged - missing;
                return (
                  <tr key={item.assetId}>
                    <td className="border border-gray-300 p-2">{item.assetName}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.quantity - (item.returnedQuantity || 0)}</td>
                    <td className="border border-gray-300 p-2 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity - (item.returnedQuantity || 0)}
                        value={damaged}
                        onChange={e => handleChange(item.assetId, "damaged", parseInt(e.target.value) || 0)}
                        className="w-20 mx-auto"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={item.quantity - (item.returnedQuantity || 0)}
                        value={missing}
                        onChange={e => handleChange(item.assetId, "missing", parseInt(e.target.value) || 0)}
                        className="w-20 mx-auto"
                      />
                    </td>
                    <td className="border border-gray-300 p-2 text-center">{good >= 0 ? good : 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit Return</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
