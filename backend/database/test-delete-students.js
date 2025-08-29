const db = require('../config/database');

async function testDeleteStudents() {
  try {
    console.log('🔍 Testing student deletion issue...\n');
    
    // 모든 학생 조회 (최신순)
    const students = await db('students')
      .select('student_id', 'student_code', 'name_ko', 'agency_id', 'status')
      .orderBy('student_code', 'desc')
      .limit(5);
    
    console.log('=== Top 5 Students (as shown in frontend) ===');
    console.table(students);
    
    // 상위 2명의 학생에 대한 삭제 테스트
    if (students.length >= 2) {
      console.log('\n📋 Testing deletion for top 2 students...\n');
      
      for (let i = 0; i < Math.min(2, students.length); i++) {
        const student = students[i];
        
        console.log(`\n[Test ${i+1}] Student: ${student.student_code} (${student.name_ko})`);
        console.log(`   - Student ID: ${student.student_id}`);
        console.log(`   - Agency ID: ${student.agency_id || 'NULL'}`);
        console.log(`   - Status: ${student.status}`);
        
        // 상담 기록 확인 - 여러 방법으로 시도
        console.log('\n   Testing consultation count queries:');
        
        // 방법 1: 기본 count
        const result1 = await db('consultations')
          .where('student_id', student.student_id)
          .count('* as count');
        console.log(`   Method 1 - Basic count:`, result1);
        console.log(`   - Raw value: "${result1[0].count}"`);
        console.log(`   - Type: ${typeof result1[0].count}`);
        console.log(`   - parseInt: ${parseInt(result1[0].count)}`);
        
        // 방법 2: consultation_count 별칭
        const result2 = await db('consultations')
          .where('student_id', student.student_id)
          .count('* as consultation_count');
        console.log(`   Method 2 - consultation_count alias:`, result2);
        console.log(`   - Raw value: "${result2[0].consultation_count}"`);
        console.log(`   - Type: ${typeof result2[0].consultation_count}`);
        console.log(`   - parseInt: ${parseInt(result2[0].consultation_count)}`);
        
        // 방법 3: 직접 SELECT COUNT
        const result3 = await db.raw(
          'SELECT COUNT(*) as count FROM consultations WHERE student_id = ?',
          [student.student_id]
        );
        console.log(`   Method 3 - Raw SQL:`, result3.rows);
        console.log(`   - Raw value: "${result3.rows[0].count}"`);
        console.log(`   - Type: ${typeof result3.rows[0].count}`);
        console.log(`   - parseInt: ${parseInt(result3.rows[0].count)}`);
        
        // 실제 상담 기록 조회
        const consultations = await db('consultations')
          .where('student_id', student.student_id)
          .select('consultation_id');
        console.log(`   \n   Actual consultation records: ${consultations.length} records`);
        
        // 삭제 가능 여부 판단
        const count = parseInt(result1[0].count) || 0;
        if (count > 0) {
          console.log(`   ⚠️  Has ${count} consultations - needs soft delete or force delete`);
        } else {
          console.log(`   ✅ No consultations - can be deleted directly`);
        }
        
        // Foreign key 제약 확인
        console.log('\n   Checking foreign key constraints:');
        const fkCheck = await db.raw(`
          SELECT 
            tc.constraint_name,
            tc.table_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'students'
            AND ccu.column_name = 'student_id'
        `);
        
        if (fkCheck.rows.length > 0) {
          console.log('   Foreign key references to this student:');
          fkCheck.rows.forEach(fk => {
            console.log(`   - ${fk.table_name}.${fk.column_name} -> students.student_id`);
          });
        }
      }
    }
    
    console.log('\n=== Summary ===');
    console.log('The issue might be:');
    console.log('1. Consultation count parsing issue (string vs number)');
    console.log('2. Foreign key constraint preventing deletion');
    console.log('3. Frontend not sending correct student_id');
    console.log('4. Backend route parameter parsing issue');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testDeleteStudents();