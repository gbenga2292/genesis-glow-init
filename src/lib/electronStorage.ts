/**
 * Storage wrapper - uses localStorage for all platforms.
 * Electron/SQLite/NAS functionality is disabled - all data goes through Supabase.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
};

// Always return false - Electron/SQLite is disabled, all data uses Supabase
export const isElectron = () => false;
