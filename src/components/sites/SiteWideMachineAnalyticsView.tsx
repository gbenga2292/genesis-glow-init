import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Site, Asset } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Fuel, Clock, Activity, Calendar } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SiteWideMachineAnalyticsViewProps {
    site: Site;
    equipment: Asset[];
    equipmentLogs: EquipmentLog[];
}

export const SiteWideMachineAnalyticsView = ({
    site,
    equipment,
    equipmentLogs
}: SiteWideMachineAnalyticsViewProps) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('overview');

    // Filter machines at this site - use String() for safe comparison
    const siteId = String(site.id);
    const siteMachines = equipment.filter(asset =>
        asset.type === 'equipment' &&
        asset.siteQuantities &&
        (asset.siteQuantities[siteId] > 0 || asset.siteQuantities[site.id] > 0)
    );

    // Filter logs for this site - use String() for safe comparison
    const siteLogs = equipmentLogs.filter(log => String(log.siteId) === siteId);

    // Calculate downtime hours from downtime entries
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
                    // Skip invalid entries
                }
            }
        });
        return totalMinutes / 60;
    };

    // Fuel usage trends over last 30 days
    const getLast30DaysFuelData = () => {
        const days = eachDayOfInterval({
            start: startOfDay(subDays(new Date(), 29)),
            end: startOfDay(new Date())
        });

        return days.map(day => {
            const dayStr = format(day, 'MMM dd');
            const dayLogs = siteLogs.filter(log =>
                format(new Date(log.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
            );
            const totalFuel = dayLogs.reduce((sum, log) => sum + (log.dieselEntered || 0), 0);
            const totalDowntime = dayLogs.reduce((sum, log) =>
                sum + calculateDowntimeHours(log.downtimeEntries || []), 0
            );
            return { date: dayStr, fuel: totalFuel, downtime: totalDowntime };
        });
    };

    // Machine-wise fuel consumption
    const getMachineFuelBreakdown = () => {
        const machineData = siteMachines.map(machine => {
            const logs = siteLogs.filter(log => log.equipmentId === machine.id);
            const totalFuel = logs.reduce((sum, log) => sum + (log.dieselEntered || 0), 0);
            const totalDowntime = logs.reduce((sum, log) =>
                sum + calculateDowntimeHours(log.downtimeEntries || []), 0
            );
            const activeDays = logs.filter(log => log.active).length;
            const efficiency = logs.length > 0 ? (activeDays / logs.length) * 100 : 0;

            return {
                name: machine.name,
                fuel: totalFuel,
                downtime: totalDowntime,
                activeDays,
                efficiency,
                logs: logs.length
            };
        }).sort((a, b) => b.fuel - a.fuel);

        return machineData;
    };

    // Downtime reasons analysis
    const getDowntimeReasons = () => {
        const reasons: Record<string, { count: number; hours: number }> = {};

        siteLogs.forEach(log => {
            log.downtimeEntries?.forEach((entry: any) => {
                const reason = entry.downtimeReason || 'Unknown';
                if (!reasons[reason]) {
                    reasons[reason] = { count: 0, hours: 0 };
                }
                reasons[reason].count++;

                // Calculate hours for this entry
                if (entry.downtime && entry.uptime) {
                    try {
                        const downtimeParts = entry.downtime.split(':').map(Number);
                        const uptimeParts = entry.uptime.split(':').map(Number);
                        const downtimeMinutes = downtimeParts[0] * 60 + downtimeParts[1];
                        const uptimeMinutes = uptimeParts[0] * 60 + uptimeParts[1];
                        if (uptimeMinutes > downtimeMinutes) {
                            reasons[reason].hours += (uptimeMinutes - downtimeMinutes) / 60;
                        }
                    } catch (error) {
                        // Skip invalid entries
                    }
                }
            });
        });

        return Object.entries(reasons)
            .map(([reason, data]) => ({ reason, ...data }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);
    };

    // Machine efficiency distribution
    const getEfficiencyDistribution = () => {
        let highEfficiency = 0;
        let mediumEfficiency = 0;
        let lowEfficiency = 0;

        siteMachines.forEach(machine => {
            const logs = siteLogs.filter(log => log.equipmentId === machine.id);
            const activeDays = logs.filter(log => log.active).length;
            const efficiency = logs.length > 0 ? (activeDays / logs.length) * 100 : 0;

            if (efficiency >= 80) highEfficiency++;
            else if (efficiency >= 60) mediumEfficiency++;
            else lowEfficiency++;
        });

        return [
            { name: 'High (≥80%)', value: highEfficiency, color: '#10b981' },
            { name: 'Medium (60-79%)', value: mediumEfficiency, color: '#f59e0b' },
            { name: 'Low (<60%)', value: lowEfficiency, color: '#ef4444' }
        ];
    };

    // Calculate insights
    const getInsights = () => {
        const insights = [];
        const machineBreakdown = getMachineFuelBreakdown();
        const downtimeReasons = getDowntimeReasons();
        const efficiencyDist = getEfficiencyDistribution();

        // Low efficiency alert
        if (efficiencyDist[2].value > 0) {
            insights.push({
                type: 'critical',
                icon: AlertTriangle,
                title: 'Low Efficiency Alert',
                description: `${efficiencyDist[2].value} machine(s) operating below 60% efficiency.`,
                color: 'text-destructive'
            });
        }

        // High fuel consumption
        if (machineBreakdown.length > 0 && machineBreakdown[0].fuel > 0) {
            const totalFuel = machineBreakdown.reduce((sum, m) => sum + m.fuel, 0);
            const topMachinePercentage = (machineBreakdown[0].fuel / totalFuel) * 100;
            insights.push({
                type: 'info',
                icon: Fuel,
                title: 'Highest Fuel Consumer',
                description: `${machineBreakdown[0].name} uses ${machineBreakdown[0].fuel.toFixed(2)}L (${topMachinePercentage.toFixed(0)}% of total).`,
                color: 'text-primary'
            });
        }

        // Downtime analysis
        if (downtimeReasons.length > 0) {
            insights.push({
                type: 'warning',
                icon: Clock,
                title: 'Top Downtime Reason',
                description: `"${downtimeReasons[0].reason}" - ${downtimeReasons[0].hours.toFixed(1)}h (${downtimeReasons[0].count} incidents).`,
                color: 'text-orange-600'
            });
        }

        // Operational recommendation
        const totalDowntime = machineBreakdown.reduce((sum, m) => sum + m.downtime, 0);
        const totalLogs = siteLogs.length;
        const avgDowntimePerLog = totalLogs > 0 ? totalDowntime / totalLogs : 0;

        if (avgDowntimePerLog > 2) {
            insights.push({
                type: 'recommendation',
                icon: Activity,
                title: 'Maintenance Optimization',
                description: `Avg downtime ${avgDowntimePerLog.toFixed(1)}h per day. Consider preventive maintenance.`,
                color: 'text-purple-600'
            });
        }

        // Efficiency trend
        const recentLogs = siteLogs.filter(log =>
            new Date(log.date) >= subDays(new Date(), 7)
        );
        const recentActiveDays = recentLogs.filter(log => log.active).length;
        const recentEfficiency = recentLogs.length > 0 ? (recentActiveDays / recentLogs.length) * 100 : 0;

        if (recentEfficiency >= 85) {
            insights.push({
                type: 'positive',
                icon: TrendingUp,
                title: 'Excellent Performance',
                description: `7-day efficiency at ${recentEfficiency.toFixed(1)}%. Great work!`,
                color: 'text-green-600'
            });
        }

        return insights;
    };

    const trendData = getLast30DaysFuelData();
    const machineBreakdown = getMachineFuelBreakdown();
    const downtimeReasons = getDowntimeReasons();
    const efficiencyDistribution = getEfficiencyDistribution();
    const insights = getInsights();

    // Calculate totals
    const totalFuel = machineBreakdown.reduce((sum, m) => sum + m.fuel, 0);
    const totalDowntime = machineBreakdown.reduce((sum, m) => sum + m.downtime, 0);
    const avgEfficiency = machineBreakdown.length > 0
        ? machineBreakdown.reduce((sum, m) => sum + m.efficiency, 0) / machineBreakdown.length
        : 0;

    const tabs = [
        { value: 'overview', label: 'Overview' },
        { value: 'trends', label: 'Trends' },
        { value: 'downtime', label: 'Downtime' },
        { value: 'insights', label: 'Insights' }
    ];

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                    Machine Analytics - {site.name}
                </h2>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Mobile dropdown or desktop tabs */}
                {isMobile ? (
                    <Select value={activeTab} onValueChange={setActiveTab}>
                        <SelectTrigger className="w-full mb-4">
                            <SelectValue placeholder="Select view" />
                        </SelectTrigger>
                        <SelectContent>
                            {tabs.map(tab => (
                                <SelectItem key={tab.value} value={tab.value}>
                                    {tab.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <TabsList className="grid w-full grid-cols-4">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value}>
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                )}

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    {/* Stats Cards - Mobile responsive grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <Card>
                            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                                <CardTitle className="text-xs sm:text-sm font-medium">Total Machines</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-0">
                                <div className="text-xl sm:text-2xl font-bold">{siteMachines.length}</div>
                                <p className="text-xs text-muted-foreground">Active at this site</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                                <CardTitle className="text-xs sm:text-sm font-medium">Total Fuel</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-0">
                                <div className="text-xl sm:text-2xl font-bold">{totalFuel.toFixed(1)} L</div>
                                <p className="text-xs text-muted-foreground">All time usage</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                                <CardTitle className="text-xs sm:text-sm font-medium">Avg Efficiency</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-0">
                                <div className="text-xl sm:text-2xl font-bold">{avgEfficiency.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">Active days ratio</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Efficiency Distribution - Mobile responsive */}
                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Efficiency Distribution</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Performance across machines</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                                <PieChart>
                                    <Pie
                                        data={efficiencyDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={isMobile ? undefined : (entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={isMobile ? 60 : 100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {efficiencyDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Machine Fuel Breakdown - Mobile responsive */}
                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Fuel by Machine</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                                <BarChart data={machineBreakdown.slice(0, isMobile ? 5 : 10)}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: isMobile ? 10 : 12 }} angle={isMobile ? -45 : 0} textAnchor={isMobile ? "end" : "middle"} height={isMobile ? 60 : 30} />
                                    <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                                    <Tooltip />
                                    {!isMobile && <Legend />}
                                    <Bar dataKey="fuel" fill="hsl(var(--primary))" name="Fuel (L)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Machine Performance - Mobile card layout */}
                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Machine Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <div className="space-y-2 sm:space-y-3">
                                {machineBreakdown.map((machine) => (
                                    <div key={machine.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{machine.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {machine.fuel.toFixed(1)}L • {machine.downtime.toFixed(1)}h down • {machine.activeDays} active
                                            </p>
                                        </div>
                                        <Badge 
                                            variant={machine.efficiency >= 80 ? "default" : machine.efficiency >= 60 ? "secondary" : "destructive"}
                                            className="self-start sm:self-center shrink-0"
                                        >
                                            {machine.efficiency.toFixed(0)}%
                                        </Badge>
                                    </div>
                                ))}
                                {machineBreakdown.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6 text-sm">No machine data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Trends Tab */}
                <TabsContent value="trends" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Fuel & Downtime - 30 Days</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Daily patterns</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" tick={{ fontSize: isMobile ? 8 : 12 }} interval={isMobile ? 4 : 2} />
                                    <YAxis yAxisId="left" tick={{ fontSize: isMobile ? 10 : 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: isMobile ? 10 : 12 }} />
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }} />
                                    <Line yAxisId="left" type="monotone" dataKey="fuel" stroke="hsl(var(--primary))" name="Fuel (L)" strokeWidth={2} />
                                    <Line yAxisId="right" type="monotone" dataKey="downtime" stroke="hsl(var(--chart-2))" name="Downtime (h)" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Machine Trends</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <div className="space-y-2 sm:space-y-4">
                                {machineBreakdown.slice(0, 5).map((machine) => {
                                    const recentLogs = siteLogs.filter(log =>
                                        log.equipmentId === siteMachines.find(m => m.name === machine.name)?.id &&
                                        new Date(log.date) >= subDays(new Date(), 7)
                                    );
                                    const recentFuel = recentLogs.reduce((sum, log) => sum + (log.dieselEntered || 0), 0);

                                    return (
                                        <div key={machine.name} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm truncate">{machine.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    7d: {recentFuel.toFixed(1)}L
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0 ml-2">
                                                <p className="text-xs sm:text-sm font-medium">{machine.logs} logs</p>
                                                <p className="text-xs text-muted-foreground">{machine.activeDays} active</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Downtime Tab */}
                <TabsContent value="downtime" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Total Downtime</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <div className="text-2xl sm:text-3xl font-bold">{totalDowntime.toFixed(1)} hours</div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Across all machines</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Top Downtime Reasons</CardTitle>
                            <CardDescription className="text-xs sm:text-sm">Most common causes</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
                                <BarChart data={downtimeReasons} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                                    <YAxis dataKey="reason" type="category" width={isMobile ? 80 : 150} tick={{ fontSize: isMobile ? 9 : 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="hours" fill="hsl(var(--destructive))" name="Hours" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="text-sm sm:text-base">Downtime Details</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0">
                            <div className="space-y-2 sm:space-y-3">
                                {downtimeReasons.map((reason, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate">{reason.reason}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {reason.count} incident{reason.count > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                            <p className="font-bold text-sm sm:text-lg">{reason.hours.toFixed(1)}h</p>
                                            <p className="text-xs text-muted-foreground">
                                                ~{(reason.hours / reason.count).toFixed(1)}h ea
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {downtimeReasons.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6 text-sm">No downtime data</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Insights Tab */}
                <TabsContent value="insights" className="space-y-3 sm:space-y-4 mt-4">
                    {insights.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-6 text-muted-foreground text-sm">
                                No insights available yet. Start logging to see recommendations.
                            </CardContent>
                        </Card>
                    ) : (
                        insights.map((insight, index) => (
                            <Card key={index}>
                                <CardHeader className="p-3 sm:p-6 pb-2">
                                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                        <insight.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${insight.color} shrink-0`} />
                                        <span className="truncate">{insight.title}</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 sm:p-6 pt-0">
                                    <p className="text-xs sm:text-sm text-muted-foreground">{insight.description}</p>
                                </CardContent>
                            </Card>
                        ))
                    )}

                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                        <CardHeader className="p-3 sm:p-6 pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 shrink-0" />
                                Tips
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6 pt-0 space-y-1 text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                            <p>• Regular logging helps identify patterns</p>
                            <p>• Monitor fuel efficiency for issues</p>
                            <p>• Track downtime to prioritize fixes</p>
                            <p>• Aim for 80%+ efficiency</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
