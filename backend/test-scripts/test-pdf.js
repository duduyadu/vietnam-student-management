/**
 * PDF 생성 테스트 스크립트
 * 실행: node test-pdf.js
 */

const pdfGenerator = require('./services/pdf-generator');

async function testPDF() {
  console.log('🧪 PDF 생성 테스트 시작...');
  
  try {
    // 테스트용 상담 ID와 학생 ID
    // create-test-data.js 실행 후 생성된 ID 사용
    const consultationId = 22;
    const studentId = 37;
    
    console.log(`📄 PDF 생성 중... (상담 ID: ${consultationId}, 학생 ID: ${studentId})`);
    
    const pdfBuffer = await pdfGenerator.generateConsultationReport(consultationId, studentId);
    
    if (pdfBuffer) {
      // 파일로 저장
      const fs = require('fs').promises;
      const path = require('path');
      const outputPath = path.join(__dirname, 'test-output.pdf');
      
      await fs.writeFile(outputPath, pdfBuffer);
      console.log(`✅ PDF 생성 성공! 파일 저장됨: ${outputPath}`);
      console.log(`📊 파일 크기: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    } else {
      console.error('❌ PDF 생성 실패: Buffer가 비어있음');
    }
  } catch (error) {
    console.error('❌ PDF 생성 에러:', error.message);
    console.error(error.stack);
  }
}

// 실행
testPDF();