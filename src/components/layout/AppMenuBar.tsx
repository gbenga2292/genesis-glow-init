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
import { useTheme } from "next-themes";
import { Minus, Square, X, Maximize2, Keyboard, Info, FileSpreadsheet, FileText, Menu } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppMenuBarProps {
  onNewAsset?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
  canCreateAsset?: boolean;
  onMobileMenuClick?: () => void;
  currentUser?: { role: string; name: string } | null;
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
  const { theme, setTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron environment
    setIsElectron(!!(window as any).electronAPI);
  }, []);

  const handleMinimize = () => {
    if (window.electronAPI?.window?.minimize) {
      window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.window?.maximize) {
      window.electronAPI.window.maximize();
      // We rely on the result or an event, but determining state locally for now
      // Ideally we should listen to window events
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


  /* Export Dialog State */
  // Moved up

  if (!isElectron) return null;

  return (
    <>
      <div className="flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border app-drag-region sticky top-0 z-50 h-12 pr-[140px]">
        {/* Logo and Menu */}
        <div className="flex items-center app-no-drag">
          {onMobileMenuClick && (
            <button
              onClick={onMobileMenuClick}
              className="px-3 py-2 hover:bg-accent mr-1 md:hidden text-foreground"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="px-4 py-2 flex items-center gap-2">
            <img src="favicon.ico" alt="DCEL" className="h-5 w-5 hidden md:block" />
            <span className="text-sm font-semibold text-foreground">DCEL</span>
          </div>

          <Menubar className="border-0 bg-transparent h-auto hidden md:flex">
            <MenubarMenu>
              <MenubarTrigger className="text-xs px-3 py-1.5 font-medium data-[state=open]:bg-accent hover:bg-accent/80 rounded-sm">
                File
              </MenubarTrigger>
              <MenubarContent className="bg-popover border-border">
                <MenubarItem onClick={onNewAsset} disabled={!canCreateAsset}>
                  New Asset <MenubarShortcut>Ctrl+N</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={() => setShowExportDialog(true)}>
                  Export Data <MenubarShortcut>Ctrl+E</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={handleQuit}>
                  Exit <MenubarShortcut>Alt+F4</MenubarShortcut>
                </MenubarItem>

              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="text-xs px-3 py-1.5 font-medium data-[state=open]:bg-accent hover:bg-accent/80 rounded-sm">
                View
              </MenubarTrigger>
              <MenubarContent className="bg-popover border-border">
                <MenubarItem onClick={onRefresh}>
                  Refresh <MenubarShortcut>F5</MenubarShortcut>
                </MenubarItem>
                <MenubarSeparator />
                <MenubarCheckboxItem
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                >
                  Dark Mode
                </MenubarCheckboxItem>
                <MenubarSeparator />
                <MenubarItem onClick={handleMaximize}>
                  {isMaximized ? "Restore" : "Maximize"} <MenubarShortcut>F11</MenubarShortcut>
                </MenubarItem>
                <MenubarItem onClick={handleToggleDevTools}>
                  Toggle Developer Tools <MenubarShortcut>F12</MenubarShortcut>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>

            <MenubarMenu>
              <MenubarTrigger className="text-xs px-3 py-1.5 font-medium data-[state=open]:bg-accent hover:bg-accent/80 rounded-sm">
                Help
              </MenubarTrigger>
              <MenubarContent className="bg-popover border-border">
                <MenubarItem disabled>
                  Documentation
                </MenubarItem>
                <MenubarItem onClick={() => setShowShortcutsDialog(true)}>
                  Keyboard Shortcuts
                </MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => setShowAboutDialog(true)}>
                  About DCEL
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>

        {/* Window Controls - Handled naturally by Electron titleBarOverlay on Windows */}
        <div className="flex items-center app-no-drag w-32">
          {/* Spacer for native controls if needed, but flex-1 would handle it. 
              Actually, with justify-between, if we have no right element, the left element stays left.
              We don't need to put anything here. 
          */}
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
                onExport?.(); // Default behavior triggers Excel for now, but logical separation is good
                // In Index.tsx we will change this to handle Excel specifically if needed,
                // but currently onExport does Excel.
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
                // We need a specific prop for PDF or handle it via a new callback
                // But since we can't easily change the prop signature without breaking Index.tsx yet,
                // We will emit a custom event or use the same prop with a parameter if possible.
                // For now, let's dispatch a custom event that Index.tsx can listen to.
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
