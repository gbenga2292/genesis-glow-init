import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  Settings,
  MapPin,
  LogOut,
  LogIn,
  Activity,
  Sun,
  Moon,
  History,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Monitor,
  ClipboardList,
  HardHat
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  mode?: 'desktop' | 'mobile';
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'main' | 'operations' | 'admin';
}

export const Sidebar = ({
  activeTab,
  onTabChange,
  mode = 'desktop'
}: SidebarProps) => {
  const { isAuthenticated, logout, hasPermission, currentUser } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const authenticatedMenuItems: MenuItem[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: 'main' },
    { id: "assets", label: "Inventory", icon: Package, group: 'main' },
    { id: "requests", label: "Requests", icon: ClipboardList, group: 'main' },
    { id: "waybills", label: "Waybills", icon: FileText, group: 'operations' },
    { id: "returns", label: "Returns", icon: Undo2, group: 'operations' },
    { id: "quick-checkout", label: "Quick Checkout", icon: ShoppingCart, group: 'operations' },
    { id: "machine-maintenance", label: "Maintenance", icon: Activity, group: 'operations' },
    { id: "sites", label: "Sites", icon: MapPin, group: 'operations' },
    { id: "settings", label: "Settings", icon: Settings, group: 'admin' },
    { id: "recent-activities", label: "Activity Log", icon: History, group: 'admin' },
    { id: "site-worker-view", label: "Site Worker View", icon: HardHat, group: 'admin' },
  ];

  const menuItems = authenticatedMenuItems.filter(item => {
    if (item.id === 'recent-activities') {
      return currentUser?.role === 'admin';
    }
    return true;
  });

  const getRequiredPermissions = (itemId: string) => {
    switch (itemId) {
      case 'dashboard':
      case 'recent-activities':
      case 'settings':
        return null;
      case 'assets':
        return 'read_assets';
      case 'requests':
        return 'manage_requests';
      case 'waybills':
        return 'read_waybills';
      case 'returns':
        return 'read_returns';
      case 'quick-checkout':
        return 'read_quick_checkouts';
      case 'machine-maintenance':
        return 'access_maintenance';
      case 'sites':
        return 'read_sites';
      case 'site-worker-view':
        return 'manage_requests'; // Only managers/admins
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

  const accessibleItems = menuItems.filter(item => hasAccess(item.id));
  const mainItems = accessibleItems.filter(item => item.group === 'main');
  const operationItems = accessibleItems.filter(item => item.group === 'operations');
  const adminItems = accessibleItems.filter(item => item.group === 'admin');

  const renderMenuItem = (item: MenuItem) => {
    const isActive = activeTab === item.id;

    const button = (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 h-10 transition-all duration-200",
          isCollapsed && mode === 'desktop' ? "justify-center px-2" : "px-3",
          isActive
            ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
        )}
        onClick={() => onTabChange(item.id)}
      >
        <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary-foreground")} />
        {(!isCollapsed || mode === 'mobile') && (
          <span className="truncate text-sm">{item.label}</span>
        )}
      </Button>
    );

    if (isCollapsed && mode === 'desktop') {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.id}>{button}</div>;
  };

  const renderGroup = (items: MenuItem[], label: string) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        {(!isCollapsed || mode === 'mobile') && (
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
        )}
        {isCollapsed && mode === 'desktop' && <Separator className="my-2" />}
        {items.map(renderMenuItem)}
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "bg-card flex flex-col transition-all duration-300 border-r border-border",
          mode === 'desktop'
            ? isCollapsed ? "w-16" : "w-60"
            : "w-full h-full border-none"
        )}
      >
        {/* Header */}
        <div className={cn(
          "p-2 border-b border-border flex items-center",
          isCollapsed && mode === 'desktop' ? "justify-center" : "justify-end"
        )}>
          {mode === 'desktop' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="space-y-4">
            {renderGroup(mainItems, 'Main')}
            {renderGroup(operationItems, 'Operations')}
            {renderGroup(adminItems, 'Admin')}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-border">
          {isAuthenticated ? (
            <div className={cn(
              "flex items-center gap-1.5",
              isCollapsed && mode === 'desktop' ? "flex-col" : "flex-row"
            )}>
              {(!isCollapsed || mode === 'mobile') && (
                <div onClick={() => navigate('/profile')} className="cursor-pointer flex-1 min-w-0 px-2 py-1.5 bg-muted/50 rounded-md">
                  <p className="text-xs font-medium truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{currentUser?.role}</p>
                </div>
              )}

              <DropdownMenu>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side={isCollapsed && mode === 'desktop' ? "right" : "top"}>
                    Toggle theme
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={logout}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side={isCollapsed && mode === 'desktop' ? "right" : "top"}>
                  Logout
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className={cn(
              "flex items-center gap-1.5",
              isCollapsed && mode === 'desktop' ? "flex-col" : "flex-row"
            )}>
              <DropdownMenu>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side={isCollapsed && mode === 'desktop' ? "right" : "top"}>
                    Toggle theme
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {(!isCollapsed || mode === 'mobile') ? (
                <Button
                  variant="default"
                  className="flex-1 h-8 text-xs"
                  onClick={() => navigate("/login")}
                >
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Login
                </Button>
              ) : (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate("/login")}
                    >
                      <LogIn className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Login
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
