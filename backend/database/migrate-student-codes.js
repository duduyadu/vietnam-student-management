const db = require('../config/database');

async function migrateStudentCodes() {
  try {
    console.log('🔧 Starting student code migration...\n');
    
    // 1. 기존 학생 데이터 백업 (안전을 위해)
    console.log('📋 Creating backup of current student codes...');
    await db.raw(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS old_student_code VARCHAR(50)
    `);
    
    await db.raw(`
      UPDATE students 
      SET old_student_code = student_code 
      WHERE old_student_code IS NULL
    `);
    
    // 2. 각 유학원별로 학생 코드 재생성
    const agencies = await db('agencies')
      .select('agency_id', 'agency_name', 'agency_code')
      .orderBy('agency_id', 'asc');
    
    console.log('\n=== Migrating Student Codes by Agency ===');
    
    for (const agency of agencies) {
      const students = await db('students')
        .where('agency_id', agency.agency_id)
        .orderBy('student_id', 'asc');
      
      console.log(`\n📁 ${agency.agency_name} (${agency.agency_code}): ${students.length} students`);
      
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const sequenceNumber = String(i + 1).padStart(4, '0');
        const newCode = `25${agency.agency_code}${sequenceNumber}`;
        
        await db('students')
          .where('student_id', student.student_id)
          .update({ student_code: newCode });
        
        console.log(`  ✅ ${student.name_ko || 'Unknown'}: ${student.old_student_code || student.student_code} → ${newCode}`);
      }
    }
    
    // 3. 시퀀스 리셋 (다음 학생부터 올바른 번호 사용)
    console.log('\n📋 Resetting sequences for future students...');
    
    // generate_student_code 함수 재생성 (향상된 버전)
    const updateFunction = `
      CREATE OR REPLACE FUNCTION generate_student_code(
        p_agency_code VARCHAR(3)
      ) RETURNS VARCHAR(9) AS $$
      DECLARE
        v_year VARCHAR(2);
        v_sequence_number INTEGER;
        v_student_code VARCHAR(9);
      BEGIN
        -- 현재 년도 (2자리)
        v_year := TO_CHAR(CURRENT_DATE, 'YY');
        
        -- 해당 유학원의 마지막 시퀀스 번호 찾기
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(student_code FROM 6 FOR 4) AS INTEGER)
        ), 0) + 1
        INTO v_sequence_number
        FROM students
        WHERE student_code ~ ('^' || v_year || p_agency_code || '[0-9]{4}$')
        AND LENGTH(student_code) = 9;
        
        -- 학생 코드 생성 (YY + AAA + NNNN)
        v_student_code := v_year || p_agency_code || LPAD(v_sequence_number::text, 4, '0');
        
        RETURN v_student_code;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    await db.raw(updateFunction);
    console.log('✅ Updated generate_student_code function');
    
    // 4. 마이그레이션 결과 확인
    console.log('\n=== Migration Results ===');
    const results = await db('students')
      .select('student_id', 'student_code', 'old_student_code', 'name_ko')
      .orderBy('student_code', 'asc')
      .limit(10);
    
    console.table(results);
    
    // 5. 테스트: 새 학생 코드 생성
    console.log('\n=== Testing New Code Generation ===');
    for (const agency of agencies.slice(0, 3)) {
      const result = await db.raw('SELECT generate_student_code(?) as new_code', [agency.agency_code]);
      console.log(`  ${agency.agency_name}: Next code would be ${result.rows[0].new_code}`);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📌 Old codes are backed up in old_student_code column');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 실행 확인
console.log('⚠️  WARNING: This will update all student codes!');
console.log('Old codes will be backed up in old_student_code column.');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  migrateStudentCodes();
}, 5000);