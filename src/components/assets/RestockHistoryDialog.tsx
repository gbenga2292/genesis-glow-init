import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Asset } from "@/types/asset";
import { History, Package } from "lucide-react";

interface RestockHistoryDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RestockHistoryDialog = ({ asset, open, onOpenChange }: RestockHistoryDialogProps) => {
  const [restockLogs, setRestockLogs] = useState<any[]>([]);

  useEffect(() => {
    if (asset && open) {
      loadRestockLogs(asset.id);
    }
  }, [asset, open]);

  const loadRestockLogs = async (assetId: string) => {
    if (window.electronAPI) {
      try {
        const logs = await window.electronAPI.getEquipmentLogs();
        const filteredLogs = logs.filter((log: any) =>
          log.type === 'restock' && log.assetId === assetId
        );
        setRestockLogs(filteredLogs);
      } catch (error) {
        logger.error('Failed to load restock logs', error);
        setRestockLogs([]);
      }
    } else if (window.db) {
      // Use window.db for equipment logs
      try {
        const logs = await window.db.getEquipmentLogs();
        const filteredLogs = logs.filter((log: any) =>
          log.type === 'restock' && log.assetId === assetId
        );
        setRestockLogs(filteredLogs);
      } catch (error) {
        logger.error('Failed to load restock logs from database', error);
        setRestockLogs([]);
      }
    } else {
      setRestockLogs([]);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Restock History - {asset.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {restockLogs.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No restock history found for this asset</p>
            </div>
          ) : (
            <div className="space-y-3">
              {restockLogs.map((log) => (
                <Card key={log.id} className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">
                          Restock
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary">
                          +{log.quantity} units
                        </div>
                        {log.unitCost && (
                          <div className="text-sm text-muted-foreground">
                            Unit Cost: ${log.unitCost.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                    {log.notes && (
                      <p className="text-sm text-muted-foreground">{log.notes}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
