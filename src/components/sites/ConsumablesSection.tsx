import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Site, Asset, Employee } from "@/types/asset";
import { ConsumableUsageLog } from "@/types/consumable";
import { Waybill } from "@/types/asset";
import { Package2, ChevronDown, Plus, TrendingUp, Eye, BarChart3, LineChart } from "lucide-react";
import { format } from "date-fns";
import { ConsumableAnalytics } from "./ConsumableAnalytics";
import { SiteConsumablesAnalytics } from "./SiteConsumablesAnalytics";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { logActivity } from "@/utils/activityLogger";

interface ConsumablesSectionProps {
  site: Site;
  assets: Asset[];
  employees: Employee[];
  waybills: Waybill[];
  consumableLogs: ConsumableUsageLog[];
  onAddConsumableLog: (log: ConsumableUsageLog) => void;
  onUpdateConsumableLog: (log: ConsumableUsageLog) => void;
}

export const ConsumablesSection = ({
  site,
  assets,
  employees,
  waybills,
  consumableLogs,
  onAddConsumableLog,
  onUpdateConsumableLog
}: ConsumablesSectionProps) => {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [showSiteAnalytics, setShowSiteAnalytics] = useState(false);
  const [selectedConsumable, setSelectedConsumable] = useState<Asset | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [logForm, setLogForm] = useState<{
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

  // Filter consumables at the site (INCLUDING depleted/zero and historical via waybills/logs)
  const siteConsumables = assets.filter(asset => {
    if (asset.type !== 'consumable') return false;
    
    // Check if consumable has usage logs at this site
    const hasLogs = consumableLogs.some(log => 
      log.consumableId === asset.id && 
      log.siteId === site.id
    );
    
    // Check if consumable currently has quantity at this site (including 0)
    const hasSiteQuantity = asset.siteQuantities && asset.siteQuantities[site.id] !== undefined;
    
    // Check if consumable was ever sent to this site via waybill
    const hasWaybillHistory = waybills.some(wb => 
      wb.siteId === site.id && 
      wb.items.some(item => item.assetId === asset.id)
    );
    
    // Show consumable if it has logs, current site quantity, OR waybill history
    // This ensures consumables remain visible even if fully consumed/returned
    return hasLogs || hasSiteQuantity || hasWaybillHistory;
  });

  const handleLogUsage = (consumable: Asset) => {
    setSelectedConsumable(consumable);
    setSelectedDate(new Date());
    
    // Check for existing log for today
    const existingLog = consumableLogs.find(log =>
      log.consumableId === consumable.id &&
      log.siteId === site.id &&
      format(log.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    );
    
    if (existingLog) {
      // Populate form with existing data
      setLogForm({
        quantityUsed: existingLog.quantityUsed.toString(),
        usedFor: existingLog.usedFor,
        usedBy: existingLog.usedBy,
        notes: existingLog.notes || ""
      });
    } else {
      // Reset form for new entry
      setLogForm({
        quantityUsed: "",
        usedFor: "",
        usedBy: "",
        notes: ""
      });
    }
    
    setShowLogDialog(true);
  };
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date && selectedConsumable) {
      setSelectedDate(date);
      
      // Check for existing log
      const existingLog = consumableLogs.find(log =>
        log.consumableId === selectedConsumable.id &&
        log.siteId === site.id &&
        format(log.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      if (existingLog) {
        // Populate form with existing data
        setLogForm({
          quantityUsed: existingLog.quantityUsed.toString(),
          usedFor: existingLog.usedFor,
          usedBy: existingLog.usedBy,
          notes: existingLog.notes || ""
        });
      } else {
        // Reset form for new entry
        setLogForm({
          quantityUsed: "",
          usedFor: "",
          usedBy: "",
          notes: ""
        });
      }
    }
  };

  const handleSaveLog = () => {
    if (!selectedConsumable || !selectedDate) return;

    const quantityUsed = parseFloat(logForm.quantityUsed);
    if (isNaN(quantityUsed) || quantityUsed <= 0) {
      toast({
        title: "Invalid Quantity",
        description: "Please enter a valid quantity used.",
        variant: "destructive",
      });
      return;
    }

    // Check if unit exists and is not empty
    const unit = selectedConsumable.unitOfMeasurement?.trim();
    if (!unit) {
      console.error('Missing unit:', {
        consumable: selectedConsumable.name,
        unitValue: selectedConsumable.unitOfMeasurement,
        unitType: typeof selectedConsumable.unitOfMeasurement
      });
      toast({
        title: "Missing Unit",
        description: `This consumable (${selectedConsumable.name}) doesn't have a valid unit of measurement. Please edit the asset and add a unit.`,
        variant: "destructive",
      });
      return;
    }

    const currentQuantity = selectedConsumable.siteQuantities?.[site.id] || 0;
    if (quantityUsed > currentQuantity) {
      toast({
        title: "Insufficient Quantity",
        description: `Only ${currentQuantity} ${unit} available at site.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if we're updating an existing log
    const existingLog = consumableLogs.find(log =>
      log.consumableId === selectedConsumable.id &&
      log.siteId === site.id &&
      format(log.date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
    );

    const logData: ConsumableUsageLog = {
      id: existingLog?.id || Date.now().toString(),
      consumableId: selectedConsumable.id,
      consumableName: selectedConsumable.name,
      siteId: site.id,
      date: selectedDate,
      quantityUsed: quantityUsed,
      quantityRemaining: currentQuantity - quantityUsed,
      unit: unit,
      usedFor: logForm.usedFor,
      usedBy: logForm.usedBy,
      notes: logForm.notes || undefined,
      createdAt: existingLog?.createdAt || new Date(),
      updatedAt: new Date()
    };

    if (existingLog) {
      onUpdateConsumableLog(logData);
      logActivity({
        action: 'update',
        entity: 'consumable_log',
        entityId: selectedConsumable.id,
        details: `Updated usage log for ${selectedConsumable.name} at ${site.name} on ${format(selectedDate, 'MMM dd, yyyy')} - Used: ${quantityUsed} ${unit}`
      });
    } else {
      onAddConsumableLog(logData);
      logActivity({
        action: 'create',
        entity: 'consumable_log',
        entityId: selectedConsumable.id,
        details: `Created usage log for ${selectedConsumable.name} at ${site.name} on ${format(selectedDate, 'MMM dd, yyyy')} - Used: ${quantityUsed} ${unit}`
      });
    }
    
    setShowLogDialog(false);
    setSelectedConsumable(null);
    setSelectedDate(undefined);
    
    toast({
      title: existingLog ? "Usage Updated" : "Usage Logged",
      description: `${quantityUsed} ${selectedConsumable.unitOfMeasurement} of ${selectedConsumable.name} ${existingLog ? 'updated' : 'logged'}.`,
    });
  };
  
  const getLoggedDatesForConsumable = (consumableId: string) => {
    return consumableLogs
      .filter(log => log.consumableId === consumableId && log.siteId === site.id)
      .map(log => log.date);
  };

  const getConsumableLogs = (consumableId: string) => {
    const filtered = consumableLogs.filter(log => {
      // Convert both to strings for comparison to avoid type mismatch
      const logConsumableId = String(log.consumableId);
      const logSiteId = String(log.siteId);
      const targetConsumableId = String(consumableId);
      const targetSiteId = String(site.id);
      
      console.log('Filtering logs:', {
        logConsumableId,
        logSiteId,
        targetConsumableId,
        targetSiteId,
        matches: logConsumableId === targetConsumableId && logSiteId === targetSiteId
      });
      
      return logConsumableId === targetConsumableId && logSiteId === targetSiteId;
    });
    
    console.log('All consumable logs:', consumableLogs);
    console.log('Filtered logs for', consumableId, 'at site', site.id, ':', filtered);
    
    return filtered;
  };

  const getTotalUsed = (consumableId: string) => {
    return consumableLogs
      .filter(log => String(log.consumableId) === String(consumableId) && String(log.siteId) === String(site.id))
      .reduce((sum, log) => sum + log.quantityUsed, 0);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Consumables Tracking</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSiteAnalytics(true)}
            className="gap-2"
          >
            <LineChart className="h-4 w-4" />
            Site Analytics
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="space-y-4">
        {siteConsumables.length === 0 ? (
          <p className="text-muted-foreground">No consumables at this site.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {siteConsumables.map((consumable) => {
              const currentQty = consumable.siteQuantities?.[site.id] ?? 0;
              const totalUsed = getTotalUsed(consumable.id);
              const logs = getConsumableLogs(consumable.id);
              
              return (
                <Card key={consumable.id} className={`border-0 shadow-soft ${currentQty === 0 ? 'opacity-75' : ''}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="truncate">{consumable.name}</span>
                      <Badge variant={currentQty === 0 ? 'destructive' : 'outline'} className="ml-2">
                        {currentQty} {consumable.unitOfMeasurement}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">At Site:</span>
                        <span className={`font-medium ${currentQty === 0 ? 'text-destructive' : ''}`}>
                          {currentQty} {consumable.unitOfMeasurement}
                          {currentQty === 0 && ' (Empty)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Used:</span>
                        <span className="font-medium">{totalUsed} {consumable.unitOfMeasurement}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Usage Count:</span>
                        <span className="font-medium">{logs.length}x</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleLogUsage(consumable)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!hasPermission('print_documents') || currentQty === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {currentQty === 0 ? 'Depleted' : 'Log Usage'}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedConsumable(consumable);
                          setShowViewDialog(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="px-2"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedConsumable(consumable);
                          setShowAnalyticsDialog(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="px-2"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CollapsibleContent>

      {/* Log Usage Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Consumable Usage - {selectedConsumable?.name}</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, 'PPP')} - Current stock: {selectedConsumable?.siteQuantities?.[site.id]} {selectedConsumable?.unitOfMeasurement}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Calendar on the Left */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && handleDateSelect(date)}
                modifiers={{
                  logged: selectedConsumable ? getLoggedDatesForConsumable(selectedConsumable.id) : []
                }}
                modifiersStyles={{
                  logged: {
                    backgroundColor: 'hsl(var(--primary))',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
                className="rounded-md border"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Blue dates have existing logs
              </p>
            </div>

            {/* Form on the Right */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="quantityUsed">Quantity Used *</Label>
                <Input
                  id="quantityUsed"
                  type="number"
                  step="0.01"
                  value={logForm.quantityUsed}
                  onChange={(e) => setLogForm({...logForm, quantityUsed: e.target.value})}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usedFor">Used For *</Label>
                <Input
                  id="usedFor"
                  value={logForm.usedFor}
                  onChange={(e) => setLogForm({...logForm, usedFor: e.target.value})}
                  placeholder="e.g., Waterproofing basement"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usedBy">Used By *</Label>
                <Select
                  value={logForm.usedBy}
                  onValueChange={(value) => setLogForm({...logForm, usedBy: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter(emp => emp.status === 'active')
                      .map(emp => (
                        <SelectItem key={emp.id} value={emp.name}>
                          {emp.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={logForm.notes}
                  onChange={(e) => setLogForm({...logForm, notes: e.target.value})}
                  placeholder="Additional details"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowLogDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveLog}>
                  Save Log
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Logs Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Usage History - {selectedConsumable?.name}</DialogTitle>
            <DialogDescription>
              All usage logs for this consumable at {site.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedConsumable && getConsumableLogs(selectedConsumable.id).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No usage logs yet</p>
            ) : (
              <div className="space-y-3">
                {selectedConsumable && getConsumableLogs(selectedConsumable.id)
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((log) => (
                    <Card key={log.id}>
                      <CardContent className="pt-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Date</p>
                            <p className="font-medium">{format(new Date(log.date), 'PPP')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Quantity Used</p>
                            <p className="font-medium">{log.quantityUsed} {log.unit}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Used For</p>
                            <p className="font-medium">{log.usedFor}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Used By</p>
                            <p className="font-medium">{log.usedBy}</p>
                          </div>
                           {log.notes && (
                            <div className="col-span-2">
                              <p className="text-sm text-muted-foreground">Notes</p>
                              <p className="text-sm bg-muted/50 p-2 rounded">{log.notes}</p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-sm text-muted-foreground">Remaining After Use</p>
                            <p className="font-medium">{log.quantityRemaining} {log.unit}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      {selectedConsumable && (
        <>
          <ConsumableAnalytics
            open={showAnalyticsDialog}
            onOpenChange={setShowAnalyticsDialog}
            consumable={selectedConsumable}
            site={site}
            logs={getConsumableLogs(selectedConsumable.id)}
          />
        </>
      )}

      {/* Site-Wide Analytics Dialog */}
      <SiteConsumablesAnalytics
        open={showSiteAnalytics}
        onOpenChange={setShowSiteAnalytics}
        site={site}
        assets={assets}
        consumableLogs={consumableLogs}
      />
    </Collapsible>
  );
};
