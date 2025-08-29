const db = require('../config/database');

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database issues...');
    
    // 1. 먼저 기존 agency_code를 임시값으로 변경 (중복 방지)
    const agencies = await db('agencies')
      .select('agency_id', 'agency_name', 'agency_code')
      .orderBy('agency_id', 'asc');
    
    console.log('📝 Current agency codes:');
    agencies.forEach(a => console.log(`  - ${a.agency_name}: ${a.agency_code}`));
    
    // 임시 코드로 먼저 업데이트 (중복 방지)
    console.log('\n📝 Setting temporary codes...');
    for (let i = 0; i < agencies.length; i++) {
      const agency = agencies[i];
      const tempCode = `TMP${agency.agency_id}`;
      
      await db('agencies')
        .where('agency_id', agency.agency_id)
        .update({ agency_code: tempCode });
    }
    
    // 2. agency_code를 3자리 숫자로 재할당
    console.log('\n📝 Updating agency codes to 3-digit format...');
    for (let i = 0; i < agencies.length; i++) {
      const agency = agencies[i];
      const code = String(i + 1).padStart(3, '0');
      
      await db('agencies')
        .where('agency_id', agency.agency_id)
        .update({ agency_code: code });
      
      console.log(`  ✅ ${agency.agency_name}: ${code}`);
    }
    
    // 2. students 테이블에 누락된 필드 추가
    console.log('\n📝 Adding missing columns to students table...');
    
    const columnsToAdd = [
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(50)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS email VARCHAR(100)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_date DATE',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS gender VARCHAR(10)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS address_vietnam TEXT',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS address_korea TEXT',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_name VARCHAR(100)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone VARCHAR(50)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_income VARCHAR(100)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS high_school VARCHAR(200)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS gpa DECIMAL(3,2)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS desired_major VARCHAR(200)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS desired_university VARCHAR(200)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS visa_type VARCHAR(50)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS visa_expiry DATE',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS alien_registration VARCHAR(50)',
      'ALTER TABLE students ADD COLUMN IF NOT EXISTS agency_enrollment_date VARCHAR(7)'
    ];
    
    for (const sql of columnsToAdd) {
      try {
        await db.raw(sql);
        const columnName = sql.match(/COLUMN IF NOT EXISTS (\w+)/)[1];
        console.log(`  ✅ Added column: ${columnName}`);
      } catch (e) {
        // Column might already exist
      }
    }
    
    // 3. 뷰 삭제 후 재생성 (새 필드 포함)
    console.log('\n📝 Recreating views with new fields...');
    
    // 먼저 기존 뷰 삭제
    await db.raw('DROP VIEW IF EXISTS v_students_full');
    
    const createStudentsView = `
      CREATE VIEW v_students_full AS
      SELECT 
        s.student_id,
        s.student_code,
        s.name_ko,
        s.name_vi,
        s.phone,
        s.email,
        s.birth_date,
        s.gender,
        s.address_vietnam,
        s.address_korea,
        s.parent_name,
        s.parent_phone,
        s.parent_income,
        s.high_school,
        s.gpa,
        s.desired_major,
        s.desired_university,
        s.visa_type,
        s.visa_expiry,
        s.alien_registration,
        s.agency_enrollment_date,
        s.status,
        s.created_at,
        s.agency_id,
        a.agency_name,
        a.agency_code,
        u.full_name as created_by_name
      FROM students s
      LEFT JOIN agencies a ON s.agency_id = a.agency_id
      LEFT JOIN users u ON s.created_by = u.user_id
    `;
    
    await db.raw(createStudentsView);
    console.log('  ✅ Recreated v_students_full view');
    
    // 4. 테스트 학생 코드 생성
    console.log('\n📝 Testing student code generation...');
    const testAgency = agencies[0];
    if (testAgency) {
      const result = await db.raw("SELECT generate_student_code(?) as new_code", [testAgency.agency_code]);
      console.log(`  ✅ Test code generated: ${result.rows[0].new_code}`);
    }
    
    // 5. 최종 확인
    console.log('\n=== Current Agency Codes ===');
    const finalAgencies = await db('agencies')
      .select('agency_id', 'agency_name', 'agency_code')
      .orderBy('agency_code', 'asc');
    console.table(finalAgencies);
    
    console.log('\n✅ Database fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixDatabase();