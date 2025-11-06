import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Plus } from "lucide-react";
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
import { transformAssetFromDB, transformWaybillFromDB } from "@/utils/dataTransform";

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
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SitesPage } from "@/components/sites/SitesPage";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteInventory } from "@/hooks/useSiteInventory";
import { SiteInventoryItem } from "@/types/inventory";

const Index = () => {
  const { toast } = useToast();
  const { isAuthenticated, hasPermission, currentUser } = useAuth();
  const isMobile = useIsMobile();
  const params = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWaybillDocument, setShowWaybillDocument] = useState<Waybill | null>(null);
  const [showReturnWaybillDocument, setShowReturnWaybillDocument] = useState<Waybill | null>(null);
  const [showReturnForm, setShowReturnForm] = useState<Waybill | null>(null);
  const [processingReturnWaybill, setProcessingReturnWaybill] = useState<Waybill | null>(null);
  const [editingWaybill, setEditingWaybill] = useState<Waybill | null>(null);
  const [editingReturnWaybill, setEditingReturnWaybill] = useState<Waybill | null>(null);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [selectedAssetForAnalytics, setSelectedAssetForAnalytics] = useState<Asset | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  // Load assets from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedAssets = await window.db.getAssets();
          const processedAssets = loadedAssets.map((item: any) => {
            const asset = {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              siteQuantities: item.site_quantities ? JSON.parse(item.site_quantities) : {}
            };
            // Recalculate availableQuantity on load
            if (!asset.siteId) {
              const reservedQuantity = asset.reservedQuantity || 0;
              const damagedCount = asset.damagedCount || 0;
              const missingCount = asset.missingCount || 0;
              const totalQuantity = asset.quantity;
              asset.availableQuantity = totalQuantity - reservedQuantity - damagedCount - missingCount;
            }
            return asset;
          });
          console.log('Loaded assets with availableQuantity:', processedAssets);
          setAssets(processedAssets);
        } catch (error) {
          logger.error('Failed to load assets from database', error);
        }
      }
    })();
  }, []);

  const [waybills, setWaybills] = useState<Waybill[]>([]);

  // Load waybills from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedWaybills = await window.db.getWaybills();
          console.log("Loaded waybills from DB:", loadedWaybills);
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

  const [quickCheckouts, setQuickCheckouts] = useState<QuickCheckout[]>([]);

  // Load quick checkouts from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedCheckouts = await window.db.getQuickCheckouts();
          setQuickCheckouts(loadedCheckouts.map((item: any) => ({
            ...item,
            checkoutDate: new Date(item.checkoutDate)
          })));
        } catch (error) {
          logger.error('Failed to load quick checkouts from database', error);
        }
      }
    })();
  }, []);


  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Load employees from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedEmployees = await window.db.getEmployees();
          setEmployees(loadedEmployees.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          })));
        } catch (error) {
          logger.error('Failed to load employees from database', error);
        }
      }
    })();
  }, []);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Load vehicles from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedVehicles = await window.db.getVehicles();
          setVehicles(loadedVehicles.map((item: any) => ({
            ...item,
            createdAt: new Date(item.created_at || item.createdAt),
            updatedAt: new Date(item.updated_at || item.updatedAt)
          })));
        } catch (error) {
          logger.error('Failed to load vehicles from database', error);
        }
      }
    })();
  }, []);

  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [sites, setSites] = useState<Site[]>([]);

  // Load sites from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedSites = await window.db.getSites();
          setSites(loadedSites.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          })));
        } catch (error) {
          logger.error('Failed to load sites from database', error);
        }
      }
    })();
  }, []);

  const [companySettings, setCompanySettings] = useState<CompanySettingsType>({} as CompanySettingsType);

  // Load company settings from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedSettings = await window.db.getCompanySettings();
          setCompanySettings(loadedSettings || {});
        } catch (error) {
          logger.error('Failed to load company settings from database', error);
        }
      }
    })();
  }, []);

const [siteTransactions, setSiteTransactions] = useState<SiteTransaction[]>([]);

  // Load site transactions from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const loadedTransactions = await window.db.getSiteTransactions();
          setSiteTransactions(loadedTransactions.map((item: any) => ({
            ...item,
            createdAt: new Date(item.createdAt)
          })));
        } catch (error) {
          logger.error('Failed to load site transactions from database', error);
        }
      }
    })();
  }, []);

const [equipmentLogs, setEquipmentLogs] = useState<EquipmentLog[]>([]);

  // Load equipment logs from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const logs = await window.db.getEquipmentLogs();
          setEquipmentLogs(logs.map((item: any) => ({
            id: item.id,
            equipmentId: item.equipment_id ? item.equipment_id.toString() : item.equipment_id,
            equipmentName: item.equipment_name,
            siteId: item.site_id ? item.site_id.toString() : item.site_id,
            date: new Date(item.date),
            active: item.active,
            downtimeEntries: typeof item.downtime_entries === 'string' ? JSON.parse(item.downtime_entries) : item.downtime_entries || [],
            maintenanceDetails: item.maintenance_details,
            dieselEntered: item.diesel_entered,
            supervisorOnSite: item.supervisor_on_site,
            clientFeedback: item.client_feedback,
            issuesOnSite: item.issues_on_site,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at)
          })));
        } catch (error) {
          logger.error('Failed to load equipment logs from database', error);
        }
      }
    })();
  }, []);

const [consumableLogs, setConsumableLogs] = useState<ConsumableUsageLog[]>([]);

  // Load consumable logs from database
  useEffect(() => {
    (async () => {
      if (window.db) {
        try {
          const logs = await window.db.getConsumableLogs();
          setConsumableLogs(logs.map((item: any) => ({
            id: item.id,
            consumableId: item.consumable_id,
            consumableName: item.consumable_name,
            siteId: item.site_id,
            date: new Date(item.date),
            quantityUsed: item.quantity_used,
            quantityRemaining: item.quantity_remaining,
            unit: item.unit,
            usedFor: item.used_for,
            usedBy: item.used_by,
            notes: item.notes,
            createdAt: new Date(item.created_at),
            updatedAt: new Date(item.updated_at)
          })));
        } catch (error) {
          logger.error('Failed to load consumable logs from database', error);
        }
      }
    })();
  }, []);

  // Initialize site inventory hook to track materials at each site
  const { siteInventory, getSiteInventory } = useSiteInventory(waybills, assets);




  // Recalculate availableQuantity for all assets when assets change
  useEffect(() => {
    setAssets(prev => prev.map(asset => {
      if (!asset.siteId) { // Only for office assets (which track total company stock)
        const reservedQuantity = asset.reservedQuantity || 0;
        const damagedCount = asset.damagedCount || 0;
        const missingCount = asset.missingCount || 0;
        const totalQuantity = asset.quantity;
        return {
          ...asset,
          availableQuantity: totalQuantity - reservedQuantity - damagedCount - missingCount
        };
      }
      return asset;
    }));
  }, [assets.length]); // Only recalculate when assets array length changes, not on every update to avoid loops



  const handleAddAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to add assets",
        variant: "destructive"
      });
      return;
    }

    // Check if database is available
    if (!window.db) {
      toast({
        title: "Database Not Available",
        description: "This app needs to run in Electron mode to access the database. Please run the desktop application.",
        variant: "destructive"
      });
      return;
    }

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
      const savedAssets = await window.db.addAsset(newAsset);
      const savedAsset = savedAssets[0]; // addAsset returns an array

      // Update local state with the saved asset
      setAssets(prev => [...prev, savedAsset]);
      setActiveTab("assets");

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
      availableQuantity: !updatedAsset.siteId ? (updatedAsset.quantity - (updatedAsset.reservedQuantity || 0) - (updatedAsset.damagedCount || 0) - (updatedAsset.missingCount || 0)) : updatedAsset.availableQuantity,
      updatedAt: new Date()
    };

    try {
      // Update in database first
      if (window.db) {
        await window.db.updateAsset(updatedAsset.id, assetWithUpdatedDate);
      }

      // Then update local state
      setAssets(prev =>
        prev.map(asset => (asset.id === updatedAsset.id ? assetWithUpdatedDate : asset))
      );
      setEditingAsset(null);

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
        await window.db.deleteAsset(deletingAsset.id);

        // Then remove from local state
        setAssets(prev => prev.filter(asset => asset.id !== deletingAsset.id));
        setDeletingAsset(null);

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

    // Check if database is available
    if (!window.db) {
      toast({
        title: "Database Not Available",
        description: "This app needs to run in Electron mode to access the database. Please run the desktop application.",
        variant: "destructive"
      });
      return;
    }

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
      await window.db.createWaybill(newWaybill);

      // Update asset reserved quantities when waybill is created
      for (const item of newWaybill.items) {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const newReservedQuantity = (asset.reservedQuantity || 0) + item.quantity;
          const totalAtSites = assets.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
          const totalQuantity = asset.quantity + totalAtSites;
          const updatedAsset = {
            ...asset,
            reservedQuantity: newReservedQuantity,
            availableQuantity: totalQuantity - newReservedQuantity - (asset.damagedCount || 0) - (asset.missingCount || 0),
            updatedAt: new Date()
          };
          
          // Update in database
          await window.db.updateAsset(asset.id, updatedAsset);
          
          // Update local state
          setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
        }
      }

      setWaybills(prev => [...prev, newWaybill]);
      
      // Trigger assets refresh
      const loadedAssets = await window.db.getAssets();
      window.dispatchEvent(new CustomEvent('refreshAssets', { 
        detail: loadedAssets.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        }))
      }));
      
      setShowWaybillDocument(newWaybill);
      setActiveTab("waybills");

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
        if (window.db) {
          await window.db.deleteWaybill(waybill.id);
        }
        setWaybills(prev => prev.filter(wb => wb.id !== waybill.id));

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
        if (window.db) {
          await window.db.deleteWaybillWithTransaction(waybill.id);

          // Reload assets and waybills from database to reflect changes
          const loadedAssets = await window.db.getAssets();
          const processedAssets = loadedAssets.map((item: any) => {
            const asset = {
              ...item,
              createdAt: new Date(item.createdAt),
              updatedAt: new Date(item.updatedAt),
              siteQuantities: item.site_quantities ? JSON.parse(item.site_quantities) : {}
            };
            // Recalculate availableQuantity on load
            if (!asset.siteId) {
              const reservedQuantity = asset.reservedQuantity || 0;
              const damagedCount = asset.damagedCount || 0;
              const missingCount = asset.missingCount || 0;
              const totalQuantity = asset.quantity;
              asset.availableQuantity = totalQuantity - reservedQuantity - damagedCount - missingCount;
            }
            return asset;
          });
          setAssets(processedAssets);

          const loadedWaybills = await window.db.getWaybills();
          setWaybills(loadedWaybills.map((item: any) => ({
            ...item,
            issueDate: new Date(item.issueDate),
            expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
            sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt)
          })));
        } else {
          // Fallback to local state updates if no database
          waybill.items.forEach(item => {
            setAssets(prev => prev.map(asset => {
              if (asset.id === item.assetId) {
                const newReservedQuantity = Math.max(0, (asset.reservedQuantity || 0) - item.quantity);
                const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
                const totalQuantity = asset.quantity + totalAtSites;
                return {
                  ...asset,
                  reservedQuantity: newReservedQuantity,
                  availableQuantity: totalQuantity - newReservedQuantity - (asset.damagedCount || 0) - (asset.missingCount || 0),
                  updatedAt: new Date()
                };
              }
              return asset;
            }));
          });

          setWaybills(prev => prev.filter(wb => wb.id !== waybill.id));
        }

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
    if (!window.db) {
      toast({
        title: "Database Not Available",
        description: "Cannot send waybill to site without database connection.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Call the database transaction to handle all updates
      const result = await window.db.sendToSiteWithTransaction(
        waybill.id, 
        sentToSiteDate.toISOString()
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to send waybill to site');
      }

      // Reload assets from database to reflect the changes
      const loadedAssets = await window.db.getAssets();
      const processedAssets = loadedAssets.map((item: any) => {
        const asset = {
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt)
        };
        // Recalculate availableQuantity on load
        if (!asset.siteId) {
          const reservedQuantity = asset.reservedQuantity || 0;
          const damagedCount = asset.damagedCount || 0;
          const missingCount = asset.missingCount || 0;
          const totalQuantity = asset.quantity;
          asset.availableQuantity = totalQuantity - reservedQuantity - damagedCount - missingCount;
        }
        return asset;
      });
      setAssets(processedAssets);

      // Reload waybills from database
      const loadedWaybills = await window.db.getWaybills();
      setWaybills(loadedWaybills.map((item: any) => ({
        ...item,
        issueDate: new Date(item.issueDate),
        expectedReturnDate: item.expectedReturnDate ? new Date(item.expectedReturnDate) : undefined,
        sentToSiteDate: item.sentToSiteDate ? new Date(item.sentToSiteDate) : undefined,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt)
      })));

      // Reload site transactions from database
      const loadedTransactions = await window.db.getSiteTransactions();
      setSiteTransactions(loadedTransactions.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt)
      })));

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
    if (!window.db) {
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
      console.log("Creating return waybill:", newReturnWaybill);
      const createdWaybill = await window.db.createWaybill(newReturnWaybill);

      if (createdWaybill) {
        setWaybills(prev => [...prev, createdWaybill]);
        setShowReturnWaybillDocument(createdWaybill);
        setActiveTab("returns");

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
      if (window.db) {
        const result = await window.db.processReturnWithTransaction(returnData);
        if (result.success) {
          toast({
            title: "Return Processed",
            description: "Return has been successfully processed.",
          });
          
          // Refresh data from database
          const [updatedAssets, updatedWaybills] = await Promise.all([
            window.db.getAssets(),
            window.db.getWaybills()
          ]);
          
          setAssets(updatedAssets.map(transformAssetFromDB));
          setWaybills(updatedWaybills.map(transformWaybillFromDB));
        } else {
          throw new Error(result.error || 'Failed to process return');
        }
      }
    } catch (error) {
      console.error('Error processing return:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process return",
        variant: "destructive"
      });
    }
  };

  const handleQuickCheckout = (checkoutData: Omit<QuickCheckout, 'id'>) => {
    const newCheckout: QuickCheckout = {
      ...checkoutData,
      id: Date.now().toString(),
      returnedQuantity: 0
    };

    // Reserve the quantity in asset inventory (similar to waybill creation)
    setAssets(prev => prev.map(asset => {
      if (asset.id === checkoutData.assetId) {
        const newReservedQuantity = (asset.reservedQuantity || 0) + checkoutData.quantity;
        const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
        const totalQuantity = asset.quantity + totalAtSites;
        return {
          ...asset,
          reservedQuantity: newReservedQuantity,
          availableQuantity: totalQuantity - newReservedQuantity - (asset.damagedCount || 0) - (asset.missingCount || 0),
          updatedAt: new Date()
        };
      }
      return asset;
    }));

    setQuickCheckouts(prev => [...prev, newCheckout]);
  };

  const handleReturnItem = (checkoutId: string) => {
    const checkout = quickCheckouts.find(c => c.id === checkoutId);
    if (!checkout) return;

    // Update checkout status
    setQuickCheckouts(prev => prev.map(c =>
      c.id === checkoutId ? { ...c, status: 'return_completed' } : c
    ));

    // Return quantity to asset
    setAssets(prev => prev.map(asset =>
      asset.id === checkout.assetId
        ? { ...asset, quantity: asset.quantity + checkout.quantity, updatedAt: new Date() }
        : asset
    ));

    toast({
      title: "Item Returned",
      description: `${checkout.assetName} returned by ${checkout.employee}`
    });
  };

  const handlePartialReturn = (checkoutId: string, quantity: number, condition: 'good' | 'damaged' | 'missing') => {
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

    // Update checkout
    setQuickCheckouts(prev => prev.map(c =>
      c.id === checkoutId ? {
        ...c,
        returnedQuantity: newReturnedQuantity,
        status: isFullyReturned ? 'return_completed' : 'outstanding'
      } : c
    ));

    // Update asset inventory based on condition
    setAssets(prev => prev.map(asset => {
      if (asset.id === checkout.assetId) {
        const newReservedQuantity = Math.max(0, (asset.reservedQuantity || 0) - quantity);
        const totalAtSites = prev.filter(a => a.id === asset.id && a.siteId).reduce((sum, a) => sum + a.quantity, 0);
        const totalQuantity = asset.quantity + totalAtSites;
        
        let newDamagedCount = asset.damagedCount || 0;
        let newMissingCount = asset.missingCount || 0;

        if (condition === 'damaged') {
          newDamagedCount += quantity;
        } else if (condition === 'missing') {
          newMissingCount += quantity;
        }

        return {
          ...asset,
          reservedQuantity: newReservedQuantity,
          damagedCount: newDamagedCount,
          missingCount: newMissingCount,
          availableQuantity: totalQuantity - newReservedQuantity - newDamagedCount - newMissingCount,
          updatedAt: new Date()
        };
      }
      return asset;
    }));

    toast({
      title: "Partial Return Processed",
      description: `${quantity} ${checkout.assetName} returned in ${condition} condition by ${checkout.employee}`
    });
  };

  function renderContent() {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard assets={assets} waybills={waybills} quickCheckouts={quickCheckouts} sites={sites} equipmentLogs={equipmentLogs} />;
      case "assets":
        return <AssetTable
          assets={assets}
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
        return isAuthenticated ? <AddAssetForm onAddAsset={handleAddAsset} sites={sites} existingAssets={assets} /> : <div>You must be logged in to add assets.</div>;
      case "create-waybill":
        return <WaybillForm
          assets={assets}
          sites={sites}
          employees={employees}
          vehicles={vehicles}
          onCreateWaybill={handleCreateWaybill}
          onCancel={() => setActiveTab("dashboard")}
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
          onDeleteCheckout={(checkoutId) => {
            if (!isAuthenticated) {
              toast({
                title: "Authentication Required",
                description: "Please login to delete checkout items",
                variant: "destructive"
              });
              return;
            }
            setQuickCheckouts(prev => prev.filter(c => c.id !== checkoutId));
            toast({
              title: "Checkout Deleted",
              description: `Checkout item deleted successfully`
            });
          }}
        />;
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
              if (window.db) {
                await window.db.createSite(site);
                const loadedSites = await window.db.getSites();
                setSites(loadedSites.map((item: any) => ({
                  ...item,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                })));
              } else {
                setSites(prev => [...prev, site]);
              }
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
              if (window.db) {
                await window.db.updateSite(updatedSite.id, updatedSite);
                const loadedSites = await window.db.getSites();
                setSites(loadedSites.map((item: any) => ({
                  ...item,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                })));
              } else {
                setSites(prev => prev.map(site => (site.id === updatedSite.id ? updatedSite : site)));
              }
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
              if (window.db) {
                await window.db.deleteSite(siteId);
                const loadedSites = await window.db.getSites();
                setSites(loadedSites.map((item: any) => ({
                  ...item,
                  createdAt: new Date(item.createdAt),
                  updatedAt: new Date(item.updatedAt)
                })));
              } else {
                setSites(prev => prev.filter(site => site.id !== siteId));
              }
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
            
            if (window.db) {
              try {
                const logData = {
                  ...log,
                  equipment_id: log.equipmentId,
                  equipment_name: log.equipmentName,
                  site_id: log.siteId,
                  date: log.date.toISOString(),
                  active: log.active,
                  downtime_entries: JSON.stringify(log.downtimeEntries),
                  maintenance_details: log.maintenanceDetails,
                  diesel_entered: log.dieselEntered,
                  supervisor_on_site: log.supervisorOnSite,
                  client_feedback: log.clientFeedback,
                  issues_on_site: log.issuesOnSite
                };
                await window.db.createEquipmentLog(logData);
                const logs = await window.db.getEquipmentLogs();
                setEquipmentLogs(logs.map((item: any) => ({
                  id: item.id,
                  equipmentId: item.equipment_id ? item.equipment_id.toString() : item.equipment_id,
                  equipmentName: item.equipment_name,
                  siteId: item.site_id ? item.site_id.toString() : item.site_id,
                  date: new Date(item.date),
                  active: item.active,
                  downtimeEntries: typeof item.downtime_entries === 'string' ? JSON.parse(item.downtime_entries) : item.downtime_entries || [],
                  maintenanceDetails: item.maintenance_details,
                  dieselEntered: item.diesel_entered,
                  supervisorOnSite: item.supervisor_on_site,
                  clientFeedback: item.client_feedback,
                  issuesOnSite: item.issues_on_site,
                  createdAt: new Date(item.created_at),
                  updatedAt: new Date(item.updated_at)
                })));
                toast({
                  title: "Log Entry Saved",
                  description: "Equipment log has been saved successfully."
                });
              } catch (error) {
                console.error('Failed to save equipment log:', error);
                toast({
                  title: "Error",
                  description: "Failed to save equipment log to database.",
                  variant: "destructive"
                });
              }
            } else {
              setEquipmentLogs(prev => [...prev, log]);
              toast({
                title: "Log Entry Saved",
                description: "Equipment log has been saved successfully."
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
            
            if (window.db) {
              try {
                const logData = {
                  ...log,
                  equipment_id: log.equipmentId,
                  equipment_name: log.equipmentName,
                  site_id: log.siteId,
                  date: log.date.toISOString(),
                  active: log.active,
                  downtime_entries: JSON.stringify(log.downtimeEntries),
                  maintenance_details: log.maintenanceDetails,
                  diesel_entered: log.dieselEntered,
                  supervisor_on_site: log.supervisorOnSite,
                  client_feedback: log.clientFeedback,
                  issues_on_site: log.issuesOnSite
                };
                await window.db.updateEquipmentLog(log.id, logData);
                const logs = await window.db.getEquipmentLogs();
                setEquipmentLogs(logs.map((item: any) => ({
                  id: item.id,
                  equipmentId: item.equipment_id ? item.equipment_id.toString() : item.equipment_id,
                  equipmentName: item.equipment_name,
                  siteId: item.site_id ? item.site_id.toString() : item.site_id,
                  date: new Date(item.date),
                  active: item.active,
                  downtimeEntries: typeof item.downtime_entries === 'string' ? JSON.parse(item.downtime_entries) : item.downtime_entries || [],
                  maintenanceDetails: item.maintenance_details,
                  dieselEntered: item.diesel_entered,
                  supervisorOnSite: item.supervisor_on_site,
                  clientFeedback: item.client_feedback,
                  issuesOnSite: item.issues_on_site,
                  createdAt: new Date(item.created_at),
                  updatedAt: new Date(item.updated_at)
                })));
                toast({
                  title: "Log Entry Updated",
                  description: "Equipment log has been updated successfully."
                });
              } catch (error) {
                console.error('Failed to update equipment log:', error);
                toast({
                  title: "Error",
                  description: "Failed to update equipment log in database.",
                  variant: "destructive"
                });
              }
            } else {
              setEquipmentLogs(prev => prev.map(l => l.id === log.id ? log : l));
              toast({
                title: "Log Entry Updated",
                description: "Equipment log has been updated successfully."
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
            
            if (window.db) {
              try {
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
                await window.db.createConsumableLog(logData);
                const logs = await window.db.getConsumableLogs();
                setConsumableLogs(logs.map((item: any) => ({
                  id: item.id,
                  consumableId: item.consumable_id,
                  consumableName: item.consumable_name,
                  siteId: item.site_id,
                  date: new Date(item.date),
                  quantityUsed: item.quantity_used,
                  quantityRemaining: item.quantity_remaining,
                  unit: item.unit,
                  usedFor: item.used_for,
                  usedBy: item.used_by,
                  notes: item.notes,
                  createdAt: new Date(item.created_at),
                  updatedAt: new Date(item.updated_at)
                })));
                
                // Update asset siteQuantities to reflect consumption
                const asset = assets.find(a => a.id === log.consumableId);
                if (asset && asset.siteQuantities) {
                  const updatedSiteQuantities = {
                    ...asset.siteQuantities,
                    [log.siteId]: log.quantityRemaining
                  };
                  const updatedAsset = {
                    ...asset,
                    siteQuantities: updatedSiteQuantities,
                    updatedAt: new Date()
                  };
                  await window.db.updateAsset(asset.id, {
                    site_quantities: JSON.stringify(updatedSiteQuantities),
                    updated_at: new Date().toISOString()
                  });
                  setAssets(prev => prev.map(a => a.id === asset.id ? updatedAsset : a));
                }
              } catch (error) {
                console.error('Failed to save consumable log:', error);
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
            
            if (window.db) {
              try {
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
                await window.db.updateConsumableLog(log.id, logData);
                const logs = await window.db.getConsumableLogs();
                setConsumableLogs(logs.map((item: any) => ({
                  id: item.id,
                  consumableId: item.consumable_id,
                  consumableName: item.consumable_name,
                  siteId: item.site_id,
                  date: new Date(item.date),
                  quantityUsed: item.quantity_used,
                  quantityRemaining: item.quantity_remaining,
                  unit: item.unit,
                  usedFor: item.used_for,
                  usedBy: item.used_by,
                  notes: item.notes,
                  createdAt: new Date(item.created_at),
                  updatedAt: new Date(item.updated_at)
                })));
              } catch (error) {
                console.error('Failed to update consumable log:', error);
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
        return <Dashboard assets={assets} waybills={waybills} quickCheckouts={quickCheckouts} sites={sites} equipmentLogs={equipmentLogs} />;
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
    if (!window.db) {
      toast({
        title: "Database Not Available",
        description: "This app needs to run in Electron mode to access the database. Please run the desktop application.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Map imported data to Asset format
      const mapped: Asset[] = importedAssets.map((item, idx) => {
        const quantity = Number(item.quantity || item.Quantity || 0);
        const reservedQuantity = 0; // Default to 0 for imports
        const siteQuantities = {}; // Empty for imports
        const availableQuantity = quantity - reservedQuantity; // Calculate as quantity - reservedQuantity

        return {
          id: Date.now().toString() + idx,
          name: (item.name || item.Name || "").trim(),
          description: item.description || item.Description || "",
          quantity,
          reservedQuantity,
          availableQuantity,
          siteQuantities,
          unitOfMeasurement: item.unitOfMeasurement || item['unit of measurement'] || item.unit || item.uom || "pcs",
          category: (item.category || item.Category || "dewatering") as 'dewatering' | 'waterproofing',
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
          const savedAsset = await window.db.createAsset(asset);
          savedAssets.push(savedAsset[0]); // createAsset returns an array
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

  const handleResetAllData = () => {
    // Clear all states
    setAssets([]);
    setWaybills([]);
    setQuickCheckouts([]);
    setSites([]);
    setSiteTransactions([]);
    setEmployees([]);
    setVehicles([]);
    setCompanySettings({} as CompanySettingsType);
  };



  const isAssetInventoryTab = activeTab === "assets";

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      )}
      
      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border p-4 flex items-center justify-between">
          <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
            DCEL Asset Manager
          </h1>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar 
                activeTab={activeTab} 
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }} 
              />
            </SheetContent>
          </Sheet>
        </div>
      )}
      
      <main className={cn(
        "flex-1 overflow-y-auto p-4 md:p-6",
        isMobile && "pt-20"
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
              {isAuthenticated && hasPermission('write_assets') && <BulkImportAssets onImport={handleImport} />}
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
                  if (!window.db) return;
                  
                  try {
                    const result = await window.db.updateWaybillWithTransaction(
                      updatedWaybill.id as string,
                      updatedWaybill
                    );
                    
                    if (!result.success) {
                      throw new Error(result.error || 'Failed to update waybill');
                    }
                    
                    // Reload assets to reflect reserved quantity changes
                    const loadedAssets = await window.db.getAssets();
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
                    const loadedWaybills = await window.db.getWaybills();
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
        />
      </main>
    </div>
  );
};

export default Index;
