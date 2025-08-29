const db = require('./config/database');

async function fixDatabase() {
  console.log('🔧 데이터베이스 수정 시작...\n');

  try {
    // 1. 현재 테이블 확인
    console.log('📊 현재 테이블 확인...');
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('테이블 목록:', tables.rows.map(t => t.table_name).join(', '));

    // 2. 뷰 확인
    console.log('\n📊 현재 뷰 확인...');
    const views = await db.raw(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('뷰 목록:', views.rows.map(v => v.table_name).join(', ') || '없음');

    // 3. students 테이블 확인
    console.log('\n📊 students 테이블 데이터 확인...');
    const studentCount = await db('students').count('* as count');
    console.log('총 학생 수:', studentCount[0].count);

    // 4. students 테이블 status 컬럼 확인
    console.log('\n📊 students 테이블 컬럼 확인...');
    const studentColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
      ORDER BY ordinal_position
    `);
    console.log('students 컬럼:', studentColumns.rows.map(c => c.column_name).join(', '));

    // 5. status 값 확인 - CHECK 제약 조건 확인
    console.log('\n📊 students.status CHECK 제약 조건 확인...');
    const statusConstraint = await db.raw(`
      SELECT 
        con.conname as constraint_name,
        pg_get_constraintdef(con.oid) as constraint_definition
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'students'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
    `);
    if (statusConstraint.rows.length > 0) {
      console.log('status 제약 조건:', statusConstraint.rows[0].constraint_definition);
    }

    // 6. 학생 목록 뷰 생성
    console.log('\n✨ student_list_view 재생성...');
    await db.raw('DROP VIEW IF EXISTS student_list_view CASCADE');
    await db.raw(`
      CREATE VIEW student_list_view AS
      SELECT 
        s.student_id,
        s.student_code,
        s.status,
        s.agency_id,
        COALESCE(a.agency_name, '미지정') as agency_name,
        COALESCE(
          MAX(CASE WHEN sa.attribute_name = 'korean_name' THEN sa.attribute_value END),
          MAX(CASE WHEN sa.attribute_name = 'vietnamese_name' THEN sa.attribute_value END),
          s.student_code
        ) as name,
        MAX(CASE WHEN sa.attribute_name = 'phone' THEN sa.attribute_value END) as phone,
        MAX(CASE WHEN sa.attribute_name = 'email' THEN sa.attribute_value END) as email
      FROM students s
      LEFT JOIN agencies a ON s.agency_id = a.agency_id
      LEFT JOIN student_attributes sa ON s.student_id = sa.student_id
      GROUP BY s.student_id, s.student_code, s.status, s.agency_id, a.agency_name
      ORDER BY s.student_id DESC
    `);
    console.log('✅ student_list_view 생성 완료');

    // 7. 학생 전체 정보 뷰 생성
    console.log('\n✨ student_full_info 재생성...');
    await db.raw('DROP VIEW IF EXISTS student_full_info CASCADE');
    await db.raw(`
      CREATE VIEW student_full_info AS
      SELECT 
        s.student_id,
        s.student_code,
        s.status as current_status,
        s.created_at,
        s.updated_at,
        s.agency_id,
        a.agency_code,
        a.agency_name,
        a.agency_type,
        MAX(CASE WHEN sa.attribute_name = 'korean_name' THEN sa.attribute_value END) as korean_name,
        MAX(CASE WHEN sa.attribute_name = 'vietnamese_name' THEN sa.attribute_value END) as vietnamese_name,
        MAX(CASE WHEN sa.attribute_name = 'english_name' THEN sa.attribute_value END) as english_name,
        MAX(CASE WHEN sa.attribute_name = 'birth_date' THEN sa.attribute_value END) as birth_date,
        MAX(CASE WHEN sa.attribute_name = 'phone' THEN sa.attribute_value END) as phone,
        MAX(CASE WHEN sa.attribute_name = 'email' THEN sa.attribute_value END) as email,
        MAX(CASE WHEN sa.attribute_name = 'address' THEN sa.attribute_value END) as address,
        MAX(CASE WHEN sa.attribute_name = 'enrollment_date' THEN sa.attribute_value END) as enrollment_date,
        MAX(CASE WHEN sa.attribute_name = 'parent_name' THEN sa.attribute_value END) as parent_name,
        MAX(CASE WHEN sa.attribute_name = 'parent_phone' THEN sa.attribute_value END) as parent_phone,
        MAX(CASE WHEN sa.attribute_name = 'economic_status' THEN sa.attribute_value END) as economic_status,
        MAX(CASE WHEN sa.attribute_name = 'high_school_score' THEN sa.attribute_value END) as high_school_score,
        MAX(CASE WHEN sa.attribute_name = 'desired_major' THEN sa.attribute_value END) as desired_major
      FROM students s
      LEFT JOIN agencies a ON s.agency_id = a.agency_id
      LEFT JOIN student_attributes sa ON s.student_id = sa.student_id
      GROUP BY s.student_id, s.student_code, s.status, s.created_at, s.updated_at, 
               s.agency_id, a.agency_code, a.agency_name, a.agency_type
    `);
    console.log('✅ student_full_info 생성 완료');

    // 8. 기존 학생들에게 속성 추가
    console.log('\n✨ 기존 학생들에게 속성 추가...');
    const studentsWithoutAttrs = await db.raw(`
      SELECT s.student_id, s.student_code 
      FROM students s
      WHERE NOT EXISTS (
        SELECT 1 FROM student_attributes sa 
        WHERE sa.student_id = s.student_id 
        AND sa.attribute_name = 'korean_name'
      )
    `);

    for (let i = 0; i < studentsWithoutAttrs.rows.length; i++) {
      const student = studentsWithoutAttrs.rows[i];
      await db('student_attributes').insert([
        { student_id: student.student_id, attribute_name: 'korean_name', attribute_value: `학생${i + 1}` },
        { student_id: student.student_id, attribute_name: 'vietnamese_name', attribute_value: `Sinh Vien ${i + 1}` },
        { student_id: student.student_id, attribute_name: 'phone', attribute_value: `010-${1000 + i}-${(i + 1) * 111}` },
        { student_id: student.student_id, attribute_name: 'email', attribute_value: `student${i + 1}@example.com` }
      ]);
    }
    console.log(`✅ ${studentsWithoutAttrs.rows.length}명의 학생에게 속성 추가 완료`);

    // 9. 테스트 학생 추가 (학생이 적은 경우)
    const currentCount = parseInt(studentCount[0].count);
    if (currentCount < 10) {
      console.log('\n✨ 테스트 학생 추가...');
      
      // 유학원 확인
      const agencies = await db('agencies').select('agency_id');
      if (agencies.length === 0) {
        console.log('유학원이 없어서 생성합니다...');
        await db('agencies').insert({
          agency_code: 'DEFAULT',
          agency_name: '기본 유학원',
          agency_type: 'local'
        });
      }
      
      const firstAgencyId = agencies[0]?.agency_id || 1;
      
      for (let i = currentCount + 1; i <= 10; i++) {
        try {
          const [newStudent] = await db('students')
            .insert({
              student_code: `TEST2025${String(i).padStart(3, '0')}`,
              status: i % 3 === 0 ? 'graduated' : 'studying',
              agency_id: firstAgencyId,
              created_by: 1
            })
            .returning(['student_id']);
          
          await db('student_attributes').insert([
            { student_id: newStudent.student_id, attribute_name: 'korean_name', attribute_value: `테스트학생${i}` },
            { student_id: newStudent.student_id, attribute_name: 'vietnamese_name', attribute_value: `Nguyen Test ${i}` },
            { student_id: newStudent.student_id, attribute_name: 'phone', attribute_value: `010-${2000 + i}-${i * 111}` },
            { student_id: newStudent.student_id, attribute_name: 'email', attribute_value: `test${i}@example.com` },
            { student_id: newStudent.student_id, attribute_name: 'birth_date', attribute_value: `${2005 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-15` }
          ]);
          
          console.log(`✅ 테스트 학생 ${i} 추가 완료`);
        } catch (err) {
          console.log(`⚠️ 테스트 학생 ${i} 추가 실패:`, err.message);
        }
      }
    }

    // 10. 최종 확인
    console.log('\n📊 최종 확인...');
    const finalCount = await db('students').count('* as count');
    console.log('총 학생 수:', finalCount[0].count);
    
    const viewData = await db('student_list_view').limit(5);
    console.log('\n학생 목록 뷰 샘플 데이터:');
    viewData.forEach(student => {
      console.log(`- ${student.student_code}: ${student.name || '이름없음'} (${student.status})`);
    });

    console.log('\n✅ 데이터베이스 수정 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('상세 오류:', error);
    process.exit(1);
  }
}

fixDatabase();