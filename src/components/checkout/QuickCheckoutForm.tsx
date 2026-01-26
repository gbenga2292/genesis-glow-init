import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Asset, QuickCheckout, Employee } from "@/types/asset";
import { ShoppingCart, RotateCcw, User, Calendar, Trash2, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { QuickCheckoutReport } from "./QuickCheckoutReport";
import { useIsMobile } from "@/hooks/use-mobile";

interface QuickCheckoutFormProps {
  assets: Asset[];
  employees: Employee[];
  quickCheckouts: QuickCheckout[];
  onQuickCheckout: (checkout: Omit<QuickCheckout, 'id'>) => void;
  onReturnItem: (checkoutId: string) => void;
  onPartialReturn?: (checkoutId: string, quantity: number, condition: 'good' | 'damaged' | 'missing' | 'used', notes?: string) => void;
  onDeleteCheckout?: (checkoutId: string) => void;
  onNavigateToAnalytics?: () => void;
}

export const QuickCheckoutForm = ({
  assets,
  employees,
  quickCheckouts,
  onQuickCheckout,
  onReturnItem,
  onPartialReturn,
  onDeleteCheckout,
  onNavigateToAnalytics
}: QuickCheckoutFormProps) => {
  const [formData, setFormData] = useState({
    assetId: '',
    quantity: 1,
    employeeId: '',
    expectedReturnDays: 7
  });

  const [returnDialog, setReturnDialog] = useState({
    open: false,
    checkoutId: '',
    quantity: 1,
    condition: 'good' as 'good' | 'damaged' | 'missing',
    notes: ''
  });

  const [activityFilter, setActivityFilter] = useState<'all' | 'outstanding' | 'return_completed' | 'used' | 'lost' | 'damaged'>('all');

  const { isAuthenticated, currentUser, hasPermission } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Main checkout list shows only outstanding items
  const filteredCheckouts = quickCheckouts.filter(checkout => checkout.status === 'outstanding');

  // Calculate available quantity based on OUTSTANDING items only
  const outstandingCheckouts = quickCheckouts.filter(checkout => checkout.status === 'outstanding' || checkout.status === 'lost' || checkout.status === 'damaged');

  const selectedAsset = assets.find(a => a.id === formData.assetId);

  // Find asset for the return dialog
  const returnCheckout = quickCheckouts.find(c => c.id === returnDialog.checkoutId);
  const returnAsset = assets.find(a => a.id === returnCheckout?.assetId);
  const canMarkAsUsed = returnAsset && returnAsset.type !== 'tools' && returnAsset.type !== 'equipment';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.assetId || !formData.employeeId) {
      return;
    }

    const asset = assets.find(a => a.id === formData.assetId);
    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!asset || !selectedEmployee) return;

    const checkoutData: Omit<QuickCheckout, 'id'> = {
      assetId: formData.assetId,
      assetName: asset.name,
      quantity: formData.quantity,
      expectedReturnDays: formData.expectedReturnDays,
      employeeId: formData.employeeId,
      employee: selectedEmployee.name,
      checkoutDate: new Date(),
      status: 'outstanding',
      returnedQuantity: 0
    };

    onQuickCheckout(checkoutData);

    // Reset form
    setFormData({
      assetId: '',
      quantity: 1,
      employeeId: '',
      expectedReturnDays: 7
    });
  };

  const getAvailableQuantity = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;

    // Use the already calculated availableQuantity from the asset object
    // This avoids double-counting reserved items since the main asset list 
    // should already reflect reservations/checkouts in its availableQuantity.
    return asset.availableQuantity || 0;
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
      condition: 'good',
      notes: checkout.notes || ''
    });
  };

  const handlePartialReturn = () => {
    if (onPartialReturn) {
      onPartialReturn(returnDialog.checkoutId, returnDialog.quantity, returnDialog.condition, returnDialog.notes);
    }
    setReturnDialog({
      open: false,
      checkoutId: '',
      quantity: 1,
      condition: 'good',
      notes: ''
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
      case 'used':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Used (Consumable)</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-start'}`}>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Quick Checkout
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Fast checkout for individual employees and short-term loans
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={onNavigateToAnalytics}>
            <User className="h-4 w-4" />
            Employees
          </Button>
          <QuickCheckoutReport quickCheckouts={quickCheckouts} />
        </div>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={getMaxQuantity(formData.assetId)}
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
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
                    onChange={(e) => setFormData({ ...formData, expectedReturnDays: parseInt(e.target.value) || 7 })}
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee">Employee Name *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                >
                  <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee, index) => (
                      <SelectItem key={`${employee.id}-${index}`} value={employee.id}>
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
                disabled={!formData.assetId || !formData.employeeId || !hasPermission('write_quick_checkouts')}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Checkout Item
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Checkouts List with Filter */}
        <Card className="border-0 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Checkouts ({filteredCheckouts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCheckouts.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <div className="text-center py-8">
                  <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No checkouts found</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredCheckouts.map((checkout, index) => {
                  const asset = assets.find(a => a.id === checkout.assetId);
                  const isConsumable = asset?.type === 'consumable' || asset?.type === 'non-consumable';

                  // Fallback for missing names
                  const displayAssetName = checkout.assetName || asset?.name || 'Unknown Asset';
                  const displayEmployeeName = checkout.employee ||
                    (checkout.employeeId ? employees.find(e => e.id === checkout.employeeId)?.name : null) ||
                    'Unknown Employee';

                  return (
                    <div key={`${checkout.id}-${index}`} className="border rounded-lg p-4 bg-muted/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{displayAssetName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {checkout.quantity} {checkout.returnedQuantity > 0 && `(Returned: ${checkout.returnedQuantity})`}
                          </p>
                        </div>
                        {getStatusBadge(checkout.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {displayEmployeeName}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {checkout.checkoutDate.toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {checkout.status === 'outstanding' && (
                          <Button
                            onClick={() => handleOpenReturnDialog(checkout.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={!isAuthenticated || !hasPermission('write_quick_checkouts')}
                          >
                            <RotateCcw className="h-3 w-3 mr-2" />
                            Return / Update
                          </Button>
                        )}
                        {onDeleteCheckout && isAuthenticated && hasPermission('delete_quick_checkouts') && (
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
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Checkout Activity</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={activityFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActivityFilter('all')}
              >
                All
              </Badge>
              <Badge
                variant={activityFilter === 'outstanding' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActivityFilter('outstanding')}
              >
                Outstanding
              </Badge>
              <Badge
                variant={activityFilter === 'return_completed' ? 'default' : 'outline'}
                className="cursor-pointer bg-gradient-success"
                onClick={() => setActivityFilter('return_completed')}
              >
                Returned
              </Badge>
              <Badge
                variant={activityFilter === 'used' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActivityFilter('used')}
              >
                Used
              </Badge>
              <Badge
                variant={activityFilter === 'lost' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActivityFilter('lost')}
              >
                Lost
              </Badge>
              <Badge
                variant={activityFilter === 'damaged' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setActivityFilter('damaged')}
              >
                Damaged
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredActivity = activityFilter === 'all'
              ? quickCheckouts
              : quickCheckouts.filter(c => c.status === activityFilter);

            return filteredActivity.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No checkout history for this filter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivity.slice(0, 10).map((checkout, index) => {
                  const asset = assets.find(a => a.id === checkout.assetId);
                  const displayAssetName = checkout.assetName || asset?.name || 'Unknown Asset';
                  const displayEmployeeName = checkout.employee ||
                    (checkout.employeeId ? employees.find(e => e.id === checkout.employeeId)?.name : null) ||
                    'Unknown Employee';

                  return (
                    <div key={`${checkout.id}-${index}`} className="flex justify-between items-start p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium">{displayAssetName}</p>
                        <p className="text-sm text-muted-foreground">
                          {displayEmployeeName} • {checkout.quantity} units
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(checkout.status)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {checkout.checkoutDate.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onOpenChange={(open) => setReturnDialog({ ...returnDialog, open })}>
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
                onChange={(e) => setReturnDialog({ ...returnDialog, quantity: parseInt(e.target.value) || 1 })}
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-condition">Condition / Status</Label>
              <Select
                value={returnDialog.condition}
                onValueChange={(value: any) => setReturnDialog({ ...returnDialog, condition: value })}
              >
                <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Returned (Good)</SelectItem>
                  <SelectItem value="damaged">Returned (Damaged)</SelectItem>
                  <SelectItem value="missing">Lost / Missing</SelectItem>
                  {/* Only show 'Used' option if asset is NOT a tool or equipment */}
                  {canMarkAsUsed && <SelectItem value="used">Used / Consumed</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-notes">Notes (Optional)</Label>
              <Textarea
                id="return-notes"
                placeholder="Add any notes or clarification about this return/update..."
                value={returnDialog.notes}
                onChange={(e) => setReturnDialog({ ...returnDialog, notes: e.target.value })}
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300 min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                These notes will appear in checkout reports for additional context
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialog({ ...returnDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={handlePartialReturn} className="bg-gradient-primary hover:scale-105 transition-all duration-300">
              <RotateCcw className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};
