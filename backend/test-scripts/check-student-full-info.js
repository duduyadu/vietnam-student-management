const db = require('./config/database');

async function checkStudentInfo() {
  try {
    // student_attributes 테이블 구조 확인
    const columns = await db.raw("PRAGMA table_info('student_attributes')");
    console.log('student_attributes 테이블 구조:');
    console.log('===============================');
    columns.forEach(col => {
      console.log(`${col.name} (${col.type})`);
    });
    
    // attribute_definitions 확인
    console.log('\n\nattribute_definitions:');
    const attrs = await db('attribute_definitions').select('*');
    attrs.forEach(attr => {
      console.log(`- ${attr.attribute_key}: ${attr.display_name_ko}`);
    });
    
    // 학생 한 명의 전체 정보 조회
    console.log('\n\n학생 정보 조회 (ID: 18):');
    const studentInfo = await db('students as s')
      .select('s.*')
      .where('s.student_id', 18)
      .first();
    
    console.log('기본 정보:', studentInfo);
    
    // 학생의 속성 정보 조회
    const studentAttrs = await db('student_attributes')
      .where('student_id', 18)
      .select('*');
    
    console.log('\n속성 정보:');
    studentAttrs.forEach(attr => {
      console.log(`- ${attr.attribute_key}: ${attr.value_text || attr.value_number || attr.value_date}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentInfo();