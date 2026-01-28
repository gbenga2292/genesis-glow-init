import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResponsiveFormContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}

/**
 * A responsive container that shows:
 * - Full-page view on mobile devices
 * - Dialog/modal on desktop devices
 */
export const ResponsiveFormContainer = ({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  children,
  className,
  maxWidth = "max-w-4xl"
}: ResponsiveFormContainerProps) => {
  const isMobile = useIsMobile();

  if (!open) return null;

  // Mobile: Full-page view
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 bg-background animate-in slide-in-from-bottom duration-300">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {icon && <span className="text-primary">{icon}</span>}
                <h1 className="text-lg font-semibold truncate">{title}</h1>
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Content - Scrollable with bottom padding for mobile nav */}
          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: Dialog view
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(`${maxWidth} max-h-[90vh] overflow-y-auto`, className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon && <span className="text-primary">{icon}</span>}
            {title}
          </DialogTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};
