# Database Configuration Guide

This guide explains how to configure where your Genesis Glow database is stored and how the database system works.

## Quick Start

### Option 1: Network/NAS Storage (Multi-User)
For teams sharing a database across multiple computers:

1. Open `electron/config.js`
2. Set `storageType: 'network'`
3. Update `networkPath` to your network location:
   ```javascript
   networkPath: '\\\\YOUR_SERVER\\Shared\\GenesisGlow\\Database'
   ```
4. Keep `enableLocking: true` to prevent conflicts

### Option 2: Local Storage (Single User)
For personal use on one computer:

1. Open `electron/config.js`
2. Set `storageType: 'local'`
3. Uncomment and set `localPath`:
   ```javascript
   localPath: 'C:\\Users\\YourName\\Documents\\GenesisGlow\\Database'
   ```
4. Optionally set `enableLocking: false`

### Option 3: App Data (Default, Recommended for Testing)
Use the system's default application data folder:

1. Open `electron/config.js`
2. Set `storageType: 'appdata'`
3. No path configuration needed!

## How It Works

### Auto-Creation
- When you start the app, it checks if the database exists
- If not found, it automatically creates a new database with all tables
- Seeds initial data (admin user, default settings)

### Database Location
The database file (`genesis-glow.sqlite`) will be stored at:
- **Network**: Your specified network path
- **Local**: Your specified local path
- **AppData**: Automatically determined by the OS
  - Windows: `C:\Users\YourName\AppData\Roaming\genesis-glow-electron\`
  - macOS: `~/Library/Application Support/genesis-glow-electron/`
  - Linux: `~/.config/genesis-glow-electron/`

### Locking System
Prevents multiple users from corrupting the database:
- Creates a lock file when opening the database
- Blocks other users until you close the app
- Automatically removes stale locks from crashed sessions
- Can be disabled for single-user setups

### How Data is Managed
1. **On Startup**:
   - Creates database directory if needed
   - Creates database file if it doesn't exist
   - Creates a backup copy (optional)
   - Acquires lock (if enabled)
   - Copies database to local machine for better performance
   - Runs migrations for schema updates

2. **During Use**:
   - All operations happen on the local copy
   - Full CRUD operations available:
     - ✓ Create (Add new records)
     - ✓ Read (View records)
     - ✓ Update (Edit records)
     - ✓ Delete (Remove records)

3. **On Shutdown**:
   - Saves local copy back to master location
   - Releases lock
   - Creates backup before next session

## Full CRUD Operations

The app supports complete database operations for all entities:

### Assets
- `createAsset()` - Add new assets
- `getAssets()` - View all assets
- `updateAsset()` - Edit asset details
- `deleteAsset()` - Remove assets

### Waybills
- `createWaybill()` - Create new waybills
- `getWaybills()` - View all waybills
- `updateWaybill()` - Edit waybill details
- `deleteWaybill()` - Remove waybills

### Sites
- `createSite()` - Add new sites
- `getSites()` - View all sites
- `updateSite()` - Edit site details
- `deleteSite()` - Remove sites

### Employees
- `createEmployee()` - Add new employees
- `getEmployees()` - View all employees
- `updateEmployee()` - Edit employee details
- `deleteEmployee()` - Remove employees

### And more...
- Quick Checkouts
- Return Bills
- Equipment Logs
- Vehicles
- Company Settings
- Users (with authentication)

## Configuration Options

```javascript
{
  // Storage location type
  storageType: 'network' | 'local' | 'appdata',
  
  // Network path (UNC path or mapped drive)
  networkPath: '\\\\SERVER\\Share\\Folder',
  
  // Local custom path
  localPath: 'C:\\Path\\To\\Database',
  
  // Database filename (don't change)
  databaseFilename: 'genesis-glow.sqlite',
  
  // Lock file for concurrency control
  lockFilename: 'db.lock',
  
  // Enable locking (disable for single user)
  enableLocking: true,
  
  // Auto-create database if missing
  autoCreateDatabase: true,
  
  // Create backup on startup
  autoBackup: true
}
```

## Troubleshooting

### Database Not Found Error
- Check that the path exists and is accessible
- Ensure `autoCreateDatabase: true` in config
- Verify you have write permissions to the folder

### Database Locked Error
- Another user is currently using the database
- Or a previous session crashed without releasing the lock
- Delete `db.lock` file manually if it's a stale lock

### Failed to Sync Error
- Network connection was lost during shutdown
- Local copy is safe at: `AppData/genesis-glow-electron/`
- Copy it manually to the master location

### Permission Errors
- Run the app as administrator (Windows)
- Check folder permissions
- Ensure network shares are accessible

## Security Notes

- **Backups**: Always kept before opening database
- **Lock Files**: Prevent simultaneous edits
- **Local Copies**: Protect against network failures
- **Permissions**: Database inherits folder permissions

## Advanced: Database Schema

The database includes these tables:
- `users` - User accounts with authentication
- `assets` - Inventory items
- `sites` - Project sites
- `employees` - Staff members
- `vehicles` - Vehicle fleet
- `waybills` - Material waybills
- `waybill_items` - Waybill line items
- `quick_checkouts` - Quick checkout records
- `return_bills` - Return documents
- `return_items` - Returned items
- `equipment_logs` - Equipment usage logs
- `company_settings` - Application settings

All tables support full CRUD operations through the IPC handlers.

## Need Help?

- Check console logs for detailed error messages
- Verify paths are correct and accessible
- Test with `storageType: 'appdata'` first
- Ensure you have proper file system permissions
