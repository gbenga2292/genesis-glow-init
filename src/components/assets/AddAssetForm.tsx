import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Asset, Site } from "@/types/asset";
import { Package, Save, X, AlertCircle } from "lucide-react";

interface AddAssetFormProps {
  onAddAsset?: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  asset?: Asset;
  onSave?: (asset: Asset) => void;
  onCancel?: () => void;
  sites?: Site[];
  existingAssets?: Asset[];
  initialData?: {
    name?: string;
    quantity?: number;
    category?: string;
    type?: string;
    unit?: string;
  };
}

export const AddAssetForm = ({ onAddAsset, asset, onSave, onCancel, sites, existingAssets = [], initialData }: AddAssetFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || asset?.name || '',
    description: asset?.description || '',
    quantity: initialData?.quantity || asset?.quantity || 0,
    unitOfMeasurement: initialData?.unit || asset?.unitOfMeasurement || 'pcs',
    category: (initialData?.category as 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office') || asset?.category || 'dewatering' as 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office',
    type: (initialData?.type as 'consumable' | 'non-consumable' | 'tools' | 'equipment') || asset?.type || 'equipment' as 'consumable' | 'non-consumable' | 'tools' | 'equipment',
    location: asset?.location || '',
    lowStockLevel: asset?.lowStockLevel || 10,
    criticalStockLevel: asset?.criticalStockLevel || 5,
    cost: asset?.cost || 0,
    powerSource: asset?.powerSource as 'fuel' | 'electricity' | 'hybrid' | 'manual' | undefined,
    fuelCapacity: asset?.fuelCapacity || undefined,
    fuelConsumptionRate: asset?.fuelConsumptionRate || undefined,
    electricityConsumption: asset?.electricityConsumption || undefined,
    requiresLogging: asset?.requiresLogging || false
  });

  const [selectValue, setSelectValue] = useState(() => {
    if (asset?.location) {
      if (['store', 'warehouse', 'office cupboard'].includes(asset.location)) {
        return asset.location;
      } else {
        return 'custom';
      }
    }
    return '';
  });

  const [customLocation, setCustomLocation] = useState(asset?.location || '');
  const [nameError, setNameError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.unitOfMeasurement) {
      return;
    }

    // Check for duplicate asset name
    const trimmedName = formData.name.trim();
    const isDuplicate = existingAssets.some(
      existingAsset =>
        existingAsset.name.toLowerCase() === trimmedName.toLowerCase() &&
        existingAsset.id !== asset?.id // Allow same name when editing the same asset
    );

    if (isDuplicate) {
      setNameError(`An asset with the name "${trimmedName}" already exists. Please use a unique name.`);
      return;
    }

    setNameError(''); // Clear any previous error

    if (asset && onSave) {
      onSave({
        ...asset,
        ...formData,
        name: trimmedName,
        requiresLogging: formData.requiresLogging,
        updatedAt: new Date()
      });
    } else if (onAddAsset) {
      onAddAsset({
        ...formData,
        name: trimmedName,
        powerSource: formData.powerSource || undefined,
        fuelCapacity: formData.fuelCapacity || undefined,
        fuelConsumptionRate: formData.fuelConsumptionRate || undefined,
        electricityConsumption: formData.electricityConsumption || undefined,
        reservedQuantity: 0,
        availableQuantity: formData.quantity - 0, // quantity - reservedQuantity
        siteQuantities: {},
        service: '',
        status: 'active',
        condition: 'good',
        requiresLogging: formData.requiresLogging
      });
      setFormData({
        name: '',
        description: '',
        quantity: 0,
        unitOfMeasurement: 'pcs',
        category: 'dewatering',
        type: 'equipment',
        location: '',
        lowStockLevel: 10,
        criticalStockLevel: 5,
        cost: 0,
        powerSource: undefined,
        fuelCapacity: undefined,
        fuelConsumptionRate: undefined,
        electricityConsumption: undefined,
        requiresLogging: false
      });
      setSelectValue('');
      setCustomLocation('');
      setNameError('');
    }
  };

  const isEditing = !!asset;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
          <Package className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          {isEditing ? 'Edit Asset' : 'Add New Asset'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isEditing ? 'Update asset information' : 'Add a new item to your inventory'}
        </p>
      </div>

      <Card className="border-0 shadow-medium max-w-7xl mx-auto">
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setNameError(''); // Clear error when user types
                  }}
                  placeholder="Enter asset name"
                  className={`border-0 bg-muted/50 focus:bg-background transition-all duration-300 ${nameError ? 'border-destructive' : ''}`}
                  required
                />
                {nameError && (
                  <div className="flex items-start gap-2 text-destructive text-sm mt-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{nameError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitOfMeasurement">Unit of Measurement *</Label>
              <Combobox
                options={[
                  { value: 'pcs', label: 'pcs - Pieces' },
                  { value: 'set', label: 'set - Set' },
                  { value: 'pair', label: 'pair - Pair' },
                  { value: 'box', label: 'box - Box' },
                  { value: 'bag', label: 'bag - Bag' },
                  { value: 'roll', label: 'roll - Roll' },
                  { value: 'drum', label: 'drum - Drum' },
                  { value: 'can', label: 'can - Can' },
                  { value: 'bottle', label: 'bottle - Bottle' },
                  { value: 'pkt', label: 'pkt - Packet' },
                  { value: 'litre', label: 'litre - Litre' },
                  { value: 'gallon', label: 'gallon - Gallon' },
                  { value: 'kg', label: 'kg - Kilogram' },
                  { value: 'ton', label: 'ton - Ton' },
                  { value: 'meter', label: 'meter - Meter' },
                  { value: 'feet', label: 'feet - Feet' },
                  { value: 'sqm', label: 'sqm - Square Meter' },
                  { value: 'sqft', label: 'sqft - Square Feet' },
                  { value: 'unit', label: 'unit - Unit' }
                ]}
                value={formData.unitOfMeasurement}
                onValueChange={(value) => setFormData({ ...formData, unitOfMeasurement: value })}
                placeholder="Select or type unit of measurement"
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
              />
              <p className="text-xs text-muted-foreground mt-1">
                💡 You can select from the list or type a custom unit
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter asset description"
                className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Cost</Label>
                <Input
                  id="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office') =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dewatering">Dewatering</SelectItem>
                    <SelectItem value="waterproofing">Waterproofing</SelectItem>
                    <SelectItem value="tiling">Tiling</SelectItem>
                    <SelectItem value="ppe">PPE</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lowStockLevel">Low Stock Level</Label>
                <Input
                  id="lowStockLevel"
                  type="number"
                  min="0"
                  value={formData.lowStockLevel}
                  onChange={(e) => setFormData({ ...formData, lowStockLevel: parseInt(e.target.value) || 0 })}
                  className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="criticalStockLevel">Critical Stock Level</Label>
                <Input
                  id="criticalStockLevel"
                  type="number"
                  min="0"
                  value={formData.criticalStockLevel}
                  onChange={(e) => setFormData({ ...formData, criticalStockLevel: parseInt(e.target.value) || 0 })}
                  className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                />

              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'consumable' | 'non-consumable' | 'tools' | 'equipment') =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="tools">Tools</SelectItem>
                    <SelectItem value="consumable">Consumable</SelectItem>
                    <SelectItem value="non-consumable">Reuseables</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={selectValue}
                onValueChange={(value) => {
                  setSelectValue(value);
                  if (value === "custom") {
                    setFormData({ ...formData, location: customLocation });
                  } else {
                    setFormData({ ...formData, location: value });
                  }
                }}
              >
                <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                  <SelectValue placeholder="Select asset location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="office cupboard">Office Cupboard</SelectItem>
                  <SelectItem value="custom">Custom Location</SelectItem>
                </SelectContent>
              </Select>
              {selectValue === "custom" && (
                <Input
                  id="custom-location"
                  value={customLocation}
                  onChange={(e) => {
                    setCustomLocation(e.target.value);
                    setFormData({ ...formData, location: e.target.value });
                  }}
                  placeholder="Enter custom location"
                  className="border-0 bg-muted/50 focus:bg-background transition-all duration-300 mt-2"
                />
              )}
            </div>

            {/* Equipment-specific operational details */}
            {formData.type === 'equipment' && (
              <div className="space-y-6 p-6 bg-muted/30 rounded-lg border-2 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Equipment Operational Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="powerSource">Power Source</Label>
                    <Select
                      value={formData.powerSource || ''}
                      onValueChange={(value: 'fuel' | 'electricity' | 'hybrid' | 'manual') =>
                        setFormData({ ...formData, powerSource: value })
                      }
                    >
                      <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                        <SelectValue placeholder="Select power source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">Fuel (Diesel/Petrol)</SelectItem>
                        <SelectItem value="electricity">Electricity</SelectItem>
                        <SelectItem value="hybrid">Hybrid (Fuel + Electric)</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requiresLogging">Requires Daily Logging</Label>
                    <Select
                      value={formData.requiresLogging ? 'yes' : 'no'}
                      onValueChange={(value) => setFormData({ ...formData, requiresLogging: value === 'yes' })}
                    >
                      <SelectTrigger className="border-0 bg-muted/50 focus:bg-background transition-all duration-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes - Show in Machines section</SelectItem>
                        <SelectItem value="no">No - Hide from Machines section</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Only equipment that requires daily logging will appear in the Machines section at sites.
                    </p>
                  </div>

                  {(formData.powerSource === 'fuel' || formData.powerSource === 'hybrid') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="fuelCapacity">Fuel Tank Capacity (Liters)</Label>
                        <Input
                          id="fuelCapacity"
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.fuelCapacity || ''}
                          onChange={(e) => setFormData({ ...formData, fuelCapacity: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="e.g., 90"
                          className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fuelConsumptionRate">Fuel Consumption (Liters/24hrs)</Label>
                        <Input
                          id="fuelConsumptionRate"
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.fuelConsumptionRate || ''}
                          onChange={(e) => setFormData({ ...formData, fuelConsumptionRate: e.target.value ? parseFloat(e.target.value) : undefined })}
                          placeholder="e.g., 18"
                          className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                        />
                      </div>
                    </>
                  )}

                  {(formData.powerSource === 'electricity' || formData.powerSource === 'hybrid') && (
                    <div className="space-y-2">
                      <Label htmlFor="electricityConsumption">Power Consumption (kWh/day)</Label>
                      <Input
                        id="electricityConsumption"
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.electricityConsumption || ''}
                        onChange={(e) => setFormData({ ...formData, electricityConsumption: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="e.g., 75"
                        className="border-0 bg-muted/50 focus:bg-background transition-all duration-300"
                      />
                    </div>
                  )}
                </div>

                {formData.powerSource === 'fuel' && formData.fuelCapacity > 0 && formData.fuelConsumptionRate > 0 && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <p className="text-sm font-medium text-primary">
                      ⚡ Operating Duration: ~{(formData.fuelCapacity / formData.fuelConsumptionRate * 24).toFixed(1)} hours per full tank
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Refuel needed every {(formData.fuelCapacity / formData.fuelConsumptionRate).toFixed(1)} days (24/7 operation)
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1 hover:bg-muted transition-all duration-300"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1 bg-gradient-primary hover:scale-105 transition-all duration-300 shadow-medium"
              >
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Asset' : 'Add Asset'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};