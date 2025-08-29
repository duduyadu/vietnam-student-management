// reportService.js의 개선된 버전 - consultation-report.html 템플릿 사용
const knex = require('knex');
const knexConfig = require('../knexfile');
const db = knex(knexConfig.development);
const path = require('path');
const fs = require('fs').promises;
const pdfService = require('./pdfService');

class EnhancedReportService {
  // 학업 데이터 조회
  async getAcademicData(studentId) {
    try {
      const result = await db('student_academic_data')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching academic data:', error);
      return null;
    }
  }

  // 포트폴리오 데이터 조회
  async getPortfolioData(studentId) {
    try {
      const result = await db('student_portfolio')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
      return null;
    }
  }

  // 생활 평가 데이터 조회
  async getEvaluationData(studentId) {
    try {
      const result = await db('student_life_evaluation')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching evaluation data:', error);
      return null;
    }
  }

  // 학생 정보 조회
  async getStudentInfo(studentId) {
    try {
      const result = await db('students')
        .where('student_id', studentId)
        .first();
      return result;
    } catch (error) {
      console.error('Error fetching student info:', error);
      return null;
    }
  }

  // 시험 결과 조회
  async getExamResults(studentId) {
    try {
      const results = await db('exam_results')
        .where('student_id', studentId)
        .orderBy('exam_date', 'desc')
        .limit(10);
      return results;
    } catch (error) {
      console.error('Error fetching exam results:', error);
      return [];
    }
  }

  // 상담 기록 조회
  async getConsultations(studentId, limit = 10) {
    try {
      const results = await db('consultations')
        .where('student_id', studentId)
        .orderBy('consultation_date', 'desc')
        .limit(limit);
      return results;
    } catch (error) {
      console.error('Error fetching consultations:', error);
      return [];
    }
  }

  // simple-report.html 템플릿을 사용한 HTML 생성 (11.pdf 형식)
  async generateHTMLFromTemplate(studentId, language = 'ko') {
    try {
      // 간단한 템플릿 파일 읽기
      const templatePath = path.join(__dirname, '..', 'templates', 'simple-report.html');
      let htmlTemplate = await fs.readFile(templatePath, 'utf8');
      
      // 필요한 기본 데이터만 조회 (간단한 보고서용)
      const student = await this.getStudentInfo(studentId);
      const consultations = await this.getConsultations(studentId);
      
      // 상담 횟수 계산
      const consultationCount = consultations ? consultations.length : 0;
      
      // 학습 진도 계산 (예시: 100점 만점 기준)
      const learningProgress = consultationCount > 0 ? Math.min(consultationCount * 10, 100) : 0;
      
      // 날짜 포맷팅 함수
      const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        // 11.pdf 형식과 동일하게: 2025. 8. 23.
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}. ${month}. ${day}.`;
      };
      
      // 플레이스홀더 치환 (간단한 보고서용)
      const replacements = {
        '{{student_name_ko}}': student?.name_korean || student?.name || 'undefined',
        '{{student_code}}': student?.student_code || 'undefined',
        '{{agency_name}}': student?.agency || 'undefined',
        '{{phone_number}}': student?.phone_number || '01062191111',
        '{{email}}': student?.email || '-',
        '{{report_date}}': formatDate(new Date()),
        '{{learning_progress}}': learningProgress,
        '{{consultation_count}}': consultationCount
      };
      
      // 템플릿의 모든 플레이스홀더 치환
      for (const [placeholder, value] of Object.entries(replacements)) {
        htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), value);
      }
      
      return htmlTemplate;
      
    } catch (error) {
      console.error('Error generating HTML from template:', error);
      throw error;
    }
  }

  // PDF 생성 메인 메소드
  async generateReport(studentId, templateCode = 'consultation_comprehensive', dateRange = {}, userId = null, language = 'ko') {
    try {
      console.log('📊 Starting report generation for student:', studentId);
      
      // 1. HTML 생성 (템플릿 사용)
      const htmlContent = await this.generateHTMLFromTemplate(studentId, language);
      
      // 2. 디렉토리 생성
      const uploadDir = path.join(__dirname, '..', 'uploads', 'reports');
      await fs.mkdir(uploadDir, { recursive: true });
      
      // 3. HTML 파일 저장
      const timestamp = Date.now();
      const htmlFileName = `report_${studentId}_${templateCode}_${timestamp}.html`;
      const htmlPath = path.join(uploadDir, htmlFileName);
      await fs.writeFile(htmlPath, htmlContent, 'utf8');
      const htmlRelativePath = path.join('uploads', 'reports', htmlFileName);
      
      // 4. PDF 생성
      console.log('🖨️ Converting HTML to PDF...');
      const startTime = Date.now();
      const enhancedHTML = pdfService.enhanceHTMLForPDF(htmlContent, language);
      const pdfBuffer = await pdfService.generatePDFFromHTML(enhancedHTML);
      
      // 5. PDF 파일 저장
      const pdfFileName = `report_${studentId}_${templateCode}_${timestamp}.pdf`;
      const pdfPath = path.join(uploadDir, pdfFileName);
      await fs.writeFile(pdfPath, pdfBuffer);
      const pdfRelativePath = path.join('uploads', 'reports', pdfFileName);
      
      const generationTime = Date.now() - startTime;
      console.log(`✅ PDF generated in ${generationTime}ms`);
      
      // 6. 데이터베이스에 기록
      const student = await this.getStudentInfo(studentId);
      const insertResult = await db('generated_reports').insert({
        student_id: studentId,
        template_id: 1,
        report_title: `${student?.name_korean || '학생'} - 종합 보고서`,
        report_date: new Date().toISOString().split('T')[0],
        period_start: dateRange.start || null,
        period_end: dateRange.end || null,
        status: 'completed',
        pdf_path: pdfRelativePath.replace(/\\/g, '/'),
        html_path: htmlRelativePath.replace(/\\/g, '/'),
        file_size: pdfBuffer.length,
        generation_time_ms: generationTime,
        generated_by: userId,
        generated_at: new Date(),
        access_count: 0
      }).returning('report_id');
      
      const reportId = insertResult[0]?.report_id || insertResult[0];
      
      return {
        report_id: reportId,
        pdf_path: pdfRelativePath,
        html_path: htmlRelativePath,
        generation_time: generationTime
      };
      
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
}

module.exports = new EnhancedReportService();