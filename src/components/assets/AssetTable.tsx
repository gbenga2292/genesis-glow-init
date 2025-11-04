import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Asset } from "@/types/asset";
import {
  Search,
  Filter,
  Edit,
  Trash2,
  MoreHorizontal,
  Package,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  FileText,
  BarChart,
  History
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { RestockDialog } from "./RestockDialog";
import { RestockHistoryDialog } from "./RestockHistoryDialog";

interface AssetTableProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onUpdateAsset: (asset: Asset) => void;
  onViewAnalytics?: (asset: Asset) => void;
}

type SortField = 'name' | 'quantity' | 'location' | 'stockStatus';

type SortDirection = 'asc' | 'desc';

export const AssetTable = ({ assets, onEdit, onDelete, onUpdateAsset, onViewAnalytics }: AssetTableProps) => {
  const isMobile = useIsMobile();
  const { isAuthenticated, hasPermission } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<'all' | 'dewatering' | 'waterproofing'>('all');
  const [filterType, setFilterType] = useState<'all' | 'consumable' | 'non-consumable' | 'tools' | 'equipment'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'damaged' | 'missing' | 'maintenance' | 'out-of-stock' | 'low-stock' | 'in-stock'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
  const [showRestockHistoryDialog, setShowRestockHistoryDialog] = useState(false);

  const getStockStatus = (quantity: number): number => {
    if (quantity === 0) return 0; // Out of Stock
    if (quantity < 10) return 1; // Low Stock
    return 2; // In Stock
  };

  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets.filter(asset => {
      // Only show office assets (no siteId)
      if (asset.siteId) return false;

      const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.service?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
      const matchesType = filterType === 'all' || asset.type === filterType;

      let matchesStatus = filterStatus === 'all';
      if (!matchesStatus) {
        if (['active', 'damaged', 'missing', 'maintenance'].includes(filterStatus)) {
          matchesStatus = (asset.status || 'active') === filterStatus;
        } else if (filterStatus === 'out-of-stock') {
          matchesStatus = asset.quantity === 0;
        } else if (filterStatus === 'low-stock') {
          matchesStatus = asset.quantity > 0 && asset.quantity < 10;
        } else if (filterStatus === 'in-stock') {
          matchesStatus = asset.quantity >= 10;
        }
      }

      return matchesSearch && matchesCategory && matchesType && matchesStatus;
    });

    // Sort the filtered assets
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'stockStatus') {
        aValue = getStockStatus(a.quantity);
        bValue = getStockStatus(b.quantity);
      }

      // Handle undefined/null values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Removed special handling for 'updatedAt' since it's not in SortField
      // if (sortField === 'updatedAt') {
      //   aValue = a.updatedAt instanceof Date ? a.updatedAt.getTime() : new Date(a.updatedAt).getTime();
      //   bValue = b.updatedAt instanceof Date ? b.updatedAt.getTime() : new Date(b.updatedAt).getTime();
      // }

      // String comparison for text fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      // Numeric comparison
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

    return filtered;
  }, [assets, searchTerm, filterCategory, filterType, filterStatus, sortField, sortDirection, getStockStatus]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };



  const getStatusBadge = (status: Asset['status']) => {
    const statusColors = {
      'active': 'bg-gradient-success',
      'damaged': 'bg-gradient-warning text-warning-foreground',
      'missing': 'destructive',
      'maintenance': 'secondary'
    };

    return (
      <Badge className={statusColors[status || 'active']}>
        {(status || 'active').toUpperCase()}
      </Badge>
    );
  };

  const getStockBadge = (quantity: number, lowStockLevel: number, criticalStockLevel: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity <= criticalStockLevel) {
      return <Badge variant="destructive">Critical Stock</Badge>;
    } else if (quantity <= lowStockLevel) {
      return <Badge className="bg-gradient-warning text-warning-foreground">Low Stock</Badge>;
    } else {
      return <Badge className="bg-gradient-success">In Stock</Badge>;
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Asset Inventory
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your equipment, tools, and consumables
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedAssets.length} of {assets.length} assets
          </div>
          <Button
            onClick={() => {
              if (!isAuthenticated) {
                toast({
                  title: "Login Required",
                  description: "Please log in to restock assets.",
                  variant: "destructive",
                });
                return;
              }
              setShowRestockDialog(true);
            }}
            disabled={!hasPermission('print_documents')}
            className="bg-gradient-primary hover:opacity-90"
          >
            <Package className="h-4 w-4 mr-2" />
            Restock
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border-0 shadow-soft rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search assets by name, location, or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-0 bg-muted/50 focus:bg-background transition-all duration-300"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={filterCategory} onValueChange={(value: any) => setFilterCategory(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="dewatering">Dewatering</SelectItem>
                <SelectItem value="waterproofing">Waterproofing</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="non-consumable">Non-Consumable</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border-0 shadow-soft rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader field="name">Asset Name</SortableHeader>
                <SortableHeader field="quantity">Total Stock</SortableHeader>
                {!isMobile && <TableHead>Reserved</TableHead>}
                {!isMobile && <TableHead>Available</TableHead>}
                {!isMobile && <TableHead>Missing</TableHead>}
                {!isMobile && <TableHead>Damaged</TableHead>}
                {!isMobile && <TableHead>Category</TableHead>}
                {!isMobile && <TableHead>Type</TableHead>}
                <SortableHeader field="location">Location</SortableHeader>
                <SortableHeader field="stockStatus">Stock Status</SortableHeader>
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredAndSortedAssets.map((asset) => (
              <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-medium">
                  {asset.name}
                </TableCell>

                <TableCell>
                  <span className="font-semibold text-primary">{asset.quantity}</span>
                </TableCell>

                {!isMobile && (
                  <TableCell>
                    {asset.reservedQuantity || 0}
                  </TableCell>
                )}

                {!isMobile && (
                  <TableCell>
                    {asset.availableQuantity || 0}
                  </TableCell>
                )}

                {!isMobile && (
                  <TableCell>
                    {asset.missingCount || 0}
                  </TableCell>
                )}

                {!isMobile && (
                  <TableCell>
                    {asset.damagedCount || 0}
                  </TableCell>
                )}

                {!isMobile && (
                  <TableCell>
                    <Badge variant="outline">{asset.category}</Badge>
                  </TableCell>
                )}

                {!isMobile && (
                  <TableCell>
                    <Badge variant="secondary">{asset.type}</Badge>
                  </TableCell>
                )}

                <TableCell>
                  {asset.location || '-'}
                </TableCell>

                <TableCell>{getStockBadge(asset.quantity, asset.lowStockLevel, asset.criticalStockLevel)}</TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasPermission('write_assets') && (
                        <DropdownMenuItem onClick={() => {
                          if (!isAuthenticated) {
                            toast({
                              title: "Login Required",
                              description: "Please log in to edit assets.",
                              variant: "destructive",
                            });
                            return;
                          }
                          onEdit(asset);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Form
                        </DropdownMenuItem>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <FileText className="h-4 w-4 mr-2" />
                            Description
                          </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{asset.name} - Description</DialogTitle>
                          </DialogHeader>
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">
                              {asset.description || 'No description available for this asset.'}
                            </p>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast({
                              title: "Login Required",
                              description: "Please log in to view analytics.",
                              variant: "destructive",
                            });
                            return;
                          }
                          onViewAnalytics?.(asset);
                        }}
                      >
                        <BarChart className="h-4 w-4 mr-2" />
                        Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast({
                              title: "Login Required",
                              description: "Please log in to view restock history.",
                              variant: "destructive",
                            });
                            return;
                          }
                          setSelectedAssetForHistory(asset);
                          setShowRestockHistoryDialog(true);
                        }}
                      >
                        <History className="h-4 w-4 mr-2" />
                        Restock History
                      </DropdownMenuItem>
                      {hasPermission('delete_assets') && (
                        <DropdownMenuItem
                          onClick={() => {
                            if (!isAuthenticated) {
                              toast({
                                title: "Login Required",
                                description: "Please log in to delete assets.",
                                variant: "destructive",
                              });
                              return;
                            }
                            onDelete(asset);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
         </Table>
        </div>

        {/* Empty State */}
        {filteredAndSortedAssets.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterCategory !== 'all' || filterType !== 'all' || filterStatus !== 'all'
                ? "Try adjusting your search or filters"
                : "Start by adding your first asset"}
            </p>
          </div>
        )}
      </div>

      {/* Restock Dialog */}
      <RestockDialog
        open={showRestockDialog}
        onOpenChange={setShowRestockDialog}
        assets={assets}
        onRestock={async (restockItems) => {
          // Implement restock logic for multiple items
          for (const item of restockItems) {
            const asset = assets.find(a => a.id === item.assetId);
            if (asset) {
              const updatedAsset = {
                ...asset,
                quantity: asset.quantity + item.quantity,
                availableQuantity: (asset.availableQuantity || 0) + item.quantity,
              };
              
              // Update in database
              if (window.db) {
                await window.db.updateAsset(asset.id, updatedAsset);
              }
              
              // Update in local state
              onUpdateAsset(updatedAsset);
            }
          }

          // Log individual restock entries for each asset
          restockItems.forEach((item) => {
            const asset = assets.find(a => a.id === item.assetId);
            if (asset) {
              const unitCost = item.totalCost / item.quantity;
              const restockLog = {
                id: Date.now().toString() + '-' + item.assetId,
                assetId: item.assetId,
                assetName: asset.name,
                quantity: item.quantity,
                unitCost: unitCost,
                totalCost: item.totalCost,
                type: 'restock' as const,
                date: new Date(),
                notes: `Restocked ${item.quantity} units`,
                createdAt: new Date(),
                updatedAt: new Date()
              };

              // Add to equipment logs if available
              if (window.electronAPI) {
                window.electronAPI.addEquipmentLog(restockLog);
              } else if (window.db) {
                window.db.createEquipmentLog(restockLog);
              }
            }
          });

          const totalQuantity = restockItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalCost = restockItems.reduce((sum, item) => sum + item.totalCost, 0);
          toast({
            title: "Restock Successful",
            description: `Added ${totalQuantity} units across ${restockItems.length} asset(s) for $${totalCost.toFixed(2)}.`,
          });
        }}
      />

      {/* Restock History Dialog */}
      <RestockHistoryDialog
        asset={selectedAssetForHistory}
        open={showRestockHistoryDialog}
        onOpenChange={setShowRestockHistoryDialog}
      />
    </div>
  );
};
