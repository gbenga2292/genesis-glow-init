import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

export interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  progress: number;
  error: string | null;
  updateInfo: UpdateInfo | null;
}

// Detect platform
const isElectron = !!(window as any).electronAPI;
const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloading: false,
    downloaded: false,
    progress: 0,
    error: null,
    updateInfo: null,
  });

  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setState(prev => ({ ...prev, checking: true, error: null }));

    try {
      if (isElectron && (window as any).electronAPI?.autoUpdater) {
        // Electron: Use electron-updater via IPC
        await (window as any).electronAPI.autoUpdater.checkForUpdates();
      } else if (isCapacitor) {
        // Capacitor Live Update
        try {
          const { LiveUpdate } = await import('@capawesome/capacitor-live-update');
          const result = await LiveUpdate.sync();
          
          if (result.nextBundleId) {
            setState(prev => ({
              ...prev,
              checking: false,
              available: true,
              downloaded: true,
              updateInfo: {
                version: result.nextBundleId,
              }
            }));
            setLastChecked(new Date());
            return;
          }
        } catch (err) {
          logger.warn('Capacitor Live Update not available', err);
        }
      }

      setState(prev => ({ ...prev, checking: false }));
      setLastChecked(new Date());
    } catch (error) {
      logger.error('Failed to check for updates', error);
      setState(prev => ({
        ...prev,
        checking: false,
        error: error instanceof Error ? error.message : 'Failed to check for updates'
      }));
    }
  }, []);

  // Download update (Electron only - Capacitor downloads during sync)
  const downloadUpdate = useCallback(async () => {
    if (!isElectron) return;

    setState(prev => ({ ...prev, downloading: true, progress: 0 }));

    try {
      await (window as any).electronAPI?.autoUpdater?.downloadUpdate();
    } catch (error) {
      logger.error('Failed to download update', error);
      setState(prev => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Failed to download update'
      }));
    }
  }, []);

  // Install update and restart
  const installUpdate = useCallback(async () => {
    try {
      if (isElectron && (window as any).electronAPI?.autoUpdater) {
        await (window as any).electronAPI.autoUpdater.quitAndInstall();
      } else if (isCapacitor) {
        const { LiveUpdate } = await import('@capawesome/capacitor-live-update');
        await LiveUpdate.reload();
      }
    } catch (error) {
      logger.error('Failed to install update', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to install update'
      }));
    }
  }, []);

  // Dismiss update notification
  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, available: false, downloaded: false }));
  }, []);

  // Listen for Electron auto-updater events
  useEffect(() => {
    if (!isElectron || !(window as any).electronAPI?.autoUpdater) return;

    const api = (window as any).electronAPI.autoUpdater;

    // Register event listeners
    api.onUpdateAvailable?.((info: UpdateInfo) => {
      setState(prev => ({
        ...prev,
        checking: false,
        available: true,
        updateInfo: info
      }));
    });

    api.onUpdateNotAvailable?.(() => {
      setState(prev => ({ ...prev, checking: false, available: false }));
    });

    api.onDownloadProgress?.((progress: { percent: number }) => {
      setState(prev => ({ ...prev, progress: progress.percent }));
    });

    api.onUpdateDownloaded?.((info: UpdateInfo) => {
      setState(prev => ({
        ...prev,
        downloading: false,
        downloaded: true,
        progress: 100,
        updateInfo: info
      }));
    });

    api.onError?.((error: { message: string }) => {
      setState(prev => ({
        ...prev,
        checking: false,
        downloading: false,
        error: error.message
      }));
    });

    return () => {
      // Cleanup listeners
      api.removeAllListeners?.();
    };
  }, []);

  // Auto-check on mount (optional - can be controlled via settings)
  useEffect(() => {
    const autoCheck = localStorage.getItem('autoCheckUpdates') !== 'false';
    if (autoCheck && (isElectron || isCapacitor)) {
      // Delay initial check to let app fully load
      const timeout = setTimeout(() => {
        checkForUpdates();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [checkForUpdates]);

  return {
    ...state,
    lastChecked,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    isElectron,
    isCapacitor,
    platform: isElectron ? 'electron' : isCapacitor ? 'capacitor' : 'web'
  };
}
