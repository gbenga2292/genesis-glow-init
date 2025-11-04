/**
 * Database Configuration
 * 
 * This file controls where your database is stored.
 * You can change these settings to match your needs.
 */

// ===== DATABASE LOCATION CONFIGURATION =====
// Choose where you want to store your database

// Option 1: Network/NAS Storage (for shared access across multiple computers)
// Example: '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System'
const NETWORK_DB_PATH = '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System';

// Option 2: Local Storage (for single computer use)
// Example: 'C:\\Users\\YourName\\Documents\\GenesisGlow\\Database'
// const LOCAL_DB_PATH = 'C:\\MyDatabase';

// Option 3: Use the default app data folder
// This will automatically choose the correct location for your operating system
const USE_DEFAULT_APP_DATA = false;

// ===== CONFIGURATION OPTIONS =====

const config = {
  // Choose which database path to use:
  // 'network' - Use network/NAS storage (NETWORK_DB_PATH)
  // 'local' - Use custom local path (LOCAL_DB_PATH)
  // 'appdata' - Use default app data folder (recommended for single user)
  storageType: 'network', // Reverted to 'network' - ensure NAS is accessible and mapped

  // Network path (used when storageType is 'network')
  networkPath: NETWORK_DB_PATH,

  // Local custom path (used when storageType is 'local')
  // Uncomment and set your desired path:
  // localPath: 'C:\\Users\\YourName\\Documents\\GenesisGlow\\Database',
  localPath: null,

  // Database filename (do not change unless you know what you're doing)
  databaseFilename: 'genesis-glow.sqlite',
  
  // Lock file for preventing concurrent access (do not change)
  lockFilename: 'db.lock',

  // Enable database locking (disable for single-user local setup)
  enableLocking: true,

  // Auto-create database if it doesn't exist
  autoCreateDatabase: true,

  // Automatically backup before opening (recommended)
  autoBackup: true,
};

/**
 * Get the configured database path based on settings
 */
export function getDatabasePath(appDataPath) {
  if (config.storageType === 'network' && config.networkPath) {
    return config.networkPath;
  } else if (config.storageType === 'local' && config.localPath) {
    return config.localPath;
  } else {
    // Default to app data folder
    return appDataPath;
  }
}

export default config;
