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
    
    showDatabaseInfo();
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AssetsProvider>
              <WaybillsProvider>
                <AppDataProvider>
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
                </AppDataProvider>
              </WaybillsProvider>
            </AssetsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
