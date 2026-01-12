import { useState } from "react";
import { Machine } from "@/types/maintenance";
import { Asset, Site, Employee } from "@/types/asset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { CalendarIcon, Plus, X, Search, Save, AlertCircle, Trash2 } from "lucide-react";

interface MaintenanceEntryFormProps {
    machines: Machine[];
    assets: Asset[];
    sites: Site[];
    employees: Employee[];
    onSubmit: (entries: any[]) => Promise<void>;
    onCancel?: () => void;
}

interface MachineEntry {
    machineId: string;
    partsReplaced: string;
    selectedParts: { id: string; name: string; quantity: number }[];
    customParts: { name: string; quantity: number; cost: number }[]; // Parts not in inventory
    maintenanceDone: string;
    active: boolean;
    location: string;
    machineRemark: string;
    shutdownTime?: string;
    restartTime?: string;
    nextMaintenanceDate?: Date;
}

export const MaintenanceEntryForm = ({ machines, assets, sites, employees, onSubmit, onCancel }: MaintenanceEntryFormProps) => {
    const [selectedMachines, setSelectedMachines] = useState<MachineEntry[]>([]);
    const [machineSearchOpen, setMachineSearchOpen] = useState(false);
    const [machineSearch, setMachineSearch] = useState("");
    const [tempSelectedMachineIds, setTempSelectedMachineIds] = useState<string[]>([]);
    const [partSelectionOpen, setPartSelectionOpen] = useState(false);
    const [activeMachineId, setActiveMachineId] = useState<string | null>(null);
    const [technician, setTechnician] = useState<string>("");
    const [isManualTechnician, setIsManualTechnician] = useState(false);
    const [globalDate, setGlobalDate] = useState<Date>(new Date());
    const [maintenanceType, setMaintenanceType] = useState<string>("scheduled");
    const [generalRemark, setGeneralRemark] = useState("");
    const [partSearch, setPartSearch] = useState("");
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [customPartDialogOpen, setCustomPartDialogOpen] = useState(false);
    const [customPartName, setCustomPartName] = useState("");
    const [customPartQuantity, setCustomPartQuantity] = useState(1);
    const [customPartCost, setCustomPartCost] = useState(0);

    const handleToggleMachineSelection = (machineId: string) => {
        setTempSelectedMachineIds(prev =>
            prev.includes(machineId)
                ? prev.filter(id => id !== machineId)
                : [...prev, machineId]
        );
    };

    const handleAddMachines = () => {
        const newEntries = tempSelectedMachineIds
            .filter(id => !selectedMachines.find(m => m.machineId === id))
            .map(id => {
                const machine = machines.find(m => m.id === id);
                if (!machine) return null;
                return {
                    machineId: machine.id,
                    partsReplaced: "",
                    selectedParts: [],
                    customParts: [],
                    maintenanceDone: "",
                    active: machine.status === 'active',
                    location: machine.site || 'Warehouse',
                    machineRemark: "",
                    nextMaintenanceDate: addMonths(new Date(), machine.serviceInterval || 2)
                };
            })
            .filter(entry => entry !== null) as MachineEntry[];

        setSelectedMachines([...selectedMachines, ...newEntries]);
        setMachineSearchOpen(false);
        setMachineSearch("");
        setTempSelectedMachineIds([]);
    };

    const handleRemoveMachine = (machineId: string) => {
        setSelectedMachines(selectedMachines.filter(m => m.machineId !== machineId));
    };

    const handleEntryChange = (id: string, field: keyof MachineEntry, value: any) => {
        setSelectedMachines(prev => prev.map(e => e.machineId === id ? { ...e, [field]: value } : e));
    };

    const handleAddPart = (asset: Asset) => {
        if (!activeMachineId) return;
        setSelectedMachines(prev => prev.map(e => {
            if (e.machineId !== activeMachineId) return e;
            const existing = e.selectedParts.find(p => p.id === asset.id);
            if (existing) {
                return {
                    ...e,
                    selectedParts: e.selectedParts.map(p => p.id === asset.id ? { ...p, quantity: p.quantity + 1 } : p)
                };
            }
            return {
                ...e,
                selectedParts: [...e.selectedParts, { id: asset.id, name: asset.name, quantity: 1 }]
            };
        }));
        setPartSelectionOpen(false);
    };

    const handleRemovePart = (machineId: string, partId: string) => {
        setSelectedMachines(prev => prev.map(e => {
            if (e.machineId !== machineId) return e;
            return {
                ...e,
                selectedParts: e.selectedParts.filter(p => p.id !== partId)
            };
        }));
    };

    const handleAddCustomPart = (machineId: string, partName: string, quantity: number, cost: number) => {
        setSelectedMachines(prev => prev.map(e => {
            if (e.machineId !== machineId) return e;
            return {
                ...e,
                customParts: [...e.customParts, { name: partName, quantity, cost }]
            };
        }));
    };

    const handleRemoveCustomPart = (machineId: string, index: number) => {
        setSelectedMachines(prev => prev.map(e => {
            if (e.machineId !== machineId) return e;
            return {
                ...e,
                customParts: e.customParts.filter((_, i) => i !== index)
            };
        }));
    };

    const validateForm = (): boolean => {
        const errors: string[] = [];

        if (!technician) {
            errors.push("Technician is required");
        }

        if (selectedMachines.length === 0) {
            errors.push("Please add at least one machine");
        }

        selectedMachines.forEach(entry => {
            const machine = machines.find(m => m.id === entry.machineId);
            if (!entry.maintenanceDone || entry.maintenanceDone.trim() === "") {
                errors.push(`Maintenance description required for ${machine?.name || entry.machineId}`);
            }

            if (!entry.active) {
                if (!entry.shutdownTime) errors.push(`Shutdown Time required for ${machine?.name || entry.machineId}`);
                if (!entry.restartTime) errors.push(`Restored Time required for ${machine?.name || entry.machineId}`);

                if (entry.shutdownTime && entry.restartTime) {
                    const start = new Date(entry.shutdownTime);
                    const end = new Date(entry.restartTime);
                    if (end <= start) {
                        errors.push(`Restored time must be AFTER Shutdown time for ${machine?.name || entry.machineId}`);
                    }
                }
            }
        });

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        const formattedEntries = selectedMachines.map(e => {
            let downtime = 0;
            if (!e.active && e.shutdownTime && e.restartTime) {
                const start = new Date(e.shutdownTime);
                const end = new Date(e.restartTime);
                downtime = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
            }

            // Calculate total cost from custom parts
            const customPartsCost = e.customParts.reduce((sum, part) => sum + (part.cost * part.quantity), 0);

            // Combine inventory parts and custom parts for display
            const allPartsString = [
                ...e.selectedParts.map(p => `${p.name} (x${p.quantity})`),
                ...e.customParts.map(p => `${p.name} (x${p.quantity}) - ₦${p.cost.toLocaleString()}`)
            ].join(", ");

            return {
                machineId: e.machineId,
                maintenanceType: maintenanceType,
                dateStarted: globalDate,
                dateCompleted: globalDate,
                technician: technician,
                reason: e.maintenanceDone || 'Routine Maintenance',
                workDone: e.maintenanceDone,
                partsReplaced: allPartsString,
                rawParts: e.selectedParts,
                customParts: e.customParts,
                location: e.location,
                remarks: e.machineRemark || generalRemark,
                machineActiveAtTime: e.active,
                serviceReset: e.active,
                cost: customPartsCost,
                downtime: downtime,
                nextServiceDue: e.nextMaintenanceDate
            };
        });

        await onSubmit(formattedEntries);

        // Reset form
        setSelectedMachines([]);
        setTechnician("");
        setIsManualTechnician(false);
        setGeneralRemark("");
        setMaintenanceType("scheduled");
        setValidationErrors([]);
    };

    const locations = ['Warehouse', ...sites.map(s => s.name)];

    // Filter available machines (not already added)
    const availableMachines = machines.filter(m =>
        !selectedMachines.find(sm => sm.machineId === m.id) &&
        m.name.toLowerCase().includes(machineSearch.toLowerCase())
    );

    return (
        <div className="space-y-4 h-full flex flex-col overflow-hidden">
            {/* Header Section - Global Fields */}
            <Card className="flex-shrink-0">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Maintenance Date *</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !globalDate && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {globalDate ? format(globalDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={globalDate} onSelect={(d) => d && setGlobalDate(d)} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Maintenance Type *</Label>
                            <Select value={maintenanceType} onValueChange={setMaintenanceType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Scheduled / Preventive</SelectItem>
                                    <SelectItem value="unscheduled">Unscheduled / Repair</SelectItem>
                                    <SelectItem value="emergency">Emergency</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Technician / Done By *</Label>
                            <Select
                                value={isManualTechnician ? 'manual_entry' : (technician || undefined)}
                                onValueChange={(val) => {
                                    if (val === 'manual_entry') {
                                        setIsManualTechnician(true);
                                        setTechnician("");
                                    } else {
                                        setIsManualTechnician(false);
                                        setTechnician(val);
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Technician" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.filter(e => e.status === 'active').map(emp => (
                                        <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                                    ))}
                                    <SelectItem value="manual_entry" className="font-semibold text-primary border-t mt-1 pt-1">
                                        + Custom Technician
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {isManualTechnician && (
                                <Input
                                    value={technician}
                                    onChange={(e) => setTechnician(e.target.value)}
                                    placeholder="Enter technician name"
                                    className="mt-2"
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <Label>General Remark (applies to all if machine remark is empty)</Label>
                        <Textarea
                            value={generalRemark}
                            onChange={(e) => setGeneralRemark(e.target.value)}
                            placeholder="General notes for this maintenance session..."
                            className="min-h-[60px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
                <Card className="border-destructive flex-shrink-0">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-destructive">Please fix the following:</p>
                                <ul className="list-disc list-inside text-sm text-destructive mt-1">
                                    {validationErrors.map((error, i) => (
                                        <li key={i}>{error}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Machine Section */}
            <div className="flex items-center justify-between gap-4 flex-shrink-0">
                <Label className="text-base font-semibold">Machines for Maintenance</Label>
                <Dialog open={machineSearchOpen} onOpenChange={(open) => {
                    setMachineSearchOpen(open);
                    if (!open) {
                        setTempSelectedMachineIds([]);
                        setMachineSearch("");
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Machines
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Select Machines</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                            <div className="relative flex-shrink-0">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search machines..."
                                    value={machineSearch}
                                    onChange={e => setMachineSearch(e.target.value)}
                                    className="pl-8"
                                    autoFocus
                                />
                            </div>
                            <ScrollArea className="flex-1 pr-4">
                                <div className="space-y-2">
                                    {availableMachines.map(machine => (
                                        <div
                                            key={machine.id}
                                            className="flex items-center gap-3 p-3 border rounded hover:bg-muted cursor-pointer transition-colors"
                                            onClick={() => handleToggleMachineSelection(machine.id)}
                                        >
                                            <Checkbox
                                                checked={tempSelectedMachineIds.includes(machine.id)}
                                                onCheckedChange={() => handleToggleMachineSelection(machine.id)}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{machine.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {machine.serialNumber && `S/N: ${machine.serialNumber}`}
                                                    {machine.serialNumber && machine.site && ' • '}
                                                    {machine.site || 'No site'}
                                                </div>
                                            </div>
                                            <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
                                                {machine.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {availableMachines.length === 0 && (
                                        <p className="text-center text-muted-foreground py-8">
                                            {machineSearch ? 'No machines found' : 'All machines added'}
                                        </p>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setMachineSearchOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddMachines} disabled={tempSelectedMachineIds.length === 0}>
                                Add {tempSelectedMachineIds.length > 0 && `(${tempSelectedMachineIds.length})`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Selected Machines List */}
            {selectedMachines.length === 0 ? (
                <Card className="border-dashed flex-shrink-0">
                    <CardContent className="py-12 text-center text-muted-foreground">
                        <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No machines added yet</p>
                        <p className="text-sm mt-1">Click "Add Machines" to select machines for maintenance</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="space-y-3 pb-4">
                        {selectedMachines.map(entry => {
                            const machine = machines.find(m => m.id === entry.machineId);
                            if (!machine) return null;
                            const isVehicle = (machine as any).isVehicle === true;

                            return (
                                <Card key={entry.machineId} className="border-primary/50">
                                    <CardContent className="p-4">
                                        <div className="space-y-4">
                                            {/* Machine Header */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-base">{machine.name}</h4>
                                                    {((machine.serialNumber && machine.serialNumber !== 'N/A') || (machine.model && machine.model !== 'N/A')) && (
                                                        <p className="text-sm text-muted-foreground">
                                                            {machine.serialNumber && machine.serialNumber !== 'N/A' && `S/N: ${machine.serialNumber}`}
                                                            {machine.serialNumber && machine.serialNumber !== 'N/A' && machine.model && machine.model !== 'N/A' && ' • '}
                                                            {machine.model && machine.model !== 'N/A' && `Model: ${machine.model}`}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={machine.status === 'active' ? 'default' : 'secondary'}>
                                                        {machine.status}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                                        onClick={() => handleRemoveMachine(entry.machineId)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Machine Fields */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label className="text-sm font-medium">Maintenance Performed *</Label>
                                                    <Textarea
                                                        value={entry.maintenanceDone}
                                                        onChange={(e) => handleEntryChange(entry.machineId, 'maintenanceDone', e.target.value)}
                                                        placeholder="Describe the maintenance work done..."
                                                        className="min-h-[80px]"
                                                    />
                                                </div>

                                                {!isVehicle && (
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Location</Label>
                                                        <Select
                                                            value={entry.location}
                                                            onValueChange={(val) => handleEntryChange(entry.machineId, 'location', val)}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {locations.map(loc => (
                                                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}

                                                {!isVehicle && (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                checked={!entry.active}
                                                                onCheckedChange={(checked) => handleEntryChange(entry.machineId, 'active', !checked)}
                                                            />
                                                            <Label className="text-sm font-medium cursor-pointer">
                                                                Record Shutdown / Downtime
                                                            </Label>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground pl-6 -mt-3">
                                                            Check this if the machine was shut down for maintenance
                                                        </p>

                                                        {!entry.active && (
                                                            <div className="pl-6 space-y-4 border-l-2 ml-2 animate-accordion-down">
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm text-destructive font-medium">Shutdown Time *</Label>
                                                                        <input
                                                                            type="datetime-local"
                                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                            value={entry.shutdownTime || ''}
                                                                            onChange={(e) => handleEntryChange(entry.machineId, 'shutdownTime', e.target.value)}
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <Label className="text-sm text-green-600 font-medium">Restored Time *</Label>
                                                                        <input
                                                                            type="datetime-local"
                                                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                                            value={entry.restartTime || ''}
                                                                            onChange={(e) => handleEntryChange(entry.machineId, 'restartTime', e.target.value)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {entry.shutdownTime && entry.restartTime && (
                                                                    <div className="text-sm">
                                                                        <span className="text-muted-foreground">Calculated Downtime: </span>
                                                                        {(() => {
                                                                            const start = new Date(entry.shutdownTime);
                                                                            const end = new Date(entry.restartTime);
                                                                            if (end <= start) return <span className="text-destructive font-semibold">Invalid Time Range</span>;
                                                                            const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                                                            return <Badge variant={diff > 24 ? "destructive" : "secondary"}>{diff.toFixed(2)} hours</Badge>;
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="space-y-2 pt-2">
                                                    <Label className="text-sm font-medium">Next Maintenance Date</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !entry.nextMaintenanceDate && "text-muted-foreground")}>
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {entry.nextMaintenanceDate ? format(entry.nextMaintenanceDate, "PPP") : <span>Pick a date</span>}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={entry.nextMaintenanceDate}
                                                                onSelect={(d) => d && handleEntryChange(entry.machineId, 'nextMaintenanceDate', d)}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <p className="text-xs text-muted-foreground">
                                                        Defaults to standard cycle, but you can override it here.
                                                    </p>
                                                </div>

                                                <div className="space-y-2 md:col-span-2">
                                                    <Label className="text-sm font-medium">Parts Replaced</Label>
                                                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-md bg-background">
                                                        {/* Inventory Parts */}
                                                        {entry.selectedParts.map(part => (
                                                            <Badge key={part.id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                                                                {part.name} (x{part.quantity})
                                                                <X
                                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                                    onClick={() => handleRemovePart(entry.machineId, part.id)}
                                                                />
                                                            </Badge>
                                                        ))}

                                                        {/* Custom Parts */}
                                                        {entry.customParts.map((part, index) => (
                                                            <Badge key={`custom-${index}`} variant="outline" className="flex items-center gap-1 px-2 py-1 border-orange-500 text-orange-700">
                                                                {part.name} (x{part.quantity}) - ₦{(part.cost * part.quantity).toLocaleString()}
                                                                <X
                                                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                                                    onClick={() => handleRemoveCustomPart(entry.machineId, index)}
                                                                />
                                                            </Badge>
                                                        ))}

                                                        {/* Add from Inventory Button */}
                                                        <Dialog open={partSelectionOpen && activeMachineId === entry.machineId} onOpenChange={(open) => {
                                                            setPartSelectionOpen(open);
                                                            if (!open) setActiveMachineId(null);
                                                        }}>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() => {
                                                                        setActiveMachineId(entry.machineId);
                                                                        setPartSelectionOpen(true);
                                                                    }}
                                                                >
                                                                    <Plus className="h-3 w-3 mr-1" /> From Inventory
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Select Part from Inventory</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div className="relative">
                                                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                                        <Input
                                                                            placeholder="Search parts..."
                                                                            value={partSearch}
                                                                            onChange={e => setPartSearch(e.target.value)}
                                                                            className="pl-8"
                                                                        />
                                                                    </div>
                                                                    <ScrollArea className="h-[300px]">
                                                                        <div className="space-y-2">
                                                                            {assets
                                                                                .filter(a =>
                                                                                    a.name.toLowerCase().includes(partSearch.toLowerCase()) &&
                                                                                    a.availableQuantity > 0 &&
                                                                                    a.category === 'dewatering' &&
                                                                                    a.type === 'consumable'
                                                                                )
                                                                                .map(asset => (
                                                                                    <div
                                                                                        key={asset.id}
                                                                                        className="flex justify-between items-center p-3 border rounded hover:bg-muted cursor-pointer transition-colors"
                                                                                        onClick={() => handleAddPart(asset)}
                                                                                    >
                                                                                        <div>
                                                                                            <div className="font-medium">{asset.name}</div>
                                                                                            <div className="text-xs text-muted-foreground">
                                                                                                Available: {asset.availableQuantity}
                                                                                            </div>
                                                                                        </div>
                                                                                        <Badge variant="outline">Add</Badge>
                                                                                    </div>
                                                                                ))
                                                                            }
                                                                            {assets.filter(a => a.name.toLowerCase().includes(partSearch.toLowerCase()) && a.availableQuantity > 0 && a.category === 'dewatering' && a.type === 'consumable').length === 0 && (
                                                                                <p className="text-center text-muted-foreground py-8">No parts available</p>
                                                                            )}
                                                                        </div>
                                                                    </ScrollArea>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>

                                                        {/* Add Custom Part Button */}
                                                        <Dialog open={customPartDialogOpen && activeMachineId === entry.machineId} onOpenChange={(open) => {
                                                            setCustomPartDialogOpen(open);
                                                            if (!open) {
                                                                setActiveMachineId(null);
                                                                setCustomPartName("");
                                                                setCustomPartQuantity(1);
                                                                setCustomPartCost(0);
                                                            }
                                                        }}>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700"
                                                                    onClick={() => {
                                                                        setActiveMachineId(entry.machineId);
                                                                        setCustomPartDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <Plus className="h-3 w-3 mr-1" /> Custom Part
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent>
                                                                <DialogHeader>
                                                                    <DialogTitle>Add Custom Part (Not in Inventory)</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div className="space-y-2">
                                                                        <Label>Part Name *</Label>
                                                                        <Input
                                                                            value={customPartName}
                                                                            onChange={(e) => setCustomPartName(e.target.value)}
                                                                            placeholder="e.g., Brake Pads, Oil Filter"
                                                                        />
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-2">
                                                                            <Label>Quantity *</Label>
                                                                            <Input
                                                                                type="number"
                                                                                min="1"
                                                                                value={customPartQuantity}
                                                                                onChange={(e) => setCustomPartQuantity(parseInt(e.target.value) || 1)}
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                            <Label>Cost (₦) *</Label>
                                                                            <Input
                                                                                type="number"
                                                                                min="0"
                                                                                value={customPartCost}
                                                                                onChange={(e) => setCustomPartCost(parseFloat(e.target.value) || 0)}
                                                                                placeholder="Per unit cost"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    {customPartCost > 0 && customPartQuantity > 0 && (
                                                                        <div className="text-sm text-muted-foreground">
                                                                            Total: ₦{(customPartCost * customPartQuantity).toLocaleString()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <DialogFooter>
                                                                    <Button
                                                                        onClick={() => {
                                                                            if (customPartName && customPartQuantity > 0 && customPartCost >= 0 && activeMachineId) {
                                                                                handleAddCustomPart(activeMachineId, customPartName, customPartQuantity, customPartCost);
                                                                                setCustomPartDialogOpen(false);
                                                                                setActiveMachineId(null);
                                                                                setCustomPartName("");
                                                                                setCustomPartQuantity(1);
                                                                                setCustomPartCost(0);
                                                                            }
                                                                        }}
                                                                        disabled={!customPartName || customPartQuantity <= 0}
                                                                    >
                                                                        Add Part
                                                                    </Button>
                                                                </DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 md:col-span-2">
                                                    <Label className="text-sm font-medium">Machine-Specific Remark (optional)</Label>
                                                    <Input
                                                        value={entry.machineRemark}
                                                        onChange={(e) => handleEntryChange(entry.machineId, 'machineRemark', e.target.value)}
                                                        placeholder="Specific notes for this machine (overrides general remark)"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-3 pt-4 border-t mt-auto flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                    {selectedMachines.length > 0 && (
                        <Badge variant="outline" className="text-sm">
                            {selectedMachines.length} machine{selectedMachines.length !== 1 ? 's' : ''} selected
                        </Badge>
                    )}
                </div>
                <div className="flex gap-3">
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={handleSubmit}
                        disabled={selectedMachines.length === 0 || !technician}
                        size="lg"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save Maintenance Logs ({selectedMachines.length})
                    </Button>
                </div>
            </div>
        </div>
    );
};
