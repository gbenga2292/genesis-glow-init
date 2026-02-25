import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Machine, MaintenanceLog } from "@/types/maintenance";
import { EquipmentLog } from "@/types/equipment";
import { Site } from "@/types/asset";
import { format, differenceInDays, addMonths } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Eye, ClipboardList, Fuel, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface MachineCardProps {
    machine: Machine;
    maintenanceLogs: MaintenanceLog[];
    equipmentLogs: EquipmentLog[];
    sites: Site[];
    onViewDetails: (machine: Machine) => void;
}

export const MachineCard = ({ machine, maintenanceLogs, equipmentLogs, sites, onViewDetails }: MachineCardProps) => {
    const [showEquipmentLog, setShowEquipmentLog] = useState(false);

    // Calculate service schedule
    const serviceLogs = maintenanceLogs.filter(log => log.serviceReset);
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
        if (daysRemaining < 0) serviceStatus = 'overdue';
        else if (daysRemaining <= 14) serviceStatus = 'due-soon';
    }

    const statusColors: Record<string, string> = {
        'active': 'bg-green-500',
        'idle': 'bg-gray-500',
        'maintenance': 'bg-red-500',
        'standby': 'bg-gray-500',
        'missing': 'bg-red-700',
        'retired': 'bg-gray-700'
    };

    const serviceStatusConfig = {
        'ok': { icon: CheckCircle, color: 'text-green-700 dark:text-green-600', bg: 'bg-green-50 dark:bg-green-950/50', label: 'OK' },
        'due-soon': { icon: Clock, color: 'text-yellow-700 dark:text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/50', label: 'Due Soon' },
        'overdue': { icon: AlertCircle, color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50', label: 'Overdue' }
    };

    const statusConfig = serviceStatusConfig[serviceStatus];
    const displayStatus = (machine.status === 'idle' || machine.status === 'standby') ? 'Inactive' : machine.status;

    // Equipment logs for this machine sorted newest first
    const machineEquipmentLogs = equipmentLogs
        .filter(l => String(l.equipmentId) === String(machine.id))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const getSiteName = (siteId: string | undefined) => {
        if (!siteId) return '—';
        const site = sites.find(s => String(s.id) === String(siteId));
        return site?.name || siteId;
    };

    return (
        <>
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
                        <Badge variant="outline" className={cn("capitalize border-0", statusColors[machine.status], "text-white")}>
                            {displayStatus}
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
                                    <p>Last Service: {format(new Date(lastMaintenance.dateStarted), 'dd/MM/yyyy')}</p>
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
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => onViewDetails(machine)}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground hover:text-foreground"
                            onClick={() => setShowEquipmentLog(true)}
                        >
                            <ClipboardList className="h-4 w-4 mr-2" />
                            Equipment Log
                            {machineEquipmentLogs.length > 0 && (
                                <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                                    {machineEquipmentLogs.length}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Equipment Log Dialog */}
            <Dialog open={showEquipmentLog} onOpenChange={setShowEquipmentLog}>
                <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
                    <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            Equipment Log — {machine.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Full operational history across all sites • {machineEquipmentLogs.length} entries
                        </DialogDescription>
                    </DialogHeader>

                    <div style={{ overflowY: 'auto', maxHeight: 'calc(85vh - 110px)' }}>
                        {machineEquipmentLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                                <ClipboardList className="h-10 w-10 opacity-30" />
                                <p className="text-sm">No equipment logs recorded yet.</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/80 backdrop-blur border-b z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Site</th>
                                        <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                            <span className="flex items-center justify-center gap-1"><Activity className="h-3.5 w-3.5" /> Status</span>
                                        </th>
                                        <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                                            <span className="flex items-center justify-center gap-1"><Fuel className="h-3.5 w-3.5" /> Diesel (L)</span>
                                        </th>
                                        <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Supervisor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {machineEquipmentLogs.map((log, i) => (
                                        <tr key={log.id || i} className="hover:bg-muted/40 transition-colors">
                                            <td className="px-4 py-3 font-medium whitespace-nowrap">
                                                {format(new Date(log.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {getSiteName(String(log.siteId))}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {log.active ? (
                                                    <Badge className="bg-green-500 hover:bg-green-600 text-white border-0 text-xs">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {log.dieselEntered && log.dieselEntered > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                                        <Fuel className="h-3.5 w-3.5" />
                                                        {log.dieselEntered}L
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                {log.supervisorOnSite || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
