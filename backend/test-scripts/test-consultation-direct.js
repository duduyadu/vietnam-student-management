const db = require('./config/database');

async function testDirectInsert() {
  try {
    console.log('데이터베이스에 직접 상담 기록 삽입 테스트...\n');
    
    // 1. 학생 확인
    const student = await db('students').where('student_id', 18).first();
    if (!student) {
      console.log('❌ 학생 ID 18을 찾을 수 없습니다.');
      return;
    }
    console.log('✅ 학생 찾음:', student);
    
    // 2. 상담 기록 직접 삽입
    console.log('\n상담 기록 삽입 중...');
    const consultationData = {
      student_id: 18,
      teacher_id: 10, // admin user_id
      consultation_date: '2025-08-16',
      consultation_type: 'academic',
      content_ko: '직접 테스트 상담 내용',
      content_vi: 'Test trực tiếp',
      action_items: '테스트 액션',
      next_consultation_date: '2025-08-23'
    };
    
    const result = await db('consultations').insert(consultationData);
    console.log('✅ 삽입 성공! ID:', result[0]);
    
    // 3. 삽입된 데이터 확인
    const inserted = await db('consultations')
      .where('consultation_id', result[0])
      .first();
    console.log('\n삽입된 데이터:', inserted);
    
    // 4. 학생 이름 가져오기
    const nameAttr = await db('student_attributes')
      .where({ student_id: 18, attribute_key: 'name' })
      .first();
    console.log('\n학생 이름:', nameAttr ? nameAttr.attribute_value : '없음');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
}

testDirectInsert();