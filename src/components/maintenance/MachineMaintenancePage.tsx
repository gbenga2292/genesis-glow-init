import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Machine, MaintenanceLog, MaintenanceDashboard } from "@/types/maintenance";
import { Asset, Site, Employee, Vehicle } from "@/types/asset";
// Maintenance Entry Form Component
import { MaintenanceEntryForm } from "./MaintenanceEntryForm";
import { MachineCard } from "./MachineCard";
import { MachineDetailsDialog } from "./MachineDetailsDialog";
import { Plus, Search, Wrench, AlertCircle, Clock, CheckCircle, TrendingUp, DollarSign, Download, FileSpreadsheet, FileText, ChevronDown, Truck } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MachineMaintenancePageProps {
    machines: Machine[];
    maintenanceLogs: MaintenanceLog[];
    assets: Asset[];
    sites: Site[];
    employees: Employee[];
    vehicles: Vehicle[];
    onAddMachine?: () => void;
    onSubmitMaintenance: (entries: Partial<MaintenanceLog>[]) => Promise<void>;
}

export const MachineMaintenancePage = ({
    machines,
    maintenanceLogs,
    assets,
    sites,
    employees,
    vehicles,
    onAddMachine,
    onSubmitMaintenance
}: MachineMaintenancePageProps) => {
    const { companySettings } = useAppData();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'machines' | 'vehicles' | 'entry'>('dashboard');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
    const [filterStatus, setFilterStatus] = useState<'all' | 'ok' | 'due-soon' | 'overdue'>('all');
    const isMobile = useIsMobile();

    // Tab definitions for cleaner rendering
    const tabs = [
        { value: 'dashboard', label: 'Dashboard', icon: null },
        { value: 'machines', label: `Machines (${machines.length})`, icon: null },
        { value: 'vehicles', label: `Vehicles (${vehicles.length})`, icon: <Truck className="h-4 w-4 mr-2" /> },
        { value: 'entry', label: 'Log Maintenance', icon: <Wrench className="h-4 w-4 mr-2" /> }
    ];

    // Convert vehicles to machine format for unified handling
    const vehiclesAsMachines: Machine[] = useMemo(() => {
        return vehicles.map(vehicle => ({
            id: `vehicle-${vehicle.id}`,
            name: vehicle.name,
            model: vehicle.type || 'N/A',
            serialNumber: vehicle.registration_number || 'N/A',
            site: 'Fleet', // Vehicles are part of the fleet
            deploymentDate: vehicle.createdAt,
            status: vehicle.status === 'active' ? 'active' : 'idle' as 'active' | 'idle',
            operatingPattern: '24/7',
            serviceInterval: 2, // Default 2 months for vehicles
            responsibleSupervisor: 'Fleet Manager',
            notes: `Vehicle - ${vehicle.type || 'General'}`,
            createdAt: vehicle.createdAt,
            updatedAt: vehicle.updatedAt,
            isVehicle: true // Flag to identify vehicles
        } as Machine & { isVehicle?: boolean }));
    }, [vehicles]);

    // Combine machines and vehicles based on active tab
    const allMachines = useMemo(() => {
        if (activeTab === 'vehicles') {
            return vehiclesAsMachines;
        } else if (activeTab === 'machines') {
            return machines;
        }
        // For dashboard and entry, show all
        return [...machines, ...vehiclesAsMachines];
    }, [machines, vehiclesAsMachines, activeTab]);

    // Memoize logs map: Map<MachineID, { lastServiceLog: MaintenanceLog | undefined, allServiceLogs: MaintenanceLog[] }>
    const machineMaintenanceData = useMemo(() => {
        const map = new Map<string, { lastServiceLog: MaintenanceLog | undefined, serviceLogs: MaintenanceLog[], allLogs: MaintenanceLog[] }>();

        // Initialize map for all machines (including vehicles)
        allMachines.forEach(m => {
            map.set(m.id, { lastServiceLog: undefined, serviceLogs: [], allLogs: [] });
        });

        // Populate logs
        // Sorting maintenanceLogs ONCE here is better than N times
        const sortedLogs = [...maintenanceLogs].sort((a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime());

        sortedLogs.forEach(log => {
            const data = map.get(log.machineId);
            if (data) {
                data.allLogs.push(log);
                if (log.serviceReset) {
                    data.serviceLogs.push(log);
                    if (!data.lastServiceLog) {
                        data.lastServiceLog = log; // Since it's sorted, the first one we find is the latest
                    }
                }
            }
        });

        return map;
    }, [allMachines, maintenanceLogs]);

    // Calculate dashboard metrics using the memoized map
    const dashboard = useMemo((): MaintenanceDashboard => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        const activeMachines = allMachines.filter(m => m.status === 'active');

        let machinesDueSoon = 0;
        let overdueMachines = 0;

        activeMachines.forEach(machine => {
            const data = machineMaintenanceData.get(machine.id);
            const lastMaintenance = data?.lastServiceLog;

            const expectedServiceDate = lastMaintenance?.nextServiceDue
                ? new Date(lastMaintenance.nextServiceDue)
                : (lastMaintenance
                    ? addMonths(new Date(lastMaintenance.dateStarted), machine.serviceInterval)
                    : addMonths(machine.deploymentDate, machine.serviceInterval));

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
            totalMachines: allMachines.length,
            activeMachines: activeMachines.length,
            machinesDueSoon,
            overdueMachines,
            totalDowntimeThisMonth,
            unscheduledMaintenanceCount,
            maintenanceCostThisMonth
        };
    }, [allMachines, maintenanceLogs, machineMaintenanceData]);


    // Filter machines using memoized data
    const filteredMachines = useMemo(() => {
        return allMachines.filter(machine => {
            const matchesSearch = machine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                machine.id.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (filterStatus === 'all') return true;

            // Calculate service status for filtering
            if (machine.status !== 'active') return filterStatus === 'ok';

            const data = machineMaintenanceData.get(machine.id);
            const lastMaintenance = data?.lastServiceLog;

            const expectedServiceDate = lastMaintenance?.nextServiceDue
                ? new Date(lastMaintenance.nextServiceDue)
                : (lastMaintenance
                    ? addMonths(new Date(lastMaintenance.dateStarted), machine.serviceInterval)
                    : addMonths(machine.deploymentDate, machine.serviceInterval));

            const daysRemaining = differenceInDays(expectedServiceDate, new Date());

            if (filterStatus === 'overdue') return daysRemaining < 0;
            if (filterStatus === 'due-soon') return daysRemaining >= 0 && daysRemaining <= 14;
            if (filterStatus === 'ok') return daysRemaining > 14;

            return true;
        });
    }, [allMachines, searchQuery, filterStatus, machineMaintenanceData]);

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
                    {isMobile ? (
                        <div className="w-full">
                            <Select value={activeTab} onValueChange={(value: any) => setActiveTab(value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select view" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tabs.map(tab => (
                                        <SelectItem key={tab.value} value={tab.value}>
                                            <div className="flex items-center">
                                                {tab.icon}
                                                {tab.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <TabsList>
                            {tabs.map(tab => (
                                <TabsTrigger key={tab.value} value={tab.value}>
                                    {tab.icon}
                                    {tab.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-2" />
                                Export Report
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportMaintenanceLogsToExcel(maintenanceLogs, allMachines)}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Export to Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportMaintenanceLogsToPDF(maintenanceLogs, allMachines, companySettings)}>
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
                                    maintenanceLogs={machineMaintenanceData.get(machine.id)?.allLogs || []}
                                    onViewDetails={setSelectedMachine}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Vehicles Tab */}
                <TabsContent value="vehicles" className="space-y-4">
                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search vehicles..."
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

                    {/* Vehicle Grid */}
                    {filteredMachines.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                {searchQuery ? 'No vehicles found matching your search.' : 'No vehicles available.'}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredMachines.map(machine => (
                                <MachineCard
                                    key={machine.id}
                                    machine={machine}
                                    maintenanceLogs={machineMaintenanceData.get(machine.id)?.allLogs || []}
                                    onViewDetails={setSelectedMachine}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Maintenance Entry Tab */}
                <TabsContent value="entry">
                    <MaintenanceEntryForm
                        machines={allMachines}
                        assets={assets}
                        sites={sites}
                        employees={employees}
                        onSubmit={async (entries) => {
                            await onSubmitMaintenance(entries);
                            setActiveTab('machines');
                        }}
                        onCancel={() => setActiveTab('machines')}
                    />
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
