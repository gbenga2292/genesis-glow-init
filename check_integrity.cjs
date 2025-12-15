const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const checkFile = (filename) => {
    const dbPath = path.resolve(__dirname, filename);
    console.log(`Checking ${dbPath}...`);
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(`Error opening ${filename}:`, err);
            return;
        }
        db.get("PRAGMA integrity_check;", (err, row) => {
            if (err) {
                console.error(`Error checking integrity of ${filename}:`, err);
            } else {
                console.log(`Integrity check for ${filename}:`, row);
            }
            db.close();
        });
    });
};

checkFile('database.db');
checkFile('database-backup-2025-12-12T08-50-16.db');
