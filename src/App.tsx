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
      if (window.db?.getDatabaseInfo) {
        try {
          const dbInfo = await window.db.getDatabaseInfo();
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
          });
          
          logger.info('Database initialized');
        } catch (error) {
          logger.error('Failed to get database info', error);
        }
      }
    };

    // Validate LLM configuration if local mode is enabled
    const validateLLMConfig = async () => {
      if (aiConfig.AI_MODE === 'local') {
        // Check if LLM is configured and available
        const hasHttpUrl = aiConfig.LOCAL.localHttpUrl && aiConfig.LOCAL.localHttpUrl.length > 0;
        const hasBinaryPath = aiConfig.LOCAL.binaryPath && aiConfig.LOCAL.binaryPath.length > 0;
        const hasModelPath = aiConfig.LOCAL.modelPath && aiConfig.LOCAL.modelPath.length > 0;

        if (!hasHttpUrl && !hasBinaryPath) {
          logger.warn('LLM configuration incomplete: no HTTP URL or binary path configured');
          toast.warning(
            'AI Assistant Setup Incomplete',
            {
              description: 'Local LLM mode enabled but not configured. Go to Settings > AI Assistant to configure.',
              duration: 8000,
            }
          );
          return;
        }

        // If we have a binary path but no model path, warn
        if (hasBinaryPath && !hasModelPath) {
          logger.warn('LLM binary configured but no model path specified');
          toast.warning(
            'AI Model Not Configured',
            {
              description: 'LLM binary configured but model file path is missing. Check Settings > AI Assistant.',
              duration: 8000,
            }
          );
          return;
        }

        // Try to check if LLM is available (if window.llm exists)
        if ((window as any).llm && (window as any).llm.status) {
          try {
            const status = await (window as any).llm.status();
            if (!status.available) {
              logger.warn('LLM configured but not available');
              toast.info(
                'AI Assistant Not Available',
                {
                  description: 'LLM is configured but currently unavailable. Offline parsing will be used.',
                  duration: 8000,
                }
              );
            } else {
              logger.info('LLM is available and ready');
            }
          } catch (err) {
            logger.warn('Failed to check LLM status', err);
          }
        }
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
