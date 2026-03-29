const HealthRecord = require('../models/HealthRecord');
const mongoose = require('mongoose');

/**
 * Migrate old health records to new format
 * - description -> content
 * - recordType -> type
 */
async function migrateHealthRecords() {
  try {
    console.log('Starting health records migration...');
    
    const records = await HealthRecord.find({});
    console.log(`Found ${records.length} records to migrate`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
      let needsUpdate = false;

      // Migrate description to content
      if (!record.content && record.description) {
        record.content = record.description;
        needsUpdate = true;
      }

      // Migrate recordType to type
      if (!record.type && record.recordType) {
        record.type = record.recordType;
        needsUpdate = true;
      }

      // Ensure date is set
      if (!record.date && record.createdAt) {
        record.date = record.createdAt;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await record.save();
        updated++;
        console.log(`✓ Migrated record: ${record.title}`);
      } else {
        skipped++;
      }
    }

    console.log(`Migration complete! Updated: ${updated}, Skipped: ${skipped}`);
    return { updated, skipped };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

module.exports = migrateHealthRecords;
