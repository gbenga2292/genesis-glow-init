import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('C:/Users/USER/AppData/Roaming/Electron/genesis-glow.sqlite');

db.all("SELECT * FROM assets WHERE id = 1", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Assets:', JSON.stringify(rows, null, 2));
  }
  db.close();
});
