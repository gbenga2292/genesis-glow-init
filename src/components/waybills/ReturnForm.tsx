import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Waybill, ReturnBill, ReturnItem } from "@/types/asset";

interface ReturnFormProps {
  waybill: Waybill;
  onSubmit: (returnData: Omit<ReturnBill, 'id' | 'returnDate'>) => void;
  onClose: () => void;
}

export const ReturnForm = ({ waybill, onSubmit, onClose }: ReturnFormProps) => {
  const [returnItems, setReturnItems] = useState<ReturnItem[]>(waybill.items.map(item => ({
    assetId: item.assetId,
    assetName: item.assetName,
    quantity: 0,
    condition: 'good'
  })));

  const [receivedBy, setReceivedBy] = useState("");

  const handleQuantityChange = (index: number, quantity: number) => {
    setReturnItems(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
  };

  const handleConditionChange = (index: number, condition: ReturnItem['condition']) => {
    setReturnItems(prev => prev.map((item, i) => i === index ? { ...item, condition } : item));
  };

  const handleReturnAll = () => {
    setReturnItems(prev => prev.map(item => {
      const originalItem = waybill.items.find(i => i.assetId === item.assetId);
      const maxQuantity = originalItem ? originalItem.quantity - originalItem.returnedQuantity : 0;
      return { ...item, quantity: maxQuantity };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate quantities
    for (const item of returnItems) {
      const originalItem = waybill.items.find(i => i.assetId === item.assetId);
      if (!originalItem) continue;
      if (item.quantity < 0 || item.quantity > (originalItem.quantity - originalItem.returnedQuantity)) {
        alert(`Invalid quantity for ${item.assetName}`);
        return;
      }
    }

    if (!receivedBy) {
      alert("Please enter the name of the person receiving the return.");
      return;
    }

    onSubmit({
      waybillId: waybill.id,
      items: returnItems.filter(item => item.quantity > 0),
      receivedBy,
      condition: 'good',
      notes: '',
      status: 'initiated'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
      <Card className="max-w-3xl w-full">
        <CardHeader>
          <CardTitle>Process Return for Waybill {waybill.id}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {returnItems.map((item, index) => {
              const originalItem = waybill.items.find(i => i.assetId === item.assetId);
              const maxQuantity = originalItem ? originalItem.quantity - originalItem.returnedQuantity : 0;
              return (
                <div key={item.assetId} className="grid grid-cols-3 gap-4 items-center">
                  <div>
                    <Label>{item.assetName}</Label>
                    <p className="text-sm text-muted-foreground">Max: {maxQuantity}</p>
                  </div>
                  <div>
                    <Input
                      type="number"
                      min={0}
                      max={maxQuantity}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, Math.min(Math.max(0, parseInt(e.target.value) || 0), maxQuantity))}
                      className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    />
                  </div>
                  <div>
                    <Select
                      value={item.condition}
                      onValueChange={(value) => handleConditionChange(index, value as ReturnItem['condition'])}
                    >
                      <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="damaged">Damaged</SelectItem>
                        <SelectItem value="missing">Missing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}

            <div className="space-y-2">
              <Label htmlFor="receivedBy">Received By *</Label>
              <Input
                id="receivedBy"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Name of person receiving return"
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                required
              />
            </div>

            <div className="flex justify-between gap-4 pt-4">
              <Button type="button" variant="secondary" onClick={handleReturnAll}>
                Return All
              </Button>
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-gradient-primary">
                  Process Return
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
