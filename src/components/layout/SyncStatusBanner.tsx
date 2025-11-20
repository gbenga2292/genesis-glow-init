import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw, Database, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface SyncStatus {
  inSync: boolean;
  status: 'synced' | 'failed' | 'pending' | 'unknown';
  lastSync: string | null;
  lastAttempt: string | null;
  failureReason?: string;
  masterExists: boolean;
  localExists: boolean;
}

export const SyncStatusBanner = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const checkElectron = async () => {
      if (window.electronAPI?.getSyncStatus) {
        setIsElectron(true);
        loadSyncStatus();
      }
    };
    checkElectron();
  }, []);

  const loadSyncStatus = async () => {
    try {
      if (!window.electronAPI?.getSyncStatus) return;
      const status = await window.electronAPI.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error("Error loading sync status:", error);
    }
  };

  const handleManualSync = async () => {
    if (!window.electronAPI?.manualSync) return;
    
    setIsSyncing(true);
    try {
      const result = await window.electronAPI.manualSync();
      
      if (result.success) {
        toast.success("Database synced successfully", {
          description: "Your changes have been saved to the network storage."
        });
        // Reload status after successful sync
        await loadSyncStatus();
      } else {
        toast.error("Sync failed", {
          description: result.error || "Could not sync database to network storage."
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

  // Don't show banner if not in Electron or if no sync status
  if (!isElectron || !syncStatus) return null;

  // Don't show if everything is synced and working
  if (syncStatus.inSync && syncStatus.status === 'synced') return null;

  // Show warning/error banner for out-of-sync states
  return (
    <Alert 
      variant={syncStatus.status === 'failed' ? 'destructive' : 'default'}
      className="mb-4 border-l-4"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {syncStatus.status === 'failed' ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <Database className="h-5 w-5" />
          )}
        </div>
        
        <div className="flex-1">
          <AlertTitle className="mb-2">
            {syncStatus.status === 'failed' && 'Database Sync Failed'}
            {syncStatus.status === 'pending' && 'Database Out of Sync'}
            {syncStatus.status === 'unknown' && 'Database Sync Status Unknown'}
          </AlertTitle>
          
          <AlertDescription className="space-y-2">
            {syncStatus.status === 'failed' && (
              <p>
                Failed to sync your changes to the network storage. Your data is safe locally,
                but hasn't been saved to the shared database yet.
              </p>
            )}
            {syncStatus.status === 'pending' && (
              <p>
                Your local database has changes that haven't been synced to the network storage yet.
              </p>
            )}
            
            {syncStatus.failureReason && (
              <p className="text-sm opacity-90">
                <strong>Reason:</strong> {syncStatus.failureReason}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm">
              {syncStatus.lastSync && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>
                    Last synced {formatDistanceToNow(new Date(syncStatus.lastSync), { addSuffix: true })}
                  </span>
                </div>
              )}
              
              {syncStatus.lastAttempt && syncStatus.status === 'failed' && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Last attempt {formatDistanceToNow(new Date(syncStatus.lastAttempt), { addSuffix: true })}
                  </span>
                </div>
              )}
            </div>
          </AlertDescription>
        </div>

        <Button
          onClick={handleManualSync}
          disabled={isSyncing}
          size="sm"
          variant={syncStatus.status === 'failed' ? 'secondary' : 'outline'}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>
    </Alert>
  );
};
