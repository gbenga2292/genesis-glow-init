import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset } from "@/types/asset";
import { Package, DollarSign, Plus, Trash2 } from "lucide-react";

interface RestockItem {
  assetId: string;
  quantity: string;
  totalCost: string;
}

interface RestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onRestock: (restockItems: Array<{ assetId: string; quantity: number; totalCost: number }>) => void;
}

export const RestockDialog = ({ open, onOpenChange, assets, onRestock }: RestockDialogProps) => {
  const [restockItems, setRestockItems] = useState<RestockItem[]>([
    { assetId: "", quantity: "", totalCost: "" }
  ]);

  const officeAssets = assets.filter(asset => !asset.siteId);

  const addRestockItem = () => {
    setRestockItems([...restockItems, { assetId: "", quantity: "", totalCost: "" }]);
  };

  const removeRestockItem = (index: number) => {
    if (restockItems.length > 1) {
      setRestockItems(restockItems.filter((_, i) => i !== index));
    }
  };

  const updateRestockItem = (index: number, field: keyof RestockItem, value: string) => {
    const updatedItems = restockItems.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setRestockItems(updatedItems);
  };

  const handleSubmit = () => {
    const validItems = restockItems.filter(item => {
      if (!item.assetId || !item.quantity || !item.totalCost) return false;
      const qty = parseInt(item.quantity);
      const cost = parseFloat(item.totalCost);
      return qty > 0 && cost > 0;
    });

    if (validItems.length === 0) return;

    const formattedItems = validItems.map(item => ({
      assetId: item.assetId,
      quantity: parseInt(item.quantity),
      totalCost: parseFloat(item.totalCost)
    }));

    onRestock(formattedItems);
    handleClose();
  };

  const handleClose = () => {
    setRestockItems([{ assetId: "", quantity: "", totalCost: "" }]);
    onOpenChange(false);
  };

  const getUnitCost = (quantity: string, totalCost: string) => {
    if (!quantity || !totalCost) return "0.00";
    return (parseFloat(totalCost) / parseInt(quantity)).toFixed(2);
  };

  const getSelectedAsset = (assetId: string) => {
    return officeAssets.find(asset => asset.id === assetId);
  };

  const isFormValid = restockItems.some(item =>
    item.assetId && item.quantity && item.totalCost &&
    parseInt(item.quantity) > 0 && parseFloat(item.totalCost) > 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Restock Assets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Restock Items Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 px-4 py-3 border-b">
              <h4 className="font-medium">Restock Items</h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/30 sticky top-0">
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Asset</th>
                    <th className="text-left p-3 font-medium">Quantity</th>
                    <th className="text-left p-3 font-medium">Total Cost</th>
                    <th className="text-left p-3 font-medium">Unit Cost</th>
                    <th className="w-12 p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {restockItems.map((item, index) => {
                    const selectedAsset = getSelectedAsset(item.assetId);
                    const unitCost = getUnitCost(item.quantity, item.totalCost);

                    return (
                      <tr key={index} className="border-b hover:bg-muted/20">
                        <td className="p-3">
                          <Select
                            value={item.assetId}
                            onValueChange={(value) => updateRestockItem(index, 'assetId', value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select asset" />
                            </SelectTrigger>
                            <SelectContent>
                              {officeAssets.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.name} ({asset.quantity} {asset.unitOfMeasurement})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateRestockItem(index, 'quantity', e.target.value)}
                            min="1"
                            className="w-20"
                          />
                        </td>
                        <td className="p-3">
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                              type="number"
                              placeholder="Cost"
                              value={item.totalCost}
                              onChange={(e) => updateRestockItem(index, 'totalCost', e.target.value)}
                              min="0"
                              step="0.01"
                              className="w-24 pl-6"
                            />
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium">
                            ${unitCost}
                          </span>
                        </td>
                        <td className="p-3">
                          {restockItems.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRestockItem(index)}
                              className="text-destructive hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Another Asset Button */}
          <Button
            type="button"
            variant="outline"
            onClick={addRestockItem}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Asset
          </Button>

          {/* Summary */}
          {restockItems.some(item => item.assetId && item.quantity && item.totalCost) && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="text-sm font-medium mb-2">Restock Summary</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="ml-2 font-medium">
                    {restockItems.filter(item => item.assetId && item.quantity && item.totalCost).length}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="ml-2 font-medium">
                    {restockItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Total Cost:</span>
                  <span className="ml-2 font-medium">
                    ${restockItems.reduce((sum, item) => sum + (parseFloat(item.totalCost) || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className="bg-gradient-primary hover:opacity-90"
          >
            Restock Assets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
