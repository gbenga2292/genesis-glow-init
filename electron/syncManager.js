import fs from 'fs';
import path from 'path';

/**
 * SyncManager - Handles database synchronization status tracking
 * Stores sync metadata to detect failures and provide manual sync capabilities
 */
export class SyncManager {
  constructor(appDataPath, masterDbPath, localDbPath, dbModule) {
    this.appDataPath = appDataPath;
    this.masterDbPath = masterDbPath;
    this.localDbPath = localDbPath;
    this.syncMetadataPath = path.join(appDataPath, 'sync-metadata.json');
    this.dbModule = dbModule;
  }

  /**
   * Get current sync metadata
   */
  getSyncMetadata() {
    try {
      if (fs.existsSync(this.syncMetadataPath)) {
        const data = fs.readFileSync(this.syncMetadataPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading sync metadata:', error);
    }

    return {
      lastSyncAttempt: null,
      lastSuccessfulSync: null,
      syncStatus: 'unknown',
      failureReason: null,
      localDbModified: null,
      masterDbModified: null
    };
  }

  /**
   * Save sync metadata
   */
  saveSyncMetadata(metadata) {
    try {
      fs.writeFileSync(this.syncMetadataPath, JSON.stringify(metadata, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving sync metadata:', error);
      return false;
    }
  }

  /**
   * Get file modification time
   */
  getFileModTime(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        return stats.mtime.getTime();
      }
    } catch (error) {
      console.error(`Error getting mod time for ${filePath}:`, error);
    }
    return null;
  }

  /**
   * Check if databases are out of sync
   */
  checkSyncStatus() {
    const metadata = this.getSyncMetadata();
    const localModTime = this.getFileModTime(this.localDbPath);
    const masterModTime = this.getFileModTime(this.masterDbPath);

    // If no local DB exists yet, we're in sync (initial state)
    if (!localModTime) {
      return {
        inSync: true,
        status: 'synced',
        metadata
      };
    }

    // If last sync failed
    if (metadata.syncStatus === 'failed') {
      return {
        inSync: false,
        status: 'failed',
        metadata,
        reason: metadata.failureReason
      };
    }

    // If local is newer than last successful sync, out of sync
    if (metadata.lastSuccessfulSync && localModTime > new Date(metadata.lastSuccessfulSync).getTime()) {
      return {
        inSync: false,
        status: 'pending',
        metadata,
        localNewer: true
      };
    }

    return {
      inSync: true,
      status: 'synced',
      metadata
    };
  }

  /**
   * Perform sync from local to master
   */
  async syncToMaster() {
    const startTime = new Date().toISOString();

    try {
      console.log('Syncing local database to master...');

      // Use DB module backup if available (robust method)
      if (this.dbModule && typeof this.dbModule.createDatabaseBackup === 'function') {
        const result = await this.dbModule.createDatabaseBackup(this.masterDbPath);
        if (!result.success) {
          throw new Error(result.error || 'Database backup failed');
        }
      } else {
        // Fallback to fs copy (legacy/risky method)
        console.warn('Using legacy fs copy for sync (potentially unsafe if DB open)...');
        // Check if local DB exists
        if (!fs.existsSync(this.localDbPath)) {
          throw new Error('Local database does not exist');
        }
        // Check if master path is accessible
        const masterDir = path.dirname(this.masterDbPath);
        if (!fs.existsSync(masterDir)) {
          fs.mkdirSync(masterDir, { recursive: true });
        }
        // Perform the copy
        fs.copyFileSync(this.localDbPath, this.masterDbPath);
      }

      // Update metadata
      const metadata = {
        lastSyncAttempt: startTime,
        lastSuccessfulSync: startTime,
        syncStatus: 'synced',
        failureReason: null,
        localDbModified: this.getFileModTime(this.localDbPath),
        masterDbModified: this.getFileModTime(this.masterDbPath)
      };

      this.saveSyncMetadata(metadata);

      console.log('✓ Sync to master completed successfully');
      return {
        success: true,
        timestamp: startTime
      };

    } catch (error) {
      console.error('✗ Sync to master failed:', error);

      // Save failure metadata
      const metadata = {
        lastSyncAttempt: startTime,
        lastSuccessfulSync: this.getSyncMetadata().lastSuccessfulSync,
        syncStatus: 'failed',
        failureReason: error.message,
        localDbModified: this.getFileModTime(this.localDbPath),
        masterDbModified: this.getFileModTime(this.masterDbPath)
      };

      this.saveSyncMetadata(metadata);

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform sync from master to local (initial load)
   */
  syncFromMaster() {
    const startTime = new Date().toISOString();

    try {
      console.log('Syncing master database to local...');

      if (!fs.existsSync(this.masterDbPath)) {
        throw new Error('Master database does not exist');
      }

      fs.copyFileSync(this.masterDbPath, this.localDbPath);

      const metadata = {
        lastSyncAttempt: startTime,
        lastSuccessfulSync: startTime,
        syncStatus: 'synced',
        failureReason: null,
        localDbModified: this.getFileModTime(this.localDbPath),
        masterDbModified: this.getFileModTime(this.masterDbPath)
      };

      this.saveSyncMetadata(metadata);

      console.log('✓ Sync from master completed successfully');
      return {
        success: true,
        timestamp: startTime
      };

    } catch (error) {
      console.error('✗ Sync from master failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark sync as started
   */
  markSyncStarted() {
    const metadata = this.getSyncMetadata();
    metadata.syncStatus = 'syncing';
    metadata.lastSyncAttempt = new Date().toISOString();
    this.saveSyncMetadata(metadata);
  }

  /**
   * Get detailed sync info for UI
   */
  getSyncInfo() {
    const metadata = this.getSyncMetadata();
    const status = this.checkSyncStatus();

    return {
      ...status,
      lastSync: metadata.lastSuccessfulSync,
      lastAttempt: metadata.lastSyncAttempt,
      masterExists: fs.existsSync(this.masterDbPath),
      localExists: fs.existsSync(this.localDbPath),
      masterPath: this.masterDbPath,
      localPath: this.localDbPath
    };
  }
}
