const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../middleware/auth');
const pdfGenerator = require('../services/pdf-generator');

console.log('📄 PDF Reports router initialized');

// 쿼리 파라미터 토큰 인증 미들웨어
const verifyTokenFromQuery = (req, res, next) => {
  // 쿼리 파라미터에서 토큰 확인
  const queryToken = req.query.token;
  
  if (queryToken) {
    // 쿼리 파라미터 토큰을 헤더로 설정
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  
  // 기존 verifyToken 미들웨어 호출
  verifyToken(req, res, next);
};

// 인증 미들웨어 (쿼리 파라미터 지원)
router.use(verifyTokenFromQuery);

// ============================
// 상담 보고서 PDF 생성
// ============================
router.get('/consultation/:consultationId/student/:studentId', async (req, res) => {
  console.log('PDF-REPORTS (non-v2): Route handler called!');
  try {
    const { consultationId, studentId } = req.params;
    
    console.log(`📄 Generating PDF for consultation ${consultationId}, student ${studentId}`);
    
    // PDF 생성
    const pdfBuffer = await pdfGenerator.generateConsultationReport(
      consultationId, 
      studentId
    );
    
    // 파일명 생성
    const filename = `consultation_report_${studentId}_${consultationId}_${Date.now()}.pdf`;
    
    // PDF 응답 헤더 설정
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // PDF 전송
    res.send(pdfBuffer);
    
    console.log(`✅ PDF sent successfully: ${filename}`);
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message,
      message_ko: 'PDF 생성에 실패했습니다'
    });
  }
});

// ============================
// 학생별 전체 보고서 PDF 생성
// ============================
router.get('/student/:studentId/complete', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 5 } = req.query; // 최근 5개 상담 기록
    
    console.log(`📄 Generating complete report for student ${studentId}`);
    
    // 최근 상담 ID 조회
    const db = require('../config/database');
    const consultations = await db('consultations')
      .where('student_id', studentId)
      .orderBy('consultation_date', 'desc')
      .limit(limit)
      .select('consultation_id');
    
    if (consultations.length === 0) {
      return res.status(404).json({
        error: 'No consultations found',
        message_ko: '상담 기록이 없습니다'
      });
    }
    
    // 각 상담에 대한 PDF 생성
    const pdfBuffers = [];
    for (const consultation of consultations) {
      const pdfBuffer = await pdfGenerator.generateConsultationReport(
        consultation.consultation_id,
        studentId
      );
      pdfBuffers.push(pdfBuffer);
    }
    
    // TODO: PDF 병합 로직 구현 (pdf-lib 사용)
    // 현재는 첫 번째 PDF만 반환
    const pdfBuffer = pdfBuffers[0];
    
    // 파일명 생성
    const filename = `student_complete_report_${studentId}_${Date.now()}.pdf`;
    
    // PDF 응답
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Complete report generation error:', error);
    res.status(500).json({
      error: 'Failed to generate complete report',
      message: error.message,
      message_ko: '종합 보고서 생성에 실패했습니다'
    });
  }
});

// ============================
// PDF 미리보기 (HTML 반환)
// ============================
router.get('/preview/consultation/:consultationId/student/:studentId', async (req, res) => {
  try {
    const { consultationId, studentId } = req.params;
    
    console.log(`👁️ Generating preview for consultation ${consultationId}`);
    
    // 데이터 조회
    const data = await pdfGenerator.fetchReportData(consultationId, studentId);
    
    // HTML 템플릿 로드
    const fs = require('fs').promises;
    const path = require('path');
    const templatePath = path.join(__dirname, '..', 'templates', 'consultation-report.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    
    // 데이터 바인딩
    const html = pdfGenerator.bindDataToTemplate(template, data);
    
    // HTML 응답
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
    
  } catch (error) {
    console.error('❌ Preview generation error:', error);
    res.status(500).json({
      error: 'Failed to generate preview',
      message: error.message,
      message_ko: '미리보기 생성에 실패했습니다'
    });
  }
});

// ============================
// 비자/대학 제출용 공식 보고서
// ============================
router.post('/official', async (req, res) => {
  try {
    const { 
      studentId, 
      consultationIds, 
      purpose, // 'visa' or 'university'
      additionalInfo 
    } = req.body;
    
    console.log(`📄 Generating official report for ${purpose}`);
    
    // 권한 체크 - 관리자 또는 해당 학생의 상담사만
    if (req.user.role !== 'admin' && req.user.role !== 'branch') {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '공식 보고서 생성 권한이 없습니다'
      });
    }
    
    // 필수 상담사 평가 확인
    const db = require('../config/database');
    for (const consultationId of consultationIds) {
      const consultation = await db('consultations')
        .where('consultation_id', consultationId)
        .first();
      
      if (!consultation || !consultation.action_items) {
        return res.status(400).json({
          error: 'Missing counselor evaluation',
          message_ko: '상담사 평가가 누락된 상담이 있습니다',
          consultation_id: consultationId
        });
      }
      
      // action_items에 counselor_evaluation 확인
      const actionItems = typeof consultation.action_items === 'string'
        ? JSON.parse(consultation.action_items)
        : consultation.action_items;
      
      if (!actionItems.counselor_evaluation) {
        return res.status(400).json({
          error: 'Counselor evaluation is required for official reports',
          message_ko: '공식 보고서에는 상담사 평가가 필수입니다',
          consultation_id: consultationId
        });
      }
    }
    
    // PDF 생성
    const pdfBuffer = await pdfGenerator.generateBatchReport(consultationIds);
    
    // 파일명 생성 (목적에 따라)
    const purposePrefix = purpose === 'visa' ? 'visa_application' : 'university_admission';
    const filename = `${purposePrefix}_report_${studentId}_${Date.now()}.pdf`;
    
    // 생성 기록 저장
    await db('report_logs').insert({
      student_id: studentId,
      report_type: 'official',
      purpose: purpose,
      consultation_ids: JSON.stringify(consultationIds),
      filename: filename,
      created_by: req.user.user_id,
      created_at: new Date()
    });
    
    // PDF 응답
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
    
    console.log(`✅ Official report generated: ${filename}`);
    
  } catch (error) {
    console.error('❌ Official report generation error:', error);
    res.status(500).json({
      error: 'Failed to generate official report',
      message: error.message,
      message_ko: '공식 보고서 생성에 실패했습니다'
    });
  }
});

// ============================
// 보고서 생성 이력 조회
// ============================
router.get('/history/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const db = require('../config/database');
    const history = await db('report_logs as r')
      .leftJoin('users as u', 'r.created_by', 'u.user_id')
      .where('r.student_id', studentId)
      .orderBy('r.created_at', 'desc')
      .select(
        'r.report_id',
        'r.report_type',
        'r.purpose',
        'r.filename',
        'r.created_at',
        'u.name as created_by_name'
      );
    
    res.json({
      success: true,
      data: history
    });
    
  } catch (error) {
    console.error('❌ Failed to get report history:', error);
    res.status(500).json({
      error: 'Failed to get report history',
      message: error.message
    });
  }
});

module.exports = router;