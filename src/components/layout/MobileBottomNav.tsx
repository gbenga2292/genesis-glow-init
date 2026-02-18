import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  Menu,
  Settings,
  Activity,
  MapPin,
  History,
  Undo2,
  Sun,
  Moon,
  LogOut,
  X,
  ChevronRight,
  Monitor,
  HardHat,
  ClipboardList
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
  hide?: boolean; // New prop to hide the nav bar
}

interface QuickNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: 'operations' | 'admin';
}

export const MobileBottomNav = ({ activeTab, onTabChange, onMenuClick, hide = false }: MobileBottomNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { currentUser, logout, hasPermission, isAuthenticated } = useAuth();

  // Primary nav items shown in bottom bar
  const primaryNavItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "assets", label: "Inventory", icon: Package },
    { id: "waybills", label: "Waybills", icon: FileText },
    { id: "quick-checkout", label: "Checkout", icon: ShoppingCart },
  ];

  // Secondary items shown in "More" drawer
  const moreNavItems: QuickNavItem[] = [
    { id: "requests", label: "Requests", icon: ClipboardList, group: 'operations' },
    { id: "returns", label: "Returns", icon: Undo2, group: 'operations' },
    { id: "machine-maintenance", label: "Machine Maintenance", icon: Activity, group: 'operations' },
    { id: "sites", label: "Sites", icon: MapPin, group: 'operations' },
    { id: "settings", label: "Settings", icon: Settings, group: 'admin' },
    { id: "recent-activities", label: "Activity Log", icon: History, group: 'admin' },
    { id: "site-worker-view", label: "Site Worker View", icon: HardHat, group: 'admin' },
  ];

  const getRequiredPermissions = (itemId: string) => {
    switch (itemId) {
      case 'requests': return 'view_own_requests';
      case 'returns': return 'read_returns';
      case 'machine-maintenance': return 'access_maintenance';
      case 'sites': return 'read_sites';
      case 'settings': return null;
      case 'recent-activities': return null;
      case 'site-worker-view': return null;
      default: return null;
    }
  };

  const hasAccess = (itemId: string) => {
    if (!isAuthenticated) return false;
    if (itemId === 'recent-activities' && currentUser?.role !== 'admin') return false;
    if (itemId === 'site-worker-view' && (currentUser?.role === 'admin' || currentUser?.role === 'manager')) return true;
    const permissions = getRequiredPermissions(itemId);
    if (permissions === null) return true;
    return hasPermission(permissions);
  };

  const accessibleMoreItems = moreNavItems.filter(item => hasAccess(item.id));
  const operationItems = accessibleMoreItems.filter(i => i.group === 'operations');
  const adminItems = accessibleMoreItems.filter(i => i.group === 'admin');

  const handleNavClick = (id: string) => {
    onTabChange(id);
    setMoreOpen(false);
  };

  const userInitials = currentUser?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  // Don't render if hide prop is true
  if (hide) return null;

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border shadow-lg safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {primaryNavItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all duration-200 min-w-0 px-1 relative",
                  isActive && "text-primary",
                  !isActive && "text-muted-foreground active:scale-95"
                )}
                onClick={() => onTabChange(item.id)}
              >
                {isActive && (
                  <span className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}
                <item.icon className={cn(
                  "h-5 w-5 shrink-0 transition-transform",
                  isActive && "scale-110"
                )} />
                <span className={cn(
                  "text-[10px] font-medium truncate max-w-full",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            className={cn(
              "flex-1 flex flex-col items-center justify-center h-14 gap-1 rounded-xl transition-all duration-200 min-w-0 px-1",
              moreOpen ? "text-primary" : "text-muted-foreground active:scale-95"
            )}
            onClick={() => setMoreOpen(true)}
          >
            <div className={cn(
              "h-5 w-5 shrink-0 flex items-center justify-center rounded-md transition-colors",
              moreOpen && "bg-primary text-primary-foreground"
            )}>
              <Menu className="h-4 w-4" />
            </div>
            <span className={cn(
              "text-[10px] font-medium",
              moreOpen && "font-semibold"
            )}>
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More Drawer (Bottom Sheet) */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between pb-2">
            <DrawerTitle className="text-lg">More Options</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <ScrollArea className="flex-1 px-4">
            {/* User Profile Card */}
            {isAuthenticated && currentUser && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { setMoreOpen(false); navigate('/profile'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setMoreOpen(false); navigate('/profile'); } }}
                  className="cursor-pointer flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-4"
                >
                  <Avatar className="h-12 w-12 bg-primary text-primary-foreground">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{currentUser.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{currentUser.role?.replace('_', ' ')}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTheme("light"); }}>
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTheme("dark"); }}>
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTheme("system"); }}>
                        <Monitor className="h-4 w-4 mr-2" />
                        System
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}

            {/* Operations Section */}
            {operationItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  Operations
                </p>
                <div className="space-y-1">
                  {operationItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted active:bg-muted"
                        )}
                        onClick={() => handleNavClick(item.id)}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Admin Section */}
            {adminItems.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  Admin
                </p>
                <div className="space-y-1">
                  {adminItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted active:bg-muted"
                        )}
                        onClick={() => handleNavClick(item.id)}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="flex-1 font-medium">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator className="my-4" />

            {/* Logout Button */}
            {isAuthenticated && (
              <Button
                variant="outline"
                className="w-full h-12 justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 mb-6"
                onClick={() => {
                  setMoreOpen(false);
                  logout();
                }}
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </Button>
            )}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    </>
  );
};
