import { useState, useMemo } from "react";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Site, Asset, CompanySettings } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { BarChart3, TrendingUp, Clock, Fuel, Activity, Calendar as CalendarIcon, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, eachDayOfInterval, isSameDay, isSameMonth, isSameYear, getWeek, min } from "date-fns";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";
import { useIsMobile } from "@/hooks/use-mobile";

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
  fuelEfficiency: number;
  logs: EquipmentLog[];
}

export const SiteMachineAnalytics = ({
  site,
  equipment,
  equipmentLogs,
  companySettings
}: SiteMachineAnalyticsProps) => {
  const isMobile = useIsMobile();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showPreview, setShowPreview] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const siteLogs = useMemo(() => {
    return equipmentLogs.filter(log => String(log.siteId) === String(site.id));
  }, [equipmentLogs, site.id]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    siteLogs.forEach(log => {
      years.add(new Date(log.date).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [siteLogs]);

  const availableMonthsInYear = useMemo(() => {
    const year = selectedDate.getFullYear();
    const months: Date[] = [];
    const existingMonths = new Set<number>();
    
    siteLogs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate.getFullYear() === year && !existingMonths.has(logDate.getMonth())) {
        existingMonths.add(logDate.getMonth());
        months.push(startOfMonth(logDate));
      }
    });
    
    const now = new Date();
    if (now.getFullYear() === year && !existingMonths.has(now.getMonth())) {
      months.push(startOfMonth(now));
    }
    
    return months.sort((a, b) => a.getTime() - b.getTime());
  }, [siteLogs, selectedDate]);

  const availableWeeksInPeriod = useMemo(() => {
    const weeks: { date: Date; label: string }[] = [];
    const existingWeeks = new Set<string>();
    
    const year = selectedDate.getFullYear();
    let start: Date;
    let end: Date;
    
    if (selectedPeriod === 'yearly') {
      start = new Date(year, 0, 1);
      end = endOfYear(new Date(year, 0, 1));
    } else {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    }
    
    siteLogs.forEach(log => {
      const logDate = new Date(log.date);
      const weekNum = getWeek(logDate, { weekStartsOn: 1 });
      const weekKey = `${logDate.getFullYear()}-${weekNum}`;
      
      if (!existingWeeks.has(weekKey) && isSameYear(logDate, start) && 
          (selectedPeriod === 'yearly' || isSameMonth(logDate, selectedDate))) {
        existingWeeks.add(weekKey);
        const weekStart = startOfWeek(logDate);
        weeks.push({
          date: weekStart,
          label: `Week ${weekNum} (${format(weekStart, 'MMM d')})`
        });
      }
    });
    
    const now = new Date();
    if (selectedPeriod === 'yearly' || isSameMonth(now, selectedDate)) {
      const currentWeekNum = getWeek(now, { weekStartsOn: 1 });
      const weekKey = `${now.getFullYear()}-${currentWeekNum}`;
      if (!existingWeeks.has(weekKey)) {
        const weekStart = startOfWeek(now);
        weeks.push({
          date: weekStart,
          label: `Week ${currentWeekNum} (${format(weekStart, 'MMM d')})`
        });
      }
    }
    
    return weeks.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [siteLogs, selectedDate, selectedPeriod]);

  // Get ALL days that have logs (for daily view dropdown)
  const allDaysWithLogs = useMemo(() => {
    const days: { date: Date; label: string }[] = [];
    const existingDays = new Set<string>();
    
    // Get all unique dates from logs
    siteLogs.forEach(log => {
      const logDate = new Date(log.date);
      const dayKey = logDate.toISOString().split('T')[0];
      if (!existingDays.has(dayKey)) {
        existingDays.add(dayKey);
        days.push({
          date: new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate()),
          label: format(logDate, 'EEE, MMM d, yyyy')
        });
      }
    });
    
    // Also add today if not in logs
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    if (!existingDays.has(todayKey)) {
      days.push({
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        label: format(now, 'EEE, MMM d, yyyy')
      });
    }
    
    return days.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [siteLogs]);

  // Days in selected period (for calendar highlighting)
  const availableDaysInPeriod = useMemo(() => {
    const days: { date: Date; label: string }[] = [];
    const existingDays = new Set<string>();
    
    let start: Date;
    let end: Date;
    
    if (selectedPeriod === 'yearly') {
      const year = selectedDate.getFullYear();
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31);
    } else if (selectedPeriod === 'monthly') {
      start = startOfMonth(selectedDate);
      end = endOfMonth(selectedDate);
    } else {
      start = startOfWeek(selectedDate);
      end = endOfWeek(selectedDate);
    }
    
    const now = new Date();
    const effectiveEnd = min([end, now]);
    
    const allDays = eachDayOfInterval({ start, end: effectiveEnd });
    
    allDays.forEach(day => {
      const dayKey = day.toISOString().split('T')[0];
      if (!existingDays.has(dayKey)) {
        existingDays.add(dayKey);
        days.push({
          date: day,
          label: format(day, 'EEE, MMM d')
        });
      }
    });
    
    return days.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [siteLogs, selectedDate, selectedPeriod]);

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

  const handlePeriodChange = (period: TimePeriod) => {
    setSelectedPeriod(period);
    setSelectedDate(new Date());
  };

  const handleQuickSelect = (value: string) => {
    if (value === 'custom') {
      setShowDatePicker(true);
      return;
    }
    const newDate = new Date(value);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const filteredLogs = useMemo(() => {
    return siteLogs.filter(log =>
      isWithinInterval(log.date, { start: dateRange.start, end: dateRange.end })
    );
  }, [siteLogs, dateRange]);

  const calculateDowntimeHours = (downtimeEntries: any[]): number => {
    let totalMinutes = 0;
    downtimeEntries.forEach(entry => {
      if (entry.downtime && entry.uptime) {
        try {
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
    return totalMinutes / 60;
  };

  const machineAnalytics = useMemo((): MachineAnalytics[] => {
    const analytics: MachineAnalytics[] = [];
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
      const monthlyActiveHours = activeDays * 24;
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

  const generatePDFReport = async () => {
    if (!companySettings) return;
    const periodLabel = selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1);
    const dateRangeText = `${format(dateRange.start, 'PPP')} to ${format(dateRange.end, 'PPP')}`;
    const reportData = machineAnalytics.map(machine => ({
      equipmentName: machine.equipmentName,
      fuelConsumption: machine.totalFuelConsumption.toFixed(2),
      downtime: machine.totalDowntimeHours.toFixed(2),
      activeDays: machine.activeDays,
      efficiency: machine.efficiencyPercentage.toFixed(1),
      fuelEfficiency: machine.fuelEfficiency.toFixed(2),
      avgDowntime: machine.averageDowntimePerActiveDay.toFixed(2)
    }));

    await generateUnifiedReport({
      title: 'Machine Analytics Report',
      subtitle: `${site.name} | ${periodLabel} Period`,
      reportType: dateRangeText,
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

  // For daily view, show ALL days with logs (not just current month)
  const dailyOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    // Use allDaysWithLogs for daily view
    allDaysWithLogs.forEach(day => {
      options.push({ value: day.date.toISOString(), label: day.label });
    });
    return options;
  }, [allDaysWithLogs]);

  const quickSelectOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    switch (selectedPeriod) {
      case 'daily':
        // Already computed in dailyOptions
        break;
      case 'weekly':
        availableWeeksInPeriod.forEach(week => {
          options.push({ value: week.date.toISOString(), label: week.label });
        });
        break;
      case 'monthly':
        availableMonthsInYear.forEach(month => {
          options.push({ value: month.toISOString(), label: format(month, 'MMMM yyyy') });
        });
        break;
      case 'yearly':
        availableYears.forEach(year => {
          options.push({ value: new Date(year, 0, 1).toISOString(), label: year.toString() });
        });
        break;
    }
    return options;
  }, [selectedPeriod, availableWeeksInPeriod, availableMonthsInYear, availableYears]);

  const monthlyOptions = useMemo(() => {
    const year = selectedDate.getFullYear();
    const months: { value: string; label: string }[] = [];
    const existingMonths = new Set<number>();
    
    siteLogs.forEach(log => {
      const logDate = new Date(log.date);
      if (logDate.getFullYear() === year && !existingMonths.has(logDate.getMonth())) {
        existingMonths.add(logDate.getMonth());
        months.push({ value: startOfMonth(logDate).toISOString(), label: format(logDate, 'MMMM') });
      }
    });
    
    const now = new Date();
    if (now.getFullYear() === year && !existingMonths.has(now.getMonth())) {
      months.push({ value: startOfMonth(now).toISOString(), label: format(now, 'MMMM') });
    }
    
    return months.sort((a, b) => new Date(a.value).getTime() - new Date(b.value).getTime());
  }, [siteLogs, selectedDate]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
          <h3 className="text-base sm:text-lg font-semibold">Machine Analytics</h3>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(value) => handlePeriodChange(value as TimePeriod)}>
            <SelectTrigger className="w-[90px] sm:w-[100px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedDate.toISOString()} onValueChange={handleQuickSelect}>
            <SelectTrigger className="w-[140px] sm:w-[180px] text-xs sm:text-sm">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {selectedPeriod === 'daily' && dailyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
              {selectedPeriod === 'weekly' && quickSelectOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
              {selectedPeriod === 'monthly' && monthlyOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
              {selectedPeriod === 'yearly' && quickSelectOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
              <SelectItem value="custom" className="text-muted-foreground">
                <CalendarIcon className="h-3 w-3 mr-2 inline" />
                Custom Date...
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => setShowPreview(true)} variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            {isMobile ? 'PDF' : 'Export PDF'}
          </Button>
        </div>
      </div>

      <div className="text-xs sm:text-sm text-muted-foreground">
        {getPeriodLabel()}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-1 sm:pb-2 p-2 sm:p-6">
            <Fuel className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-xs sm:text-sm font-medium ml-1.5 sm:ml-2 truncate">Fuel</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{siteAnalytics.totalFuelConsumption.toFixed(1)} L</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Across all machines</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-1 sm:pb-2 p-2 sm:p-6">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-xs sm:text-sm font-medium ml-1.5 sm:ml-2 truncate">Downtime</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{siteAnalytics.totalDowntimeHours.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Maintenance & issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-1 sm:pb-2 p-2 sm:p-6">
            <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-xs sm:text-sm font-medium ml-1.5 sm:ml-2 truncate">Active</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{siteAnalytics.totalActiveDays}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">of {siteAnalytics.totalLoggedDays} logged</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-1 sm:pb-2 p-2 sm:p-6">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-xs sm:text-sm font-medium ml-1.5 sm:ml-2 truncate">Efficiency</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6 pt-0">
            <div className="text-lg sm:text-2xl font-bold">{siteAnalytics.averageEfficiency.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground hidden sm:block">Utilization</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Machine Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0">
          {isMobile ? (
            <div className="space-y-2">
              {machineAnalytics.map((machine) => (
                <div key={machine.equipmentId} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate flex-1 mr-2">{machine.equipmentName}</span>
                    <Badge variant={machine.efficiencyPercentage >= 80 ? "default" : machine.efficiencyPercentage >= 60 ? "secondary" : "destructive"} className="text-xs shrink-0">
                      {machine.efficiencyPercentage.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <span className="block font-medium text-foreground">{machine.totalFuelConsumption.toFixed(1)}L</span>
                      Fuel
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">{machine.totalDowntimeHours.toFixed(1)}h</span>
                      Downtime
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">{machine.activeDays}/{machine.totalLoggedDays}</span>
                      Active
                    </div>
                  </div>
                </div>
              ))}
              {machineAnalytics.length === 0 && (
                <p className="text-center text-muted-foreground py-6 text-sm">No machine data for this period</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Fuel (L)</TableHead>
                  <TableHead>Downtime</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Efficiency</TableHead>
                  <TableHead>Fuel Eff.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machineAnalytics.map((machine) => (
                  <TableRow key={machine.equipmentId}>
                    <TableCell className="font-medium">{machine.equipmentName}</TableCell>
                    <TableCell>{machine.totalFuelConsumption.toFixed(2)}</TableCell>
                    <TableCell>{machine.totalDowntimeHours.toFixed(2)}h</TableCell>
                    <TableCell>{machine.activeDays}/{machine.totalLoggedDays}</TableCell>
                    <TableCell>
                      <Badge variant={machine.efficiencyPercentage >= 80 ? "default" : machine.efficiencyPercentage >= 60 ? "secondary" : "destructive"}>
                        {machine.efficiencyPercentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{machine.fuelEfficiency.toFixed(2)} L/hr</TableCell>
                  </TableRow>
                ))}
                {machineAnalytics.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No machine data for the selected period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">Data Retention</h4>
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-200 mt-1">
                Logs are stored permanently for historical analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Custom Date</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Calendar mode="single" selected={selectedDate} onSelect={(date) => { if (date) { setSelectedDate(date); setShowDatePicker(false); } }} className="rounded-md border" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Preview: Machine Analytics</DialogTitle>
            <DialogDescription>{site.name} | {getPeriodLabel()}</DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/50 p-3 rounded-lg">
                <span className="text-xs text-muted-foreground block">Total Fuel</span>
                <span className="font-bold text-lg">{siteAnalytics.totalFuelConsumption.toFixed(1)} L</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <span className="text-xs text-muted-foreground block">Total Downtime</span>
                <span className="font-bold text-lg">{siteAnalytics.totalDowntimeHours.toFixed(1)} hrs</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <span className="text-xs text-muted-foreground block">Efficiency</span>
                <span className="font-bold text-lg">{siteAnalytics.averageEfficiency.toFixed(1)}%</span>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <span className="text-xs text-muted-foreground block">Machines</span>
                <span className="font-bold text-lg">{siteAnalytics.totalMachines}</span>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Machine</TableHead>
                    <TableHead>Fuel Used (L)</TableHead>
                    <TableHead>Downtime (hrs)</TableHead>
                    <TableHead>Active Days</TableHead>
                    <TableHead>Efficiency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machineAnalytics.map((machine) => (
                    <TableRow key={machine.equipmentId}>
                      <TableCell className="font-medium">{machine.equipmentName}</TableCell>
                      <TableCell>{machine.totalFuelConsumption.toFixed(2)}</TableCell>
                      <TableCell>{machine.totalDowntimeHours.toFixed(2)}</TableCell>
                      <TableCell>{machine.activeDays}</TableCell>
                      <TableCell>
                        <Badge variant={machine.efficiencyPercentage >= 80 ? "default" : machine.efficiencyPercentage >= 60 ? "secondary" : "destructive"}>
                          {machine.efficiencyPercentage.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {machineAnalytics.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No data available for this period</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            <Button onClick={() => { generatePDFReport(); setShowPreview(false); }}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
