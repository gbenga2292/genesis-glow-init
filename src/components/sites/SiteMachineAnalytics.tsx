import { useState, useMemo } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Site, Asset, CompanySettings } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { BarChart3, TrendingUp, Clock, Fuel, Activity, Calendar, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";

interface SiteMachineAnalyticsProps {
  site: Site;
  equipment: Asset[];
  equipmentLogs: EquipmentLog[];
  selectedEquipmentId?: string;
  companySettings?: CompanySettings;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface MachineAnalytics {
  equipmentId: string;
  equipmentName: string;
  totalFuelConsumption: number;
  totalDowntimeHours: number;
  activeDays: number;
  totalLoggedDays: number;
  efficiencyPercentage: number;
  monthlyActiveHours: number;
  averageDowntimePerActiveDay: number;
  fuelEfficiency: number; // liters per active hour
  logs: EquipmentLog[];
}

export const SiteMachineAnalytics = ({
  site,
  equipment,
  equipmentLogs,
  companySettings
}: SiteMachineAnalyticsProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Filter logs for this site only
  const siteLogs = useMemo(() => {
    return equipmentLogs.filter(log => String(log.siteId) === String(site.id));
  }, [equipmentLogs, site.id]);

  // Get date range based on selected period and date
  const dateRange = useMemo(() => {
    const now = selectedDate;
    switch (selectedPeriod) {
      case 'daily':
        return { start: now, end: now };
      case 'weekly':
        return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly':
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [selectedPeriod, selectedDate]);

  // Filter logs within the selected date range
  const filteredLogs = useMemo(() => {
    return siteLogs.filter(log =>
      isWithinInterval(log.date, { start: dateRange.start, end: dateRange.end })
    );
  }, [siteLogs, dateRange]);

  // Calculate downtime hours from downtime entries
  const calculateDowntimeHours = (downtimeEntries: any[]): number => {
    let totalMinutes = 0;
    downtimeEntries.forEach(entry => {
      if (entry.downtime && entry.uptime) {
        try {
          // Parse time strings like "14:30" to minutes
          const downtimeParts = entry.downtime.split(':').map(Number);
          const uptimeParts = entry.uptime.split(':').map(Number);

          const downtimeMinutes = downtimeParts[0] * 60 + downtimeParts[1];
          const uptimeMinutes = uptimeParts[0] * 60 + uptimeParts[1];

          if (uptimeMinutes > downtimeMinutes) {
            totalMinutes += uptimeMinutes - downtimeMinutes;
          }
        } catch (error) {
          logger.debug('Invalid time format in downtime entry', { context: 'SiteMachineAnalytics', data: { entry } });
        }
      }
    });
    return totalMinutes / 60; // Convert to hours
  };

  // Calculate analytics for each machine
  const machineAnalytics = useMemo((): MachineAnalytics[] => {
    const analytics: MachineAnalytics[] = [];

    // Group logs by equipment
    const logsByEquipment = filteredLogs.reduce((acc, log) => {
      if (!acc[log.equipmentId]) {
        acc[log.equipmentId] = [];
      }
      acc[log.equipmentId].push(log);
      return acc;
    }, {} as Record<string, EquipmentLog[]>);

    Object.entries(logsByEquipment).forEach(([equipmentId, logs]) => {
      const equipmentItem = equipment.find(eq => eq.id === equipmentId);
      if (!equipmentItem) return;

      const totalFuelConsumption = logs.reduce((sum, log) => sum + (log.dieselEntered || 0), 0);
      const totalDowntimeHours = logs.reduce((sum, log) =>
        sum + calculateDowntimeHours(log.downtimeEntries || []), 0
      );
      const activeDays = logs.filter(log => log.active).length;
      const totalLoggedDays = logs.length;
      const efficiencyPercentage = totalLoggedDays > 0 ? (activeDays / totalLoggedDays) * 100 : 0;
      const monthlyActiveHours = activeDays * 24; // Assuming 24 hours per active day
      const averageDowntimePerActiveDay = activeDays > 0 ? totalDowntimeHours / activeDays : 0;
      const totalActiveHours = activeDays * 24 - totalDowntimeHours;
      const fuelEfficiency = totalActiveHours > 0 ? totalFuelConsumption / totalActiveHours : 0;

      analytics.push({
        equipmentId,
        equipmentName: equipmentItem.name,
        totalFuelConsumption,
        totalDowntimeHours,
        activeDays,
        totalLoggedDays,
        efficiencyPercentage,
        monthlyActiveHours,
        averageDowntimePerActiveDay,
        fuelEfficiency,
        logs
      });
    });

    return analytics;
  }, [filteredLogs, equipment]);

  // Overall site analytics
  const siteAnalytics = useMemo(() => {
    const totalFuel = machineAnalytics.reduce((sum, machine) => sum + machine.totalFuelConsumption, 0);
    const totalDowntime = machineAnalytics.reduce((sum, machine) => sum + machine.totalDowntimeHours, 0);
    const totalActiveDays = machineAnalytics.reduce((sum, machine) => sum + machine.activeDays, 0);
    const totalLoggedDays = machineAnalytics.reduce((sum, machine) => sum + machine.totalLoggedDays, 0);
    const avgEfficiency = machineAnalytics.length > 0 ?
      machineAnalytics.reduce((sum, machine) => sum + machine.efficiencyPercentage, 0) / machineAnalytics.length : 0;

    return {
      totalFuelConsumption: totalFuel,
      totalDowntimeHours: totalDowntime,
      totalActiveDays,
      totalLoggedDays,
      averageEfficiency: avgEfficiency,
      totalMachines: machineAnalytics.length
    };
  }, [machineAnalytics]);

  const generatePDFReport = () => {
    if (!companySettings) return;

    const periodLabel = selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
    const dateRangeText = `${format(dateRange.start, 'PPP')} to ${format(dateRange.end, 'PPP')}`;

    // Transform machine data for the report
    const reportData = machineAnalytics.map(machine => ({
      equipmentName: machine.equipmentName,
      fuelConsumption: machine.totalFuelConsumption.toFixed(2),
      downtime: machine.totalDowntimeHours.toFixed(2),
      activeDays: machine.activeDays,
      efficiency: machine.efficiencyPercentage.toFixed(1),
      fuelEfficiency: machine.fuelEfficiency.toFixed(2),
      avgDowntime: machine.averageDowntimePerActiveDay.toFixed(2)
    }));

    generateUnifiedReport({
      title: 'Machine Analytics Report',
      subtitle: `${site.name} | ${periodLabel} Period`,
      reportType: `${dateRangeText}`,
      companySettings,
      orientation: 'landscape',
      columns: [
        { header: 'Machine', dataKey: 'equipmentName', width: 40 },
        { header: 'Fuel Used (L)', dataKey: 'fuelConsumption', width: 25 },
        { header: 'Downtime (hrs)', dataKey: 'downtime', width: 28 },
        { header: 'Active Days', dataKey: 'activeDays', width: 25 },
        { header: 'Efficiency (%)', dataKey: 'efficiency', width: 28 },
        { header: 'Fuel Eff. (L/hr)', dataKey: 'fuelEfficiency', width: 30 },
        { header: 'Avg Downtime/Day', dataKey: 'avgDowntime', width: 35 }
      ],
      data: reportData,
      summaryStats: [
        { label: 'Total Machines', value: siteAnalytics.totalMachines },
        { label: 'Total Fuel Consumption', value: `${siteAnalytics.totalFuelConsumption.toFixed(2)} L` },
        { label: 'Total Downtime', value: `${siteAnalytics.totalDowntimeHours.toFixed(2)} hrs` },
        { label: 'Total Active Days', value: siteAnalytics.totalActiveDays },
        { label: 'Average Efficiency', value: `${siteAnalytics.averageEfficiency.toFixed(1)}%` },
        { label: 'Period', value: periodLabel }
      ]
    });
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily':
        return format(selectedDate, 'PPP');
      case 'weekly':
        return `Week of ${format(dateRange.start, 'PPP')}`;
      case 'monthly':
        return format(selectedDate, 'MMMM yyyy');
      case 'yearly':
        return format(selectedDate, 'yyyy');
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Machine Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generatePDFReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing data for: {getPeriodLabel()}
      </div>

      {/* Site Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium ml-2">Total Fuel Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{siteAnalytics.totalFuelConsumption.toFixed(2)} L</div>
            <p className="text-xs text-muted-foreground">Across all machines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium ml-2">Total Downtime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{siteAnalytics.totalDowntimeHours.toFixed(2)} hrs</div>
            <p className="text-xs text-muted-foreground">Maintenance & issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium ml-2">Active Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{siteAnalytics.totalActiveDays}</div>
            <p className="text-xs text-muted-foreground">Out of {siteAnalytics.totalLoggedDays} logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium ml-2">Avg Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{siteAnalytics.averageEfficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Machine utilization</p>
          </CardContent>
        </Card>
      </div>

      {/* Machine Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine</TableHead>
                <TableHead>Fuel Used (L)</TableHead>
                <TableHead>Downtime (hrs)</TableHead>
                <TableHead>Active Days</TableHead>
                <TableHead>Efficiency</TableHead>
                <TableHead>Fuel Efficiency (L/hr)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machineAnalytics.map((machine) => (
                <TableRow key={machine.equipmentId}>
                  <TableCell className="font-medium">{machine.equipmentName}</TableCell>
                  <TableCell>{machine.totalFuelConsumption.toFixed(2)}</TableCell>
                  <TableCell>{machine.totalDowntimeHours.toFixed(2)}</TableCell>
                  <TableCell>{machine.activeDays}/{machine.totalLoggedDays}</TableCell>
                  <TableCell>
                    <Badge variant={machine.efficiencyPercentage >= 80 ? "default" : machine.efficiencyPercentage >= 60 ? "secondary" : "destructive"}>
                      {machine.efficiencyPercentage.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{machine.fuelEfficiency.toFixed(2)}</TableCell>
                </TableRow>
              ))}
              {machineAnalytics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No machine data available for the selected period
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Retention Note */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Data Retention</h4>
              <p className="text-sm text-blue-700 mt-1">
                Equipment logs are permanently stored and will be retained even after machines are returned to inventory.
                Historical analytics data remains accessible for reporting and analysis purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
