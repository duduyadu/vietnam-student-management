const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

console.log('🚀 Consultations router OPTIMIZED - Using database views - WITH TYPES ROUTE');

// Test route without auth
router.get('/test-route', (req, res) => {
  console.log('TEST ROUTE HIT!');
  res.json({ message: 'Test route works!' });
});

// 인증 활성화
router.use(verifyToken);

// ============================
// 상담 유형 조회
// ============================
router.get('/types', async (req, res) => {
  console.log('GET /types route hit');
  
  try {
    const types = await db('consultation_types')
      .where('is_active', true)
      .orderBy('display_order', 'asc');
    
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('❌ Get consultation types error:', error);
    res.status(500).json({
      error: 'Failed to get consultation types',
      message: error.message
    });
  }
});

// ============================
// 상담 목록 조회 (뷰 사용)
// ============================
router.get('/', async (req, res) => {
  console.log('📋 GET /api/consultations - Using optimized view');
  
  try {
    const { page = 1, limit = 10, search = '', student_id } = req.query;
    const offset = (page - 1) * limit;
    
    // 뷰 사용으로 복잡한 JOIN 제거
    let query = db('v_consultations_full');
    
    // 권한 필터링
    if (req.user.role === 'teacher') {
      query = query.where('teacher_id', req.user.user_id);
    }
    
    // 검색 필터
    if (search) {
      query = query.where(function() {
        this.where('student_code', 'like', `%${search}%`)
          .orWhere('student_name_ko', 'like', `%${search}%`)
          .orWhere('content_ko', 'like', `%${search}%`);
      });
    }
    
    // 특정 학생 필터
    if (student_id) {
      query = query.where('student_id', student_id);
    }
    
    // 전체 개수
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    
    // 페이지네이션
    const consultations = await query
      .orderBy('consultation_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    // action_items JSON 파싱
    const parsedConsultations = consultations.map(consultation => {
      try {
        if (consultation.action_items && typeof consultation.action_items === 'string') {
          const parsed = JSON.parse(consultation.action_items);
          return {
            ...consultation,
            action_items: parsed,
            // 개별 필드로도 노출
            improvements: parsed.improvements || '',
            next_goals: parsed.next_goals || '',
            student_opinion: parsed.student_opinion || '',
            counselor_evaluation: parsed.counselor_evaluation || ''
          };
        }
      } catch (e) {
        // JSON 파싱 실패시 원본 반환
      }
      return consultation;
    });
    
    console.log(`✅ Found ${consultations.length} consultations`);
    
    res.json({
      success: true,
      data: parsedConsultations,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Get consultations error:', error);
    res.status(500).json({ 
      error: 'Failed to get consultations',
      message: error.message 
    });
  }
});

// ============================
// 상담 생성
// ============================
router.post('/', async (req, res) => {
  console.log('➕ POST /api/consultations - Creating');
  
  try {
    const {
      student_id,
      consultation_date,
      consultation_type = 'general_consultation',  // 기본값 수정
      content_ko,
      content_vi,
      // 평가 관련 필드
      evaluation_category,
      evaluation_period,
      evaluation_data,
      overall_score,
      // JSON 구조화된 필드들
      improvements,      // 개선점
      next_goals,        // 다음 목표  
      student_opinion,   // 학생 의견
      counselor_evaluation, // 상담사 평가 (필수)
      // 또는 통합된 action_items
      action_items,
      next_consultation_date
    } = req.body;
    
    // 필수 필드 검증
    if (!student_id || !consultation_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        message_ko: '필수 항목을 입력해주세요'
      });
    }
    
    // 상담 카테고리가 consultation인 경우 content_ko 필수
    if (evaluation_category === 'consultation' && !content_ko) {
      return res.status(400).json({
        error: 'Content is required for consultations',
        message_ko: '상담 내용은 필수 항목입니다'
      });
    }
    
    // 평가 카테고리인 경우 evaluation_data 필수
    if (evaluation_category === 'evaluation' && !evaluation_data) {
      return res.status(400).json({
        error: 'Evaluation data is required',
        message_ko: '평가 데이터는 필수 항목입니다'
      });
    }
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', student_id)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크 (교사는 자기 유학원 학생만)
    if (req.user.role === 'teacher') {
      const agency = await db('agencies')
        .where('agency_id', student.agency_id)
        .first();
      
      if (agency.created_by !== req.user.user_id) {
        return res.status(403).json({
          error: 'Access denied',
          message_ko: '권한이 없습니다'
        });
      }
    }
    
    // action_items를 JSON 구조로 구성
    let structuredActionItems = action_items;
    
    // 개별 필드가 제공된 경우 JSON으로 구조화
    if (improvements || next_goals || student_opinion || counselor_evaluation) {
      structuredActionItems = JSON.stringify({
        improvements: improvements || '',
        next_goals: next_goals || '',
        student_opinion: student_opinion || '',
        counselor_evaluation: counselor_evaluation || '',
        timestamp: new Date().toISOString()
      });
    } else if (action_items && typeof action_items === 'object') {
      // 이미 객체로 받은 경우
      structuredActionItems = JSON.stringify(action_items);
    }
    
    // 상담 생성
    const [consultation] = await db('consultations')
      .insert({
        student_id,
        teacher_id: req.user.user_id,
        consultation_date,
        consultation_type,
        content_ko: content_ko || '',
        content_vi: content_vi || '',
        action_items: structuredActionItems || '',
        next_consultation_date: next_consultation_date || null,
        // 평가 관련 필드
        evaluation_category: evaluation_category || null,
        evaluation_period: evaluation_period || null,
        evaluation_data: evaluation_data ? JSON.stringify(evaluation_data) : null,
        overall_score: overall_score || null,
        writer_role: req.user.role || 'teacher'
      })
      .returning('consultation_id');
    
    // 뷰에서 완전한 정보 조회
    const fullConsultation = await db('v_consultations_full')
      .where('consultation_id', consultation.consultation_id)
      .first();
    
    console.log('✅ Consultation created:', consultation.consultation_id);
    
    res.status(201).json({
      success: true,
      message: '상담 기록이 저장되었습니다',
      data: fullConsultation
    });
    
  } catch (error) {
    console.error('❌ Create consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to create consultation',
      message: error.message
    });
  }
});

// ============================
// 상담 수정
// ============================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      consultation_date,
      consultation_type,
      content_ko,
      content_vi,
      // 평가 관련 필드
      evaluation_category,
      evaluation_period,
      evaluation_data,
      overall_score,
      // JSON 구조화된 필드들
      improvements,
      next_goals,
      student_opinion,
      counselor_evaluation,
      action_items,
      next_consultation_date
    } = req.body;
    
    // 존재 확인
    const existing = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!existing) {
      return res.status(404).json({
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크
    if (req.user.role === 'teacher' && existing.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '수정 권한이 없습니다'
      });
    }
    
    // action_items를 JSON 구조로 구성
    let structuredActionItems = action_items;
    
    if (improvements || next_goals || student_opinion || counselor_evaluation) {
      structuredActionItems = JSON.stringify({
        improvements: improvements || '',
        next_goals: next_goals || '',
        student_opinion: student_opinion || '',
        counselor_evaluation: counselor_evaluation || '',
        timestamp: new Date().toISOString()
      });
    } else if (action_items && typeof action_items === 'object') {
      structuredActionItems = JSON.stringify(action_items);
    }
    
    // 업데이트
    await db('consultations')
      .where('consultation_id', id)
      .update({
        consultation_date,
        consultation_type,
        content_ko: content_ko || '',
        content_vi: content_vi || '',
        action_items: structuredActionItems || '',
        next_consultation_date: next_consultation_date || null,
        // 평가 관련 필드
        evaluation_category: evaluation_category || null,
        evaluation_period: evaluation_period || null,
        evaluation_data: evaluation_data ? JSON.stringify(evaluation_data) : null,
        overall_score: overall_score || null
      });
    
    // 뷰에서 업데이트된 정보 조회
    const updated = await db('v_consultations_full')
      .where('consultation_id', id)
      .first();
    
    res.json({
      success: true,
      message: '상담 기록이 수정되었습니다',
      data: updated
    });
    
  } catch (error) {
    console.error('❌ Update consultation error:', error);
    res.status(500).json({
      error: 'Failed to update consultation',
      message: error.message
    });
  }
});

// ============================
// 상담 삭제
// ============================
// ============================
// 상담 개별 조회
// ============================
router.get('/:id', async (req, res) => {
  console.log('GET /:id route hit with id:', req.params.id);
  
  try {
    const { id } = req.params;
    
    // Check if 'types' was incorrectly caught here
    if (id === 'types') {
      console.log('WARNING: /types route not properly matched, falling through to /:id');
      return res.status(404).json({
        error: 'Route not found',
        message: 'Use /consultations/types for types endpoint'
      });
    }
    
    const consultation = await db('v_consultations_full')
      .where('consultation_id', id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // action_items JSON 파싱
    if (consultation.action_items && typeof consultation.action_items === 'string') {
      try {
        const parsed = JSON.parse(consultation.action_items);
        consultation.action_items = parsed;
        consultation.improvements = parsed.improvements || '';
        consultation.next_goals = parsed.next_goals || '';
        consultation.student_opinion = parsed.student_opinion || '';
        consultation.counselor_evaluation = parsed.counselor_evaluation || '';
      } catch (e) {
        console.log('action_items is not JSON:', consultation.action_items);
      }
    }
    
    res.json({
      success: true,
      data: consultation
    });
    
  } catch (error) {
    console.error('❌ Get consultation error:', error);
    res.status(500).json({
      error: 'Failed to get consultation',
      message: error.message
    });
  }
});

// ============================
// 상담 삭제
// ============================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 존재 확인
    const existing = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!existing) {
      return res.status(404).json({
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크
    if (req.user.role !== 'admin' && existing.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '삭제 권한이 없습니다'
      });
    }
    
    // 삭제
    await db('consultations')
      .where('consultation_id', id)
      .delete();
    
    res.json({
      success: true,
      message: '상담 기록이 삭제되었습니다'
    });
    
  } catch (error) {
    console.error('❌ Delete consultation error:', error);
    res.status(500).json({
      error: 'Failed to delete consultation',
      message: error.message
    });
  }
});


module.exports = router;