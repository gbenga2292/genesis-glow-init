import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, Waybill, QuickCheckout, Activity } from "@/types/asset";
import { Package, FileText, ShoppingCart, AlertTriangle, TrendingDown, CheckCircle, User } from "lucide-react";
import { getActivities } from "@/utils/activityLogger";

interface DashboardProps {
  assets: Asset[];
  waybills: Waybill[];
  quickCheckouts: QuickCheckout[];
}

export const Dashboard = ({ assets, waybills, quickCheckouts }: DashboardProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Load activities on mount
  useEffect(() => {
    const loadActivities = async () => {
      const loadedActivities = await getActivities();
      setActivities(loadedActivities);
    };
    loadActivities();
  }, []);

  const totalAssets = assets.length;
  const totalQuantity = assets.reduce((sum, asset) => sum + asset.quantity, 0);
  const outOfStockCount = assets.filter(asset => asset.quantity === 0).length;
  const lowStockCount = assets.filter(asset => asset.quantity > 0 && asset.quantity < 10).length;
  
  const outstandingWaybills = (waybills || []).filter(w => w.status === 'outstanding').length;
  const outstandingCheckouts = (quickCheckouts || []).filter(c => c.status === 'outstanding').length;
  
  // Calculate categories
  const dewateringAssets = assets.filter(a => a.category === 'dewatering');
  const waterproofingAssets = assets.filter(a => a.category === 'waterproofing');
  
  const stats = [
    {
      title: "Total Assets",
      value: totalAssets,
      description: "Items in inventory",
      icon: Package,
      color: "text-primary"
    },
    {
      title: "Total Quantity",
      value: totalQuantity,
      description: "Units in stock",
      icon: Package,
      color: "text-success"
    },
    {
      title: "Outstanding Waybills",
      value: outstandingWaybills,
      description: "Items out for projects",
      icon: FileText,
      color: "text-warning"
    },
    {
      title: "Quick Checkouts",
      value: outstandingCheckouts,
      description: "Items checked out",
      icon: ShoppingCart,
      color: "text-primary"
    },
    {
      title: "Out of Stock",
      value: outOfStockCount,
      description: "Items needing reorder",
      icon: AlertTriangle,
      color: "text-destructive"
    },
    {
      title: "Low Stock",
      value: lowStockCount,
      description: "Items running low",
      icon: TrendingDown,
      color: "text-warning"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Asset Management Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Overview of your inventory, waybills, and asset tracking
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="border-0 shadow-soft hover:shadow-medium transition-all duration-300 animate-slide-up"
            style={{animationDelay: `${index * 0.1}s`}}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <CardDescription className="mt-2">
                {stat.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-soft animate-slide-up" style={{animationDelay: '0.6s'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Dewatering Equipment
            </CardTitle>
            <CardDescription>
              {dewateringAssets.length} items - {dewateringAssets.reduce((sum, a) => sum + a.quantity, 0)} units
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dewateringAssets.slice(0, 3).map(asset => (
                <div key={asset.id} className="flex justify-between items-center">
                  <span className="text-sm">{asset.name}</span>
                  <span className={`text-sm font-medium ${
                    asset.quantity === 0 ? 'text-destructive' : 
                    asset.quantity < 10 ? 'text-warning' : 'text-success'
                  }`}>
                    {asset.quantity} {asset.unitOfMeasurement}
                  </span>
                </div>
              ))}
              {dewateringAssets.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{dewateringAssets.length - 3} more items
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-soft animate-slide-up" style={{animationDelay: '0.7s'}}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              Waterproofing Materials
            </CardTitle>
            <CardDescription>
              {waterproofingAssets.length} items - {waterproofingAssets.reduce((sum, a) => sum + a.quantity, 0)} units
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {waterproofingAssets.slice(0, 3).map(asset => (
                <div key={asset.id} className="flex justify-between items-center">
                  <span className="text-sm">{asset.name}</span>
                  <span className={`text-sm font-medium ${
                    asset.quantity === 0 ? 'text-destructive' : 
                    asset.quantity < 10 ? 'text-warning' : 'text-success'
                  }`}>
                    {asset.quantity} {asset.unitOfMeasurement}
                  </span>
                </div>
              ))}
              {waterproofingAssets.length > 3 && (
                <div className="text-sm text-muted-foreground">
                  +{waterproofingAssets.length - 3} more items
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-soft animate-slide-up" style={{animationDelay: '0.8s'}}>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest system activities and user actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.slice(0, 5).map(activity => (
              <div key={activity.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {activity.userName || activity.userId}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.action.replace('_', ' ').toUpperCase()} on {activity.entity.replace('_', ' ')}
                    {activity.entityId && ` (${activity.entityId})`}
                  </div>
                  {activity.details && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {activity.details}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    {activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activities</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};