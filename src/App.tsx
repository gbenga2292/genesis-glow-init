import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { AssetsProvider } from "./contexts/AssetsContext";
import { WaybillsProvider } from "./contexts/WaybillsContext";
import { AppDataProvider } from "./contexts/AppDataContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import { logger } from "./lib/logger";
import { aiConfig } from "./config/aiConfig";

const queryClient = new QueryClient();


const App = () => {
  useEffect(() => {
    const showDatabaseInfo = async () => {
      if (window.electronAPI && window.electronAPI.db && window.electronAPI.db.getDatabaseInfo) {
        try {
          const dbInfo = await window.electronAPI.db.getDatabaseInfo();
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
            duration: 6000,
            position: "bottom-center",
            style: {
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              color: 'inherit',
            },
          });

          logger.info('Database initialized');
        } catch (error) {
          logger.error('Failed to get database info', error);
        }
      }
    };

    // Validate AI configuration: prefer remote API-key value stored in company settings if present
    const validateLLMConfig = async () => {
      try {
        // Try reading persisted company settings (may include ai.remote)
        if ((window as any).electronAPI?.db?.getCompanySettings) {
          const cs = await (window as any).electronAPI.db.getCompanySettings();
          const remote = cs?.ai?.remote;
          const r = remote?.enabled;
          if (remote && !!r && r !== 'false' && r !== '0') {
            // configure main process with remote config and test status
            try {
              await (window as any).llm?.configure({ remote }).catch(() => { });
              const status = await (window as any).llm?.status();
              if (!status?.available && !(status && status.remoteConfigured)) {
                toast.info('AI Assistant Not Available', { description: 'Remote AI is configured but not reachable. Check your API key and endpoint.', duration: 8000 });
              }
              return;
            } catch (err) {
              logger.warn('Failed to configure remote AI from settings', err);
            }
          }
        }

        // Remote-only mode: if no remote config found, AI is simply not enabled (not an error)
        logger.info('No remote AI configured. Users can configure in Settings > AI Assistant');
      } catch (err) {
        logger.warn('Failed to validate AI configuration', err);
      }
    };

    showDatabaseInfo();
    validateLLMConfig();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AssetsProvider>
              <WaybillsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <AppDataProvider>
                    <HashRouter>
                      <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={
                          <ProtectedRoute>
                            <Index />
                          </ProtectedRoute>
                        } />
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </HashRouter>
                  </AppDataProvider>
                </TooltipProvider>
              </WaybillsProvider>
            </AssetsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
