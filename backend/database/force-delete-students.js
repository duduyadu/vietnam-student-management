const db = require('../config/database');

async function forceDeleteStudents() {
  try {
    console.log('🔥 Force Delete Students Tool\n');
    
    // 명령행 인수로 학생 ID 받기
    const studentIds = process.argv.slice(2).map(id => parseInt(id));
    
    if (studentIds.length === 0) {
      console.log('Usage: node force-delete-students.js [student_id1] [student_id2] ...');
      console.log('Example: node force-delete-students.js 3 25');
      console.log('\n현재 상위 5명의 학생:');
      
      const topStudents = await db('students')
        .select('student_id', 'student_code', 'name_ko')
        .orderBy('student_code', 'desc')
        .limit(5);
      
      console.table(topStudents);
      process.exit(0);
    }
    
    console.log(`📋 강제 삭제할 학생 ID: ${studentIds.join(', ')}\n`);
    
    for (const studentId of studentIds) {
      console.log(`\n========== Student ID: ${studentId} ==========`);
      
      // 학생 정보 확인
      const student = await db('students')
        .where('student_id', studentId)
        .first();
      
      if (!student) {
        console.log(`❌ Student ID ${studentId} not found`);
        continue;
      }
      
      console.log(`📋 Student: ${student.student_code} (${student.name_ko})`);
      
      // 관련 데이터 확인
      const relatedTables = [
        'consultations',
        'student_attributes',
        'exam_results',
        'learning_progress',
        'academic_goals',
        'generated_reports'
      ];
      
      const deleteCounts = {};
      
      // 트랜잭션으로 모든 관련 데이터 삭제
      await db.transaction(async (trx) => {
        for (const table of relatedTables) {
          try {
            const count = await trx(table)
              .where('student_id', studentId)
              .delete();
            
            if (count > 0) {
              deleteCounts[table] = count;
              console.log(`   - Deleted ${count} records from ${table}`);
            }
          } catch (err) {
            // 테이블이 없거나 접근할 수 없는 경우
            console.log(`   - Skipped ${table}: ${err.message}`);
          }
        }
        
        // 마지막으로 학생 삭제
        await trx('students')
          .where('student_id', studentId)
          .delete();
        
        console.log(`✅ Successfully deleted student ${student.student_code} (${student.name_ko})`);
      });
    }
    
    // 삭제 후 남은 학생 수 확인
    const [{ total }] = await db('students').count('* as total');
    console.log(`\n📊 Total students remaining: ${total}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

forceDeleteStudents();