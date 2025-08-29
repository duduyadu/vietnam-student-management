const db = require('./config/database');

async function fixAllIssues() {
  console.log('🔧 ULTRATHINK 종합 해결 시작...\n');

  try {
    // 1. 상담 기록 뷰 재생성
    console.log('✨ 상담 기록 뷰 재생성...');
    await db.raw('DROP VIEW IF EXISTS consultation_view CASCADE');
    await db.raw(`
      CREATE VIEW consultation_view AS
      SELECT 
        c.consultation_id,
        c.student_id,
        c.consultation_date,
        c.consultation_type,
        c.notes,
        c.status,
        c.created_by,
        c.created_at,
        s.student_code,
        COALESCE(
          MAX(sa.attribute_value) FILTER (WHERE sa.attribute_name = 'korean_name'),
          MAX(sa.attribute_value) FILTER (WHERE sa.attribute_name = 'vietnamese_name'),
          s.student_code
        ) as student_name,
        u.full_name as counselor_name
      FROM consultations c
      JOIN students s ON c.student_id = s.student_id
      LEFT JOIN student_attributes sa ON s.student_id = sa.student_id 
        AND sa.attribute_name IN ('korean_name', 'vietnamese_name')
      LEFT JOIN users u ON c.created_by = u.user_id
      GROUP BY c.consultation_id, c.student_id, c.consultation_date, 
               c.consultation_type, c.notes, c.status, c.created_by, 
               c.created_at, s.student_code, u.full_name
      ORDER BY c.consultation_date DESC
    `);
    console.log('✅ consultation_view 생성 완료');

    // 2. 상담 테이블 컬럼 확인 및 수정
    console.log('\n📊 상담 테이블 컬럼 확인...');
    const consultationColumns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'consultations'
    `);
    console.log('상담 테이블 컬럼:', consultationColumns.rows.map(c => c.column_name).join(', '));

    // consultation_type CHECK 제약 조건 확인
    const typeConstraint = await db.raw(`
      SELECT pg_get_constraintdef(con.oid) as constraint_def
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'consultations'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%consultation_type%'
    `);
    
    if (typeConstraint.rows.length > 0) {
      console.log('consultation_type 제약:', typeConstraint.rows[0].constraint_def);
    }

    // 3. 테스트 상담 데이터 추가
    console.log('\n✨ 테스트 상담 데이터 추가...');
    const students = await db('students').limit(5);
    
    for (const student of students) {
      const existingCount = await db('consultations')
        .where('student_id', student.student_id)
        .whereRaw('DATE(consultation_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)')
        .count('* as count');
      
      if (parseInt(existingCount[0].count) === 0) {
        try {
          await db('consultations').insert({
            student_id: student.student_id,
            consultation_date: new Date(),
            consultation_type: ['phone', 'video', 'in_person', 'email'][Math.floor(Math.random() * 4)],
            notes: '월간 정기 상담 - 학업 진행 상황 점검',
            status: 'completed',
            created_by: 1
          });
          console.log(`✅ 학생 ${student.student_code} 상담 기록 추가`);
        } catch (err) {
          console.log(`⚠️ 학생 ${student.student_code} 상담 추가 실패:`, err.message);
        }
      }
    }

    // 4. 유학원 삭제 제약 조건 확인
    console.log('\n📊 유학원 외래 키 제약 확인...');
    const fkConstraints = await db.raw(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND ccu.table_name = 'agencies'
    `);
    
    console.log('유학원 참조 테이블:', fkConstraints.rows.map(r => r.table_name).join(', '));

    // 5. 유학원 뷰 재생성 (삭제 가능 여부 포함)
    console.log('\n✨ 유학원 뷰 재생성...');
    await db.raw('DROP VIEW IF EXISTS agency_list CASCADE');
    await db.raw(`
      CREATE VIEW agency_list AS
      SELECT 
        a.agency_id,
        a.agency_code,
        a.agency_name,
        a.agency_type,
        a.city,
        a.country,
        a.is_active,
        (SELECT COUNT(*) FROM students WHERE students.agency_id = a.agency_id) as student_count,
        CASE 
          WHEN (SELECT COUNT(*) FROM students WHERE students.agency_id = a.agency_id) > 0 
          THEN false 
          ELSE true 
        END as can_delete
      FROM agencies a
      ORDER BY a.agency_name
    `);
    console.log('✅ agency_list 뷰 생성 완료');

    // 6. 대시보드 통계 뷰 재생성
    console.log('\n✨ 대시보드 통계 뷰 재생성...');
    await db.raw('DROP VIEW IF EXISTS dashboard_stats CASCADE');
    await db.raw(`
      CREATE VIEW dashboard_stats AS
      SELECT 
        (SELECT COUNT(*) FROM students) as total_students,
        (SELECT COUNT(*) FROM students WHERE status = 'studying') as active_students,
        (SELECT COUNT(*) FROM consultations WHERE DATE(consultation_date) >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_consultations,
        (SELECT COUNT(*) FROM students WHERE status = 'graduated') as graduated_students
    `);
    console.log('✅ dashboard_stats 뷰 생성 완료');

    // 7. 최종 확인
    console.log('\n📊 최종 확인...');
    const studentCount = await db('students').count('* as count');
    const consultationCount = await db('consultations')
      .whereRaw('DATE(consultation_date) >= DATE_TRUNC(\'month\', CURRENT_DATE)')
      .count('* as count');
    const agencyCount = await db('agencies').count('* as count');
    
    console.log('총 학생 수:', studentCount[0].count);
    console.log('이번 달 상담 수:', consultationCount[0].count);
    console.log('총 유학원 수:', agencyCount[0].count);

    // 8. 샘플 데이터 확인
    const sampleStudent = await db('student_list_view').first();
    console.log('\n학생 목록 샘플:', sampleStudent);

    const sampleConsultation = await db.raw('SELECT * FROM consultation_view LIMIT 1');
    if (sampleConsultation.rows.length > 0) {
      console.log('상담 기록 샘플:', sampleConsultation.rows[0]);
    }

    console.log('\n✅ ULTRATHINK 종합 해결 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('상세 오류:', error);
    process.exit(1);
  }
}

fixAllIssues();