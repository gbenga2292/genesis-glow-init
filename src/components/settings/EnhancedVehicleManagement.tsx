import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Vehicle } from '@/types/asset';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Search, Car, Edit, Trash2, BarChart3, Save, Upload } from 'lucide-react';
import { saveAs } from 'file-saver';
import { logActivity } from '@/utils/activityLogger';
import { BulkImportDialog } from './BulkImportDialog';
import { dataService } from '@/services/dataService';

export interface EnhancedVehicleManagementProps {
  vehicles: Vehicle[];
  onVehiclesChange: (vehicles: Vehicle[]) => void;
  hasPermission: (permission: string) => boolean;
  onAnalytics?: (vehicle: Vehicle) => void;
}

export const EnhancedVehicleManagement: React.FC<EnhancedVehicleManagementProps> = ({
  vehicles,
  onVehiclesChange,
  hasPermission,
  onAnalytics
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [useCardLayout, setUseCardLayout] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [editName, setEditName] = useState('');
  const [editPlate, setEditPlate] = useState('');
  const [delistDate, setDelistDate] = useState('');
  const [isDelistDialogOpen, setIsDelistDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) {
      return vehicles;
    }
    const query = searchQuery.toLowerCase();
    return vehicles.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.registration_number?.toLowerCase().includes(query)
    );
  }, [vehicles, searchQuery]);

  const activeVehicles = useMemo(() => filteredVehicles.filter(v => v.status === 'active'), [filteredVehicles]);
  const inactiveVehicles = useMemo(() => filteredVehicles.filter(v => v.status === 'inactive'), [filteredVehicles]);

  // Handlers
  const handleSelectVehicle = (vehicleId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(vehicleId);
    } else {
      newSelected.delete(vehicleId);
    }
    setSelectedIds(newSelected);
  };

  const handleAddVehicle = async () => {
    if (!newName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter vehicle name/plate',
        variant: 'destructive'
      });
      return;
    }

    try {
      const saved = await dataService.vehicles.createVehicle({
        name: newName.trim(),
        registration_number: newPlate.trim() || undefined,
        status: 'active',
      });

      const formatted: Vehicle = {
        ...saved,
        createdAt: new Date(saved.createdAt),
        updatedAt: new Date(saved.updatedAt),
      };

      onVehiclesChange([...vehicles, formatted]);
      toast({ title: 'Success', description: 'Vehicle added successfully' });
      setNewName('');
      setNewPlate('');
      setIsAddDialogOpen(false);
      logActivity({ action: 'create', entity: 'vehicle', details: `Added vehicle ${newName}` });
    } catch (err) {
      console.error('Failed to add vehicle', err);
      toast({ title: 'Error', description: 'Failed to save vehicle to database', variant: 'destructive' });
    }
  };

  const handleEditVehicle = (vehicleId: string) => {
    const veh = vehicles.find(v => v.id === vehicleId);
    if (veh) {
      setEditingId(vehicleId);
      setEditName(veh.name);
      setEditPlate(veh.registration_number || '');
    }
  };

  const handleSaveVehicle = async () => {
    if (!editName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter vehicle name/plate',
        variant: 'destructive'
      });
      return;
    }

    try {
      await dataService.vehicles.updateVehicle(editingId!, {
        name: editName,
        registration_number: editPlate || undefined,
      });

      const updated = vehicles.map(v =>
        v.id === editingId
          ? { ...v, name: editName, registration_number: editPlate || undefined, updatedAt: new Date() }
          : v
      );
      onVehiclesChange(updated);
      toast({ title: 'Success', description: 'Vehicle updated successfully' });
      setEditingId(null);
      setIsAddDialogOpen(false);
      logActivity({ action: 'update', entity: 'vehicle', details: `Updated vehicle ${editName}` });
    } catch (err) {
      console.error('Failed to update vehicle', err);
      toast({ title: 'Error', description: 'Failed to update vehicle in database', variant: 'destructive' });
    }
  };

  const handleDelistVehicle = async () => {
    if (!vehicleToDelete || !delistDate) return;

    try {
      await dataService.vehicles.updateVehicle(vehicleToDelete.id, {
        status: 'inactive',
        delistedDate: new Date(delistDate),
      });

      const updated = vehicles.map(v =>
        v.id === vehicleToDelete.id
          ? { ...v, status: 'inactive' as const, delistedDate: new Date(delistDate), updatedAt: new Date() }
          : v
      );
      onVehiclesChange(updated);
      toast({ title: 'Success', description: 'Vehicle delisted successfully' });
      setIsDelistDialogOpen(false);
      setVehicleToDelete(null);
      setDelistDate('');
      logActivity({ action: 'update', entity: 'vehicle', details: `Delisted vehicle ${vehicleToDelete.name}` });
    } catch (err) {
      console.error('Failed to delist vehicle', err);
      toast({ title: 'Error', description: 'Failed to update vehicle in database', variant: 'destructive' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPlate('');
  };

  const getVehicleIcon = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('truck')) return '🚚';
    if (lower.includes('van')) return '🚐';
    if (lower.includes('bus')) return '🚌';
    if (lower.includes('car')) return '🚗';
    return '🚙';
  };

  const VEHICLE_COLUMNS = [
    { key: 'name', label: 'Vehicle Name', required: true, aliases: ['name', 'vehicle', 'description'] },
    { key: 'registration_number', label: 'Registration Number', required: false, aliases: ['plate', 'reg', 'plate number', 'registration'] },
  ];

  const handleBulkImport = async (importedRows: Record<string, string>[]) => {
    const saved: Vehicle[] = [];
    let failed = 0;

    for (const row of importedRows) {
      try {
        const result = await dataService.vehicles.createVehicle({
          name: row.name,
          registration_number: row.registration_number || undefined,
          status: 'active',
        });
        saved.push({
          ...result,
          createdAt: new Date(result.createdAt),
          updatedAt: new Date(result.updatedAt),
        });
      } catch (err) {
        console.error('Failed to import vehicle row:', row, err);
        failed++;
      }
    }

    if (saved.length > 0) {
      onVehiclesChange([...vehicles, ...saved]);
    }

    toast({
      title: failed === 0 ? 'Import Successful' : 'Import Completed with Errors',
      description: `${saved.length} vehicle${saved.length !== 1 ? 's' : ''} imported${failed > 0 ? `, ${failed} failed` : ''}.`,
      variant: failed > 0 && saved.length === 0 ? 'destructive' : 'default',
    });

    if (saved.length > 0) {
      logActivity({
        action: 'create',
        entity: 'vehicle',
        details: `Bulk imported ${saved.length} vehicles via Excel`,
      });
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 mt-4">
      {/* Header */}
      <Card className="border-0 shadow-soft">
        <CardHeader className="pb-3 md:pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Car className="h-5 w-5" />
              Vehicle Management
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                size={isMobile ? "sm" : "default"}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {!isMobile && 'Import Excel'}
              </Button>
              {hasPermission('write_vehicles') && (
                <Button onClick={() => {
                  handleCancelEdit();
                  setIsAddDialogOpen(true);
                }} className="gap-2" size={isMobile ? "sm" : "default"}>
                  <Car className="h-4 w-4" />
                  Add Vehicle
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setUseCardLayout(!useCardLayout)}
                size={isMobile ? "sm" : "default"}
              >
                {useCardLayout ? '📋 Table' : '🎴 Cards'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Search */}
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles by name or registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {activeVehicles.length} active {activeVehicles.length !== 1 ? 'vehicles' : 'vehicle'}
            {inactiveVehicles.length > 0 && `, ${inactiveVehicles.length} delisted`}
          </div>
        </CardContent>
      </Card>

      {/* Active Vehicles - Card Layout */}
      {activeVehicles.length > 0 && useCardLayout && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Active Vehicles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeVehicles.map(veh => (
              <Card key={veh.id} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getVehicleIcon(veh.name)}</span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{veh.name}</h4>
                      {veh.registration_number && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {veh.registration_number}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {hasPermission('write_vehicles') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          handleEditVehicle(veh.id);
                          setIsAddDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                    {hasPermission('delete_vehicles') && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setVehicleToDelete(veh);
                          setIsDelistDialogOpen(true);
                        }}
                        className="flex-1"
                      >
                        🔒 Delist
                      </Button>
                    )}
                  </div>
                  {onAnalytics && hasPermission('read_vehicles') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAnalytics(veh)}
                      className="w-full"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Active Vehicles - Table Layout */}
      {activeVehicles.length > 0 && !useCardLayout && (
        <Card className="border-0 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={selectedIds.size === activeVehicles.length && activeVehicles.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(activeVehicles.map(v => v.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeVehicles.map(veh => (
                  <TableRow key={veh.id} className={selectedIds.has(veh.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(veh.id)}
                        onCheckedChange={(checked) => handleSelectVehicle(veh.id, Boolean(checked))}
                      />
                    </TableCell>
                    <TableCell className="text-2xl">{getVehicleIcon(veh.name)}</TableCell>
                    <TableCell className="font-medium">{veh.name}</TableCell>
                    <TableCell>
                      {veh.registration_number ? (
                        <Badge variant="outline">{veh.registration_number}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {hasPermission('write_vehicles') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              handleEditVehicle(veh.id);
                              setIsAddDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        )}
                        {onAnalytics && hasPermission('read_vehicles') && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAnalytics(veh)}
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        )}
                        {hasPermission('delete_vehicles') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setVehicleToDelete(veh);
                              setIsDelistDialogOpen(true);
                            }}
                          >
                            🔒
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Inactive Vehicles */}
      {inactiveVehicles.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 text-muted-foreground">Delisted Vehicles ({inactiveVehicles.length})</h3>
          <Card className="border-dashed opacity-75">
            <CardContent className="pt-6">
              <div className="space-y-2">
                {inactiveVehicles.map(veh => (
                  <div key={veh.id} className="flex justify-between items-center p-2 border rounded text-sm">
                    <span>{getVehicleIcon(veh.name)} {veh.name} {veh.registration_number && `(${veh.registration_number})`}</span>
                    <span className="text-muted-foreground">Delisted: {veh.delistedDate ? new Date(veh.delistedDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeVehicles.length === 0 && inactiveVehicles.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 mx-auto opacity-30 mb-4" />
            <p className="text-muted-foreground mb-4">No vehicles found</p>
            {hasPermission('write_vehicles') && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Car className="h-4 w-4 mr-2" />
                Add First Vehicle
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update vehicle details below.' : 'Enter details for the new vehicle.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vehicle Name *</Label>
              <Input
                id="name"
                value={editingId ? editName : newName}
                onChange={(e) => editingId ? setEditName(e.target.value) : setNewName(e.target.value)}
                placeholder="e.g. Truck #1, Van A, Delivery Van"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration">Registration Number</Label>
              <Input
                id="registration"
                value={editingId ? editPlate : newPlate}
                onChange={(e) => editingId ? setEditPlate(e.target.value) : setNewPlate(e.target.value)}
                placeholder="e.g. ABC-1234"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                handleCancelEdit();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingId ? handleSaveVehicle : handleAddVehicle}>
              {editingId ? 'Update' : 'Add'} Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delist Dialog */}
      <Dialog open={isDelistDialogOpen} onOpenChange={setIsDelistDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delist Vehicle</DialogTitle>
            <DialogDescription>
              Enter the delisting date for {vehicleToDelete?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delist-date">Delisting Date *</Label>
              <Input
                id="delist-date"
                type="date"
                value={delistDate}
                onChange={(e) => setDelistDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDelistDialogOpen(false);
                setVehicleToDelete(null);
                setDelistDate('');
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelistVehicle}>
              Delist Vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="Import Vehicles from Excel"
        description="Upload a spreadsheet with vehicle data. Download the template to see the expected format."
        columns={VEHICLE_COLUMNS}
        onImport={handleBulkImport}
        templateFileName="vehicles_template.xlsx"
      />
    </div>
  );
};

export default EnhancedVehicleManagement;
