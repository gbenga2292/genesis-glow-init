
import knex from 'knex';
import bcrypt from 'bcrypt';
import path from 'path';

async function initializeDatabase(dbPath) {
  // Initialize Knex for SQLite with the provided path
  const db = knex({
    client: 'better-sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
  });
  try {
    // --- Drop existing tables for a clean slate (optional, for development) ---
    await db.schema.dropTableIfExists('activities');
    await db.schema.dropTableIfExists('site_transactions');
    await db.schema.dropTableIfExists('consumable_logs');
    await db.schema.dropTableIfExists('return_items');
    await db.schema.dropTableIfExists('return_bills');
    await db.schema.dropTableIfExists('quick_checkouts');
    await db.schema.dropTableIfExists('waybill_items');
    await db.schema.dropTableIfExists('waybills');
    await db.schema.dropTableIfExists('equipment_logs');
    await db.schema.dropTableIfExists('assets');
    await db.schema.dropTableIfExists('vehicles');
    await db.schema.dropTableIfExists('employees');
    await db.schema.dropTableIfExists('sites');
    await db.schema.dropTableIfExists('company_settings');
    await db.schema.dropTableIfExists('users');

    console.log('Cleared existing tables.');

    // --- Create Tables ---

    // Users Table
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('role').notNullable();
      table.string('name').notNullable();
      table.string('email');
      table.timestamps(true, true);
    });
    console.log('Created "users" table.');

    // Sites Table
    await db.schema.createTable('sites', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('location').notNullable();
      table.text('description');
      table.string('client_name');
      table.string('contact_person');
      table.string('phone');
      table.text('service'); // JSON array string for services
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('Created "sites" table.');

    // Employees Table
    await db.schema.createTable('employees', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('role').notNullable();
      table.string('phone');
      table.string('email');
      table.string('status').defaultTo('active');
      table.date('delisted_date');
      table.timestamps(true, true);
    });
    console.log('Created "employees" table.');

    // Vehicles Table
    await db.schema.createTable('vehicles', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type');
      table.string('registration_number');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });
    console.log('Created "vehicles" table.');

    // Assets Table
    await db.schema.createTable('assets', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description');
      table.integer('quantity').notNullable().defaultTo(0);
      table.string('unit_of_measurement').notNullable();
      table.string('category');
      table.string('type');
      table.string('location');
      table.integer('site_id').unsigned().references('id').inTable('sites');
      table.string('service');
      table.string('status').defaultTo('active');
      table.string('condition').defaultTo('good');
      table.integer('missing_count').defaultTo(0);
      table.integer('damaged_count').defaultTo(0);
      table.integer('low_stock_level').defaultTo(10);
      table.integer('critical_stock_level').defaultTo(5);
      table.string('power_source');
      table.decimal('fuel_capacity', 10, 2);
      table.decimal('fuel_consumption_rate', 10, 2);
      table.decimal('electricity_consumption', 10, 2);
      table.boolean('requires_logging').defaultTo(false);
      table.integer('reserved_quantity').defaultTo(0);
      table.integer('available_quantity').defaultTo(0);
      table.text('site_quantities'); // JSON string for site quantity mappings
      table.date('purchase_date');
      table.decimal('cost', 10, 2);
      table.timestamps(true, true);
    });
    console.log('Created "assets" table.');

    // Waybills Table
    await db.schema.createTable('waybills', (table) => {
      table.string('id').primary();
      table.integer('siteId').unsigned().references('id').inTable('sites');
      table.integer('returnToSiteId').unsigned().references('id').inTable('sites');
      table.string('driverName');
      table.string('vehicle');
      table.dateTime('issueDate').notNullable();
      table.dateTime('expectedReturnDate');
      table.text('purpose').notNullable();
      table.string('service').notNullable();
      table.string('status').defaultTo('outstanding');
      table.string('type').defaultTo('waybill');
      table.json('items');
      table.string('createdBy');
      table.dateTime('createdAt');
      table.dateTime('updatedAt');
      table.dateTime('sent_to_site_date'); // Add the missing column
    });
    console.log('Created "waybills" table.');

    // The 'waybill_items' table is no longer needed as items are now stored as a JSON object in the 'waybills' table.

    // Quick Checkouts Table
    await db.schema.createTable('quick_checkouts', (table) => {
      table.increments('id').primary();
      table.integer('asset_id').unsigned().notNullable().references('id').inTable('assets');
      table.integer('employee_id').unsigned().references('id').inTable('employees');
      table.integer('quantity').notNullable();
      table.dateTime('checkout_date').notNullable();
      table.integer('expected_return_days').notNullable();
      table.string('status').defaultTo('outstanding');
      table.timestamps(true, true);
    });
    console.log('Created "quick_checkouts" table.');

    // Equipment Logs Table
    await db.schema.createTable('equipment_logs', (table) => {
      table.increments('id').primary();
      table.integer('equipment_id').unsigned().notNullable().references('id').inTable('assets');
      table.string('equipment_name').notNullable();
      table.integer('site_id').unsigned().notNullable().references('id').inTable('sites');
      table.date('date').notNullable();
      table.boolean('active').defaultTo(true);
      table.json('downtime_entries').defaultTo('[]');
      table.text('maintenance_details');
      table.decimal('diesel_entered', 10, 2);
      table.string('supervisor_on_site');
      table.text('client_feedback');
      table.text('issues_on_site');
      table.timestamps(true, true);
    });
    console.log('Created "equipment_logs" table.');

    // Consumable Logs Table
    await db.schema.createTable('consumable_logs', (table) => {
      table.string('id').primary();
      table.string('consumable_id').notNullable();
      table.string('consumable_name').notNullable();
      table.integer('site_id').unsigned().notNullable().references('id').inTable('sites');
      table.date('date').notNullable();
      table.decimal('quantity_used', 10, 2).notNullable();
      table.decimal('quantity_remaining', 10, 2).notNullable();
      table.string('unit').notNullable();
      table.string('used_for').notNullable();
      table.string('used_by').notNullable();
      table.text('notes');
      table.timestamps(true, true);
    });
    console.log('Created "consumable_logs" table.');

    // Return Bills Table
    await db.schema.createTable('return_bills', (table) => {
      table.increments('id').primary();
      table.integer('waybill_id').unsigned().notNullable().references('id').inTable('waybills');
      table.dateTime('return_date').notNullable();
      table.string('received_by').notNullable();
      table.string('condition').defaultTo('good');
      table.text('notes');
      table.string('status').defaultTo('initiated');
      table.timestamps(true, true);
    });
    console.log('Created "return_bills" table.');

    // Return Items Table
    await db.schema.createTable('return_items', (table) => {
      table.increments('id').primary();
      table.integer('return_bill_id').unsigned().notNullable().references('id').inTable('return_bills');
      table.integer('asset_id').unsigned().notNullable().references('id').inTable('assets');
      table.integer('quantity').notNullable();
      table.string('condition').defaultTo('good');
      table.timestamps(true, true);
    });
    console.log('Created "return_items" table.');

    // Company Settings Table
    await db.schema.createTable('company_settings', (table) => {
      table.increments('id').primary();
      table.string('company_name').notNullable();
      table.text('logo');
      table.string('address').notNullable();
      table.string('phone').notNullable();
      table.string('email').notNullable();
      table.string('website');
      table.string('currency').defaultTo('USD');
      table.string('date_format').defaultTo('MM/dd/yyyy');
      table.string('theme').defaultTo('system');
      table.boolean('notifications_email').defaultTo(true);
      table.boolean('notifications_push').defaultTo(true);
      table.timestamps(true, true);
    });
    console.log('Created "company_settings" table.');

    // Site Transactions Table
    await db.schema.createTable('site_transactions', (table) => {
      table.string('id').primary(); // UUID for unique identification
      table.integer('site_id').unsigned().notNullable().references('id').inTable('sites');
      table.integer('asset_id').unsigned().notNullable().references('id').inTable('assets');
      table.string('asset_name').notNullable();
      table.string('transaction_type').notNullable(); // 'waybill', 'return', 'adjust'
      table.integer('quantity').notNullable();
      table.string('type').notNullable(); // 'in' or 'out'
      table.string('reference_id').notNullable(); // Waybill ID or other reference
      table.string('reference_type').notNullable(); // 'waybill', 'return_waybill', etc.
      table.string('condition'); // 'good', 'damaged', 'missing'
      table.text('notes');
      table.string('created_by');
      table.dateTime('created_at').notNullable();
    });
    console.log('Created "site_transactions" table.');

    // Activities Table (for activity logging)
    await db.schema.createTable('activities', (table) => {
      table.string('id').primary(); // UUID
      table.dateTime('timestamp').notNullable();
      table.string('user_name').notNullable();
      table.string('user_id');
      table.string('action').notNullable();
      table.string('entity').notNullable();
      table.string('entity_id');
      table.text('details');
      table.timestamps(true, true);
    });
    console.log('Created "activities" table.');


    // --- Seed Data ---

    // Seed default admin user
    const saltRounds = 10;
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await db('users').insert({
      username: 'admin',
      password_hash: hashedPassword,
      role: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
    });
    console.log('Seeded default admin user.');

    // Seed default company settings
    await db('company_settings').insert({
      company_name: 'Genesis Glow',
      address: '123 Glow Street, Suite 100',
      phone: '555-123-4567',
      email: 'contact@genesisglow.com',
    });
    console.log('Seeded default company settings.');

    console.log('Database initialization successful!');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    await db.destroy();
  }
}

// Export the function to be called from main.js
export { initializeDatabase };
