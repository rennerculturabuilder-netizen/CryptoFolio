#!/usr/bin/env node

/**
 * Migration: Create DcaEntryPoint table
 * Adds entry points for DCA zones with pre-order and purchase tracking
 */

const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected');

    console.log('\n📝 Creating DcaEntryPoint table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS "DcaEntryPoint" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "targetPrice" DECIMAL(18, 8) NOT NULL,
        "value" DECIMAL(18, 8) NOT NULL,
        "preOrderPlaced" BOOLEAN NOT NULL DEFAULT false,
        "purchaseConfirmed" BOOLEAN NOT NULL DEFAULT false,
        "confirmedAt" TIMESTAMP(3),
        "zoneOrder" INTEGER NOT NULL,
        "dcaZoneId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Table DcaEntryPoint created');

    console.log('\n📝 Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS "DcaEntryPoint_dcaZoneId_idx" 
      ON "DcaEntryPoint"("dcaZoneId");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "DcaEntryPoint_preOrderPlaced_idx" 
      ON "DcaEntryPoint"("preOrderPlaced");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "DcaEntryPoint_purchaseConfirmed_idx" 
      ON "DcaEntryPoint"("purchaseConfirmed");
    `);

    console.log('✅ Indexes created');

    console.log('\n📝 Adding foreign key constraint...');

    await client.query(`
      ALTER TABLE "DcaEntryPoint" 
      ADD CONSTRAINT "DcaEntryPoint_dcaZoneId_fkey" 
      FOREIGN KEY ("dcaZoneId") 
      REFERENCES "DcaZone"("id") 
      ON DELETE CASCADE 
      ON UPDATE CASCADE;
    `);

    console.log('✅ Foreign key constraint added');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Connection closed');
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
