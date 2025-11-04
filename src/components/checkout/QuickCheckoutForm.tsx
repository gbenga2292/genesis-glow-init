import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Asset, QuickCheckout, Employee } from "@/types/asset";
import { ShoppingCart, RotateCcw, User, Calendar, Trash2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QuickCheckoutReport } from "./QuickCheckoutReport";

interface QuickCheckoutFormProps {
  assets: Asset[];
  employees: Employee[];
  quickCheckouts: QuickCheckout[];
  onQuickCheckout: (checkout: Omit<QuickCheckout, 'id'>) => void;
  onReturnItem: (checkoutId: string) => void;
  onPartialReturn?: (checkoutId: string, quantity: number, condition: 'good' | 'damaged' | 'missing') => void;
  onDeleteCheckout?: (checkoutId: string) => void;
}

export const QuickCheckoutForm = ({
  assets,
  employees,
  quickCheckouts,
  onQuickCheckout,
  onReturnItem,
  onPartialReturn,
  onDeleteCheckout
}: QuickCheckoutFormProps) => {
  const [formData, setFormData] = useState({
    assetId: '',
    quantity: 1,
    employee: '',
    expectedReturnDays: 7
  });

  const [returnDialog, setReturnDialog] = useState({
    open: false,
    checkoutId: '',
    quantity: 1,
    condition: 'good' as 'good' | 'damaged' | 'missing'
  });

  const outstandingCheckouts = quickCheckouts.filter(checkout => checkout.status === 'outstanding');
  const { isAuthenticated, currentUser } = useAuth();
  const { toast } = useToast();

  const selectedAsset = assets.find(a => a.id === formData.assetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assetId || !formData.employee) {
      return;
    }

    const asset = assets.find(a => a.id === formData.assetId);
    if (!asset) return;

    const checkoutData: Omit<QuickCheckout, 'id'> = {
      ...formData,
      assetName: asset.name,
      checkoutDate: new Date(),
      status: 'outstanding',
      returnedQuantity: 0
    };

    onQuickCheckout(checkoutData);

    // Reset form
    setFormData({
      assetId: '',
      quantity: 1,
      employee: '',
      expectedReturnDays: 7
    });
  };

  const getAvailableQuantity = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;
    const checkedOut = outstandingCheckouts
      .filter(checkout => checkout.assetId === assetId)
      .reduce((sum, checkout) => sum + checkout.quantity, 0);
    return asset.availableQuantity - (asset.damagedCount || 0) - (asset.missingCount || 0) - checkedOut;
  };

  const availableAssets = assets.filter(asset => getAvailableQuantity(asset.id) > 0);

  const getMaxQuantity = (assetId: string) => {
    return getAvailableQuantity(assetId);
  };

  const handleOpenReturnDialog = (checkoutId: string) => {
    const checkout = quickCheckouts.find(c => c.id === checkoutId);
    if (!checkout) return;

    const remainingQuantity = checkout.quantity - checkout.returnedQuantity;
    setReturnDialog({
      open: true,
      checkoutId,
      quantity: remainingQuantity,
      condition: 'good'
    });
  };

  const handlePartialReturn = () => {
    if (onPartialReturn) {
      onPartialReturn(returnDialog.checkoutId, returnDialog.quantity, returnDialog.condition);
    }
    setReturnDialog({
      open: false,
      checkoutId: '',
      quantity: 1,
      condition: 'good'
    });
  };

  const getStatusBadge = (status: QuickCheckout['status']) => {
    switch (status) {
      case 'outstanding':
        return <Badge className="bg-gradient-warning text-warning-foreground">Outstanding</Badge>;
      case 'return_completed':
        return <Badge className="bg-gradient-success">Returned</Badge>;
      case 'lost':
        return <Badge variant="destructive">Lost</Badge>;
      case 'damaged':
        return <Badge className="bg-gradient-warning text-warning-foreground">Damaged</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Quick Checkout
          </h1>
          <p className="text-muted-foreground mt-2">
            Fast checkout for individual employees and short-term loans
          </p>
        </div>
        <QuickCheckoutReport quickCheckouts={quickCheckouts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checkout Form */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              New Checkout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset">Asset *</Label>
                <Select
                  key={formData.assetId}
                  value={formData.assetId}
                  onValueChange={(value) => {
                    setFormData({
                      ...formData,
                      assetId: value,
                      quantity: Math.min(formData.quantity, getMaxQuantity(value))
                    });
                  }}
                >
                  <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                    <SelectValue placeholder="Select asset to checkout" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} (Available: {getAvailableQuantity(asset.id)} {asset.unitOfMeasurement})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAsset && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedAsset.name} - Available: {getAvailableQuantity(selectedAsset.id)} {selectedAsset.unitOfMeasurement}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={getMaxQuantity(formData.assetId)}
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="returnDays">Return in (days)</Label>
                  <Input
                    id="returnDays"
                    type="number"
                    min="1"
                    value={formData.expectedReturnDays}
                    onChange={(e) => setFormData({...formData, expectedReturnDays: parseInt(e.target.value) || 7})}
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee">Employee Name *</Label>
                <Select
                  value={formData.employee}
                  onValueChange={(value) => setFormData({...formData, employee: value})}
                >
                  <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee, index) => (
                      <SelectItem key={`${employee.id}-${index}`} value={employee.name}>
                        {employee.name} ({employee.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {employees.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No employees available. Please add employees in Company Settings.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
                disabled={!formData.assetId || !formData.employee || currentUser?.role === 'staff'}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Checkout Item
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Outstanding Checkouts */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Outstanding Checkouts ({outstandingCheckouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingCheckouts.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No outstanding checkouts</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {outstandingCheckouts.map((checkout, index) => (
                  <div key={`${checkout.id}-${index}`} className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{checkout.assetName}</h4>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {checkout.quantity} {checkout.returnedQuantity > 0 && `(Returned: ${checkout.returnedQuantity})`}
                        </p>
                      </div>
                      {getStatusBadge(checkout.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {checkout.employee}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {checkout.checkoutDate.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenReturnDialog(checkout.id)}
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={!isAuthenticated || currentUser?.role === 'staff'}
                      >
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Return
                      </Button>
                      {onDeleteCheckout && isAuthenticated && currentUser?.role !== 'staff' && (
                        <Button
                          onClick={() => onDeleteCheckout(checkout.id)}
                          size="sm"
                          variant="destructive"
                          className="px-3"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle>Recent Checkout Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {quickCheckouts.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No checkout history yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {quickCheckouts.slice(0, 5).map((checkout, index) => (
                <div key={`${checkout.id}-${index}`} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{checkout.assetName}</p>
                    <p className="text-sm text-muted-foreground">
                      {checkout.employee} • {checkout.quantity} units
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(checkout.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {checkout.checkoutDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={(open) => setReturnDialog({...returnDialog, open})}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Return Items</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="return-quantity">Return Quantity</Label>
              <Input
                id="return-quantity"
                type="number"
                min="1"
                max={returnDialog.quantity}
                value={returnDialog.quantity}
                onChange={(e) => setReturnDialog({...returnDialog, quantity: parseInt(e.target.value) || 1})}
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-condition">Condition</Label>
              <Select
                value={returnDialog.condition}
                onValueChange={(value: 'good' | 'damaged' | 'missing') => setReturnDialog({...returnDialog, condition: value})}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog({...returnDialog, open: false})}>
              Cancel
            </Button>
            <Button onClick={handlePartialReturn} className="bg-gradient-primary hover:scale-105 transition-all duration-300">
              <RotateCcw className="h-4 w-4 mr-2" />
              Return Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
