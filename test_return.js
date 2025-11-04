
const knex = require('knex');
const { createReturnWaybill } = require('./electron/database.js');

async function runTest() {
  const db = knex({
    client: 'better-sqlite3',
    connection: {
      filename: './database.db',
    },
    useNullAsDefault: true,
  });

  try {
    // 1. Create a test asset
    const [assetId] = await db('assets').insert({
      name: 'Test Asset',
      quantity: 100,
      reserved_quantity: 10,
    });

    // 2. Create a return waybill
    const returnWaybillData = {
      siteId: 'test-site',
      items: [
        {
          assetId: assetId,
          assetName: 'Test Asset',
          quantity: 5,
        },
      ],
    };

    await createReturnWaybill(returnWaybillData);

    // 3. Check the reserved quantity
    const asset = await db('assets').where({ id: assetId }).first();
    console.log('Asset after return:', asset);

    if (asset.reserved_quantity === 5) {
      console.log('Test passed!');
    } else {
      console.log('Test failed!');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Clean up the test data
    await db('assets').where({ name: 'Test Asset' }).del();
    await db.destroy();
  }
}

runTest();
