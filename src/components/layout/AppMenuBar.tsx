import { useState } from "react";
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
import { Minus, Square, X, Maximize2 } from "lucide-react";

interface AppMenuBarProps {
  onNewAsset?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onOpenSettings?: () => void;
}

export const AppMenuBar = ({
  onNewAsset,
  onRefresh,
  onExport,
  onOpenSettings,
}: AppMenuBarProps) => {
  const { theme, setTheme } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    if (window.electronAPI?.window?.minimize) {
      window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electronAPI?.window?.maximize) {
      window.electronAPI.window.maximize();
      setIsMaximized(!isMaximized);
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

  return (
    <div className="flex items-center justify-between bg-background/95 backdrop-blur-sm border-b border-border app-drag-region">
      {/* Logo and Menu */}
      <div className="flex items-center app-no-drag">
        <div className="px-4 py-2 flex items-center gap-2">
          <img src="/logo.png" alt="DCEL" className="h-5 w-5" />
          <span className="text-sm font-semibold text-foreground">DCEL</span>
        </div>

        <Menubar className="border-0 bg-transparent h-auto">
          <MenubarMenu>
            <MenubarTrigger className="text-xs px-3 py-1.5 font-medium data-[state=open]:bg-accent hover:bg-accent/80 rounded-sm">
              File
            </MenubarTrigger>
            <MenubarContent className="bg-popover border-border">
              <MenubarItem onClick={onNewAsset}>
                New Asset <MenubarShortcut>Ctrl+N</MenubarShortcut>
              </MenubarItem>
              <MenubarItem onClick={onExport}>
                Export Data <MenubarShortcut>Ctrl+E</MenubarShortcut>
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem onClick={onOpenSettings}>
                Settings <MenubarShortcut>Ctrl+,</MenubarShortcut>
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
              <MenubarItem onClick={() => {
                if (window.electronAPI?.window?.toggleDevTools) {
                  window.electronAPI.window.toggleDevTools();
                }
              }}>
                Toggle Developer Tools <MenubarShortcut>F12</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          <MenubarMenu>
            <MenubarTrigger className="text-xs px-3 py-1.5 font-medium data-[state=open]:bg-accent hover:bg-accent/80 rounded-sm">
              Help
            </MenubarTrigger>
            <MenubarContent className="bg-popover border-border">
              <MenubarItem>
                Documentation
              </MenubarItem>
              <MenubarItem>
                Keyboard Shortcuts
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem>
                About DCEL
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {/* Window Controls */}
      <div className="flex items-center app-no-drag">
        <button
          onClick={handleMinimize}
          className="h-8 w-12 flex items-center justify-center hover:bg-muted/80 transition-colors"
          title="Minimize"
        >
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-8 w-12 flex items-center justify-center hover:bg-muted/80 transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Square className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="h-8 w-12 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Close"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-destructive-foreground" />
        </button>
      </div>
    </div>
  );
};