const db = require('../config/database');

async function testStudentCode() {
  try {
    console.log('🔧 Testing student code generation...\n');
    
    // 1. 현재 유학원 목록 확인
    const agencies = await db('agencies')
      .select('agency_id', 'agency_name', 'agency_code')
      .orderBy('agency_code', 'asc');
    
    console.log('=== Current Agencies ===');
    console.table(agencies);
    
    // 2. 각 유학원별로 학생 코드 생성 테스트
    console.log('\n=== Testing Student Code Generation ===');
    for (const agency of agencies) {
      try {
        const result = await db.raw('SELECT generate_student_code(?) as student_code', [agency.agency_code]);
        console.log(`✅ ${agency.agency_name} (${agency.agency_code}): ${result.rows[0].student_code}`);
      } catch (err) {
        console.error(`❌ ${agency.agency_name} (${agency.agency_code}): ${err.message}`);
      }
    }
    
    // 3. 현재 학생 데이터 확인
    console.log('\n=== Current Students (Last 5) ===');
    const students = await db('students')
      .select('student_id', 'student_code', 'name_ko', 'agency_id')
      .orderBy('student_id', 'desc')
      .limit(5);
    console.table(students);
    
    // 4. v_students_full 뷰 테스트
    console.log('\n=== Testing v_students_full View ===');
    const viewStudents = await db('v_students_full')
      .select('student_id', 'student_code', 'name_ko', 'agency_name', 'phone', 'email')
      .limit(3);
    console.table(viewStudents);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testStudentCode();