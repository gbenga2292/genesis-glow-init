import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { LayoutDashboard, Package, Plus, FileText, ShoppingCart, Settings, MapPin, PlusCircle, LogOut, LogIn, Activity, Sun, Moon, History } from "lucide-react";
interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mode?: 'desktop' | 'mobile';
}

export const Sidebar = ({
  activeTab,
  onTabChange,
  mode = 'desktop'
}: SidebarProps) => {
  const {
    isAuthenticated,
    logout,
    hasPermission,
    currentUser
  } = useAuth();
  const navigate = useNavigate();
  const {
    theme,
    setTheme
  } = useTheme();
  const authenticatedMenuItems = [{
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  }, {
    id: "assets",
    label: "Inventory",
    icon: Package
  }, {
    id: "waybills",
    label: "Waybills",
    icon: FileText
  }, {
    id: "returns",
    label: "Returns",
    icon: FileText
  }, {
    id: "quick-checkout",
    label: "Quick Checkout",
    icon: ShoppingCart
  }, {
    id: "machine-maintenance",
    label: "Machine Maintenance",
    icon: Activity
  }, {
    id: "sites",
    label: "Sites",
    icon: MapPin
  }, {
    id: "settings",
    label: "Settings",
    icon: Settings
  }, {
    id: "recent-activities",
    label: "Recent Activities",
    icon: History
  }];

  const menuItems = authenticatedMenuItems.filter(item => {
    if (item.id === 'recent-activities') {
      return currentUser?.role === 'admin';
    }
    return true;
  });

  // Define required permissions for each menu item
  const getRequiredPermissions = (itemId: string) => {
    switch (itemId) {
      case 'dashboard':
        return null;
      case 'recent-activities':
        return null;
      // Always accessible when authenticated
      case 'assets':
        return 'read_assets';
      case 'waybills':
        return 'read_waybills';
      case 'returns':
        return 'read_returns';
      case 'quick-checkout':
        return 'read_quick_checkouts';
      case 'machine-maintenance':
        return 'read_maintenance';
      // New permission for machine maintenance
      case 'sites':
        return 'read_sites';
      case 'settings':
        return null;
      // Accessible to all authenticated users so they can update profile/theme
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
  return <div className={cn("bg-card shadow-soft flex flex-col transition-all duration-300", mode === 'desktop' ? "w-64 border-r border-border h-full" : "w-full h-full border-none")}>
    <div className="p-4 md:p-6 border-b border-border">
      <div className="flex items-center gap-3">

        <div>
          <h1 className="text-base md:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">DCEL Operations</h1>
          <p className="text-[10px] md:text-sm text-muted-foreground">Inventory Manager</p>
        </div>
      </div>
    </div>

    <nav className="p-3 md:p-4 space-y-1 md:space-y-2 flex-1 overflow-y-auto">
      {menuItems.map(item => {
        const hasAccessToItem = hasAccess(item.id);
        const isGreyedOut = !hasAccessToItem;
        return <Button key={item.id} variant={activeTab === item.id ? "default" : "ghost"} className={cn("w-full justify-start gap-3 h-10 md:h-11 text-sm md:text-base", activeTab === item.id && "bg-gradient-primary shadow-medium", isGreyedOut && "opacity-50 cursor-not-allowed")} disabled={!hasAccessToItem} onClick={() => onTabChange(item.id)}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Button>;
      })}
    </nav>

    <div className="p-2 border-t border-border space-y-2">
      {isAuthenticated ? <div className="flex items-center gap-1.5">
        <div className="flex-1 min-w-0 px-2 py-1 bg-muted/50 rounded">
          <p className="text-xs font-medium truncate">{currentUser?.name}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={logout}>
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div> : <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="default" className="flex-1 h-8 text-xs bg-gradient-primary" onClick={() => navigate("/login")}>
          <LogIn className="h-3.5 w-3.5 mr-1.5" />
          Login
        </Button>
      </div>}
    </div>
  </div>;
};