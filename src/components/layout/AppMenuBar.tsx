import { useState, useEffect } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
  MenubarCheckboxItem,
} from "@/components/ui/menubar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Minus, Square, X, Maximize2, Keyboard, Info, FileSpreadsheet, FileText, Menu, User, Settings, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppMenuBarProps {
  onNewAsset?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
  canCreateAsset?: boolean;
  onMobileMenuClick?: () => void;
  currentUser?: { role: string; name: string; avatar?: string; id?: string; username?: string } | null;
}

export const AppMenuBar = ({
  onNewAsset,
  onRefresh,
  onExport,
  onOpenSettings,
  canCreateAsset = true,
  onMobileMenuClick,
  currentUser,
}: AppMenuBarProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if running in Electron environment
    const electron = !!(window as any).electronAPI;
    setIsElectron(electron);

    if (electron && (window as any).electronAPI?.window?.updateTitleBarOverlay) {
      // Determine if the current theme is light-based or dark-based
      const lightThemes = ['light', 'sepia', 'monochrome', 'sky'];
      // resolvedTheme might be 'dark' or 'light' for system, but for explicit themes it is the theme name
      const currentTheme = theme || resolvedTheme || 'light';

      const isLightTheme = lightThemes.includes(currentTheme) || (currentTheme === 'system' && resolvedTheme === 'light');

      (window as any).electronAPI.window.updateTitleBarOverlay({
        symbolColor: isLightTheme ? '#000000' : '#ffffff',
        color: '#00000000', // Transparent background to let the theme background show through
        height: 30
      });
    }
  }, [theme, resolvedTheme]);

  const handleMinimize = () => {
    if (window.electronAPI?.window?.minimize) {
      window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.window?.maximize) {
      window.electronAPI.window.maximize();
      setIsMaximized(prev => !prev);
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.window?.close) {
      window.electronAPI.window.close();
    }
  };

  const handleQuit = () => {
    if (window.electronAPI?.window?.close) {
      window.electronAPI.window.close();
    }
  };

  const handleToggleDevTools = () => {
    console.log("Toggling Dev Tools requested");
    if (window.electronAPI?.window?.toggleDevTools) {
      window.electronAPI.window.toggleDevTools();
    } else {
      console.warn("DevTools API not available");
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    if (!isElectron) return; // Only enable shortcuts in Electron

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New Asset
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        if (canCreateAsset) {
          onNewAsset?.();
        }
      }
      // Ctrl+E: Export
      if (e.ctrlKey && e.key === 'e') {
        e.preventDefault();
        onExport?.();
      }
      // Ctrl+,: Settings
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
      }
      // F5: Refresh
      if (e.key === 'F5') {
        // Allow default refresh or call prop
        if (onRefresh) {
          e.preventDefault();
          onRefresh();
        }
      }
      // F11: Maximize
      if (e.key === 'F11') {
        e.preventDefault();
        handleMaximize();
      }
      // F12: Dev Tools
      if (e.key === 'F12') {
        e.preventDefault();
        handleToggleDevTools();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNewAsset, onExport, onOpenSettings, onRefresh, canCreateAsset, isElectron]);

  if (!isElectron) return null;

  return (
    <>
      <div className="flex items-center justify-between bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 border-b border-border/40 app-drag-region sticky top-0 z-50 h-[40px] select-none text-xs transition-colors duration-300">
        {/* Left: Logo and Menu */}
        <div className="flex items-center app-no-drag pl-2 h-full">
          {onMobileMenuClick && (
            <button
              onClick={onMobileMenuClick}
              className="px-2 py-1 hover:bg-accent/50 mr-1 md:hidden text-muted-foreground hover:text-foreground transition-colors rounded-sm"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2 mr-2 px-2 h-full border-r border-border/30 pr-3 my-2">
            <img src="favicon.ico" alt="DCEL" className="h-4 w-4 hidden md:block opacity-80" />
            <span className="font-semibold text-foreground/90 tracking-tight hidden md:inline-block">DCEL Inventory</span>
          </div>

          <Menubar className="border-0 bg-transparent h-auto p-0 hidden md:flex gap-0.5">
            <MenubarMenu>
              <MenubarTrigger className="text-[11px] px-2.5 py-1 h-7 font-medium text-muted-foreground data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground rounded-[4px] cursor-default transition-colors">
                File
              </MenubarTrigger>
              <MenubarContent className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-lg min-w-[200px]">
                <MenubarItem onClick={onNewAsset} disabled={!canCreateAsset} className="text-xs py-1.5">
                  New Asset <MenubarShortcut className="text-[10px]">Ctrl+N</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => setShowExportDialog(true)} className="text-xs py-1.5">
                  Export Data <MenubarShortcut className="text-[10px]">Ctrl+E</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator className="bg-border/50" />
                <MenubarItem onClick={handleQuit} className="text-xs py-1.5">
                  Exit <MenubarShortcut className="text-[10px]">Alt+F4</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="text-[11px] px-2.5 py-1 h-7 font-medium text-muted-foreground data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground rounded-[4px] cursor-default transition-colors">
                View
              </MenubarTrigger>
              <MenubarContent className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-lg min-w-[200px]">
                <MenubarItem onClick={onRefresh} className="text-xs py-1.5">
                  Refresh <MenubarShortcut className="text-[10px]">F5</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator className="bg-border/50" />
                <MenubarCheckboxItem
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  className="text-xs py-1.5"
                >
                  Dark Mode
                </MenubarCheckboxItem>
                <MenubarSeparator className="bg-border/50" />
                <MenubarItem onClick={handleMaximize} className="text-xs py-1.5">
                  {isMaximized ? "Restore" : "Maximize"} <MenubarShortcut className="text-[10px]">F11</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={handleToggleDevTools} className="text-xs py-1.5">
                  Toggle Developer Tools <MenubarShortcut className="text-[10px]">F12</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="text-[11px] px-2.5 py-1 h-7 font-medium text-muted-foreground data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground hover:bg-accent/50 hover:text-accent-foreground rounded-[4px] cursor-default transition-colors">
                Help
              </MenubarTrigger>
              <MenubarContent className="bg-popover/95 backdrop-blur-sm border-border/50 shadow-lg min-w-[200px]">
                <MenubarItem disabled className="text-xs py-1.5">
                  Documentation
                </MenubarItem>
                <MenubarItem onClick={() => setShowShortcutsDialog(true)} className="text-xs py-1.5">
                  Keyboard Shortcuts
                </MenubarItem>
                <MenubarSeparator className="bg-border/50" />
                <MenubarItem onClick={() => setShowAboutDialog(true)} className="text-xs py-1.5">
                  About DCEL
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>

        {/* Center: Spacer instead of Search */}
        <div className="flex-1 app-drag-region"></div>

        {/* Right: Window Controls & Profile */}
        <div className="flex items-center h-full app-no-drag gap-1">
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="mr-1 flex items-center gap-2 px-2 py-1 hover:bg-accent/50 rounded-md cursor-pointer transition-colors max-w-[150px] h-7 outline-none">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={currentUser?.avatar} alt={currentUser?.name} />
                  <AvatarFallback className="text-[9px] bg-primary text-primary-foreground font-bold flex items-center justify-center w-full h-full">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[11px] font-medium truncate hidden md:block opacity-80">
                  {currentUser?.name || 'User'}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-sm">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser?.name || 'User'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{currentUser?.role || 'user'}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
                <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => {
                navigate('/login');
              }}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Spacer for Native Window Controls (Desktop) */}
          {isElectron && (
            <div className="hidden md:block w-[138px] h-full app-no-drag" />
          )}
        </div>
      </div>

      {/* Export Options Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
            <DialogDescription>
              Choose a format to export your inventory data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent/50 hover:border-primary/50 transition-all"
              onClick={() => {
                onExport?.();
                setShowExportDialog(false);
              }}
            >
              <FileSpreadsheet className="h-8 w-8 text-green-600" />
              <span className="font-semibold">Export to Excel</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent/50 hover:border-primary/50 transition-all"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('trigger-pdf-export'));
                setShowExportDialog(false);
              }}
            >
              <FileText className="h-8 w-8 text-red-600" />
              <span className="font-semibold">Export to PDF</span>
            </Button>
            {currentUser?.role === 'admin' && (
              <Button
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent/50 hover:border-primary/50 transition-all col-span-2"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('trigger-audit-export'));
                  setShowExportDialog(false);
                }}
              >
                <FileText className="h-8 w-8 text-blue-600" />
                <span className="font-semibold">Audit Report</span>
                <span className="text-xs text-muted-foreground">(Admin Only)</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={showAboutDialog} onOpenChange={setShowAboutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              About DCEL Asset Manager
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg">
              <img src="logo.png" alt="DCEL Logo" className="h-16 w-16 mb-2" />
              <h3 className="text-lg font-bold">DCEL Asset Manager</h3>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
            </div>
            <DialogDescription>
              Inventory Management & Tracking System for Dewatering Construction Etc Limited.
            </DialogDescription>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>© {new Date().getFullYear()} Dewatering Construction Etc Limited.</p>
              <p>All rights reserved.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shortcuts Dialog */}
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between items-center border-b pb-2">
                <span>New Asset</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Ctrl+N
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Export Data</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Ctrl+E
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Settings</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Ctrl+,
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Refresh</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  F5
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Dark Mode</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  -
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Maximize</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  F11
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Dev Tools</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  F12
                </kbd>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span>Quit</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Alt+F4
                </kbd>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
