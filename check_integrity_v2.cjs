const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const files = [
    'C:/Users/USER/AppData/Roaming/Electron/genesis-glow.sqlite',
    'C:/Users/USER/AppData/Roaming/genesis-glow/genesis-glow.sqlite',
    '\\\\MYCLOUDEX2ULTRA\\Operations\\Inventory System\\genesis-glow.sqlite'
];

const checkFile = (filepath) => {
    if (!fs.existsSync(filepath)) {
        console.log(`File not found: ${filepath}`);
        return;
    }
    console.log(`Checking ${filepath}...`);
    const db = new sqlite3.Database(filepath, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error(`Error opening ${filepath}:`, err);
            return;
        }
        db.get("PRAGMA integrity_check;", (err, row) => {
            if (err) {
                console.error(`Error checking integrity of ${filepath}:`, err);
            } else {
                console.log(`Result for ${filepath}:`, row);
            }
            db.close();
        });
    });
};

files.forEach(f => checkFile(f));
