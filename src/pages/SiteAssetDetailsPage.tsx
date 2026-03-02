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
import { ArrowLeft, Calendar as CalendarIcon, Save, Clock, AlertTriangle, FileText, Activity, Plus, CheckCircle, Zap, Trash2 } from "lucide-react";
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
    onDeleteEquipmentLog?: (logId: string) => Promise<void> | void;
    onAddConsumableLog: (log: ConsumableUsageLog) => Promise<void> | void;
    onUpdateConsumableLog: (log: ConsumableUsageLog) => Promise<void> | void;
    initialTab?: string;
    initialSelectedDate?: Date;
    isReadOnly?: boolean;
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
    onDeleteEquipmentLog,
    onAddConsumableLog,
    onUpdateConsumableLog,
    initialTab = "log-entry",
    initialSelectedDate,
    isReadOnly = false,
}: SiteAssetDetailsPageProps) => {
    const { toast } = useToast();
    const isMobile = useIsMobile();
    const [isSaving, setIsSaving] = useState(false);
    const isEquipment = asset.type === 'equipment';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialSelectedDate || new Date());

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

    const handleAutoFill = () => {
        setEquipmentForm(prev => ({
            ...prev,
            active: true,
            maintenanceDetails: prev.maintenanceDetails || "Routine check completed - all systems operational",
            clientFeedback: prev.clientFeedback || "Site operational and progressing as planned",
            issuesOnSite: prev.issuesOnSite || "No issues on site",
        }));
        toast({ title: "Auto-Filled", description: "Default values applied to empty fields." });
    };

    const handleSaveEquipmentLog = async () => {
        if (!selectedDate) return;
        if (isReadOnly) {
            toast({ title: "Read-only", description: "This machine is in history mode; logs cannot be edited.", variant: "destructive" });
            return;
        }

        // Guard: prevent saving a log before the machine's arrival date
        if (arrivalDate) {
            const arrivalMidnight = new Date(arrivalDate);
            arrivalMidnight.setHours(0, 0, 0, 0);
            const selectedMidnight = new Date(selectedDate);
            selectedMidnight.setHours(0, 0, 0, 0);
            if (selectedMidnight < arrivalMidnight) {
                toast({
                    title: "Date Not Allowed",
                    description: `This machine arrived on site on ${format(arrivalDate, 'PPP')}. You cannot log before that date.`,
                    variant: "destructive"
                });
                return;
            }
        }
        setIsSaving(true);
        try {
            const existingLog = equipmentLogs.find(log =>
                String(log.equipmentId) === String(asset.id) &&
                String(log.siteId) === String(site.id) &&
                format(new Date(log.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
            );

            const logData: EquipmentLog = {
                id: existingLog?.id,
                equipmentId: asset.id,
                equipmentName: asset.name,
                siteId: site.id,
                date: selectedDate,
                active: equipmentForm.active,
                downtimeEntries: equipmentForm.downtimeEntries.filter(e => e.downtime || e.downtimeReason || e.downtimeAction || e.uptime),
                maintenanceDetails: equipmentForm.maintenanceDetails || undefined,
                dieselEntered: equipmentForm.dieselEntered ? parseFloat(equipmentForm.dieselEntered) : undefined,
                supervisorOnSite: equipmentForm.supervisorOnSite || undefined,
                clientFeedback: equipmentForm.clientFeedback || undefined,
                issuesOnSite: equipmentForm.issuesOnSite || undefined,
                createdAt: existingLog?.createdAt || new Date(),
                updatedAt: new Date()
            } as EquipmentLog;

            if (existingLog) {
                await onUpdateEquipmentLog(logData);
                toast({ title: "Log Updated", description: `Equipment log for ${format(selectedDate, 'PPP')} updated.` });
            } else {
                const newLog = { ...logData, id: Date.now().toString() };
                await onAddEquipmentLog(newLog);
                toast({ title: "Log Created", description: `Equipment log for ${format(selectedDate, 'PPP')} created.` });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save log.", variant: "destructive" });
        } finally {
            setIsSaving(false);
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

    // Arrival date for this asset at this site (used to restrict calendar & filter history)
    const arrivalDate = isEquipment ? getEquipmentArrivalDate(asset.id) : null;

    // Clamp selectedDate: if it falls before arrival, reset to arrival date
    // (handled via fromDate prop on Calendar — we just guard on save)

    // Filter logs for this asset+site, then deduplicate by date — keep the most recently-updated
    // entry per date (older duplicates caused by the pre-fix transform bug are hidden this way)
    const rawLogs = isEquipment
        ? equipmentLogs.filter(l => String(l.equipmentId) === String(asset.id) && String(l.siteId) === String(site.id))
        : consumableLogs.filter(l => String(l.consumableId) === String(asset.id) && String(l.siteId) === String(site.id));

    const activeLogs = (() => {
        const byDate = new Map<string, any>();
        for (const log of rawLogs) {
            const logDate = new Date(log.date);
            // Exclude logs before the arrival date
            if (arrivalDate) {
                const arrivalMidnight = new Date(arrivalDate);
                arrivalMidnight.setHours(0, 0, 0, 0);
                logDate.setHours(0, 0, 0, 0);
                if (logDate < arrivalMidnight) continue;
            }
            const dateKey = format(new Date(log.date), 'yyyy-MM-dd');
            const existing = byDate.get(dateKey);
            // Keep the one with the latest updatedAt (most recently saved)
            if (!existing || new Date(log.updatedAt) > new Date(existing.updatedAt)) {
                byDate.set(dateKey, log);
            }
        }
        return Array.from(byDate.values());
    })();

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
                                                fromDate={isEquipment && arrivalDate ? arrivalDate : undefined}
                                                modifiers={{
                                                    logged: activeLogs.map(l => new Date(l.date)),
                                                    arrival: isEquipment && arrivalDate ? [arrivalDate] : []
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
                                    <CardHeader className="p-3 sm:p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <CardTitle className="text-sm sm:text-base">
                                                    {selectedDate ? format(selectedDate, 'PPP') : 'Select a Date'}
                                                </CardTitle>
                                                <CardDescription className="text-xs sm:text-sm">
                                                    {isEquipment ? 'Daily Equipment Log' : 'Consumable Usage Log'}
                                                </CardDescription>
                                            </div>
                                            {isEquipment && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleAutoFill}
                                                    className="shrink-0 h-8 text-xs gap-1.5"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                    Auto-Fill
                                                </Button>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-4">
                                        {isEquipment ? (
                                            /* Equipment Form — matches Quick Log field set */
                                            <div className="space-y-4">
                                                {/* Machine Active */}
                                                <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                                                    <Checkbox
                                                        id="site-active"
                                                        checked={equipmentForm.active}
                                                        onCheckedChange={(checked) => setEquipmentForm({ ...equipmentForm, active: checked as boolean })}
                                                    />
                                                    <Label htmlFor="site-active" className="text-sm font-medium cursor-pointer">Machine Active</Label>
                                                </div>

                                                {equipmentForm.active && (
                                                    <div className="space-y-4">
                                                        {/* Downtime Entries */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <Label className="text-sm font-medium">Downtime Entries</Label>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setEquipmentForm({
                                                                        ...equipmentForm,
                                                                        downtimeEntries: [...equipmentForm.downtimeEntries, { id: Date.now().toString(), downtime: "", downtimeReason: "", downtimeAction: "", uptime: "" }]
                                                                    })}
                                                                    className="h-8 text-xs"
                                                                >
                                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                                    Add
                                                                </Button>
                                                            </div>

                                                            {equipmentForm.downtimeEntries.map((entry, index) => (
                                                                <Card key={entry.id || index} className="border shadow-none">
                                                                    <CardContent className="p-3 space-y-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-medium text-muted-foreground">Entry {index + 1}</span>
                                                                            {equipmentForm.downtimeEntries.length > 1 && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="sm"
                                                                                    onClick={() => setEquipmentForm({
                                                                                        ...equipmentForm,
                                                                                        downtimeEntries: equipmentForm.downtimeEntries.filter((_, i) => i !== index)
                                                                                    })}
                                                                                    className="h-6 text-xs text-destructive hover:text-destructive"
                                                                                >
                                                                                    Remove
                                                                                </Button>
                                                                            )}
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[10px] text-muted-foreground">Time Off</Label>
                                                                                <Input
                                                                                    value={entry.downtime}
                                                                                    onChange={(e) => {
                                                                                        const newEntries = [...equipmentForm.downtimeEntries];
                                                                                        newEntries[index].downtime = e.target.value;
                                                                                        setEquipmentForm({ ...equipmentForm, downtimeEntries: newEntries });
                                                                                    }}
                                                                                    placeholder="14:30"
                                                                                    className="h-9 text-sm"
                                                                                />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <Label className="text-[10px] text-muted-foreground">Time Back</Label>
                                                                                <Input
                                                                                    value={entry.uptime}
                                                                                    onChange={(e) => {
                                                                                        const newEntries = [...equipmentForm.downtimeEntries];
                                                                                        newEntries[index].uptime = e.target.value;
                                                                                        setEquipmentForm({ ...equipmentForm, downtimeEntries: newEntries });
                                                                                    }}
                                                                                    placeholder="16:00"
                                                                                    className="h-9 text-sm"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] text-muted-foreground">Reason</Label>
                                                                            <Input
                                                                                value={entry.downtimeReason}
                                                                                onChange={(e) => {
                                                                                    const newEntries = [...equipmentForm.downtimeEntries];
                                                                                    newEntries[index].downtimeReason = e.target.value;
                                                                                    setEquipmentForm({ ...equipmentForm, downtimeEntries: newEntries });
                                                                                }}
                                                                                placeholder="Reason for downtime"
                                                                                className="h-9 text-sm"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <Label className="text-[10px] text-muted-foreground">Action Taken</Label>
                                                                            <Textarea
                                                                                value={entry.downtimeAction}
                                                                                onChange={(e) => {
                                                                                    const newEntries = [...equipmentForm.downtimeEntries];
                                                                                    newEntries[index].downtimeAction = e.target.value;
                                                                                    setEquipmentForm({ ...equipmentForm, downtimeEntries: newEntries });
                                                                                }}
                                                                                placeholder="Actions taken"
                                                                                rows={2}
                                                                                className="text-sm resize-none"
                                                                            />
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            ))}
                                                        </div>

                                                        {/* Diesel & Supervisor */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs sm:text-sm">Diesel (L)</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={equipmentForm.dieselEntered}
                                                                    onChange={e => setEquipmentForm({ ...equipmentForm, dieselEntered: e.target.value })}
                                                                    placeholder="0.0"
                                                                    className="h-9"
                                                                />
                                                                {(() => {
                                                                    const overdueDays = getDieselOverdueDays(equipmentLogs, asset.id);
                                                                    const refillAmount = calculateDieselRefill(equipmentLogs, asset.id);
                                                                    return overdueDays > 0 ? (
                                                                        <p className="text-[10px] text-warning">⚠️ {refillAmount}L due ({overdueDays}d overdue)</p>
                                                                    ) : refillAmount ? (
                                                                        <p className="text-[10px] text-primary">💡 Suggested: {refillAmount}L</p>
                                                                    ) : null;
                                                                })()}
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
                                                                        {employees.map(e => <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>)}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>

                                                        {/* Maintenance Details */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs sm:text-sm">Maintenance Details</Label>
                                                            <Textarea
                                                                value={equipmentForm.maintenanceDetails}
                                                                onChange={e => setEquipmentForm({ ...equipmentForm, maintenanceDetails: e.target.value })}
                                                                placeholder="Maintenance performed"
                                                                rows={2}
                                                                className="text-sm resize-none"
                                                            />
                                                        </div>

                                                        {/* Client Feedback */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs sm:text-sm">Client Feedback</Label>
                                                            <Textarea
                                                                value={equipmentForm.clientFeedback}
                                                                onChange={e => setEquipmentForm({ ...equipmentForm, clientFeedback: e.target.value })}
                                                                placeholder="Client comments"
                                                                rows={2}
                                                                className="text-sm resize-none"
                                                            />
                                                        </div>

                                                        {/* Issues on Site */}
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs sm:text-sm">Issues on Site</Label>
                                                            <Textarea
                                                                value={equipmentForm.issuesOnSite}
                                                                onChange={e => setEquipmentForm({ ...equipmentForm, issuesOnSite: e.target.value })}
                                                                placeholder="Any issues encountered"
                                                                rows={2}
                                                                className="text-sm resize-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="pt-2">
                                                    <Button onClick={handleSaveEquipmentLog} disabled={isSaving || isReadOnly} className="w-full h-10">
                                                        <Save className="h-4 w-4 mr-2" />
                                                        {isReadOnly ? "Read-only" : isSaving ? "Saving..." : "Save Log"}
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
                                                        {isReadOnly ? "View" : "Edit"}
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
