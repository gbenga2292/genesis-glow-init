import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Asset, Site, Waybill, WaybillItem, CompanySettings, Employee, SiteTransaction, Vehicle } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { SiteInventoryItem } from "@/types/inventory";
import { MapPin, Plus, Edit, Trash2, MoreVertical, FileText, Package, Activity, Eye, ChevronDown } from "lucide-react";
import { WaybillDocument } from "../waybills/WaybillDocument";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import SiteForm from "./SiteForm";
import { ReturnWaybillForm } from "../waybills/ReturnWaybillForm";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MachinesSection } from "./MachinesSection";
import { ConsumablesSection } from "./ConsumablesSection";
import { ConsumableUsageLog } from "@/types/consumable";

interface SitesPageProps {
  sites: Site[];
  assets: Asset[];
  waybills: Waybill[];
  employees: Employee[];
  vehicles: Vehicle[];
  transactions: SiteTransaction[];
  equipmentLogs: EquipmentLog[];
  consumableLogs: ConsumableUsageLog[];
  siteInventory: SiteInventoryItem[];
  getSiteInventory: (siteId: string) => SiteInventoryItem[];
  companySettings?: CompanySettings;
  onAddSite: (site: Site) => void;
  onUpdateSite: (site: Site) => void;
  onDeleteSite: (siteId: string) => void;
  onUpdateAsset: (asset: Asset) => void;
  onCreateWaybill: (waybillData: { siteId: string; items: WaybillItem[]; driverName: string; vehicle: string; purpose: string; expectedReturnDate?: Date; }) => void;
  onCreateReturnWaybill: (waybillData: {
    siteId: string;
    returnToSiteId?: string;
    items: WaybillItem[];
    driverName: string;
    vehicle: string;
    purpose: string;
    expectedReturnDate?: Date;
  }) => void;
  onProcessReturn: (returnData: any) => void;
  onAddEquipmentLog: (log: EquipmentLog) => void;
  onUpdateEquipmentLog: (log: EquipmentLog) => void;
  onAddConsumableLog: (log: ConsumableUsageLog) => void;
  onUpdateConsumableLog: (log: ConsumableUsageLog) => void;
  aiPrefillData?: any;
}

export const SitesPage = ({ sites, assets, waybills, employees, vehicles, transactions, equipmentLogs, consumableLogs, siteInventory, getSiteInventory, companySettings, onAddSite, onUpdateSite, onDeleteSite, onUpdateAsset, onCreateWaybill, onCreateReturnWaybill, onProcessReturn, onAddEquipmentLog, onUpdateEquipmentLog, onAddConsumableLog, onUpdateConsumableLog, aiPrefillData }: SitesPageProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [showItemsModal, setShowItemsModal] = useState(false);
  const [showReturnWaybillForm, setShowReturnWaybillForm] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [previewAssets, setPreviewAssets] = useState<Asset[]>([]);
  const [showReportTypeDialog, setShowReportTypeDialog] = useState(false);
  const [selectedSiteForReport, setSelectedSiteForReport] = useState<Site | null>(null);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [transactionsView, setTransactionsView] = useState<'table' | 'tree' | 'flow'>('table');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [deleteOptions, setDeleteOptions] = useState<{
    hasAssets: boolean;
    hasOutstandingWaybills: boolean;
    assetCount: number;
    outstandingWaybillCount: number;
  } | null>(null);
  const [showDeleteAssetDialog, setShowDeleteAssetDialog] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<Waybill | null>(null);
  const [showWaybillView, setShowWaybillView] = useState(false);
  const [siteFilter, setSiteFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const { isAuthenticated, hasPermission } = useAuth();
  const { toast } = useToast();

  // Auto-open form when AI provides prefill data
  useEffect(() => {
    if (aiPrefillData?.formType === 'site') {
      setEditingSite(null);
      setShowForm(true);
    }
  }, [aiPrefillData]);

  const handleAdd = () => {
    setEditingSite(null);
    setShowForm(true);
  };

  const handleEdit = (site: Site) => {
    setEditingSite(site);
    setShowForm(true);
  };

  const handleSave = (site: Site) => {
    if (editingSite) {
      onUpdateSite(site);
    } else {
      onAddSite(site);
    }
    setShowForm(false);
  };

  const handleDelete = (site: Site) => {
    // Analyze site for deletion options
    const siteAssets = assets.filter(asset => asset.siteId === site.id);
    const outstandingWaybills = waybills.filter(waybill =>
      waybill.siteId === site.id &&
      waybill.status !== 'return_completed'
    );

    setDeleteOptions({
      hasAssets: siteAssets.length > 0,
      hasOutstandingWaybills: outstandingWaybills.length > 0,
      assetCount: siteAssets.length,
      outstandingWaybillCount: outstandingWaybills.length
    });

    setSiteToDelete(site);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (siteToDelete) {
      onDeleteSite(siteToDelete.id);
      setShowDeleteDialog(false);
      setSiteToDelete(null);
    }
  };

  const handleDeleteAsset = (asset: Asset) => {
    if (!selectedSite) return;

    // Check if there's any outstanding waybill for this site that includes this asset
    const hasOutstandingWaybill = waybills.some(waybill =>
      waybill.siteId === selectedSite.id &&
      waybill.status !== 'return_completed' &&
      waybill.items.some(item => item.assetName === asset.name)
    );

    if (hasOutstandingWaybill) {
      toast({
        title: "Cannot Remove Asset",
        description: "This asset is part of an outstanding waybill. Use the return process to remove it.",
        variant: "destructive",
      });
      return;
    }

    // Show confirmation dialog
    setAssetToDelete(asset);
    setShowDeleteAssetDialog(true);
  };

  const confirmDeleteAsset = () => {
    if (assetToDelete) {
      const updatedAsset = { ...assetToDelete, siteId: undefined, quantity: 0, updatedAt: new Date() };
      onUpdateAsset(updatedAsset);
      setShowDeleteAssetDialog(false);
      setAssetToDelete(null);
      toast({
        title: "Asset Removed",
        description: `${assetToDelete.name} has been removed from ${selectedSite?.name}.`,
      });
    }
  };

  const handleShowItems = (site: Site) => {
    setSelectedSite(site);
    setShowItemsModal(true);
  };

  const handleCreateReturnWaybill = (site: Site) => {
    setSelectedSite(site);
    setShowReturnWaybillForm(true);
  };

  const handleGenerateReport = (site: Site) => {
    setSelectedSiteForReport(site);
    setShowReportTypeDialog(true);
  };

  const handleGenerateMaterialsReport = () => {
    if (selectedSiteForReport) {
      const siteAssets = assets.filter(asset => asset.siteQuantities && asset.siteQuantities[selectedSiteForReport.id] > 0);
      setPreviewAssets(siteAssets);
      setShowReportPreview(true);
      setShowReportTypeDialog(false);
    }
  };

  const handleGenerateTransactionsReport = () => {
    if (selectedSiteForReport && companySettings) {
      // Get and sort transactions
      const siteTransactions = transactions
        .filter(t => t.siteId === selectedSiteForReport.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Calculate summary statistics
      const totalTransactions = siteTransactions.length;
      const inboundTransactions = siteTransactions.filter(t => t.type === 'in').length;
      const outboundTransactions = siteTransactions.filter(t => t.type === 'out').length;
      const totalInQuantity = siteTransactions
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + t.quantity, 0);
      const totalOutQuantity = siteTransactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + t.quantity, 0);

      // Transform data for unified generator
      const reportData = siteTransactions.map(transaction => ({
        createdAt: new Date(transaction.createdAt).toLocaleString(),
        type: transaction.type.toUpperCase(),
        assetName: transaction.assetName,
        quantity: transaction.quantity,
        referenceId: transaction.referenceId,
        condition: transaction.condition || '-',
        notes: transaction.notes || '-'
      }));

      generateUnifiedReport({
        title: 'Site Transactions Report',
        subtitle: `${selectedSiteForReport.name} - Transaction History`,
        reportType: 'SITE TRANSACTIONS',
        companySettings,
        orientation: 'landscape',
        columns: [
          { header: 'Date', dataKey: 'createdAt', width: 35 },
          { header: 'Type', dataKey: 'type', width: 20 },
          { header: 'Asset', dataKey: 'assetName', width: 40 },
          { header: 'Quantity', dataKey: 'quantity', width: 20 },
          { header: 'Reference ID', dataKey: 'referenceId', width: 35 },
          { header: 'Condition', dataKey: 'condition', width: 25 },
          { header: 'Notes', dataKey: 'notes', width: 40 }
        ],
        data: reportData,
        summaryStats: [
          { label: 'Total Transactions', value: totalTransactions },
          { label: 'Inbound Transactions', value: inboundTransactions },
          { label: 'Outbound Transactions', value: outboundTransactions },
          { label: 'Total Quantity In', value: totalInQuantity },
          { label: 'Total Quantity Out', value: totalOutQuantity },
          { label: 'Net Quantity', value: totalInQuantity - totalOutQuantity }
        ]
      });

      setShowReportTypeDialog(false);
    }
  };

  const handleShowTransactions = (site: Site) => {
    setSelectedSite(site);
    setShowTransactionsModal(true);
  };

  const handleViewWaybill = (waybill: Waybill) => {
    setSelectedWaybill(waybill);
    setShowWaybillView(true);
  };

  const generateReport = (assetsToReport: Asset[], title: string) => {
    if (!companySettings) return;

    // Calculate summary statistics
    const totalAssets = assetsToReport.length;
    const totalQuantity = assetsToReport.reduce((sum, asset) => sum + asset.quantity, 0);
    const totalValue = assetsToReport.reduce((sum, asset) => sum + (asset.cost * asset.quantity), 0);
    const equipmentCount = assetsToReport.filter(a => a.type === 'equipment').length;
    const consumablesCount = assetsToReport.filter(a => a.type === 'consumable').length;
    const toolsCount = assetsToReport.filter(a => a.type === 'tools').length;

    // Transform data for unified generator
    const reportData = assetsToReport.map(asset => ({
      name: asset.name,
      description: asset.description || '-',
      quantity: asset.quantity,
      unit: asset.unitOfMeasurement,
      category: asset.category,
      type: asset.type,
      status: asset.status,
      condition: asset.condition,
      cost: asset.cost || 0
    }));

    generateUnifiedReport({
      title: 'Site Materials Report',
      subtitle: title,
      reportType: 'MATERIALS ON SITE',
      companySettings,
      orientation: 'landscape',
      columns: [
        { header: 'Name', dataKey: 'name', width: 35 },
        { header: 'Description', dataKey: 'description', width: 40 },
        { header: 'Quantity', dataKey: 'quantity', width: 20 },
        { header: 'Unit', dataKey: 'unit', width: 20 },
        { header: 'Category', dataKey: 'category', width: 25 },
        { header: 'Type', dataKey: 'type', width: 25 },
        { header: 'Status', dataKey: 'status', width: 22 },
        { header: 'Condition', dataKey: 'condition', width: 22 },
        { header: 'Unit Cost', dataKey: 'cost', width: 20 }
      ],
      data: reportData,
      summaryStats: [
        { label: 'Total Assets', value: totalAssets },
        { label: 'Total Quantity', value: totalQuantity },
        { label: 'Total Value', value: `$${totalValue.toFixed(2)}` },
        { label: 'Equipment Items', value: equipmentCount },
        { label: 'Consumables', value: consumablesCount },
        { label: 'Tools', value: toolsCount }
      ]
    });
  };

  const generateWaybillPDF = (waybill: Waybill) => {
    if (!companySettings) return;

    const site = sites.find(s => s.id === waybill.siteId);
    const siteName = site?.name || 'Unknown Site';

    // Transform items data
    const reportData = waybill.items.map(item => ({
      assetName: item.assetName,
      quantity: item.quantity,
      returnedQuantity: item.returnedQuantity || 0,
      status: item.status?.replace('_', ' ').toUpperCase() || 'OUTSTANDING'
    }));

    // Calculate summary statistics
    const totalItems = waybill.items.length;
    const totalQuantity = waybill.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReturned = waybill.items.reduce((sum, item) => sum + (item.returnedQuantity || 0), 0);
    const outstandingQty = totalQuantity - totalReturned;

    generateUnifiedReport({
      title: waybill.type === 'return' ? 'Return Waybill' : 'Waybill',
      subtitle: `Waybill #${waybill.id} | Driver: ${waybill.driverName} | Vehicle: ${waybill.vehicle}`,
      reportType: `${waybill.type === 'return' ? 'RETURN' : 'OUTBOUND'} | Site: ${siteName}`,
      companySettings,
      orientation: 'landscape',
      columns: [
        { header: 'Asset Name', dataKey: 'assetName', width: 60 },
        { header: 'Quantity', dataKey: 'quantity', width: 30 },
        { header: 'Returned', dataKey: 'returnedQuantity', width: 30 },
        { header: 'Status', dataKey: 'status', width: 35 }
      ],
      data: reportData,
      summaryStats: [
        { label: 'Total Items', value: totalItems },
        { label: 'Total Quantity', value: totalQuantity },
        { label: 'Returned Quantity', value: totalReturned },
        { label: 'Outstanding Quantity', value: outstandingQty },
        { label: 'Issue Date', value: waybill.issueDate.toLocaleDateString() },
        { label: 'Purpose', value: waybill.purpose || '-' }
      ]
    });
  };

  // Filter sites based on status
  const filteredSites = sites.filter(site => {
    if (siteFilter === 'active') return site.status === 'active';
    if (siteFilter === 'inactive') return site.status === 'inactive';
    return true; // 'all' shows all sites
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Site Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage project sites and locations
          </p>
        </div>
        {hasPermission('manage_sites') && (
          <Button onClick={() => {
            if (!isAuthenticated) {
              toast({
                title: "Login Required",
                description: "Please log in to add a site.",
                variant: "destructive",
              });
              return;
            }
            handleAdd();
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Site
          </Button>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Filter:</span>
          <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="active">Active Sites</SelectItem>
              <SelectItem value="inactive">Inactive Sites</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredSites.length} of {sites.length} sites
        </div>
      </div>

      {/* Render modal dialogs conditionally */}
      {showItemsModal && selectedSite && (
        <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
          <DialogContent onClose={() => setShowItemsModal(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedSite.name} - Materials and Waybills
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Materials List */}
              <Collapsible defaultOpen={true} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Materials at Site</h3>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="space-y-2">
                  {(() => {
                    const materialsAtSite = getSiteInventory(selectedSite.id);
                    return materialsAtSite.length === 0 ? (
                      <p className="text-muted-foreground">No materials currently at this site.</p>
                    ) : (
                      <div className="space-y-2">
                        {materialsAtSite.map((item) => (
                          <div key={item.assetId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-3">
                              <p className="font-medium">{item.itemName}</p>
                              {item.itemType && (
                                <span className="text-sm text-muted-foreground">• {item.itemType}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${item.quantity === 0 ? 'text-destructive' : 'text-foreground'}`}>
                                {item.quantity} {item.unit}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Updated: {new Date(item.lastUpdated).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CollapsibleContent>
              </Collapsible>

              {/* Machines Section */}
              <MachinesSection
                site={selectedSite}
                assets={assets}
                equipmentLogs={equipmentLogs}
                employees={employees}
                companySettings={companySettings}
                onAddEquipmentLog={onAddEquipmentLog}
                onUpdateEquipmentLog={onUpdateEquipmentLog}
              />

              {/* Consumables Section */}
              <ConsumablesSection
                site={selectedSite}
                assets={assets}
                employees={employees}
                waybills={waybills}
                consumableLogs={consumableLogs}
                onAddConsumableLog={onAddConsumableLog}
                onUpdateConsumableLog={onUpdateConsumableLog}
              />

              {/* Waybills List */}
              <Collapsible defaultOpen={true} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Waybills for Site</h3>
                  </div>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="space-y-2">
                  {waybills.filter(waybill => waybill.siteId === selectedSite.id).length === 0 ? (
                    <p className="text-muted-foreground">No waybills for this site.</p>
                  ) : (
                    <div className="space-y-2">
                      {waybills.filter(waybill => waybill.siteId === selectedSite.id).map((waybill) => {
                        let badgeVariant: "default" | "secondary" | "outline" = 'outline';
                        if (waybill.status === 'outstanding') {
                          badgeVariant = 'default';
                        } else if (waybill.status === 'sent_to_site' || waybill.status === 'partial_returned') {
                          badgeVariant = 'secondary';
                        } else if (waybill.status === 'return_completed') {
                          badgeVariant = 'default';
                        }
                        return (
                          <div key={waybill.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{waybill.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {waybill.driverName} • {waybill.items.length} items • {waybill.status}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={badgeVariant}>
                                {waybill.status.replace('_', ' ')}
                              </Badge>
                              <Button
                                onClick={() => handleViewWaybill(waybill)}
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button onClick={() => handleCreateReturnWaybill(selectedSite)} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Return Waybill
                </Button>
                <Button
                  onClick={() => handleShowTransactions(selectedSite)}
                  variant="outline"
                  className="flex-1"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Transactions
                </Button>
                <Button
                  onClick={() => handleGenerateReport(selectedSite)}
                  variant="outline"
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Return Waybill Form */}
      {showReturnWaybillForm && selectedSite && (
        <Dialog open={showReturnWaybillForm} onOpenChange={setShowReturnWaybillForm}>
          <DialogContent onClose={() => setShowReturnWaybillForm(false)} className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <ReturnWaybillForm
              site={selectedSite}
              sites={sites}
              assets={assets}
              employees={employees}
              vehicles={vehicles}
              siteInventory={getSiteInventory(selectedSite.id)}
              onCreateReturnWaybill={onCreateReturnWaybill}
              onCancel={() => setShowReturnWaybillForm(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Report Type Selection Dialog */}
      {showReportTypeDialog && selectedSiteForReport && (
        <Dialog open={showReportTypeDialog} onOpenChange={setShowReportTypeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Report for {selectedSiteForReport.name}</DialogTitle>
              <DialogDescription>
                Choose the type of report to generate.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={handleGenerateMaterialsReport} className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Materials on Site
              </Button>
              <Button onClick={handleGenerateTransactionsReport} variant="outline" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Site Transactions
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Report Preview Dialog */}
      {showReportPreview && selectedSiteForReport && (
        <Dialog open={showReportPreview} onOpenChange={setShowReportPreview}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedSiteForReport.name} - Materials Preview</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewAssets.map((asset, index) => (
                    <TableRow key={index}>
                      <TableCell>{asset.name}</TableCell>
                      <TableCell>{asset.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end">
                <Button onClick={() => generateReport(previewAssets, `${selectedSiteForReport.name} Materials Report`)}>
                  Download PDF
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && selectedSite && (
        <Dialog open={showTransactionsModal} onOpenChange={setShowTransactionsModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <DialogTitle>{selectedSite.name} - Transaction History</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Select value={transactionsView} onValueChange={(value) => setTransactionsView(value as 'table' | 'tree' | 'flow')}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table View</SelectItem>
                    <SelectItem value="tree">Tree View</SelectItem>
                    <SelectItem value="flow">Flow View</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              {transactionsView === 'tree' ? (
                // Tree View - Group by referenceId (waybill) or date
                <div className="space-y-4">
                  {(() => {
                    const siteTransactions = transactions
                      .filter((t) => t.siteId === selectedSite.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    
                    // Group by referenceId (waybill ID)
                    const grouped = siteTransactions.reduce((acc, t) => {
                      const key = t.referenceId || 'Unassigned';
                      if (!acc[key]) acc[key] = [];
                      acc[key].push(t);
                      return acc;
                    }, {} as Record<string, SiteTransaction[]>);

                    return Object.entries(grouped).map(([ref, txns]) => (
                      <div key={ref} className="border rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {ref === 'Unassigned' ? 'Miscellaneous Transactions' : `Waybill/Ref: ${ref}`}
                          <Badge variant="outline" className="ml-auto">
                            {txns.length} items
                          </Badge>
                        </h4>
                        <div className="space-y-2 ml-4">
                          {txns.map((transaction) => (
                            <div key={transaction.id} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{transaction.assetName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(transaction.createdAt).toLocaleDateString()} • {transaction.type.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-semibold">{transaction.quantity}</span>
                                <span className="text-xs text-muted-foreground block">{transaction.notes || 'No notes'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                  {transactions.filter((t) => t.siteId === selectedSite.id).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No transactions for this site yet.</p>
                  )}
                </div>
              ) : transactionsView === 'flow' ? (
                // Flow View - Group by inflows (in) and outflows (out)
                <div className="space-y-6">
                  {(() => {
                    const siteTransactions = transactions
                      .filter((t) => t.siteId === selectedSite.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    
                    const inflows = siteTransactions.filter(t => t.type === 'in');
                    const outflows = siteTransactions.filter(t => t.type === 'out');

                    return (
                      <>
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-green-500" />
                            Inflows (From Office/Other Sites)
                          </h3>
                          {inflows.length === 0 ? (
                            <p className="text-muted-foreground">No inflows recorded.</p>
                          ) : (
                            <div className="space-y-2">
                              {inflows.map((transaction) => (
                                <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{transaction.assetName}</span>
                                    <span className="text-sm text-muted-foreground">
                                      From: {transaction.referenceId || 'Office/Direct'} • {transaction.type.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-green-600">+{transaction.quantity}</span>
                                    <span className="text-xs text-muted-foreground block">
                                      {new Date(transaction.createdAt).toLocaleString()}
                                    </span>
                                    {transaction.notes && <span className="text-xs block">{transaction.notes}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Activity className="h-4 w-4 text-red-500" />
                            Outflows (To Sites/Office)
                          </h3>
                          {outflows.length === 0 ? (
                            <p className="text-muted-foreground">No outflows recorded.</p>
                          ) : (
                            <div className="space-y-2">
                              {outflows.map((transaction) => (
                                <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{transaction.assetName}</span>
                                    <span className="text-sm text-muted-foreground">
                                      To: {transaction.referenceId || 'Site/Office'} • {transaction.type.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-semibold text-red-600">-{transaction.quantity}</span>
                                    <span className="text-xs text-muted-foreground block">
                                      {new Date(transaction.createdAt).toLocaleString()}
                                    </span>
                                    {transaction.notes && <span className="text-xs block">{transaction.notes}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                  {transactions.filter((t) => t.siteId === selectedSite.id).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No transactions for this site yet.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Asset</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter((t) => t.siteId === selectedSite.id)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{new Date(transaction.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge
                              variant={transaction.type === "in" ? "default" : "secondary"}
                            >
                              {transaction.type.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{transaction.assetName}</TableCell>
                          <TableCell>{transaction.quantity}</TableCell>
                          <TableCell>{transaction.referenceId}</TableCell>
                          <TableCell className="text-sm">{transaction.notes}</TableCell>
                        </TableRow>
                      ))}
                    {transactions.filter((t) => t.siteId === selectedSite.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                          No transactions for this site yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => {
          const siteAssets = assets.filter(asset => asset.siteId === site.id);
          const siteWaybills = waybills.filter(waybill => waybill.siteId === site.id);

          return (
            <Card key={site.id} className="border-0 shadow-soft">
              <CardHeader className="pb-3 flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <CardTitle className="text-lg">{site.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={site.status === "active" ? "default" : "secondary"}>
                    {site.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-1">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {hasPermission('manage_sites') && (
                        <DropdownMenuItem onClick={() => {
                          if (!isAuthenticated) {
                            toast({
                              title: "Login Required",
                              description: "Please log in to edit site.",
                              variant: "destructive",
                            });
                            return;
                          }
                          handleEdit(site);
                        }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      {hasPermission('manage_sites') && (
                        <DropdownMenuItem onClick={() => {
                          if (!isAuthenticated) {
                            toast({
                              title: "Login Required",
                              description: "Please log in to delete site.",
                              variant: "destructive",
                            });
                            return;
                          }
                          handleDelete(site);
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleShowItems(site)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Show Items
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong>Location:</strong> {site.location}
                </p>
                {site.description && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Description:</strong> {site.description}
                  </p>
                )}
                {site.contactPerson && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Contact:</strong> {site.contactPerson}
                  </p>
                )}
                {site.phone && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Phone:</strong> {site.phone}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSites.length === 0 && (
        <Card className="border-0 shadow-soft">
          <CardContent className="text-center py-8">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {sites.length === 0
                ? 'No sites added yet. Click "Add Site" to get started.'
                : 'No sites match the current filter.'
              }
            </p>
          </CardContent>
        </Card>
      )}

      <SiteForm
        site={editingSite}
        onSave={handleSave}
        onCancel={() => setShowForm(false)}
        open={showForm}
        initialData={aiPrefillData?.formType === 'site' ? aiPrefillData : undefined}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{siteToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteOptions && (
            <div className="space-y-3 py-4">
              {deleteOptions.hasAssets && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Package className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      {deleteOptions.assetCount} asset{deleteOptions.assetCount !== 1 ? 's' : ''} will be removed from this site
                    </p>
                    <p className="text-xs text-yellow-600">
                      Assets will be set to quantity 0 and removed from site assignment.
                    </p>
                  </div>
                </div>
              )}
              {deleteOptions.hasOutstandingWaybills && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <FileText className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      {deleteOptions.outstandingWaybillCount} outstanding waybill{deleteOptions.outstandingWaybillCount !== 1 ? 's' : ''} found
                    </p>
                    <p className="text-xs text-red-600">
                      Outstanding waybills must be completed before deleting the site.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteOptions?.hasOutstandingWaybills}
              className={deleteOptions?.hasOutstandingWaybills ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {deleteOptions?.hasOutstandingWaybills ? 'Complete Waybills First' : 'Delete Site'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteAssetDialog} onOpenChange={setShowDeleteAssetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Asset from Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{assetToDelete?.name}" from "{selectedSite?.name}"? This will set the asset quantity to 0 and remove it from this site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAsset}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Waybill View Modal */}
      {showWaybillView && selectedWaybill && (
        <WaybillDocument
          waybill={selectedWaybill}
          sites={sites}
          companySettings={companySettings}
          onClose={() => setShowWaybillView(false)}
        />
      )}
    </div>
  );
};
