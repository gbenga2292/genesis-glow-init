import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Machine, MaintenanceLog } from "@/types/maintenance";
import { format, differenceInHours } from "date-fns";
import { ArrowLeft, Calendar, Wrench, DollarSign, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MachineDetailsPageProps {
    machine: Machine;
    maintenanceLogs: MaintenanceLog[];
    onBack: () => void;
}

export const MachineDetailsPage = ({ machine, maintenanceLogs, onBack }: MachineDetailsPageProps) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState("overview");

    const machineLogs = maintenanceLogs
        .filter(log => log.machineId === machine.id)
        .sort((a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime());

    const totalDowntime = machineLogs.reduce((sum, log) => {
        if (log.dateCompleted) {
            return sum + differenceInHours(new Date(log.dateCompleted), new Date(log.dateStarted));
        }
        return sum;
    }, 0);

    const totalCost = machineLogs.reduce((sum, log) => sum + (log.cost || 0), 0);

    const maintenanceTypeColors: Record<string, string> = {
        'scheduled': 'bg-blue-100 text-blue-800',
        'unscheduled': 'bg-yellow-100 text-yellow-800',
        'emergency': 'bg-red-100 text-red-800'
    };

    const tabs = [
        { value: 'overview', label: 'Overview' },
        { value: 'maintenance', label: 'Logs' },
        { value: 'statistics', label: 'Stats' }
    ];

    return (
        <div className="flex flex-col h-full bg-background animate-fade-in">
            {/* Header - Mobile optimized */}
            <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6 border-b">
                <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{machine.name}</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {machine.model} • {machine.serialNumber}
                    </p>
                </div>
                <Badge variant={machine.status === 'active' ? 'default' : 'secondary'} className="capitalize shrink-0">
                    {machine.status}
                </Badge>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-3 sm:p-6">
                <div className="max-w-6xl mx-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
                        {/* Mobile dropdown or desktop tabs */}
                        {isMobile ? (
                            <Select value={activeTab} onValueChange={setActiveTab}>
                                <SelectTrigger className="w-full">
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
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="maintenance">Maintenance Log</TabsTrigger>
                                <TabsTrigger value="statistics">Statistics</TabsTrigger>
                            </TabsList>
                        )}

                        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                            {/* Machine Profile - Mobile grid */}
                            <Card>
                                <CardHeader className="p-3 sm:p-6">
                                    <CardTitle className="text-sm sm:text-base">Machine Profile</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 sm:p-6 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">ID</span>
                                        <p className="font-medium text-sm truncate">{machine.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">Status</span>
                                        <p className="font-medium text-sm capitalize">{machine.status}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">Site</span>
                                        <p className="font-medium text-sm truncate">{machine.site || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">Pattern</span>
                                        <p className="font-medium text-sm">{machine.operatingPattern}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs sm:text-sm text-muted-foreground">Service</span>
                                        <p className="font-medium text-sm">{machine.serviceInterval} months</p>
                                    </div>
                                    {machine.responsibleSupervisor && (
                                        <div>
                                            <span className="text-xs sm:text-sm text-muted-foreground">Supervisor</span>
                                            <p className="font-medium text-sm truncate">{machine.responsibleSupervisor}</p>
                                        </div>
                                    )}
                                    {machine.notes && (
                                        <div className="col-span-2 sm:col-span-3">
                                            <span className="text-xs sm:text-sm text-muted-foreground">Notes</span>
                                            <p className="font-medium text-sm">{machine.notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Stats - Mobile responsive */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                <Card className="border-l-4 border-l-primary">
                                    <CardContent className="p-3 sm:pt-6 sm:p-6">
                                        <div className="text-center">
                                            <p className="text-xl sm:text-3xl font-bold">{machineLogs.length}</p>
                                            <p className="text-xs text-muted-foreground">Maintenance</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-orange-500">
                                    <CardContent className="p-3 sm:pt-6 sm:p-6">
                                        <div className="text-center">
                                            <p className="text-xl sm:text-3xl font-bold">{totalDowntime}h</p>
                                            <p className="text-xs text-muted-foreground">Downtime</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="border-l-4 border-l-green-500">
                                    <CardContent className="p-3 sm:pt-6 sm:p-6">
                                        <div className="text-center">
                                            <p className="text-lg sm:text-3xl font-bold">₦{totalCost.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">Cost</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="maintenance" className="space-y-3 sm:space-y-4">
                            {machineLogs.length === 0 ? (
                                <Card>
                                    <CardContent className="py-8 sm:py-12 text-center text-muted-foreground">
                                        <Wrench className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-20" />
                                        <p className="text-sm">No maintenance records found.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <Accordion type="single" collapsible className="w-full space-y-2">
                                    {machineLogs.map(log => (
                                        <AccordionItem key={log.id} value={log.id} className="border rounded-lg bg-card px-2 sm:px-4">
                                            <AccordionTrigger className="hover:no-underline py-2 sm:py-3">
                                                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between mr-2 sm:mr-4 text-left gap-1 sm:gap-4">
                                                    <div className="flex items-center gap-2 sm:gap-4">
                                                        <div className="flex items-center gap-1 sm:gap-2">
                                                            <Wrench className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                                            <span className="font-semibold text-xs sm:text-sm">{format(new Date(log.dateStarted), 'dd/MM/yy')}</span>
                                                        </div>
                                                        <Badge className={cn("text-xs px-1.5 py-0.5 sm:w-24 sm:justify-center", maintenanceTypeColors[log.maintenanceType])}>
                                                            {log.maintenanceType}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground line-clamp-1 hidden sm:block">{log.reason}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="pb-3 sm:pb-4 pt-1">
                                                <div className="space-y-3 border-t pt-3">
                                                    <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                                                        {log.location && (
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                                                <span className="truncate">{log.location}</span>
                                                            </div>
                                                        )}
                                                        {log.downtime && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                                                <span>{log.downtime}h</span>
                                                            </div>
                                                        )}
                                                        {log.cost && (
                                                            <div className="flex items-center gap-1.5">
                                                                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                                                <span>₦{log.cost.toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {log.technician && (
                                                            <div className="flex items-center gap-1.5">
                                                                <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                                                <span className="truncate">{log.technician}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2 bg-muted/30 p-2 sm:p-3 rounded-md">
                                                        <div>
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Done</span>
                                                            <p className="text-xs sm:text-sm mt-1">{log.workDone}</p>
                                                        </div>
                                                        {log.partsReplaced && (
                                                            <div className="pt-2 border-t border-dashed">
                                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parts</span>
                                                                <p className="text-xs sm:text-sm mt-1">{log.partsReplaced}</p>
                                                            </div>
                                                        )}
                                                        {log.remarks && (
                                                            <div className="pt-2 border-t border-dashed">
                                                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks</span>
                                                                <p className="text-xs sm:text-sm mt-1 italic">{log.remarks}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                                        <Badge variant={log.machineActiveAtTime ? "default" : "secondary"} className="text-xs">
                                                            {log.machineActiveAtTime ? "Active" : "Inactive"}
                                                        </Badge>
                                                        {log.serviceReset && (
                                                            <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                                                                Reset
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            )}
                        </TabsContent>

                        <TabsContent value="statistics" className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Maintenance Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between items-center text-sm p-2 bg-blue-50 rounded">
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-blue-500" />
                                                Scheduled
                                            </span>
                                            <Badge variant="secondary">
                                                {machineLogs.filter(l => l.maintenanceType === 'scheduled').length}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-yellow-50 rounded">
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-yellow-500" />
                                                Unscheduled
                                            </span>
                                            <Badge variant="secondary">
                                                {machineLogs.filter(l => l.maintenanceType === 'unscheduled').length}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-red-50 rounded">
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-red-500" />
                                                Emergency
                                            </span>
                                            <Badge variant="secondary">
                                                {machineLogs.filter(l => l.maintenanceType === 'emergency').length}
                                            </Badge>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Downtime Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                            <span>Total Hours</span>
                                            <Badge variant="secondary">{totalDowntime}h</Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                            <span>Average per Event</span>
                                            <Badge variant="secondary">
                                                {machineLogs.length > 0 ? (totalDowntime / machineLogs.length).toFixed(1) : 0}h
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                                            <span>Total Events</span>
                                            <Badge variant="secondary">{machineLogs.length}</Badge>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
};
