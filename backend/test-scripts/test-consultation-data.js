// 상담 데이터와 보고서 생성 테스트 스크립트
require('dotenv').config();
const db = require('./config/database');
const ReportService = require('./services/reportService');

async function testConsultationData() {
  try {
    console.log('\n=== 상담 데이터 및 보고서 생성 테스트 ===\n');
    
    // 1. 학생 조회
    const students = await db('students')
      .select('student_id', 'name_ko', 'name_vi', 'student_code')
      .limit(5);
    
    console.log('📚 학생 목록:');
    students.forEach(s => {
      console.log(`  - ID: ${s.student_id}, 이름: ${s.name_ko}, 코드: ${s.student_code}`);
    });
    
    if (students.length === 0) {
      console.log('❌ 학생이 없습니다!');
      return;
    }
    
    const testStudentId = students[0].student_id;
    console.log(`\n🎯 테스트 학생 선택: ${students[0].name_ko} (ID: ${testStudentId})`);
    
    // 2. 해당 학생의 상담 기록 조회
    const consultations = await db('consultations')
      .where('student_id', testStudentId)
      .orderBy('consultation_date', 'desc')
      .limit(5);
    
    console.log(`\n📝 상담 기록 (${consultations.length}개):`);
    consultations.forEach(c => {
      console.log(`  - ID: ${c.consultation_id}`);
      console.log(`    날짜: ${c.consultation_date}`);
      console.log(`    카테고리: ${c.evaluation_category}`);
      console.log(`    요약: ${c.summary?.substring(0, 50)}...`);
      
      // action_items 파싱
      if (c.action_items) {
        try {
          const actionItems = typeof c.action_items === 'string' 
            ? JSON.parse(c.action_items) 
            : c.action_items;
          console.log(`    action_items 필드들:`);
          console.log(`      - academic_evaluation: ${actionItems.academic_evaluation ? '있음' : '없음'}`);
          console.log(`      - korean_evaluation: ${actionItems.korean_evaluation ? '있음' : '없음'}`);
          console.log(`      - final_recommendation: ${actionItems.final_recommendation ? '있음' : '없음'}`);
        } catch (e) {
          console.log(`    action_items 파싱 실패:`, e.message);
        }
      } else {
        console.log(`    action_items: 없음`);
      }
      console.log('');
    });
    
    // 3. ReportService를 통해 데이터 가져오기
    console.log('\n🔍 ReportService 테스트:');
    const reportService = ReportService;
    
    // 학생 정보
    const studentInfo = await reportService.getStudentInfo(testStudentId);
    console.log('학생 정보:', {
      id: studentInfo?.student_id,
      name_ko: studentInfo?.name_ko,
      name_vi: studentInfo?.name_vi,
      student_code: studentInfo?.student_code
    });
    
    // 상담 기록 (파싱된 형태)
    const parsedConsultations = await reportService.getConsultations(testStudentId, 5);
    console.log(`\n파싱된 상담 기록 (${parsedConsultations.length}개):`);
    
    if (parsedConsultations.length > 0) {
      const latest = parsedConsultations[0];
      console.log('최신 상담 데이터:');
      console.log('  - consultation_id:', latest.consultation_id);
      console.log('  - evaluation_category:', latest.evaluation_category);
      console.log('  - academic_evaluation:', latest.academic_evaluation ? '있음' : '없음');
      console.log('  - korean_evaluation:', latest.korean_evaluation ? '있음' : '없음');
      console.log('  - final_recommendation:', latest.final_recommendation ? '있음' : '없음');
      
      if (latest.academic_evaluation) {
        console.log(`    내용: ${latest.academic_evaluation.substring(0, 100)}...`);
      }
    }
    
    console.log('\n✅ 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 에러:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testConsultationData();