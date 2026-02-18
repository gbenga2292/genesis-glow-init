import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, Eye, RotateCcw, FileText, Trash2, Send, Edit, Calendar, User, Truck, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SendToSiteDialog } from "./SendToSiteDialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface WaybillListProps {
  waybills: Waybill[];
  sites: Site[];
  onViewWaybill: (waybill: Waybill) => void;
  onEditWaybill?: (waybill: Waybill) => void;
  onInitiateReturn?: (waybill: Waybill) => void;
  onProcessReturn?: (returnData: any) => void;
  onDeleteWaybill?: (waybill: Waybill) => void;
  onSentToSite?: (waybill: Waybill, sentToSiteDate: Date, signWithSignature?: boolean) => void;
  disableDelete?: boolean;
}

export const WaybillList = ({ waybills, sites, onViewWaybill, onEditWaybill, onInitiateReturn, onProcessReturn, onDeleteWaybill, onSentToSite, disableDelete }: WaybillListProps) => {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [sendToSiteDialogOpen, setSendToSiteDialogOpen] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const { hasPermission, currentUser } = useAuth();

  const filteredWaybills = waybills.filter(waybill =>
    waybill.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    waybill.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    waybill.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Waybill['status']) => {
    switch (status) {
      case 'outstanding':
        return <Badge className="bg-gradient-warning text-warning-foreground">Outstanding</Badge>;
      case 'sent_to_site':
        return <Badge className="bg-blue-500 text-white">Sent to Site</Badge>;
      case 'partial_returned':
        return <Badge className="bg-orange-500 text-white">Partial Return</Badge>;
      case 'return_completed':
        return <Badge className="bg-gradient-success">Returned</Badge>;
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
    const site = sites.find(s => String(s.id) === String(siteId));
    if (!site) return 'Unknown Site';
    return site.clientName ? `${site.name} (${site.clientName})` : site.name;
  };

  const getFrom = (waybill: Waybill) => {
    if (waybill.type === 'waybill') {
      return 'DCEL Warehouse';
    }
    return getSiteName(waybill.siteId);
  };

  const getTo = (waybill: Waybill) => {
    if (waybill.type === 'waybill') {
      return getSiteName(waybill.siteId);
    }
    return 'DCEL Warehouse';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Waybill Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Track and manage asset deliveries and returns
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-soft">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search waybills by ID, driver, or vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-0 bg-muted/50 focus:bg-background transition-all duration-300"
            />
          </div>
        </CardContent>
      </Card>

      {/* Waybill List */}
      {isMobile ? (
        // Mobile View: Cards
        <div className="space-y-4">
          {filteredWaybills.map((waybill) => (
            <Card key={waybill.id} className="border-0 shadow-soft overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">{waybill.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {waybill.issueDate instanceof Date ? waybill.issueDate.toLocaleDateString('en-GB') : new Date(waybill.issueDate).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  {getStatusBadge(waybill.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="truncate">{waybill.driverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Truck className="h-3 w-3" />
                    <span className="truncate">{waybill.vehicle}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className="truncate max-w-[100px]">{getFrom(waybill)}</span>
                      <span>→</span>
                      <span className="truncate max-w-[100px]">{getTo(waybill)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/30 p-2 rounded text-xs">
                  <span className="font-medium">Items: </span>
                  <span className="text-muted-foreground">{getItemsSummary(waybill.items)}</span>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button
                    onClick={() => onViewWaybill(waybill)}
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onEditWaybill && waybill.status !== 'sent_to_site' && waybill.status !== 'open' && hasPermission('write_waybills') && currentUser?.role !== 'staff' && (
                    <Button
                      onClick={() => onEditWaybill(waybill)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {waybill.type === 'waybill' && waybill.status === 'outstanding' && onSentToSite && hasPermission('write_waybills') && currentUser?.role !== 'staff' && (
                    <Button
                      onClick={() => {
                        setSelectedWaybill(waybill);
                        setSendToSiteDialogOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                      className="h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  )}
                  {waybill.type === 'return' && waybill.status === 'outstanding' && onProcessReturn && hasPermission('write_returns') && currentUser?.role !== 'staff' && (
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
                  {onDeleteWaybill && waybill.status === 'outstanding' && hasPermission('write_waybills') && currentUser?.role !== 'staff' && (
                    <Button
                      onClick={() => onDeleteWaybill(waybill)}
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={disableDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // Desktop View: Table
        <Card className="border-0 shadow-soft overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Waybill ID</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead className="w-[150px]">From</TableHead>
                    <TableHead className="w-[120px]">Vehicle</TableHead>
                    <TableHead className="w-[120px]">Created On</TableHead>
                    <TableHead className="w-[150px]">To</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[150px]">Items</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWaybills.map((waybill) => (
                    <TableRow key={waybill.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{waybill.id}</TableCell>
                      <TableCell>{waybill.driverName}</TableCell>
                      <TableCell>{getFrom(waybill)}</TableCell>
                      <TableCell>{waybill.vehicle}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{waybill.issueDate instanceof Date ? waybill.issueDate.toLocaleDateString('en-GB') : new Date(waybill.issueDate).toLocaleDateString('en-GB')}</div>
                          <div className="text-muted-foreground text-xs">
                            by {waybill.createdBy || 'Unknown User'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getTo(waybill)}</TableCell>
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
                        {onEditWaybill && waybill.status !== 'sent_to_site' && waybill.status !== 'open' && hasPermission('write_waybills') && currentUser?.role !== 'staff' && (
                          <Button
                            onClick={() => onEditWaybill(waybill)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {waybill.type === 'waybill' && waybill.status === 'outstanding' && onSentToSite && hasPermission('write_waybills') && currentUser?.role !== 'staff' && (
                          <Button
                            onClick={() => {
                              setSelectedWaybill(waybill);
                              setSendToSiteDialogOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                        {waybill.type === 'return' && waybill.status === 'outstanding' && onProcessReturn && hasPermission('write_returns') && currentUser?.role !== 'staff' && (
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
                        {onDeleteWaybill && waybill.status === 'outstanding' && hasPermission('write_waybills') && currentUser?.role !== 'staff' && (
                          <Button
                            onClick={() => onDeleteWaybill(waybill)}
                            variant="destructive"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={disableDelete}
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
      )}

      {/* Empty State */}
      {filteredWaybills.length === 0 && (
        <Card className="border-0 shadow-soft">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No waybills found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search" : "Create your first waybill to get started"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Send to Site Dialog */}
      {selectedWaybill && (
        <SendToSiteDialog
          waybill={selectedWaybill}
          open={sendToSiteDialogOpen}
          onOpenChange={setSendToSiteDialogOpen}
          onSend={(waybill, sentToSiteDate, signWithSignature) => {
            if (onSentToSite) {
              onSentToSite(waybill, sentToSiteDate, signWithSignature);
            }
            setSelectedWaybill(null);
          }}
        />
      )}
    </div>
  );
};
