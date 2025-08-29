const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function generatePDF() {
  let browser;
  try {
    console.log('🚀 PDF 생성 시작...');
    
    // HTML 파일 읽기
    const htmlPath = path.join(__dirname, 'test-output.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf8');
    console.log('✅ HTML 파일 읽기 완료');
    
    // Puppeteer 브라우저 실행
    console.log('🌐 브라우저 시작...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--font-render-hinting=none',
        '--disable-dev-shm-usage'
      ]
    });
    
    const page = await browser.newPage();
    
    // 비트포트 설정 (A4 크기)
    await page.setViewport({
      width: 794,  // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 1
    });
    
    // HTML 콘텐츠 설정
    await page.setContent(htmlContent, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });
    
    // 스타일이 완전히 로드될 때까지 대기
    await page.evaluateHandle('document.fonts.ready');
    await new Promise(r => setTimeout(r, 500));
    
    // PDF 생성 최적화
    console.log('📝 PDF 생성 중...');
    const pdfPath = path.join(__dirname, 'test-report.pdf');
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,  // CSS에서 페이지 크기 제어
      margin: {
        top: '0',
        bottom: '0',
        left: '0',
        right: '0'
      },
      scale: 1,
      pageRanges: '' // 모든 페이지 포함
    });
    
    console.log(`✅ PDF 생성 완료: ${pdfPath}`);
    console.log('📊 PDF 파일 크기:', (await fs.stat(pdfPath)).size, 'bytes');
    
  } catch (error) {
    console.error('❌ PDF 생성 중 오류:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 브라우저 종료');
    }
  }
}

generatePDF();