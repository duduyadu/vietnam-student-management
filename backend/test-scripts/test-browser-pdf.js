const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  // 가장 최근 consultation_comprehensive PDF 파일 찾기
  const reportsDir = path.join(__dirname, 'uploads', 'reports');
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.includes('consultation_comprehensive') && f.endsWith('.pdf'))
    .sort((a, b) => {
      const statA = fs.statSync(path.join(reportsDir, a));
      const statB = fs.statSync(path.join(reportsDir, b));
      return statB.mtime - statA.mtime;
    });
  
  if (files.length === 0) {
    console.log('❌ No consultation_comprehensive PDF files found');
    return;
  }
  
  const latestPDF = files[0];
  const pdfPath = path.join(reportsDir, latestPDF);
  const stats = fs.statSync(pdfPath);
  
  console.log('📄 Latest PDF:', latestPDF);
  console.log('📊 File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('📅 Created:', stats.mtime);
  
  // PDF 파일의 첫 부분 확인
  const buffer = fs.readFileSync(pdfPath);
  const header = buffer.slice(0, 5).toString();
  
  if (header === '%PDF-') {
    console.log('✅ Valid PDF file format');
  } else {
    console.log('❌ Invalid PDF file format');
  }
  
  // HTML 파일도 확인
  const htmlFile = latestPDF.replace('.pdf', '.html');
  const htmlPath = path.join(reportsDir, htmlFile);
  
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      console.log('📖 HTML Title:', titleMatch[1]);
    }
    
    // 페이지 수 확인
    const pageCount = (htmlContent.match(/class="page"/g) || []).length;
    console.log('📑 Number of pages in HTML:', pageCount || 1);
    
    if (htmlContent.includes('학업 성취도 종합 보고서')) {
      console.log('✅ Using consultation-report.html template (4-page professional report)');
    } else if (htmlContent.includes('베트남 유학생 상담 보고서')) {
      console.log('⚠️ Using simple-report.html template (1-page simple report)');
    }
  }
})();
