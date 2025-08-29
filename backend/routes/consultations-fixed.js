const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

console.log('🚀 Consultations router FIXED - Direct name fields from students table');

router.use(verifyToken);

// ============================
// 상담 기록 목록 조회 (심플 버전)
// ============================
router.get('/', async (req, res) => {
  console.log('📋 GET /api/consultations - Fetching consultation list');
  
  try {
    const { page = 1, limit = 10, search = '', student_id } = req.query;
    const offset = (page - 1) * limit;
    
    // 1. 심플한 JOIN으로 모든 정보 가져오기
    let query = db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'students.name_ko as student_name_ko',
        'students.name_vi as student_name_vi',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id');
    
    // 권한 필터링
    if (req.user.role === 'teacher') {
      query = query.where('consultations.created_by', req.user.user_id);
    }
    
    // 검색 필터
    if (search) {
      query = query.where(function() {
        this.where('students.student_code', 'like', `%${search}%`)
          .orWhere('students.name_ko', 'like', `%${search}%`)
          .orWhere('consultations.content_ko', 'like', `%${search}%`);
      });
    }
    
    // 특정 학생 필터
    if (student_id) {
      query = query.where('consultations.student_id', student_id);
    }
    
    // 전체 개수 조회
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    
    // 페이지네이션 적용
    const consultations = await query
      .orderBy('consultations.consultation_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    console.log(`✅ Found ${consultations.length} consultations`);
    
    res.json({
      success: true,
      data: consultations,
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
// 특정 상담 기록 조회
// ============================
router.get('/:id', async (req, res) => {
  console.log(`📄 GET /api/consultations/${req.params.id}`);
  
  try {
    const consultation = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'students.name_ko as student_name_ko',
        'students.name_vi as student_name_vi',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', req.params.id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({ 
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크
    if (req.user.role === 'teacher' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message_ko: '접근 권한이 없습니다'
      });
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
// 상담 기록 생성
// ============================
router.post('/', async (req, res) => {
  console.log('➕ POST /api/consultations - Creating new consultation');
  console.log('Request body:', req.body);
  
  try {
    const {
      student_id,
      consultation_date,
      consultation_type = 'phone',
      content_ko,
      content_vi,
      action_items,
      next_consultation_date
    } = req.body;
    
    // 필수 필드 검증
    if (!student_id || !consultation_date || !content_ko) {
      console.log('⚠️ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message_ko: '필수 항목을 모두 입력해주세요'
      });
    }
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', student_id)
      .first();
    
    if (!student) {
      console.log('⚠️ Student not found:', student_id);
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    console.log('💾 Inserting consultation into database...');
    
    // 상담 기록 생성
    const [consultation] = await db('consultations')
      .insert({
        student_id,
        teacher_id: req.user.user_id,
        created_by: req.user.user_id,
        consultation_date,
        consultation_type,
        content_ko,
        content_vi: content_vi || '',
        action_items: action_items || '',
        next_consultation_date: next_consultation_date || null,
        notes: content_ko  // 검색용
      })
      .returning('*');
    
    console.log('✅ Consultation created with ID:', consultation.consultation_id);
    
    // 생성된 상담 기록을 학생 정보와 함께 조회
    const fullConsultation = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'students.name_ko as student_name_ko',
        'students.name_vi as student_name_vi',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', consultation.consultation_id)
      .first();
    
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
// 상담 기록 수정
// ============================
router.put('/:id', async (req, res) => {
  console.log(`📝 PUT /api/consultations/${req.params.id}`);
  
  try {
    const { id } = req.params;
    const {
      consultation_date,
      consultation_type,
      content_ko,
      content_vi,
      action_items,
      next_consultation_date
    } = req.body;
    
    // 상담 기록 존재 확인
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
    if (req.user.role === 'teacher' && 
        existing.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '수정 권한이 없습니다'
      });
    }
    
    // 업데이트
    await db('consultations')
      .where('consultation_id', id)
      .update({
        consultation_date,
        consultation_type,
        content_ko,
        content_vi: content_vi || '',
        action_items: action_items || '',
        next_consultation_date: next_consultation_date || null,
        notes: content_ko,  // 검색용
        updated_at: new Date()
      });
    
    // 업데이트된 상담 기록 조회
    const updated = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'students.name_ko as student_name_ko',
        'students.name_vi as student_name_vi',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', id)
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
// 상담 기록 삭제
// ============================
router.delete('/:id', async (req, res) => {
  console.log(`🗑️ DELETE /api/consultations/${req.params.id}`);
  
  try {
    const { id } = req.params;
    
    // 상담 기록 존재 확인
    const existing = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!existing) {
      return res.status(404).json({
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크 (관리자 또는 작성자만 삭제 가능)
    if (req.user.role !== 'admin' && 
        existing.teacher_id !== req.user.user_id) {
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