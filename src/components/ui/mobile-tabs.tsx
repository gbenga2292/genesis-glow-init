import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown } from "lucide-react";

export interface TabItem {
  value: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface MobileTabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/**
 * Mobile-optimized tabs component that shows:
 * - Dropdown/Select on mobile for better space usage
 * - Scrollable pill tabs on tablet/desktop
 */
export const MobileTabs = ({ tabs, value, onValueChange, className }: MobileTabsProps) => {
  const isMobile = useIsMobile();
  const currentTab = tabs.find(t => t.value === value);

  if (isMobile) {
    // Mobile: Use dropdown select for space efficiency
    return (
      <div className={cn("w-full", className)}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full h-12 bg-muted/50 border-0 rounded-xl text-base font-medium">
            <div className="flex items-center gap-2">
              {currentTab?.icon && (
                <span className="text-primary">{currentTab.icon}</span>
              )}
              <SelectValue placeholder="Select a section">
                {currentTab?.label || currentTab?.shortLabel}
              </SelectValue>
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-[60vh]">
            {tabs.map((tab) => (
              <SelectItem
                key={tab.value}
                value={tab.value}
                disabled={tab.disabled}
                className="py-3 text-base"
              >
                <div className="flex items-center gap-2">
                  {tab.icon && <span className="text-muted-foreground">{tab.icon}</span>}
                  <span>{tab.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Tablet/Desktop: Scrollable pill-style tabs
  return (
    <div className={cn("w-full overflow-x-auto hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0", className)}>
      <div className="inline-flex gap-1 p-1 bg-muted rounded-lg min-w-max md:w-full md:grid md:grid-cols-auto">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => !tab.disabled && onValueChange(tab.value)}
            disabled={tab.disabled}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap",
              value === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              tab.disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel || tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Tab content wrapper with animation
 */
interface MobileTabContentProps {
  value: string;
  activeValue: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileTabContent = ({ value, activeValue, children, className }: MobileTabContentProps) => {
  if (value !== activeValue) return null;
  
  return (
    <div className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
};
