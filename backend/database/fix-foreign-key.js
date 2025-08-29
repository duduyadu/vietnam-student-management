const db = require('../config/database');

async function fixForeignKey() {
  try {
    console.log('🔧 Fixing foreign key constraint on students table...\n');
    
    // 1. 먼저 기존 constraint 삭제
    console.log('📋 Step 1: Dropping existing foreign key constraint...');
    await db.raw(`
      ALTER TABLE students 
      DROP CONSTRAINT IF EXISTS students_agency_id_fkey
    `);
    console.log('✅ Old constraint dropped');
    
    // 2. agencies 테이블 존재 확인
    console.log('\n📋 Step 2: Checking agencies table...');
    const agencies = await db('agencies').select('agency_id', 'agency_name');
    console.log(`✅ Found ${agencies.length} agencies`);
    console.table(agencies);
    
    // 3. 새 foreign key constraint 추가 (agencies 테이블 참조)
    console.log('\n📋 Step 3: Adding correct foreign key constraint...');
    await db.raw(`
      ALTER TABLE students 
      ADD CONSTRAINT students_agency_id_fkey 
      FOREIGN KEY (agency_id) 
      REFERENCES agencies(agency_id)
      ON DELETE SET NULL
    `);
    console.log('✅ New constraint added successfully');
    
    // 4. 현재 constraint 확인
    console.log('\n📋 Step 4: Verifying constraints...');
    const constraints = await db.raw(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'students'
        AND kcu.column_name = 'agency_id'
    `);
    
    console.log('Current constraint:');
    console.table(constraints.rows);
    
    console.log('\n✅ Foreign key constraint fixed successfully!');
    console.log('Students.agency_id now correctly references agencies.agency_id');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixForeignKey();