# Backup & Restore Status Report

## Recent Enhancements

### 1. NAS Database Restore (New)
**Feature:** Restoring `.db` files from the NAS list.
**Status:** **Verification Complete.**
*   Clicking the cloud icon on a `.db` file in the NAS list now correctly opens the dialog.
*   Confirmation prompt allows "Clean Replace" of the database.

### 2. "Reset All Data" Fix
**Status:** **Fixed.**
*   The "Reset All Data" button now **permanently deletes** records from the database.
*   Previously it only cleared the screen temporarily.
*   *Note: User accounts are preserved to prevents admin lockout.*

### 3. Collapsible Backup Lists
**Feature:** Organized NAS Backup Lists.
**Status:** **Implemented.**
*   NAS JSON and Database backup lists are now collapsible.
*   Lists are scrollable to handle large numbers of backups.
*   Added Chevron icons for better UX.

## User Instructions
*   **To Merge/Fix Data:** Use the JSON backup (NAS).
*   **To Revert to Exact State:** Use a `.db` file backup (from NAS list or local).
*   **To Start Over:** Use "Reset All Data" (Data Management tab).
*   **Restart App:** Recommended to ensure all new backend logic is active.
