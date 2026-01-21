import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Site, Asset } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, Fuel, Clock, Activity, Calendar } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

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
            { name: 'High Efficiency (≥80%)', value: highEfficiency, color: '#10b981' },
            { name: 'Medium Efficiency (60-79%)', value: mediumEfficiency, color: '#f59e0b' },
            { name: 'Low Efficiency (<60%)', value: lowEfficiency, color: '#ef4444' }
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
                description: `${efficiencyDist[2].value} machine(s) are operating below 60% efficiency. Review maintenance schedules and operational procedures.`,
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
                description: `${machineBreakdown[0].name} consumes ${machineBreakdown[0].fuel.toFixed(2)}L (${topMachinePercentage.toFixed(0)}% of total site fuel usage).`,
                color: 'text-primary'
            });
        }

        // Downtime analysis
        if (downtimeReasons.length > 0) {
            insights.push({
                type: 'warning',
                icon: Clock,
                title: 'Top Downtime Reason',
                description: `"${downtimeReasons[0].reason}" caused ${downtimeReasons[0].hours.toFixed(1)} hours of downtime (${downtimeReasons[0].count} incidents).`,
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
                description: `Average downtime per machine-day is ${avgDowntimePerLog.toFixed(1)} hours. Consider preventive maintenance to reduce unplanned downtime.`,
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
                description: `Machine efficiency in the last 7 days is ${recentEfficiency.toFixed(1)}%. Great operational performance!`,
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">Site-Wide Machine Analytics - {site.name}</h2>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                    <TabsTrigger value="downtime">Downtime</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{siteMachines.length}</div>
                                <p className="text-xs text-muted-foreground">Active at this site</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Total Fuel Consumption</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{totalFuel.toFixed(2)} L</div>
                                <p className="text-xs text-muted-foreground">All time usage</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Avg Machine Efficiency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{avgEfficiency.toFixed(1)}%</div>
                                <p className="text-xs text-muted-foreground">Active days ratio</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Efficiency Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Machine Efficiency Distribution</CardTitle>
                            <CardDescription>Performance status across all machines</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={efficiencyDistribution}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={(entry) => `${entry.name}: ${entry.value}`}
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {efficiencyDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Machine Fuel Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Fuel Consumption by Machine</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={machineBreakdown}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="fuel" fill="hsl(var(--primary))" name="Fuel (L)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Machine Performance Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Machine Performance Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {machineBreakdown.map((machine) => (
                                    <div key={machine.name} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{machine.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {machine.fuel.toFixed(2)}L fuel • {machine.downtime.toFixed(1)}h downtime • {machine.activeDays} active days
                                            </p>
                                        </div>
                                        <Badge variant={machine.efficiency >= 80 ? "default" : machine.efficiency >= 60 ? "secondary" : "destructive"}>
                                            {machine.efficiency.toFixed(1)}%
                                        </Badge>
                                    </div>
                                ))}
                                {machineBreakdown.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No machine data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Trends Tab */}
                <TabsContent value="trends" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fuel & Downtime Trend - Last 30 Days</CardTitle>
                            <CardDescription>Daily operational patterns</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis yAxisId="left" />
                                    <YAxis yAxisId="right" orientation="right" />
                                    <Tooltip />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="fuel" stroke="hsl(var(--primary))" name="Fuel (L)" strokeWidth={2} />
                                    <Line yAxisId="right" type="monotone" dataKey="downtime" stroke="hsl(var(--chart-2))" name="Downtime (hrs)" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Machine-Specific Trends</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {machineBreakdown.slice(0, 5).map((machine) => {
                                    const recentLogs = siteLogs.filter(log =>
                                        log.equipmentId === siteMachines.find(m => m.name === machine.name)?.id &&
                                        new Date(log.date) >= subDays(new Date(), 7)
                                    );
                                    const recentFuel = recentLogs.reduce((sum, log) => sum + (log.dieselEntered || 0), 0);

                                    return (
                                        <div key={machine.name} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div>
                                                <p className="font-medium">{machine.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Last 7 days: {recentFuel.toFixed(2)}L fuel used
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">{machine.logs} logs</p>
                                                <p className="text-xs text-muted-foreground">{machine.activeDays} active days</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Downtime Tab */}
                <TabsContent value="downtime" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Total Downtime</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{totalDowntime.toFixed(2)} hours</div>
                            <p className="text-sm text-muted-foreground mt-2">Across all machines</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Downtime Reasons</CardTitle>
                            <CardDescription>Most common causes of machine downtime</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={downtimeReasons} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="reason" type="category" width={150} />
                                    <Tooltip />
                                    <Bar dataKey="hours" fill="hsl(var(--destructive))" name="Hours" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Downtime Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {downtimeReasons.map((reason, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div>
                                            <p className="font-medium">{reason.reason}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {reason.count} incident{reason.count > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{reason.hours.toFixed(2)}h</p>
                                            <p className="text-xs text-muted-foreground">
                                                Avg: {(reason.hours / reason.count).toFixed(1)}h per incident
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {downtimeReasons.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">No downtime data available</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Insights Tab */}
                <TabsContent value="insights" className="space-y-4">
                    {insights.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-8 text-muted-foreground">
                                No insights available yet. Start logging machine operations to see recommendations.
                            </CardContent>
                        </Card>
                    ) : (
                        insights.map((insight, index) => (
                            <Card key={index}>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <insight.icon className={`h-5 w-5 ${insight.color}`} />
                                        {insight.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">{insight.description}</p>
                                </CardContent>
                            </Card>
                        ))
                    )}

                    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Operational Tips
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                            <p>• Regular maintenance logging helps identify patterns and prevent breakdowns</p>
                            <p>• Monitor fuel efficiency to detect potential mechanical issues early</p>
                            <p>• Track downtime reasons to prioritize maintenance improvements</p>
                            <p>• Maintain 80%+ efficiency for optimal operational performance</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
