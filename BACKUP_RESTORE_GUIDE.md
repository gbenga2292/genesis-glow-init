# Quick Start Guide - Backup & Restore

## 🎯 Choose Your Backup Type

### 📄 JSON Backup
**Best for:**
- Selective data backup
- Human-readable format
- Cross-platform compatibility
- Manual data inspection/editing

**Features:**
- ✅ Choose specific sections
- ✅ Smaller file size
- ✅ Easy to inspect
- ✅ Works everywhere

### 💾 Database Backup
**Best for:**
- Complete system backup
- Maximum data integrity
- Quick full restore
- Desktop app users

**Features:**
- ✅ Everything included
- ✅ Atomic operation
- ✅ Native SQLite format
- ✅ Fastest restore

---

## 📋 Step-by-Step Instructions

### Creating a JSON Backup

1. Open **Company Settings**
2. Go to **Data Management** tab
3. Click **"Backup Data"**
4. Select **"JSON Backup"** (left button)
5. Check the sections you want to backup:
   - ☑️ Users
   - ☑️ Assets
   - ☑️ Waybills
   - ☑️ Quick Checkouts
   - ☑️ Sites
   - ☑️ Site Transactions
   - ☑️ Employees
   - ☑️ Vehicles
   - ☑️ Equipment Logs
   - ☑️ Consumable Logs
   - ☑️ Activities
   - ☑️ Company Settings
6. Click **"Create Backup"**
7. File downloads as: `inventory-backup-YYYY-MM-DDTHH-MM-SS.json`

### Creating a Database Backup

1. Open **Company Settings**
2. Go to **Data Management** tab
3. Click **"Backup Data"**
4. Select **"Database Backup"** (right button)
5. Click **"Create Backup"**
6. File saves as: `database-backup-YYYY-MM-DDTHH-MM-SS.db`

**Note:** Database backup is only available in the desktop app.

### Restoring from JSON Backup

1. Open **Company Settings**
2. Go to **Data Management** tab
3. Click **"Restore Data"**
4. Click **"Choose File"** and select your `.json` backup
5. Review available sections (auto-detected)
6. Check the sections you want to restore
7. Click **"Start Restore"**
8. Monitor progress bar
9. Review any errors in the error list
10. Click **"Close"** when complete

**⚠️ Important:** Restored users will have password: `ChangeMe123!`

### Restoring from Database Backup

1. Open **Company Settings**
2. Go to **Data Management** tab
3. Click **"Restore Data"**
4. Select your `.db` backup file
5. Click **"Start Restore"**
6. Wait for completion
7. App will restart automatically

---

## 🔍 Understanding the Backup Files

### JSON Backup Structure
```json
{
  "metadata": {
    "version": "1.0",
    "timestamp": "2025-12-12T08:50:52.000Z",
    "appVersion": "1.0.0",
    "sections": ["users", "assets", "waybills"],
    "checksum": "abc123def456..."
  },
  "data": {
    "users": [
      {
        "id": "1",
        "name": "John Doe",
        "username": "john",
        "role": "admin"
      }
    ],
    "assets": [...],
    "waybills": [...]
  }
}
```

### Database Backup
- Binary SQLite database file
- Contains all tables and indexes
- Cannot be edited manually
- Requires SQLite-compatible tools to inspect

---

## ⚠️ Important Warnings

### Before Restoring
1. **Create a backup** of your current data first
2. **Close other apps** that might be using the database
3. **Review the backup file** to ensure it's the correct one
4. **Understand** that restore will modify your current data

### User Passwords
- ❌ Passwords are NOT backed up (security)
- ✅ Restored users get default password: `ChangeMe123!`
- ⚠️ Users must change password on first login
- 👤 Admin user is skipped to prevent conflicts

### Data Conflicts
- **Existing records** are updated
- **New records** are inserted
- **Deleted records** are NOT restored (they stay deleted)
- **IDs are preserved** from backup

---

## 🐛 Troubleshooting

### "Backup Failed"
**Possible causes:**
- Insufficient disk space
- File permissions issue
- Database connection lost

**Solution:**
- Check available disk space
- Ensure you have write permissions
- Try again

### "Checksum Mismatch"
**Cause:** Backup file is corrupted or modified

**Solution:**
- Use a different backup file
- Re-create the backup
- Do not manually edit backup files

### "Database Backup Not Available"
**Cause:** Running in web browser, not desktop app

**Solution:**
- Use JSON backup instead
- Or switch to desktop app

### "Restore Completed with Errors"
**Cause:** Some records couldn't be restored

**Solution:**
- Review error list in the dialog
- Check for ID conflicts
- Manually fix problematic records
- Try restoring again with different sections

---

## 💡 Best Practices

### Backup Frequency
- **Daily:** For active production use
- **Weekly:** For moderate use
- **Before major changes:** Always!
- **Before updates:** Recommended

### Backup Storage
- **Keep multiple backups** (at least 3)
- **Store off-site** (cloud, external drive)
- **Test restores** periodically
- **Label backups** with date and purpose

### Backup Strategy
1. **Full backup** weekly (Database backup)
2. **Incremental backup** daily (JSON backup of changed sections)
3. **Keep 30 days** of backups
4. **Archive monthly** backups for 1 year

---

## 📞 Need Help?

### Common Questions

**Q: Can I edit the JSON backup file?**
A: Yes, but be careful! The checksum will fail if you modify the data. You'll need to recalculate it.

**Q: How do I restore only specific sections?**
A: Use JSON backup and uncheck the sections you don't want to restore.

**Q: Can I restore to a different computer?**
A: Yes! JSON backups are portable. Database backups work too if both computers use the same app version.

**Q: What if I lose my backup file?**
A: Unfortunately, there's no way to recover data without a backup. That's why we recommend multiple backups in different locations!

**Q: Can I schedule automatic backups?**
A: Not yet, but it's on our roadmap! For now, create manual backups regularly.

---

## ✅ Checklist

### Before Creating Backup
- [ ] Ensure all data is saved
- [ ] Close any open dialogs
- [ ] Choose backup type (JSON or Database)
- [ ] Select sections (for JSON)

### After Creating Backup
- [ ] Verify file was downloaded
- [ ] Check file size (should not be 0 bytes)
- [ ] Store in safe location
- [ ] Test restore (optional but recommended)

### Before Restoring
- [ ] Create current backup first
- [ ] Close other apps
- [ ] Choose correct backup file
- [ ] Review sections to restore

### After Restoring
- [ ] Verify data is correct
- [ ] Reset user passwords if needed
- [ ] Test critical functionality
- [ ] Create new backup

---

**Last Updated**: December 12, 2025  
**Version**: 1.0
