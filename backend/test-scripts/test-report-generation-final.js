// 보고서 생성 최종 테스트
require('dotenv').config();
const db = require('./config/database');
const ReportService = require('./services/reportService');
const path = require('path');
const fs = require('fs').promises;

async function testReportGeneration() {
  try {
    console.log('\n=== 보고서 생성 최종 테스트 ===\n');
    
    // 1. 테스트 학생 조회 (ID: 37 - 테스트학생)
    const student = await db('students')
      .where('student_id', 37)
      .first();
    
    if (!student) {
      console.log('❌ 테스트 학생(ID: 37)을 찾을 수 없습니다!');
      return;
    }
    
    console.log('📚 테스트 학생:', {
      id: student.student_id,
      name_ko: student.name_ko,
      name_vi: student.name_vi,
      student_code: student.student_code
    });
    
    // 2. 보고서 생성
    console.log('\n📄 보고서 생성 시작...');
    
    try {
      const result = await ReportService.generateReport(
        37, // student_id
        'consultation_comprehensive', // template
        {}, // dateRange
        1, // userId
        'ko' // language
      );
      
      console.log('\n✅ 보고서 생성 성공!');
      console.log('  - Report ID:', result.report_id);
      console.log('  - PDF Path:', result.pdf_path);
      console.log('  - HTML Path:', result.html_path);
      console.log('  - Generation Time:', result.generation_time, 'ms');
      
      // 3. 생성된 HTML 파일 내용 확인
      const htmlPath = path.join(__dirname, '..', result.html_path);
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      
      console.log('\n📋 생성된 HTML 내용 확인:');
      
      // 학생 이름이 포함되어 있는지 확인
      if (htmlContent.includes(student.name_ko)) {
        console.log('  ✅ 학생 이름 포함됨:', student.name_ko);
      } else if (htmlContent.includes('학생 이름')) {
        console.log('  ❌ 학생 이름이 기본값으로 대체됨');
      } else {
        console.log('  ⚠️ 학생 이름 확인 불가');
      }
      
      // 학업 평가가 포함되어 있는지 확인
      if (htmlContent.includes('학업에 대한 열정이 높고')) {
        console.log('  ❌ 학업 평가가 기본값으로 대체됨');
      } else if (htmlContent.includes('{{academic_evaluation}}')) {
        console.log('  ❌ academic_evaluation 플레이스홀더가 치환되지 않음');
      } else {
        console.log('  ✅ 학업 평가가 정상적으로 포함됨');
      }
      
      // 한국어 평가 확인
      if (htmlContent.includes('TOPIK 성적이 꾸준히')) {
        console.log('  ❌ 한국어 평가가 기본값으로 대체됨');
      } else if (htmlContent.includes('{{korean_evaluation}}')) {
        console.log('  ❌ korean_evaluation 플레이스홀더가 치환되지 않음');
      } else {
        console.log('  ✅ 한국어 평가가 정상적으로 포함됨');
      }
      
      // 4. 상담 기록 확인
      const consultations = await db('consultations')
        .where('student_id', 37)
        .orderBy('consultation_date', 'desc')
        .first();
      
      if (consultations) {
        console.log('\n📝 최신 상담 기록:');
        console.log('  - ID:', consultations.consultation_id);
        console.log('  - Category:', consultations.evaluation_category);
        console.log('  - Summary:', consultations.summary?.substring(0, 50));
        
        if (consultations.action_items) {
          try {
            const actionItems = JSON.parse(consultations.action_items);
            console.log('  - Action Items 필드 수:', Object.keys(actionItems).length);
            if (actionItems.academic_evaluation) {
              console.log('    ✅ academic_evaluation 있음');
            }
            if (actionItems.korean_evaluation) {
              console.log('    ✅ korean_evaluation 있음');
            }
          } catch (e) {
            console.log('  - action_items 파싱 실패');
          }
        }
      }
      
      console.log('\n📁 생성된 파일 위치:');
      console.log('  - HTML:', htmlPath);
      console.log('  - PDF:', path.join(__dirname, '..', result.pdf_path));
      
    } catch (error) {
      console.error('❌ 보고서 생성 실패:', error.message);
      console.error(error.stack);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

testReportGeneration();