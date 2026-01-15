import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus, Bot } from "lucide-react";
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
import { EmployeeAnalyticsPage } from "@/components/checkout/EmployeeAnalyticsPage";

import { CompanySettings } from "@/components/settings/CompanySettings";
import { Asset, Waybill, WaybillItem, QuickCheckout, ReturnBill, Site, CompanySettings as CompanySettingsType, Employee, ReturnItem, SiteTransaction, Vehicle } from "@/types/asset";
import { EquipmentLog } from "@/types/equipment";
import { ConsumableUsageLog } from "@/types/consumable";
import { AssetAnalyticsDialog } from "@/components/assets/AssetAnalyticsDialog";
import { ReturnsList } from "@/components/waybills/ReturnsList";
import { useToast } from "@/hooks/use-toast";
import { BulkImportAssets } from "@/components/assets/BulkImportAssets";
import { InventoryReport } from "@/components/assets/InventoryReport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SitesPage } from "@/components/sites/SitesPage";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteInventory } from "@/hooks/useSiteInventory";
import { SiteInventoryItem } from "@/types/inventory";
import { AIAssistantProvider, useAIAssistant } from "@/contexts/AIAssistantContext";
import { AIAssistantChat } from "@/components/ai/AIAssistantChat";
import { logActivity } from "@/utils/activityLogger";
import { calculateAvailableQuantity } from "@/utils/assetCalculations";
import { AuditCharts } from "@/components/reporting/AuditCharts";
import { MachineMaintenancePage } from "@/components/maintenance/MachineMaintenancePage";
import { Machine, MaintenanceLog } from "@/types/maintenance";
import { exportAssetsToExcel } from "../utils/exportUtils";
import { useAppData } from "@/contexts/AppDataContext";
import { dataService } from "@/services/dataService";


const Index = () => {
  const { toast } = useToast();
  const { isAuthenticated, hasPermission, currentUser } = useAuth();

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
  const [showWaybillDocument, setShowWaybillDocument] = useState<Waybill | null>(null);
  const [showReturnWaybillDocument, setShowReturnWaybillDocument] = useState<Waybill | null>(null);
  const [showReturnForm, setShowReturnForm] = useState<Waybill | null>(null);
  const [processingReturnWaybill, setProcessingReturnWaybill] = useState<Waybill | null>(null);
  const [editingWaybill, setEditingWaybill] = useState<Waybill | null>(null);
  const [editingReturnWaybill, setEditingReturnWaybill] = useState<Waybill | null>(null);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedAssetForAnalytics, setSelectedAssetForAnalytics] = useState<Asset | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiPrefillData, setAiPrefillData] = useState<any>(null);
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

  // Initialize data on mount if needed (AppDataContext handles its own loading, but we might want to ensure freshness)
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Load assets from database (Not yet in AppDataContext)
  useEffect(() => {
    (async () => {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          const loadedAssets = await window.electronAPI.db.getAssets();
          const processedAssets = loadedAssets.map((item: any) => {
            const asset = {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              siteQuantities: item.site_quantities ? JSON.parse(item.site_quantities) : {}
            };
            return asset;
          });
          logger.info('Loaded assets with availableQuantity', { data: { processedAssets } });
          setAssets(processedAssets);
        } catch (error) {
          logger.error('Failed to load assets from database', error);
        }
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

  // Load waybills from database (Not yet in AppDataContext)
  useEffect(() => {
    (async () => {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          const loadedWaybills = await window.electronAPI.db.getWaybills();
          logger.info("Loaded waybills from DB", { data: { loadedWaybills } });
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
      }
    })();
  }, []);

  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);

  // Load consumable logs from database (Not yet in AppDataContext)
  useEffect(() => {
    (async () => {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          const logs = await window.electronAPI.db.getConsumableLogs();
          // Database already returns transformed data (camelCase), no need to map again
          setConsumableLogs(logs);
        } catch (error) {
          logger.error('Failed to load consumable logs from database', error);
        }
      }
    })();
  }, []);

  // Load maintenance logs from database (Not yet in AppDataContext)
  useEffect(() => {
    (async () => {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          const loadedLogs = await (window.electronAPI.db as any).getMaintenanceLogs?.();
          if (loadedLogs) {
            setMaintenanceLogs(loadedLogs.map((item: any) => ({
              ...item,
              dateStarted: new Date(item.dateStarted || item.date_started),
              dateCompleted: item.dateCompleted ? new Date(item.dateCompleted) : undefined,
              nextServiceDue: item.nextServiceDue ? new Date(item.nextServiceDue) : undefined,
              createdAt: new Date(item.createdAt || item.created_at),
              updatedAt: new Date(item.updatedAt || item.updated_at)
            })));
          }
        } catch (error) {
          logger.error('Failed to load maintenance logs from database', error);
        }
      }
    })();
  }, []);

  // Initialize site inventory hook to track materials at each site
  const { siteInventory, getSiteInventory } = useSiteInventory(waybills, assets);


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

    // Database check handled by dataService

    // Generate sequential waybill ID
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
      // Save waybill to database
      await dataService.waybills.createWaybill(newWaybill);

      // Rely on DB reload to update inventory
      setWaybills(prev => [...prev, newWaybill]);

      // Trigger assets refresh
      const loadedAssets = await dataService.assets.getAssets();
      window.dispatchEvent(new CustomEvent('refreshAssets', {
        detail: loadedAssets.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }))
      }));

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

    if (waybill.type === 'return') {
      if (waybill.status !== 'outstanding') {
        toast({
          title: "Cannot Delete",
          description: `Processed returns cannot be deleted.`,
          variant: "destructive"
        });
        return;
      }

      // For outstanding return waybills: just delete without affecting inventory
      // since inventory wasn't changed when created
      try {
        if (window.electronAPI && window.electronAPI.db) {
          await window.electronAPI.db.deleteWaybill(waybill.id);
        }
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
        logger.error('Failed to delete return waybill from database', error);
        toast({
          title: "Error",
          description: "Failed to delete return waybill from database",
          variant: "destructive"
        });
      }
    } else {
      // For regular waybills: use database transaction to properly revert changes
      try {
        if (window.electronAPI && window.electronAPI.db) {
          await window.electronAPI.db.deleteWaybillWithTransaction(waybill.id);

          // Reload assets and waybills from database to reflect changes
          const loadedAssets = await window.electronAPI.db.getAssets();
          const processedAssets = loadedAssets.map((item: any) => {
            const asset = {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              siteQuantities: item.site_quantities ? JSON.parse(item.site_quantities) : {}
            };
            return asset;
          });
          setAssets(processedAssets);

          const loadedWaybills = await window.electronAPI.db.getWaybills();
          setWaybills(loadedWaybills.map((item: any) => ({
            ...item,
            issueDate: new Date(item.issueDate),
            expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
            sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          })));
        }

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
        logger.error('Failed to delete waybill from database', error);
        toast({
          title: "Error",
          description: "Failed to delete waybill from database",
          variant: "destructive"
        });
      }
    }
  };

  const handleSentToSite = async (waybill: Waybill, sentToSiteDate: Date) => {
    if (!window.electronAPI || !window.electronAPI.db) {
      toast({
        title: "Database Not Available",
        description: "Cannot send waybill to site without database connection.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the database transaction to handle all updates
      const result = await window.electronAPI.db.sendToSiteWithTransaction(
        waybill.id,
        sentToSiteDate.toISOString()
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send waybill to site');
      }

      // Reload assets from database to reflect the changes
      const loadedAssets = await window.electronAPI.db.getAssets();
      const processedAssets = loadedAssets.map((item: any) => {
        const asset = {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        };
        return asset;
      });
      setAssets(processedAssets);

      // Reload waybills from database
      const loadedWaybills = await window.electronAPI.db.getWaybills();
      const processedWaybills = loadedWaybills.map((item: any) => ({
        ...item,
        issueDate: new Date(item.issueDate),
        expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
        sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      }));
      setWaybills(processedWaybills);

      // Update the displayed waybill document if it's currently showing this waybill
      if (showWaybillDocument && showWaybillDocument.id === waybill.id) {
        const updatedWaybill = processedWaybills.find((w: Waybill) => w.id === waybill.id);
        if (updatedWaybill) {
          setShowWaybillDocument(updatedWaybill);
        }
      }

      // Reload site transactions from database
      const loadedTransactions = await window.electronAPI.db.getSiteTransactions();
      setSiteTransactions(loadedTransactions.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      })));

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

    // Check if database is available
    if (!window.electronAPI || !window.electronAPI.db) {
      toast({
        title: "Database Not Available",
        description: "This app needs to run in Electron mode to access the database. Please run the desktop application.",
        variant: "destructive"
      });
      return;
    }

    // Check for existing pending returns or zero stock warnings
    const warnings: string[] = [];
    const errors: string[] = [];
    const currentSiteInventory = getSiteInventory(waybillData.siteId);

    waybillData.items.forEach(item => {
      // Check for pending returns
      const pendingReturns = waybills.filter(wb =>
        wb.type === 'return' &&
        wb.status === 'outstanding' &&
        wb.siteId === waybillData.siteId &&
        wb.items.some(wbItem => wbItem.assetId === item.assetId)
      );

      const pendingQty = pendingReturns.reduce((sum, wb) => {
        const wbItem = wb.items.find(i => i.assetId === item.assetId);
        // Only count unreturned quantity (quantity minus what's already returned)
        const unreturnedQty = (wbItem?.quantity || 0) - (wbItem?.returnedQuantity || 0);
        return sum + unreturnedQty;
      }, 0);

      // Get site quantity from siteInventory instead of assets array
      const siteItem = currentSiteInventory.find(si => si.assetId === item.assetId);
      const currentSiteQty = siteItem?.quantity || 0;
      const effectiveAvailable = currentSiteQty - pendingQty;

      if (pendingQty > 0) {
        warnings.push(`${item.assetName} (${pendingQty} quantity) already has pending return(s) at this site.`);
      }

      if (effectiveAvailable < item.quantity) {
        errors.push(`Quantity exceeds what is on site for ${item.assetName}: Only ${effectiveAvailable} effectively available (requested: ${item.quantity}).`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: "Return Error",
        description: errors.join(' '),
        variant: "destructive"
      });
      return; // Block creation
    }

    if (warnings.length > 0) {
      toast({
        title: "Return Warning",
        description: warnings.join(' '),
        variant: "default"
      });
    }

    // Don't generate ID on frontend - let backend handle it to avoid duplicates
    const newReturnWaybill = {
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
      // Save return waybill to database (ID will be generated by backend)
      logger.info("Creating return waybill", { data: { newReturnWaybill } });
      const createdWaybill = await window.electronAPI.db.createWaybill(newReturnWaybill);

      if (createdWaybill) {
        setWaybills(prev => [...prev, createdWaybill]);
        setShowReturnWaybillDocument(createdWaybill);
        setActiveTab("returns");

        await logActivity({
          action: 'create',
          entity: 'waybill',
          entityId: createdWaybill.id,
          details: `Created return waybill ${createdWaybill.id} from site ${newReturnWaybill.siteId}`
        });

        toast({
          title: "Return Waybill Created",
          description: `Return waybill ${createdWaybill.id} created successfully.`
        });
      }
    } catch (error) {
      logger.error('Failed to create return waybill', error);
      toast({
        title: "Error",
        description: `Failed to create return waybill: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

  const handleProcessReturn = async (returnData: { waybillId: string; items: ReturnItem[] }) => {
    // Get the return waybill to know which site this return is from
    const returnWaybill = waybills.find(wb => wb.id === returnData.waybillId);
    const siteId = returnWaybill?.siteId;

    if (!siteId) {
      toast({
        title: "Invalid Return",
        description: "Cannot process return: site information not found.",
        variant: "destructive"
      });
      return;
    }

    // Get site inventory for validation
    const currentSiteInventory = getSiteInventory(siteId);

    // Validate against site inventory: Ensure return quantities don't exceed what's available at the site
    for (const returnItem of returnData.items) {
      const siteItem = currentSiteInventory.find(si => si.assetId === returnItem.assetId);
      const currentSiteQty = siteItem?.quantity || 0;

      // Check for pending returns for the same asset from the same site, excluding the current return being processed
      const pendingReturns = waybills.filter(wb =>
        wb.type === 'return' &&
        wb.status === 'outstanding' &&
        wb.siteId === siteId &&
        wb.id !== returnData.waybillId && // Exclude the current return waybill
        wb.items.some(wbItem => wbItem.assetId === returnItem.assetId)
      );
      const pendingQty = pendingReturns.reduce((sum, wb) => {
        const wbItem = wb.items.find(i => i.assetId === returnItem.assetId);
        // Only count unreturned quantity (quantity minus what's already returned)
        const unreturnedQty = (wbItem?.quantity || 0) - (wbItem?.returnedQuantity || 0);
        return sum + unreturnedQty;
      }, 0);

      const effectiveAvailable = currentSiteQty - pendingQty;

      if (returnItem.quantity > effectiveAvailable) {
        toast({
          title: "Invalid Return Quantity",
          description: `Return quantity (${returnItem.quantity}) exceeds available quantity at site (${effectiveAvailable}) for asset ${returnItem.assetName}. There might be other pending returns.`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validate against return waybill: Ensure total returned doesn't exceed quantity requested in return waybill
    for (const returnItem of returnData.items) {
      if (!returnWaybill) continue;

      const returnWaybillItem = returnWaybill.items.find(item => item.assetId === returnItem.assetId);
      if (!returnWaybillItem) {
        toast({
          title: "Invalid Return",
          description: `Cannot return item with assetId ${returnItem.assetId} that was not requested in the return waybill.`,
          variant: "destructive"
        });
        return;
      }

      const totalReturned = (returnWaybillItem.returnedQuantity || 0) + returnItem.quantity;
      if (totalReturned > returnWaybillItem.quantity) {
        toast({
          title: "Invalid Return Quantity",
          description: `Return quantity for ${returnItem.assetName} exceeds quantity requested in return waybill (${returnWaybillItem.quantity}). Current returned: ${returnWaybillItem.returnedQuantity || 0}`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Use the backend transaction to process the return
      if (window.electronAPI && window.electronAPI.db) {
        const result = await window.electronAPI.db.processReturnWithTransaction(returnData);
        if (result.success) {
          await logActivity({
            action: 'process_return',
            entity: 'waybill',
            entityId: returnData.waybillId,
            details: `Processed return for waybill ${returnData.waybillId} (${returnData.items.length} items)`
          });

          toast({
            title: "Return Processed",
            description: "Return has been successfully processed.",
          });

          // Refresh data from database
          const [updatedAssets, updatedWaybills] = await Promise.all([
            window.electronAPI.db.getAssets(),
            window.electronAPI.db.getWaybills()
          ]);

          // Data is already transformed by database layer
          setAssets(updatedAssets);
          setWaybills(updatedWaybills);
        } else {
          throw new Error(result.error || 'Failed to process return');
        }
      }
    } catch (error) {
      logger.error('Error processing return:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process return",
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

      if (window.electronAPI && window.electronAPI.db) {
        // Sanitize dates for DB (ensure they are strings)
        const dbPayload = {
          ...updatedCheckout,
          checkoutDate: updatedCheckout.checkoutDate instanceof Date ? updatedCheckout.checkoutDate.toISOString() : updatedCheckout.checkoutDate,
          returnDate: updatedCheckout.returnDate instanceof Date ? updatedCheckout.returnDate.toISOString() : updatedCheckout.returnDate
        };
        await window.electronAPI.db.updateQuickCheckout(checkout.id, dbPayload);
      }

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

          if (window.electronAPI && window.electronAPI.db) {
            window.electronAPI.db.updateAsset(asset.id, updatedAssetData).catch(e => logger.error("Failed to update asset after return", e));
          }
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
            if (window.electronAPI && window.electronAPI.db) {
              window.electronAPI.db.updateAsset(asset.id, updatedAsset).catch(e => logger.error("Failed to update asset for checkout deletion", e));
            }

            return updatedAsset;
          }
          return asset;
        }));
      }

      if (window.electronAPI && window.electronAPI.db) {
        await window.electronAPI.db.deleteQuickCheckout(checkoutId);
      }
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
    if (window.electronAPI && window.electronAPI.db) {
      // Sanitize dates for DB
      const dbPayload = {
        ...updatedCheckoutData,
        checkoutDate: updatedCheckoutData.checkoutDate instanceof Date ? updatedCheckoutData.checkoutDate.toISOString() : updatedCheckoutData.checkoutDate,
        returnDate: updatedCheckoutData.returnDate instanceof Date ? updatedCheckoutData.returnDate.toISOString() : updatedCheckoutData.returnDate
      };
      await window.electronAPI.db.updateQuickCheckout(checkoutId, dbPayload);
    }

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
        if (window.electronAPI && window.electronAPI.db) {
          window.electronAPI.db.updateAsset(asset.id, updatedAsset)
            .catch(err => logger.error("Failed to update asset in partial return", err));
        }

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

      const site = sites.find(s => s.id === siteId);
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

    if (!window.electronAPI || !window.electronAPI.db) {
      toast({
        title: "Database Not Available",
        description: "Cannot save maintenance logs without database connection.",
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

        await (window.electronAPI.db as any).createMaintenanceLog?.(log);

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
              await (window.electronAPI.db as any).updateAsset(asset.id, updatedAsset);

              // Update local state for asset
              setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));

              // Create 'Used' Checkout Record for tracking
              const checkoutData = {
                assetId: asset.id,
                assetName: asset.name,
                employeeId: 'MAINTENANCE', // System user or similar
                employeeName: entry.technician || 'Maintenance Technician',
                quantity: part.quantity,
                checkoutDate: new Date(),
                status: 'used', // Directly mark as used
                notes: `Used in maintenance for machine: ${entry.machineId}. Work: ${entry.reason || entry.workDone}`,
                returnDate: new Date() // Completed immediately
              };

              try {
                await (window.electronAPI.db as any).createQuickCheckout?.(checkoutData);
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
      const loadedLogs = await (window.electronAPI.db as any).getMaintenanceLogs?.();
      if (loadedLogs) {
        setMaintenanceLogs(loadedLogs.map((item: any) => ({
          ...item,
          dateStarted: new Date(item.dateStarted || item.date_started),
          dateCompleted: item.dateCompleted ? new Date(item.dateCompleted) : undefined,
          nextServiceDue: item.nextServiceDue ? new Date(item.nextServiceDue) : undefined,
          createdAt: new Date(item.createdAt || item.created_at),
          updatedAt: new Date(item.updatedAt || item.updated_at)
        })));
      }

      toast({
        title: "Maintenance Logged",
        description: `Successfully logged maintenance for ${entries.length} machine(s)`
      });
    } catch (error) {
      logger.error('Failed to save maintenance logs', error);
      toast({
        title: "Error",
        description: "Failed to save maintenance logs to database",
        variant: "destructive"
      });
    }
  };

  const handleUpdateQuickCheckoutStatus = async (checkoutId: string, status: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to update status",
        variant: "destructive"
      });
      return;
    }

    if (window.electronAPI && window.electronAPI.db) {
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

            await window.electronAPI.db.updateAsset(asset.id, updatedAsset);
            setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
          }
        }

        await window.electronAPI.db.updateQuickCheckout(checkoutId, checkoutToUpdate ? { ...checkoutToUpdate, status } : { status });

        // Refresh checkouts
        const loadedCheckouts = await window.electronAPI.db.getQuickCheckouts();
        setQuickCheckouts(loadedCheckouts.map((item: any) => ({
          ...item,
          checkoutDate: new Date(item.checkoutDate),
          returnDate: item.returnDate ? new Date(item.returnDate) : undefined,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        })));

        toast({
          title: "Status Updated",
          description: `Checkout status updated to ${status}`
        });

        await logActivity({
          action: 'update',
          entity: 'checkout',
          entityId: checkoutId,
          details: `Updated quick checkout status to ${status}`
        });

      } catch (error) {
        logger.error('Failed to update checkout status', error);
        toast({
          title: "Error",
          description: "Failed to update status in database",
          variant: "destructive"
        });
      }
    } else {
      // Optimistic update for non-electron env
      setQuickCheckouts(prev => prev.map(qc => qc.id === checkoutId ? { ...qc, status: status as any } : qc));
    }
  };

  function renderContent() {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard assets={assets} waybills={waybills} quickCheckouts={quickCheckouts} sites={sites} equipmentLogs={equipmentLogs} employees={employees} onQuickLogEquipment={async (log: EquipmentLog) => {
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
          } else {
            setEquipmentLogs(prev => [...prev, log]);
          }
        }} onNavigate={(tab, params) => {
          setActiveTab(tab);
          if (tab === 'assets' && params?.availability) {
            setActiveAvailabilityFilter(params.availability);
          }
        }} />;
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
            setShowAnalyticsDialog(true);
          }}
        />;
      case "add-asset":
        return isAuthenticated ? (
          <AddAssetForm
            onAddAsset={handleAddAsset}
            sites={sites}
            existingAssets={assets}
            initialData={aiPrefillData?.formType === 'asset' ? aiPrefillData : undefined}
          />
        ) : <div>You must be logged in to add assets.</div>;
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
          onViewWaybill={(waybill) => {
            setShowReturnWaybillDocument(waybill);
          }}
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

              if (window.electronAPI && window.electronAPI.db) {
                try {
                  await window.electronAPI.db.updateEquipmentLog(log.id, log);
                  const logs = await window.electronAPI.db.getEquipmentLogs();
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
              } else {
                setEquipmentLogs(prev => prev.map(l => l.id === log.id ? log : l));
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

              if (window.electronAPI && window.electronAPI.db) {
                try {
                  await window.electronAPI.db.createConsumableLog(log);
                  const logs = await window.electronAPI.db.getConsumableLogs();
                  // Database already returns transformed data (camelCase), no need to map again
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
                    await window.electronAPI.db.updateAsset(asset.id, updatedAsset);
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
              } else {
                setConsumableLogs(prev => [...prev, log]);
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

              if (window.electronAPI && window.electronAPI.db) {
                try {
                  // Find the old log to calculate the difference
                  const oldLog = consumableLogs.find(l => l.id === log.id);
                  const oldQuantityUsed = oldLog?.quantityUsed || 0;
                  const quantityDifference = log.quantityUsed - oldQuantityUsed;

                  const logData = {
                    ...log,
                    consumable_id: log.consumableId,
                    consumable_name: log.consumableName,
                    site_id: log.siteId,
                    date: log.date.toISOString(),
                    quantity_used: log.quantityUsed,
                    quantity_remaining: log.quantityRemaining,
                    unit: log.unit,
                    used_for: log.usedFor,
                    used_by: log.usedBy,
                    notes: log.notes
                  };
                  await window.electronAPI.db.updateConsumableLog(log.id, logData);
                  const logs = await window.electronAPI.db.getConsumableLogs();
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
                      await window.electronAPI.db.updateAsset(asset.id, updatedAsset);
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
              } else {
                setConsumableLogs(prev => prev.map(l => l.id === log.id ? log : l));
              }
            }}
          />
        );
      default:
        return <Dashboard assets={assets} waybills={waybills} quickCheckouts={quickCheckouts} sites={sites} equipmentLogs={equipmentLogs} employees={employees} onQuickLogEquipment={async (log: EquipmentLog) => {
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
            "flex-1 overflow-y-auto p-3 md:p-6",
            isMobile && "pb-20" // Add padding for bottom nav
          )}>
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
                      if (!(window.electronAPI && window.electronAPI.db)) return;

                      try {
                        const result = await window.electronAPI.db.updateWaybillWithTransaction(
                          updatedWaybill.id as string,
                          updatedWaybill
                        );

                        if (!result.success) {
                          throw new Error(result.error || 'Failed to update waybill');
                        }

                        // Reload assets to reflect reserved quantity changes
                        const loadedAssets = await window.electronAPI.db.getAssets();
                        const processedAssets = loadedAssets.map((item: any) => {
                          const asset = {
                            ...item,
                            siteQuantities: typeof item.siteQuantities === 'string' ? JSON.parse(item.siteQuantities || '{}') : (item.siteQuantities || {}),
                            purchaseDate: item.purchaseDate ? new Date(item.purchaseDate) : undefined,
                            createdAt: new Date(item.createdAt),
                            updatedAt: new Date(item.updatedAt)
                          };
                          return asset;
                        });
                        setAssets(processedAssets);

                        // Reload waybills to reflect changes
                        const loadedWaybills = await window.electronAPI.db.getWaybills();
                        setWaybills(loadedWaybills.map((item: any) => ({
                          ...item,
                          issueDate: new Date(item.issueDate),
                          expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
                          sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
                          createdAt: new Date(item.createdAt),
                          updatedAt: new Date(item.updatedAt)
                        })));

                        setEditingWaybill(null);
                        toast({
                          title: "Waybill Updated",
                          description: `Waybill ${updatedWaybill.id} updated successfully. Reserved quantities adjusted.`
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

            {/* Asset Analytics Dialog */}
            <AssetAnalyticsDialog
              asset={selectedAssetForAnalytics}
              open={showAnalyticsDialog}
              onOpenChange={setShowAnalyticsDialog}
              quickCheckouts={quickCheckouts}
              sites={sites}
              maintenanceLogs={maintenanceLogs}
            />

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
