const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('C:/Users/USER/AppData/Roaming/Electron/genesis-glow.sqlite');

db.all("SELECT * FROM waybills ORDER BY id DESC LIMIT 5", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Waybills:', JSON.stringify(rows, null, 2));
  }
  db.close();
});
