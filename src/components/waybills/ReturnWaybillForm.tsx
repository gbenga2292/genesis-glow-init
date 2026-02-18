import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Site, Asset, Employee, Waybill, WaybillItem, Vehicle } from "@/types/asset";
import { SiteInventoryItem } from "@/types/inventory";
import { MapPin, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ReturnWaybillFormProps {
  site: Site;
  sites: Site[];
  assets: Asset[];
  employees: Employee[];
  vehicles: Vehicle[];
  siteInventory: SiteInventoryItem[];
  waybills: Waybill[]; // List of all waybills to check for duplicates
  initialWaybill?: Waybill;
  isEditMode?: boolean;
  onCreateReturnWaybill: (waybillData: {
    siteId: string;
    returnToSiteId?: string;
    items: WaybillItem[];
    driverName: string;
    vehicle: string;
    purpose: string;
    service: string;
    expectedReturnDate?: Date;
    signatureUrl?: string | null;
    signatureName?: string;
    signatureRole?: string;
  }) => void;
  onUpdateReturnWaybill?: (waybillData: {
    id?: string;
    siteId: string;
    returnToSiteId?: string;
    items: WaybillItem[];
    driverName: string;
    vehicle: string;
    purpose: string;
    service: string;
    expectedReturnDate?: Date;
  }) => void;
  onCancel: () => void;
}

export const ReturnWaybillForm = ({
  site,
  sites,
  assets,
  employees,
  vehicles,
  siteInventory,
  waybills = [], // Default to empty array if not provided
  initialWaybill,
  isEditMode = false,
  onCreateReturnWaybill,
  onUpdateReturnWaybill,
  onCancel
}: ReturnWaybillFormProps) => {
  if (!site) return null;

  const [selectedItems, setSelectedItems] = useState<{ assetId: string; quantity: number }[]>([]);
  const [driverName, setDriverName] = useState(() => {
    const activeEmployees = employees.filter(e => e.status === 'active');
    return activeEmployees.length > 0 ? activeEmployees[0].name : "";
  });
  const [vehicle, setVehicle] = useState(() => {
    const activeVehicles = vehicles.filter(v => v.status === 'active');
    return activeVehicles.length > 0 ? activeVehicles[0].name : "";
  });
  const [purpose, setPurpose] = useState("Material Return");
  const [service, setService] = useState("dewatering");
  const [addSignature, setAddSignature] = useState(false);

  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [returnToSiteId, setReturnToSiteId] = useState<string | "office">("office");
  const { toast } = useToast();
  const { currentUser, refreshCurrentUser } = useAuth();
  const [hasSignature, setHasSignature] = useState(false);

  // Refresh user data when component mounts to get latest signature
  useEffect(() => {
    refreshCurrentUser();
  }, []);

  // Check for signature from multiple sources
  useEffect(() => {
    const checkSignature = async () => {
      // Check AuthContext first
      if (currentUser?.signatureUrl) {
        setHasSignature(true);
        return;
      }

      // Check localStorage
      const localSignature = localStorage.getItem(`signature_${currentUser?.id}`);
      if (localSignature) {
        setHasSignature(true);
        return;
      }

      // Check database
      if (currentUser?.id) {
        try {
          const { dataService } = await import('@/services/dataService');
          const result = await (dataService.auth as any).getSignature?.(currentUser.id);
          if (result?.success && result.url) {
            setHasSignature(true);
            return;
          }
        } catch (e) {
          console.warn('Failed to check signature from database', e);
        }
      }

      setHasSignature(false);
    };

    checkSignature();
  }, [currentUser?.id, currentUser?.signatureUrl]);

  // Pre-fill form if editing
  useEffect(() => {
    if (initialWaybill && isEditMode) {
      setDriverName(initialWaybill.driverName || "");
      setVehicle(initialWaybill.vehicle || "");
      setPurpose(initialWaybill.purpose || "Material Return");
      setService(initialWaybill.service || "dewatering");
      setExpectedReturnDate(initialWaybill.expectedReturnDate ? initialWaybill.expectedReturnDate.toISOString().split('T')[0] : "");
      setReturnToSiteId(initialWaybill.returnToSiteId || "office");

      // Pre-select items
      const initialSelected = initialWaybill.items.map(item => ({
        assetId: item.assetId,
        quantity: item.quantity
      }));
      setSelectedItems(initialSelected);
    }
  }, [initialWaybill, isEditMode]);

  // Use siteInventory instead of filtering assets
  const materialsAtSite = siteInventory;

  const handleAssetToggle = (assetId: string, checked: boolean) => {
    if (checked) {
      const item = materialsAtSite.find(m => m.assetId === assetId);
      if (item) {
        setSelectedItems(prev => [...prev, { assetId, quantity: 1 }]);
      }
    } else {
      setSelectedItems(prev => prev.filter(item => item.assetId !== assetId));
    }
  };

  // Sites options for return to dropdown (exclude current site)
  const returnToSites = sites.filter(s => s.id !== site.id);

  const handleQuantityChange = (assetId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item =>
      item.assetId === assetId ? { ...item, quantity: Math.max(0, quantity) } : item
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast({
        title: "No Materials Selected",
        description: "Please select at least one material to return.",
        variant: "destructive",
      });
      return;
    }

    if (!driverName || !vehicle) {
      toast({
        title: "Missing Required Fields",
        description: "Please select a driver and vehicle.",
        variant: "destructive",
      });
      return;
    }

    // Validate quantities
    for (const item of selectedItems) {
      const material = materialsAtSite.find(m => m.assetId === item.assetId);

      // Calculate quantity already in pending return waybills for this site
      const quantityInPendingReturns = waybills
        .filter(wb =>
          wb.siteId === site.id &&
          wb.type === 'return' &&
          wb.status === 'outstanding' &&
          wb.id !== initialWaybill?.id // Exclude current waybill if editing
        )
        .flatMap(wb => wb.items)
        .filter(i => i.assetId === item.assetId)
        .reduce((sum, i) => sum + i.quantity, 0);

      const availableQuantity = Math.max(0, (material?.quantity || 0) - quantityInPendingReturns);

      if (!material || item.quantity > availableQuantity) {
        toast({
          title: "Invalid Quantity",
          description: `Cannot return ${item.quantity} of ${material?.itemName || 'unknown asset'}. Only ${availableQuantity} available (${quantityInPendingReturns} in pending returns).`,
          variant: "destructive",
        });
        return;
      }
    }

    const waybillItems: WaybillItem[] = selectedItems.map(item => {
      const material = materialsAtSite.find(m => m.assetId === item.assetId)!;
      return {
        assetId: item.assetId,
        assetName: material.itemName,
        quantity: item.quantity,
        returnedQuantity: isEditMode ? (initialWaybill?.items.find(i => i.assetId === item.assetId)?.returnedQuantity || 0) : 0,
        status: 'outstanding'
      };
    });

    // Capture signature data at creation time (frozen signature)
    let signatureData = {};
    if (addSignature && currentUser) {
      // Get the current user's signature if it exists
      let userSignature = currentUser.signatureUrl || null;

      // Fallback 1: Check localStorage
      if (!userSignature && currentUser.id) {
        userSignature = localStorage.getItem(`signature_${currentUser.id}`);
      }

      // Fallback 2: Check database directly (async)
      if (!userSignature && currentUser.id) {
        try {
          const { dataService } = await import('@/services/dataService');
          // Start the fetch but don't block immediately if possible, but here we need it for the PDF
          const result = await (dataService.auth as any).getSignature?.(currentUser.id);
          if (result?.success && result.url) {
            userSignature = result.url;
          }
        } catch (e) {
          console.warn('Failed to fetch signature fallback during creation', e);
        }
      }

      signatureData = {
        signatureUrl: userSignature,
        signatureName: currentUser.name,
        signatureRole: currentUser.role
      };
    }

    const waybillData = {
      ...(isEditMode && initialWaybill ? { id: initialWaybill.id } : {}),
      siteId: site.id,
      returnToSiteId: returnToSiteId === "office" ? undefined : returnToSiteId,
      items: waybillItems,
      driverName,
      vehicle,
      purpose,
      service,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined,
      ...signatureData // Include signature data if checkbox was checked
    };

    if (isEditMode && onUpdateReturnWaybill) {
      onUpdateReturnWaybill(waybillData);
    } else {
      onCreateReturnWaybill(waybillData);
    }
  };

  const formContent = (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 px-1">
        {/* Driver and Vehicle */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="driver">Driver *</Label>
            <Select value={driverName} onValueChange={setDriverName}>
              <SelectTrigger>
                <SelectValue placeholder="Select driver" />
              </SelectTrigger>
              <SelectContent>
                {employees.filter(emp => emp.status === 'active').map((employee) => (
                  <SelectItem key={employee.id} value={employee.name}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle *</Label>
            <Select value={vehicle} onValueChange={setVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles && vehicles.filter(v => v.status === 'active').length > 0 ? (
                  vehicles.filter(v => v.status === 'active').map((vehicleOption) => (
                    <SelectItem key={vehicleOption.id} value={vehicleOption.name}>
                      {vehicleOption.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-vehicles" disabled>No active vehicles available</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Purpose, Service, and Return Date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Purpose of return"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service">Service</Label>
            <Select value={service} onValueChange={setService}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dewatering">Dewatering</SelectItem>
                <SelectItem value="waterproofing">Waterproofing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Expected Return Date</Label>
            <Input
              id="returnDate"
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
            />
          </div>
        </div>

        {/* Materials Selection */}
        <div className="space-y-4">
          <Label className="text-lg font-medium">Select Materials to Return</Label>

          {materialsAtSite.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No materials available at this site</p>
            </div>
          ) : (
            <div className="space-y-3">

              {materialsAtSite.map((material) => {
                const isSelected = selectedItems.some(item => item.assetId === material.assetId);
                const selectedQuantity = selectedItems.find(item => item.assetId === material.assetId)?.quantity || 0;

                // Calculate quantity already in pending return waybills for this site
                const quantityInPendingReturns = waybills
                  .filter(wb =>
                    wb.siteId === site.id &&
                    wb.type === 'return' &&
                    wb.status === 'outstanding' &&
                    wb.id !== initialWaybill?.id // Exclude current waybill if editing
                  )
                  .flatMap(wb => wb.items)
                  .filter(item => item.assetId === material.assetId)
                  .reduce((sum, item) => sum + item.quantity, 0);

                const availableQuantity = Math.max(0, material.quantity - quantityInPendingReturns);
                const isFullyPending = availableQuantity === 0 && material.quantity > 0;

                return (
                  <div key={material.assetId} className={`flex items-center space-x-4 p-4 border rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted/30'} ${isFullyPending ? 'opacity-75' : ''}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleAssetToggle(material.assetId, checked as boolean)}
                      disabled={isFullyPending}
                    />

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{material.itemName}</h4>
                          <p className="text-sm text-muted-foreground">
                            At Site: {material.quantity} {material.unit}
                            {quantityInPendingReturns > 0 && (
                              <span className="text-amber-500 ml-2 font-medium">
                                ({quantityInPendingReturns} pending return)
                              </span>
                            )}
                          </p>
                          {isFullyPending && (
                            <p className="text-xs text-destructive mt-1">
                              All items are already in a pending return waybill.
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-24">
                            <Input
                              type="number"
                              min="1"
                              max={availableQuantity}
                              value={selectedQuantity}
                              onChange={(e) => handleQuantityChange(material.assetId, Math.min(parseInt(e.target.value) || 0, availableQuantity))}
                              className="text-center"
                            />
                            <p className="text-xs text-center text-muted-foreground mt-1">Max: {availableQuantity}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Return To Site Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="returnToSite">Return To</Label>
            <Select value={returnToSiteId} onValueChange={setReturnToSiteId}>
              <SelectTrigger>
                <SelectValue placeholder="Select return location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office</SelectItem>
                {returnToSites.map(siteOption => (
                  <SelectItem key={siteOption.id} value={siteOption.id}>
                    {siteOption.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Signature Checkbox */}
          {currentUser?.role !== 'staff' && (
            <div className="flex flex-col gap-1 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addSignature"
                  checked={addSignature}
                  onCheckedChange={(checked) => setAddSignature(checked as boolean)}
                />
                <Label
                  htmlFor="addSignature"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Add my signature to return waybill PDF
                </Label>
              </div>
              {addSignature && !hasSignature && (
                <p className="text-xs text-destructive ml-6">
                  Warning: No signature found in your profile. Please add one in settings.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Summary */}
        {selectedItems.length > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium mb-2">Return Summary</h4>
            <div className="space-y-2">
              {selectedItems.map((item) => {
                const material = materialsAtSite.find(m => m.assetId === item.assetId);
                return (
                  <div key={item.assetId} className="flex justify-between items-center text-sm">
                    <span>{material?.itemName}</span>
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-center font-medium">{item.quantity}</span>
                      <span>{material?.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total Items:</span>
                <span>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-full bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
            disabled={selectedItems.length === 0 || currentUser?.role === 'staff'}
          >
            <Package className="h-4 w-4 mr-2" />
            {isEditMode ? "Update Return" : "Create Return"}
          </Button>
        </div>
      </form>
    </>
  );

  return formContent;
};
