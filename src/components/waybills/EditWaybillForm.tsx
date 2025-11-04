import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, Waybill, WaybillItem, Site, Employee, Vehicle } from "@/types/asset";
import { FileText, Plus, Minus, X, Edit2 } from "lucide-react";

interface EditWaybillFormProps {
  waybill: Waybill;
  assets: Asset[];
  sites: Site[];
  employees: Employee[];
  vehicles: Vehicle[];
  onUpdate: (updatedWaybill: Partial<Waybill>) => void;
  onCancel: () => void;
}

interface WaybillFormData {
  siteId: string;
  driverName: string;
  vehicle: string;
  expectedReturnDate: string;
  purpose: string;
  service: string;
  items: WaybillItem[];
}

export const EditWaybillForm = ({ 
  waybill, 
  assets, 
  sites, 
  employees, 
  vehicles, 
  onUpdate, 
  onCancel 
}: EditWaybillFormProps) => {
  const [formData, setFormData] = useState<WaybillFormData>({
    siteId: '',
    driverName: '',
    vehicle: '',
    expectedReturnDate: '',
    purpose: '',
    service: '',
    items: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Initialize form with existing waybill data
    setFormData({
      siteId: waybill.siteId,
      driverName: waybill.driverName,
      vehicle: waybill.vehicle || '',
      expectedReturnDate: waybill.expectedReturnDate ? waybill.expectedReturnDate.toISOString().split('T')[0] : '',
      purpose: waybill.purpose,
      service: waybill.service || '',
      items: waybill.items.map(item => ({
        ...item,
        // For edit, keep existing but allow quantity changes
      }))
    });
  }, [waybill]);

  const availableAssets = assets.filter(asset => asset.quantity > 0);

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        assetId: '',
        assetName: '',
        quantity: 1,
        returnedQuantity: 0,
        status: 'outstanding'
      }]
    }));
  };

  const isAssetAlreadyAdded = (assetId: string) => {
    return formData.items.some(item => item.assetId === assetId);
  };

  const handleItemChange = (index: number, field: keyof WaybillItem, value: any) => {
    if (field === 'assetId' && value && isAssetAlreadyAdded(value)) {
      alert('This asset has already been added.');
      return;
    }
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          if (field === 'assetId') {
            const asset = assets.find(a => a.id === value);
            const maxQty = getMaxQuantity(value);
            return {
              ...item,
              assetId: value,
              assetName: asset?.name || '',
              quantity: Math.min(item.quantity || 1, maxQty)
            };
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.siteId || !formData.driverName || !formData.service || formData.items.length === 0) {
      alert('Please fill in all required fields.');
      setIsSubmitting(false);
      return;
    }

    // Validate quantities don't exceed available (only for outstanding waybills)
    if (waybill.status === 'outstanding') {
      for (const item of formData.items) {
        const asset = assets.find(a => a.id === item.assetId);
        if (!asset) continue;
        
        // Calculate available including what was originally reserved in this waybill
        const originalItemQuantity = waybill.items.find(i => i.assetId === item.assetId)?.quantity || 0;
        const maxAllowed = asset.availableQuantity + originalItemQuantity;
        
        if (item.quantity > maxAllowed) {
          alert(`Quantity for ${item.assetName} exceeds available stock (${maxAllowed} available).`);
          setIsSubmitting(false);
          return;
        }
      }
    }

    const updatedWaybill: Partial<Waybill> = {
      id: waybill.id,
      ...formData,
      issueDate: waybill.issueDate,
      expectedReturnDate: formData.expectedReturnDate ? new Date(formData.expectedReturnDate) : waybill.expectedReturnDate,
      status: waybill.status,
      type: waybill.type,
      items: formData.items,
      updatedAt: new Date()
    };

    onUpdate(updatedWaybill);
    setIsSubmitting(false);
  };

  const getMaxQuantity = (assetId: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 0;
    
    // For outstanding waybills, add back the quantity currently reserved by THIS waybill
    if (waybill.status === 'outstanding') {
      const currentItemQuantity = waybill.items.find(item => item.assetId === assetId)?.quantity || 0;
      // Available + what's currently reserved in this waybill
      return asset.availableQuantity + currentItemQuantity;
    }
    
    // For sent waybills, use available quantity only
    return asset.availableQuantity;
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    placeholder="Describe the purpose of this waybill"
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteId">Site *</Label>
                  <Select
                    value={formData.siteId}
                    onValueChange={(value) => setFormData({...formData, siteId: value})}
                  >
                    <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={site.id}>
                          {site.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sites.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No sites available. Please add sites in the Sites section.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service">Service *</Label>
                  <Select
                    value={formData.service}
                    onValueChange={(value) => setFormData({...formData, service: value})}
                  >
                    <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dewatering">Dewatering</SelectItem>
                      <SelectItem value="waterproofing">Waterproofing</SelectItem>
                      <SelectItem value="tiling">Tiling</SelectItem>
                      <SelectItem value="repairs and maintenance">Repairs and Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="driverName">Driver Name *</Label>
                  <Select
                    value={formData.driverName}
                    onValueChange={(value) => setFormData({...formData, driverName: value})}
                  >
                    <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                      <SelectValue placeholder="Select a driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.filter(emp => emp.status === 'active').map((employee) => (
                        <SelectItem key={employee.id} value={employee.name}>
                          {employee.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {employees.filter(emp => emp.role === 'driver').length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No drivers available. Please add drivers in Company Settings.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Select
                    value={formData.vehicle}
                    onValueChange={(value) => setFormData({...formData, vehicle: value})}
                  >
                    <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.name}>
                          {vehicle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {vehicles.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No vehicles available. Please add vehicles in Company Settings.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                  <Input
                    id="expectedReturnDate"
                    type="date"
                    value={formData.expectedReturnDate}
                    onChange={(e) => setFormData({...formData, expectedReturnDate: e.target.value})}
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Items to Issue</h3>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </div>

              {formData.items.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No items added yet. Click "Add Item" to start.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="border-0 bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Asset</Label>
                              <Select
                                value={item.assetId || ""}
                                onValueChange={(value) => handleItemChange(index, 'assetId', value)}
                              >
                                <SelectTrigger className="border-0 bg-background">
                                  <SelectValue placeholder="Select asset">
                                    {item.assetId && item.assetName ? item.assetName : "Select asset"}
                                  </SelectValue>
                                </SelectTrigger>
                                 <SelectContent className="bg-background z-50">
                                   {availableAssets.filter(asset => !formData.items.some((formItem, idx) => idx !== index && formItem.assetId === asset.id)).map((asset) => {
                                     const currentItemQty = waybill.items.find(i => i.assetId === asset.id)?.quantity || 0;
                                     const displayAvailable = waybill.status === 'outstanding' 
                                       ? asset.availableQuantity + currentItemQty 
                                       : asset.availableQuantity;
                                     
                                     return (
                                       <SelectItem key={asset.id} value={asset.id}>
                                         {asset.name} (Available: {displayAvailable} {asset.unitOfMeasurement})
                                       </SelectItem>
                                     );
                                   })}
                                 </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                max={getMaxQuantity(item.assetId)}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="border-0 bg-background"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Available Stock</Label>
                              <div className="h-10 flex items-center px-3 bg-background rounded-md border">
                                <Badge variant="outline">
                                  {getMaxQuantity(item.assetId)} units
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            variant="outline"
                            size="sm"
                            className="mt-6"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel} 
                className="flex-1 hover:bg-muted transition-all duration-300"
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
                disabled={isSubmitting || formData.items.length === 0}
              >
                <FileText className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Updating...' : 'Update Waybill'}
              </Button>
            </div>
          </form>
    </div>
  );
};
