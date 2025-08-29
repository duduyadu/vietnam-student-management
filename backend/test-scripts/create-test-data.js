/**
 * 테스트 데이터 생성 스크립트
 * PDF 생성 테스트를 위한 샘플 데이터 생성
 */

const db = require('./config/database');
const bcrypt = require('bcrypt');

async function createTestData() {
  console.log('🔧 테스트 데이터 생성 시작...');
  
  try {
    // 1. 테스트 유저 생성 (이미 있을 수 있음)
    let userId;
    const existingUser = await db('users')
      .where('email', 'test@example.com')
      .first();
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [user] = await db('users')
        .insert({
          email: 'test@example.com',
          password_hash: hashedPassword,
          full_name: '테스트 교사',
          role: 'teacher',
          agency_name: '베트남 유학원',
          is_active: true
        })
        .returning('user_id');
      userId = user.user_id;
      console.log('✅ 테스트 유저 생성됨:', userId);
    } else {
      userId = existingUser.user_id;
      console.log('ℹ️ 기존 테스트 유저 사용:', userId);
    }
    
    // 2. 테스트 학생 생성
    let studentId;
    const existingStudent = await db('students')
      .where('student_code', 'TEST001')
      .first();
    
    if (!existingStudent) {
      const [student] = await db('students')
        .insert({
          student_code: 'TEST001',
          name_ko: '테스트학생',
          name_vi: 'Nguyen Van Test',
          created_by: userId
        })
        .returning('student_id');
      studentId = student.student_id;
      console.log('✅ 테스트 학생 생성됨:', studentId);
    } else {
      studentId = existingStudent.student_id;
      console.log('ℹ️ 기존 테스트 학생 사용:', studentId);
    }
    
    // 3. 테스트 상담 생성
    const [consultation] = await db('consultations')
      .insert({
        student_id: studentId,
        teacher_id: userId,
        created_by: userId,
        consultation_date: new Date(),
        consultation_type: 'phone',
        content_ko: '학생이 한국어 학습에 열심히 참여하고 있습니다. TOPIK 시험 준비를 위해 매일 2시간씩 공부하고 있으며, 특히 듣기 영역에서 큰 향상을 보이고 있습니다.',
        notes: 'TOPIK 2급 목표, 대학 진학 희망',
        action_items: JSON.stringify({
          improvements: '쓰기 영역 집중 학습 필요, 문법 강화 필요',
          next_goals: 'TOPIK 2급 안정적 획득, 대학 입학 서류 준비',
          student_opinion: '한국 대학에 진학하여 경영학을 공부하고 싶습니다',
          counselor_evaluation: '성실한 학습 태도를 보이고 있으며, 목표 달성 가능성이 높습니다'
        })
      })
      .returning('consultation_id');
    
    console.log('✅ 테스트 상담 생성됨:', consultation.consultation_id);
    
    // 4. TOPIK 모의고사 결과 생성
    const [examResult] = await db('exam_results')
      .insert({
        student_id: studentId,
        exam_type: 'mock',
        exam_name: 'TOPIK 모의고사',
        exam_date: new Date(),
        score: 145,
        grade: '2급',
        detailed_scores: JSON.stringify({
          reading: 48,
          listening: 52,
          writing: 45,
          total: 145,
          test_number: 1,
          level: '2급'
        }),
        notes: '전반적으로 안정적인 점수, 쓰기 보완 필요'
      })
      .returning('exam_id');
    
    console.log('✅ TOPIK 모의고사 결과 생성됨:', examResult.exam_id);
    
    console.log('\n📊 테스트 데이터 생성 완료!');
    console.log('- 학생 ID:', studentId);
    console.log('- 상담 ID:', consultation.consultation_id);
    console.log('- 시험 ID:', examResult.exam_id);
    console.log('\n이제 PDF 생성을 테스트할 수 있습니다.');
    
    return {
      studentId,
      consultationId: consultation.consultation_id,
      examId: examResult.exam_id
    };
    
  } catch (error) {
    console.error('❌ 테스트 데이터 생성 실패:', error.message);
    throw error;
  }
}

// 실행
if (require.main === module) {
  createTestData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = createTestData;