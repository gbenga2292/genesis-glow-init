import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Asset, Site } from "@/types/asset";
import { ConsumableUsageLog } from "@/types/consumable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { TrendingUp, Calendar, Package, Users } from "lucide-react";

interface ConsumableAnalyticsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consumable: Asset;
  site: Site;
  logs: ConsumableUsageLog[];
}

export const ConsumableAnalytics = ({
  open,
  onOpenChange,
  consumable,
  site,
  logs
}: ConsumableAnalyticsProps) => {
  // Calculate statistics
  const totalUsed = logs.reduce((sum, log) => sum + log.quantityUsed, 0);
  const usageCount = logs.length;
  const averagePerUsage = usageCount > 0 ? totalUsed / usageCount : 0;

  // Calculate usage frequency (average days between uses)
  const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let totalDaysBetweenUses = 0;
  let intervals = 0;
  for (let i = 1; i < sortedLogs.length; i++) {
    const daysDiff = differenceInDays(new Date(sortedLogs[i].date), new Date(sortedLogs[i - 1].date));
    totalDaysBetweenUses += daysDiff;
    intervals++;
  }
  const averageDaysBetweenUses = intervals > 0 ? totalDaysBetweenUses / intervals : 0;

  // Last used date
  const lastUsedLog = sortedLogs[sortedLogs.length - 1];
  const lastUsedDate = lastUsedLog ? new Date(lastUsedLog.date) : null;

  // Monthly trend data (last 6 months)
  const sixMonthsAgo = subMonths(new Date(), 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: new Date() });
  
  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthlyUsage = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= monthStart && logDate <= monthEnd;
    }).reduce((sum, log) => sum + log.quantityUsed, 0);

    return {
      month: format(month, 'MMM yyyy'),
      quantity: monthlyUsage
    };
  });

  // Top users data
  const userUsage = logs.reduce((acc, log) => {
    if (!acc[log.usedBy]) {
      acc[log.usedBy] = 0;
    }
    acc[log.usedBy] += log.quantityUsed;
    return acc;
  }, {} as Record<string, number>);

  const topUsers = Object.entries(userUsage)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Usage purposes
  const purposeUsage = logs.reduce((acc, log) => {
    if (!acc[log.usedFor]) {
      acc[log.usedFor] = 0;
    }
    acc[log.usedFor] += log.quantityUsed;
    return acc;
  }, {} as Record<string, number>);

  const topPurposes = Object.entries(purposeUsage)
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Consumable Analytics - {consumable.name}</DialogTitle>
          <DialogDescription>
            Usage statistics and trends for {site.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalUsed.toFixed(2)} {consumable.unitOfMeasurement}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Usage Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{usageCount}x</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Avg Per Use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averagePerUsage.toFixed(2)} {consumable.unitOfMeasurement}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Frequency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {averageDaysBetweenUses > 0 ? `${averageDaysBetweenUses.toFixed(1)} days` : 'N/A'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Last Used */}
          {lastUsedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last Used</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{format(lastUsedDate, 'PPP')}</p>
              </CardContent>
            </Card>
          )}

          {/* Monthly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Trend (Last 6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="quantity" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name={`Quantity (${consumable.unitOfMeasurement})`}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Users */}
          {topUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topUsers}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="quantity" 
                      fill="hsl(var(--primary))"
                      name={`Quantity (${consumable.unitOfMeasurement})`}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top Usage Purposes */}
          {topPurposes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Usage Purposes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topPurposes} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar 
                      dataKey="quantity" 
                      fill="hsl(var(--chart-2))"
                      name={`Quantity (${consumable.unitOfMeasurement})`}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights for Operations Planning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {averageDaysBetweenUses > 0 && averageDaysBetweenUses < 7 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-md">
                  <p className="text-sm font-medium">⚠️ High Usage Frequency</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This consumable is used every {averageDaysBetweenUses.toFixed(1)} days on average. Consider increasing stock levels.
                  </p>
                </div>
              )}
              
              {totalUsed > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <p className="text-sm font-medium">📊 Usage Rate</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Average consumption: {averagePerUsage.toFixed(2)} {consumable.unitOfMeasurement} per usage event
                  </p>
                </div>
              )}

              {monthlyData.length > 1 && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-md">
                  <p className="text-sm font-medium">💡 Cost Optimization</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on usage trends, you can better forecast inventory needs and reduce waste.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
