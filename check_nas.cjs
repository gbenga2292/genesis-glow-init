const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const filepath = '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System\\genesis-glow.sqlite';

if (!fs.existsSync(filepath)) {
    console.log(`NAS File not found: ${filepath}`);
} else {
    console.log(`Checking NAS ${filepath}...`);
    const db = new sqlite3.Database(filepath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(`Error opening NAS DB:`, err);
            return;
        }
        db.all("PRAGMA integrity_check;", (err, rows) => {
            if (err) {
                console.error(`Error checking integrity of NAS DB:`, err);
            } else {
                console.log(`Result for NAS DB:`, JSON.stringify(rows, null, 2));
            }
            db.close();
        });
    });
}
