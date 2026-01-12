import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Asset } from "@/types/asset";
import { Search, Filter, Edit, Trash2, MoreHorizontal, Package, Save, X, ArrowUpDown } from "lucide-react";

interface AssetListProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
}

export const AssetList = ({ assets, onEdit, onDelete }: AssetListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<'all' | 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office'>('all');
  const [filterType, setFilterType] = useState<'all' | 'consumable' | 'non-consumable' | 'tools' | 'equipment'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'category' | 'type' | 'location' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingAsset, setEditingAsset] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    const matchesType = filterType === 'all' || asset.type === filterType;

    return matchesSearch && matchesCategory && matchesType;
  });

  const sortedAssets = [...filteredAssets].sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];

    if (sortBy === 'quantity') {
      aValue = a.quantity;
      bValue = b.quantity;
    } else if (sortBy === 'updatedAt') {
      aValue = a.updatedAt.getTime();
      bValue = b.updatedAt.getTime();
    } else {
      aValue = aValue?.toString().toLowerCase() || '';
      bValue = bValue?.toString().toLowerCase() || '';
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusBadge = (quantity: number) => {
    if (quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (quantity < 10) {
      return <Badge className="bg-gradient-warning text-warning-foreground">Low Stock</Badge>;
    } else {
      return <Badge className="bg-gradient-success">In Stock</Badge>;
    }
  };

  const getTypeBadge = (type: Asset['type']) => {
    const variants = {
      'equipment': 'default',
      'tools': 'secondary',
      'consumable': 'outline',
      'non-consumable': 'secondary'
    } as const;

    return <Badge variant={variants[type]}>{type === 'non-consumable' ? 'Reuseables' : type}</Badge>;
  };

  const handleEditAsset = (asset: Asset) => {
    setEditingAsset(asset.id);
    setEditForm(asset);
  };

  const handleSaveEdit = async () => {
    if (editingAsset && editForm.id) {
      onEdit({ ...editForm } as Asset);
      setEditingAsset(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingAsset(null);
    setEditForm({});
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Inventory
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage and track all your assets in one place
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search assets by name, description, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-0 bg-muted/50 focus:bg-background"
              />
            </div>

            <div className="flex gap-2">
              <Select value={filterCategory} onValueChange={(value: any) => setFilterCategory(value)}>
                <SelectTrigger className="w-40 border-0 bg-muted/50">
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
                <SelectTrigger className="w-40 border-0 bg-muted/50">
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
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card className="border-0 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Assets ({sortedAssets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold cursor-pointer" onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center gap-1">
                      Quantity
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('location')}>
                    <div className="flex items-center gap-1">
                      Location
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('updatedAt')}>
                    <div className="flex items-center gap-1">
                      Last Updated
                      <ArrowUpDown className="h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAssets.map((asset) => (
                  <TableRow key={asset.id} className="hover:bg-muted/50">
                    <TableCell>
                      {editingAsset === asset.id ? (
                        <Input
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="h-8 border-0 bg-background"
                        />
                      ) : (
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          {asset.description && (
                            <div className="text-sm text-muted-foreground">{asset.description}</div>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {getTypeBadge(asset.type)}
                    </TableCell>

                    <TableCell>
                      {editingAsset === asset.id ? (
                        <Input
                          type="number"
                          value={editForm.quantity || 0}
                          onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                          className="h-8 w-20 border-0 bg-background"
                        />
                      ) : (
                        <span className="font-medium">{asset.quantity} {asset.unitOfMeasurement}</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(asset.quantity)}
                    </TableCell>

                    <TableCell>
                      {editingAsset === asset.id ? (
                        <Input
                          value={editForm.location || ''}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          className="h-8 border-0 bg-background"
                        />
                      ) : (
                        <span className="text-sm">{asset.location || 'Not specified'}</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {asset.updatedAt instanceof Date ? asset.updatedAt.toLocaleDateString() : new Date(asset.updatedAt).toLocaleDateString()}
                      </span>
                    </TableCell>

                    <TableCell>
                      {editingAsset === asset.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={handleSaveEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditAsset(asset)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(asset)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {sortedAssets.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">No assets found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm || filterCategory !== 'all' || filterType !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Add your first asset to get started'
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};