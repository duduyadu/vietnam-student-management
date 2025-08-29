const db = require('./config/database');
const fs = require('fs').promises;
const path = require('path');

async function checkReportPaths() {
  console.log('🔍 Checking report paths in database...\n');
  
  try {
    // 최근 보고서 조회
    const reports = await db('generated_reports')
      .orderBy('report_id', 'desc')
      .limit(5)
      .select('report_id', 'pdf_path', 'file_size', 'status');
    
    console.log('Recent reports in database:');
    console.log('================================');
    
    for (const report of reports) {
      console.log(`\nReport ID: ${report.report_id}`);
      console.log(`Status: ${report.status}`);
      console.log(`PDF Path in DB: ${report.pdf_path}`);
      console.log(`File Size in DB: ${report.file_size} bytes`);
      
      if (report.pdf_path) {
        // 실제 파일 경로
        const fullPath = path.join(__dirname, report.pdf_path);
        console.log(`Full Path: ${fullPath}`);
        
        // 파일 존재 여부 확인
        try {
          const stats = await fs.stat(fullPath);
          console.log(`✅ File exists! Actual size: ${stats.size} bytes`);
        } catch (error) {
          console.log(`❌ File NOT found at: ${fullPath}`);
        }
      } else {
        console.log('⚠️ No PDF path in database');
      }
      console.log('--------------------------------');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

checkReportPaths().catch(console.error);