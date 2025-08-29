const db = require('../config/database');

async function testDeletion() {
  try {
    console.log('🧪 Testing student deletion...\n');
    
    // 현재 학생 목록 확인
    const students = await db('students')
      .select('student_id', 'student_code', 'name_ko', 'status')
      .orderBy('student_code', 'desc')
      .limit(5);
    
    console.log('=== Current Students (Top 5) ===');
    console.table(students);
    
    // archived 상태의 학생 확인
    const archivedStudents = await db('students')
      .where('status', 'archived')
      .select('student_id', 'student_code', 'name_ko');
    
    if (archivedStudents.length > 0) {
      console.log('\n=== Archived Students ===');
      console.table(archivedStudents);
      
      console.log('\n💡 TIP: Archived students can be:');
      console.log('1. Kept as archived (data preserved)');
      console.log('2. Force deleted using ?force=true parameter');
      console.log('3. Restored to "studying" status');
    }
    
    // 상담 기록이 있는 학생 찾기
    const studentsWithConsultations = await db.raw(`
      SELECT s.student_id, s.student_code, s.name_ko, COUNT(c.consultation_id) as consultation_count
      FROM students s
      LEFT JOIN consultations c ON s.student_id = c.student_id
      WHERE s.status != 'archived'
      GROUP BY s.student_id, s.student_code, s.name_ko
      HAVING COUNT(c.consultation_id) > 0
      ORDER BY consultation_count DESC
      LIMIT 3
    `);
    
    if (studentsWithConsultations.rows.length > 0) {
      console.log('\n=== Students with Consultations (will be archived if deleted) ===');
      console.table(studentsWithConsultations.rows);
    }
    
    // 상담 기록이 없는 학생 찾기
    const studentsWithoutConsultations = await db.raw(`
      SELECT s.student_id, s.student_code, s.name_ko
      FROM students s
      LEFT JOIN consultations c ON s.student_id = c.student_id
      WHERE s.status != 'archived'
      GROUP BY s.student_id, s.student_code, s.name_ko
      HAVING COUNT(c.consultation_id) = 0
      LIMIT 3
    `);
    
    if (studentsWithoutConsultations.rows.length > 0) {
      console.log('\n=== Students without Consultations (will be hard deleted) ===');
      console.table(studentsWithoutConsultations.rows);
    }
    
    console.log('\n✅ Deletion logic summary:');
    console.log('- Students WITH consultations → archived (soft delete)');
    console.log('- Students WITHOUT consultations → deleted (hard delete)');
    console.log('- Use ?force=true to force delete even with consultations');
    console.log('- CASCADE DELETE will automatically remove all related records');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testDeletion();