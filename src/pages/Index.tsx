import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Menu, Plus, Bot, Package, ChevronDown, FileText, Activity, Eye } from "lucide-react";
import { AppMenuBar } from "@/components/layout/AppMenuBar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { cn } from "@/lib/utils";
import { AssetTable } from "@/components/assets/AssetTable";
import { AddAssetForm } from "@/components/assets/AddAssetForm";
import { WaybillList } from "@/components/waybills/WaybillList";
import { WaybillForm } from "@/components/waybills/WaybillForm";
import { EditWaybillForm } from "@/components/waybills/EditWaybillForm";
import { WaybillDocument } from "@/components/waybills/WaybillDocument";
import { ReturnForm } from "@/components/waybills/ReturnForm";
import { SiteWaybills } from "@/components/waybills/SiteWaybills";
import { ReturnWaybillForm } from "@/components/waybills/ReturnWaybillForm";
import { ReturnWaybillDocument } from "@/components/waybills/ReturnWaybillDocument";
import { ReturnProcessingDialog } from "@/components/waybills/ReturnProcessingDialog";
import { QuickCheckoutForm } from "@/components/checkout/QuickCheckoutForm";
import { EmployeeAnalyticsPage } from "@/pages/EmployeeAnalyticsPage";
import { RecentActivitiesPage } from "@/pages/RecentActivitiesPage";

import { CompanySettings } from "@/components/settings/CompanySettings";
import { Asset, Waybill, WaybillItem, QuickCheckout, ReturnBill, Site, CompanySettings as CompanySettingsType, Employee, ReturnItem, SiteTransaction, Vehicle } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";

import { ReturnsList } from "@/components/waybills/ReturnsList";
import { useToast } from "@/hooks/use-toast";
import { BulkImportAssets } from "@/components/assets/BulkImportAssets";
import { InventoryReport } from "@/components/assets/InventoryReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SitesPage } from "@/components/sites/SitesPage";
import { MachinesSection } from "@/components/sites/MachinesSection";
import { ConsumablesSection } from "@/components/sites/ConsumablesSection";
import { SiteAnalyticsPage } from "@/pages/SiteAnalyticsPage";
import { SiteAssetDetailsPage } from "@/pages/SiteAssetDetailsPage";
import { AssetAnalyticsPage } from "@/pages/AssetAnalyticsPage";
import { WaybillDocumentPage } from "@/pages/WaybillDocumentPage";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteInventory } from "@/hooks/useSiteInventory";
import { SiteInventoryItem } from "@/types/inventory";
import { PullToRefreshLayout } from "@/components/layout/PullToRefreshLayout";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { AIAssistantProvider, useAIAssistant } from "@/contexts/AIAssistantContext";
import { AIAssistantChat } from "@/components/ai/AIAssistantChat";
import { logActivity } from "@/utils/activityLogger";
import { calculateAvailableQuantity } from "@/utils/assetCalculations";
import { AuditCharts } from "@/components/reporting/AuditCharts";
import { MachineMaintenancePage } from "@/components/maintenance/MachineMaintenancePage";
import { Machine, MaintenanceLog } from "@/types/maintenance";
import { generateUnifiedReport } from "@/utils/unifiedReportGenerator";
import { exportAssetsToExcel } from "@/utils/exportUtils";
import { useAppData } from "@/contexts/AppDataContext";
import { dataService } from "@/services/dataService";


const Index = () => {
  const { toast } = useToast();
  const { isAuthenticated, hasPermission, currentUser } = useAuth();
  const isOnline = useNetworkStatus();

  const isMobile = useIsMobile();
  const params = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeAvailabilityFilter, setActiveAvailabilityFilter] = useState<'all' | 'ready' | 'restock' | 'critical' | 'out' | 'issues' | 'reserved'>('all');

  // Reset scroll on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedWaybillForView, setSelectedWaybillForView] = useState<Waybill | null>(null);
  const [selectedReturnWaybillForView, setSelectedReturnWaybillForView] = useState<Waybill | null>(null);
  const [showReturnForm, setShowReturnForm] = useState<Waybill | null>(null);
  const [processingReturnWaybill, setProcessingReturnWaybill] = useState<Waybill | null>(null);
  const [editingWaybill, setEditingWaybill] = useState<Waybill | null>(null);
  const [editingReturnWaybill, setEditingReturnWaybill] = useState<Waybill | null>(null);
  const [selectedAssetForAnalytics, setSelectedAssetForAnalytics] = useState<Asset | null>(null);
  const [analyticsReturnTo, setAnalyticsReturnTo] = useState<{ view: string; tab: string } | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrefillData, setAiPrefillData] = useState<any>(null);
  const [selectedSiteForInventory, setSelectedSiteForInventory] = useState<Site | null>(null);
  const [selectedSiteForReturnWaybill, setSelectedSiteForReturnWaybill] = useState<Site | null>(null);

  // View state for full-page navigation
  const [currentView, setCurrentView] = useState<string>('main');

  // Dialog states for waybill documents (used while transitioning to full-page views)
  const [showWaybillDocument, setShowWaybillDocument] = useState<Waybill | null>(null);
  const [showReturnWaybillDocument, setShowReturnWaybillDocument] = useState<Waybill | null>(null);


  const [selectedSiteForTransactions, setSelectedSiteForTransactions] = useState<Site | null>(null);

  // Reporting State
  const [showReportTypeDialog, setShowReportTypeDialog] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [previewAssets, setPreviewAssets] = useState<Asset[]>([]);
  const [selectedSiteForReport, setSelectedSiteForReport] = useState<Site | null>(null);
  const [transactionsView, setTransactionsView] = useState<'table' | 'tree' | 'flow'>('table');

  // Analytics State
  const [selectedSiteForAnalytics, setSelectedSiteForAnalytics] = useState<Site | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<'equipment' | 'consumables'>('equipment');
  const [selectedAssetForDetails, setSelectedAssetForDetails] = useState<{ site: Site, asset: Asset } | null>(null);
  // Use AppData Context to avoid redundant fetching
  const {
    employees, setEmployees,
    vehicles, setVehicles,
    sites, setSites,
    companySettings, setCompanySettings,
    siteTransactions, setSiteTransactions,
    equipmentLogs, setEquipmentLogs,
    quickCheckouts, setQuickCheckouts,
    refreshAllData
  } = useAppData();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [waybills, setWaybills] = useState<Waybill[]>([]);
  const [consumableLogs, setConsumableLogs] = useState<ConsumableUsageLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);

  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [showAuditDateDialog, setShowAuditDateDialog] = useState(false);
  const [auditStartDate, setAuditStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [auditEndDate, setAuditEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const { getSiteInventory, siteInventory } = useSiteInventory(waybills, assets);

  // Initialize data on mount if needed (AppDataContext handles its own loading, but we might want to ensure freshness)
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Load assets from database
  useEffect(() => {
    (async () => {
      try {
        const loadedAssets = await dataService.assets.getAssets();
        const processedAssets = loadedAssets.map((item: any) => {
          const asset = {
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
            siteQuantities: item.siteQuantities || item.site_quantities ? (typeof item.site_quantities === 'string' ? JSON.parse(item.site_quantities) : item.siteQuantities || {}) : {}
          };
          return asset;
        });
        logger.info('Loaded assets from dataService', { data: { count: processedAssets.length } });
        setAssets(processedAssets);
      } catch (error) {
        logger.error('Failed to load assets from database', error);
      }
    })();

    // Listen for asset refresh events from bulk operations
    const handleRefreshAssets = (event: CustomEvent) => {
      if (event.detail) {
        setAssets(event.detail);
      }
    };

    window.addEventListener('refreshAssets', handleRefreshAssets as EventListener);

    return () => {
      window.removeEventListener('refreshAssets', handleRefreshAssets as EventListener);
    };
  }, []);

  // Load waybills from database
  useEffect(() => {
    (async () => {
      try {
        const loadedWaybills = await dataService.waybills.getWaybills();
        logger.info("Loaded waybills from DB", { data: { count: loadedWaybills.length } });
        setWaybills(loadedWaybills.map((item: any) => ({
          ...item,
          issueDate: new Date(item.issueDate),
          expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
          sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        })));
      } catch (error) {
        logger.error('Failed to load waybills from database', error);
      }
    })();
  }, []);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Load consumable and maintenance logs from database
  useEffect(() => {
    (async () => {
      try {
        const loadedConsumableLogs = await dataService.consumableLogs.getConsumableLogs();
        setConsumableLogs(loadedConsumableLogs);

        const loadedMaintenanceLogs = await dataService.maintenanceLogs.getMaintenanceLogs();
        setMaintenanceLogs(loadedMaintenanceLogs);
      } catch (error) {
        logger.error('Failed to load logs', error);
      }
    })();
  }, []);



  // Listen for PDF/Audit export triggers from AppMenuBar
  // Placed here to ensure all dependencies (assets, companySettings) are initialized (avoid TDZ)
  useEffect(() => {
    const handlePDFExportTrigger = () => {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please login to export data",
          variant: "destructive"
        });
        return;
      }

      // Dynamically import to keep bundle size efficient if not used often
      import("@/components/assets/InventoryReport").then(({ exportAssetsToPDF }) => {
        exportAssetsToPDF(assets, companySettings, "Full Inventory Report").then(() => {
          toast({
            title: "Export Complete",
            description: "Inventory report has been generated as PDF."
          });
        });
      });
    };

    const handleAuditExportTrigger = () => {
      if (!isAuthenticated) {
        toast({
          title: "Authentication Required",
          description: "Please login to export data",
          variant: "destructive"
        });
        return;
      }

      // Only admin users can generate audit reports
      if (currentUser?.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "Only administrators can generate audit reports",
          variant: "destructive"
        });
        return;
      }

      // Show date selection dialog first
      setShowAuditDateDialog(true);
    };

    window.addEventListener('trigger-pdf-export', handlePDFExportTrigger as EventListener);
    window.addEventListener('trigger-audit-export', handleAuditExportTrigger as EventListener);

    return () => {
      window.removeEventListener('trigger-pdf-export', handlePDFExportTrigger as EventListener);
      window.removeEventListener('trigger-audit-export', handleAuditExportTrigger as EventListener);
    };
  }, [isAuthenticated, assets, companySettings]);

  // Handle Audit Generation Process (Auto-run when dialog opens)
  useEffect(() => {
    if (isGeneratingAudit) {
      const generate = async () => {
        try {
          // Wait for charts to render (Recharts animations need time or a tick)
          await new Promise(resolve => setTimeout(resolve, 1500));

          const element = document.getElementById('audit-charts-container');
          let chartImage = undefined;

          if (element) {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(element, { scale: 2 });
            chartImage = canvas.toDataURL('image/png');
          }

          const { generateAuditReport } = await import("@/utils/auditReportGenerator");
          await generateAuditReport({
            startDate: new Date(auditStartDate),
            endDate: new Date(auditEndDate),
            companySettings,
            assets,
            waybills,
            sites,
            employees,
            checkouts: quickCheckouts,
            equipmentLogs,
            consumableLogs,
            siteInventory: new Map(),
            chartImage
          });

          toast({
            title: "Operations Audit Generated",
            description: `Audit report for ${auditStartDate} to ${auditEndDate} has been saved.`
          });
        } catch (error) {
          logger.error("Failed to generate audit report", error);
          toast({
            title: "Generation Failed",
            description: "Failed to generate report visuals.",
            variant: "destructive"
          });
        } finally {
          setIsGeneratingAudit(false);
        }
      };

      generate();
    }
  }, [isGeneratingAudit, auditStartDate, auditEndDate, assets, waybills, sites, employees, quickCheckouts, equipmentLogs, consumableLogs, companySettings]);









  const handleAddAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to add assets",
        variant: "destructive"
      });
      return;
    }

    // Database check handled by dataService

    const newAsset: Asset = {
      ...assetData,
      id: Date.now().toString(),
      status: assetData.status || 'active',
      condition: assetData.condition || 'good',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Save to database
      const savedAsset = await dataService.assets.createAsset(newAsset);

      // Update local state with the saved asset
      setAssets(prev => [...prev, savedAsset]);
      setActiveTab("assets");

      await logActivity({
        action: 'create',
        entity: 'asset',
        entityId: savedAsset.id,
        details: `Created asset ${savedAsset.name}`
      });

      toast({
        title: "Asset Added",
        description: `${newAsset.name} has been added successfully`
      });
    } catch (error) {
      logger.error('Failed to add asset', error);
      toast({
        title: "Error",
        description: `Failed to add asset: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleEditAsset = (asset: Asset) => setEditingAsset(asset);

  const handleDeleteAsset = (asset: Asset) => setDeletingAsset(asset);

  const handleSaveAsset = async (updatedAsset: Asset) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to edit assets",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot edit assets while offline",
        variant: "destructive"
      });
      return;
    }

    const assetWithUpdatedDate = {
      ...updatedAsset,
      availableQuantity: !updatedAsset.siteId ? calculateAvailableQuantity(
        updatedAsset.quantity,
        updatedAsset.reservedQuantity,
        updatedAsset.damagedCount,
        updatedAsset.missingCount,
        updatedAsset.usedCount
      ) : updatedAsset.availableQuantity,
      updatedAt: new Date()
    };

    try {
      // Update in database first
      await dataService.assets.updateAsset(updatedAsset.id, assetWithUpdatedDate);

      // Then update local state
      setAssets(prev =>
        prev.map(asset => (asset.id === updatedAsset.id ? assetWithUpdatedDate : asset))
      );
      setEditingAsset(null);

      await logActivity({
        action: 'update',
        entity: 'asset',
        entityId: updatedAsset.id,
        details: `Updated asset ${updatedAsset.name}`
      });

      toast({
        title: "Asset Updated",
        description: `${assetWithUpdatedDate.name} has been updated successfully`
      });
    } catch (error) {
      logger.error('Failed to update asset in database', error);
      toast({
        title: "Error",
        description: "Failed to update asset in database",
        variant: "destructive"
      });
    }
  };

  const confirmDeleteAsset = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to delete assets",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot delete assets while offline",
        variant: "destructive"
      });
      return;
    }

    if (deletingAsset) {
      try {
        // Delete from database first
        await dataService.assets.deleteAsset(deletingAsset.id);

        // Then remove from local state
        setAssets(prev => prev.filter(asset => asset.id !== deletingAsset.id));
        setDeletingAsset(null);

        await logActivity({
          action: 'delete',
          entity: 'asset',
          entityId: deletingAsset.id,
          details: `Deleted asset ${deletingAsset.name}`
        });

        toast({
          title: "Asset Deleted",
          description: `${deletingAsset.name} has been deleted successfully`
        });
      } catch (error) {
        logger.error('Failed to delete asset from database', error);
        toast({
          title: "Error",
          description: "Failed to delete asset from database",
          variant: "destructive"
        });
      }
    }
  };

  const handleCreateWaybill = async (waybillData: Partial<Waybill>) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to create waybills",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot create waybills while offline",
        variant: "destructive"
      });
      return;
    }



    // Generate sequential waybill ID (client-side approximation, race condition possible but acceptable for now)
    // Ideally backend does this.
    // For now, we trust the count.
    const waybillCount = waybills.filter(wb => wb.type === 'waybill').length + 1;
    const waybillId = `WB${waybillCount.toString().padStart(3, '0')}`;

    const newWaybill: Waybill = {
      ...waybillData,
      id: waybillId,
      issueDate: waybillData.issueDate || new Date(),
      status: waybillData.status || 'outstanding',
      service: waybillData.service || 'dewatering',
      type: 'waybill',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser?.name || 'Unknown User',
      items: (waybillData.items || []).map(item => ({
        ...item,
        status: item.status || 'outstanding'
      }))
    } as Waybill;

    try {
      // 1. Create Waybill
      await dataService.waybills.createWaybill(newWaybill);

      // 2. Reserve Assets
      for (const item of newWaybill.items) {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const newReserved = (asset.reservedQuantity || 0) + item.quantity;
          const updatedAsset = {
            ...asset,
            reservedQuantity: newReserved,
            // Update available quantity (Total - Reserved - Damaged - Missing - Used)
            // Assuming Site Quantities are NOT part of Reserved in this logic (Reserved = Pending)
            updatedAt: new Date()
          };
          // Recalculate available if we could, but let's trust the component to re-render or pull fresh

          await dataService.assets.updateAsset(asset.id, updatedAsset);
        }
      }

      // Reload all assets to be safe
      const loadedAssets = await dataService.assets.getAssets();
      setAssets(loadedAssets);
      setWaybills(prev => [...prev, newWaybill]);

      setShowWaybillDocument(newWaybill);
      setActiveTab("waybills");

      await logActivity({
        action: 'create',
        entity: 'waybill',
        entityId: newWaybill.id,
        details: `Created waybill ${newWaybill.id} with ${newWaybill.items.length} items`
      });

      toast({
        title: "Waybill Created",
        description: `Waybill ${newWaybill.id} created successfully`
      });
    } catch (error) {
      logger.error('Failed to create waybill', error);
      toast({
        title: "Error",
        description: `Failed to create waybill: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteWaybill = async (waybill: Waybill) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to delete waybills",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot delete waybills while offline",
        variant: "destructive"
      });
      return;
    }

    if (waybill.type === 'return') {
      if (waybill.status !== 'outstanding') {
        toast({
          title: "Cannot Delete",
          description: `Processed returns cannot be deleted.`,
          variant: "destructive"
        });
        return;
      }

      try {
        await dataService.waybills.deleteWaybill(waybill.id);
        setWaybills(prev => prev.filter(wb => wb.id !== waybill.id));

        await logActivity({
          action: 'delete',
          entity: 'waybill',
          entityId: waybill.id,
          details: `Deleted return waybill ${waybill.id}`
        });

        toast({
          title: "Return Deleted",
          description: `Return ${waybill.id} deleted successfully.`
        });
      } catch (error) {
        logger.error('Failed to delete return waybill', error);
        toast({
          title: "Error",
          description: "Failed to delete return waybill",
          variant: "destructive"
        });
      }
    } else {
      // Regular Waybill
      try {
        // Revert Stock Changes
        if (waybill.status === 'outstanding') {
          // Un-reserve
          for (const item of waybill.items) {
            const asset = assets.find(a => a.id === item.assetId);
            if (asset) {
              const newReserved = Math.max(0, (asset.reservedQuantity || 0) - item.quantity);
              await dataService.assets.updateAsset(asset.id, {
                ...asset,
                reservedQuantity: newReserved,
                updatedAt: new Date()
              });
            }
          }
        } else if (waybill.status === 'open' || (waybill as any).status === 'sent_to_site') {
          // Was sent to site. Revert: Remove from site.
          // Assumes "Sent" means it moved from "Reserved" to "Site".
          // So deleting it means "It never happened", so return to Free Stock?
          // Yes, remove from site quantites.
          for (const item of waybill.items) {
            const asset = assets.find(a => a.id === item.assetId);
            if (asset) {
              const siteQuantities = asset.siteQuantities || {};
              // Parse if string (legacy)
              const parsedSiteQuantities = typeof siteQuantities === 'string' ? JSON.parse(siteQuantities) : { ...siteQuantities };

              const currentSiteQty = parsedSiteQuantities[waybill.siteId] || 0;
              const newSiteQty = Math.max(0, currentSiteQty - item.quantity);

              if (newSiteQty === 0) {
                delete parsedSiteQuantities[waybill.siteId];
              } else {
                parsedSiteQuantities[waybill.siteId] = newSiteQty;
              }

              await dataService.assets.updateAsset(asset.id, {
                ...asset,
                siteQuantities: parsedSiteQuantities,
                updatedAt: new Date()
              });
            }
          }

          // Also delete site transactions?
          // dataService doesn't have deleteSiteTransaction by waybillId easily... 
          // We might leave orphaned transactions or clean up later.
        }

        await dataService.waybills.deleteWaybill(waybill.id);

        // Reload Assets
        const loadedAssets = await dataService.assets.getAssets();
        setAssets(loadedAssets);
        setWaybills(prev => prev.filter(wb => wb.id !== waybill.id));

        await logActivity({
          action: 'delete',
          entity: 'waybill',
          entityId: waybill.id,
          details: `Deleted waybill ${waybill.id}`
        });

        toast({
          title: "Waybill Deleted",
          description: `Waybill ${waybill.id} deleted successfully`
        });
      } catch (error) {
        logger.error('Failed to delete waybill', error);
        toast({
          title: "Error",
          description: "Failed to delete waybill",
          variant: "destructive"
        });
      }
    }
  };

  const handleSentToSite = async (waybill: Waybill, sentToSiteDate: Date) => {
    try {
      // 1. Update items: Add to Site (keep reserved status)
      for (const item of waybill.items) {
        // Fetch fresh asset
        const fetchedAssets = await dataService.assets.getAssets(); // Inefficient but safe
        const asset = fetchedAssets.find(a => a.id === item.assetId);

        if (asset) {
          // Keep reservedQuantity the same - items are still reserved, just at the site now
          const siteQuantities = asset.siteQuantities || {};
          const parsedSiteQuantities = typeof siteQuantities === 'string' ? JSON.parse(siteQuantities) : { ...siteQuantities };

          const currentSiteQty = parsedSiteQuantities[waybill.siteId] || 0;
          parsedSiteQuantities[waybill.siteId] = currentSiteQty + item.quantity;

          await dataService.assets.updateAsset(asset.id, {
            ...asset,
            // reservedQuantity stays the same - items remain reserved
            siteQuantities: parsedSiteQuantities,
            updatedAt: new Date()
          });
        }
      }

      // 2. Update Waybill
      const updatedWaybill = {
        ...waybill,
        status: 'open' as const, // 'open' means active at site
        sentToSiteDate: sentToSiteDate,
        updatedAt: new Date()
      };
      await dataService.waybills.updateWaybill(waybill.id, updatedWaybill);

      // 3. Create Site Transactions (one per item)
      for (const item of waybill.items) {
        await dataService.siteTransactions.createSiteTransaction({
          id: `${Date.now()}-${item.assetId}`, // Unique ID per item
          siteId: waybill.siteId,
          assetId: item.assetId,
          assetName: item.assetName,
          quantity: item.quantity,
          type: 'in',
          referenceId: waybill.id,
          referenceType: 'waybill',
          transactionType: 'waybill',
          createdAt: new Date(),
          createdBy: currentUser?.name
        });
      }

      // Reload
      const loadedAssets = await dataService.assets.getAssets();
      setAssets(loadedAssets);

      const loadedWaybills = await dataService.waybills.getWaybills();
      setWaybills(loadedWaybills);

      const loadedTransactions = await dataService.siteTransactions.getSiteTransactions();
      setSiteTransactions(loadedTransactions);

      if (showWaybillDocument && showWaybillDocument.id === waybill.id) {
        setShowWaybillDocument(updatedWaybill);
      }

      await logActivity({
        action: 'move',
        entity: 'waybill',
        entityId: waybill.id,
        details: `Sent waybill ${waybill.id} to site`
      });

      toast({
        title: "Waybill Sent to Site",
        description: `Waybill ${waybill.id} has been sent to site successfully`,
      });
    } catch (error) {
      logger.error('Failed to send waybill to site', error);
      toast({
        title: "Error",
        description: `Failed to send waybill to site: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleCreateReturnWaybill = async (waybillData: {
    siteId: string;
    returnToSiteId?: string;
    items: WaybillItem[];
    driverName: string;
    vehicle: string;
    purpose: string;
    service: string;
    expectedReturnDate?: Date;
  }) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to create return waybills",
        variant: "destructive"
      });
      return;
    }

    // Warnings/Errors logic similar to before...
    const warnings: string[] = [];
    const errors: string[] = [];
    const currentSiteInventory = getSiteInventory(waybillData.siteId);

    waybillData.items.forEach(item => {
      // Pending returns logic...
      const pendingReturns = waybills.filter(wb =>
        wb.type === 'return' &&
        wb.status === 'outstanding' &&
        wb.siteId === waybillData.siteId &&
        wb.items.some(wbItem => wbItem.assetId === item.assetId)
      );

      const pendingQty = pendingReturns.reduce((sum, wb) => {
        const wbItem = wb.items.find(i => i.assetId === item.assetId);
        const unreturnedQty = (wbItem?.quantity || 0) - (wbItem?.returnedQuantity || 0);
        return sum + unreturnedQty;
      }, 0);

      const siteItem = currentSiteInventory.find(si => si.assetId === item.assetId);
      const currentSiteQty = siteItem?.quantity || 0;
      const effectiveAvailable = currentSiteQty - pendingQty;

      if (pendingQty > 0) {
        warnings.push(`${item.assetName} (${pendingQty} quantity) already has pending return(s).`);
      }

      if (effectiveAvailable < item.quantity) {
        errors.push(`Quantity exceeds site availability for ${item.assetName}.`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Return Error",
        description: errors.join(' '),
        variant: "destructive"
      });
      return;
    }

    if (warnings.length > 0) {
      toast({
        title: "Return Warning",
        description: warnings.join(' '),
        variant: "default"
      });
    }

    // Generate ID
    const returnCount = waybills.filter(wb => wb.type === 'return').length + 1;
    const returnId = `RB${returnCount.toString().padStart(3, '0')}`;

    const newReturnWaybill = {
      id: returnId,
      items: waybillData.items.map(item => ({
        ...item,
        status: item.status || 'outstanding'
      })) as WaybillItem[],
      siteId: waybillData.siteId,
      returnToSiteId: waybillData.returnToSiteId,
      driverName: waybillData.driverName,
      vehicle: waybillData.vehicle,
      issueDate: new Date(),
      expectedReturnDate: waybillData.expectedReturnDate,
      purpose: waybillData.purpose,
      service: waybillData.service || 'dewatering',
      status: 'outstanding' as const,
      type: 'return' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: currentUser?.name || 'Unknown User'
    } as Waybill;

    try {
      await dataService.waybills.createWaybill(newReturnWaybill);

      setWaybills(prev => [...prev, newReturnWaybill]);
      setShowReturnWaybillDocument(newReturnWaybill);
      setActiveTab("returns");

      await logActivity({
        action: 'create',
        entity: 'waybill',
        entityId: newReturnWaybill.id,
        details: `Created return waybill ${newReturnWaybill.id}`
      });

      toast({
        title: "Return Waybill Created",
        description: `Return waybill ${newReturnWaybill.id} created successfully.`
      });
    } catch (error) {
      logger.error('Failed to create return waybill', error);
      toast({
        title: "Error",
        description: `Failed to create return waybill`,
        variant: "destructive"
      });
    }
  };

  const handleUpdateReturnWaybill = (updatedData: {
    id?: string;
    siteId: string;
    returnToSiteId?: string;
    items: WaybillItem[];
    driverName: string;
    vehicle: string;
    purpose: string;
    service: string;
    expectedReturnDate?: Date;
  }) => {
    if (!updatedData.id) {
      toast({
        title: "Error",
        description: "Waybill ID is required for update.",
        variant: "destructive"
      });
      return;
    }

    setWaybills(prev => prev.map(wb => {
      if (wb.id === updatedData.id) {
        // Update items quantities, preserve returnedQuantity and status
        const updatedItems = wb.items.map(existingItem => {
          const updatedItem = updatedData.items.find(uItem => uItem.assetId === existingItem.assetId);
          if (updatedItem) {
            return {
              ...existingItem,
              quantity: updatedItem.quantity,
              assetName: updatedItem.assetName // in case name changed, but unlikely
            };
          }
          return existingItem;
        });

        return {
          ...wb,
          ...updatedData,
          items: updatedItems,
          returnToSiteId: updatedData.returnToSiteId,
          updatedAt: new Date()
        };
      }
      return wb;
    }));

    setEditingReturnWaybill(null);

    toast({
      title: "Return Waybill Updated",
      description: `Return waybill ${updatedData.id} updated successfully.`
    });
  };

  const handleViewWaybill = (waybill: Waybill) => {
    if (waybill.type === 'return') {
      setShowReturnWaybillDocument(waybill);
    } else {
      setShowWaybillDocument(waybill);
    }
  };

  const handleViewReturnWaybill = (waybill: Waybill) => {
    setShowReturnWaybillDocument(waybill);
  };

  const handleEditWaybill = (waybill: Waybill) => {
    if (!isAuthenticated) return;

    if (waybill.type === 'return' && waybill.status === 'outstanding') {
      setEditingReturnWaybill(waybill);
    } else {
      setEditingWaybill(waybill);
    }
  };

  const handleInitiateReturn = (waybill: Waybill) => {
    setShowReturnForm(waybill);
  };

  const handleOpenReturnDialog = (returnData: { waybillId: string; items: WaybillItem[] }) => {
    const waybill = waybills.find(wb => wb.id === returnData.waybillId);
    if (waybill) {
      setProcessingReturnWaybill(waybill);
    }
  };

  // --- Reporting & Transactions Handlers ---
  const handleGenerateReport = (site: Site) => {
    setSelectedSiteForReport(site);
    setShowReportTypeDialog(true);
  };

  const generateReport = async (assetsToReport: Asset[], title: string) => {
    if (!companySettings) return;

    // Calculate summary statistics
    const totalAssets = assetsToReport.length;
    // Use site quantity for total quantity calculation
    const totalQuantity = assetsToReport.reduce((sum, asset) => {
      const siteQty = asset.siteQuantities?.[selectedSiteForReport!.id] || 0;
      return sum + siteQty;
    }, 0);
    const totalValue = assetsToReport.reduce((sum, asset) => {
      const siteQty = asset.siteQuantities?.[selectedSiteForReport!.id] || 0;
      return sum + (asset.cost * siteQty);
    }, 0);

    // Transform data for unified generator
    const reportData = assetsToReport.map(asset => {
      const siteQty = asset.siteQuantities?.[selectedSiteForReport!.id] || 0;
      return {
        name: asset.name,
        description: asset.description || '-',
        quantity: siteQty,
        unit: asset.unitOfMeasurement,
        category: asset.category,
        type: asset.type,
        status: asset.status,
        condition: asset.condition,
        cost: asset.cost || 0
      };
    });

    await generateUnifiedReport({
      title: 'Site Materials Report',
      subtitle: title,
      reportType: 'MATERIALS ON SITE',
      companySettings: companySettings,
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
        { label: 'Total Value', value: `NGN ${totalValue.toFixed(2)}` }
      ]
    });
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
    if (selectedSiteForReport && companySettings) {
      const reportTransactions = siteTransactions
        .filter(t => t.siteId === selectedSiteForReport.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const reportData = reportTransactions.map(transaction => ({
        createdAt: new Date(transaction.createdAt).toLocaleString(),
        type: transaction.type.toUpperCase(),
        assetName: transaction.assetName,
        quantity: transaction.quantity,
        reference: transaction.referenceId || '-',
        notes: transaction.notes || '-'
      }));

      await generateUnifiedReport({
        title: 'Site Transactions Report',
        subtitle: `Transactions for ${selectedSiteForReport.name}`,
        reportType: 'SITE TRANSACTIONS',
        companySettings: companySettings,
        orientation: 'portrait',
        columns: [
          { header: 'Date', dataKey: 'createdAt', width: 40 },
          { header: 'Type', dataKey: 'type', width: 20 },
          { header: 'Asset', dataKey: 'assetName', width: 40 },
          { header: 'Quantity', dataKey: 'quantity', width: 20 },
          { header: 'Reference', dataKey: 'reference', width: 30 },
          { header: 'Notes', dataKey: 'notes', width: 40 }
        ],
        data: reportData,
        summaryStats: [
          { label: 'Total Transactions', value: reportTransactions.length }
        ]
      });
      setShowReportTypeDialog(false);
    }
  };

  const handleViewAnalytics = (site: Site, tab: 'equipment' | 'consumables') => {
    setSelectedSiteForAnalytics(site);
    setAnalyticsTab(tab);
    setCurrentView('site-analytics');
    setActiveTab('site-analytics'); // Ensure activeTab is also set
  };

  const handleViewAssetDetails = (site: Site, asset: Asset) => {
    setSelectedAssetForDetails({ site, asset });
    setCurrentView('site-asset-details');
    setActiveTab('site-asset-details'); // Ensure activeTab is also set
  };

  const handleShowTransactions = (site: Site) => {
    setSelectedSiteForTransactions(site);
    setCurrentView('view-site-transactions');
    setActiveTab('view-site-transactions');
  };

  const handleProcessReturn = async (returnData: { waybillId: string; items: ReturnItem[] }) => {
    // Get the return waybill
    const returnWaybill = waybills.find(wb => wb.id === returnData.waybillId);
    if (!returnWaybill) return;

    // Validate quantities (Site inventory logic) - simplified for brevity, similar to before

    try {
      // 1. Update Return Waybill Items (track returnedQuantity)
      const updatedItems = returnWaybill.items.map(item => {
        const returned = returnData.items.find(ri => ri.assetId === item.assetId);
        if (returned) {
          return {
            ...item,
            returnedQuantity: (item.returnedQuantity || 0) + returned.quantity,
            status: ((item.returnedQuantity || 0) + returned.quantity) >= item.quantity ? 'completed' : 'outstanding'
          };
        }
        return item;
      });

      const allCompleted = updatedItems.every(i => (i.returnedQuantity || 0) >= i.quantity);
      const updatedWaybill = {
        ...returnWaybill,
        items: updatedItems,
        status: allCompleted ? 'completed' : 'outstanding',
        updatedAt: new Date()
      } as Waybill;

      await dataService.waybills.updateWaybill(returnWaybill.id, updatedWaybill);

      // 2. Update Assets (Remove from Site, Unreserve)
      // When items return from site:
      // - Decrease siteQuantities (no longer at site)
      // - Decrease reservedQuantity (no longer reserved)
      // - Items become available again in warehouse

      for (const item of returnData.items) {
        const fetchedAssets = await dataService.assets.getAssets();
        const asset = fetchedAssets.find(a => a.id === item.assetId);

        if (asset) {
          // Decrease site quantities
          const siteQuantities = asset.siteQuantities || {};
          const parsedSiteQuantities = typeof siteQuantities === 'string' ? JSON.parse(siteQuantities) : { ...siteQuantities };

          const currentSiteQty = parsedSiteQuantities[returnWaybill.siteId] || 0;
          const newSiteQty = Math.max(0, currentSiteQty - item.quantity);

          if (newSiteQty === 0) {
            delete parsedSiteQuantities[returnWaybill.siteId];
          } else {
            parsedSiteQuantities[returnWaybill.siteId] = newSiteQty;
          }

          // Decrease reserved quantity (items were reserved when sent to site)
          const currentReserved = asset.reservedQuantity || 0;
          const newReserved = Math.max(0, currentReserved - item.quantity);

          await dataService.assets.updateAsset(asset.id, {
            ...asset,
            reservedQuantity: newReserved,
            siteQuantities: parsedSiteQuantities,
            updatedAt: new Date()
          });
        }
      }

      // 3. Create Site Transactions (Return - one per item)
      for (const item of returnData.items) {
        await dataService.siteTransactions.createSiteTransaction({
          id: `${Date.now()}-${item.assetId}`,
          siteId: returnWaybill.siteId,
          assetId: item.assetId,
          assetName: item.assetName,
          quantity: item.quantity,
          type: 'out',
          referenceId: returnWaybill.id,
          referenceType: 'return_waybill',
          transactionType: 'return',
          condition: item.condition,
          createdAt: new Date(),
          createdBy: currentUser?.name
        });
      }

      // Reload
      const loadedAssets = await dataService.assets.getAssets();
      setAssets(loadedAssets);
      const loadedWaybills = await dataService.waybills.getWaybills();
      setWaybills(loadedWaybills);

      toast({
        title: "Return Processed",
        description: "Return has been successfully processed.",
      });

    } catch (error) {
      logger.error('Error processing return:', error);
      toast({
        title: "Error",
        description: "Failed to process return",
        variant: "destructive"
      });
    }
  };

  const handleQuickCheckout = async (checkoutData: Omit<QuickCheckout, 'id'>) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to checkout items",
        variant: "destructive"
      });
      return;
    }

    if (!isOnline) {
      toast({
        title: "Offline Mode",
        description: "Cannot checkout items while offline",
        variant: "destructive"
      });
      return;
    }

    const newCheckout: QuickCheckout = {
      ...checkoutData,
      id: Date.now().toString(),
      returnedQuantity: 0,
      status: 'outstanding'
    };

    try {
      // Use dataService for persistence (handles Supabase/Electron internally)
      const savedCheckout = await dataService.quickCheckouts.createQuickCheckout(newCheckout);

      setAssets(prev => prev.map(asset => {
        if (asset.id === checkoutData.assetId) {
          const newReservedQuantity = (asset.reservedQuantity || 0) + checkoutData.quantity;
          const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
          const totalQuantity = asset.quantity + totalAtSites;
          // Optimistic update
          const updatedAsset = {
            ...asset,
            reservedQuantity: newReservedQuantity,
            availableQuantity: totalQuantity - newReservedQuantity - (asset.damagedCount || 0) - (asset.missingCount || 0) - (asset.usedCount || 0),
            updatedAt: new Date()
          };

          // Persist asset update
          dataService.assets.updateAsset(Number(asset.id), updatedAsset)
            .catch(err => logger.error("Failed to update asset for checkout", err));

          return updatedAsset;
        }
        return asset;
      }));

      setQuickCheckouts(prev => [savedCheckout, ...prev]);

      await logActivity({
        action: 'checkout',
        entity: 'asset',
        entityId: checkoutData.assetId,
        details: `Checked out ${checkoutData.quantity} ${checkoutData.assetName} to ${checkoutData.employee}`
      });

      toast({
        title: "Checkout Successful",
        description: `${checkoutData.quantity} ${checkoutData.assetName} checked out to ${checkoutData.employee}`
      });

    } catch (error) {
      logger.error('Failed to process quick checkout', error);
      toast({
        title: "Checkout Failed",
        description: "Failed to save checkout record.",
        variant: "destructive"
      });
    }
  };

  const handleUpdateCheckoutStatus = async (checkoutId: string, status: 'return_completed' | 'used' | 'lost' | 'damaged', quantity?: number) => {
    if (!isAuthenticated) return;

    const checkout = quickCheckouts.find(c => c.id === checkoutId);
    if (!checkout) return;

    // Default to remaining quantity if not specified
    const qtyToUpdate = quantity || (checkout.quantity - (checkout.returnedQuantity || 0));

    if (qtyToUpdate <= 0) return;

    const newReturnedQuantity = (checkout.returnedQuantity || 0) + qtyToUpdate;
    const isFullyReturned = newReturnedQuantity >= checkout.quantity;
    const newStatus = isFullyReturned ? status : 'outstanding';
    const returnDate = isFullyReturned ? new Date() : checkout.returnDate;

    try {
      // Update Checkout in DB
      const updatedCheckout: QuickCheckout = {
        ...checkout,
        returnedQuantity: newReturnedQuantity,
        status: newStatus,
        returnDate: returnDate
      };

      // Update Checkout in DB
      await dataService.quickCheckouts.updateQuickCheckout(checkout.id, updatedCheckout);

      setQuickCheckouts(prev => prev.map(c => c.id === checkoutId ? updatedCheckout : c));

      // Update Asset Inventory
      setAssets(prev => prev.map(asset => {
        if (asset.id === checkout.assetId) {
          // Logic: checkout reserved the quantity. 
          // Processing means we reduce reserved quantity.
          // Where it goes depends on status:
          // - return_completed: back to available. (Just reduce reserved).
          // - used: Consumed. Reduce total quantity AND reserved.
          // - lost: Missing. Reduce reserved, Increase missingCount.
          // - damaged: Damaged. Reduce reserved, Increase damagedCount.

          const newReserved = Math.max(0, (asset.reservedQuantity || 0) - qtyToUpdate);
          let newTotal = asset.quantity;
          let newDamaged = asset.damagedCount || 0;
          let newMissing = asset.missingCount || 0;
          let newUsed = asset.usedCount || 0;

          if (status === 'used') {
            // New logic: Do NOT reduce total quantity. Increase usedCount.
            newUsed += qtyToUpdate;
            // newTotal remains same
          } else if (status === 'lost') {
            newMissing += qtyToUpdate;
          } else if (status === 'damaged') {
            newDamaged += qtyToUpdate;
          }
          // for return_completed, we just reduce reserved, so avail increases automatically.

          const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
          const totalWithSites = newTotal + totalAtSites;

          const updatedAssetData: Asset = {
            ...asset,
            quantity: newTotal,
            reservedQuantity: newReserved,
            damagedCount: newDamaged,
            missingCount: newMissing,
            usedCount: newUsed,
            availableQuantity: totalWithSites - newReserved - newDamaged - newMissing - newUsed,
            updatedAt: new Date()
          };

          dataService.assets.updateAsset(asset.id, updatedAssetData)
            .catch(e => logger.error("Failed to update asset after return", e));
          return updatedAssetData;
        }
        return asset;
      }));

      await logActivity({
        action: 'return',
        entity: 'checkout',
        entityId: checkoutId,
        details: `Updated checkout status to ${status} for ${qtyToUpdate} items`
      });

      toast({
        title: "Status Updated",
        description: `Item marked as ${status} (${qtyToUpdate})`
      });

    } catch (err) {
      logger.error("Failed to update checkout status", err);
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const handleDeleteCheckout = async (checkoutId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to delete checkout items",
        variant: "destructive"
      });
      return;
    }

    const checkout = quickCheckouts.find(c => c.id === checkoutId);
    if (!checkout) return;

    try {
      // Restore inventory if items haven't been returned yet
      const qtyToRestore = checkout.quantity - (checkout.returnedQuantity || 0);

      if (qtyToRestore > 0) {
        setAssets(prev => prev.map(asset => {
          if (asset.id === checkout.assetId) {
            const newReserved = Math.max(0, (asset.reservedQuantity || 0) - qtyToRestore);

            // Calculate updated available quantity
            const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
            const totalQuantity = asset.quantity + totalAtSites;

            const updatedAsset = {
              ...asset,
              reservedQuantity: newReserved,
              availableQuantity: totalQuantity - newReserved - (asset.damagedCount || 0) - (asset.missingCount || 0) - (asset.usedCount || 0),
              updatedAt: new Date()
            };

            // Persist asset update
            // Persist asset update
            dataService.assets.updateAsset(asset.id, updatedAsset)
              .catch(e => logger.error("Failed to update asset for checkout deletion", e));

            return updatedAsset;
          }
          return asset;
        }));
      }

      await dataService.quickCheckouts.deleteQuickCheckout(checkoutId);
      setQuickCheckouts(prev => prev.filter(c => c.id !== checkoutId));

      await logActivity({
        action: 'delete',
        entity: 'checkout',
        entityId: checkoutId,
        details: `Deleted checkout ${checkoutId}`
      });

      toast({
        title: "Checkout Deleted",
        description: `Checkout item deleted successfully`
      });
    } catch (err) {
      logger.error("Failed to delete checkout", err);
      toast({ title: "Error", description: "Failed to delete checkout", variant: "destructive" });
    }
  };

  const handleReturnItem = (checkoutId: string) => {
    handleUpdateCheckoutStatus(checkoutId, 'return_completed');
  };

  const handlePartialReturn = async (checkoutId: string, quantity: number, condition: 'good' | 'damaged' | 'missing' | 'used', notes?: string) => {
    const checkout = quickCheckouts.find(c => c.id === checkoutId);
    if (!checkout) return;

    const newReturnedQuantity = checkout.returnedQuantity + quantity;

    // Validation: Cannot return more than originally borrowed
    if (newReturnedQuantity > checkout.quantity) {
      toast({
        title: "Invalid Return Quantity",
        description: `Cannot return more than originally borrowed (${checkout.quantity}). Current returned: ${checkout.returnedQuantity}`,
        variant: "destructive"
      });
      return;
    }

    const isFullyReturned = newReturnedQuantity >= checkout.quantity;

    // Determine status based on condition if fully returned
    let finalStatus: QuickCheckout['status'] = 'return_completed';
    if (condition === 'used') finalStatus = 'used';
    else if (condition === 'missing') finalStatus = 'lost';
    else if (condition === 'damaged') finalStatus = 'damaged';

    const newStatus: QuickCheckout['status'] = isFullyReturned ? finalStatus : 'outstanding';

    const updatedCheckoutData: QuickCheckout = {
      ...checkout,
      returnedQuantity: newReturnedQuantity,
      status: newStatus,
      returnDate: isFullyReturned ? new Date() : checkout.returnDate,
      notes: notes || checkout.notes // Update notes if provided, otherwise keep existing
    };

    // DB Persistence: Update checkout
    // DB Persistence: Update checkout
    await dataService.quickCheckouts.updateQuickCheckout(checkoutId, updatedCheckoutData);

    // Update checkout state
    setQuickCheckouts(prev => prev.map(c =>
      c.id === checkoutId ? updatedCheckoutData : c
    ));

    // Update asset inventory based on condition
    setAssets(prev => prev.map(asset => {
      if (asset.id === checkout.assetId) {
        const newReservedQuantity = Math.max(0, (asset.reservedQuantity || 0) - quantity);
        const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
        const totalQuantity = asset.quantity + totalAtSites;

        let newDamagedCount = asset.damagedCount || 0;
        let newMissingCount = asset.missingCount || 0;
        let newUsedCount = asset.usedCount || 0;

        if (condition === 'damaged') {
          newDamagedCount += quantity;
        } else if (condition === 'missing') {
          newMissingCount += quantity;
        } else if (condition === 'used') {
          newUsedCount += quantity;
        }

        const updatedAsset = {
          ...asset,
          reservedQuantity: newReservedQuantity,
          damagedCount: newDamagedCount,
          missingCount: newMissingCount,
          usedCount: newUsedCount,
          availableQuantity: totalQuantity - newReservedQuantity - newDamagedCount - newMissingCount - newUsedCount,
          updatedAt: new Date()
        };

        // DB Persistence: Update Asset
        // DB Persistence: Update Asset
        dataService.assets.updateAsset(asset.id, updatedAsset)
          .catch(err => logger.error("Failed to update asset in partial return", err));

        return updatedAsset;
      }
      return asset;
    }));

    await logActivity({
      action: 'return',
      entity: 'checkout',
      entityId: checkoutId,
      details: `Partial return of ${quantity} items in ${condition} condition`
    });

    if (condition === 'used') {
      toast({
        title: "Item Marked as Used",
        description: `Item (${quantity}) has been used by ${checkout.employee}`
      });
    } else {
      toast({
        title: "Partial Return Processed",
        description: `${quantity} ${checkout.assetName} returned in ${condition} condition by ${checkout.employee}`
      });
    }
  };

  // Derive machines from assets for maintenance view
  const machines: Machine[] = assets
    .filter(a => a.type === 'equipment' && a.requiresLogging)
    .map(asset => {
      // Strategy 1: Check siteQuantities for current physical location (real-time tracking)
      // This ensures that when equipment is moved via waybill, the new location is reflected immediately
      let siteId = null;
      if (asset.siteQuantities) {
        // Find the site with quantity > 0
        const siteEntry = Object.entries(asset.siteQuantities).find(([_, qty]) => Number(qty) > 0);
        if (siteEntry) {
          siteId = siteEntry[0];
        }
      }

      // Strategy 2: Fallback to explicit siteId if no active site logs found
      if (!siteId && asset.siteId) {
        siteId = asset.siteId;
      }

      const site = sites.find(s => String(s.id) === String(siteId));
      const isWarehouse = site
        ? /warehouse|store|depot|head office/i.test(site.name)
        : /warehouse|store|depot|cupboard/i.test(asset.location || '');

      // Check logs for latest activity status
      const assetLogs = equipmentLogs
        .filter(log => log.equipmentId === asset.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastLog = assetLogs[0];
      const logSaysInactive = lastLog && !lastLog.active; // If log exists and active is false

      let status: 'active' | 'maintenance' | 'retired' | 'standby' | 'missing' | 'idle' = 'active';

      if (asset.status === 'maintenance') status = 'maintenance';
      else if (asset.status === 'damaged') status = 'maintenance'; // severe damage implies maintenance
      else if (asset.status === 'missing') status = 'missing';
      else if (isWarehouse) status = 'idle'; // Warehouse = Inactive/Idle
      else if (logSaysInactive) status = 'standby'; // On site but logged as inactive
      else if (asset.status === 'active') status = 'active';

      // Calculate deployment date
      let deploymentDate = asset.deploymentDate;

      // If active on a site, try to find the actual date it was sent there from waybills
      if (status === 'active' && site) {
        // Find latest waybill sending this asset to this site
        const relevantWaybill = waybills
          .filter(w => w.siteId === site.id && w.items && w.items.some(i => i.assetId === asset.id))
          .sort((a, b) => {
            const dateA = a.sentToSiteDate ? new Date(a.sentToSiteDate).getTime() : 0;
            const dateB = b.sentToSiteDate ? new Date(b.sentToSiteDate).getTime() : 0;
            return dateB - dateA;
          })[0];

        if (relevantWaybill && relevantWaybill.sentToSiteDate) {
          deploymentDate = relevantWaybill.sentToSiteDate;
        }
      }

      // Fallback
      if (!deploymentDate) {
        deploymentDate = asset.purchaseDate || asset.createdAt;
      }

      return {
        id: asset.id,
        name: asset.name,
        model: asset.model || 'N/A',
        serialNumber: (status === 'idle') ? undefined : (asset.serialNumber || 'N/A'), // Hide S/N if in warehouse/idle
        site: site ? site.name : (asset.location || 'Depot'),
        deploymentDate: deploymentDate instanceof Date ? deploymentDate : new Date(deploymentDate),
        status,
        operatingPattern: '24/7', // Default as per requirements
        serviceInterval: asset.serviceInterval || 2, // Default 2 months
        responsibleSupervisor: 'Unassigned',
        notes: asset.description || '',
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt
      };
    });

  const handleSubmitMaintenance = async (entries: any[]) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to log maintenance",
        variant: "destructive"
      });
      return;
    }

    try {
      for (const entry of entries) {
        // 1. Create Maintenance Log
        const log: MaintenanceLog = {
          ...entry,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date(),
          updatedAt: new Date()
        } as MaintenanceLog;

        await dataService.maintenanceLogs.createMaintenanceLog(log);

        // 2. Process Parts Usage
        if (entry.rawParts && entry.rawParts.length > 0) {
          for (const part of entry.rawParts) {
            const asset = assets.find(a => a.id === part.id);
            if (asset) {
              // Update Asset Counts
              const newUsedCount = (asset.usedCount || 0) + part.quantity;
              const updatedAsset = {
                ...asset,
                usedCount: newUsedCount,
                availableQuantity: calculateAvailableQuantity(
                  asset.quantity,
                  asset.reservedQuantity,
                  asset.damagedCount,
                  asset.missingCount,
                  newUsedCount
                ),
                updatedAt: new Date()
              };

              // Save asset update
              await dataService.assets.updateAsset(asset.id, updatedAsset);

              // Update local state for asset
              setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));

              // Create 'Used' Checkout Record for tracking
              const checkoutData = {
                assetId: asset.id,
                assetName: asset.name,
                id: Date.now().toString(), // Helper ID
                employee: entry.technician || 'Maintenance Technician',
                employeeId: 'MAINTENANCE',
                quantity: part.quantity,
                returnedQuantity: 0,
                checkoutDate: new Date(),
                status: 'used',
                notes: `Used in maintenance for machine: ${entry.machineId}. Work: ${entry.reason || entry.workDone}`,
                returnDate: new Date(),
                expectedReturnDays: 0,
              } as QuickCheckout;

              try {
                await dataService.quickCheckouts.createQuickCheckout(checkoutData);
              } catch (err) {
                console.error("Failed to create usage checkout record", err);
                // Non-blocking, main goal is asset deduction which is done above
              }
            }
          }
        }
      }

      await logActivity({
        action: 'create',
        entity: 'maintenance',
        details: `Logged maintenance for ${entries.length} machine(s)`
      });

      // Reload maintenance logs to update UI immediately
      const loadedLogs = await dataService.maintenanceLogs.getMaintenanceLogs();
      setMaintenanceLogs(loadedLogs);

      toast({
        title: "Maintenance Logged",
        description: `Successfully logged maintenance for ${entries.length} machine(s)`
      });
    } catch (error: any) {
      logger.error('Failed to save maintenance logs', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to save maintenance logs to database';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleUpdateQuickCheckoutStatus = async (checkoutId: string, status: QuickCheckout['status']) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to update status",
        variant: "destructive"
      });
      return;
    }

    try {
      const checkoutToUpdate = quickCheckouts.find(c => c.id === checkoutId);

      // If marking as used, we need to update asset inventory
      if (status === 'used' && checkoutToUpdate && checkoutToUpdate.status === 'outstanding') {
        const asset = assets.find(a => a.id === checkoutToUpdate.assetId);

        if (asset) {
          const newReserved = Math.max(0, (asset.reservedQuantity || 0) - checkoutToUpdate.quantity);
          const newUsed = (asset.usedCount || 0) + checkoutToUpdate.quantity;

          const newAvailable = calculateAvailableQuantity(
            asset.quantity,
            newReserved,
            asset.damagedCount,
            asset.missingCount,
            newUsed
          );

          const updatedAsset = {
            ...asset,
            reservedQuantity: newReserved,
            usedCount: newUsed,
            availableQuantity: newAvailable,
            updatedAt: new Date()
          };

          await dataService.assets.updateAsset(asset.id, updatedAsset);
          setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        }
      }

      await dataService.quickCheckouts.updateQuickCheckout(checkoutId, checkoutToUpdate ? { ...checkoutToUpdate, status } : { status });

      // Refresh checkouts
      const loadedCheckouts = await dataService.quickCheckouts.getQuickCheckouts();
      setQuickCheckouts(loadedCheckouts);

      toast({
        title: "Status Updated",
        description: `Item marked as ${status}`,
      });
    } catch (error) {
      logger.error('Failed to update status', error);
      toast({
        title: "Update Failed",
        description: "Could not update status",
        variant: "destructive"
      });
    }
  };


  function renderContent() {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard assets={assets} waybills={waybills} quickCheckouts={quickCheckouts} sites={sites} equipmentLogs={equipmentLogs} maintenanceLogs={maintenanceLogs} employees={employees} vehicles={vehicles} onQuickLogEquipment={async (log: EquipmentLog) => {
          if (!isAuthenticated) {
            toast({
              title: "Authentication Required",
              description: "Please login to add equipment logs",
              variant: "destructive"
            });
            return;
          }

          try {
            await dataService.equipmentLogs.createEquipmentLog(log);
            const logs = await dataService.equipmentLogs.getEquipmentLogs();
            setEquipmentLogs(logs);
            toast({
              title: "Equipment Log Added",
              description: "Equipment log saved successfully"
            });

            await logActivity({
              action: 'create',
              entity: 'equipment_log',
              entityId: log.id,
              details: `Created equipment log for ${log.equipmentName}`
            });
          } catch (error) {
            logger.error('Failed to save equipment log', error);
            toast({
              title: "Error",
              description: "Failed to save equipment log to database.",
              variant: "destructive"
            });
          }
        }} onNavigate={(tab, params) => {
          setActiveTab(tab);
          if (tab === 'assets' && params?.availability) {
            setActiveAvailabilityFilter(params.availability);
          }
        }} />
      case "machine-maintenance":
        return <MachineMaintenancePage
          machines={assets.filter(a => a.type === 'equipment').map(a => ({
            id: a.id,
            name: a.name,
            model: a.model,
            serialNumber: a.serialNumber,
            site: a.siteId ? (sites.find(s => s.id === a.siteId)?.name || a.siteId) : 'Fleet',
            deploymentDate: a.deploymentDate || a.createdAt,
            status: a.status as any,
            operatingPattern: 'Standard',
            serviceInterval: a.serviceInterval || 2,
            responsibleSupervisor: 'Fleet Manager',
            notes: a.description,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt
          }))}
          maintenanceLogs={maintenanceLogs}
          assets={assets}
          sites={sites}
          employees={employees}
          vehicles={vehicles}
          onAddMachine={() => setActiveTab('add-asset')}
          onSubmitMaintenance={handleSubmitMaintenance}
        />;
      case "recent-activities":
        return <RecentActivitiesPage />;
      case "assets":
        return <AssetTable
          assets={assets}
          sites={sites}
          activeAvailabilityFilter={activeAvailabilityFilter}
          onEdit={isAuthenticated ? handleEditAsset : undefined}
          onDelete={isAuthenticated ? handleDeleteAsset : undefined}
          onUpdateAsset={(updatedAsset) => {
            if (!isAuthenticated) {
              toast({
                title: "Authentication Required",
                description: "Please login to update assets",
                variant: "destructive"
              });
              return;
            }
            setAssets(prev =>
              prev.map(asset => (asset.id === updatedAsset.id ? updatedAsset : asset))
            );
          }}
          onViewAnalytics={(asset) => {
            setSelectedAssetForAnalytics(asset);
            setActiveTab('asset-analytics');
          }}
        />;
      case "asset-analytics":
        return selectedAssetForAnalytics ? (
          <AssetAnalyticsPage
            asset={selectedAssetForAnalytics}
            quickCheckouts={quickCheckouts}
            sites={sites}
            maintenanceLogs={maintenanceLogs}
            onBack={() => {
              setSelectedAssetForAnalytics(null);
              if (analyticsReturnTo) {
                setCurrentView(analyticsReturnTo.view);
                setActiveTab(analyticsReturnTo.tab);
                setAnalyticsReturnTo(null);
              } else {
                setActiveTab('assets');
              }
            }}
          />
        ) : null;
      case "add-asset":
        return isAuthenticated ? (
          <AddAssetForm
            onAddAsset={handleAddAsset}
            sites={sites}
            existingAssets={assets}
            initialData={aiPrefillData?.formType === 'asset' ? aiPrefillData : undefined}
          />
        ) : <div>You must be logged in to add assets.</div>;
      case "waybill-document":
        return selectedWaybillForView ? (
          <WaybillDocumentPage
            waybill={selectedWaybillForView}
            sites={sites}
            companySettings={companySettings}
            onBack={() => {
              setSelectedWaybillForView(null);
              setActiveTab('waybills');
            }}
          />
        ) : null;
      case "return-waybill-document":
        return selectedReturnWaybillForView ? (
          <WaybillDocumentPage
            waybill={selectedReturnWaybillForView}
            sites={sites}
            companySettings={companySettings}
            onBack={() => {
              setSelectedReturnWaybillForView(null);
              setActiveTab('returns');
            }}
          />
        ) : null;
      case "create-waybill":
        return <WaybillForm
          assets={assets}
          sites={sites}
          employees={employees}
          vehicles={vehicles}
          onCreateWaybill={handleCreateWaybill}
          onCancel={() => setActiveTab("dashboard")}
          initialData={aiPrefillData?.formType === 'waybill' ? aiPrefillData : undefined}
        />;
      case "waybills":
        return (
          <>
            <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                {isAuthenticated && hasPermission('write_waybills') && (
                  <Button
                    variant="default"
                    onClick={() => setActiveTab("create-waybill")}
                    className="w-full sm:w-auto bg-gradient-primary"
                    size={isMobile ? "lg" : "default"}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Waybill
                  </Button>
                )}
              </div>
            </div>
            <WaybillList
              waybills={waybills.filter(wb => wb.type === 'waybill')}
              sites={sites}
              onViewWaybill={handleViewWaybill}
              onEditWaybill={handleEditWaybill}
              onInitiateReturn={handleInitiateReturn}
              onDeleteWaybill={handleDeleteWaybill}
              onSentToSite={handleSentToSite}
              disableDelete={false}
            />
          </>
        );
      case "returns":
        return <ReturnsList
          waybills={waybills.filter(wb => wb.type === 'return')}
          sites={sites}
          onViewWaybill={handleViewReturnWaybill}
          onEditWaybill={handleEditWaybill}
          onDeleteWaybill={handleDeleteWaybill}
          onProcessReturn={handleOpenReturnDialog}
        />;
      case "site-waybills":
        return <SiteWaybills
          sites={sites}
          waybills={waybills}
          assets={assets}
          employees={employees}
          onViewWaybill={handleViewWaybill}
          onPrepareReturnWaybill={(site) => {
            setActiveTab("prepare-return-waybill");
            setSelectedSite(site);
          }}
          onProcessReturn={(site) => {
            // For simplicity, open return form for first outstanding return waybill at site
            const returnInitiatedWaybill = waybills.find(wb => wb.siteId === site.id && wb.type === 'return' && wb.status === 'outstanding');
            if (returnInitiatedWaybill) {
              setShowReturnForm(returnInitiatedWaybill);
              setActiveTab("returns");
            }
          }}
        />;
      case "prepare-return-waybill":
        return selectedSite ? <ReturnWaybillForm
          site={selectedSite}
          sites={sites}
          assets={assets}
          employees={employees}
          vehicles={vehicles}
          siteInventory={getSiteInventory(selectedSite.id)}
          onCreateReturnWaybill={handleCreateReturnWaybill}
          onCancel={() => {
            setActiveTab("site-waybills");
            setSelectedSite(null);
          }}
        /> : null;
      case "quick-checkout":
        return <QuickCheckoutForm
          assets={assets}
          employees={employees}
          quickCheckouts={quickCheckouts}
          onQuickCheckout={handleQuickCheckout}
          onReturnItem={handleReturnItem}
          onPartialReturn={handlePartialReturn}
          onDeleteCheckout={handleDeleteCheckout}
          onNavigateToAnalytics={() => setActiveTab("employee-analytics")}
        />;
      case "employee-analytics":
        return <EmployeeAnalyticsPage
          employees={employees}
          quickCheckouts={quickCheckouts}
          assets={assets}
          onBack={() => setActiveTab("quick-checkout")}
          onUpdateStatus={handleUpdateQuickCheckoutStatus}
        />;

      case "machine-maintenance":
        return (
          <MachineMaintenancePage
            machines={machines}
            maintenanceLogs={maintenanceLogs}
            assets={assets}
            sites={sites}
            employees={employees}
            vehicles={vehicles}
            onSubmitMaintenance={handleSubmitMaintenance}
          />
        );

      case "settings":
        return (
          <CompanySettings
            settings={companySettings}
            onSave={(settings) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to save company settings",
                  variant: "destructive"
                });
                return;
              }
              setCompanySettings(settings);
            }}
            employees={employees}
            onEmployeesChange={(emps) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage employees",
                  variant: "destructive"
                });
                return;
              }
              setEmployees(emps);
            }}
            vehicles={vehicles}
            onVehiclesChange={(vehs) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage vehicles",
                  variant: "destructive"
                });
                return;
              }
              setVehicles(vehs);
            }}
            assets={assets}
            onAssetsChange={(asts) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage assets",
                  variant: "destructive"
                });
                return;
              }
              setAssets(asts);
            }}
            waybills={waybills}
            onWaybillsChange={(wbills) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage waybills",
                  variant: "destructive"
                });
                return;
              }
              setWaybills(wbills);
            }}
            quickCheckouts={quickCheckouts}
            onQuickCheckoutsChange={(qcos) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage quick checkouts",
                  variant: "destructive"
                });
                return;
              }
              setQuickCheckouts(qcos);
            }}
            sites={sites}
            onSitesChange={(sts) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage sites",
                  variant: "destructive"
                });
                return;
              }
              setSites(sts);
            }}
            siteTransactions={siteTransactions}
            onSiteTransactionsChange={(stTrans) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to manage site transactions",
                  variant: "destructive"
                });
                return;
              }
              setSiteTransactions(stTrans);
            }}
            onResetAllData={handleResetAllData}
            onUpdateCheckoutStatus={handleUpdateCheckoutStatus}
          />
        );
      case "sites":
        return (
          <SitesPage
            sites={sites}
            assets={assets}
            waybills={waybills}
            employees={employees}
            vehicles={vehicles}
            transactions={siteTransactions}
            equipmentLogs={equipmentLogs}
            consumableLogs={consumableLogs}
            siteInventory={siteInventory}
            getSiteInventory={getSiteInventory}
            aiPrefillData={aiPrefillData?.formType === 'site' ? aiPrefillData : undefined}
            onViewSiteInventory={(site) => {
              setSelectedSiteForInventory(site);
              setActiveTab('site-inventory');
            }}
            onAddSite={async site => {
              if (!isAuthenticated) {
                toast({
                  title: 'Authentication Required',
                  description: 'Please login to add sites',
                  variant: 'destructive'
                });
                return;
              }
              try {
                const savedSite = await dataService.sites.createSite(site);
                const loadedSites = await dataService.sites.getSites();
                setSites(loadedSites.map((item: any) => ({
                  ...item,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                })));

                await logActivity({
                  action: 'create',
                  entity: 'site',
                  entityId: savedSite.id,
                  details: `Created site ${site.name}`
                });
              } catch (error) {
                logger.error('Failed to add site', error);
                toast({ title: 'Error', description: 'Failed to save site to database', variant: 'destructive' });
              }
            }}
            onUpdateSite={async updatedSite => {
              if (!isAuthenticated) {
                toast({
                  title: 'Authentication Required',
                  description: 'Please login to update sites',
                  variant: 'destructive'
                });
                return;
              }
              try {
                await dataService.sites.updateSite(updatedSite.id, updatedSite);
                const loadedSites = await dataService.sites.getSites();
                setSites(loadedSites.map((item: any) => ({
                  ...item,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                })));

                await logActivity({
                  action: 'update',
                  entity: 'site',
                  entityId: updatedSite.id,
                  details: `Updated site ${updatedSite.name}`
                });
              } catch (error) {
                logger.error('Failed to update site', error);
                toast({ title: 'Error', description: 'Failed to update site in database', variant: 'destructive' });
              }
            }}
            onDeleteSite={async siteId => {
              if (!isAuthenticated) {
                toast({
                  title: 'Authentication Required',
                  description: 'Please login to delete sites',
                  variant: 'destructive'
                });
                return;
              }
              try {
                await dataService.sites.deleteSite(siteId);
                const loadedSites = await dataService.sites.getSites();
                setSites(loadedSites.map((item: any) => ({
                  ...item,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                })));

                await logActivity({
                  action: 'delete',
                  entity: 'site',
                  entityId: siteId,
                  details: `Deleted site ${siteId}`
                });
              } catch (error) {
                logger.error('Failed to delete site', error);
                toast({ title: 'Error', description: 'Failed to delete site from database', variant: 'destructive' });
              }
            }}
            onUpdateAsset={(updatedAsset) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to update assets",
                  variant: "destructive"
                });
                return;
              }
              setAssets(prev => prev.map(asset => (asset.id === updatedAsset.id ? updatedAsset : asset)));
            }}
            onCreateWaybill={handleCreateWaybill}
            onCreateReturnWaybill={handleCreateReturnWaybill}
            onProcessReturn={(returnData) => {
              // Check if returnData has siteId and waybill items
              if (returnData && returnData.waybillId) {
                handleProcessReturn(returnData);
              } else {
                // If no returnData, fallback to previous behavior
                handleProcessReturn(returnData);
              }
            }}
            onAddEquipmentLog={async (log: EquipmentLog) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to add equipment logs",
                  variant: "destructive"
                });
                return;
              }

              try {
                await dataService.equipmentLogs.createEquipmentLog(log);
                const logs = await dataService.equipmentLogs.getEquipmentLogs();
                setEquipmentLogs(logs);
                toast({
                  title: "Equipment Log Added",
                  description: "Equipment log saved successfully"
                });
              } catch (error) {
                logger.error('Failed to save equipment log', error);
                toast({
                  title: "Error",
                  description: "Failed to save equipment log to database.",
                  variant: "destructive"
                });
              }
            }}
            onUpdateEquipmentLog={async (log: EquipmentLog) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to update equipment logs",
                  variant: "destructive"
                });
                return;
              }

              try {
                await dataService.equipmentLogs.updateEquipmentLog(Number(log.id), log);
                const logs = await dataService.equipmentLogs.getEquipmentLogs();
                setEquipmentLogs(logs);
                toast({
                  title: "Equipment Log Updated",
                  description: "Equipment log updated successfully"
                });
              } catch (error) {
                logger.error('Failed to update equipment log', error);
                toast({
                  title: "Error",
                  description: "Failed to update equipment log in database.",
                  variant: "destructive"
                });
              }
            }}
            onAddConsumableLog={async (log: ConsumableUsageLog) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to add consumable logs",
                  variant: "destructive"
                });
                return;
              }

              try {
                await dataService.consumableLogs.createConsumableLog(log);
                const logs = await dataService.consumableLogs.getConsumableLogs();
                setConsumableLogs(logs);

                // Update asset siteQuantities and usedCount to reflect consumption
                const asset = assets.find(a => a.id === log.consumableId);
                if (asset && asset.siteQuantities) {
                  const updatedSiteQuantities = {
                    ...asset.siteQuantities,
                    [log.siteId]: log.quantityRemaining
                  };

                  // Increment usedCount by the quantity consumed
                  const newUsedCount = (asset.usedCount || 0) + log.quantityUsed;

                  // Decrease reservedQuantity by the quantity consumed
                  // Items at site are reserved; when consumed, they leave reservation and enter 'used'
                  const newReservedQuantity = Math.max(0, (asset.reservedQuantity || 0) - log.quantityUsed);

                  // Recalculate available quantity
                  const newAvailable = calculateAvailableQuantity(
                    asset.quantity,
                    newReservedQuantity,
                    asset.damagedCount,
                    asset.missingCount,
                    newUsedCount
                  );

                  const updatedAsset = {
                    ...asset,
                    siteQuantities: updatedSiteQuantities,
                    usedCount: newUsedCount,
                    reservedQuantity: newReservedQuantity,
                    availableQuantity: newAvailable,
                    updatedAt: new Date()
                  };
                  await dataService.assets.updateAsset(asset.id, updatedAsset);
                  setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
                }

                toast({
                  title: "Consumable Log Added",
                  description: "Consumable usage log saved successfully"
                });
              } catch (error) {
                logger.error('Failed to save consumable log', error);
                toast({
                  title: "Error",
                  description: "Failed to save consumable log to database.",
                  variant: "destructive"
                });
              }
            }}
            onUpdateConsumableLog={async (log: ConsumableUsageLog) => {
              if (!isAuthenticated) {
                toast({
                  title: "Authentication Required",
                  description: "Please login to update consumable logs",
                  variant: "destructive"
                });
                return;
              }

              try {
                // Find the old log to calculate the difference
                const oldLog = consumableLogs.find(l => l.id === log.id);
                const oldQuantityUsed = oldLog?.quantityUsed || 0;
                const quantityDifference = log.quantityUsed - oldQuantityUsed;

                await dataService.consumableLogs.updateConsumableLog(log.id, log);
                const logs = await dataService.consumableLogs.getConsumableLogs();
                setConsumableLogs(logs);

                // Update asset usedCount and siteQuantities if quantity changed
                if (quantityDifference !== 0) {
                  const asset = assets.find(a => a.id === log.consumableId);
                  if (asset && asset.siteQuantities) {
                    const updatedSiteQuantities = {
                      ...asset.siteQuantities,
                      [log.siteId]: log.quantityRemaining
                    };

                    // Adjust usedCount by the difference
                    const newUsedCount = Math.max(0, (asset.usedCount || 0) + quantityDifference);

                    // Adjust reservedQuantity by subtracting the difference
                    // If usage increases, reserved decreases (consumed items leave reservation)
                    const newReservedQuantity = Math.max(0, (asset.reservedQuantity || 0) - quantityDifference);

                    // Recalculate available quantity
                    const newAvailable = calculateAvailableQuantity(
                      asset.quantity,
                      newReservedQuantity,
                      asset.damagedCount,
                      asset.missingCount,
                      newUsedCount
                    );

                    const updatedAsset = {
                      ...asset,
                      siteQuantities: updatedSiteQuantities,
                      usedCount: newUsedCount,
                      reservedQuantity: newReservedQuantity,
                      availableQuantity: newAvailable,
                      updatedAt: new Date()
                    };
                    await dataService.assets.updateAsset(asset.id, updatedAsset);
                    setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
                  }
                }
              } catch (error) {
                logger.error('Failed to update consumable log', error);
                toast({
                  title: "Error",
                  description: "Failed to update consumable log in database.",
                  variant: "destructive"
                });
              }
            }}
          />
        );
      case "site-inventory":
        return selectedSiteForInventory ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Package className="h-6 w-6 sm:h-8 sm:w-8" />
                  {selectedSiteForInventory.name} - Materials and Waybills
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">
                  View all materials, equipment, and waybills for this site
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('sites');
                  setSelectedSiteForInventory(null);
                }}
              >
                Back to Sites
              </Button>
            </div>

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
                    const materialsAtSite = getSiteInventory(selectedSiteForInventory.id);
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
                site={selectedSiteForInventory}
                assets={assets}
                equipmentLogs={equipmentLogs}
                employees={employees}
                waybills={waybills}
                companySettings={companySettings}
                onAddEquipmentLog={async (log: EquipmentLog) => {
                  try {
                    await dataService.equipmentLogs.createEquipmentLog(log);
                    const logs = await dataService.equipmentLogs.getEquipmentLogs();
                    setEquipmentLogs(logs);
                  } catch (error) {
                    logger.error('Failed to save equipment log', error);
                  }
                }}
                onUpdateEquipmentLog={async (log: EquipmentLog) => {
                  try {
                    await dataService.equipmentLogs.updateEquipmentLog(Number(log.id), log);
                    const logs = await dataService.equipmentLogs.getEquipmentLogs();
                    setEquipmentLogs(logs);
                  } catch (error) {
                    logger.error('Failed to update equipment log', error);
                  }
                }}
                onViewAnalytics={() => handleViewAnalytics(selectedSiteForInventory, 'equipment')}
                onViewAssetDetails={(asset) => handleViewAssetDetails(selectedSiteForInventory, asset)}
                onViewAssetHistory={(asset) => handleViewAssetDetails(selectedSiteForInventory, asset)}
                onViewAssetAnalytics={(asset) => {
                  setAnalyticsReturnTo({ view: 'site-inventory', tab: 'site-inventory' });
                  setSelectedAssetForAnalytics(asset);
                  setCurrentView('asset-analytics');
                  setActiveTab('asset-analytics');
                }}
              />

              {/* Consumables Section */}
              <ConsumablesSection
                site={selectedSiteForInventory}
                assets={assets}
                employees={employees}
                waybills={waybills}
                consumableLogs={consumableLogs}
                onAddConsumableLog={async (log: ConsumableUsageLog) => {
                  try {
                    await dataService.consumableLogs.createConsumableLog(log);
                    const logs = await dataService.consumableLogs.getConsumableLogs();
                    setConsumableLogs(logs);
                  } catch (error) {
                    logger.error('Failed to save consumable log', error);
                  }
                }}
                onUpdateConsumableLog={async (log: ConsumableUsageLog) => {
                  try {
                    await dataService.consumableLogs.updateConsumableLog(log.id, log);
                    const logs = await dataService.consumableLogs.getConsumableLogs();
                    setConsumableLogs(logs);
                  } catch (error) {
                    logger.error('Failed to update consumable log', error);
                  }
                }}
                onViewAnalytics={() => handleViewAnalytics(selectedSiteForInventory, 'consumables')}
                onViewAssetDetails={(asset) => handleViewAssetDetails(selectedSiteForInventory, asset)}
                onViewAssetHistory={(asset) => handleViewAssetDetails(selectedSiteForInventory, asset)}
                onViewAssetAnalytics={(asset) => {
                  setAnalyticsReturnTo({ view: 'site-inventory', tab: 'site-inventory' });
                  setSelectedAssetForAnalytics(asset);
                  setCurrentView('asset-analytics');
                  setActiveTab('asset-analytics');
                }}
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
                  {waybills.filter(waybill => String(waybill.siteId) === String(selectedSiteForInventory.id)).length === 0 ? (
                    <p className="text-muted-foreground">No waybills for this site.</p>
                  ) : (
                    <div className="space-y-2">
                      {waybills.filter(waybill => String(waybill.siteId) === String(selectedSiteForInventory.id)).map((waybill) => {
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
                                onClick={() => setShowWaybillDocument(waybill)}
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
              <div className={`flex gap-3 pt-4 ${isMobile ? 'flex-col' : ''}`}>
                <Button onClick={() => {
                  setSelectedSiteForReturnWaybill(selectedSiteForInventory);
                  setActiveTab('create-return-waybill');
                }} className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Create Return Waybill
                </Button>
                <Button
                  onClick={() => handleShowTransactions(selectedSiteForInventory)}
                  variant="outline"
                  className="flex-1"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  View Transactions
                </Button>
                <Button
                  onClick={() => handleGenerateReport(selectedSiteForInventory)}
                  variant="outline"
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          </div>
        ) : null;
      case 'site-analytics':
        return selectedSiteForAnalytics ? (
          <SiteAnalyticsPage
            site={selectedSiteForAnalytics}
            assets={assets}
            equipmentLogs={equipmentLogs}
            consumableLogs={consumableLogs}
            defaultTab={analyticsTab}
            onBack={() => {
              setSelectedSiteForAnalytics(null);
              // Navigate back to site-inventory if we came from there, otherwise go to sites
              if (selectedSiteForInventory) {
                setCurrentView('main');
                setActiveTab('site-inventory');
              } else {
                setCurrentView('main');
                setActiveTab('sites');
              }
            }}
          />
        ) : null;
      case 'site-asset-details':
        return selectedAssetForDetails ? (
          <SiteAssetDetailsPage
            site={selectedAssetForDetails.site}
            asset={selectedAssetForDetails.asset}
            equipmentLogs={equipmentLogs}
            consumableLogs={consumableLogs}
            waybills={waybills}
            employees={employees}
            companySettings={companySettings}
            onBack={() => {
              setSelectedAssetForDetails(null);
              setCurrentView('site-inventory');
              setActiveTab('site-inventory');
            }}
            onAddEquipmentLog={async (log: EquipmentLog) => {
              try {
                await dataService.equipmentLogs.createEquipmentLog(log);
                const logs = await dataService.equipmentLogs.getEquipmentLogs();
                setEquipmentLogs(logs);
              } catch (error) {
                logger.error('Failed to save equipment log', error);
              }
            }}
            onUpdateEquipmentLog={async (log: EquipmentLog) => {
              try {
                await dataService.equipmentLogs.updateEquipmentLog(Number(log.id), log);
                const logs = await dataService.equipmentLogs.getEquipmentLogs();
                setEquipmentLogs(logs);
              } catch (error) {
                logger.error('Failed to update equipment log', error);
              }
            }}
            onAddConsumableLog={async (log: ConsumableUsageLog) => {
              try {
                await dataService.consumableLogs.createConsumableLog(log);
                const logs = await dataService.consumableLogs.getConsumableLogs();
                setConsumableLogs(logs);
              } catch (error) {
                logger.error('Failed to save consumable log', error);
              }
            }}
            onUpdateConsumableLog={async (log: ConsumableUsageLog) => {
              try {
                await dataService.consumableLogs.updateConsumableLog(log.id, log);
                const logs = await dataService.consumableLogs.getConsumableLogs();
                setConsumableLogs(logs);
              } catch (error) {
                logger.error('Failed to update consumable log', error);
              }
            }}
          />
        ) : null;
      case "view-site-transactions":
        return selectedSiteForTransactions ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                  <Activity className="h-6 w-6 sm:h-8 sm:w-8" />
                  {selectedSiteForTransactions.name} - Transaction History
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">
                  View all asset movements and transactions for this site
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={transactionsView} onValueChange={(value) => setTransactionsView(value as 'table' | 'tree' | 'flow')}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="View" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table View</SelectItem>
                    <SelectItem value="tree">Tree View</SelectItem>
                    <SelectItem value="flow">Flow View</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setActiveTab('site-inventory');
                    setSelectedSiteForTransactions(null);
                  }}
                >
                  Back to Site Inventory
                </Button>
              </div>
            </div>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {transactionsView === 'tree' ? (
                    // Tree View - Group by referenceId (waybill) or date
                    <div className="space-y-4">
                      {(() => {
                        const currentSiteTransactions = siteTransactions
                          .filter((t: SiteTransaction) => t.siteId === selectedSiteForTransactions.id)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                        // Group by referenceId (waybill ID)
                        const grouped = currentSiteTransactions.reduce((acc, t) => {
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
                      {siteTransactions.filter((t: SiteTransaction) => t.siteId === selectedSiteForTransactions.id).length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No transactions for this site yet.</p>
                      )}
                    </div>
                  ) : transactionsView === 'flow' ? (
                    // Flow View - Group by inflows (in) and outflows (out)
                    <div className="space-y-6">
                      {(() => {
                        const currentSiteTransactions = siteTransactions
                          .filter((t: SiteTransaction) => t.siteId === selectedSiteForTransactions.id)
                          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                        const inflows = currentSiteTransactions.filter(t => t.type === 'in');
                        const outflows = currentSiteTransactions.filter(t => t.type === 'out');

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
                      {siteTransactions.filter((t: SiteTransaction) => t.siteId === selectedSiteForTransactions.id).length === 0 && (
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
                          {siteTransactions
                            .filter((t: SiteTransaction) => t.siteId === selectedSiteForTransactions.id)
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
                          {siteTransactions.filter((t: SiteTransaction) => t.siteId === selectedSiteForTransactions.id).length === 0 && (
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
              </CardContent>
            </Card>
          </div>
        ) : null;
      case "create-return-waybill":
        return selectedSiteForReturnWaybill ? (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Create Return Waybill - {selectedSiteForReturnWaybill.name}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-2">
                  Create a return waybill for materials from this site
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setActiveTab('site-inventory');
                  setSelectedSiteForReturnWaybill(null);
                }}
              >
                Back to Site Inventory
              </Button>
            </div>

            <Card className="border-0 shadow-soft">
              <CardContent className="p-6">
                <ReturnWaybillForm
                  site={selectedSiteForReturnWaybill}
                  sites={sites}
                  assets={assets}
                  employees={employees}
                  vehicles={vehicles}
                  siteInventory={getSiteInventory(selectedSiteForReturnWaybill.id)}
                  onCreateReturnWaybill={(waybillData) => {
                    handleCreateReturnWaybill(waybillData);
                    setActiveTab('site-inventory');
                    setSelectedSiteForReturnWaybill(null);
                  }}
                  onCancel={() => {
                    setActiveTab('site-inventory');
                    setSelectedSiteForReturnWaybill(null);
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : null;
      default:
        return <Dashboard assets={assets} waybills={waybills} quickCheckouts={quickCheckouts} sites={sites} equipmentLogs={equipmentLogs} maintenanceLogs={maintenanceLogs} employees={employees} vehicles={vehicles} onQuickLogEquipment={async (log: EquipmentLog) => {
          if (!isAuthenticated) {
            toast({
              title: "Authentication Required",
              description: "Please login to add equipment logs",
              variant: "destructive"
            });
            return;
          }

          if (window.electronAPI && window.electronAPI.db) {
            try {
              await window.electronAPI.db.createEquipmentLog(log);
              const logs = await window.electronAPI.db.getEquipmentLogs();
              setEquipmentLogs(logs);
              toast({
                title: "Equipment Log Added",
                description: "Equipment log saved successfully"
              });
            } catch (error) {
              logger.error('Failed to save equipment log', error);
              toast({
                title: "Error",
                description: "Failed to save equipment log to database.",
                variant: "destructive"
              });
            }
          } else {
            setEquipmentLogs(prev => [...prev, log]);
          }
        }} onNavigate={setActiveTab} />;
    }
  }

  // Update handleImport to map imported data to Asset type and save to database
  const handleImport = async (importedAssets: any[]) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to import assets",
        variant: "destructive"
      });
      return;
    }

    // Check if database is available
    // Database check handled by dataService

    try {
      // Map imported data to Asset format
      const mapped: Asset[] = importedAssets.map((item, idx) => {
        const quantity = Number(item.quantity || item.Quantity || 0);
        const reservedQuantity = 0; // Default to 0 for imports
        const siteQuantities = {}; // Empty for imports
        const availableQuantity = calculateAvailableQuantity(
          quantity,
          reservedQuantity,
          0,
          0,
          0
        );

        return {
          id: Date.now().toString() + idx,
          name: (item.name || item.Name || "").trim(),
          description: item.description || item.Description || "",
          quantity,
          reservedQuantity,
          availableQuantity,
          siteQuantities,
          unitOfMeasurement: item.unitOfMeasurement || item['unit of measurement'] || item.unit || item.uom || "pcs",
          category: (item.category || item.Category || "dewatering") as 'dewatering' | 'waterproofing' | 'tiling' | 'ppe' | 'office',
          type: (item.type || item.Type || "equipment") as 'consumable' | 'non-consumable' | 'tools' | 'equipment',
          location: item.location || item.Location || "",
          status: (item.status || 'active') as 'active' | 'damaged' | 'missing' | 'maintenance',
          condition: (item.condition || 'good') as 'excellent' | 'good' | 'fair' | 'poor',
          lowStockLevel: Number(item.lowStockLevel || 5),
          criticalStockLevel: Number(item.criticalStockLevel || 2),
          cost: Number(item.cost || item.price || 0),
          createdAt: new Date(),
          updatedAt: new Date(),
          missingCount: 0, // Default
          damagedCount: 0, // Default
        };
      });

      // Check for duplicate names within imported data
      const importedNames = mapped.map(a => a.name.toLowerCase());
      const duplicatesInImport = importedNames.filter((name, index) =>
        name && importedNames.indexOf(name) !== index
      );

      if (duplicatesInImport.length > 0) {
        const uniqueDuplicates = [...new Set(duplicatesInImport)];
        toast({
          title: "Duplicate Names in Import",
          description: `The following asset names appear multiple times in your import file: ${uniqueDuplicates.join(', ')}. Each asset must have a unique name.`,
          variant: "destructive"
        });
        return;
      }

      // Check for duplicates against existing assets
      const existingNames = assets.map(a => a.name.toLowerCase());
      const duplicatesWithExisting = mapped.filter(asset =>
        asset.name && existingNames.includes(asset.name.toLowerCase())
      );

      if (duplicatesWithExisting.length > 0) {
        const duplicateNames = duplicatesWithExisting.map(a => a.name).join(', ');
        toast({
          title: "Duplicate Asset Names",
          description: `The following asset names already exist in your inventory: ${duplicateNames}. Cannot import duplicate asset names.`,
          variant: "destructive"
        });
        return;
      }

      // Validate that all assets have names
      const assetsWithoutNames = mapped.filter(a => !a.name || a.name.trim() === '');
      if (assetsWithoutNames.length > 0) {
        toast({
          title: "Missing Asset Names",
          description: `${assetsWithoutNames.length} asset(s) in your import file are missing names. All assets must have a name.`,
          variant: "destructive"
        });
        return;
      }

      // Save each asset to the database
      const savedAssets: Asset[] = [];
      const failedAssets: string[] = [];
      for (const asset of mapped) {
        try {
          const savedAsset = await dataService.assets.createAsset(asset);
          savedAssets.push(savedAsset);
        } catch (error) {
          logger.error('Failed to save asset to database', error, { context: 'BulkImport', data: { assetName: asset.name } });
          failedAssets.push(asset.name);
          // Continue with other assets even if one fails
        }
      }

      // Update local state with successfully saved assets
      setAssets(prev => [...prev, ...savedAssets]);

      if (failedAssets.length > 0) {
        toast({
          title: "Partial Import Success",
          description: `Successfully imported ${savedAssets.length} out of ${mapped.length} assets. Failed: ${failedAssets.join(', ')}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Bulk Import Completed",
          description: `Successfully imported ${savedAssets.length} asset(s) with unique names`
        });
      }
    } catch (error) {
      logger.error('Bulk import error', error);
      toast({
        title: "Import Failed",
        description: `Failed to import assets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const handleResetAllData = async () => {
    // Clear database tables if available
    if (window.electronAPI && window.electronAPI.db && (window.electronAPI.db as any).clearTable) {
      try {
        // Clear tables in dependency order (reverse of creation)
        const clearTable = (window.electronAPI.db as any).clearTable;
        await clearTable('site_transactions');
        await clearTable('quick_checkouts');
        await clearTable('equipment_logs');
        await clearTable('consumable_logs');
        await clearTable('waybills');
        await clearTable('assets');
        await clearTable('sites');
        await clearTable('vehicles');
        await clearTable('employees');
        await clearTable('activity_log');

        // Note: Users are NOT cleared to prevent admin lockout
        // Company settings will be reset to default by the caller (CompanySettings component)
      } catch (err) {
        logger.error("Failed to clear database tables", err);
        toast({ title: "Reset Partially Failed", description: "Could not clear some database tables.", variant: "destructive" });
      }
    }

    // Clear all states
    setAssets([]);
    setWaybills([]);
    setQuickCheckouts([]);
    setSites([]);
    setSiteTransactions([]);
    setEmployees([]);
    setVehicles([]);
    setCompanySettings({} as CompanySettingsType);

    await logActivity({
      action: 'reset',
      entity: 'system',
      details: 'Performed Full Data Reset'
    });
  };

  // Handle AI assistant actions
  const handleAIAction = (action: any) => {
    if (!action) return;

    if (action.type === 'open_form' && action.data) {
      const { formType, prefillData } = action.data;

      // Store prefill data with formType embedded
      setAiPrefillData({ ...prefillData, formType });

      // Close AI assistant
      setShowAIAssistant(false);

      // Navigate to appropriate tab
      switch (formType) {
        case 'waybill':
          setActiveTab('create-waybill');
          toast({
            title: "Waybill Form Ready",
            description: "Form populated with AI-extracted data",
          });
          break;

        case 'asset':
          setActiveTab('add-asset');
          toast({
            title: "Asset Form Ready",
            description: "Form populated with AI-extracted data",
          });
          break;

        case 'return':
          setActiveTab('waybills');
          toast({
            title: "Return Form Ready",
            description: "Form populated with AI-extracted data",
          });
          break;

        case 'site':
          setActiveTab('sites');
          toast({
            title: "Site Form Ready",
            description: "Form populated with AI-extracted data",
          });
          break;

        default:
          toast({
            title: "Action Triggered",
            description: `${formType} form will open`,
          });
      }
    } else if (action.type === 'execute_action' && action.data) {
      const { action: actionType, waybillId, analyticsType, siteId, ...prefillData } = action.data;

      if (actionType === 'open_analytics') {
        setActiveTab('dashboard');
        setShowAIAssistant(false);
        toast({
          title: "Opening Analytics",
          description: siteId ? `Analytics for site` : "Opening analytics dashboard",
        });
      } else if (actionType === 'view_waybill' && waybillId) {
        const waybill = waybills.find(wb => wb.id === waybillId);
        if (waybill) {
          if (waybill.type === 'return') {
            setShowReturnWaybillDocument(waybill);
          } else {
            setShowWaybillDocument(waybill);
          }
          setShowAIAssistant(false);
          toast({
            title: "Viewing Waybill",
            description: `Opening waybill ${waybillId}`,
          });
        } else {
          toast({
            title: "Waybill Not Found",
            description: `Could not find waybill with ID ${waybillId}`,
            variant: "destructive"
          });
        }
      } else if (actionType === 'create_waybill') {
        setAiPrefillData({ ...prefillData, formType: 'waybill' });
        setActiveTab('create-waybill');
        setShowAIAssistant(false);
        toast({
          title: "Waybill Form Ready",
          description: "Form populated with AI-extracted data",
        });
      } else if (actionType === 'create_asset') {
        setAiPrefillData({ ...prefillData, formType: 'asset' });
        setActiveTab('add-asset');
        setShowAIAssistant(false);
        toast({
          title: "Asset Form Ready",
          description: "Form populated with AI-extracted data",
        });
      } else if (actionType === 'create_site') {
        setAiPrefillData({ ...prefillData, formType: 'site' });
        setActiveTab('sites');
        setShowAIAssistant(false);
        toast({
          title: "Site Form Ready",
          description: "Form populated with AI-extracted data",
        });
      }
    }
  };

  // Clear AI prefill data when switching tabs (to prevent stale data)
  useEffect(() => {
    setAiPrefillData(null);
  }, [activeTab]);

  const isAssetInventoryTab = activeTab === "assets";

  // Calculate AI enabled state (handle all boolean/string/number falsey variants)
  const aiConfig = (companySettings as any)?.ai?.remote;
  const aiEnabledVal = aiConfig?.enabled;

  // Default to false (disabled) if undefined or null. Only enable if explicitly true/truthy.
  // We exclude 'false' string and '0' string which might be truthy in JS but mean false here.
  const isAIEnabled = !!aiEnabledVal && aiEnabledVal !== 'false' && aiEnabledVal !== '0';

  return (
    <AIAssistantProvider
      aiEnabled={isAIEnabled}
      assets={assets}
      sites={sites}
      employees={employees}
      vehicles={vehicles}
      onAction={handleAIAction}
    >
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Custom Menu Bar for Desktop */}
        <div className="hidden md:block">
          <AppMenuBar
            onNewAsset={() => setActiveTab("add-asset")}
            onRefresh={() => window.location.reload()}
            onExport={() => {
              if (isAuthenticated) {
                exportAssetsToExcel(assets, "Full_Inventory_Export");
                toast({
                  title: "Export Initiated",
                  description: "Your inventory data is being exported to Excel."
                });
              } else {
                toast({
                  title: "Authentication Required",
                  description: "Please login to export data",
                  variant: "destructive"
                });
              }
            }}
            onOpenSettings={() => setActiveTab("settings")}
            canCreateAsset={hasPermission('write_assets')}
            onMobileMenuClick={isMobile ? () => setMobileMenuOpen(true) : undefined}
            currentUser={currentUser}
          />
        </div>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <Sidebar
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              mode="mobile"
            />
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          )}

          <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6",
            isMobile && "pb-20" // Add padding for bottom nav
          )}>
            <PullToRefreshLayout>
              {isAssetInventoryTab && (
                <div className="flex flex-col space-y-3 md:space-y-0 md:flex-row md:justify-between md:items-center mb-6">
                  <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                    {isAuthenticated && hasPermission('write_assets') && (
                      <Button
                        variant="default"
                        onClick={() => setActiveTab("add-asset")}
                        className="w-full sm:w-auto bg-gradient-primary"
                        size={isMobile ? "lg" : "default"}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Asset
                      </Button>
                    )}
                    {isAuthenticated && hasPermission('write_assets') && currentUser?.role !== 'staff' && <BulkImportAssets onImport={handleImport} />}
                    <InventoryReport assets={assets} companySettings={companySettings} />

                  </div>

                </div>
              )}
              {processingReturnWaybill && (
                <ReturnProcessingDialog
                  waybill={processingReturnWaybill}
                  onClose={() => setProcessingReturnWaybill(null)}
                  onSubmit={(returnData) => {
                    setProcessingReturnWaybill(null);
                    handleProcessReturn(returnData);
                  }}
                />
              )}

              {renderContent()}
            </PullToRefreshLayout>

            {/* Edit Dialog */}
            <Dialog open={!!editingAsset} onOpenChange={open => !open && setEditingAsset(null)}>
              <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>Edit Asset</DialogHeader>
                {editingAsset && (
                  <AddAssetForm
                    asset={editingAsset}
                    onSave={handleSaveAsset}
                    onCancel={() => setEditingAsset(null)}
                    sites={sites}
                    existingAssets={assets}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingAsset} onOpenChange={open => !open && setDeletingAsset(null)}>
              <DialogContent>
                <DialogHeader>
                  Are you sure you want to delete this asset?
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeletingAsset(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmDeleteAsset}
                  >
                    Yes, Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>



            {/* Waybill Document Modal */}
            {showWaybillDocument && (
              <WaybillDocument
                waybill={showWaybillDocument}
                sites={sites}
                companySettings={companySettings}
                onClose={() => setShowWaybillDocument(null)}
              />
            )}

            {/* Return Form Modal */}
            {showReturnForm && (
              <ReturnForm
                waybill={showReturnForm}
                onSubmit={handleProcessReturn}
                onClose={() => setShowReturnForm(null)}
              />
            )}

            {/* Return Waybill Document Modal */}
            {showReturnWaybillDocument && (
              <ReturnWaybillDocument
                waybill={showReturnWaybillDocument}
                sites={sites}
                companySettings={companySettings}
                onClose={() => setShowReturnWaybillDocument(null)}
              />
            )}

            {/* Edit Waybill Dialog */}
            <Dialog open={!!editingWaybill} onOpenChange={open => !open && setEditingWaybill(null)}>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Waybill {editingWaybill?.id}</DialogTitle>
                </DialogHeader>
                {editingWaybill && (
                  <EditWaybillForm
                    waybill={editingWaybill}
                    assets={assets}
                    sites={sites}
                    employees={employees}
                    vehicles={vehicles}
                    onUpdate={async (updatedWaybill) => {
                      if (!isAuthenticated) return;

                      try {
                        // 1. Get old waybill to identify changes
                        const oldWaybill = waybills.find(w => w.id === updatedWaybill.id);

                        // Handle Asset Reservation adjustments if items changed and status allows
                        if (oldWaybill && oldWaybill.status === 'outstanding' && updatedWaybill.status === 'outstanding') {
                          // Revert Old Items (Release reservation)
                          for (const oldItem of oldWaybill.items) {
                            // We fetch fresh asset state to ensure we have current counts
                            const assetList = await dataService.assets.getAssets();
                            const asset = assetList.find(a => a.id === oldItem.assetId);
                            if (asset) {
                              const newReserved = Math.max(0, (asset.reservedQuantity || 0) - oldItem.quantity);
                              const newAvailable = calculateAvailableQuantity(
                                asset.quantity,
                                newReserved,
                                asset.damagedCount,
                                asset.missingCount,
                                asset.usedCount || 0
                              );
                              await dataService.assets.updateAsset(asset.id, { ...asset, reservedQuantity: newReserved, availableQuantity: newAvailable });
                            }
                          }

                          // Apply New Items (Add reservation)
                          for (const newItem of updatedWaybill.items) {
                            const assetList = await dataService.assets.getAssets();
                            const freshAsset = assetList.find(a => a.id === newItem.assetId);
                            if (freshAsset) {
                              const newReserved = (freshAsset.reservedQuantity || 0) + newItem.quantity;
                              const newAvailable = calculateAvailableQuantity(
                                freshAsset.quantity,
                                newReserved,
                                freshAsset.damagedCount,
                                freshAsset.missingCount,
                                freshAsset.usedCount || 0
                              );
                              await dataService.assets.updateAsset(freshAsset.id, { ...freshAsset, reservedQuantity: newReserved, availableQuantity: newAvailable });
                            }
                          }
                        }

                        // Update Waybill
                        await dataService.waybills.updateWaybill(updatedWaybill.id, updatedWaybill);

                        // Reload Data
                        const loadedAssets = await dataService.assets.getAssets();
                        setAssets(loadedAssets);

                        const loadedWaybills = await dataService.waybills.getWaybills();
                        setWaybills(loadedWaybills);

                        setEditingWaybill(null);
                        toast({
                          title: "Waybill Updated",
                          description: `Waybill ${updatedWaybill.id} updated successfully.`
                        });
                      } catch (error) {
                        console.error('Failed to update waybill:', error);
                        toast({
                          title: "Error",
                          description: `Failed to update waybill: ${error instanceof Error ? error.message : 'Unknown error'}`,
                          variant: "destructive"
                        });
                      }
                    }}
                    onCancel={() => setEditingWaybill(null)}
                  />
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Return Waybill Dialog */}
            <Dialog open={!!editingReturnWaybill} onOpenChange={open => !open && setEditingReturnWaybill(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Return Waybill</DialogTitle>
                </DialogHeader>
                {editingReturnWaybill ? (
                  <ReturnWaybillForm
                    site={sites.find(s => s.id === editingReturnWaybill.siteId) || { id: editingReturnWaybill.siteId, name: 'Unknown Site', location: '', description: '', contactPerson: '', phone: '', status: 'active', createdAt: new Date(), updatedAt: new Date() } as Site}
                    sites={sites}
                    assets={assets}
                    employees={employees}
                    vehicles={vehicles}
                    siteInventory={getSiteInventory(editingReturnWaybill.siteId)}
                    initialWaybill={editingReturnWaybill}
                    isEditMode={true}
                    onCreateReturnWaybill={handleCreateReturnWaybill}
                    onUpdateReturnWaybill={handleUpdateReturnWaybill}
                    onCancel={() => setEditingReturnWaybill(null)}
                  />
                ) : null}
              </DialogContent>
            </Dialog>

            {/* Asset Analytics is now handled via full-page navigation in renderContent */}

            {/* AI Assistant Dialog */}
            <Dialog open={showAIAssistant} onOpenChange={setShowAIAssistant}>
              <DialogContent className="max-w-2xl h-[80vh] p-0">
                <AIAssistantChat />
              </DialogContent>
            </Dialog>

            {/* Floating AI Assistant Button - Only shown when AI is enabled */}
            {isAIEnabled && (
              <Button
                onClick={() => setShowAIAssistant(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 bg-gradient-primary"
                size="icon"
              >
                <Bot className="h-6 w-6" />
              </Button>
            )}
          </main>
        </div>
      </div>

      {/* Audit Report Generation Loading Dialog */}
      {isGeneratingAudit && (
        <Dialog open={true}>
          <DialogContent className="max-w-md">
            <div className="flex flex-col items-center justify-center py-8 gap-6">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">📊</span>
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Generating Operations Audit Report</h3>
                <p className="text-sm text-muted-foreground">
                  Analyzing data and preparing comprehensive report...
                </p>
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-muted-foreground">Collecting asset data</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-muted-foreground">Analyzing equipment performance</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-muted-foreground">Processing consumable usage</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                  <span className="text-muted-foreground">Generating PDF document...</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                This may take a few seconds depending on data volume.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Audit Date Range Selection Dialog */}
      <Dialog open={showAuditDateDialog} onOpenChange={setShowAuditDateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📊 Generate Operations Audit Report
            </DialogTitle>
            <DialogDescription>
              Select the date range for the audit report. The report will analyze all operations within this period.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="audit-start-date">Start Date</Label>
                <Input
                  id="audit-start-date"
                  type="date"
                  value={auditStartDate}
                  onChange={(e) => setAuditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audit-end-date">End Date</Label>
                <Input
                  id="audit-end-date"
                  type="date"
                  value={auditEndDate}
                  onChange={(e) => setAuditEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const year = new Date().getFullYear();
                  setAuditStartDate(`${year}-01-01`);
                  setAuditEndDate(`${year}-12-31`);
                }}
              >
                This Year
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const year = new Date().getFullYear() - 1;
                  setAuditStartDate(`${year}-01-01`);
                  setAuditEndDate(`${year}-12-31`);
                }}
              >
                Last Year
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const firstDay = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                  setAuditStartDate(firstDay.toISOString().split('T')[0]);
                  setAuditEndDate(now.toISOString().split('T')[0]);
                }}
              >
                Last 3 Months
              </Button>
            </div>

            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Report will include:</p>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>• Financial growth analysis for the period</li>
                <li>• Site operations and materials deployed</li>
                <li>• Critical equipment utilization</li>
                <li>• Consumable usage patterns</li>
                <li>• Fleet and employee accountability</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAuditDateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowAuditDateDialog(false);
                setIsGeneratingAudit(true);
              }}
              className="bg-gradient-primary"
            >
              Generate Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hidden container for chart capture - off-screen */}
      {isGeneratingAudit && (
        <div className="fixed -left-[9999px] -top-[9999px]">
          <AuditCharts
            assets={assets}
            equipmentLogs={equipmentLogs}
            consumableLogs={consumableLogs}
            startDate={new Date(auditStartDate)}
            endDate={new Date(auditEndDate)}
          />
        </div>
      )}


      {/* Report Type Selection Dialog */}
      <Dialog open={showReportTypeDialog} onOpenChange={setShowReportTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Site Report</DialogTitle>
            <DialogDescription>
              Select the type of report you want to generate for {selectedSiteForReport?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"
              onClick={handleGenerateMaterialsReport}
            >
              <Package className="h-8 w-8 text-primary" />
              <span>Materials On Site</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary/50 transition-colors"
              onClick={handleGenerateTransactionsReport}
            >
              <Activity className="h-8 w-8 text-primary" />
              <span>Site Transactions</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Preview Dialog */}
      <Dialog open={showReportPreview} onOpenChange={setShowReportPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Report Preview</DialogTitle>
            <DialogDescription>
              Review the data before generating the PDF document.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity (Site)</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewAssets.map(asset => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{asset.category}</TableCell>
                      <TableCell>{asset.siteQuantities?.[selectedSiteForReport?.id || ''] || 0}</TableCell>
                      <TableCell>{asset.unitOfMeasurement}</TableCell>
                      <TableCell>{asset.status}</TableCell>
                    </TableRow>
                  ))}
                  {previewAssets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No assets found for this report.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportPreview(false)}>Cancel</Button>
            <Button onClick={() => {
              generateReport(previewAssets, `Status Report: ${selectedSiteForReport?.name}`);
              setShowReportPreview(false);
            }}>
              Generate PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
      )}

    </AIAssistantProvider>
  );
};

export default Index;
