import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  HardDrive,
  Cloud
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface SyncStatus {
  inSync: boolean;
  status: 'synced' | 'failed' | 'pending' | 'unknown';
  lastSync: string | null;
  lastAttempt: string | null;
  failureReason?: string;
  masterExists: boolean;
  localExists: boolean;
  masterPath?: string;
  localPath?: string;
}

export const SyncStatusPanel = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    const checkElectron = async () => {
      if ((window as any).electronAPI?.getSyncStatus) {
        setIsElectron(true);
        loadSyncStatus();
        
        const interval = setInterval(loadSyncStatus, 30000);
        return () => clearInterval(interval);
      }
    };
    checkElectron();
  }, []);

  const loadSyncStatus = async () => {
    try {
      if (!(window as any).electronAPI?.getSyncStatus) return;
      const status = await (window as any).electronAPI.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const handleManualSync = async () => {
    if (!(window as any).electronAPI?.manualSync) return;
    
    setIsSyncing(true);
    try {
      const result = await (window as any).electronAPI.manualSync();
      
      if (result.success) {
        toast.success("Database synced successfully", {
          description: "All changes have been saved to the network storage."
        });
        await loadSyncStatus();
      } else {
        toast.error("Sync failed", {
          description: result.error || "Could not sync database."
        });
      }
    } catch (error: any) {
      toast.error("Sync failed", {
        description: error.message || "An unexpected error occurred."
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isElectron) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Sync
          </CardTitle>
          <CardDescription>
            Sync status is only available in the desktop application.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!syncStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Sync
          </CardTitle>
          <CardDescription>Loading sync status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (syncStatus.status) {
      case 'synced':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Synced</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Sync Status
            </CardTitle>
            <CardDescription>
              Monitor and manage database synchronization
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Sync Actions */}
        <div className="flex gap-3">
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
          
          <Button
            onClick={loadSyncStatus}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Separator />

        {/* Status Information */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Sync Information</h4>
          
          <div className="grid gap-3 text-sm">
            {syncStatus.lastSync && (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-4 w-4" />
                  <span>Last Successful Sync</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true })}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(syncStatus.lastSync), 'PPp')}
                  </div>
                </div>
              </div>
            )}

            {syncStatus.lastAttempt && syncStatus.status === 'failed' && (
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last Attempt</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {formatDistanceToNow(new Date(syncStatus.lastAttempt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            )}

            {syncStatus.failureReason && (
              <div className="flex items-start gap-2 text-destructive bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div>
                  <div className="font-medium">Sync Error</div>
                  <div className="text-xs mt-1">{syncStatus.failureReason}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Database Locations */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Database Locations</h4>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
              <HardDrive className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Local Database</div>
                <div className="text-xs text-muted-foreground mt-1 break-all">
                  {syncStatus.localPath || 'Unknown'}
                </div>
                <Badge variant={syncStatus.localExists ? "default" : "secondary"} className="mt-2">
                  {syncStatus.localExists ? 'Exists' : 'Not Found'}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-md">
              <Cloud className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">Network Database (NAS)</div>
                <div className="text-xs text-muted-foreground mt-1 break-all">
                  {syncStatus.masterPath || 'Unknown'}
                </div>
                <Badge variant={syncStatus.masterExists ? "default" : "secondary"} className="mt-2">
                  {syncStatus.masterExists ? 'Accessible' : 'Not Accessible'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
          <strong>Note:</strong> The app works with a local copy of the database for better performance.
          Changes are automatically synced to the network storage when you close the app.
          Use "Sync Now" to manually sync at any time.
        </div>
      </CardContent>
    </Card>
  );
};
