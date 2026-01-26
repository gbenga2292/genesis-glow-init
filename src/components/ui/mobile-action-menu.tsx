import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  hidden?: boolean;
}

interface MobileActionMenuProps {
  items: ActionMenuItem[];
  trigger?: React.ReactNode;
  iconVariant?: "horizontal" | "vertical";
  align?: "start" | "center" | "end";
  title?: string;
  className?: string;
}

const TOUCH_DELAY_MS = 180;

export function MobileActionMenu({
  items,
  trigger,
  iconVariant = "horizontal",
  align = "end",
  title = "Actions",
  className,
}: MobileActionMenuProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isInteractionEnabled, setIsInteractionEnabled] = React.useState(false);

  // Filter out hidden items
  const visibleItems = items.filter((item) => !item.hidden);

  // Enable interaction after delay when menu opens (prevents accidental clicks)
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsInteractionEnabled(true);
      }, TOUCH_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      setIsInteractionEnabled(false);
    }
  }, [isOpen]);

  const handleItemClick = (item: ActionMenuItem) => {
    if (!isInteractionEnabled || item.disabled) return;
    item.onClick();
    setIsOpen(false);
  };

  const IconComponent = iconVariant === "vertical" ? MoreVertical : MoreHorizontal;

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-10 w-10 p-0 touch-manipulation", className)}
      aria-label="Open actions menu"
    >
      <IconComponent className="h-5 w-5" />
    </Button>
  );

  // Mobile: Use bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <div onClick={() => setIsOpen(true)}>{trigger || defaultTrigger}</div>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="flex items-center justify-between border-b pb-3">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            {visibleItems.map((item, index) => (
              <Button
                key={index}
                variant={item.variant === "destructive" ? "destructive" : "outline"}
                className={cn(
                  "w-full h-14 justify-start text-base gap-3 touch-manipulation",
                  !isInteractionEnabled && "opacity-70 pointer-events-none",
                  item.disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleItemClick(item)}
                disabled={!isInteractionEnabled || item.disabled}
              >
                {item.icon && <span className="h-5 w-5 flex items-center justify-center">{item.icon}</span>}
                {item.label}
              </Button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use dropdown menu
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || defaultTrigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[160px]">
        {visibleItems.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => handleItemClick(item)}
            disabled={!isInteractionEnabled || item.disabled}
            className={cn(
              "cursor-pointer py-2.5",
              !isInteractionEnabled && "opacity-70 pointer-events-none",
              item.variant === "destructive" && "text-destructive focus:text-destructive"
            )}
          >
            {item.icon && <span className="mr-2 h-4 w-4 flex items-center justify-center">{item.icon}</span>}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
