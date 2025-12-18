// Electron storage wrapper - uses Electron IPC when available, falls back to localStorage for web
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (window.electronAPI) {
      // Use Electron database
      return null; // We'll use direct DB calls instead
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (window.electronAPI) {
      // Use Electron database
      return; // We'll use direct DB calls instead
    }
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (window.electronAPI) {
      // Use Electron database
      return; // We'll use direct DB calls instead
    }
    localStorage.removeItem(key);
  }
};

// Note: electronAPI type declaration is in src/vite-env.d.ts

export const isElectron = () => !!window.electronAPI;
