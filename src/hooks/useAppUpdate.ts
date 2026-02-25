import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

// ─── GitHub Config ─────────────────────────────────────────────────────────────
// The release workflow publishes to this repo. Update if you ever move the repo.
const GITHUB_OWNER = 'gbenga2292';
const GITHUB_REPO = 'genesis-glow-init';
const GITHUB_API_LATEST = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
  assetUrl?: string; // Android bundle download URL
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

// ─── Platform Detection ────────────────────────────────────────────────────────
const isElectron = !!(window as any).electronAPI?.autoUpdater;
const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();

// ─── Version Helpers ───────────────────────────────────────────────────────────
function parseVersion(v: string): number[] {
  return v.replace(/^v/, '').split('.').map(Number);
}

function isNewerVersion(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] ?? 0;
    const cv = c[i] ?? 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

// ─── Android: Get current bundle version from localStorage ────────────────────
function getAndroidCurrentVersion(): string {
  return localStorage.getItem('android-bundle-version') ?? '1.0.0';
}

// ─── Android: Check GitHub Releases for a new android-bundle.zip ──────────────
async function checkAndroidUpdate(): Promise<UpdateInfo | null> {
  const response = await fetch(GITHUB_API_LATEST, {
    headers: { 'Accept': 'application/vnd.github.v3+json' },
  });

  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const release = await response.json();
  const latestVersion: string = release.tag_name?.replace(/^v/, '') ?? '0.0.0';
  const currentVersion = getAndroidCurrentVersion();

  if (!isNewerVersion(latestVersion, currentVersion)) {
    return null; // already up to date
  }

  // Find the android bundle asset in the release
  const bundleAsset = release.assets?.find(
    (a: any) => a.name === 'android-bundle.zip'
  );

  return {
    version: latestVersion,
    releaseNotes: release.body ?? undefined,
    releaseDate: release.published_at ?? undefined,
    assetUrl: bundleAsset?.browser_download_url ?? undefined,
  };
}

// ─── Android: Download and apply bundle via Capawesome Live Update ─────────────
// Capawesome Live Update's free/self-hosted approach: we use downloadBundle with
// a public URL pointing to the GitHub Release asset.
async function downloadAndApplyAndroidUpdate(
  info: UpdateInfo,
  onProgress: (percent: number) => void
): Promise<void> {
  if (!info.assetUrl) throw new Error('No Android bundle asset URL found in release.');

  const { LiveUpdate } = await import('@capawesome/capacitor-live-update');

  // Track progress manually since we're downloading via fetch first,
  // then handing to the plugin. We simulate progress using fetch streaming.
  const response = await fetch(info.assetUrl);
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const contentLength = Number(response.headers.get('content-length') ?? 0);
  const reader = response.body!.getReader();
  const chunks: ArrayBuffer[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // Ensure we always push a proper ArrayBuffer (not SharedArrayBuffer)
    chunks.push(value.buffer.slice(0) as ArrayBuffer);
    received += value.length;
    if (contentLength > 0) {
      onProgress(Math.round((received / contentLength) * 90)); // 0-90% for download
    }
  }

  // Merge all chunks into a single ArrayBuffer
  const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  // Convert to base64
  let binary = '';
  for (let i = 0; i < merged.byteLength; i++) {
    binary += String.fromCharCode(merged[i]);
  }
  const base64 = btoa(binary);
  onProgress(95); // 95% — applying

  // Write the bundle zip using Capacitor Filesystem, then tell LiveUpdate to use it
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const fileName = `bundle-${info.version}.zip`;

  await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  // Get the file URI so LiveUpdate can find it
  const uriResult = await Filesystem.getUri({
    path: fileName,
    directory: Directory.Cache,
  });

  // Use LiveUpdate to set the next bundle from the local file
  // The plugin reads from this URI on next reload
  await (LiveUpdate as any).setNextBundle({ bundleId: `v${info.version}`, url: uriResult.uri });

  onProgress(100);

  // Record the new version so next check knows current state
  localStorage.setItem('android-bundle-version', info.version);
}

// ─── Main Hook ─────────────────────────────────────────────────────────────────
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

  const [currentVersion, setCurrentVersion] = useState<string>('...');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Get current app version on mount
  useEffect(() => {
    if (isElectron) {
      (window as any).electronAPI.autoUpdater.getAppVersion()
        .then((v: string) => setCurrentVersion(v))
        .catch(() => setCurrentVersion('unknown'));
    } else if (isCapacitor) {
      setCurrentVersion(getAndroidCurrentVersion());
    } else {
      setCurrentVersion('web');
    }
  }, []);

  // ─── CHECK ──────────────────────────────────────────────────────────────────
  const checkForUpdates = useCallback(async () => {
    setState(prev => ({ ...prev, checking: true, error: null }));

    try {
      if (isElectron) {
        // Electron: IPC triggers electron-updater, events come back asynchronously
        await (window as any).electronAPI.autoUpdater.checkForUpdates();
        // Note: state is updated by the event listeners below (onUpdateAvailable, etc.)
        // We just flip checking back off after a timeout if no event fires
        setTimeout(() => {
          setState(prev => {
            if (prev.checking) return { ...prev, checking: false };
            return prev;
          });
        }, 15000);
      } else if (isCapacitor) {
        // Android: Poll GitHub Releases API directly (free)
        const info = await checkAndroidUpdate();
        if (info) {
          setState(prev => ({
            ...prev,
            checking: false,
            available: true,
            updateInfo: info,
          }));
        } else {
          setState(prev => ({ ...prev, checking: false, available: false }));
        }
        setLastChecked(new Date());
      } else {
        // Web: no native updates
        setState(prev => ({ ...prev, checking: false }));
        setLastChecked(new Date());
      }
    } catch (error) {
      logger.error('Failed to check for updates', error);
      setState(prev => ({
        ...prev,
        checking: false,
        error: error instanceof Error ? error.message : 'Failed to check for updates',
      }));
    }
  }, []);

  // ─── DOWNLOAD ────────────────────────────────────────────────────────────────
  const downloadUpdate = useCallback(async () => {
    setState(prev => ({ ...prev, downloading: true, progress: 0, error: null }));

    try {
      if (isElectron) {
        // Electron: IPC triggers downloading; progress comes via events
        await (window as any).electronAPI.autoUpdater.downloadUpdate();
      } else if (isCapacitor && state.updateInfo) {
        // Android: Download from GitHub and apply via Capawesome
        await downloadAndApplyAndroidUpdate(state.updateInfo, (percent) => {
          setState(prev => ({ ...prev, progress: percent }));
        });
        setState(prev => ({
          ...prev,
          downloading: false,
          downloaded: true,
          progress: 100,
        }));
      }
    } catch (error) {
      logger.error('Failed to download update', error);
      setState(prev => ({
        ...prev,
        downloading: false,
        error: error instanceof Error ? error.message : 'Failed to download update',
      }));
    }
  }, [state.updateInfo]);

  // ─── INSTALL ─────────────────────────────────────────────────────────────────
  const installUpdate = useCallback(async () => {
    try {
      if (isElectron) {
        await (window as any).electronAPI.autoUpdater.quitAndInstall();
      } else if (isCapacitor) {
        const { LiveUpdate } = await import('@capawesome/capacitor-live-update');
        await LiveUpdate.reload();
      }
    } catch (error) {
      logger.error('Failed to install update', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to install update',
      }));
    }
  }, []);

  // ─── DISMISS ─────────────────────────────────────────────────────────────────
  const dismissUpdate = useCallback(() => {
    setState(prev => ({ ...prev, available: false, downloaded: false }));
  }, []);

  // ─── ELECTRON EVENT LISTENERS ────────────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI.autoUpdater;

    const cleanups: (() => void)[] = [];

    cleanups.push(api.onUpdateAvailable?.((info: UpdateInfo) => {
      setState(prev => ({
        ...prev,
        checking: false,
        available: true,
        updateInfo: info,
      }));
      setLastChecked(new Date());
    }));

    cleanups.push(api.onUpdateNotAvailable?.(() => {
      setState(prev => ({ ...prev, checking: false, available: false }));
      setLastChecked(new Date());
    }));

    cleanups.push(api.onDownloadProgress?.((progress: { percent: number }) => {
      setState(prev => ({ ...prev, downloading: true, progress: progress.percent }));
    }));

    cleanups.push(api.onUpdateDownloaded?.((info: UpdateInfo) => {
      setState(prev => ({
        ...prev,
        downloading: false,
        downloaded: true,
        progress: 100,
        updateInfo: info,
      }));
    }));

    cleanups.push(api.onError?.((error: { message: string }) => {
      setState(prev => ({
        ...prev,
        checking: false,
        downloading: false,
        error: error.message,
      }));
    }));

    return () => {
      cleanups.forEach(cleanup => typeof cleanup === 'function' && cleanup());
    };
  }, []);

  // ─── AUTO-CHECK ON STARTUP ───────────────────────────────────────────────────
  // Runs once on mount if user has auto-check enabled.
  // For Electron: the main process also checks after 10s, this is a backup.
  // For Android: this is the primary check mechanism.
  useEffect(() => {
    const autoCheck = localStorage.getItem('autoCheckUpdates') !== 'false';
    if (autoCheck && (isElectron || isCapacitor)) {
      const timeout = setTimeout(() => {
        checkForUpdates();
      }, 8000); // 8 seconds after mount — gives app time to settle
      return () => clearTimeout(timeout);
    }
  }, [checkForUpdates]);

  return {
    ...state,
    currentVersion,
    lastChecked,
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    dismissUpdate,
    isElectron,
    isCapacitor,
    platform: isElectron ? 'electron' : isCapacitor ? 'capacitor' : 'web',
  };
}
