// 상담 기록 저장 테스트
require('dotenv').config();
const db = require('./config/database');

async function testConsultationSave() {
  try {
    console.log('\n=== 상담 기록 저장 직접 테스트 ===\n');
    
    // 사용자 조회 (관리자)
    const user = await db('users')
      .where('email', 'admin@example.com')
      .first();
    
    if (!user) {
      console.log('❌ 관리자 계정을 찾을 수 없습니다!');
      return;
    }
    
    console.log('✅ 관리자 계정 확인:', user.email);
    
    // 새로운 상담 기록 직접 생성
    console.log('\n📌 상담 기록 생성 중...');
    
    const consultationData = {
      student_id: 37,  // 테스트학생
      teacher_id: user.user_id,
      created_by: user.user_id,
      consultation_date: new Date().toISOString().split('T')[0],
      consultation_type: '정기 상담',
      evaluation_category: 'unified',
      content_ko: '2025년 1월 정기 상담 내용',
      notes: '2025년 1월 상담 - 학업 성취도 및 한국어 능력 평가',
      action_items: JSON.stringify({
        improvements: '발음 개선 필요, 어휘력 확대 필요',
        next_goals: 'TOPIK 2급 목표, 대학 입시 준비',
        student_opinion: '더 열심히 공부하겠습니다',
        counselor_evaluation: '성실한 학생으로 꾸준한 발전을 보이고 있음',
        academic_evaluation: '전반적으로 우수한 성취도를 보이고 있습니다. 특히 수학과 과학 과목에서 뛰어난 성과를 나타내고 있으며, 한국어 실력도 꾸준히 향상되고 있습니다.',
        korean_evaluation: 'TOPIK 1급 수준에서 2급 수준으로 향상 중입니다. 읽기와 듣기 영역은 안정적이나, 쓰기 영역은 추가 학습이 필요합니다.',
        final_recommendation: '현재의 학습 태도를 유지한다면 목표 대학 진학이 충분히 가능할 것으로 판단됩니다.'
      }),
      writer_role: 'admin'
    };
    
    try {
      const [consultationId] = await db('consultations')
        .insert(consultationData)
        .returning('consultation_id');
      
      const newId = consultationId?.consultation_id || consultationId;
      console.log('✅ 상담 기록 생성 성공! ID:', newId);
      
      // 생성된 기록 조회
      const saved = await db('consultations')
        .where('consultation_id', newId)
        .first();
      
      if (saved.action_items) {
        const actionItems = JSON.parse(saved.action_items);
        console.log('\n📋 저장된 평가 내용:');
        console.log('   - academic_evaluation:', actionItems.academic_evaluation ? '✅ 있음' : '❌ 없음');
        console.log('   - korean_evaluation:', actionItems.korean_evaluation ? '✅ 있음' : '❌ 없음');
        console.log('   - final_recommendation:', actionItems.final_recommendation ? '✅ 있음' : '❌ 없음');
      }
      
      console.log('\n🎉 성공! 상담 기록이 정상적으로 저장되었습니다.');
      
    } catch (error) {
      console.error('❌ 상담 기록 생성 실패!');
      console.error('   에러:', error.message);
      console.error('   상세:', error.detail || error);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testConsultationSave();
