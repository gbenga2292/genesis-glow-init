import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Machine, MaintenanceLog, MaintenanceDashboard } from "@/types/maintenance";
// import { MaintenanceEntryForm } from "./MaintenanceEntryForm";
import { MachineCard } from "./MachineCard";
import { MachineDetailsDialog } from "./MachineDetailsDialog";
import { Plus, Search, Wrench, AlertCircle, Clock, CheckCircle, TrendingUp, DollarSign, Download, FileSpreadsheet, FileText, ChevronDown } from "lucide-react";
import { addMonths, differenceInDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { exportMaintenanceLogsToExcel, exportMaintenanceLogsToPDF } from "@/utils/exportUtils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/contexts/AppDataContext";

interface MachineMaintenancePageProps {
    machines: Machine[];
    maintenanceLogs: MaintenanceLog[];
    onAddMachine?: () => void;
    onSubmitMaintenance: (entries: Partial<MaintenanceLog>[]) => Promise<void>;
}

export const MachineMaintenancePage = ({
    machines,
    maintenanceLogs,
    onAddMachine,
    onSubmitMaintenance
}: MachineMaintenancePageProps) => {
    const { companySettings } = useAppData();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'machines' | 'entry'>('dashboard');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'due-soon' | 'overdue'>('all');

    // Calculate dashboard metrics
    const calculateDashboard = (): MaintenanceDashboard => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const activeMachines = machines.filter(m => m.status === 'active');

        let machinesDueSoon = 0;
        let overdueMachines = 0;

        activeMachines.forEach(machine => {
            const machineLogs = maintenanceLogs
                .filter(log => log.machineId === machine.id && log.serviceReset)
                .sort((a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime());

            const lastMaintenance = machineLogs[0];
            const expectedServiceDate = lastMaintenance
                ? addMonths(new Date(lastMaintenance.dateStarted), machine.serviceInterval)
                : addMonths(machine.deploymentDate, machine.serviceInterval);

            const daysRemaining = differenceInDays(expectedServiceDate, now);

            if (daysRemaining < 0) {
                overdueMachines++;
            } else if (daysRemaining <= 14) {
                machinesDueSoon++;
            }
        });

        const thisMonthLogs = maintenanceLogs.filter(log => {
            const logDate = new Date(log.dateStarted);
            return logDate >= monthStart && logDate <= monthEnd;
        });

        const totalDowntimeThisMonth = thisMonthLogs.reduce((sum, log) => {
            return sum + (log.downtime || 0);
        }, 0);

        const unscheduledMaintenanceCount = thisMonthLogs.filter(
            log => log.maintenanceType === 'unscheduled' || log.maintenanceType === 'emergency'
        ).length;

        const maintenanceCostThisMonth = thisMonthLogs.reduce((sum, log) => {
            return sum + (log.cost || 0);
        }, 0);

        return {
            totalMachines: machines.length,
            activeMachines: activeMachines.length,
            machinesDueSoon,
            overdueMachines,
            totalDowntimeThisMonth,
            unscheduledMaintenanceCount,
            maintenanceCostThisMonth
        };
    };

    const dashboard = calculateDashboard();

    // Filter machines
    const filteredMachines = machines.filter(machine => {
        const matchesSearch = machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            machine.id.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (filterStatus === 'all') return true;

        // Calculate service status for filtering
        if (machine.status !== 'active') return filterStatus === 'ok';

        const machineLogs = maintenanceLogs
            .filter(log => log.machineId === machine.id && log.serviceReset)
            .sort((a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime());

        const lastMaintenance = machineLogs[0];
        const expectedServiceDate = lastMaintenance
            ? addMonths(new Date(lastMaintenance.dateStarted), machine.serviceInterval)
            : addMonths(machine.deploymentDate, machine.serviceInterval);

        const daysRemaining = differenceInDays(expectedServiceDate, new Date());

        if (filterStatus === 'overdue') return daysRemaining < 0;
        if (filterStatus === 'due-soon') return daysRemaining >= 0 && daysRemaining <= 14;
        if (filterStatus === 'ok') return daysRemaining > 14;

        return true;
    });

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Machine Maintenance</h1>
                    <p className="text-muted-foreground">Track and manage equipment maintenance schedules</p>
                </div>
                {onAddMachine && (
                    <Button onClick={onAddMachine}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Machine
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <TabsList>
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="machines">Machines ({machines.length})</TabsTrigger>
                        <TabsTrigger value="entry">
                            <Wrench className="h-4 w-4 mr-2" />
                            Log Maintenance
                        </TabsTrigger>
                    </TabsList>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export Report
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportMaintenanceLogsToExcel(maintenanceLogs, machines)}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export to Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportMaintenanceLogsToPDF(maintenanceLogs, machines, companySettings)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Export to PDF
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Dashboard Tab */}
                <TabsContent value="dashboard" className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription>Total Machines</CardDescription>
                                <CardTitle className="text-3xl">{dashboard.totalMachines}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">
                                    {dashboard.activeMachines} active
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-yellow-200 bg-yellow-50">
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Due Soon
                                </CardDescription>
                                <CardTitle className="text-3xl text-yellow-700">{dashboard.machinesDueSoon}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-yellow-600">
                                    Next 14 days
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-red-200 bg-red-50">
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Overdue
                                </CardDescription>
                                <CardTitle className="text-3xl text-red-700">{dashboard.overdueMachines}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-red-600">
                                    Requires attention
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <CardDescription className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    This Month
                                </CardDescription>
                                <CardTitle className="text-2xl">₦{dashboard.maintenanceCostThisMonth.toLocaleString()}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground">
                                    Maintenance cost
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">This Month's Activity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Total Downtime</span>
                                    <Badge variant="secondary">{dashboard.totalDowntimeThisMonth}h</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Unscheduled Maintenance</span>
                                    <Badge variant="secondary">{dashboard.unscheduledMaintenanceCount}</Badge>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Service Status Distribution</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        OK
                                    </span>
                                    <Badge variant="secondary">
                                        {dashboard.activeMachines - dashboard.machinesDueSoon - dashboard.overdueMachines}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-yellow-600" />
                                        Due Soon
                                    </span>
                                    <Badge variant="secondary">{dashboard.machinesDueSoon}</Badge>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        Overdue
                                    </span>
                                    <Badge variant="secondary">{dashboard.overdueMachines}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Machines Tab */}
                <TabsContent value="machines" className="space-y-4">
                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search machines..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={filterStatus === 'all' ? 'default' : 'outline'}
                                onClick={() => setFilterStatus('all')}
                                size="sm"
                            >
                                All
                            </Button>
                            <Button
                                variant={filterStatus === 'ok' ? 'default' : 'outline'}
                                onClick={() => setFilterStatus('ok')}
                                size="sm"
                            >
                                OK
                            </Button>
                            <Button
                                variant={filterStatus === 'due-soon' ? 'default' : 'outline'}
                                onClick={() => setFilterStatus('due-soon')}
                                size="sm"
                            >
                                Due Soon
                            </Button>
                            <Button
                                variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                                onClick={() => setFilterStatus('overdue')}
                                size="sm"
                            >
                                Overdue
                            </Button>
                        </div>
                    </div>

                    {/* Machine Grid */}
                    {filteredMachines.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                {searchQuery ? 'No machines found matching your search.' : 'No machines available.'}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMachines.map(machine => (
                                <MachineCard
                                    key={machine.id}
                                    machine={machine}
                                    maintenanceLogs={maintenanceLogs}
                                    onViewDetails={setSelectedMachine}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Maintenance Entry Tab */}
                <TabsContent value="entry">
                    {/*
                    <MaintenanceEntryForm
                        machines={machines}
                        onSubmit={async (entries) => {
                            await onSubmitMaintenance(entries);
                            setActiveTab('machines');
                        }}
                        onCancel={() => setActiveTab('machines')}
                    />
                    */}
                    <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                        Maintenance Entry Form is currently disabled.
                    </div>
                </TabsContent>
            </Tabs>

            {/* Machine Details Dialog */}
            <MachineDetailsDialog
                machine={selectedMachine}
                maintenanceLogs={maintenanceLogs}
                onClose={() => setSelectedMachine(null)}
            />
        </div>
    );
};
