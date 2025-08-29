const db = require('../config/database');

async function redesignDatabase() {
  try {
    console.log('🔧 Starting database redesign...');
    
    // 1. agencies 테이블에 agency_code 추가
    await db.raw('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS agency_code VARCHAR(3) UNIQUE');
    console.log('✅ Added agency_code column');
    
    // 2. 기존 유학원에 코드 할당
    await db.raw("UPDATE agencies SET agency_code = LPAD(agency_id::text, 3, '0') WHERE agency_code IS NULL");
    console.log('✅ Assigned codes to existing agencies');
    
    // 3. 시퀀스 생성
    try {
      await db.raw('CREATE SEQUENCE agency_code_seq START WITH 1 INCREMENT BY 1');
    } catch (e) {
      // 이미 존재할 수 있음
    }
    console.log('✅ Created/verified agency_code_seq sequence');
    
    // 4. 학생 코드 생성 함수
    const createFunction = `
      CREATE OR REPLACE FUNCTION generate_student_code(
        p_agency_code VARCHAR(3)
      ) RETURNS VARCHAR(9) AS $$
      DECLARE
        v_year VARCHAR(2);
        v_sequence_number INTEGER;
        v_student_code VARCHAR(9);
      BEGIN
        v_year := TO_CHAR(CURRENT_DATE, 'YY');
        
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(student_code FROM 6 FOR 4) AS INTEGER)
        ), 0) + 1
        INTO v_sequence_number
        FROM students
        WHERE student_code LIKE v_year || p_agency_code || '%'
        AND LENGTH(student_code) = 9;
        
        v_student_code := v_year || p_agency_code || LPAD(v_sequence_number::text, 4, '0');
        
        RETURN v_student_code;
      END;
      $$ LANGUAGE plpgsql
    `;
    
    await db.raw(createFunction);
    console.log('✅ Created generate_student_code function');
    
    // 5. 인덱스 추가
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_students_student_code ON students(student_code)',
      'CREATE INDEX IF NOT EXISTS idx_students_agency_id ON students(agency_id)',
      'CREATE INDEX IF NOT EXISTS idx_students_name_ko ON students(name_ko)',
      'CREATE INDEX IF NOT EXISTS idx_consultations_student_id ON consultations(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(consultation_date DESC)',
      'CREATE INDEX IF NOT EXISTS idx_agencies_agency_code ON agencies(agency_code)'
    ];
    
    for (const idx of indexes) {
      await db.raw(idx);
    }
    console.log('✅ Created indexes for performance');
    
    // 6. 뷰 생성
    const createStudentsView = `
      CREATE OR REPLACE VIEW v_students_full AS
      SELECT 
        s.student_id,
        s.student_code,
        s.name_ko,
        s.name_vi,
        s.status,
        s.created_at,
        a.agency_name,
        a.agency_code,
        u.full_name as created_by_name
      FROM students s
      LEFT JOIN agencies a ON s.agency_id = a.agency_id
      LEFT JOIN users u ON s.created_by = u.user_id
    `;
    
    await db.raw(createStudentsView);
    console.log('✅ Created v_students_full view');
    
    const createConsultationsView = `
      CREATE OR REPLACE VIEW v_consultations_full AS
      SELECT 
        c.*,
        s.student_code,
        s.name_ko as student_name_ko,
        s.name_vi as student_name_vi,
        u.full_name as teacher_name,
        a.agency_name
      FROM consultations c
      LEFT JOIN students s ON c.student_id = s.student_id
      LEFT JOIN users u ON c.teacher_id = u.user_id
      LEFT JOIN agencies a ON s.agency_id = a.agency_id
    `;
    
    await db.raw(createConsultationsView);
    console.log('✅ Created v_consultations_full view');
    
    // 7. 확인
    const agencies = await db('agencies').select('agency_id', 'agency_name', 'agency_code').limit(5);
    console.log('\n=== Sample Agencies with Codes ===');
    console.log(agencies);
    
    // 8. 함수 테스트
    const testResult = await db.raw("SELECT generate_student_code('001') as new_code");
    console.log('\n=== Test Student Code Generation ===');
    console.log('Generated code:', testResult.rows[0].new_code);
    
    console.log('\n✅ Database redesign completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

redesignDatabase();