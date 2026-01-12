import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Machine, MaintenanceLog } from "@/types/maintenance";
import { format, differenceInHours } from "date-fns";
import { ArrowLeft, Calendar, Wrench, DollarSign, MapPin, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface MachineDetailsDialogProps {
    machine: Machine | null;
    maintenanceLogs: MaintenanceLog[];
    onClose: () => void;
}

export const MachineDetailsDialog = ({ machine, maintenanceLogs, onClose }: MachineDetailsDialogProps) => {
    if (!machine) return null;

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

    const maintenanceTypeColors = {
        'scheduled': 'bg-blue-100 text-blue-800',
        'unscheduled': 'bg-yellow-100 text-yellow-800',
        'emergency': 'bg-red-100 text-red-800'
    };

    return (
        <Dialog open={!!machine} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <DialogTitle className="text-xl">{machine.name}</DialogTitle>
                            <p className="text-sm text-muted-foreground">
                                {machine.model} • {machine.serialNumber}
                            </p>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="maintenance">Maintenance Log</TabsTrigger>
                        <TabsTrigger value="statistics">Statistics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        {/* Machine Profile */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Machine Profile</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-sm text-muted-foreground">Machine ID</span>
                                    <p className="font-medium">{machine.id}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Status</span>
                                    <p className="font-medium capitalize">{machine.status}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Site</span>
                                    <p className="font-medium">{machine.site || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Operating Pattern</span>
                                    <p className="font-medium">{machine.operatingPattern}</p>
                                </div>
                                <div>
                                    <span className="text-sm text-muted-foreground">Service Interval</span>
                                    <p className="font-medium">{machine.serviceInterval} months</p>
                                </div>
                                {machine.responsibleSupervisor && (
                                    <div className="col-span-2">
                                        <span className="text-sm text-muted-foreground">Responsible Supervisor</span>
                                        <p className="font-medium">{machine.responsibleSupervisor}</p>
                                    </div>
                                )}
                                {machine.notes && (
                                    <div className="col-span-2">
                                        <span className="text-sm text-muted-foreground">Notes</span>
                                        <p className="font-medium">{machine.notes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{machineLogs.length}</p>
                                        <p className="text-xs text-muted-foreground">Total Maintenance</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{totalDowntime}h</p>
                                        <p className="text-xs text-muted-foreground">Total Downtime</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">₦{totalCost.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">Total Cost</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    <TabsContent value="maintenance" className="space-y-4">
                        {machineLogs.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    No maintenance records found for this machine.
                                </CardContent>
                            </Card>
                        ) : (
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                {machineLogs.map(log => (
                                    <AccordionItem key={log.id} value={log.id} className="border rounded-lg bg-card px-4">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex flex-1 items-center justify-between mr-4 text-left">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2 min-w-[100px]">
                                                        <Wrench className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-semibold">{format(new Date(log.dateStarted), 'dd/MM/yyyy')}</span>
                                                    </div>
                                                    <Badge className={cn("w-24 justify-center", maintenanceTypeColors[log.maintenanceType])}>
                                                        {log.maintenanceType}
                                                    </Badge>
                                                    <span className="text-sm text-muted-foreground line-clamp-1">{log.reason}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <User className="h-3 w-3" />
                                                    <span className="hidden sm:inline">{log.technician}</span>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pb-4 pt-1">
                                            <div className="space-y-4 border-t pt-4">
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    {log.location && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                                            <span>Location: {log.location}</span>
                                                        </div>
                                                    )}
                                                    {log.downtime && (
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                                            <span>{log.downtime}h downtime</span>
                                                        </div>
                                                    )}
                                                    {log.cost && (
                                                        <div className="flex items-center gap-2">
                                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                                            <span>Cost: ₦{log.cost.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-2 bg-muted/30 p-3 rounded-md">
                                                    <div>
                                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work Done</span>
                                                        <p className="text-sm mt-1">{log.workDone}</p>
                                                    </div>
                                                    {log.partsReplaced && (
                                                        <div className="pt-2 border-t border-dashed">
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parts Replaced</span>
                                                            <p className="text-sm mt-1">{log.partsReplaced}</p>
                                                        </div>
                                                    )}
                                                    {log.remarks && (
                                                        <div className="pt-2 border-t border-dashed">
                                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remarks</span>
                                                            <p className="text-sm mt-1 italic">{log.remarks}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 text-xs">
                                                    <Badge variant={log.machineActiveAtTime ? "default" : "secondary"}>
                                                        {log.machineActiveAtTime ? "Active during maintenance" : "Inactive during maintenance"}
                                                    </Badge>
                                                    {log.serviceReset && (
                                                        <Badge variant="outline" className="border-green-500 text-green-600">
                                                            Service Cycle Reset
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

                    <TabsContent value="statistics" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Maintenance Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Scheduled:</span>
                                        <Badge variant="secondary">
                                            {machineLogs.filter(l => l.maintenanceType === 'scheduled').length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Unscheduled:</span>
                                        <Badge variant="secondary">
                                            {machineLogs.filter(l => l.maintenanceType === 'unscheduled').length}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Emergency:</span>
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
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Total Hours:</span>
                                        <Badge variant="secondary">{totalDowntime}h</Badge>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span>Average per Event:</span>
                                        <Badge variant="secondary">
                                            {machineLogs.length > 0 ? (totalDowntime / machineLogs.length).toFixed(1) : 0}h
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
