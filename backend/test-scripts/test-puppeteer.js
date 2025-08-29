const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function testPuppeteer() {
  console.log('🧪 Testing Puppeteer...');
  
  let browser = null;
  let page = null;
  
  try {
    // 1. 브라우저 실행 테스트
    console.log('1️⃣ Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    console.log('✅ Browser launched successfully');
    
    // 2. 페이지 생성 테스트
    console.log('2️⃣ Creating new page...');
    page = await browser.newPage();
    console.log('✅ Page created successfully');
    
    // 3. HTML 컨텐츠 설정 테스트
    console.log('3️⃣ Setting HTML content...');
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Test PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>Puppeteer Test PDF</h1>
        <p>This is a test PDF generated on ${new Date().toLocaleString()}</p>
        <p>한글 테스트: 안녕하세요!</p>
        <p>Vietnamese test: Xin chào!</p>
      </body>
      </html>
    `;
    
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    console.log('✅ HTML content set successfully');
    
    // 4. PDF 생성 테스트
    console.log('4️⃣ Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    console.log(`✅ PDF generated successfully (${pdfBuffer.length} bytes)`);
    
    // 5. PDF 저장 테스트
    console.log('5️⃣ Saving PDF to file...');
    const testPdfPath = path.join(__dirname, 'test-puppeteer.pdf');
    await fs.writeFile(testPdfPath, pdfBuffer);
    console.log(`✅ PDF saved to: ${testPdfPath}`);
    
    // 6. 파일 확인
    const stats = await fs.stat(testPdfPath);
    console.log(`✅ File size: ${stats.size} bytes`);
    
    console.log('\n🎉 All tests passed! Puppeteer is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    
    // 상세한 에러 정보 제공
    if (error.message.includes('Failed to launch')) {
      console.error('\n💡 Solution: Chrome/Chromium might not be installed properly.');
      console.error('Try running: npm rebuild puppeteer');
    }
    
  } finally {
    // 정리
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('\n🧹 Cleanup completed');
  }
}

// 테스트 실행
testPuppeteer().catch(console.error);