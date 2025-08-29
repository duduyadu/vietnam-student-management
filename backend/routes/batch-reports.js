const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');
const { generatePDFReport } = require('../services/pdfService');
const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');

// 일괄 보고서 생성 API
router.post('/batch-generate', verifyToken, async (req, res) => {
  const { student_ids, template_code = 'consultation_comprehensive', language = 'ko', date_range } = req.body;
  
  if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '학생 ID 목록이 필요합니다.'
    });
  }

  // 최대 처리 개수 제한 (서버 부하 방지)
  if (student_ids.length > 50) {
    return res.status(400).json({
      success: false,
      message: '한 번에 최대 50명까지만 처리 가능합니다.'
    });
  }

  const results = [];
  const errors = [];

  // 순차적으로 처리 (서버 부하 관리)
  for (const student_id of student_ids) {
    try {
      // 학생 정보 조회
      const studentResult = await db('students')
        .leftJoin('student_attributes as name_attr', function() {
          this.on('students.student_id', '=', 'name_attr.student_id')
            .andOn('name_attr.attribute_id', '=', db.raw('?', [1])); // name attribute
        })
        .where('students.student_id', student_id)
        .select(
          'students.*',
          'name_attr.value as student_name'
        )
        .first();

      if (!studentResult) {
        errors.push({
          student_id,
          error: '학생을 찾을 수 없습니다.'
        });
        continue;
      }

      // 상담 기록 조회
      let consultationsQuery = db('consultations')
        .where('student_id', student_id)
        .orderBy('consultation_date', 'desc');

      if (date_range?.start) {
        consultationsQuery = consultationsQuery.where('consultation_date', '>=', date_range.start);
      }
      if (date_range?.end) {
        consultationsQuery = consultationsQuery.where('consultation_date', '<=', date_range.end);
      }

      const consultations = await consultationsQuery;

      // PDF 생성
      const reportData = {
        student: studentResult,
        consultations,
        language,
        generated_by: req.user.full_name || req.user.email,
        generation_date: new Date().toISOString()
      };

      // 템플릿에 따른 PDF 생성
      const pdfBuffer = await generatePDFReport(template_code, reportData);
      
      // 파일 저장
      const fileName = `report_${student_id}_${template_code}_${language}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../uploads/reports', fileName);
      
      await fs.writeFile(filePath, pdfBuffer);

      // 데이터베이스에 기록
      const reportId = await db('generated_reports').insert({
        student_id,
        template_id: 1, // 기본 템플릿
        file_path: `/uploads/reports/${fileName}`,
        file_size: pdfBuffer.length,
        language,
        status: 'completed',
        generated_by: req.user.user_id,
        generated_at: new Date(),
        generation_time_ms: 1000 // 예시 시간
      }).returning('report_id');

      results.push({
        student_id,
        student_name: studentResult.student_name,
        student_code: studentResult.student_code,
        report_id: reportId[0],
        file_name: fileName,
        status: 'success'
      });

    } catch (error) {
      console.error(`Error generating report for student ${student_id}:`, error);
      errors.push({
        student_id,
        error: error.message
      });
    }

    // 서버 부하 방지를 위한 딜레이
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  res.json({
    success: true,
    total: student_ids.length,
    successful: results.length,
    failed: errors.length,
    results,
    errors
  });
});

// 일괄 다운로드 (ZIP)
router.post('/batch-download', verifyToken, async (req, res) => {
  const { report_ids } = req.body;

  if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: '보고서 ID 목록이 필요합니다.'
    });
  }

  try {
    // 보고서 정보 조회
    const reports = await db('generated_reports')
      .whereIn('report_id', report_ids)
      .select('report_id', 'file_path', 'student_id');

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: '보고서를 찾을 수 없습니다.'
      });
    }

    // ZIP 파일 생성
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${Date.now()}.zip"`);

    const archive = archiver('zip', {
      zlib: { level: 9 } // 최대 압축
    });

    archive.pipe(res);

    // 각 파일을 ZIP에 추가
    for (const report of reports) {
      const filePath = path.join(__dirname, '..', report.file_path);
      const fileName = path.basename(report.file_path);
      
      try {
        await fs.access(filePath);
        archive.file(filePath, { name: fileName });
      } catch (error) {
        console.error(`File not found: ${filePath}`);
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('Batch download error:', error);
    res.status(500).json({
      success: false,
      message: '다운로드 중 오류가 발생했습니다.'
    });
  }
});

// 일괄 보고서 상태 조회 (실시간 진행 상황용)
router.get('/batch-status/:batch_id', verifyToken, async (req, res) => {
  const { batch_id } = req.params;

  try {
    // 배치 작업 상태 조회 (추후 Redis나 Queue 시스템 연동 시 사용)
    const status = await db('batch_report_jobs')
      .where('batch_id', batch_id)
      .first();

    if (!status) {
      return res.status(404).json({
        success: false,
        message: '배치 작업을 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Batch status error:', error);
    res.status(500).json({
      success: false,
      message: '상태 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;