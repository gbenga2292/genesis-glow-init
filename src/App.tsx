import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createIDBPersister } from "./lib/query-persister";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { AssetsProvider } from "./contexts/AssetsContext";
import { WaybillsProvider } from "./contexts/WaybillsContext";
import { AppDataProvider } from "./contexts/AppDataContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { NetworkStatus } from "./components/NetworkStatus";
import { UpdateNotificationBanner } from "./components/layout/UpdateNotificationBanner";
import ProtectedRoute from "./components/ProtectedRoute";
import RestockHistoryPage from "./pages/RestockHistoryPage";
import AssetDescriptionPage from "./pages/AssetDescriptionPage";
import PerformanceTestPage from "./pages/PerformanceTestPage";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ProfilePage from "./pages/ProfilePage";
import { logger } from "./lib/logger";
import { Capacitor } from '@capacitor/core';
import { SplashScreenController } from "./components/SplashScreenController";
import { PinLockScreen } from "./components/PinLockScreen";
import { PinLockGuard } from "./components/PinLockGuard";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const App = () => {
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = platform === 'android' || platform === 'ios';
    const isElectron = !!(window as any).electronAPI;

    logger.info(`App initialized on ${platform}`);

    // Show database connection info on Electron
    const showDatabaseInfo = async () => {
      if (isElectron && (window as any).electronAPI?.db?.getDatabaseInfo) {
        try {
          const dbInfo = await (window as any).electronAPI.db.getDatabaseInfo();
          let storageTypeLabel = '';

          switch (dbInfo.storageType) {
            case 'network':
              storageTypeLabel = '🌐 Network/NAS';
              break;
            case 'local':
              storageTypeLabel = '💾 Local Storage';
              break;
            case 'appdata':
              storageTypeLabel = '📁 App Data';
              break;
            default:
              storageTypeLabel = '📊 Database';
          }

          toast.success(`Database Connected`, {
            description: storageTypeLabel,
            duration: 4000,
            position: "bottom-center",
          });

          logger.info('Database initialized');
        } catch (error) {
          logger.error('Failed to get database info', error);
        }
      }
    };

    showDatabaseInfo();

    // Listen for scheduled backup requests from Main process
    if ((window as any).electronAPI?.backupScheduler?.onAutoBackupTrigger) {
      (window as any).electronAPI.backupScheduler.onAutoBackupTrigger(async () => {
        logger.info('Received scheduled backup request');
        try {
          const { dataService } = await import("./services/dataService");
          const backupData = await dataService.system.createBackup();

          if ((window as any).electronAPI.backupScheduler?.save) {
            await (window as any).electronAPI.backupScheduler.save(backupData);
            toast.success("Scheduled Backup Complete", {
              description: "Your daily backup has been saved."
            });
          }
        } catch (err) {
          logger.error("Scheduled backup failed", err);
          toast.error("Scheduled Backup Failed");
        }
      });
    }

    // Deep Link Handling (Electron & Capacitor)
    const handleDeepLink = async (url: string) => {
      logger.info(`Deep link received: ${url}`);
      // Expected format: dcel-inventory://<path>#access_token=...&refresh_token=...&type=recovery
      // OR: dcel-inventory://reset-password#access_token=... (if we used that as redirect)

      try {
        const urlObj = new URL(url);
        const hash = urlObj.hash; // #access_token=...
        const params = new URLSearchParams(hash.substring(1)); // remove #

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && type === 'recovery') {
          // It's a password reset!
          const { supabase } = await import("@/integrations/supabase/client");

          const { error } = await (supabase as any).auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            logger.error("Failed to restore session from deep link", error);
            toast.error("Failed to verify reset link");
          } else {
            toast.success("Session Verified", { description: "You can now reset your password." });
            window.location.hash = '#/reset-password';
          }
        }
      } catch (e) {
        logger.error("Error processing deep link", e);
      }
    };

    // Electron Listener
    if (isElectron && (window as any).electronAPI?.onDeepLink) {
      (window as any).electronAPI.onDeepLink((url: string) => {
        handleDeepLink(url);
      });
    }

    // Capacitor Listener
    if (isNative) {
      // Dynamic import to avoid SSR/Electron issues if package not present/mocked
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appUrlOpen', (data: any) => {
          handleDeepLink(data.url);
        });
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: createIDBPersister(),
          maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
          buster: 'v1',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          themes={[
            'light',
            'dark',
            'high-contrast',
            'sepia',
            'ocean',
            'forest',
            'purple',
            'sunset',
            'monochrome',
            'amoled',
            'cyberpunk',
            'coffee',
            'matrix',
            'sky',
            'tokyo-night',
            'dune'
          ]}
        >
          <AuthProvider>
            <AssetsProvider>
              <WaybillsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <UpdateNotificationBanner />
                  <NetworkStatus />
                  <AppDataProvider>
                    <SplashScreenController />

                    <PinLockGuard>
                      <HashRouter>
                        <Routes>
                          <Route path="/login" element={<Login />} />
                          <Route path="/signup" element={<SignUp />} />
                          <Route path="/forgot-password" element={<ForgotPassword />} />
                          <Route path="/reset-password" element={<ResetPassword />} />
                          <Route path="/" element={
                            <ProtectedRoute>
                              <Index />
                            </ProtectedRoute>
                          } />
                          <Route path="/asset/:id/history" element={
                            <ProtectedRoute>
                              <RestockHistoryPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/asset/:id/description" element={
                            <ProtectedRoute>
                              <AssetDescriptionPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/performance-test" element={
                            <ProtectedRoute>
                              <PerformanceTestPage />
                            </ProtectedRoute>
                          } />
                          <Route path="/profile" element={
                            <ProtectedRoute>
                              <ProfilePage />
                            </ProtectedRoute>
                          } />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </HashRouter>
                    </PinLockGuard>
                  </AppDataProvider>
                </TooltipProvider>
              </WaybillsProvider>
            </AssetsProvider>
          </AuthProvider>
        </ThemeProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
