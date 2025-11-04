import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Package,
  Plus,
  FileText,
  ShoppingCart,
  Settings,
  MapPin,
  PlusCircle,
  LogOut,
  LogIn,
  Activity,
  Sun,
  Moon,
  Trash2
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const { isAuthenticated, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  
  const authenticatedMenuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard
    },
    {
      id: "assets",
      label: "Asset Inventory",
      icon: Package
    },
    {
      id: "waybills",
      label: "Waybills",
      icon: FileText
    },
    {
      id: "returns",
      label: "Returns",
      icon: FileText
    },
    {
      id: "quick-checkout",
      label: "Quick Checkout",
      icon: ShoppingCart
    },
    {
      id: "sites",
      label: "Sites",
      icon: MapPin
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings
    }
  ];

  const menuItems = authenticatedMenuItems;

  // Define required permissions for each menu item
  const getRequiredPermissions = (itemId: string) => {
    switch (itemId) {
      case 'dashboard':
        return null; // Always accessible when authenticated
      case 'assets':
        return 'read_assets';
      case 'waybills':
        return 'read_waybills';
      case 'returns':
        return 'read_returns';
      case 'quick-checkout':
        return 'read_quick_checkouts';
      case 'sites':
        return 'read_sites';
      case 'settings':
        return ['edit_company_info', 'change_theme', 'manage_users', 'view_activity_log'];
      default:
        return null;
    }
  };

  const hasAccess = (itemId: string) => {
    if (!isAuthenticated) return false;
    const permissions = getRequiredPermissions(itemId);
    if (permissions === null) return true;
    if (Array.isArray(permissions)) {
      return permissions.some(perm => hasPermission(perm));
    }
    return hasPermission(permissions);
  };

  const handleWipe = () => {
    if (window.confirm('Are you absolutely sure you want to delete the local database? This action is irreversible and the application will close.')) {
      if (window.db && window.db.wipeLocalDatabase) {
        window.db.wipeLocalDatabase();
      } else {
        alert('Database API not available. This must be run in Electron.');
      }
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border h-full shadow-soft flex flex-col">
      <div className="p-4 md:p-6 border-b border-border">
        <h1 className="text-lg md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          DCEL Asset Manager
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Inventory & Logistics
        </p>
      </div>
      
      <nav className="p-3 md:p-4 space-y-1 md:space-y-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const hasAccessToItem = hasAccess(item.id);
          const isGreyedOut = !hasAccessToItem;
          return (
            <Button
              key={item.id}
              variant={activeTab === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10 md:h-11 text-sm md:text-base",
                activeTab === item.id && "bg-gradient-primary shadow-medium",
                isGreyedOut && "opacity-50 cursor-not-allowed"
              )}
              disabled={!hasAccessToItem}
              onClick={() => onTabChange(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border space-y-2">
        {/* WIPE BUTTON - TEMPORARY */}
        <Button
          variant="destructive"
          className="w-full justify-center gap-3 h-10 md:h-11 text-sm md:text-base"
          onClick={handleWipe}
        >
          <Trash2 className="h-4 w-4" />
          FORCE WIPE
        </Button>

        {isAuthenticated ? (
          <div className="flex items-center gap-1.5">
            <div className="flex-1 min-w-0 px-2 py-1 bg-muted/50 rounded">
              <p className="text-xs font-medium truncate">{useAuth().currentUser?.name}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="default"
              className="flex-1 h-8 text-xs bg-gradient-primary"
              onClick={() => navigate("/login")}
            >
              <LogIn className="h-3.5 w-3.5 mr-1.5" />
              Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};