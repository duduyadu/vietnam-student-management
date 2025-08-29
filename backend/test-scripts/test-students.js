const db = require('./config/database');

async function testStudentsView() {
  console.log('🔍 학생 목록 뷰 테스트 시작...\n');
  
  try {
    // 1. 뷰 존재 확인
    console.log('1. 뷰 존재 확인...');
    const viewExists = await db.raw(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'student_list_view'
      )
    `);
    console.log('student_list_view 존재:', viewExists.rows[0].exists);
    
    // 2. 직접 쿼리 테스트
    console.log('\n2. 직접 쿼리 테스트...');
    try {
      const students = await db('student_list_view').limit(5);
      console.log('학생 목록 조회 성공!');
      console.log('조회된 학생 수:', students.length);
      if (students.length > 0) {
        console.log('첫 번째 학생:', students[0]);
      }
    } catch (err) {
      console.error('뷰 쿼리 실패:', err.message);
      console.error('에러 상세:', err);
    }
    
    // 3. 대체 쿼리 테스트
    console.log('\n3. 대체 쿼리 (직접 조인) 테스트...');
    const alternativeQuery = await db('students as s')
      .leftJoin('agencies as a', 's.agency_id', 'a.agency_id')
      .leftJoin('student_attributes as sa', 's.student_id', 'sa.student_id')
      .select(
        's.student_id',
        's.student_code',
        's.status',
        's.agency_id',
        db.raw("COALESCE(a.agency_name, '미지정') as agency_name")
      )
      .groupBy('s.student_id', 's.student_code', 's.status', 's.agency_id', 'a.agency_name')
      .limit(5);
    
    console.log('대체 쿼리 성공!');
    console.log('조회된 학생 수:', alternativeQuery.length);
    if (alternativeQuery.length > 0) {
      console.log('첫 번째 학생:', alternativeQuery[0]);
    }
    
    // 4. students 테이블 직접 조회
    console.log('\n4. students 테이블 직접 조회...');
    const directStudents = await db('students').limit(5);
    console.log('students 테이블 레코드 수:', directStudents.length);
    if (directStudents.length > 0) {
      console.log('첫 번째 레코드:', directStudents[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('에러 상세:', error);
    process.exit(1);
  }
}

testStudentsView();