const db = require('../config/database');

async function checkAllStudents() {
  try {
    console.log('🔍 Checking all students in database...\n');
    
    // 모든 학생 조회 (최신순)
    const students = await db('students')
      .select('student_id', 'student_code', 'name_ko', 'agency_id', 'status')
      .orderBy('student_code', 'desc')
      .limit(10);
    
    console.log('=== Top 10 Students (ordered by student_code DESC) ===');
    console.table(students);
    
    // 상위 2명의 학생에 대한 상세 정보
    if (students.length >= 2) {
      console.log('\n📋 Checking consultation records for top 2 students...');
      
      for (let i = 0; i < Math.min(2, students.length); i++) {
        const student = students[i];
        
        // 상담 기록 수 확인
        const consultationResult = await db('consultations')
          .where('student_id', student.student_id)
          .count('* as count');
        
        const count = consultationResult[0].count;
        console.log(`\n[${i+1}] Student: ${student.student_code} (${student.name_ko})`);
        console.log(`   - ID: ${student.student_id}`);
        console.log(`   - Agency ID: ${student.agency_id || 'NULL'}`);
        console.log(`   - Status: ${student.status}`);
        console.log(`   - Consultation count: ${count}`);
        console.log(`   - Count type: ${typeof count}`);
        console.log(`   - Parsed count: ${parseInt(count)}`);
        
        // 상담 기록이 있으면 상세 정보
        if (parseInt(count) > 0) {
          const consultations = await db('consultations')
            .where('student_id', student.student_id)
            .select('consultation_id', 'consultation_date', 'consultation_type');
          
          console.log('   - Consultations:');
          consultations.forEach(c => {
            console.log(`     * ID: ${c.consultation_id}, Date: ${c.consultation_date}, Type: ${c.consultation_type}`);
          });
        }
      }
    }
    
    // 전체 통계
    const [{ total }] = await db('students').count('* as total');
    console.log(`\n📊 Total students in database: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkAllStudents();