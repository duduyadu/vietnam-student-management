const db = require('../config/database');

async function deleteTestStudents() {
  try {
    console.log('🔧 Deleting TEST students...\n');
    
    // TEST로 시작하는 학생들 조회
    const testStudents = await db('students')
      .where('student_code', 'like', 'TEST_%')
      .select('student_id', 'student_code', 'name_ko', 'agency_id', 'status');
    
    console.log('=== TEST Students to Delete ===');
    console.table(testStudents);
    
    if (testStudents.length > 0) {
      console.log('\n📋 Deleting TEST students and their consultation records...');
      
      for (const student of testStudents) {
        // 먼저 상담 기록 확인
        const [{ count }] = await db('consultations')
          .where('student_id', student.student_id)
          .count('* as count');
        
        const consultationCount = parseInt(count) || 0;
        
        if (consultationCount > 0) {
          // 상담 기록이 있으면 먼저 삭제
          await db('consultations')
            .where('student_id', student.student_id)
            .delete();
          
          console.log(`  - Deleted ${consultationCount} consultation records for ${student.student_code}`);
        }
        
        // 학생 삭제
        await db('students')
          .where('student_id', student.student_id)
          .delete();
        
        console.log(`✅ Deleted ${student.student_code} (${student.name_ko})`);
      }
      
      console.log('\n✅ All TEST students have been deleted successfully!');
    } else {
      console.log('✅ No TEST students found');
    }
    
    // 삭제 후 전체 학생 수 확인
    const [{ total }] = await db('students').count('* as total');
    console.log(`\n📊 Total students remaining in database: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

deleteTestStudents();