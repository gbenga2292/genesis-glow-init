const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('C:/Users/USER/AppData/Roaming/Electron/genesis-glow.sqlite');

console.log('=== CHECKING WATER SEAL CONSUMABLE ===\n');

// Check assets table for Water Seal
db.all("SELECT id, name, type, quantity, site_quantities, site_id FROM assets WHERE name LIKE '%Water%' OR type = 'consumable'", (err, rows) => {
  if (err) {
    console.error('Error fetching assets:', err);
  } else {
    console.log('Assets (Water Seal and all consumables):');
    rows.forEach(row => {
      console.log(`  ID: ${row.id}, Name: ${row.name}, Type: ${row.type}, Qty: ${row.quantity}`);
      console.log(`  Site ID: ${row.site_id}, Site Quantities: ${row.site_quantities}`);
      console.log('');
    });
  }

  // Check waybills for Water Seal
  db.all("SELECT id, site_id, status, issue_date FROM waybills ORDER BY id DESC LIMIT 10", (err, waybills) => {
    if (err) {
      console.error('Error fetching waybills:', err);
    } else {
      console.log('\n=== RECENT WAYBILLS ===');
      console.log(JSON.stringify(waybills, null, 2));
    }

    // Check waybill items
    db.all("SELECT wi.*, a.name as asset_name FROM waybill_items wi LEFT JOIN assets a ON wi.asset_id = a.id ORDER BY wi.id DESC LIMIT 10", (err, items) => {
      if (err) {
        console.error('Error fetching waybill items:', err);
      } else {
        console.log('\n=== RECENT WAYBILL ITEMS ===');
        console.log(JSON.stringify(items, null, 2));
      }

      // Check consumable logs
      db.all("SELECT * FROM consumable_logs", (err, logs) => {
        if (err) {
          console.error('Error fetching consumable logs:', err);
        } else {
          console.log('\n=== CONSUMABLE LOGS ===');
          console.log(JSON.stringify(logs, null, 2));
        }
        
        db.close();
      });
    });
  });
});
