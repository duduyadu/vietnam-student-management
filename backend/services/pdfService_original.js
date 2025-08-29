const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class PDFService {
  constructor() {
    this.browser = null;
  }

  // 브라우저 인스턴스 관리
  async getBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  // HTML을 PDF로 변환
  async generatePDFFromHTML(htmlContent, options = {}) {
    let page = null;
    
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      // 한글 폰트 지원을 위한 설정
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });
      
      // PDF 생성 옵션
      const pdfOptions = {
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: true,
        ...options
      };
      
      const pdfBuffer = await page.pdf(pdfOptions);
      
      return pdfBuffer;
      
    } catch (error) {
      console.error('PDF generation error:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  // 보고서 HTML에 베트남어/한국어 지원 추가
  enhanceHTMLForPDF(htmlContent, language = 'ko') {
    // 언어별 폰트 설정
    const fontFamily = language === 'vi' 
      ? '"Noto Sans", "Arial Unicode MS", sans-serif'
      : '"Noto Sans KR", "Malgun Gothic", sans-serif';
    
    // 기본 스타일 추가
    const enhancedHTML = htmlContent.replace(
      '<head>',
      `<head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&family=Noto+Sans:wght@300;400;500;700&display=swap');
          
          * {
            font-family: ${fontFamily};
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          @page {
            size: A4;
            margin: 0;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>`
    );
    
    return enhancedHTML;
  }

  // 파일로 저장
  async savePDFToFile(pdfBuffer, filePath) {
    try {
      // 디렉토리 생성
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // PDF 파일 저장
      await fs.writeFile(filePath, pdfBuffer);
      
      return {
        success: true,
        filePath,
        fileSize: pdfBuffer.length
      };
    } catch (error) {
      console.error('Error saving PDF file:', error);
      throw error;
    }
  }

  // 다국어 보고서 생성
  async generateMultilingualReport(htmlContent, studentId, templateCode, language = 'ko') {
    try {
      // HTML 언어별 최적화
      const enhancedHTML = this.enhanceHTMLForPDF(htmlContent, language);
      
      // PDF 생성
      const pdfBuffer = await this.generatePDFFromHTML(enhancedHTML);
      
      // 파일명 생성
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const langSuffix = language === 'vi' ? 'VI' : 'KO';
      const fileName = `report_${studentId}_${templateCode}_${langSuffix}_${timestamp}.pdf`;
      const filePath = path.join(__dirname, '..', 'uploads', 'reports', fileName);
      
      // 파일 저장
      await this.savePDFToFile(pdfBuffer, filePath);
      
      return {
        success: true,
        fileName,
        filePath: path.join('uploads', 'reports', fileName),
        fileSize: pdfBuffer.length,
        language
      };
      
    } catch (error) {
      console.error('Error generating multilingual report:', error);
      throw error;
    }
  }

  // 브라우저 종료
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton 패턴
module.exports = new PDFService();