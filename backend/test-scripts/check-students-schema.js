const db = require('./config/database');

async function checkStudentsSchema() {
  try {
    // students 테이블의 컬럼 정보 확인
    const columns = await db.raw("PRAGMA table_info('students')");
    
    console.log('students 테이블 구조:');
    console.log('===============================');
    columns.forEach(col => {
      console.log(`${col.name} (${col.type})`);
    });
    
    console.log('\n\n샘플 학생 데이터:');
    const students = await db('students').select('*').limit(1);
    if (students.length > 0) {
      console.log(students[0]);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentsSchema();