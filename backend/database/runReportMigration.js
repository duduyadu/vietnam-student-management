const db = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  try {
    console.log('🚀 Running report system migration...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', '..', 'REPORT_SYSTEM_SETUP.sql');
    const sqlContent = await fs.readFile(sqlPath, 'utf8');
    
    // Split into individual statements (simple split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip pure comments or empty statements
      if (!statement || statement.startsWith('--')) {
        continue;
      }
      
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await db.raw(statement + ';');
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Check if it's a "already exists" error - if so, we can continue
        if (error.message.includes('already exists')) {
          console.log(`⚠️ Statement ${i + 1} skipped (object already exists)`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('✅ Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the migration
runMigration().then(() => {
  console.log('Migration process completed!');
  process.exit(0);
}).catch(error => {
  console.error('Migration process failed:', error);
  process.exit(1);
});