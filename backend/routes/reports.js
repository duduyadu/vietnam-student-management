const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const db = require('../config/database');
const reportService = require('../services/reportService');
const fs = require('fs').promises;
const path = require('path');

console.log('🚀 Reports router loaded');

router.use(verifyToken);

// ============================
// 보고서 템플릿 목록 조회
// ============================
router.get('/templates', async (req, res) => {
  console.log('📋 GET /api/reports/templates');
  
  try {
    const templates = await db('report_templates')
      .where('is_active', true)
      .orderBy('display_order')
      .select(
        'template_id',
        'template_name',
        'template_code',
        'description',
        'report_type',
        'allowed_roles'
      );

    // 권한 필터링
    const filteredTemplates = templates.filter(template => {
      if (!template.allowed_roles) return true;
      // allowed_roles might be already parsed or a string
      const allowedRoles = typeof template.allowed_roles === 'string' 
        ? JSON.parse(template.allowed_roles) 
        : template.allowed_roles;
      return allowedRoles.includes(req.user.role);
    });

    res.json({
      success: true,
      data: filteredTemplates
    });

  } catch (error) {
    console.error('❌ Get templates error:', error);
    res.status(500).json({
      error: 'Failed to get templates',
      message: error.message
    });
  }
});

// ============================
// 보고서 생성
// ============================
router.post('/generate', verifyToken, async (req, res) => {
  console.log('🔧 POST /api/reports/generate');
  console.log('User:', req.user?.email, 'Role:', req.user?.role);
  console.log('Request body:', req.body);

  try {
    const {
      student_id,
      template_code,
      date_range = {},
      language = 'ko'
    } = req.body;

    // 필수 파라미터 검증
    if (!student_id || !template_code) {
      console.log('❌ Missing parameters - student_id:', student_id, 'template_code:', template_code);
      return res.status(400).json({
        error: 'Missing required parameters',
        message_ko: '필수 파라미터가 누락되었습니다',
        message_vi: 'Thiếu tham số bắt buộc',
        debug: {
          received_student_id: student_id,
          received_template_code: template_code,
          full_body: req.body
        }
      });
    }

    // 학생 존재 확인 및 권한 체크
    const student = await db('students')
      .where('student_id', student_id)
      .first();

    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다',
        message_vi: 'Không tìm thấy sinh viên'
      });
    }

    // 교사 권한 체크
    if (req.user.role === 'teacher' && 
        student.agency_id && 
        student.agency_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '자신의 학원 학생에 대해서만 보고서를 생성할 수 있습니다',
        message_vi: 'Chỉ có thể tạo báo cáo cho sinh viên của trung tâm mình'
      });
    }

    // 템플릿 존재 확인
    const template = await db('report_templates')
      .where('template_code', template_code)
      .where('is_active', true)
      .first();

    if (!template) {
      return res.status(404).json({
        error: 'Template not found',
        message_ko: '템플릿을 찾을 수 없습니다',
        message_vi: 'Không tìm thấy mẫu báo cáo'
      });
    }

    // 템플릿 권한 체크
    if (template.allowed_roles) {
      const allowedRoles = typeof template.allowed_roles === 'string' 
        ? JSON.parse(template.allowed_roles) 
        : template.allowed_roles;
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Template access denied',
          message_ko: '이 템플릿에 대한 접근 권한이 없습니다',
          message_vi: 'Không có quyền truy cập mẫu báo cáo này'
        });
      }
    }

    console.log('📊 Starting report generation...');

    // 보고서 생성 (비동기) - 언어 파라미터 추가
    const result = await reportService.generateReport(
      student_id,
      template_code,
      date_range,
      req.user.user_id,
      language
    );

    console.log('✅ Report generated successfully:', result);

    res.json({
      success: true,
      data: {
        report_id: result.report_id,
        pdf_path: result.pdf_path,
        html_path: result.html_path,
        generation_time: result.generation_time
      },
      message: 'Report generated successfully',
      message_ko: '보고서가 성공적으로 생성되었습니다',
      message_vi: 'Báo cáo đã được tạo thành công'
    });

  } catch (error) {
    console.error('❌ Generate report error:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      message: error.message,
      message_ko: '보고서 생성에 실패했습니다',
      message_vi: 'Không thể tạo báo cáo'
    });
  }
});

// ============================
// 생성된 보고서 목록 조회
// ============================
router.get('/', async (req, res) => {
  console.log('📋 GET /api/reports - Fetching generated reports');

  try {
    const { page = 1, limit = 10, student_id, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('generated_reports as gr')
      .join('students as s', 'gr.student_id', 's.student_id')
      .join('report_templates as rt', 'gr.template_id', 'rt.template_id')
      .leftJoin('users as u', 'gr.generated_by', 'u.user_id')
      .select(
        'gr.*',
        's.student_code',
        'rt.template_name',
        'rt.report_type',
        'u.full_name as generated_by_name'
      );

    // 권한 필터링
    if (req.user.role === 'teacher') {
      query = query.where('gr.generated_by', req.user.user_id);
    }

    // 학생 필터
    if (student_id) {
      query = query.where('gr.student_id', student_id);
    }

    // 상태 필터
    if (status) {
      query = query.where('gr.status', status);
    }

    // 전체 개수 조회 - count를 위한 별도 쿼리
    const countQuery = db('generated_reports as gr')
      .join('students as s', 'gr.student_id', 's.student_id')
      .join('report_templates as rt', 'gr.template_id', 'rt.template_id')
      .leftJoin('users as u', 'gr.generated_by', 'u.user_id');
    
    // 권한 필터링 다시 적용
    if (req.user.role === 'teacher') {
      countQuery.where('gr.generated_by', req.user.user_id);
    }
    if (student_id) {
      countQuery.where('gr.student_id', student_id);
    }
    if (status) {
      countQuery.where('gr.status', status);
    }
    
    const [{ count }] = await countQuery.count('* as count');

    // 페이지네이션 적용
    const reports = await query
      .orderBy('gr.generated_at', 'desc')
      .limit(limit)
      .offset(offset);

    // 각 보고서에 학생 이름 추가
    const reportsWithNames = await Promise.all(
      reports.map(async (report) => {
        // 학생 정보 조회
        const student = await db('students')
          .where('student_id', report.student_id)
          .first();

        return {
          ...report,
          student_name: student ? (student.name_ko || student.name_vi || student.name || '이름 없음') : '이름 없음'
        };
      })
    );

    console.log(`✅ Found ${reportsWithNames.length} reports`);

    res.json({
      success: true,
      data: reportsWithNames,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('❌ Get reports error:', error);
    res.status(500).json({
      error: 'Failed to get reports',
      message: error.message
    });
  }
});

// ============================
// 특정 보고서 조회
// ============================
router.get('/:id', async (req, res) => {
  console.log(`📄 GET /api/reports/${req.params.id}`);

  try {
    const report = await db('generated_reports as gr')
      .join('students as s', 'gr.student_id', 's.student_id')
      .join('report_templates as rt', 'gr.template_id', 'rt.template_id')
      .leftJoin('users as u', 'gr.generated_by', 'u.user_id')
      .where('gr.report_id', req.params.id)
      .select(
        'gr.*',
        's.student_code',
        'rt.template_name',
        'rt.report_type',
        'u.full_name as generated_by_name'
      )
      .first();

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        message_ko: '보고서를 찾을 수 없습니다'
      });
    }

    // 권한 체크
    if (req.user.role === 'teacher' && 
        report.generated_by !== req.user.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '접근 권한이 없습니다'
      });
    }

    // 학생 정보 추가
    const student = await db('students')
      .where('student_id', report.student_id)
      .first();

    report.student_name = student ? (student.name_ko || student.name_vi || student.name || '이름 없음') : '이름 없음';

    // 접근 기록 업데이트
    await db('generated_reports')
      .where('report_id', req.params.id)
      .update({
        last_accessed_at: new Date(),
        access_count: db.raw('access_count + 1')
      });

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('❌ Get report error:', error);
    res.status(500).json({
      error: 'Failed to get report',
      message: error.message
    });
  }
});

// ============================
// PDF 파일 다운로드
// ============================
router.get('/:id/download', verifyToken, async (req, res) => {
  console.log(`📥 GET /api/reports/${req.params.id}/download`);
  console.log('User:', req.user?.email, 'Role:', req.user?.role);

  try {
    const report = await db('generated_reports')
      .where('report_id', req.params.id)
      .first();

    console.log('Report found:', report ? 'Yes' : 'No');
    if (report) {
      console.log('Report status:', report.status);
      console.log('PDF path:', report.pdf_path);
      console.log('File size:', report.file_size);
    }

    if (!report) {
      console.log('❌ Report not found in database');
      return res.status(404).json({
        error: 'Report not found',
        message_ko: '보고서를 찾을 수 없습니다'
      });
    }

    // 권한 체크 - 교사는 자신이 생성한 보고서만 다운로드 가능
    // 관리자와 한국 지점은 모든 보고서 다운로드 가능
    if (req.user.role === 'teacher') {
      // 교사가 해당 학생에 접근 권한이 있는지 확인
      const student = await db('students')
        .where('student_id', report.student_id)
        .first();
      
      // 교사는 자신의 유학원 학생 보고서만 다운로드 가능
      if (student && req.user.agency_name !== student.agency) {
        console.log('❌ Access denied - teacher from different agency');
        return res.status(403).json({
          error: 'Access denied',
          message_ko: '다른 유학원 학생의 보고서에는 접근할 수 없습니다'
        });
      }
    }

    if (report.status !== 'completed') {
      console.log('❌ Report not completed. Status:', report.status);
      return res.status(400).json({
        error: 'Report not ready',
        message_ko: '보고서가 아직 준비되지 않았습니다'
      });
    }

    // Windows 경로 처리 개선
    const pdfPath = report.pdf_path.replace(/\\/g, '/');
    const filePath = path.join(__dirname, '..', pdfPath);
    console.log('File path to check:', filePath);
    
    try {
      await fs.access(filePath);
      console.log('✅ File exists at:', filePath);
    } catch (error) {
      console.log('❌ File not found at:', filePath);
      console.log('File access error:', error.message);
      return res.status(404).json({
        error: 'File not found',
        message_ko: '파일을 찾을 수 없습니다',
        debug: {
          path_in_db: report.pdf_path,
          full_path: filePath
        }
      });
    }

    // 파일명 설정
    const fileName = `${report.report_title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.pdf`;

    // 접근 기록 업데이트
    await db('generated_reports')
      .where('report_id', req.params.id)
      .update({
        last_accessed_at: new Date(),
        access_count: db.raw('access_count + 1')
      });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    
    const fileBuffer = await fs.readFile(filePath);
    res.send(fileBuffer);

  } catch (error) {
    console.error('❌ Download report error:', error);
    res.status(500).json({
      error: 'Failed to download report',
      message: error.message
    });
  }
});

// ============================
// 보고서 삭제
// ============================
router.delete('/:id', checkRole('admin'), async (req, res) => {
  console.log(`🗑️ DELETE /api/reports/${req.params.id}`);

  try {
    const report = await db('generated_reports')
      .where('report_id', req.params.id)
      .first();

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        message_ko: '보고서를 찾을 수 없습니다'
      });
    }

    // 파일 삭제
    if (report.pdf_path) {
      try {
        const pdfPath = path.join(__dirname, '..', report.pdf_path);
        await fs.unlink(pdfPath);
      } catch (error) {
        console.warn('Failed to delete PDF file:', error.message);
      }
    }

    if (report.html_path) {
      try {
        const htmlPath = path.join(__dirname, '..', report.html_path);
        await fs.unlink(htmlPath);
      } catch (error) {
        console.warn('Failed to delete HTML file:', error.message);
      }
    }

    // 데이터베이스에서 삭제
    await db('generated_reports')
      .where('report_id', req.params.id)
      .del();

    console.log('✅ Report deleted successfully');

    res.json({
      success: true,
      message: 'Report deleted successfully',
      message_ko: '보고서가 성공적으로 삭제되었습니다'
    });

  } catch (error) {
    console.error('❌ Delete report error:', error);
    res.status(500).json({
      error: 'Failed to delete report',
      message: error.message
    });
  }
});

// ============================
// 시험 성적 관리 API
// ============================

// 시험 성적 추가
router.post('/exam-results', checkRole('admin', 'teacher'), async (req, res) => {
  console.log('➕ POST /api/reports/exam-results');

  try {
    const {
      student_id,
      exam_name,
      exam_type,
      subject,
      exam_date,
      semester,
      score,
      max_score,
      grade,
      notes
    } = req.body;

    // 필수 필드 검증
    if (!student_id || !exam_name || !exam_date || !score || !max_score) {
      return res.status(400).json({
        error: 'Missing required fields',
        message_ko: '필수 항목을 모두 입력해주세요'
      });
    }

    // 백분율 계산
    const percentage = (score / max_score) * 100;

    const [examId] = await db('exam_results').insert({
      student_id,
      exam_name,
      exam_type: exam_type || 'academic',
      subject,
      exam_date,
      semester,
      score,
      max_score,
      percentage,
      grade,
      notes,
      created_by: req.user.user_id
    });

    res.status(201).json({
      success: true,
      data: { exam_id: examId },
      message: 'Exam result added successfully',
      message_ko: '시험 성적이 성공적으로 추가되었습니다'
    });

  } catch (error) {
    console.error('❌ Add exam result error:', error);
    res.status(500).json({
      error: 'Failed to add exam result',
      message: error.message
    });
  }
});

// 학습 진도 추가
router.post('/learning-progress', checkRole('admin', 'teacher'), async (req, res) => {
  console.log('➕ POST /api/reports/learning-progress');

  try {
    const progressData = {
      ...req.body,
      teacher_id: req.user.user_id
    };

    const [progressId] = await db('learning_progress').insert(progressData);

    res.status(201).json({
      success: true,
      data: { progress_id: progressId },
      message: 'Learning progress added successfully',
      message_ko: '학습 진도가 성공적으로 추가되었습니다'
    });

  } catch (error) {
    console.error('❌ Add learning progress error:', error);
    res.status(500).json({
      error: 'Failed to add learning progress',
      message: error.message
    });
  }
});

// ============================
// 학생별 데이터 조회 API
// ============================

// 학생의 시험 성적 조회
router.get('/exam-results/:studentId', async (req, res) => {
  console.log(`📊 GET /api/reports/exam-results/${req.params.studentId}`);
  
  try {
    const results = await db('exam_results')
      .where('student_id', req.params.studentId)
      .orderBy('exam_date', 'desc');
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('❌ Get exam results error:', error);
    res.status(500).json({
      error: 'Failed to get exam results',
      message: error.message
    });
  }
});

// 학생의 학습 진도 조회
router.get('/learning-progress/:studentId', async (req, res) => {
  console.log(`📈 GET /api/reports/learning-progress/${req.params.studentId}`);
  
  try {
    const progress = await db('learning_progress')
      .where('student_id', req.params.studentId)
      .orderBy('record_date', 'desc');
    
    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    console.error('❌ Get learning progress error:', error);
    res.status(500).json({
      error: 'Failed to get learning progress',
      message: error.message
    });
  }
});

// 학생의 학업 목표 조회
router.get('/academic-goals/:studentId', async (req, res) => {
  console.log(`🎯 GET /api/reports/academic-goals/${req.params.studentId}`);
  
  try {
    const goals = await db('academic_goals')
      .where('student_id', req.params.studentId)
      .orderBy('goal_date', 'desc');
    
    res.json({
      success: true,
      data: goals
    });
  } catch (error) {
    console.error('❌ Get academic goals error:', error);
    res.status(500).json({
      error: 'Failed to get academic goals',
      message: error.message
    });
  }
});

// ============================
// 학업 목표 관리 API
// ============================

// 학업 목표 추가
router.post('/academic-goals', checkRole('admin', 'teacher'), async (req, res) => {
  console.log('➕ POST /api/reports/academic-goals');
  
  try {
    const goalData = {
      ...req.body,
      created_by: req.user.user_id
    };
    
    const [goalId] = await db('academic_goals').insert(goalData);
    
    res.status(201).json({
      success: true,
      data: { goal_id: goalId },
      message: 'Academic goal added successfully',
      message_ko: '학업 목표가 성공적으로 추가되었습니다'
    });
  } catch (error) {
    console.error('❌ Add academic goal error:', error);
    res.status(500).json({
      error: 'Failed to add academic goal',
      message: error.message
    });
  }
});

// 학업 목표 수정
router.put('/academic-goals/:goalId', checkRole('admin', 'teacher'), async (req, res) => {
  console.log(`✏️ PUT /api/reports/academic-goals/${req.params.goalId}`);
  
  try {
    await db('academic_goals')
      .where('goal_id', req.params.goalId)
      .update(req.body);
    
    res.json({
      success: true,
      message: 'Academic goal updated successfully',
      message_ko: '학업 목표가 성공적으로 수정되었습니다'
    });
  } catch (error) {
    console.error('❌ Update academic goal error:', error);
    res.status(500).json({
      error: 'Failed to update academic goal',
      message: error.message
    });
  }
});

// 학업 목표 삭제
router.delete('/academic-goals/:goalId', checkRole('admin', 'teacher'), async (req, res) => {
  console.log(`🗑️ DELETE /api/reports/academic-goals/${req.params.goalId}`);
  
  try {
    await db('academic_goals')
      .where('goal_id', req.params.goalId)
      .del();
    
    res.json({
      success: true,
      message: 'Academic goal deleted successfully',
      message_ko: '학업 목표가 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('❌ Delete academic goal error:', error);
    res.status(500).json({
      error: 'Failed to delete academic goal',
      message: error.message
    });
  }
});

// ============================
// 데이터 수정/삭제 API
// ============================

// 시험 성적 수정
router.put('/exam-results/:examId', checkRole('admin', 'teacher'), async (req, res) => {
  console.log(`✏️ PUT /api/reports/exam-results/${req.params.examId}`);
  
  try {
    await db('exam_results')
      .where('exam_id', req.params.examId)
      .update(req.body);
    
    res.json({
      success: true,
      message: 'Exam result updated successfully',
      message_ko: '시험 성적이 성공적으로 수정되었습니다'
    });
  } catch (error) {
    console.error('❌ Update exam result error:', error);
    res.status(500).json({
      error: 'Failed to update exam result',
      message: error.message
    });
  }
});

// 시험 성적 삭제
router.delete('/exam-results/:examId', checkRole('admin', 'teacher'), async (req, res) => {
  console.log(`🗑️ DELETE /api/reports/exam-results/${req.params.examId}`);
  
  try {
    await db('exam_results')
      .where('exam_id', req.params.examId)
      .del();
    
    res.json({
      success: true,
      message: 'Exam result deleted successfully',
      message_ko: '시험 성적이 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('❌ Delete exam result error:', error);
    res.status(500).json({
      error: 'Failed to delete exam result',
      message: error.message
    });
  }
});

// 학습 진도 수정
router.put('/learning-progress/:progressId', checkRole('admin', 'teacher'), async (req, res) => {
  console.log(`✏️ PUT /api/reports/learning-progress/${req.params.progressId}`);
  
  try {
    await db('learning_progress')
      .where('progress_id', req.params.progressId)
      .update(req.body);
    
    res.json({
      success: true,
      message: 'Learning progress updated successfully',
      message_ko: '학습 진도가 성공적으로 수정되었습니다'
    });
  } catch (error) {
    console.error('❌ Update learning progress error:', error);
    res.status(500).json({
      error: 'Failed to update learning progress',
      message: error.message
    });
  }
});

// 학습 진도 삭제
router.delete('/learning-progress/:progressId', checkRole('admin', 'teacher'), async (req, res) => {
  console.log(`🗑️ DELETE /api/reports/learning-progress/${req.params.progressId}`);
  
  try {
    await db('learning_progress')
      .where('progress_id', req.params.progressId)
      .del();
    
    res.json({
      success: true,
      message: 'Learning progress deleted successfully',
      message_ko: '학습 진도가 성공적으로 삭제되었습니다'
    });
  } catch (error) {
    console.error('❌ Delete learning progress error:', error);
    res.status(500).json({
      error: 'Failed to delete learning progress',
      message: error.message
    });
  }
});

module.exports = router;