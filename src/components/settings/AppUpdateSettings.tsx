import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Monitor, 
  Globe,
  Loader2,
  Sparkles
} from 'lucide-react';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useIsMobile } from '@/hooks/use-mobile';

export const AppUpdateSettings: React.FC = () => {
  const isMobile = useIsMobile();
  const {
    checking,
    available,
    downloading,
    downloaded,
    progress,
    error,
    updateInfo,
    lastChecked,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    platform
  } = useAppUpdate();

  const [autoCheck, setAutoCheck] = useState(() => 
    localStorage.getItem('autoCheckUpdates') !== 'false'
  );

  useEffect(() => {
    localStorage.setItem('autoCheckUpdates', autoCheck.toString());
  }, [autoCheck]);

  const getPlatformIcon = () => {
    switch (platform) {
      case 'electron':
        return <Monitor className="h-4 w-4" />;
      case 'capacitor':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getPlatformLabel = () => {
    switch (platform) {
      case 'electron':
        return 'Desktop App';
      case 'capacitor':
        return 'Mobile App';
      default:
        return 'Web App';
    }
  };

  const formatLastChecked = () => {
    if (!lastChecked) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastChecked.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    return lastChecked.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              App Updates
            </CardTitle>
            <CardDescription className="mt-1">
              Manage application updates and version
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            {getPlatformIcon()}
            {getPlatformLabel()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Version Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">Current Version</p>
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last checked</p>
            <p className="text-sm">{formatLastChecked()}</p>
          </div>
        </div>

        {/* Auto-check toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-check" className="flex flex-col gap-1">
            <span>Automatic Updates</span>
            <span className="text-xs text-muted-foreground font-normal">
              Check for updates when app starts
            </span>
          </Label>
          <Switch 
            id="auto-check" 
            checked={autoCheck} 
            onCheckedChange={setAutoCheck}
          />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Update Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Update Available Alert */}
        {available && !downloaded && (
          <Alert className="border-primary/50 bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertTitle>Update Available!</AlertTitle>
            <AlertDescription>
              {updateInfo?.version 
                ? `Version ${updateInfo.version} is ready to download.`
                : 'A new version is available.'}
              {updateInfo?.releaseNotes && (
                <p className="mt-1 text-xs">{updateInfo.releaseNotes}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Download Progress */}
        {downloading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Downloading update...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Update Downloaded Alert */}
        {downloaded && (
          <Alert className="border-green-500/50 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>Update Ready!</AlertTitle>
            <AlertDescription>
              {updateInfo?.version 
                ? `Version ${updateInfo.version} is ready to install.`
                : 'The update has been downloaded and is ready to install.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
          <Button
            variant="outline"
            onClick={checkForUpdates}
            disabled={checking || downloading}
            className="flex-1"
          >
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Check for Updates
              </>
            )}
          </Button>

          {available && !downloaded && platform === 'electron' && (
            <Button
              onClick={downloadUpdate}
              disabled={downloading}
              className="flex-1"
            >
              {downloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Update
                </>
              )}
            </Button>
          )}

          {downloaded && (
            <Button
              onClick={installUpdate}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Install & Restart
            </Button>
          )}
        </div>

        {/* Platform-specific info */}
        {platform === 'web' && (
          <p className="text-xs text-muted-foreground text-center">
            Web app updates are applied automatically when you refresh the page.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
