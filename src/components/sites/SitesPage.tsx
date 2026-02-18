import React, { useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";


import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Asset, Site, Waybill, WaybillItem, CompanySettings, Employee, SiteTransaction, Vehicle } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { SiteInventoryItem } from "@/types/inventory";
import { MapPin, Plus, Edit, Trash2, MoreVertical, FileText, Package, Activity, Eye, ChevronDown, Phone, User, Building2, Wrench, Calendar, Info, ArrowUpDown } from "lucide-react";
import { WaybillDocument } from "../waybills/WaybillDocument";
import { MobileActionMenu, ActionMenuItem } from "@/components/ui/mobile-action-menu";
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
import { useIsMobile } from "@/hooks/use-mobile";

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
    service?: string;
    signatureUrl?: string | null;
    signatureName?: string;
    signatureRole?: string;
  }) => void;
  onProcessReturn: (returnData: any) => void;
  onAddEquipmentLog: (log: EquipmentLog) => void;
  onUpdateEquipmentLog: (log: EquipmentLog) => void;
  onAddConsumableLog: (log: ConsumableUsageLog) => void;
  onUpdateConsumableLog: (log: ConsumableUsageLog) => void;
  onViewSiteInventory?: (site: Site) => void;
  onViewAssetHistory?: (site: Site, asset: Asset) => void;
  onViewAssetDetails?: (site: Site, asset: Asset) => void;
  onViewAssetAnalytics?: (site: Site, asset: Asset) => void;

}

const defaultCompanySettings: CompanySettings = {
  companyName: "Dewatering Construction Etc Limited",
  logo: "/logo.png",
  address: "7 Musiliu Smith St, formerly Panti Street, Adekunle, Lagos 101212, Lagos",
  phone: "+2349030002182",
  email: "info@dewaterconstruct.com",
  website: "https://dewaterconstruct.com/",
  currency: "NGN",
  dateFormat: "MM/dd/yyyy",
  theme: "light",
  notifications: {
    email: true,
    push: true,
  },
};

// ── SiteDetailsSheet sub-component ─────────────────────────────────────────
const SERVICE_LABELS: Record<string, string> = {
  dewatering: 'Dewatering',
  waterproofing: 'Waterproofing',
  tiling: 'Tiling',
  sales: 'Sales',
  repairs: 'Repairs',
  maintenance: 'Maintenance',
};

const DetailRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
};

const SiteDetailsSheet = ({ site, open, onOpenChange, onEdit }: {
  site: Site | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
}) => {
  if (!site) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              site.status === 'active' ? 'bg-primary/10' : 'bg-muted'
            )}>
              <MapPin className={cn("h-5 w-5", site.status === 'active' ? 'text-primary' : 'text-muted-foreground')} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold truncate">{site.name}</SheetTitle>
              {site.location && (
                <p className="text-xs text-muted-foreground truncate">{site.location}</p>
              )}
            </div>
            <Badge
              variant={site.status === 'active' ? 'default' : 'secondary'}
              className="ml-auto shrink-0 text-[10px] h-5"
            >
              {site.status}
            </Badge>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {/* Services */}
          {site.service && site.service.length > 0 && (
            <div className="py-3 border-b border-border/50">
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">Services</p>
                  <div className="flex flex-wrap gap-1.5">
                    {site.service.map(s => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {SERVICE_LABELS[s] ?? s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DetailRow icon={<Info className="h-3.5 w-3.5 text-muted-foreground" />} label="Description" value={site.description} />
          <DetailRow icon={<Building2 className="h-3.5 w-3.5 text-muted-foreground" />} label="Client" value={site.clientName} />
          <DetailRow icon={<User className="h-3.5 w-3.5 text-muted-foreground" />} label="Contact Person" value={site.contactPerson} />
          <DetailRow icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />} label="Phone" value={site.phone} />
          <DetailRow
            icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Created"
            value={site.createdAt ? new Date(site.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
          />
          <DetailRow
            icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Last Updated"
            value={site.updatedAt ? new Date(site.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border/60">
          <Button className="w-full" variant="outline" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Site
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ── SiteItemsDialog sub-component ──────────────────────────────────────────
interface SiteItemsDialogProps {
  selectedSite: Site;
  assets: Asset[];
  waybills: Waybill[];
  equipmentLogs: EquipmentLog[];
  consumableLogs: ConsumableUsageLog[];
  employees: Employee[];
  companySettings?: CompanySettings;
  getSiteInventory: (siteId: string) => SiteInventoryItem[];
  onClose: () => void;
  onCreateReturnWaybill: () => void;
  onShowTransactions: () => void;
  onGenerateReport: () => void;
  onViewWaybill: (waybill: Waybill) => void;
  onAddEquipmentLog: (log: EquipmentLog) => void;
  onUpdateEquipmentLog: (log: EquipmentLog) => void;
  onAddConsumableLog: (log: ConsumableUsageLog) => void;
  onUpdateConsumableLog: (log: ConsumableUsageLog) => void;
  onViewAssetHistory: (asset: Asset) => void;
  onViewAssetDetails?: (asset: Asset) => void;
  onViewAssetAnalytics?: (asset: Asset) => void;
}

const SiteItemsDialog: React.FC<SiteItemsDialogProps> = ({
  selectedSite, assets, waybills, equipmentLogs, consumableLogs, employees,
  companySettings, getSiteInventory, onClose, onCreateReturnWaybill,
  onShowTransactions, onGenerateReport, onViewWaybill,
  onAddEquipmentLog, onUpdateEquipmentLog, onAddConsumableLog, onUpdateConsumableLog,
  onViewAssetHistory, onViewAssetDetails, onViewAssetAnalytics
}) => {
  const [activeTab, setActiveTab] = useState<'materials' | 'machines' | 'consumables' | 'waybills'>('materials');
  const materialsAtSite = getSiteInventory(selectedSite.id);
  const siteWaybills = waybills.filter(w => String(w.siteId) === String(selectedSite.id));

  const tabs = [
    { id: 'materials' as const, label: 'Materials', count: materialsAtSite.length },
    { id: 'machines' as const, label: 'Machines', count: null },
    { id: 'consumables' as const, label: 'Consumables', count: null },
    { id: 'waybills' as const, label: 'Waybills', count: siteWaybills.length },
  ];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onClose={onClose} className="max-w-3xl max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">

        {/* Sticky header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b bg-card shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold leading-tight truncate">
                {selectedSite.name}
              </DialogTitle>
              {selectedSite.location && (
                <p className="text-xs text-muted-foreground truncate">{selectedSite.location}</p>
              )}
            </div>
            <Badge variant={selectedSite.status === 'active' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5 shrink-0">
              {selectedSite.status}
            </Badge>
          </div>
          {/* Quick actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" className="h-7 text-xs px-2.5" onClick={onCreateReturnWaybill}>
                    <FileText className="h-3.5 w-3.5 mr-1" />Return
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Create Return Waybill</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" onClick={onShowTransactions}>
                    <Activity className="h-3.5 w-3.5 mr-1" />Transactions
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>View Transactions</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={onGenerateReport}>
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Generate Report</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex border-b bg-card shrink-0 px-5 gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count !== null && (
                <span className={cn(
                  "rounded-full px-1.5 text-[10px] font-semibold",
                  activeTab === tab.id ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-3">

          {/* Materials */}
          {activeTab === 'materials' && (
            <div>
              {materialsAtSite.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No materials currently at this site.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {materialsAtSite.map((item) => (
                    <div key={item.assetId} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.itemName}</p>
                          {item.itemType && <p className="text-xs text-muted-foreground">{item.itemType}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-semibold", item.quantity === 0 ? 'text-destructive' : 'text-foreground')}>
                          {item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{new Date(item.lastUpdated).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Machines */}
          {activeTab === 'machines' && (
            <MachinesSection
              site={selectedSite}
              assets={assets}
              equipmentLogs={equipmentLogs}
              employees={employees}
              waybills={waybills}
              companySettings={companySettings}
              onAddEquipmentLog={onAddEquipmentLog}
              onUpdateEquipmentLog={onUpdateEquipmentLog}
              onViewAssetHistory={onViewAssetHistory}
              onViewAssetDetails={onViewAssetDetails}
              onViewAssetAnalytics={onViewAssetAnalytics}
            />
          )}

          {/* Consumables */}
          {activeTab === 'consumables' && (
            <ConsumablesSection
              site={selectedSite}
              assets={assets}
              employees={employees}
              waybills={waybills}
              consumableLogs={consumableLogs}
              onAddConsumableLog={onAddConsumableLog}
              onUpdateConsumableLog={onUpdateConsumableLog}
              onViewAssetHistory={onViewAssetHistory}
              onViewAssetDetails={onViewAssetDetails}
              onViewAssetAnalytics={onViewAssetAnalytics}
            />
          )}

          {/* Waybills */}
          {activeTab === 'waybills' && (
            <div>
              {siteWaybills.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No waybills for this site.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {siteWaybills.map((waybill) => {
                    const statusColor =
                      waybill.status === 'return_completed' ? 'text-emerald-500' :
                        waybill.status === 'outstanding' ? 'text-amber-500' :
                          waybill.status === 'partial_returned' ? 'text-blue-500' : 'text-muted-foreground';
                    return (
                      <div key={waybill.id} className="flex items-center justify-between py-2.5 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate font-mono">{waybill.id}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {waybill.driverName} · {waybill.items.length} item{waybill.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-xs font-medium capitalize", statusColor)}>
                            {waybill.status.replace(/_/g, ' ')}
                          </span>
                          <Button onClick={() => onViewWaybill(waybill)} variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── SitesPage ────────────────────────────────────────────────────────────────

export const SitesPage = ({ sites, assets, waybills, employees, vehicles, transactions, equipmentLogs, consumableLogs, siteInventory, getSiteInventory, companySettings, onAddSite, onUpdateSite, onDeleteSite, onUpdateAsset, onCreateWaybill, onCreateReturnWaybill, onProcessReturn, onAddEquipmentLog, onUpdateEquipmentLog, onAddConsumableLog, onUpdateConsumableLog, onViewSiteInventory, onViewAssetHistory, onViewAssetDetails, onViewAssetAnalytics }: SitesPageProps) => {
  // Merge provided companySettings with defaults, only using non-empty values from database
  const effectiveCompanySettings: CompanySettings = {
    ...defaultCompanySettings,
    ...(companySettings ? Object.fromEntries(
      Object.entries(companySettings).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ) : {})
  };
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
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [siteForDetails, setSiteForDetails] = useState<Site | null>(null);
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
  const [siteSortBy, setSiteSortBy] = useState<'name' | 'client' | 'status' | 'assets' | 'waybills'>('name');
  const { isAuthenticated, hasPermission } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Load site filter from localStorage on component mount
  useEffect(() => {
    const savedFilter = localStorage.getItem('siteFilter');
    if (savedFilter && ['all', 'active', 'inactive'].includes(savedFilter)) {
      setSiteFilter(savedFilter as 'all' | 'active' | 'inactive');
    }
  }, []);

  // Save site filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('siteFilter', siteFilter);
  }, [siteFilter]);

  // Auto-open form when AI provides prefill data


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
    // Analyze site for deletion options - use String() for safe comparison
    const siteId = String(site.id);
    const siteAssets = assets.filter(asset => String(asset.siteId) === siteId);
    const outstandingWaybills = waybills.filter(waybill =>
      String(waybill.siteId) === siteId &&
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
      String(waybill.siteId) === String(selectedSite.id) &&
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
    if (onViewSiteInventory) {
      onViewSiteInventory(site);
    } else {
      setSelectedSite(site);
      setShowItemsModal(true);
    }
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

  const handleGenerateTransactionsReport = async () => {
    if (selectedSiteForReport && effectiveCompanySettings) {
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

      await generateUnifiedReport({
        title: 'Site Transactions Report',
        subtitle: `${selectedSiteForReport.name} - Transaction History`,
        reportType: 'SITE TRANSACTIONS',
        companySettings: effectiveCompanySettings,
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

  const generateReport = async (assetsToReport: Asset[], title: string) => {
    if (!effectiveCompanySettings) return;

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

    await generateUnifiedReport({
      title: 'Site Materials Report',
      subtitle: title,
      reportType: 'MATERIALS ON SITE',
      companySettings: effectiveCompanySettings,
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
        { label: 'Total Value', value: `NGN ${totalValue.toFixed(2)}` },
        { label: 'Equipment Items', value: equipmentCount },
        { label: 'Consumables', value: consumablesCount },
        { label: 'Tools', value: toolsCount }
      ]
    });
  };

  const generateWaybillPDF = async (waybill: Waybill) => {
    if (!effectiveCompanySettings) return;

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

    await generateUnifiedReport({
      title: waybill.type === 'return' ? 'Return Waybill' : 'Waybill',
      subtitle: `Waybill #${waybill.id} | Driver: ${waybill.driverName} | Vehicle: ${waybill.vehicle}`,
      reportType: `${waybill.type === 'return' ? 'RETURN' : 'OUTBOUND'} | Site: ${siteName}`,
      companySettings: effectiveCompanySettings,
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

  // Filter + sort sites
  const filteredSites = sites
    .filter(site => {
      if (siteFilter === 'active') return site.status === 'active';
      if (siteFilter === 'inactive') return site.status === 'inactive';
      return true;
    })
    .sort((a, b) => {
      switch (siteSortBy) {
        case 'client':
          return (a.clientName || '').localeCompare(b.clientName || '');
        case 'status':
          return a.status.localeCompare(b.status);
        case 'assets':
          return assets.filter(x => String(x.siteId) === String(b.id)).length
            - assets.filter(x => String(x.siteId) === String(a.id)).length;
        case 'waybills':
          return waybills.filter(w => String(w.siteId) === String(b.id) && w.status !== 'return_completed').length
            - waybills.filter(w => String(w.siteId) === String(a.id) && w.status !== 'return_completed').length;
        default: // 'name'
          return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent shrink-0">
            Site Management
          </h1>
          <span className="hidden sm:inline text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            {filteredSites.length} of {sites.length}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={siteFilter} onValueChange={(value) => setSiteFilter(value as 'all' | 'active' | 'inactive')}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sites</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={siteSortBy} onValueChange={(value) => setSiteSortBy(value as typeof siteSortBy)}>
            <SelectTrigger className="h-8 w-[110px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="client">Client A–Z</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="assets">Most Assets</SelectItem>
              <SelectItem value="waybills">Most Waybills</SelectItem>
            </SelectContent>
          </Select>
          {hasPermission('manage_sites') && (
            <Button
              size="sm"
              className="h-8 text-xs px-3"
              onClick={() => {
                if (!isAuthenticated) {
                  toast({ title: "Login Required", description: "Please log in to add a site.", variant: "destructive" });
                  return;
                }
                handleAdd();
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Site
            </Button>
          )}
        </div>
      </div>

      {/* Render modal dialogs conditionally */}
      {showItemsModal && selectedSite && (
        <SiteItemsDialog
          selectedSite={selectedSite}
          assets={assets}
          waybills={waybills}
          equipmentLogs={equipmentLogs}
          consumableLogs={consumableLogs}
          employees={employees}
          companySettings={companySettings}
          getSiteInventory={getSiteInventory}
          onClose={() => setShowItemsModal(false)}
          onCreateReturnWaybill={() => handleCreateReturnWaybill(selectedSite)}
          onShowTransactions={() => handleShowTransactions(selectedSite)}
          onGenerateReport={() => handleGenerateReport(selectedSite)}
          onViewWaybill={handleViewWaybill}
          onAddEquipmentLog={onAddEquipmentLog}
          onUpdateEquipmentLog={onUpdateEquipmentLog}
          onAddConsumableLog={onAddConsumableLog}
          onUpdateConsumableLog={onUpdateConsumableLog}
          onViewAssetHistory={(asset) => onViewAssetHistory ? onViewAssetHistory(selectedSite, asset) : navigate(`/asset/${asset.id}/history`)}
          onViewAssetDetails={(asset) => onViewAssetDetails?.(selectedSite, asset)}
          onViewAssetAnalytics={(asset) => onViewAssetAnalytics?.(selectedSite, asset)}
        />
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
              waybills={waybills}
              onCreateReturnWaybill={onCreateReturnWaybill}
              onCancel={() => setShowReturnWaybillForm(false)}
            />
          </DialogContent>
        </Dialog>
      )}


      {
        showReportTypeDialog && selectedSiteForReport && (
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
        )
      }

      {/* Report Preview Dialog */}
      {
        showReportPreview && selectedSiteForReport && (
          <Dialog open={showReportPreview} onOpenChange={setShowReportPreview}>
            <DialogContent className="w-[95vw] max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col">
              <DialogHeader className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 border-b shrink-0">
                <DialogTitle className="text-sm sm:text-base md:text-lg">{selectedSiteForReport.name} - Materials Preview</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4">
                <div className="space-y-3 sm:space-y-4">
                  <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Name</TableHead>
                            <TableHead className="text-xs sm:text-sm text-right">Quantity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewAssets.map((asset, index) => (
                            <TableRow key={index}>
                              <TableCell className="text-xs sm:text-sm">{asset.name}</TableCell>
                              <TableCell className="text-xs sm:text-sm text-right font-medium">{asset.quantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 border-t shrink-0">
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowReportPreview(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={() => generateReport(previewAssets, `${selectedSiteForReport.name} Materials Report`)} className="w-full sm:w-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      {/* Transactions Modal */}
      {
        showTransactionsModal && selectedSite && (
          <Dialog open={showTransactionsModal} onOpenChange={setShowTransactionsModal}>
            <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col">
              <DialogHeader className="px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 border-b shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <DialogTitle className="text-sm sm:text-base md:text-lg truncate">{selectedSite.name} - Transaction History</DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={transactionsView} onValueChange={(value) => setTransactionsView(value as 'table' | 'tree' | 'flow')}>
                      <SelectTrigger className="w-full sm:w-[110px] md:w-[120px] h-8 text-xs sm:text-sm">
                        <SelectValue placeholder="View" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="table">Table View</SelectItem>
                        <SelectItem value="tree">Tree View</SelectItem>
                        <SelectItem value="flow">Flow View</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-4">
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
                  <div className="overflow-x-auto">
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
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      }

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredSites.map((site) => {
          const siteAssets = assets.filter(asset => String(asset.siteId) === String(site.id));
          const siteWaybills = waybills.filter(waybill => String(waybill.siteId) === String(site.id));
          const outstandingWaybills = siteWaybills.filter(w => w.status !== 'return_completed');

          return (
            <div
              key={site.id}
              className="group relative flex flex-col gap-2 rounded-xl border border-border/60 bg-card p-3.5 shadow-sm hover:shadow-md hover:border-border transition-all duration-200"
            >
              {/* Top row: name + status + menu */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    site.status === 'active' ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <MapPin className={cn("h-3.5 w-3.5", site.status === 'active' ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <button
                    className="min-w-0 text-left"
                    onClick={() => { setSiteForDetails(site); setShowDetailsSheet(true); }}
                  >
                    <p className="text-sm font-semibold text-foreground truncate leading-tight hover:text-primary transition-colors">{site.name}</p>
                    {site.location && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{site.location}</p>
                    )}
                    {site.clientName && (
                      <p className="text-xs text-primary/70 truncate mt-0.5 flex items-center gap-1">
                        <Building2 className="h-2.5 w-2.5 shrink-0" />
                        {site.clientName}
                      </p>
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant={site.status === 'active' ? 'default' : 'secondary'}
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    {site.status}
                  </Badge>
                  <MobileActionMenu
                    title={`${site.name} Actions`}
                    iconVariant="vertical"
                    items={[
                      {
                        label: "View Details",
                        icon: <Info className="h-4 w-4" />,
                        onClick: () => { setSiteForDetails(site); setShowDetailsSheet(true); },
                      },
                      {
                        label: "Edit",
                        icon: <Edit className="h-4 w-4" />,
                        onClick: () => {
                          if (!isAuthenticated) {
                            toast({ title: "Login Required", description: "Please log in to edit site.", variant: "destructive" });
                            return;
                          }
                          handleEdit(site);
                        },
                        hidden: !hasPermission('manage_sites'),
                      },
                      {
                        label: "View Items",
                        icon: <Package className="h-4 w-4" />,
                        onClick: () => handleShowItems(site),
                      },
                      {
                        label: "Delete",
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: () => {
                          if (!isAuthenticated) {
                            toast({ title: "Login Required", description: "Please log in to delete site.", variant: "destructive" });
                            return;
                          }
                          handleDelete(site);
                        },
                        variant: "destructive",
                        hidden: !hasPermission('manage_sites'),
                      },
                    ]}
                  />
                </div>
              </div>

              {/* Description (truncated to 2 lines) */}
              {site.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {site.description}
                </p>
              )}

              {/* Stats row */}
              <div className="flex items-center gap-3 pt-1 border-t border-border/40">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>{siteAssets.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Assets at site</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>{outstandingWaybills.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>Outstanding waybills</p></TooltipContent>
                  </Tooltip>
                  {site.contactPerson && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[90px]">
                          <span className="truncate">{site.contactPerson}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>{site.contactPerson}{site.phone ? ` · ${site.phone}` : ''}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </TooltipProvider>

                {/* Quick action button */}
                <button
                  onClick={() => handleShowItems(site)}
                  className="ml-auto text-xs text-primary hover:underline underline-offset-2 transition-colors"
                >
                  View →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {
        filteredSites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {sites.length === 0
                ? 'No sites yet. Click "Add Site" to get started.'
                : 'No sites match the current filter.'
              }
            </p>
          </div>
        )
      }

      <SiteForm
        site={editingSite}
        onSave={handleSave}
        onCancel={() => setShowForm(false)}
        open={showForm}

      />

      <SiteDetailsSheet
        site={siteForDetails}
        open={showDetailsSheet}
        onOpenChange={setShowDetailsSheet}
        onEdit={() => {
          setShowDetailsSheet(false);
          if (siteForDetails) handleEdit(siteForDetails);
        }}
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
      {
        showWaybillView && selectedWaybill && (
          <WaybillDocument
            waybill={selectedWaybill}
            sites={sites}
            companySettings={companySettings}
            onClose={() => setShowWaybillView(false)}
          />
        )
      }
    </div>

  );
};
