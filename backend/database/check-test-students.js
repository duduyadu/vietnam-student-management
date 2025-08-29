const db = require('../config/database');

async function checkTestStudents() {
  try {
    console.log('🔧 Checking TEST students...\n');
    
    // 1. TEST로 시작하는 학생들 조회
    const testStudents = await db('students')
      .where('student_code', 'like', 'TEST_%')
      .select('student_id', 'student_code', 'name_ko', 'agency_id', 'status');
    
    console.log('=== TEST Students ===');
    console.table(testStudents);
    
    if (testStudents.length > 0) {
      console.log('\n📋 TEST 학생들의 상담 기록 확인...');
      
      for (const student of testStudents) {
        const [{ count }] = await db('consultations')
          .where('student_id', student.student_id)
          .count('* as count');
        
        console.log(`- ${student.student_code} (ID: ${student.student_id}): ${count}개의 상담 기록`);
      }
      
      console.log('\n⚠️ TEST 학생들을 삭제하시겠습니까?');
      console.log('이 스크립트를 수정하여 아래 주석을 해제하면 삭제됩니다.');
      
      // TEST 학생들 삭제하려면 아래 주석 해제
      /*
      for (const student of testStudents) {
        // 먼저 상담 기록 삭제
        await db('consultations')
          .where('student_id', student.student_id)
          .delete();
        
        // 학생 삭제
        await db('students')
          .where('student_id', student.student_id)
          .delete();
        
        console.log(`✅ Deleted ${student.student_code}`);
      }
      */
    } else {
      console.log('✅ No TEST students found');
    }
    
    // 2. 모든 학생 수 확인
    const [{ total }] = await db('students').count('* as total');
    console.log(`\n📊 Total students in database: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkTestStudents();