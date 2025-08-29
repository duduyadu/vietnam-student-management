const fs = require('fs').promises;
const path = require('path');
const pdfService = require('./services/pdfService');
const db = require('./config/database');

async function convertExistingHTMLtoPDF() {
  console.log('🔄 Converting existing HTML reports to PDF...\n');
  
  try {
    // DB에서 PDF가 없는 보고서 조회
    const reports = await db('generated_reports')
      .where('status', 'completed')
      .whereRaw('(file_size IS NULL OR file_size = 0)')
      .select('report_id', 'html_path', 'pdf_path');
    
    console.log(`Found ${reports.length} reports without PDF\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const report of reports) {
      console.log(`Processing report ${report.report_id}...`);
      
      try {
        // HTML 파일 읽기
        const htmlFullPath = path.join(__dirname, report.html_path);
        const htmlContent = await fs.readFile(htmlFullPath, 'utf8');
        console.log(`  - HTML loaded (${htmlContent.length} chars)`);
        
        // PDF 생성
        const enhancedHTML = pdfService.enhanceHTMLForPDF(htmlContent, 'ko');
        const pdfBuffer = await pdfService.generatePDFFromHTML(enhancedHTML);
        console.log(`  - PDF generated (${pdfBuffer.length} bytes)`);
        
        // PDF 저장
        const pdfFullPath = path.join(__dirname, report.pdf_path);
        await fs.mkdir(path.dirname(pdfFullPath), { recursive: true });
        await fs.writeFile(pdfFullPath, pdfBuffer);
        
        // DB 업데이트
        await db('generated_reports')
          .where('report_id', report.report_id)
          .update({
            file_size: pdfBuffer.length,
            status: 'completed'
          });
        
        console.log(`  ✅ Success: ${report.pdf_path}\n`);
        successCount++;
        
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
        failCount++;
      }
    }
    
    console.log('\n📊 Conversion Summary:');
    console.log(`✅ Success: ${successCount} reports`);
    console.log(`❌ Failed: ${failCount} reports`);
    console.log(`📄 Total: ${reports.length} reports`);
    
    // 브라우저 종료
    await pdfService.closeBrowser();
    
  } catch (error) {
    console.error('Conversion failed:', error);
  } finally {
    // DB 연결 종료
    await db.destroy();
    process.exit(0);
  }
}

// 실행
convertExistingHTMLtoPDF().catch(console.error);