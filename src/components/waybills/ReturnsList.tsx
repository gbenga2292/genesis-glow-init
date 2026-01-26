import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Waybill, Site } from "@/types/asset";
import { Search, Eye, RotateCcw, FileText, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ReturnsListProps {
  waybills: Waybill[];
  sites: Site[];
  onViewWaybill: (waybill: Waybill) => void;
  onEditWaybill?: (waybill: Waybill) => void;
  onProcessReturn?: (returnData: any) => void;
  onDeleteWaybill?: (waybill: Waybill) => void;
}

export const ReturnsList = ({ waybills, sites, onViewWaybill, onEditWaybill, onProcessReturn, onDeleteWaybill }: ReturnsListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { hasPermission } = useAuth();

  const filteredWaybills = waybills.filter(waybill =>
    waybill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    waybill.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    waybill.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Waybill['status']) => {
    switch (status) {
      case 'outstanding':
        return <Badge className="bg-gradient-warning text-warning-foreground">Outstanding</Badge>;
      case 'partial_returned':
        return <Badge className="bg-orange-500 text-white">Partial Return</Badge>;
      case 'return_completed':
        return <Badge className="bg-gradient-success">Returned</Badge>;
      case 'sent_to_site':
        return <Badge className="bg-blue-500 text-white">Sent to Site</Badge>;
    }
  };

  const getItemsSummary = (items: Waybill['items']) => {
    if (items.length === 0) return 'No items';
    if (items.length <= 2) {
      return items.map(item => `${item.quantity}x ${item.assetName}`).join(', ');
    }
    return `${items.slice(0, 2).map(item => `${item.quantity}x ${item.assetName}`).join(', ')} +${items.length - 2} more`;
  };

  const getSiteName = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : 'Unknown Site';
  };

  const getTo = () => {
    return 'DCEL Warehouse';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Returns Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Track and manage asset returns
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search returns by ID, driver, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-0 bg-muted/50 focus:bg-background transition-all duration-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Returns List */}
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Return ID</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead className="w-[150px]">To</TableHead>
                  <TableHead className="w-[120px]">Vehicle</TableHead>
                  <TableHead className="w-[120px]">Created On</TableHead>
                  <TableHead className="w-[120px]">Return From</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[150px]">Items</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWaybills.map((waybill) => (
                  <TableRow key={waybill.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{waybill.id}</TableCell>
                    <TableCell>{waybill.driverName}</TableCell>
                    <TableCell>{getTo()}</TableCell>
                    <TableCell>{waybill.vehicle}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{waybill.issueDate instanceof Date ? waybill.issueDate.toLocaleDateString('en-GB') : new Date(waybill.issueDate).toLocaleDateString('en-GB')}</div>
                        <div className="text-muted-foreground text-xs">{waybill.createdBy || 'Unknown'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{getSiteName(waybill.siteId)}</TableCell>
                    <TableCell>{getStatusBadge(waybill.status)}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">
                      {getItemsSummary(waybill.items)}
                    </TableCell>
                    <TableCell className="flex gap-1">
                      <Button
                        onClick={() => onViewWaybill(waybill)}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {waybill.status === 'outstanding' && onEditWaybill && hasPermission('write_returns') && (
                        <Button
                          onClick={() => onEditWaybill(waybill)}
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {waybill.status === 'outstanding' && onProcessReturn && hasPermission('write_returns') && (
                        <Button
                          onClick={() => onProcessReturn({ waybillId: waybill.id, items: waybill.items })}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 bg-gradient-primary text-primary-foreground"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Process
                        </Button>
                      )}
                      {onDeleteWaybill && waybill.status === 'outstanding' && hasPermission('delete_returns') && (
                        <Button
                          onClick={() => onDeleteWaybill(waybill)}
                          variant="destructive"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredWaybills.length === 0 && (
        <Card className="border-0 shadow-soft">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No returns found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search" : "Create your first return to get started"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
