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
  initialWaybill,
  isEditMode = false,
  onCreateReturnWaybill,
  onUpdateReturnWaybill,
  onCancel
}: ReturnWaybillFormProps) => {
  if (!site) return null;

  const [selectedItems, setSelectedItems] = useState<{ assetId: string; quantity: number }[]>([]);
  const [driverName, setDriverName] = useState(() => employees.length > 0 ? employees[0].name : "");
  const [vehicle, setVehicle] = useState(() => vehicles.length > 0 ? vehicles[0].name : "");
  const [purpose, setPurpose] = useState("Material Return");
  const [service, setService] = useState("dewatering");

  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [returnToSiteId, setReturnToSiteId] = useState<string | "office">("office");
  const { toast } = useToast();
  const { currentUser } = useAuth();

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

  const handleSubmit = (e: React.FormEvent) => {
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
      if (!material || item.quantity > material.quantity) {
        toast({
          title: "Invalid Quantity",
          description: `Quantity for ${material?.itemName || 'unknown asset'} exceeds available stock.`,
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

    const waybillData = {
      ...(isEditMode && initialWaybill ? { id: initialWaybill.id } : {}),
      siteId: site.id,
      returnToSiteId: returnToSiteId === "office" ? undefined : returnToSiteId,
      items: waybillItems,
      driverName,
      vehicle,
      purpose,
      service,
      expectedReturnDate: expectedReturnDate ? new Date(expectedReturnDate) : undefined
    };

    if (isEditMode && onUpdateReturnWaybill) {
      onUpdateReturnWaybill(waybillData);
    } else {
      onCreateReturnWaybill(waybillData);
    }
  };

  const formContent = (
    <>
      {!isEditMode && (
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Prepare Return Waybill - {site.name}
          </DialogTitle>
          <p className="text-muted-foreground">{site.location}</p>
        </DialogHeader>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  {vehicles && vehicles.length > 0 ? (
                    vehicles.map((vehicleOption) => (
                      <SelectItem key={vehicleOption.id} value={vehicleOption.name}>
                        {vehicleOption.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-vehicles" disabled>No vehicles available</SelectItem>
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
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {materialsAtSite.map((material) => {
                const isSelected = selectedItems.some(item => item.assetId === material.assetId);
                const selectedQuantity = selectedItems.find(item => item.assetId === material.assetId)?.quantity || 0;

                return (
                  <div key={material.assetId} className={`flex items-center space-x-4 p-4 border rounded-lg ${isSelected ? 'bg-primary/10' : 'bg-muted/30'}`}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleAssetToggle(material.assetId, checked as boolean)}
                    />

                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{material.itemName}</h4>
                          <p className="text-sm text-muted-foreground">
                            Available: {material.quantity} {material.unit}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-24">
                            <Input
                              type="number"
                              min="1"
                              max={material.quantity}
                              value={selectedQuantity}
                              onChange={(e) => handleQuantityChange(material.assetId, parseInt(e.target.value) || 0)}
                              className="text-center"
                            />
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
