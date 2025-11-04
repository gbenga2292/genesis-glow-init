import { createWaybillTransaction, sendToSiteTransaction } from './electron/transactionOperations.js';
import { transformAssetFromDB } from './electron/dataTransform.js';
import knex from 'knex';

// Create test database connection
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: ':memory:', // Use in-memory database for testing
  },
  useNullAsDefault: true,
});

async function initializeTestDatabase(db) {
  try {
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

    // Vehicles Table
    await db.schema.createTable('vehicles', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type');
      table.string('registration_number');
      table.string('status').defaultTo('active');
      table.timestamps(true, true);
    });

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
      table.integer('reserved_quantity').defaultTo(0);
      table.integer('available_quantity').defaultTo(0);
      table.text('site_quantities'); // JSON string for site quantity mappings
      table.date('purchase_date');
      table.decimal('cost', 10, 2);
      table.timestamps(true, true);
    });

    // Waybills Table
    await db.schema.createTable('waybills', (table) => {
      table.string('id').primary();
      table.integer('siteId').unsigned().references('id').inTable('sites');
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
      table.dateTime('sent_to_site_date');
      table.text('notes');
    });

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

    // Return Items Table
    await db.schema.createTable('return_items', (table) => {
      table.increments('id').primary();
      table.integer('return_bill_id').unsigned().notNullable().references('id').inTable('return_bills');
      table.integer('asset_id').unsigned().notNullable().references('id').inTable('assets');
      table.integer('quantity').notNullable();
      table.string('condition').defaultTo('good');
      table.timestamps(true, true);
    });

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

    console.log('Test database initialized successfully.');
  } catch (error) {
    console.error('Error initializing test database:', error);
    throw error;
  }
}

async function setupTestData() {
  console.log('Setting up test data...');

  // Create test site
  const [site] = await db('sites').insert({
    name: 'Test Site',
    location: 'Test Location',
    description: 'Test site for transaction testing',
    client_name: 'Test Client',
    contact_person: 'Test Contact',
    phone: '123-456-7890',
    service: JSON.stringify(['test_service']),
    status: 'active'
  }).returning('*');

  // Create test asset
  const [asset] = await db('assets').insert({
    name: 'Test Asset',
    description: 'Test asset for transaction testing',
    quantity: 100,
    unit_of_measurement: 'pieces',
    category: 'test',
    type: 'test_type',
    location: 'warehouse',
    site_id: null,
    service: 'test_service',
    status: 'available',
    condition: 'good',
    missing_count: 0,
    damaged_count: 0,
    low_stock_level: 10,
    critical_stock_level: 5,
    purchase_date: null,
    cost: 100.00,
    power_source: 'electric',
    fuel_capacity: null,
    fuel_consumption_rate: null,
    electricity_consumption: null,
    reserved_quantity: 0,
    available_quantity: 100,
    site_quantities: JSON.stringify({})
  }).returning('*');

  console.log('Test data created:', { site, asset });
  return { site, asset };
}

async function cleanupTestData(siteId, assetId) {
  console.log('Cleaning up test data...');

  // Delete test waybills and related data
  await db('site_transactions').where('site_id', siteId).del();
  await db('waybills').where('siteId', siteId).del();

  // Delete test asset and site
  await db('assets').where('id', assetId).del();
  await db('sites').where('id', siteId).del();

  console.log('Test data cleaned up');
}

async function testWaybillCreationSentToSite() {
  console.log('\n=== Testing Waybill Creation with sent_to_site status ===');

  const { site, asset } = await setupTestData();

  try {
    // Test 1: Create waybill with sent_to_site status
    const waybillData = {
      id: 'test_waybill_sent_to_site',
      siteId: site.id,
      status: 'sent_to_site',
      items: [{
        assetId: asset.id,
        assetName: asset.name,
        quantity: 10
      }],
      createdBy: 'test_user',
      notes: 'Test waybill sent to site',
      issueDate: new Date().toISOString(),
      purpose: 'Test purpose',
      service: 'test_service'
    };

    const result = await createWaybillTransaction(db, waybillData);
    console.log('Waybill creation result:', result);

    if (!result.success) {
      throw new Error(`Waybill creation failed: ${result.error}`);
    }

    // Verify asset quantities
    const updatedAsset = await db('assets').where('id', asset.id).first();
    const transformedAsset = transformAssetFromDB(updatedAsset);

    console.log('Asset after waybill creation:', {
      reservedQuantity: transformedAsset.reservedQuantity,
      availableQuantity: transformedAsset.availableQuantity,
      siteQuantities: transformedAsset.siteQuantities
    });

    // Assertions
    if (transformedAsset.reservedQuantity !== 0) {
      throw new Error(`Expected reserved quantity to be 0, got ${transformedAsset.reservedQuantity}`);
    }

    if (transformedAsset.siteQuantities[site.id] !== 10) {
      throw new Error(`Expected site quantity to be 10, got ${transformedAsset.siteQuantities[site.id]}`);
    }

    if (transformedAsset.availableQuantity !== 90) {
      throw new Error(`Expected available quantity to be 90, got ${transformedAsset.availableQuantity}`);
    }

    // Verify site transactions were created
    const siteTransactions = await db('site_transactions').where('site_id', site.id);
    if (siteTransactions.length !== 1) {
      throw new Error(`Expected 1 site transaction, got ${siteTransactions.length}`);
    }

    console.log('✓ Waybill creation with sent_to_site status passed');

    await cleanupTestData(site.id, asset.id);
    return true;

  } catch (error) {
    console.error('✗ Waybill creation with sent_to_site status failed:', error.message);
    await cleanupTestData(site.id, asset.id);
    return false;
  }
}

async function testWaybillCreationOutstanding() {
  console.log('\n=== Testing Waybill Creation with outstanding status ===');

  const { site, asset } = await setupTestData();

  try {
    // Test 2: Create waybill with outstanding status
    const waybillData = {
      id: 'test_waybill_outstanding',
      siteId: site.id,
      status: 'outstanding',
      items: [{
        assetId: asset.id,
        assetName: asset.name,
        quantity: 15
      }],
      createdBy: 'test_user',
      notes: 'Test waybill outstanding',
      issueDate: new Date().toISOString(),
      purpose: 'Test purpose',
      service: 'test_service'
    };

    const result = await createWaybillTransaction(db, waybillData);
    console.log('Waybill creation result:', result);

    if (!result.success) {
      throw new Error(`Waybill creation failed: ${result.error}`);
    }

    // Verify asset quantities
    const updatedAsset = await db('assets').where('id', asset.id).first();
    const transformedAsset = transformAssetFromDB(updatedAsset);

    console.log('Asset after waybill creation:', {
      reservedQuantity: transformedAsset.reservedQuantity,
      availableQuantity: transformedAsset.availableQuantity,
      siteQuantities: transformedAsset.siteQuantities
    });

    // Assertions
    if (transformedAsset.reservedQuantity !== 15) {
      throw new Error(`Expected reserved quantity to be 15, got ${transformedAsset.reservedQuantity}`);
    }

    if (transformedAsset.availableQuantity !== 85) {
      throw new Error(`Expected available quantity to be 85, got ${transformedAsset.availableQuantity}`);
    }

    // Site quantities should remain empty for outstanding waybills
    if (Object.keys(transformedAsset.siteQuantities).length !== 0) {
      throw new Error(`Expected no site quantities for outstanding waybill, got ${JSON.stringify(transformedAsset.siteQuantities)}`);
    }

    console.log('✓ Waybill creation with outstanding status passed');

    await cleanupTestData(site.id, asset.id);
    return true;

  } catch (error) {
    console.error('✗ Waybill creation with outstanding status failed:', error.message);
    await cleanupTestData(site.id, asset.id);
    return false;
  }
}

async function testSendToSiteTransaction() {
  console.log('\n=== Testing Send to Site Transaction ===');

  const { site, asset } = await setupTestData();

  try {
    // First create an outstanding waybill
    const waybillData = {
      id: 'test_waybill_for_send_to_site',
      siteId: site.id,
      status: 'outstanding',
      items: [{
        assetId: asset.id,
        assetName: asset.name,
        quantity: 20
      }],
      createdBy: 'test_user',
      notes: 'Test waybill for send to site',
      issueDate: new Date().toISOString(),
      purpose: 'Test purpose',
      service: 'test_service'
    };

    const createResult = await createWaybillTransaction(db, waybillData);
    if (!createResult.success) {
      throw new Error(`Waybill creation failed: ${createResult.error}`);
    }

    // Now send it to site
    const sendResult = await sendToSiteTransaction(db, createResult.waybillId);
    console.log('Send to site result:', sendResult);

    if (!sendResult.success) {
      throw new Error(`Send to site failed: ${sendResult.error}`);
    }

    // Verify asset quantities after send to site
    const updatedAsset = await db('assets').where('id', asset.id).first();
    const transformedAsset = transformAssetFromDB(updatedAsset);

    console.log('Asset after send to site:', {
      reservedQuantity: transformedAsset.reservedQuantity,
      availableQuantity: transformedAsset.availableQuantity,
      siteQuantities: transformedAsset.siteQuantities
    });

    // Assertions
    if (transformedAsset.reservedQuantity !== 20) {
      throw new Error(`Expected reserved quantity to remain 20 after send to site, got ${transformedAsset.reservedQuantity}`);
    }

    if (transformedAsset.siteQuantities[site.id] !== 20) {
      throw new Error(`Expected site quantity to be 20, got ${transformedAsset.siteQuantities[site.id]}`);
    }

    if (transformedAsset.availableQuantity !== 60) {
      throw new Error(`Expected available quantity to be 60, got ${transformedAsset.availableQuantity}`);
    }

    // Verify site transactions were created
    const siteTransactions = await db('site_transactions').where('site_id', site.id);
    if (siteTransactions.length !== 1) {
      throw new Error(`Expected 1 site transaction, got ${siteTransactions.length}`);
    }

    console.log('✓ Send to site transaction passed');

    await cleanupTestData(site.id, asset.id);
    return true;

  } catch (error) {
    console.error('✗ Send to site transaction failed:', error.message);
    await cleanupTestData(site.id, asset.id);
    return false;
  }
}

async function runTests() {
  console.log('Starting comprehensive transaction tests...\n');

  // Initialize the test database
  await initializeTestDatabase(db);

  let passed = 0;
  let total = 3;

  // Test 1: Waybill creation with sent_to_site status
  if (await testWaybillCreationSentToSite()) passed++;

  // Test 2: Waybill creation with outstanding status
  if (await testWaybillCreationOutstanding()) passed++;

  // Test 3: Send to site transaction
  if (await testSendToSiteTransaction()) passed++;

  console.log(`\n=== Test Results: ${passed}/${total} tests passed ===`);

  if (passed === total) {
    console.log('🎉 All tests passed! The transaction operations are working correctly.');
  } else {
    console.log('❌ Some tests failed. Please review the errors above.');
  }

  // Close database connection
  await db.destroy();
  process.exit(passed === total ? 0 : 1);
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  db.destroy();
  process.exit(1);
});
