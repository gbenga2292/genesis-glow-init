import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MobileActionMenu, ActionMenuItem } from "@/components/ui/mobile-action-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Asset, Site } from "@/types/asset";
import { Search, Filter, Edit, Trash2, MoreHorizontal, Package, ChevronUp, ChevronDown, Check, X, FileText, BarChart, History } from "lucide-react";
import { logActivity } from "@/utils/activityLogger";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { dataService } from "@/services/dataService";
import { RestockDialog } from "./RestockDialog";
import { RestockHistoryDialog } from "./RestockHistoryDialog";
import { AdvancedFilterSheet, AdvancedFilters } from "./AdvancedFilterSheet";
import { BulkAssetOperations } from "./BulkAssetOperations";
interface AssetTableProps {
  assets: Asset[];
  sites: Site[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onUpdateAsset: (asset: Asset) => void;
  onViewAnalytics?: (asset: Asset) => void;
  activeAvailabilityFilter?: 'all' | 'ready' | 'restock' | 'critical' | 'out' | 'issues' | 'reserved';
}
type SortField = 'name' | 'quantity' | 'location' | 'stockStatus';
type SortDirection = 'asc' | 'desc';
export const AssetTable = ({
  assets,
  sites,
  onEdit,
  onDelete,
  onUpdateAsset,
  onViewAnalytics,
  activeAvailabilityFilter
}: AssetTableProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    hasPermission,
    currentUser
  } = useAuth();
  const {
    toast
  } = useToast();

  // Bulk operations state (admin only)
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const isAdmin = currentUser?.role === 'admin';
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<'all' | 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office'>('all');
  const [filterType, setFilterType] = useState<'all' | 'consumable' | 'non-consumable' | 'tools' | 'equipment'>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'ready' | 'restock' | 'critical' | 'out' | 'issues' | 'reserved'>('all');

  // Sync active filter from props
  useEffect(() => {
    if (activeAvailabilityFilter && activeAvailabilityFilter !== 'all') {
      setFilterAvailability(activeAvailabilityFilter);
    }
  }, [activeAvailabilityFilter]);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
  const [showRestockHistoryDialog, setShowRestockHistoryDialog] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedAssetForDescription, setSelectedAssetForDescription] = useState<Asset | null>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    criticalStock: false,
    lowStock: false,
    outOfStock: false,
    hasDamaged: false,
    hasMissing: false,
    isReserved: false,
    searchTerm: '',
    specificLocation: 'all',
    recentlyUpdated: 'all'
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterType, filterAvailability, advancedFilters]);

  // FIXED: Use asset-specific thresholds instead of hardcoded values
  const getStockStatus = (asset: Asset): number => {
    if (asset.quantity === 0) return 0; // Out of Stock
    if (asset.quantity <= asset.criticalStockLevel) return 1; // Critical Stock
    if (asset.quantity <= asset.lowStockLevel) return 2; // Low Stock
    return 3; // In Stock
  };
  const siteMap = useMemo(() => {
    const map: Record<string, string> = {};
    (sites || []).forEach(s => map[s.id] = s.name);
    return map;
  }, [sites]);
  const assetLocations = useMemo(() => {
    const locations = new Set<string>();
    assets.forEach(asset => {
      if (asset.location) locations.add(asset.location);
    });
    return Array.from(locations).filter(Boolean).sort();
  }, [assets]);
  const filteredAndSortedAssets = useMemo(() => {
    let filtered = assets.filter(asset => {
      // ENHANCED SEARCH: Search across name, description, location, service, category, type
      const combinedSearchTerm = searchTerm || advancedFilters.searchTerm;
      const matchesSearch = !combinedSearchTerm || asset.name.toLowerCase().includes(combinedSearchTerm.toLowerCase()) || asset.description?.toLowerCase().includes(combinedSearchTerm.toLowerCase()) || asset.location?.toLowerCase().includes(combinedSearchTerm.toLowerCase()) || asset.service?.toLowerCase().includes(combinedSearchTerm.toLowerCase()) || asset.category.toLowerCase().includes(combinedSearchTerm.toLowerCase()) || asset.type.toLowerCase().includes(combinedSearchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
      const matchesType = filterType === 'all' || asset.type === filterType;

      // NEW AVAILABILITY FILTER (Smart, practical filtering)
      let matchesAvailability = filterAvailability === 'all';
      if (!matchesAvailability) {
        const availableQty = asset.availableQuantity || 0;
        const status = asset.status || 'active';
        const hasDamage = (asset.damagedCount || 0) > 0;
        const hasMissing = (asset.missingCount || 0) > 0;
        const isReserved = (asset.reservedQuantity || 0) > 0;
        switch (filterAvailability) {
          case 'ready':
            // Ready to Use: Available > 0 AND status = active
            matchesAvailability = availableQty > 0 && status === 'active';
            break;
          case 'restock':
            // Needs Restock: qty <= lowStockLevel (uses ACTUAL threshold)
            matchesAvailability = asset.quantity <= asset.lowStockLevel;
            break;
          case 'critical':
            // Critical Stock: qty <= criticalStockLevel (uses ACTUAL threshold)
            matchesAvailability = asset.quantity <= asset.criticalStockLevel;
            break;
          case 'out':
            // Out of Stock: qty = 0
            matchesAvailability = asset.quantity === 0;
            break;
          case 'issues':
            // Issues: damaged OR missing OR maintenance OR has damage/missing counts
            matchesAvailability = status === 'damaged' || status === 'missing' || status === 'maintenance' || hasDamage || hasMissing;
            break;
          case 'reserved':
            // Checked Out: reservedQuantity > 0
            matchesAvailability = isReserved;
            break;
        }
      }

      // ADVANCED FILTERS
      let matchesAdvanced = true;

      // Stock Health Filters
      if (advancedFilters.criticalStock && asset.quantity > asset.criticalStockLevel) matchesAdvanced = false;
      if (advancedFilters.lowStock && asset.quantity > asset.lowStockLevel) matchesAdvanced = false;
      if (advancedFilters.outOfStock && asset.quantity !== 0) matchesAdvanced = false;
      if (advancedFilters.hasDamaged && (asset.damagedCount || 0) === 0) matchesAdvanced = false;
      if (advancedFilters.hasMissing && (asset.missingCount || 0) === 0) matchesAdvanced = false;
      if (advancedFilters.isReserved && (asset.reservedQuantity || 0) === 0) matchesAdvanced = false;

      // Location Filter
      if (advancedFilters.specificLocation && advancedFilters.specificLocation !== 'all') {
        if (advancedFilters.specificLocation === 'Office') {
          if (asset.siteId) matchesAdvanced = false;
        } else {
          // Check if it matches a site name
          const siteMatch = asset.siteId ? siteMap[asset.siteId] === advancedFilters.specificLocation : false;
          // Check if it matches the free-text location
          const locationMatch = asset.location === advancedFilters.specificLocation;
          if (!siteMatch && !locationMatch) matchesAdvanced = false;
        }
      }

      // Time-based Filter
      if (advancedFilters.recentlyUpdated !== 'all') {
        const now = new Date();
        const updatedAt = new Date(asset.updatedAt);
        const diffInMs = now.getTime() - updatedAt.getTime();
        const diffInDays = diffInMs / (1000 * 3600 * 24);
        if (advancedFilters.recentlyUpdated === 'today' && diffInDays > 1) matchesAdvanced = false;
        if (advancedFilters.recentlyUpdated === 'week' && diffInDays > 7) matchesAdvanced = false;
        if (advancedFilters.recentlyUpdated === 'month' && diffInDays > 30) matchesAdvanced = false;
      }
      return matchesSearch && matchesCategory && matchesType && matchesAvailability && matchesAdvanced;
    });

    // Sort the filtered assets
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      if (sortField === 'stockStatus') {
        // FIXED: Use asset-specific thresholds for sorting
        aValue = getStockStatus(a);
        bValue = getStockStatus(b);
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
  }, [assets, searchTerm, filterCategory, filterType, filterAvailability, sortField, sortDirection, advancedFilters, sites, siteMap]);

  // Count active advanced filters
  const activeAdvancedFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.criticalStock) count++;
    if (advancedFilters.lowStock) count++;
    if (advancedFilters.outOfStock) count++;
    if (advancedFilters.hasDamaged) count++;
    if (advancedFilters.hasMissing) count++;
    if (advancedFilters.isReserved) count++;
    if (advancedFilters.searchTerm) count++;
    if (advancedFilters.specificLocation && advancedFilters.specificLocation !== 'all') count++;
    if (advancedFilters.recentlyUpdated !== 'all') count++;
    return count;
  }, [advancedFilters]);
  const handleClearAdvancedFilters = () => {
    setAdvancedFilters({
      criticalStock: false,
      lowStock: false,
      outOfStock: false,
      hasDamaged: false,
      hasMissing: false,
      isReserved: false,
      searchTerm: '',
      specificLocation: 'all',
      recentlyUpdated: 'all'
    });
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Bulk operations handlers (admin only)
  const handleToggleAssetSelection = (assetId: string) => {
    const newSelection = new Set(selectedAssetIds);
    if (newSelection.has(assetId)) {
      newSelection.delete(assetId);
    } else {
      newSelection.add(assetId);
    }
    setSelectedAssetIds(newSelection);
  };
  const handleToggleAllAssets = () => {
    if (selectedAssetIds.size === filteredAndSortedAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(filteredAndSortedAssets.map(a => a.id)));
    }
  };
  const handleBulkDelete = async (assetIds: string[]) => {
    // Delete each asset
    for (const assetId of assetIds) {
      await dataService.assets.deleteAsset(assetId);
    }

    // Reload assets from database
    const loadedAssets = await dataService.assets.getAssets();
    const processedAssets = loadedAssets.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      siteQuantities: item.siteQuantities || item.site_quantities ? typeof item.site_quantities === 'string' ? JSON.parse(item.site_quantities) : item.siteQuantities || {} : {}
    }));

    // Update parent component
    window.dispatchEvent(new CustomEvent('refreshAssets', {
      detail: processedAssets
    }));
  };
  const handleBulkUpdate = async (assetIds: string[], updates: Partial<Asset>) => {
    // Update each asset
    for (const assetId of assetIds) {
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        const updatedAsset = {
          ...asset,
          ...updates,
          updatedAt: new Date()
        };
        await dataService.assets.updateAsset(assetId, updatedAsset);
      }
    }

    // Reload assets from database
    const loadedAssets = await dataService.assets.getAssets();
    const processedAssets = loadedAssets.map((item: any) => ({
      ...item,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      siteQuantities: item.siteQuantities || item.site_quantities ? typeof item.site_quantities === 'string' ? JSON.parse(item.site_quantities) : item.siteQuantities || {} : {}
    }));

    // Update parent component
    window.dispatchEvent(new CustomEvent('refreshAssets', {
      detail: processedAssets
    }));
  };
  const selectedAssets = useMemo(() => {
    return assets.filter(asset => selectedAssetIds.has(asset.id));
  }, [assets, selectedAssetIds]);
  const getStatusBadge = (status: Asset['status']) => {
    const statusColors = {
      'active': 'bg-gradient-success',
      'damaged': 'bg-gradient-warning text-warning-foreground',
      'missing': 'destructive',
      'maintenance': 'secondary'
    };
    return <Badge className={statusColors[status || 'active']}>
      {(status || 'active').toUpperCase()}
    </Badge>;
  };
  const getStockBadge = (asset: Asset) => {
    const {
      quantity,
      lowStockLevel,
      criticalStockLevel
    } = asset;
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity <= criticalStockLevel) {
      return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-transparent">Critical Stock</Badge>;
    } else if (quantity <= lowStockLevel) {
      return <Badge className="bg-gradient-warning text-warning-foreground">Low Stock</Badge>;
    } else {
      return <Badge className="bg-gradient-success">In Stock</Badge>;
    }
  };
  const SortableHeader = ({
    field,
    children
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
      </div>
    </TableHead>;
  return <div className="space-y-4 md:space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Inventory
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Equipment, tools, and consumables
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          {filteredAndSortedAssets.length} of {assets.length} assets
        </div>
        <Button onClick={() => {
          if (!isAuthenticated) {
            toast({
              title: "Login Required",
              description: "Please log in to restock assets.",
              variant: "destructive"
            });
            return;
          }
          setShowRestockDialog(true);
        }} disabled={!hasPermission('write_assets')} className="bg-gradient-primary hover:opacity-90">
          <Package className="h-4 w-4 mr-2" />
          Restock
        </Button>
      </div>
    </div>

    {/* Filters - Mobile Optimized */}
    <div className="bg-card border-0 shadow-soft rounded-lg p-3 md:p-4">
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search assets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 border-0 bg-muted/50 focus:bg-background transition-all duration-300 h-10" />
        </div>

        {/* Filters Row - Scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 mobile-hide-scrollbar -mx-1 px-1">
          <Select value={filterCategory} onValueChange={(value: any) => setFilterCategory(value)}>
            <SelectTrigger className="w-[120px] md:w-40 shrink-0 h-9">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="dewatering">Dewatering</SelectItem>
              <SelectItem value="waterproofing">Waterproofing</SelectItem>
              <SelectItem value="tiling">Tiling</SelectItem>
              <SelectItem value="ppe">PPE</SelectItem>
              <SelectItem value="office">Office</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
            <SelectTrigger className="w-[100px] md:w-40 shrink-0 h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
              <SelectItem value="consumable">Consumable</SelectItem>
              <SelectItem value="non-consumable">Reuseables</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAvailability} onValueChange={(value: any) => setFilterAvailability(value)}>
            <SelectTrigger className="w-[110px] md:w-44 shrink-0 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ready">✅ Ready</SelectItem>
              <SelectItem value="restock">📦 Restock</SelectItem>
              <SelectItem value="critical">🚨 Critical</SelectItem>
              <SelectItem value="out">❌ Out</SelectItem>
              <SelectItem value="issues">⚠️ Issues</SelectItem>
              <SelectItem value="reserved">🔒 Reserved</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setShowAdvancedFilters(true)} className="gap-1 relative shrink-0 h-9 px-2 md:px-3" size="sm">
            <Filter className="h-4 w-4" />
            <span className="hidden md:inline">More</span>
            {activeAdvancedFilterCount > 0 && <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeAdvancedFilterCount}
            </Badge>}
          </Button>
        </div>
      </div>
    </div>

    {/* Advanced Filter Sheet */}
    <AdvancedFilterSheet open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters} filters={advancedFilters} onFiltersChange={setAdvancedFilters} onApply={() => setShowAdvancedFilters(false)} onClear={handleClearAdvancedFilters} activeFilterCount={activeAdvancedFilterCount} sites={sites || []} assetLocations={assetLocations} />

    {/* Table / Card View */}
    <div className="bg-card border-0 shadow-soft rounded-lg overflow-hidden">
      {isMobile ? <div className="space-y-3 p-3">
        {filteredAndSortedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(asset => <Card key={asset.id} className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-1">
                <div className="font-semibold text-base">{asset.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] h-5">{asset.category}</Badge>
                  <span className="capitalize">{asset.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MobileActionMenu title={`${asset.name} Actions`} items={[{
                  label: "Edit Form",
                  icon: <Edit className="h-4 w-4" />,
                  onClick: () => {
                    if (!isAuthenticated) return;
                    onEdit(asset);
                  },
                  hidden: !hasPermission('write_assets')
                }, {
                  label: "Description",
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => {
                    if (isMobile) {
                      navigate(`/asset/${asset.id}/description`);
                    } else {
                      setSelectedAssetForDescription(asset);
                    }
                  }
                }, {
                  label: "Analytics",
                  icon: <BarChart className="h-4 w-4" />,
                  onClick: () => onViewAnalytics?.(asset)
                }, {
                  label: "Restock History",
                  icon: <History className="h-4 w-4" />,
                  onClick: () => {
                    if (isMobile) {
                      navigate(`/asset/${asset.id}/history`);
                    } else {
                      setSelectedAssetForHistory(asset);
                      setShowRestockHistoryDialog(true);
                    }
                  }
                }, {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => onDelete(asset),
                  variant: "destructive",
                  hidden: !hasPermission('delete_assets')
                }]} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Total Stock</span>
                <span className="font-semibold text-primary">{asset.quantity} {asset.unitOfMeasurement}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block mb-1">Status</span>
                {getStockBadge(asset)}
              </div>
              <div className="col-span-2 pt-2 border-t mt-1 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Location</span>
                  <span className="truncate max-w-[200px]">{asset.location || asset.siteId && siteMap[asset.siteId] || '-'}</span>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>)}
      </div> : <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {isAdmin && <TableHead className="w-12">
                <Checkbox checked={selectedAssetIds.size === filteredAndSortedAssets.length && filteredAndSortedAssets.length > 0} onCheckedChange={handleToggleAllAssets} aria-label="Select all assets" />
              </TableHead>}
              <SortableHeader field="name">Asset Name</SortableHeader>
              <SortableHeader field="quantity">Total Stock</SortableHeader>
              {!isMobile && <TableHead>Reserved</TableHead>}
              {!isMobile && <TableHead>Available</TableHead>}
              {!isMobile && <TableHead>Stats (M | D | U)</TableHead>}
              {!isMobile && <TableHead>Category | Type</TableHead>}
              <SortableHeader field="location">Location</SortableHeader>
              <SortableHeader field="stockStatus">Stock Status</SortableHeader>
              <TableHead className="w-16 sticky right-0 bg-muted z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.15)]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(asset => <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors">
              {isAdmin && <TableCell>
                <Checkbox checked={selectedAssetIds.has(asset.id)} onCheckedChange={() => handleToggleAssetSelection(asset.id)} aria-label={`Select ${asset.name}`} />
              </TableCell>}
              <TableCell className="font-medium">
                {asset.name}
              </TableCell>

              <TableCell>
                <span className="font-semibold text-primary">{asset.quantity} {asset.unitOfMeasurement}</span>
              </TableCell>

              {!isMobile && <TableCell>
                {asset.reservedQuantity || 0}
              </TableCell>}

              {!isMobile && <TableCell>
                {Math.max(0, (asset.quantity || 0) - (asset.reservedQuantity || 0) - (asset.damagedCount || 0) - (asset.missingCount || 0) - (asset.usedCount || 0))}
              </TableCell>}

              {!isMobile && <TableCell>
                <div className="flex flex-col text-xs space-y-1">
                  <div className="flex justify-between w-24">
                    <span className="text-muted-foreground">Missing:</span>
                    <span className="font-medium text-destructive">{asset.missingCount || 0}</span>
                  </div>
                  <div className="flex justify-between w-24">
                    <span className="text-muted-foreground">Damaged:</span>
                    <span className="font-medium text-amber-500">{asset.damagedCount || 0}</span>
                  </div>
                  <div className="flex justify-between w-24">
                    <span className="text-muted-foreground">Used:</span>
                    <span className="font-medium text-blue-500">{asset.usedCount || 0}</span>
                  </div>
                </div>
              </TableCell>}

              {!isMobile && <TableCell>
                <div className="flex flex-col space-y-1">
                  <Badge variant="outline" className="w-fit">{asset.category}</Badge>
                  <Badge variant="secondary" className="w-fit text-[10px]">{asset.type === 'non-consumable' ? 'Reuseables' : asset.type}</Badge>
                </div>
              </TableCell>}

              <TableCell>
                {asset.location || asset.siteId && siteMap[asset.siteId] || '-'}
              </TableCell>

              <TableCell>{getStockBadge(asset)}</TableCell>

              <TableCell className="sticky right-0 bg-card z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                <MobileActionMenu title={`${asset.name} Actions`} items={[{
                  label: "Edit Form",
                  icon: <Edit className="h-4 w-4" />,
                  onClick: () => {
                    if (!isAuthenticated) {
                      toast({
                        title: "Login Required",
                        description: "Please log in to edit assets.",
                        variant: "destructive"
                      });
                      return;
                    }
                    onEdit(asset);
                  },
                  hidden: !hasPermission('write_assets')
                }, {
                  label: "Description",
                  icon: <FileText className="h-4 w-4" />,
                  onClick: () => {
                    // Even on desktop table view, if user prefers full page or if we decide to unify behavior
                    // For now, keeping dialog on desktop as it's standard, but respecting "mobile view" request
                    setSelectedAssetForDescription(asset)
                  }
                }, {
                  label: "Analytics",
                  icon: <BarChart className="h-4 w-4" />,
                  onClick: () => {
                    if (!isAuthenticated) {
                      toast({
                        title: "Login Required",
                        description: "Please log in to view analytics.",
                        variant: "destructive"
                      });
                      return;
                    }
                    onViewAnalytics?.(asset);
                  }
                }, {
                  label: "Restock History",
                  icon: <History className="h-4 w-4" />,
                  onClick: () => {
                    if (!isAuthenticated) {
                      toast({
                        title: "Login Required",
                        description: "Please log in to view restock history.",
                        variant: "destructive"
                      });
                      return;
                    }
                    setSelectedAssetForHistory(asset);
                    setShowRestockHistoryDialog(true);
                  }
                }, {
                  label: "Delete",
                  icon: <Trash2 className="h-4 w-4" />,
                  onClick: () => {
                    if (!isAuthenticated) {
                      toast({
                        title: "Login Required",
                        description: "Please log in to delete assets.",
                        variant: "destructive"
                      });
                      return;
                    }
                    onDelete(asset);
                  },
                  variant: "destructive",
                  hidden: !hasPermission('delete_assets')
                }]} />
              </TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>}

      {/* Empty State */}
      {filteredAndSortedAssets.length === 0 && <div className="text-center py-12">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No assets found</h3>
        <p className="text-muted-foreground">
          {searchTerm || filterCategory !== 'all' || filterType !== 'all' || filterAvailability !== 'all' || activeAdvancedFilterCount > 0 ? "Try adjusting your search or filters" : "Start by adding your first asset"}
        </p>
      </div>}
    </div>

    {/* Pagination Controls */}
    {filteredAndSortedAssets.length > 0 && <div className="flex items-center justify-between py-4">
      <div className="text-sm text-muted-foreground">
        <span className="hidden md:inline">Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedAssets.length)} to {Math.min(currentPage * itemsPerPage, filteredAndSortedAssets.length)} of {filteredAndSortedAssets.length} assets</span>
        <span className="md:hidden">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedAssets.length)}-{Math.min(currentPage * itemsPerPage, filteredAndSortedAssets.length)} of {filteredAndSortedAssets.length}</span>
      </div>
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
          Previous
        </Button>
        <div className="text-sm font-medium">
          Page {currentPage} of {Math.ceil(filteredAndSortedAssets.length / itemsPerPage)}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredAndSortedAssets.length / itemsPerPage)))} disabled={currentPage >= Math.ceil(filteredAndSortedAssets.length / itemsPerPage)}>
          Next
        </Button>
      </div>
    </div>}

    {/* Restock Dialog */}
    <RestockDialog open={showRestockDialog} onOpenChange={setShowRestockDialog} assets={assets} onRestock={async restockItems => {
      // Implement restock logic for multiple items
      for (const item of restockItems) {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const updatedAsset = {
            ...asset,
            quantity: asset.quantity + item.quantity,
            availableQuantity: (asset.availableQuantity || 0) + item.quantity
          };

          // Update in database
          await dataService.assets.updateAsset(asset.id, updatedAsset);

          // Update in local state
          onUpdateAsset(updatedAsset);
        }
      }

      // Log individual restock entries for each asset
      restockItems.forEach(item => {
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
          if (dataService.equipmentLogs) {
            dataService.equipmentLogs.createEquipmentLog(restockLog);
          }
          logActivity({
            action: 'restock',
            entity: 'asset',
            entityId: item.assetId,
            details: `Restocked ${item.quantity} units of ${asset.name}`
          });
        }
      });
      const totalQuantity = restockItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalCost = restockItems.reduce((sum, item) => sum + item.totalCost, 0);
      toast({
        title: "Restock Successful",
        description: `Added ${totalQuantity} units across ${restockItems.length} asset(s) for NGN ${totalCost.toFixed(2)}.`
      });
    }} />

    {/* Restock History Dialog */}
    <RestockHistoryDialog asset={selectedAssetForHistory} open={showRestockHistoryDialog} onOpenChange={setShowRestockHistoryDialog} />

    {/* Asset Description Dialog */}
    <Dialog open={!!selectedAssetForDescription} onOpenChange={open => !open && setSelectedAssetForDescription(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{selectedAssetForDescription?.name} - Description</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {selectedAssetForDescription?.description || 'No description available for this asset.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>

    {/* Bulk Operations (Admin Only) */}
    {isAdmin && <BulkAssetOperations selectedAssets={selectedAssets} onClearSelection={() => setSelectedAssetIds(new Set())} onBulkDelete={handleBulkDelete} onBulkUpdate={handleBulkUpdate} />}
  </div>;
};