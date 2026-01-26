import { logger } from "@/lib/logger";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, Waybill, WaybillItem, Site, Employee, Vehicle } from "@/types/asset";
import { FileText, Plus, Minus, X } from "lucide-react";
import WaybillBulkInput from './WaybillBulkInput';
import { logActivity } from "@/utils/activityLogger";
import { useAuth } from "@/contexts/AuthContext";

interface WaybillFormProps {
  assets: Asset[];
  sites: Site[];
  employees: Employee[];
  vehicles: Vehicle[];
  onCreateWaybill: (waybill: Omit<Waybill, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialData?: {
    siteId?: string;
    siteName?: string;
    driverId?: string;
    driver?: string;
    vehicleId?: string;
    vehicle?: string;
    purpose?: string;
    items?: Array<{ id: string; name: string; quantity?: number }>;
  };
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

export const WaybillForm = ({ assets, sites, employees, vehicles, onCreateWaybill, onCancel, initialData }: WaybillFormProps) => {
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<WaybillFormData>(() => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');

    // Use AI-suggested data if available
    const siteId = initialData?.siteId || (sites.length > 0 ? String(sites[0].id) : '');
    const driverName = initialData?.driver || (activeEmployees.length > 0 ? activeEmployees[0].name : '');
    const vehicleName = initialData?.vehicle || (vehicles.length > 0 ? vehicles[0].name : '');
    const purpose = initialData?.purpose || 'For Operational Purpose';

    // Convert AI items to waybill items
    const items: WaybillItem[] = initialData?.items?.map(aiItem => ({
      assetId: aiItem.id,
      assetName: aiItem.name,
      quantity: aiItem.quantity || 1,
      returnedQuantity: 0,
      status: 'outstanding' as const
    })) || [];

    return {
      siteId,
      driverName,
      vehicle: vehicleName,
      expectedReturnDate: '',
      purpose,
      service: 'dewatering',
      items
    };
  });

  const [bulkMode, setBulkMode] = useState(false);

  const availableAssets = assets.filter(asset => {
    if (asset.siteId) return false; // Only office assets
    const availableQty = asset.quantity - (asset.reservedQuantity || 0) - (asset.damagedCount || 0) - (asset.missingCount || 0);
    return availableQty > 0;
  }).map(asset => ({
    ...asset,
    availableQuantity: asset.quantity - (asset.reservedQuantity || 0) - (asset.damagedCount || 0) - (asset.missingCount || 0)
  }));

  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        assetId: '',
        assetName: '',
        quantity: 0,
        returnedQuantity: 0,
        status: 'outstanding'
      }]
    }));
  };

  // Prevent adding duplicate assets in items
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
            const asset = assets.find(a => String(a.id) === String(value));
            logger.info('Selected asset', { data: { asset, availableQuantity: asset?.availableQuantity } });
            return {
              ...item,
              assetId: value,
              assetName: asset?.name || '',
              quantity: 1 // Reset to 1 when changing asset
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

  const handleBulkImport = (importItems: WaybillItem[]) => {
    setFormData(prev => {
      // filter out duplicates by assetId when assetId is available
      const existingIds = new Set(prev.items.map(i => i.assetId));
      const filtered = importItems.filter(it => !(it.assetId && existingIds.has(it.assetId)));
      return {
        ...prev,
        items: [...prev.items, ...filtered]
      };
    });
    setBulkMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.siteId || !formData.driverName || !formData.service || formData.items.length === 0) {
      return;
    }

    const waybillData: Omit<Waybill, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formData,
      issueDate: new Date(),
      expectedReturnDate: formData.expectedReturnDate ? new Date(formData.expectedReturnDate) : undefined,
      status: 'outstanding',
      type: 'waybill'
    };

    // Log activity if authenticated
    if (isAuthenticated) {
      logActivity({
        action: 'create',
        entity: 'waybill',
        details: `Created waybill for site ${sites.find(s => s.id === formData.siteId)?.name || formData.siteId} with ${formData.items.length} items`
      });
    }

    onCreateWaybill(waybillData);
  };

  const getMaxQuantity = (assetId: string) => {
    const asset = assets.find(a => a.id.toString() === assetId);
    const availableQty = asset?.availableQuantity || 0;
    // logger.debug('getMaxQuantity debug', { data: { assetId, availableQty, asset } }); // Removed to reduce verbosity
    return availableQty;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
          <FileText className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Create Waybill
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Issue assets for delivery to project sites
        </p>
      </div>

      <Card className="border-0 shadow-medium max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Waybill Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purpose">Purpose *</Label>
                  <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Describe the purpose of this waybill"
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="siteId">Site *</Label>
                  <Select
                    value={String(formData.siteId)}
                    onValueChange={(value) => setFormData({ ...formData, siteId: value })}
                  >
                    <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((site) => (
                        <SelectItem key={site.id} value={String(site.id)}>
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
                    onValueChange={(value) => setFormData({ ...formData, service: value })}
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
                    onValueChange={(value) => setFormData({ ...formData, driverName: value })}
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
                    onValueChange={(value) => setFormData({ ...formData, vehicle: value })}
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
                    onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
                    className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Items to Issue</h3>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={bulkMode ? 'ghost' : 'outline'} onClick={() => setBulkMode(false)}>
                    Single Item
                  </Button>
                  <Button size="sm" variant={bulkMode ? 'outline' : 'ghost'} onClick={() => setBulkMode(true)}>
                    Bulk Input
                  </Button>
                  {!bulkMode && (
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
                  )}
                </div>
              </div>

              {bulkMode ? (
                <WaybillBulkInput assets={assets} onImport={handleBulkImport} />
              ) : formData.items.length === 0 ? (
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
                                    {item.assetName || "Select asset"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-background z-50">
                                  {availableAssets.filter(asset => !formData.items.some((item, idx) => idx !== index && item.assetId === asset.id)).map((asset) => (
                                    <SelectItem key={asset.id} value={asset.id}>
                                      {asset.name} (Available: {asset.availableQuantity} {asset.unitOfMeasurement})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Quantity</Label>
                              <Input
                                type="number"
                                min="1"
                                max={item.assetId ? getMaxQuantity(item.assetId) : 999999}
                                value={item.quantity}
                                onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                className="border-0 bg-background"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Available Stock</Label>
                              <div className="h-10 flex items-center px-3 bg-background rounded-md border">
                                <Badge variant="outline">
                                  {item.assetId ? `${getMaxQuantity(item.assetId)} units` : 'Select asset first'}
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
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
                disabled={formData.items.length === 0 || availableAssets.length === 0 || formData.items.some(item => !item.assetId || item.quantity <= 0)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Waybill
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};