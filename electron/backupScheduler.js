import schedule from 'node-schedule';
import path from 'path';
import fs from 'fs';
import { app, dialog, BrowserWindow } from 'electron';
import * as db from './database.js';

class BackupScheduler {
    constructor() {
        this.job = null;
        this.localBackupDir = null;
        this.nasBackupPath = '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System\\Backups';
        this.maxBackups = 30; // Keep last 30 backups
        this.isEnabled = true;
        this.backupToNAS = true; // Enable NAS backup by default
        this.backupToLocal = false; // Disable local backups - only save to NAS
    }

    /**
     * Initialize the backup scheduler
     * @param {string} appDataPath - Application data path
     */
    initialize(appDataPath) {
        this.localBackupDir = path.join(appDataPath, 'backups');

        // Create local backups directory if it doesn't exist
        if (!fs.existsSync(this.localBackupDir)) {
            fs.mkdirSync(this.localBackupDir, { recursive: true });
            console.log('✓ Local backups directory created:', this.localBackupDir);
        }

        // Load backup settings from company settings
        this.loadBackupSettings();

        // Schedule daily backup at 5pm (17:00)
        this.scheduleBackup();
    }

    /**
     * Check if NAS is accessible
     * @returns {Promise<{accessible: boolean, message: string}>}
     */
    async checkNASAccessibility() {
        try {
            // Try to access the NAS path
            await fs.promises.access(this.nasBackupPath, fs.constants.R_OK | fs.constants.W_OK);
            console.log('✓ NAS is accessible:', this.nasBackupPath);
            return { accessible: true, message: 'NAS is accessible' };
        } catch (err) {
            console.warn('⚠️ NAS is not accessible:', err.message);
            return {
                accessible: false,
                message: `NAS not accessible: ${err.message}. Backup will be saved locally only.`
            };
        }
    }

    /**
     * Ensure NAS backup directories exist
     */
    async ensureNASDirectories() {
        try {
            const jsonDir = path.join(this.nasBackupPath, 'json');
            const databaseDir = path.join(this.nasBackupPath, 'database');

            // Create directories if they don't exist
            if (!fs.existsSync(jsonDir)) {
                fs.mkdirSync(jsonDir, { recursive: true });
                console.log('✓ Created NAS JSON directory:', jsonDir);
            }

            if (!fs.existsSync(databaseDir)) {
                fs.mkdirSync(databaseDir, { recursive: true });
                console.log('✓ Created NAS database directory:', databaseDir);
            }

            return true;
        } catch (err) {
            console.error('❌ Failed to create NAS directories:', err);
            return false;
        }
    }

    /**
     * Load backup settings from database
     */
    async loadBackupSettings() {
        try {
            const settings = await db.getCompanySettings();
            if (settings && settings.autoBackup !== undefined) {
                this.isEnabled = settings.autoBackup;
            }
            if (settings && settings.backupRetentionDays) {
                this.maxBackups = settings.backupRetentionDays;
            }
            if (settings && settings.nasBackupPath) {
                this.nasBackupPath = settings.nasBackupPath;
            }
        } catch (err) {
            console.warn('Could not load backup settings, using defaults:', err.message);
        }
    }

    /**
     * Schedule automatic backup at 5pm daily
     */
    scheduleBackup() {
        // Cancel existing job if any
        if (this.job) {
            this.job.cancel();
        }

        // Schedule backup at 5pm every day (17:00)
        // Cron format: minute hour * * *
        this.job = schedule.scheduleJob('0 17 * * *', async () => {
            if (this.isEnabled) {
                console.log('🕐 Scheduled backup triggered at 5pm');
                await this.performBackup(true); // isAutomatic = true
            } else {
                console.log('⏭️ Scheduled backup skipped (disabled in settings)');
            }
        });

        console.log('✓ Automatic backup scheduled for 5pm daily');
    }

    /**
     * Perform both JSON and Database backups
     * @param {boolean} isAutomatic - Whether this is an automatic backup
     * @param {boolean} showNotification - Whether to show user notification
     */
    /**
     * Perform both JSON and Database backups
     * @param {boolean} isAutomatic - Whether this is an automatic backup
     * @param {boolean} showNotification - Whether to show user notification
     * @param {Object} options - Custom backup options
     * @param {string[]} options.backupTypes - Types to backup: ['json', 'database']
     * @param {string[]} options.sections - Specific JSON sections to backup
     */
    async performBackup(isAutomatic = false, showNotification = true, options = {}) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const results = {
            json: { success: false, local: null, nas: null },
            database: { success: false, local: null, nas: null },
            nasAccessible: false,
            errors: []
        };

        // Delegate automatic backups to renderer (for Supabase support)
        // This is necessary because Main process doesn't have Supabase access
        if (isAutomatic) {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                console.log('📡 Delegating automatic backup to Renderer...');
                windows[0].webContents.send('backup:auto-trigger');
                return { delegated: true };
            } else {
                console.warn('⚠️ Cannot perform automatic backup: No active window to fetch data from.');
                return { error: 'No active window' };
            }
        }

        // Default options for automatic backup
        const backupTypes = options.backupTypes || ['json', 'database'];
        const jsonSections = options.sections; // If null/undefined, createJSONBackup will use defaults

        try {
            console.log('📦 Starting backup process...', { types: backupTypes, sections: jsonSections ? jsonSections.length : 'all' });

            // Check NAS accessibility
            const nasCheck = await this.checkNASAccessibility();
            results.nasAccessible = nasCheck.accessible;

            if (!nasCheck.accessible && showNotification) {
                // Notify user about NAS issue
                this.showNotification('NAS Not Accessible', nasCheck.message, 'warning');
            }

            // Ensure NAS directories exist if accessible
            if (results.nasAccessible) {
                await this.ensureNASDirectories();
            }

            // 1. Create JSON Backup
            if (backupTypes.includes('json')) {
                console.log('📄 Creating JSON backup...');
                const jsonResult = await this.createJSONBackup(timestamp, results.nasAccessible, jsonSections);
                results.json = jsonResult;
            }

            // 2. Create Database Backup
            if (backupTypes.includes('database')) {
                console.log('💾 Creating database backup...');
                const dbResult = await this.createDatabaseBackup(timestamp, results.nasAccessible);
                results.database = dbResult;
            }

            // Clean up old backups
            await this.cleanupOldBackups();

            // Log the backup activity
            try {
                const details = [];
                if (results.json.success) details.push('JSON backup');
                if (results.database.success) details.push('Database backup');
                if (results.nasAccessible) details.push('(saved to NAS)');
                else details.push('(saved locally only)');

                if (details.length > 0) {
                    await db.createActivity({
                        userId: 'system',
                        userName: 'System',
                        action: 'backup',
                        entity: 'database',
                        details: `${isAutomatic ? 'Automatic' : 'Manual'} backup: ${details.join(', ')}`,
                        timestamp: new Date()
                    });
                }
            } catch (err) {
                console.warn('Could not log backup activity:', err.message);
            }

            // Show success notification
            if (showNotification) {
                const message = results.nasAccessible
                    ? 'Backups saved to NAS successfully'
                    : 'NAS not accessible - backup failed';
                this.showNotification('Backup Complete', message, results.nasAccessible ? 'info' : 'error');
            }

            console.log('✓ Backup process completed');
            return results;

        } catch (err) {
            console.error('❌ Backup process error:', err);
            results.errors.push(err.message);

            if (showNotification) {
                this.showNotification('Backup Failed', err.message, 'error');
            }

            return results;
        }
    }

    /**
     * Create JSON backup
     * @param {string} timestamp
     * @param {boolean} saveToNAS
     * @param {string[]|null} customSections - Specific sections to backup, or null for all
     */
    async createJSONBackup(timestamp, saveToNAS, customSections = null) {
        const result = { success: false, local: null, nas: null, error: null };

        try {
            // Get all data sections if custom sections not provided
            const sections = customSections || ['users', 'assets', 'waybills', 'quick_checkouts', 'sites',
                'site_transactions', 'employees', 'vehicles', 'equipment_logs',
                'consumable_logs', 'activities', 'company_settings'];

            // Create JSON backup via database function
            const backupResult = await db.createJsonBackup(sections);

            if (!backupResult.success) {
                throw new Error(backupResult.error || 'JSON backup failed');
            }

            const filename = `backup-${timestamp}.json`;
            const jsonContent = JSON.stringify(backupResult.data, null, 2);

            // Save to local
            if (this.backupToLocal) {
                const localPath = path.join(this.localBackupDir, filename);
                fs.writeFileSync(localPath, jsonContent);
                result.local = localPath;
                console.log('  ✓ JSON saved locally:', localPath);
            }

            // Save to NAS if accessible
            if (saveToNAS && this.backupToNAS) {
                const nasPath = path.join(this.nasBackupPath, 'json', filename);
                fs.writeFileSync(nasPath, jsonContent);
                result.nas = nasPath;
                console.log('  ✓ JSON saved to NAS:', nasPath);
            }

            result.success = true;
            return result;

        } catch (err) {
            console.error('  ❌ JSON backup error:', err);
            result.error = err.message;
            return result;
        }
    }

    /**
     * Create Database backup
     */
    async createDatabaseBackup(timestamp, saveToNAS) {
        const result = { success: false, local: null, nas: null, error: null };

        try {
            const filename = `backup-${timestamp}.db`;

            // Save to local
            if (this.backupToLocal) {
                const localPath = path.join(this.localBackupDir, filename);
                const dbResult = await db.createDatabaseBackup(localPath);

                if (dbResult.success) {
                    result.local = localPath;
                    console.log('  ✓ Database saved locally:', localPath);
                    console.log(`    Size: ${(dbResult.size / 1024 / 1024).toFixed(2)} MB`);
                } else {
                    throw new Error(dbResult.error || 'Database backup failed');
                }
            }

            // Save to NAS if accessible
            if (saveToNAS && this.backupToNAS) {
                const nasPath = path.join(this.nasBackupPath, 'database', filename);
                const dbResult = await db.createDatabaseBackup(nasPath);

                if (dbResult.success) {
                    result.nas = nasPath;
                    console.log('  ✓ Database saved to NAS:', nasPath);
                    console.log(`    Size: ${(dbResult.size / 1024 / 1024).toFixed(2)} MB`);
                }
            }

            result.success = true;
            return result;

        } catch (err) {
            console.error('  ❌ Database backup error:', err);
            result.error = err.message;
            return result;
        }
    }

    /**
     * Show notification to user
     */
    showNotification(title, message, type = 'info') {
        try {
            const windows = BrowserWindow.getAllWindows();
            if (windows.length > 0) {
                windows[0].webContents.send('backup-notification', { title, message, type });
            }
        } catch (err) {
            console.warn('Could not show notification:', err.message);
        }
    }

    /**
     * Clean up old backups from both local and NAS
     */
    async cleanupOldBackups() {
        try {
            // Clean local backups
            await this.cleanupDirectory(this.localBackupDir, 'local');

            // Clean NAS backups if accessible
            const nasCheck = await this.checkNASAccessibility();
            if (nasCheck.accessible) {
                const jsonDir = path.join(this.nasBackupPath, 'json');
                const dbDir = path.join(this.nasBackupPath, 'database');

                await this.cleanupDirectory(jsonDir, 'NAS JSON');
                await this.cleanupDirectory(dbDir, 'NAS database');
            }
        } catch (err) {
            console.warn('Could not cleanup old backups:', err.message);
        }
    }

    /**
     * Clean up old backups in a specific directory
     */
    async cleanupDirectory(directory, label) {
        try {
            if (!fs.existsSync(directory)) return;

            const files = fs.readdirSync(directory)
                .filter(file => file.startsWith('backup-') || file.startsWith('auto-backup-'))
                .map(file => ({
                    name: file,
                    path: path.join(directory, file),
                    time: fs.statSync(path.join(directory, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Sort by newest first

            // Delete old backups if we have more than maxBackups
            if (files.length > this.maxBackups) {
                const filesToDelete = files.slice(this.maxBackups);
                console.log(`🗑️ Cleaning up ${filesToDelete.length} old ${label} backup(s)...`);

                for (const file of filesToDelete) {
                    try {
                        fs.unlinkSync(file.path);
                        console.log(`  Deleted: ${file.name}`);
                    } catch (err) {
                        console.warn(`  Could not delete ${file.name}:`, err.message);
                    }
                }
            }
        } catch (err) {
            console.warn(`Could not cleanup ${label} directory:`, err.message);
        }
    }

    /**
     * Save complete backup data provided from external source (Renderer/Supabase)
     * @param {Object} data - The full JSON backup data
     */
    async saveExternalBackup(data) {
        console.log('📦 Saving external backup data...');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const results = {
            json: { success: false, local: null, nas: null },
            database: { success: false, local: null, nas: null }, // Database backup not applicable for Supabase
            nasAccessible: false,
            errors: []
        };

        try {
            // Check NAS accessibility
            const nasCheck = await this.checkNASAccessibility();
            results.nasAccessible = nasCheck.accessible;

            if (results.nasAccessible) {
                await this.ensureNASDirectories();
            }

            // Save JSON Backup
            const filename = `backup-${timestamp}.json`;
            const jsonContent = JSON.stringify(data, null, 2);

            // Save to local
            if (this.backupToLocal) {
                const localPath = path.join(this.localBackupDir, filename);
                fs.writeFileSync(localPath, jsonContent);
                results.json.local = localPath;
                console.log('  ✓ JSON saved locally:', localPath);
            }

            // Save to NAS
            if (results.nasAccessible && this.backupToNAS) {
                const nasPath = path.join(this.nasBackupPath, 'json', filename);
                fs.writeFileSync(nasPath, jsonContent);
                results.json.nas = nasPath;
                console.log('  ✓ JSON saved to NAS:', nasPath);
            }

            results.json.success = true;

            // Log activity (best effort)
            // We can't use db.createActivity because we are in Supabase mode
            // logging is handled by Renderer

            this.showNotification('Backup Complete',
                results.nasAccessible ? 'Backup saved to NAS successfully' : 'Backup saved locally (NAS unavailable)',
                'info'
            );

            return results;

        } catch (err) {
            console.error('❌ External backup save error:', err);
            results.errors.push(err.message);
            this.showNotification('Backup Failed', err.message, 'error');
            return results;
        }
    }

    /**
     * Manually trigger a backup
     * @param {Object} options - Custom backup options
     */
    async triggerManualBackup(options = {}) {
        console.log('📦 Manual backup triggered', options);
        return await this.performBackup(false, true, options);
    }

    /**
     * Enable or disable automatic backups
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`Automatic backups ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update backup retention period
     */
    setRetentionDays(days) {
        this.maxBackups = days;
        console.log(`Backup retention set to ${days} days`);
    }

    /**
     * Set NAS backup path
     */
    setNASPath(nasPath) {
        this.nasBackupPath = nasPath;
        console.log(`NAS backup path set to: ${nasPath}`);
    }

    /**
     * Get backup status
     */
    async getStatus() {
        const localBackups = fs.existsSync(this.localBackupDir)
            ? fs.readdirSync(this.localBackupDir)
                .filter(file => file.startsWith('backup-') || file.startsWith('auto-backup-'))
                .length
            : 0;

        const nasCheck = await this.checkNASAccessibility();

        return {
            enabled: this.isEnabled,
            scheduledTime: '17:00 (5pm)',
            localBackupDirectory: this.localBackupDir,
            nasBackupPath: this.nasBackupPath,
            nasAccessible: nasCheck.accessible,
            totalLocalBackups: localBackups,
            maxBackups: this.maxBackups,
            nextRun: this.job ? this.job.nextInvocation() : null
        };
    }

    /**
     * List all backups
     */
    listBackups() {
        const backups = { local: [], nas: { json: [], database: [] } };

        // List local backups
        if (fs.existsSync(this.localBackupDir)) {
            backups.local = fs.readdirSync(this.localBackupDir)
                .filter(file => file.startsWith('backup-') || file.startsWith('auto-backup-'))
                .map(file => {
                    const filePath = path.join(this.localBackupDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.mtime,
                        age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
                    };
                })
                .sort((a, b) => b.created.getTime() - a.created.getTime());
        }

        // List NAS backups if accessible
        try {
            const jsonDir = path.join(this.nasBackupPath, 'json');
            const dbDir = path.join(this.nasBackupPath, 'database');

            if (fs.existsSync(jsonDir)) {
                backups.nas.json = fs.readdirSync(jsonDir)
                    .filter(file => file.startsWith('backup-'))
                    .map(file => {
                        const filePath = path.join(jsonDir, file);
                        const stats = fs.statSync(filePath);
                        return {
                            name: file,
                            path: filePath,
                            size: stats.size,
                            created: stats.mtime,
                            age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
                        };
                    })
                    .sort((a, b) => b.created.getTime() - a.created.getTime());
            }

            if (fs.existsSync(dbDir)) {
                backups.nas.database = fs.readdirSync(dbDir)
                    .filter(file => file.startsWith('backup-'))
                    .map(file => {
                        const filePath = path.join(dbDir, file);
                        const stats = fs.statSync(filePath);
                        return {
                            name: file,
                            path: filePath,
                            size: stats.size,
                            created: stats.mtime,
                            age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
                        };
                    })
                    .sort((a, b) => b.created.getTime() - a.created.getTime());
            }
        } catch (err) {
            console.warn('Could not list NAS backups:', err.message);
        }

        return backups;
    }

    /**
     * Read a backup file from specific path
     * @param {string} filePath - Absolute path to the backup file
     */
    async readBackupFile(filePath) {
        try {
            console.log('📖 Reading backup file:', filePath);

            // Security: Basic check to ensure it's a JSON file
            if (!filePath.toLowerCase().endsWith('.json')) {
                throw new Error('Invalid file type. Only .json files can be restored via this method.');
            }

            // Read file content
            const content = await fs.promises.readFile(filePath, 'utf8');
            return { success: true, data: JSON.parse(content) };
        } catch (err) {
            console.error('❌ Error reading backup file:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Stop the scheduler
     */
    stop() {
        if (this.job) {
            this.job.cancel();
            console.log('✓ Backup scheduler stopped');
        }
    }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();
