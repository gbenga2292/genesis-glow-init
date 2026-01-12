import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Machine, MaintenanceLog, ServiceSchedule } from "@/types/maintenance";
import { format, differenceInDays, addMonths } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Eye, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface MachineCardProps {
    machine: Machine;
    maintenanceLogs: MaintenanceLog[];
    onViewDetails: (machine: Machine) => void;
}

export const MachineCard = ({ machine, maintenanceLogs, onViewDetails }: MachineCardProps) => {
    // Calculate service schedule
    // Calculate service schedule
    // Logs are passed pre-filtered for this machine and pre-sorted by date from the parent
    const serviceLogs = maintenanceLogs.filter(log => log.serviceReset);

    // Fallback sort if not sorted (optional safety, but assuming parent handles it for perf)
    // const sortedServiceLogs = serviceLogs.sort(...) 
    // We'll assume sorted for max performance as per the refactor plan.

    const lastMaintenance = serviceLogs[0];
    const expectedServiceDate = lastMaintenance?.nextServiceDue
        ? new Date(lastMaintenance.nextServiceDue)
        : (lastMaintenance
            ? addMonths(new Date(lastMaintenance.dateStarted), machine.serviceInterval)
            : machine.status === 'active'
                ? addMonths(machine.deploymentDate, machine.serviceInterval)
                : undefined);

    const daysRemaining = expectedServiceDate ? differenceInDays(expectedServiceDate, new Date()) : undefined;

    let serviceStatus: 'ok' | 'due-soon' | 'overdue' = 'ok';
    if (machine.status === 'active' && daysRemaining !== undefined) {
        if (daysRemaining < 0) {
            serviceStatus = 'overdue';
        } else if (daysRemaining <= 14) {
            serviceStatus = 'due-soon';
        }
    }

    const statusColors: Record<string, string> = {
        'active': 'bg-green-500',
        'idle': 'bg-gray-500',
        'maintenance': 'bg-red-500',
        'standby': 'bg-yellow-500',
        'missing': 'bg-red-700',
        'retired': 'bg-gray-700'
    };

    const serviceStatusConfig = {
        'ok': { icon: CheckCircle, color: 'text-green-700 dark:text-green-600', bg: 'bg-green-50 dark:bg-green-950/50', label: 'OK' },
        'due-soon': { icon: Clock, color: 'text-yellow-700 dark:text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/50', label: 'Due Soon' },
        'overdue': { icon: AlertCircle, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50', label: 'Overdue' }
    };

    const statusConfig = serviceStatusConfig[serviceStatus];

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">{machine.name}</CardTitle>
                        <CardDescription className="text-xs">
                            {machine.model && <span>{machine.model} • </span>}
                            {machine.serialNumber && <span>S/N: {machine.serialNumber}</span>}
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className={cn("capitalize", statusColors[machine.status], "text-white")}>
                        {machine.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Machine Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="text-muted-foreground">Site:</span>
                        <p className="font-medium">{machine.site || 'N/A'}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Pattern:</span>
                        <p className="font-medium">{machine.operatingPattern}</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Interval:</span>
                        <p className="font-medium">{machine.serviceInterval} months</p>
                    </div>
                </div>

                {/* Service Status */}
                {machine.status === 'active' && (
                    <div className={cn("p-3 rounded-lg", statusConfig.bg)}>
                        <div className="flex items-center gap-2 mb-2">
                            <statusConfig.icon className={cn("h-4 w-4", statusConfig.color)} />
                            <span className={cn("text-sm font-semibold", statusConfig.color)}>
                                {statusConfig.label}
                            </span>
                        </div>
                        <div className="text-xs space-y-1">
                            {lastMaintenance && (
                                <p>
                                    Last Service: {format(new Date(lastMaintenance.dateStarted), 'dd/MM/yyyy')}
                                </p>
                            )}
                            {expectedServiceDate && (
                                <p>
                                    Next Due: {format(expectedServiceDate, 'dd/MM/yyyy')}
                                    {daysRemaining !== undefined && (
                                        <span className="ml-1">
                                            ({daysRemaining > 0 ? `${daysRemaining} days` : `${Math.abs(daysRemaining)} days overdue`})
                                        </span>
                                    )}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Maintenance Count */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Maintenance:</span>
                    <Badge
                        variant="secondary"
                        className={cn(maintenanceLogs.length > 0 && "bg-green-100 text-green-800 hover:bg-green-200 border-green-200")}
                    >
                        {maintenanceLogs.length} record{maintenanceLogs.length !== 1 ? 's' : ''}
                    </Badge>
                </div>

                {/* Actions */}
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => onViewDetails(machine)}
                >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                </Button>
            </CardContent>
        </Card>
    );
};
