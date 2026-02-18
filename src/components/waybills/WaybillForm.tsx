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
import { useToast } from "@/hooks/use-toast";
import { PendingRequestSelector } from "@/components/requests/PendingRequestSelector";
import { SiteRequest } from "@/types/request";

interface WaybillFormProps {
  assets: Asset[];
  sites: Site[];
  employees: Employee[];
  vehicles: Vehicle[];
  onCreateWaybill: (waybill: Omit<Waybill, 'id' | 'createdAt' | 'updatedAt'>, sourceRequestId?: string) => void;
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

export const WaybillForm = ({ assets, sites, employees, vehicles, onCreateWaybill, onCancel }: WaybillFormProps) => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<WaybillFormData>(() => {
    const activeEmployees = employees.filter(emp => emp.status === 'active');
    const activeVehicles = vehicles.filter(v => v.status === 'active');

    const siteId = sites.length > 0 ? String(sites[0].id) : '';
    const driverName = activeEmployees.length > 0 ? activeEmployees[0].name : '';
    const vehicleName = activeVehicles.length > 0 ? activeVehicles[0].name : '';
    const purpose = 'Operational Activities';

    const items: WaybillItem[] = [];

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
  const [sourceRequestId, setSourceRequestId] = useState<string | undefined>(undefined);

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

    if (!formData.siteId || !formData.driverName || !formData.vehicle || !formData.service || formData.items.length === 0) {
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

    onCreateWaybill(waybillData, sourceRequestId);
  };

  const getMaxQuantity = (assetId: string) => {
    const asset = assets.find(a => a.id.toString() === assetId);
    const availableQty = asset?.availableQuantity || 0;
    // logger.debug('getMaxQuantity debug', { data: { assetId, availableQty, asset } }); // Removed to reduce verbosity
    return availableQty;
  };

  const handleRequestSelected = (request: SiteRequest) => {
    setSourceRequestId(request.id);
    // 1. Set Site if empty
    if (!formData.siteId && request.siteId) {
      setFormData(prev => ({ ...prev, siteId: request.siteId || '' }));
    } else if (formData.siteId && request.siteId && formData.siteId !== request.siteId) {
      // eslint-disable-next-line no-restricted-globals
      if (!confirm(`This request is for a different site (${request.siteName}). Switch site to ${request.siteName}?`)) {
        return;
      }
      setFormData(prev => ({ ...prev, siteId: request.siteId || '' }));
    }

    // 2. Map items
    const mappedItems: WaybillItem[] = [];
    const unmappedItems: string[] = [];

    request.items.forEach(reqItem => {
      // Try to match by ID first, then Name
      let asset = assets.find(a => reqItem.assetId && a.id === reqItem.assetId);

      if (!asset) {
        asset = assets.find(a => a.name.toLowerCase() === reqItem.name.toLowerCase());
      }

      if (asset) {
        mappedItems.push({
          assetId: asset.id,
          assetName: asset.name,
          quantity: reqItem.quantity,
          returnedQuantity: 0,
          status: 'outstanding'
        });
      } else {
        unmappedItems.push(reqItem.name);
      }
    });

    if (unmappedItems.length > 0) {
      toast({
        title: "Some items need manual addition",
        description: `Could not auto-match: ${unmappedItems.join(', ')}. Please add them manually.`,
        variant: "default",
      });
    }

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...mappedItems],
      purpose: prev.purpose || `Fulfilling request from ${request.requesterName}`
    }));
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
                    placeholder="Operational Activities"
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
                          {site.name}{site.clientName ? ` (${site.clientName})` : ''}
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

                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle">Vehicle *</Label>
                  <Select
                    value={formData.vehicle}
                    onValueChange={(value) => setFormData({ ...formData, vehicle: value })}
                    required
                  >
                    <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                      <SelectValue placeholder="Select a vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.filter(v => v.status === 'active').map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.name}>
                          {vehicle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {vehicles.filter(v => v.status === 'active').length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No active vehicles available. Please add vehicles in Company Settings.
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <h3 className="text-lg font-semibold">Items to Issue</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <PendingRequestSelector onSelectRequest={handleRequestSelected} />
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={!bulkMode ? 'default' : 'ghost'}
                      onClick={() => setBulkMode(false)}
                      className="h-8 text-xs"
                    >
                      Single Item
                    </Button>
                    <Button
                      size="sm"
                      variant={bulkMode ? 'default' : 'ghost'}
                      onClick={() => setBulkMode(true)}
                      className="h-8 text-xs"
                    >
                      Bulk Input
                    </Button>
                  </div>
                  {!bulkMode && (
                    <Button
                      type="button"
                      onClick={handleAddItem}
                      size="sm"
                      className="gap-1.5 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Add Item</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  )}
                </div>
              </div>

              {bulkMode ? (
                <WaybillBulkInput assets={assets} onImport={handleBulkImport} />
              ) : formData.items.length === 0 ? (
                <Card className="border-dashed border-2">
                  <CardContent className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">No items added yet</p>
                      <p className="text-xs text-muted-foreground">Click "Add Item" to start or use "Add from Request"</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <Card key={index} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1 space-y-3">
                            {/* Asset Selection */}
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">Asset</Label>
                              <Select
                                value={item.assetId || ""}
                                onValueChange={(value) => handleItemChange(index, 'assetId', value)}
                              >
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Select asset">
                                    {item.assetName || "Select asset"}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="z-50">
                                  {availableAssets.filter(asset => !formData.items.some((item, idx) => idx !== index && item.assetId === asset.id)).map((asset) => (
                                    <SelectItem key={asset.id} value={asset.id} className="text-sm">
                                      <div className="flex flex-col">
                                        <span>{asset.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          Available: {asset.availableQuantity} {asset.unitOfMeasurement}
                                        </span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Quantity and Stock - Side by side on mobile too */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Quantity</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.assetId ? getMaxQuantity(item.assetId) : 999999}
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                  className="h-9 text-sm"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Available</Label>
                                <div className="h-9 flex items-center justify-center bg-muted rounded-md">
                                  <Badge variant="secondary" className="text-xs font-mono">
                                    {item.assetId ? `${getMaxQuantity(item.assetId)}` : '-'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <div className="flex sm:flex-col items-center justify-end sm:justify-start">
                            <Button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
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