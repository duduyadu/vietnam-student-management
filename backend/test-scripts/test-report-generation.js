const reportService = require('./services/reportService');

async function testReportGeneration() {
  console.log('🧪 Testing Report Generation...\n');
  
  try {
    // 테스트 데이터
    const studentId = 37;  // 실제 존재하는 학생 ID
    const templateCode = 'consultation_comprehensive';
    const dateRange = {
      start: '2024-01-01',
      end: '2024-12-31'
    };
    const userId = 1;
    const language = 'ko';
    
    console.log('Test parameters:');
    console.log('- Student ID:', studentId);
    console.log('- Template:', templateCode);
    console.log('- Language:', language);
    console.log('- Date Range:', dateRange);
    console.log('\nStarting report generation...\n');
    
    // 보고서 생성 테스트
    const result = await reportService.generateReport(
      studentId,
      templateCode,
      dateRange,
      userId,
      language
    );
    
    console.log('\n✅ Report generation completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('\n❌ Report generation failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  // 프로세스 종료
  process.exit(0);
}

// 테스트 실행
testReportGeneration().catch(console.error);