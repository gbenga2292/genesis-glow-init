import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Package, Wrench } from "lucide-react";

interface QuickActionsPanelProps {
  onBulkLog: () => void;
  onQuickRestock: () => void;
  onExportDashboard: () => void;
}

export const QuickActionsPanel = ({
  onBulkLog,
  onQuickRestock,
  onExportDashboard
}: QuickActionsPanelProps) => {
  return (
    <Card className="border-0 shadow-soft">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks for faster workflow</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary"
            onClick={onBulkLog}
          >
            <Wrench className="h-5 w-5 text-primary" />
            <div className="text-center">
              <div className="font-semibold">Bulk Log Equipment</div>
              <div className="text-xs text-muted-foreground">Log multiple machines</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:bg-accent/5 hover:border-accent"
            onClick={onQuickRestock}
          >
            <Package className="h-5 w-5 text-accent" />
            <div className="text-center">
              <div className="font-semibold">Quick Restock</div>
              <div className="text-xs text-muted-foreground">Restock low items</div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col gap-2 hover:bg-warning/5 hover:border-warning"
            onClick={onExportDashboard}
          >
            <Download className="h-5 w-5 text-warning" />
            <div className="text-center">
              <div className="font-semibold">Export Dashboard</div>
              <div className="text-xs text-muted-foreground">Download as PDF</div>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
