const reportService = require('./services/reportService');

async function testPDFGeneration() {
  console.log('🧪 Testing Direct PDF Generation...\n');
  
  try {
    console.log('📋 Generating PDF for student ID 1...');
    
    const result = await reportService.generateReport(
      1,  // student_id
      'consultation_comprehensive',  // template_code
      {},  // date_range
      1,   // user_id
      'ko' // language
    );
    
    console.log('✅ PDF Generation Successful!');
    console.log('Result:', result);
    console.log(`PDF saved as: ${result.pdf_path}`);
    console.log(`Generation time: ${result.generation_time}ms`);
    
  } catch (error) {
    console.error('❌ PDF Generation Failed!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// 테스트 실행
testPDFGeneration();