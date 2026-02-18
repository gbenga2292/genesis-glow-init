import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, QuickCheckout, Employee } from "@/types/asset";
import { ShoppingCart, ArrowLeft, User, Calendar } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecentCheckoutActivityPageProps {
  quickCheckouts: QuickCheckout[];
  assets: Asset[];
  employees: Employee[];
  onBack: () => void;
}

export const RecentCheckoutActivityPage = ({
  quickCheckouts,
  assets,
  employees,
  onBack,
}: RecentCheckoutActivityPageProps) => {
  const [activityFilter, setActivityFilter] = useState<'all' | 'outstanding' | 'return_completed' | 'used' | 'lost' | 'damaged'>('all');
  const isMobile = useIsMobile();

  const filteredActivity = activityFilter === 'all'
    ? quickCheckouts
    : quickCheckouts.filter(c => c.status === activityFilter);

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
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={onBack}
            className="gap-2 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            {!isMobile && "Quick Checkout"}
          </Button>
          <div>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Checkout Activity
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Full checkout history and status tracking
            </p>
          </div>
        </div>
        <Select value={activityFilter} onValueChange={(value: typeof activityFilter) => setActivityFilter(value)}>
          <SelectTrigger className={`${isMobile ? 'w-full' : 'w-[160px]'} h-9 text-sm`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({quickCheckouts.length})</SelectItem>
            <SelectItem value="outstanding">Outstanding</SelectItem>
            <SelectItem value="return_completed">Returned</SelectItem>
            <SelectItem value="used">Used</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="damaged">Damaged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Activity List */}
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">
            {activityFilter === 'all' ? 'All Activity' : activityFilter.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ({filteredActivity.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivity.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No checkout history for this filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActivity.map((checkout, index) => {
                const asset = assets.find(a => a.id === checkout.assetId);
                const displayAssetName = checkout.assetName || asset?.name || 'Unknown Asset';
                const displayEmployeeName = checkout.employee ||
                  (checkout.employeeId ? employees.find(e => e.id === checkout.employeeId)?.name : null) ||
                  'Unknown Employee';

                return (
                  <div
                    key={`${checkout.id}-${index}`}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{displayAssetName}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {displayEmployeeName}
                        </span>
                        <span className="mx-1.5">•</span>
                        {checkout.quantity} units
                        {checkout.returnedQuantity > 0 && ` (Returned: ${checkout.returnedQuantity})`}
                      </p>
                      {checkout.notes && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">
                          {checkout.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:flex-shrink-0">
                      {getStatusBadge(checkout.status)}
                      <p className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {checkout.checkoutDate.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
