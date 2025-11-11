import knex from 'knex';
import path from 'path';
import fs from 'fs';

async function migrateDatabase(dbPath) {
  console.log('Starting database migration...');

  const db = knex({
    client: 'better-sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
  });

  try {
    // Check if new columns exist, add them if they don't
    const hasLowStockLevel = await db.schema.hasColumn('assets', 'low_stock_level');
    if (!hasLowStockLevel) {
      console.log('Adding low_stock_level column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.integer('low_stock_level').defaultTo(10);
      });
    }

    const hasCriticalStockLevel = await db.schema.hasColumn('assets', 'critical_stock_level');
    if (!hasCriticalStockLevel) {
      console.log('Adding critical_stock_level column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.integer('critical_stock_level').defaultTo(5);
      });
    }

    const hasPowerSource = await db.schema.hasColumn('assets', 'power_source');
    if (!hasPowerSource) {
      console.log('Adding power_source column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.string('power_source');
      });
    }

    const hasFuelCapacity = await db.schema.hasColumn('assets', 'fuel_capacity');
    if (!hasFuelCapacity) {
      console.log('Adding fuel_capacity column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.decimal('fuel_capacity', 10, 2);
      });
    }

    const hasFuelConsumptionRate = await db.schema.hasColumn('assets', 'fuel_consumption_rate');
    if (!hasFuelConsumptionRate) {
      console.log('Adding fuel_consumption_rate column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.decimal('fuel_consumption_rate', 10, 2);
      });
    }

    const hasElectricityConsumption = await db.schema.hasColumn('assets', 'electricity_consumption');
    if (!hasElectricityConsumption) {
      console.log('Adding electricity_consumption column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.decimal('electricity_consumption', 10, 2);
      });
    }

    const hasRequiresLogging = await db.schema.hasColumn('assets', 'requires_logging');
    if (!hasRequiresLogging) {
      console.log('Adding requires_logging column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.boolean('requires_logging').defaultTo(false);
      });
    }

    const hasReservedQuantity = await db.schema.hasColumn('assets', 'reserved_quantity');
    if (!hasReservedQuantity) {
      console.log('Adding reserved_quantity column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.integer('reserved_quantity').defaultTo(0);
      });
    }

    const hasAvailableQuantity = await db.schema.hasColumn('assets', 'available_quantity');
    if (!hasAvailableQuantity) {
      console.log('Adding available_quantity column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.integer('available_quantity').defaultTo(0);
      });
    }

    const hasSiteQuantities = await db.schema.hasColumn('assets', 'site_quantities');
    if (!hasSiteQuantities) {
      console.log('Adding site_quantities column to assets table...');
      await db.schema.alterTable('assets', (table) => {
        table.text('site_quantities');
      });
    }

    // Sites table migrations
    const hasClientName = await db.schema.hasColumn('sites', 'client_name');
    if (!hasClientName) {
      console.log('Adding client_name column to sites table...');
      await db.schema.alterTable('sites', (table) => {
        table.string('client_name');
      });
    }

    const hasService = await db.schema.hasColumn('sites', 'service');
    if (!hasService) {
      console.log('Adding service column to sites table...');
      await db.schema.alterTable('sites', (table) => {
        table.text('service');
      });
    }

    // Employees table migrations
    const hasDelistedDate = await db.schema.hasColumn('employees', 'delisted_date');
    if (!hasDelistedDate) {
      console.log('Adding delisted_date column to employees table...');
      await db.schema.alterTable('employees', (table) => {
        table.date('delisted_date');
      });
    }

    // Check if equipment_logs table exists, create it if it doesn't
    const hasEquipmentLogsTable = await db.schema.hasTable('equipment_logs');
    if (!hasEquipmentLogsTable) {
      console.log('Creating equipment_logs table...');
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
      console.log('Created equipment_logs table.');
    }

    // Check if consumable_logs table exists, create it if it doesn't
    const hasConsumableLogsTable = await db.schema.hasTable('consumable_logs');
    if (!hasConsumableLogsTable) {
      console.log('Creating consumable_logs table...');
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
      console.log('Created consumable_logs table.');
    }

    // Vehicles table migrations - add missing timestamp columns
    const hasVehicleCreatedAt = await db.schema.hasColumn('vehicles', 'createdAt');
    if (!hasVehicleCreatedAt) {
      console.log('Adding createdAt column to vehicles table...');
      await db.schema.alterTable('vehicles', (table) => {
        table.timestamp('createdAt').defaultTo(db.fn.now());
      });
    }

    const hasVehicleUpdatedAt = await db.schema.hasColumn('vehicles', 'updatedAt');
    if (!hasVehicleUpdatedAt) {
      console.log('Adding updatedAt column to vehicles table...');
      await db.schema.alterTable('vehicles', (table) => {
        table.timestamp('updatedAt').defaultTo(db.fn.now());
      });
    }

    // Check if sent_to_site_date column exists in waybills table
    const hasSentToSiteDate = await db.schema.hasColumn('waybills', 'sent_to_site_date');
    if (!hasSentToSiteDate) {
      console.log('Adding sent_to_site_date column to waybills table...');
      await db.schema.alterTable('waybills', (table) => {
        table.dateTime('sent_to_site_date');
      });
    }

    // Activities table migrations - rename columns to match application code
    const hasActivityEntityId = await db.schema.hasColumn('activities', 'entityId');
    const hasActivityEntityIdOld = await db.schema.hasColumn('activities', 'entity_id');
    const hasActivityUserName = await db.schema.hasColumn('activities', 'userName');
    const hasActivityUserNameOld = await db.schema.hasColumn('activities', 'user_name');

    if (hasActivityEntityIdOld || hasActivityUserNameOld) {
      console.log('Recreating activities table with correct column names...');
      // SQLite doesn't support renaming columns directly, so we need to recreate the table
      const activitiesData = await db('activities').select('*');
      await db.schema.dropTable('activities');

      await db.schema.createTable('activities', (table) => {
        table.string('id').primary();
        table.dateTime('timestamp').notNullable();
        table.string('userName').notNullable().defaultTo('System');
        table.string('user_id');
        table.string('action').notNullable();
        table.string('entity').notNullable();
        table.string('entityId');
        table.text('details');
        table.timestamps(true, true);
      });

      // Re-insert the data with new column names
      if (activitiesData.length > 0) {
        const migratedData = activitiesData.map(row => ({
          id: row.id,
          timestamp: row.timestamp,
          userName: row.user_name || 'System',
          user_id: row.user_id,
          action: row.action,
          entity: row.entity,
          entityId: row.entity_id,
          details: row.details,
          created_at: row.created_at,
          updated_at: row.updated_at
        }));
        await db('activities').insert(migratedData);
      }
      console.log('Recreated activities table with correct column names.');
    } else if (!hasActivityEntityId) {
      // Table exists but is missing columns, add them
      console.log('Adding missing columns to activities table...');
      await db.schema.alterTable('activities', (table) => {
        table.string('userName').notNullable().defaultTo('System');
        table.string('entityId');
      });
    }

    // Recalculate all asset available quantities to fix any corruption
    console.log('Recalculating asset available quantities...');
    const assets = await db('assets').select('*');
    for (const asset of assets) {
      const reservedQty = asset.reserved_quantity || 0;
      const damagedCount = asset.damaged_count || 0;
      const missingCount = asset.missing_count || 0;
      // Available = quantity - reserved - damaged - missing (NOT subtracting site quantities)
      // Site quantities are already accounted for in reserved quantity
      const correctAvailable = asset.quantity - reservedQty - damagedCount - missingCount;
      
      if (asset.available_quantity !== correctAvailable) {
        console.log(`Fixing asset ${asset.id} (${asset.name}): available ${asset.available_quantity} -> ${correctAvailable}`);
        await db('assets')
          .where({ id: asset.id })
          .update({ available_quantity: correctAvailable });
      }
    }
    console.log('Asset quantities recalculated.');

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await db.destroy();
  }
}

// Export the function to be called from main.js
export { migrateDatabase };
