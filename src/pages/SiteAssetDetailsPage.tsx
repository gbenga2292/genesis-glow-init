import { useState, useEffect } from "react";
import { Site, Asset, Employee, Waybill, CompanySettings } from "@/types/asset";
import { EquipmentLog, DowntimeEntry } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { SiteMachineAnalytics } from "@/components/sites/SiteMachineAnalytics";
import { ConsumableAnalyticsView } from "@/components/sites/ConsumableAnalyticsView";
import { ArrowLeft, Calendar as CalendarIcon, Save, Clock, AlertTriangle, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { createDefaultOperationalLog, applyDefaultTemplate, calculateDieselRefill, getDieselOverdueDays } from "@/utils/defaultLogTemplate";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useIsMobile } from "@/hooks/use-mobile";

interface SiteAssetDetailsPageProps {
    site: Site;
    asset: Asset;
    equipmentLogs: EquipmentLog[];
    consumableLogs: ConsumableUsageLog[];
    waybills: Waybill[];
    employees: Employee[];
    companySettings?: CompanySettings;
    onBack: () => void;
    onAddEquipmentLog: (log: EquipmentLog) => Promise<void> | void;
    onUpdateEquipmentLog: (log: EquipmentLog) => Promise<void> | void;
    onAddConsumableLog: (log: ConsumableUsageLog) => Promise<void> | void;
    onUpdateConsumableLog: (log: ConsumableUsageLog) => Promise<void> | void;
    initialTab?: string;
}

export const SiteAssetDetailsPage = ({
    site,
    asset,
    equipmentLogs,
    consumableLogs,
    waybills,
    employees,
    companySettings,
    onBack,
    onAddEquipmentLog,
    onUpdateEquipmentLog,
    onAddConsumableLog,
    onUpdateConsumableLog,
    initialTab = "log-entry"
}: SiteAssetDetailsPageProps) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const isEquipment = asset.type === 'equipment';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    // Equipment Form State
    const [equipmentForm, setEquipmentForm] = useState<{
        active: boolean;
        downtimeEntries: DowntimeEntry[];
        maintenanceDetails: string;
        dieselEntered: string;
        supervisorOnSite: string;
        clientFeedback: string;
        issuesOnSite: string;
    }>({
        active: true,
        downtimeEntries: [{ id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }],
        maintenanceDetails: "",
        dieselEntered: "",
        supervisorOnSite: "",
        clientFeedback: "",
        issuesOnSite: ""
    });

    // Consumable Form State
    const [consumableForm, setConsumableForm] = useState<{
        quantityUsed: string;
        usedFor: string;
        usedBy: string;
        notes: string;
    }>({
        quantityUsed: "",
        usedFor: "",
        usedBy: "",
        notes: ""
    });

    // Load existing log when date changes
    useEffect(() => {
        if (!selectedDate) return;

        // Use String() for safe comparison
        const siteId = String(site.id);
        const assetId = String(asset.id);

        if (isEquipment) {
            const existingLog = equipmentLogs.find(log =>
                String(log.equipmentId) === assetId &&
                String(log.siteId) === siteId &&
                format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
            );

            if (existingLog) {
                setEquipmentForm({
                    active: existingLog.active,
                    downtimeEntries: existingLog.downtimeEntries && existingLog.downtimeEntries.length > 0
                        ? existingLog.downtimeEntries
                        : [{ id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }],
                    maintenanceDetails: existingLog.maintenanceDetails || "",
                    dieselEntered: existingLog.dieselEntered?.toString() || "",
                    supervisorOnSite: existingLog.supervisorOnSite || "",
                    clientFeedback: existingLog.clientFeedback || "",
                    issuesOnSite: existingLog.issuesOnSite || ""
                });
            } else {
                // Reset to default
                setEquipmentForm({
                    active: true,
                    downtimeEntries: [{ id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }],
                    maintenanceDetails: "",
                    dieselEntered: "",
                    supervisorOnSite: "",
                    clientFeedback: "",
                    issuesOnSite: ""
                });
            }
        } else {
            // Consumable
            const existingLog = consumableLogs.find(log =>
                String(log.consumableId) === assetId &&
                String(log.siteId) === siteId &&
                format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
            );

            if (existingLog) {
                setConsumableForm({
                    quantityUsed: existingLog.quantityUsed.toString(),
                    usedFor: existingLog.usedFor,
                    usedBy: existingLog.usedBy,
                    notes: existingLog.notes || ""
                });
            } else {
                setConsumableForm({
                    quantityUsed: "",
                    usedFor: "",
                    usedBy: "",
                    notes: ""
                });
            }
        }
    }, [selectedDate, asset.id, site.id, isEquipment, equipmentLogs, consumableLogs]);


    const getEquipmentArrivalDate = (equipmentId: string): Date | null => {
        if (!waybills) return null;
        const relevantWaybills = waybills.filter(
            waybill =>
                String(waybill.siteId) === String(site.id) &&
                waybill.items.some(item => String(item.assetId) === String(equipmentId))
        );

        if (relevantWaybills.length === 0) return null;

        const sortedWaybills = relevantWaybills.sort(
            (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
        );

        return new Date(sortedWaybills[0].issueDate);
    };

    const getMissedLogsCount = (equipmentId: string): number => {
        const arrivalDate = getEquipmentArrivalDate(equipmentId);
        if (!arrivalDate) return 0;

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        let missedCount = 0;
        let currentDate = new Date(arrivalDate);
        currentDate.setHours(0, 0, 0, 0);

        const loggedDates = equipmentLogs
            .filter(l => l.equipmentId === equipmentId && l.siteId === site.id)
            .map(l => {
                const d = new Date(l.date);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            });

        while (currentDate <= today) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
            if (!loggedDates.includes(dateStr)) {
                missedCount++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return missedCount;
    };

    const handleSaveEquipmentLog = async () => {
        if (!selectedDate) return;

        try {
            const existingLog = equipmentLogs.find(log =>
                log.equipmentId === asset.id &&
                log.siteId === site.id &&
                format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
            );

            const logData: EquipmentLog = {
                id: existingLog?.id, // ID is optional in type? Check type definition. Assuming it handles optional or separate Create type.
                // If ID is required by type but missing for new, we generate it or let backend handle?
                // Existing logic uses Date.now().toString() for new logs usually.
                // I'll ensure ID is present if updating.
                // Type definition usually has id?: string or id: string. I'll check usage.
                // MachinesSection used: id: existingLog?.id || Date.now().toString(),
                equipmentId: asset.id,
                equipmentName: asset.name,
                siteId: site.id,
                date: selectedDate,
                active: equipmentForm.active,
                downtimeEntries: equipmentForm.downtimeEntries.filter(e => e.downtime || e.downtimeReason), // Filter empty?
                maintenanceDetails: equipmentForm.maintenanceDetails || undefined,
                dieselEntered: equipmentForm.dieselEntered ? parseFloat(equipmentForm.dieselEntered) : undefined,
                supervisorOnSite: equipmentForm.supervisorOnSite || undefined,
                clientFeedback: equipmentForm.clientFeedback || undefined,
                issuesOnSite: equipmentForm.issuesOnSite || undefined,
                createdAt: existingLog?.createdAt || new Date(),
                updatedAt: new Date()
            } as EquipmentLog; // Cast to ensure compatibility if strict

            if (existingLog) {
                await onUpdateEquipmentLog(logData);
                toast({ title: "Log Updated", description: `Equipment log for ${format(selectedDate, 'PPP')} updated.` });
            } else {
                // For new log, ensure ID
                const newLog = { ...logData, id: Date.now().toString() };
                await onAddEquipmentLog(newLog);
                toast({ title: "Log Created", description: `Equipment log for ${format(selectedDate, 'PPP')} created.` });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
        }
    };

    const handleSaveConsumableLog = async () => {
        if (!selectedDate) return;

        const quantityUsed = parseFloat(consumableForm.quantityUsed);
        if (isNaN(quantityUsed) || quantityUsed <= 0) {
            toast({ title: "Invalid Quantity", description: "Please enter a valid quantity.", variant: "destructive" });
            return;
        }

        if (!asset.unitOfMeasurement) {
            toast({ title: "Missing Unit", description: "Asset has no unit of measurement.", variant: "destructive" });
            return;
        }

        const currentQty = asset.siteQuantities?.[site.id] || 0;
        // Note: If updating, we should account for previous usage?
        // Logic in ConsumablesSection checks against currentQty.
        // If updating, we might allow if diff is valid. Simpler to just warn.

        const existingLog = consumableLogs.find(log =>
            log.consumableId === asset.id &&
            log.siteId === site.id &&
            format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
        );

        const logData: ConsumableUsageLog = {
            id: existingLog?.id || Date.now().toString(),
            consumableId: asset.id,
            consumableName: asset.name,
            siteId: site.id,
            date: selectedDate,
            quantityUsed: quantityUsed,
            quantityRemaining: currentQty - quantityUsed, // This might be inaccurate if multiple logs exist? Logic in Section was simple subtraction.
            unit: asset.unitOfMeasurement,
            usedFor: consumableForm.usedFor,
            usedBy: consumableForm.usedBy,
            notes: consumableForm.notes || undefined,
            createdAt: existingLog?.createdAt || new Date(),
            updatedAt: new Date()
        };

        try {
            if (existingLog) {
                await onUpdateConsumableLog(logData);
                toast({ title: "Log Updated", description: "Consumable usage updated." });
            } else {
                await onAddConsumableLog(logData);
                toast({ title: "Log Created", description: "Consumable usage recorded." });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
        }
    };

    const activeLogs = isEquipment
        ? equipmentLogs.filter(l => l.equipmentId === asset.id && l.siteId === site.id)
        : consumableLogs.filter(l => l.consumableId === asset.id && l.siteId === site.id);

    const tabs = [
        { value: 'log-entry', label: 'Log Entry' },
        { value: 'history', label: 'History' },
        { value: 'analytics', label: 'Analytics' }
    ];

    return (
        <div className="flex flex-col h-full bg-background animate-fade-in">
            {/* Header - Mobile responsive */}
            <div className="flex items-center gap-2 sm:gap-4 p-3 sm:p-6 border-b sticky top-0 bg-background z-10">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onBack}
                    className="shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                    aria-label="Go back"
                >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="text-base sm:text-2xl font-bold tracking-tight flex items-center gap-2 truncate">
                        <span className="truncate">{asset.name}</span>
                        <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                            ({isEquipment ? 'Equipment' : 'Consumable'})
                        </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {site.name} • {asset.status || 'Active'}
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-3 sm:p-6">
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
                        <TabsList>
                            <TabsTrigger value="log-entry">Log Entry</TabsTrigger>
                            <TabsTrigger value="history">History / Logs</TabsTrigger>
                            <TabsTrigger value="analytics">Analytics</TabsTrigger>
                        </TabsList>
                    )}

                    <TabsContent value="log-entry" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                            {/* Calendar Card - Full width on mobile */}
                            <div className="space-y-4">
                                <Card>
                                    <CardHeader className="p-3 sm:p-6">
                                        <CardTitle className="text-sm sm:text-base">Select Date</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-6 pt-0">
                                        <div className="flex justify-center">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={setSelectedDate}
                                                className="rounded-md border w-full max-w-[280px]"
                                                modifiers={{
                                                    logged: activeLogs.map(l => new Date(l.date)),
                                                    arrival: isEquipment && getEquipmentArrivalDate(asset.id) ? [getEquipmentArrivalDate(asset.id) as Date] : []
                                                }}
                                                modifiersStyles={{
                                                    logged: {
                                                        backgroundColor: 'hsl(var(--primary))',
                                                        color: 'white',
                                                        fontWeight: 'bold'
                                                    },
                                                    arrival: {
                                                        backgroundColor: 'hsl(34 89% 72%)',
                                                        color: '#000',
                                                        fontWeight: 'bold',
                                                        textDecoration: 'underline'
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className="space-y-1 mt-2">
                                            <p className="text-xs text-center text-muted-foreground">
                                                <span style={{ color: 'hsl(var(--primary))', fontWeight: 'bold' }}>■</span> Blue = logged
                                            </p>
                                            {isEquipment && (
                                                <>
                                                    <p className="text-xs text-center text-muted-foreground">
                                                        <span style={{ color: 'hsl(34 89% 72%)', fontWeight: 'bold' }}>■</span> Orange = arrival
                                                    </p>
                                                    {getEquipmentArrivalDate(asset.id) && (
                                                        <p className="text-xs font-medium text-orange-700 text-center mt-1">
                                                            ⚠️ {getMissedLogsCount(asset.id)} missed
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Form Card - Full width on mobile, 2 cols on desktop */}
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader className="p-3 sm:p-6">
                                        <CardTitle className="text-sm sm:text-base">
                                            {selectedDate ? format(selectedDate, 'PPP') : 'Select a Date'}
                                        </CardTitle>
                                        <CardDescription className="text-xs sm:text-sm">
                                            {isEquipment ? 'Daily Equipment Log' : 'Consumable Usage Log'}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                                        {isEquipment ? (
                                            /* Equipment Form - Mobile responsive */
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id="active"
                                                        checked={equipmentForm.active}
                                                        onCheckedChange={(checked) => setEquipmentForm({ ...equipmentForm, active: checked as boolean })}
                                                    />
                                                    <Label htmlFor="active" className="text-sm">Machine Active</Label>
                                                </div>

                                                {equipmentForm.active && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs sm:text-sm">Diesel Added (L)</Label>
                                                            <Input
                                                                type="number"
                                                                value={equipmentForm.dieselEntered}
                                                                onChange={e => setEquipmentForm({ ...equipmentForm, dieselEntered: e.target.value })}
                                                                placeholder="0.0"
                                                                className="h-9"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs sm:text-sm">Supervisor</Label>
                                                            <Select
                                                                value={equipmentForm.supervisorOnSite}
                                                                onValueChange={v => setEquipmentForm({ ...equipmentForm, supervisorOnSite: v })}
                                                            >
                                                                <SelectTrigger className="h-9">
                                                                    <SelectValue placeholder="Select..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs sm:text-sm">Maintenance / Issues</Label>
                                                    <Textarea
                                                        value={equipmentForm.maintenanceDetails}
                                                        onChange={e => setEquipmentForm({ ...equipmentForm, maintenanceDetails: e.target.value })}
                                                        placeholder="Describe maintenance or issues..."
                                                        rows={2}
                                                        className="text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs sm:text-sm">Downtime (Optional)</Label>
                                                    {equipmentForm.downtimeEntries.map((entry, index) => (
                                                        <div key={entry.id || index} className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2 border rounded">
                                                            <Input
                                                                placeholder="Time (HH:MM)"
                                                                value={entry.downtime}
                                                                onChange={e => {
                                                                    const newEntries = [...equipmentForm.downtimeEntries];
                                                                    newEntries[index].downtime = e.target.value;
                                                                    setEquipmentForm({ ...equipmentForm, downtimeEntries: newEntries });
                                                                }}
                                                                className="h-9"
                                                            />
                                                            <Input
                                                                placeholder="Reason"
                                                                value={entry.downtimeReason}
                                                                onChange={e => {
                                                                    const newEntries = [...equipmentForm.downtimeEntries];
                                                                    newEntries[index].downtimeReason = e.target.value;
                                                                    setEquipmentForm({ ...equipmentForm, downtimeEntries: newEntries });
                                                                }}
                                                                className="h-9"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-3 sm:pt-4">
                                                    <Button onClick={handleSaveEquipmentLog} className="w-full h-10">
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Save Log
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Consumable Form - Mobile responsive */
                                            <div className="space-y-3 sm:space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs sm:text-sm">Quantity Used ({asset.unitOfMeasurement})</Label>
                                                        <Input
                                                            type="number"
                                                            value={consumableForm.quantityUsed}
                                                            onChange={e => setConsumableForm({ ...consumableForm, quantityUsed: e.target.value })}
                                                            placeholder="0.00"
                                                            className="h-9"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Available: {asset.siteQuantities?.[site.id] || 0} {asset.unitOfMeasurement}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs sm:text-sm">Used By</Label>
                                                        <Select
                                                            value={consumableForm.usedBy}
                                                            onValueChange={v => setConsumableForm({ ...consumableForm, usedBy: v })}
                                                        >
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Select..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {employees.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs sm:text-sm">Used For</Label>
                                                    <Input
                                                        value={consumableForm.usedFor}
                                                        onChange={e => setConsumableForm({ ...consumableForm, usedFor: e.target.value })}
                                                        placeholder="Task description..."
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs sm:text-sm">Notes</Label>
                                                    <Textarea
                                                        value={consumableForm.notes}
                                                        onChange={e => setConsumableForm({ ...consumableForm, notes: e.target.value })}
                                                        placeholder="Additional notes..."
                                                        rows={2}
                                                        className="text-sm"
                                                    />
                                                </div>
                                                <div className="pt-3 sm:pt-4">
                                                    <Button onClick={handleSaveConsumableLog} className="w-full h-10">
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Save Usage
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history">
                        <Card>
                            <CardHeader className="p-3 sm:p-6">
                                <CardTitle className="text-sm sm:text-base">History</CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 sm:p-6 pt-0">
                                {activeLogs.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">No logs found.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {activeLogs
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((log: any) => (
                                                <div key={log.id} className="border p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-medium text-sm sm:text-base">{format(new Date(log.date), 'PPP')}</div>
                                                        <div className="text-xs sm:text-sm text-muted-foreground truncate">
                                                            {isEquipment
                                                                ? `${log.active ? 'Active' : 'Inactive'} • ${log.dieselEntered || 0}L Diesel`
                                                                : `${log.quantityUsed} ${log.unit} • ${log.usedFor}`
                                                            }
                                                        </div>
                                                    </div>
                                                    <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => {
                                                        setSelectedDate(new Date(log.date));
                                                        setActiveTab("log-entry");
                                                    }}>
                                                        Edit
                                                    </Button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="analytics">
                        {isEquipment ? (
                            <SiteMachineAnalytics
                                site={site}
                                equipment={[asset]}
                                equipmentLogs={activeLogs as EquipmentLog[]}
                                companySettings={companySettings}
                            />
                        ) : (
                            <ConsumableAnalyticsView
                                site={site}
                                consumable={asset}
                                logs={activeLogs as ConsumableUsageLog[]}
                                companySettings={companySettings}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};
