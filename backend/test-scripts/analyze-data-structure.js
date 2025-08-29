const db = require('./config/database');

async function analyzeDataStructure() {
  console.log('=== 데이터 구조 분석 ===\n');
  
  try {
    // 1. students 테이블 구조
    console.log('1. STUDENTS 테이블 구조:');
    const studentColumns = await db.raw("PRAGMA table_info('students')");
    studentColumns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    // 2. student_attributes 테이블 구조
    console.log('\n2. STUDENT_ATTRIBUTES 테이블 구조:');
    const attrColumns = await db.raw("PRAGMA table_info('student_attributes')");
    attrColumns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    // 3. 실제 학생 데이터 예시
    console.log('\n3. 실제 학생 데이터 예시:');
    const student = await db('students').first();
    if (student) {
      console.log('   기본 정보:', student);
      
      const attrs = await db('student_attributes')
        .where('student_id', student.student_id)
        .select('attribute_key', 'attribute_value');
      
      console.log('   속성 정보:');
      attrs.forEach(attr => {
        console.log(`     - ${attr.attribute_key}: ${attr.attribute_value}`);
      });
    }
    
    // 4. 프론트엔드가 기대하는 형식
    console.log('\n4. 프론트엔드가 기대하는 학생 데이터 형식:');
    console.log(`   {
     student_id: number,
     student_code: string,
     name_ko: string,      // 한국어 이름
     name_vi: string,      // 베트남어 이름
     status: string
   }`);
    
    // 5. 상담 테이블 구조
    console.log('\n5. CONSULTATIONS 테이블 구조:');
    const consultColumns = await db.raw("PRAGMA table_info('consultations')");
    consultColumns.forEach(col => {
      console.log(`   - ${col.name} (${col.type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeDataStructure();