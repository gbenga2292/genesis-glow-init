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
    const machineLogs = maintenanceLogs
        .filter(log => log.machineId === machine.id && log.serviceReset)
        .sort((a, b) => new Date(b.dateStarted).getTime() - new Date(a.dateStarted).getTime());

    const lastMaintenance = machineLogs[0];
    const expectedServiceDate = lastMaintenance
        ? addMonths(new Date(lastMaintenance.dateStarted), machine.serviceInterval)
        : machine.status === 'active'
            ? addMonths(machine.deploymentDate, machine.serviceInterval)
            : undefined;

    const daysRemaining = expectedServiceDate ? differenceInDays(expectedServiceDate, new Date()) : undefined;

    let serviceStatus: 'ok' | 'due-soon' | 'overdue' = 'ok';
    if (machine.status === 'active' && daysRemaining !== undefined) {
        if (daysRemaining < 0) {
            serviceStatus = 'overdue';
        } else if (daysRemaining <= 14) {
            serviceStatus = 'due-soon';
        }
    }

    const statusColors = {
        'active': 'bg-green-500',
        'idle': 'bg-gray-500',
        'under-maintenance': 'bg-yellow-500',
        'deployed': 'bg-blue-500'
    };

    const serviceStatusConfig = {
        'ok': { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'OK' },
        'due-soon': { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Due Soon' },
        'overdue': { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' }
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
                        <span className="text-muted-foreground">Deployed:</span>
                        <p className="font-medium">{format(machine.deploymentDate, 'dd/MM/yyyy')}</p>
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
                    <Badge variant="secondary">{machineLogs.length} records</Badge>
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
