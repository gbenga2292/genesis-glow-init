import { useState, useEffect } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppMenuBar } from "@/components/layout/AppMenuBar";
import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProfileHeader, StatCards, PersonalInfoCard, SecurityPanel, PreferencesCard, LoginHistoryCard, PermissionsCard, SignatureUpload } from "@/components/profile";
import { dataService } from '@/services/dataService';
import { Package, CheckCircle2, Zap, Users } from "lucide-react";

const ProfilePage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Load saved avatar on mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem(`avatar_${currentUser?.id}`);
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, [currentUser?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarChange = (avatarData: string) => {
    setAvatarUrl(avatarData);
  };

  // Live stats fetched from dataService
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const [assets, waybills, activities, users] = await Promise.all([
        // may return arrays
        dataService.assets.getAssets && dataService.assets.getAssets() || [],
        dataService.waybills.getWaybills && dataService.waybills.getWaybills() || [],
        dataService.activities.getActivities && dataService.activities.getActivities() || [],
        dataService.auth.getUsers && dataService.auth.getUsers() || []]
        );

        if (!mounted) return;

        const computed = [
        {
          icon: <Package className="h-6 w-6" />,
          label: 'Assets Managed',
          value: assets && assets.length || 0,
          change: assets && assets.length ? `+${Math.max(0, Math.round(assets.length % 20))}% this month` : undefined,
          trend: 'up' as const,
          color: 'blue' as const
        },
        {
          icon: <CheckCircle2 className="h-6 w-6" />,
          label: 'Waybills Signed',
          value: waybills && waybills.filter((w: any) => w.status === 'signed').length || waybills && waybills.length || 0,
          change: undefined,
          trend: 'up' as const,
          color: 'green' as const
        },
        {
          icon: <Zap className="h-6 w-6" />,
          label: 'Total Activity',
          value: activities && activities.length || 0,
          change: undefined,
          trend: 'neutral' as const,
          color: 'indigo' as const
        },
        {
          icon: <Users className="h-6 w-6" />,
          label: 'Team Members',
          value: users && users.length || 0,
          // intentionally no subtitle for team members
          change: undefined,
          trend: 'neutral' as const,
          color: 'purple' as const
        }];


        setStats(computed);
      } catch (e) {
        console.error('Failed to load profile stats', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {mounted = false;};
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* App Menu Bar for Desktop */}
            <div className="hidden md:block">
                <AppMenuBar
          onRefresh={() => window.location.reload()}
          onOpenSettings={() => navigate('/')}
          currentUser={currentUser}
          onMobileMenuClick={isMobile ? () => setMobileMenuOpen(true) : undefined} />

            </div>

            {/* Mobile Sidebar Sheet */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="left" className="w-64 p-0">
                    <Sidebar
            activeTab=""
            onTabChange={(tab) => {setMobileMenuOpen(false);try {sessionStorage.setItem('pending_active_tab', tab);} catch {}navigate('/');}}
            mode="mobile" />

                </SheetContent>
            </Sheet>

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar */}
                {!isMobile &&
        <Sidebar
          activeTab=""
          onTabChange={(tab) => {try {sessionStorage.setItem('pending_active_tab', tab);} catch {}navigate('/');}}
          mode="desktop" />

        }

                {/* Main Content Area */}
                <main className={cn(
          "flex-1 overflow-y-auto overflow-x-hidden flex flex-col",
          isMobile && "pb-16"
        )}>
                {/* Custom Header with Back Button */}
                    <div className="h-[40px] border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-40 flex items-center justify-between px-4 mobile-title-bar-offset">
                        <div className="flex items-center gap-2">
                            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="h-8 w-8 p-0">

                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-sm font-semibold leading-tight">Personal Command Center</h2>
                        </div>
                        {isMobile








            }
                    </div>
                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
                            {/* Header Section with Avatar and Role */}
                            <ProfileHeader
                onLogout={handleLogout}
                onAvatarChange={handleAvatarChange} />


                            {/* Statistics Cards */}
                            <StatCards stats={stats} isLoading={isLoading} />

                            {/* Signature / Relevant Controls */}
                            <div className="mb-4">
                                <SignatureUpload />
                            </div>

                            {/* Two-Column Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Column - Narrow */}
                                <div className="lg:col-span-1 space-y-6">
                                    <LoginHistoryCard isLoading={isLoading} />
                                    <PermissionsCard isLoading={isLoading} />
                                </div>

                                {/* Right Column - Wide */}
                                <div className="lg:col-span-2 space-y-6">
                                    <PersonalInfoCard isLoading={isLoading} />
                                    <SecurityPanel isLoading={isLoading} />
                                    <PreferencesCard isLoading={isLoading} />
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>);

};

export default ProfilePage;