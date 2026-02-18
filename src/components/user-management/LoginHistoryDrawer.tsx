import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginHistory } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { LogOut, Smartphone, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface LoginHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName?: string;
}

export const LoginHistoryDrawer: React.FC<LoginHistoryDrawerProps> = ({
  open,
  onOpenChange,
  userId,
  userName = 'User'
}) => {
  const { getLoginHistory } = useAuth();
  const [history, setHistory] = useState<LoginHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, userId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getLoginHistory(userId);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load login history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceLabel = (deviceInfo?: string): string => {
    if (!deviceInfo) return 'Unknown Device';
    if (deviceInfo.toLowerCase().includes('windows')) return '💻 Windows';
    if (deviceInfo.toLowerCase().includes('mac')) return '🍎 Mac';
    if (deviceInfo.toLowerCase().includes('linux')) return '🐧 Linux';
    if (deviceInfo.toLowerCase().includes('android')) return '🤖 Android';
    if (deviceInfo.toLowerCase().includes('iphone')) return '📱 iPhone';
    return '🖥️ ' + deviceInfo;
  };

  const getLoginTypeLabel = (type?: string): string => {
    switch (type) {
      case 'password':
        return 'Password';
      case 'magic_link':
        return 'Magic Link';
      case 'oauth':
        return 'OAuth';
      default:
        return 'Login';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Login History - {userName}
          </DialogTitle>
          <DialogDescription>
            View all login sessions and security information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading login history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No login history available
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((login) => (
                <div
                  key={login.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    login.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Header with status and time */}
                      <div className="flex items-center gap-2">
                        {login.status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">
                          {login.status === 'success' ? 'Successful Login' : 'Failed Login'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(login.timestamp), {
                            addSuffix: true
                          })}
                        </span>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {/* Device Info */}
                        {login.deviceInfo && (
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {getDeviceLabel(login.deviceInfo)}
                            </span>
                          </div>
                        )}

                        {/* Login Type */}
                        <div className="text-muted-foreground">
                          <span className="inline-block bg-gray-100 px-2 py-1 rounded text-xs">
                            {getLoginTypeLabel(login.loginType)}
                          </span>
                        </div>

                        {/* IP Address */}
                        {login.ipAddress && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground font-mono">
                              IP: {login.ipAddress}
                            </span>
                          </div>
                        )}

                        {/* Location */}
                        {login.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {login.location}
                            </span>
                          </div>
                        )}

                        {/* Failure Reason */}
                        {login.failureReason && (
                          <div className="col-span-2 text-xs text-red-600">
                            Reason: {login.failureReason}
                          </div>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-muted-foreground pt-1 border-t">
                        {new Date(login.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            Showing {history.length} login attempts
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {history.length > 0 && (
            <Button variant="ghost" onClick={() => loadHistory()}>
              Refresh
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginHistoryDrawer;
