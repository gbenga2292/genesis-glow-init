import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  MapPin,
  Menu,
  Settings,
  Activity
} from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onMenuClick: () => void;
}

export const MobileBottomNav = ({ activeTab, onTabChange, onMenuClick }: MobileBottomNavProps) => {
  const navItems = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "assets", label: "Inventory", icon: Package },
    { id: "waybills", label: "Waybills", icon: FileText },
    { id: "quick-checkout", label: "Checkout", icon: ShoppingCart },
    { id: "more", label: "More", icon: Menu, isMenu: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map((item) => {
          const isActive = !item.isMenu && activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-14 gap-0.5 rounded-lg transition-all duration-200 min-w-0 px-1",
                isActive && "bg-primary/10 text-primary",
                !isActive && "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => {
                if (item.isMenu) {
                  onMenuClick();
                } else {
                  onTabChange(item.id);
                }
              }}
            >
              <item.icon className={cn(
                "h-5 w-5 shrink-0",
                isActive && "text-primary"
              )} />
              <span className={cn(
                "text-[10px] font-medium truncate max-w-full",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
