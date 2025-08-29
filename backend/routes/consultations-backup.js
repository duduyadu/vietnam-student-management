const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth');
const db = require('../config/database');

console.log('Consultations router loaded (NEW VERSION)');

router.use(verifyToken);

// 상담 기록 목록 조회
router.get('/', async (req, res) => {
  console.log('GET /api/consultations called');
  try {
    const { page = 1, limit = 10, search = '', student_id, teacher_id } = req.query;
    const offset = (page - 1) * limit;
    
    let query = db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id');
    
    // 권한에 따른 필터링
    if (req.user.role === 'teacher') {
      query = query.where(function() {
        this.where('consultations.teacher_id', req.user.user_id)
          .orWhere('students.agency_id', req.user.user_id);
      });
    }
    
    // 검색 필터
    if (search) {
      query = query.where(function() {
        this.where('students.student_code', 'like', `%${search}%`)
          .orWhere('consultations.content_ko', 'like', `%${search}%`);
      });
    }
    
    // 특정 학생 필터
    if (student_id) {
      query = query.where('consultations.student_id', student_id);
    }
    
    // 특정 교사 필터
    if (teacher_id && req.user.role === 'admin') {
      query = query.where('consultations.teacher_id', teacher_id);
    }
    
    // 전체 개수 조회
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    
    // 페이지네이션 적용
    const consultations = await query
      .orderBy('consultations.consultation_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    // 각 상담 기록에 학생 이름 추가
    for (let consultation of consultations) {
      const nameAttr = await db('student_attributes')
        .where({ student_id: consultation.student_id, attribute_key: 'name' })
        .first();
      consultation.student_name = nameAttr ? nameAttr.attribute_value : '이름 없음';
    }
    
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
    console.error('Get consultations error:', error);
    res.status(500).json({ 
      error: 'Failed to get consultations',
      message: error.message 
    });
  }
});

// 특정 상담 기록 조회
router.get('/:id', async (req, res) => {
  try {
    const consultation = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', req.params.id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({ 
        error: {
          message: 'Consultation not found',
          message_ko: '상담 기록을 찾을 수 없습니다'
        }
      });
    }
    
    // 권한 체크
    if (req.user.role === 'teacher' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({ 
        error: {
          message: 'Access denied',
          message_ko: '접근 권한이 없습니다'
        }
      });
    }
    
    // 학생 이름 추가
    const nameAttr = await db('student_attributes')
      .where({ student_id: consultation.student_id, attribute_key: 'name' })
      .first();
    consultation.student_name = nameAttr ? nameAttr.attribute_value : '이름 없음';
    
    res.json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to get consultation' 
    });
  }
});

// 상담 기록 생성
router.post('/', async (req, res) => {
  console.log('POST /api/consultations - Creating new consultation');
  console.log('Request body:', req.body);
  
  try {
    const {
      student_id,
      consultation_date,
      consultation_type = 'academic',
      content_ko,
      content_vi,
      action_items,
      next_consultation_date
    } = req.body;
    
    // 필수 필드 검증
    if (!student_id || !consultation_date || !content_ko) {
      return res.status(400).json({
        error: {
          message: 'Missing required fields',
          message_ko: '필수 항목을 모두 입력해주세요'
        }
      });
    }
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', student_id)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: {
          message: 'Student not found',
          message_ko: '학생을 찾을 수 없습니다'
        }
      });
    }
    
    // 교사는 자신의 학원 학생만 상담 가능
    if (req.user.role === 'teacher' && 
        student.agency_id !== req.user.user_id) {
      return res.status(403).json({
        error: {
          message: 'You can only create consultations for your agency students',
          message_ko: '자신의 학원 학생에 대해서만 상담 기록을 작성할 수 있습니다'
        }
      });
    }
    
    console.log('Inserting consultation into database...');
    
    // 상담 기록 생성
    const result = await db('consultations').insert({
      student_id,
      teacher_id: req.user.user_id,
      consultation_date,
      consultation_type,
      content_ko,
      content_vi,
      action_items,
      next_consultation_date
    });
    
    // SQLite는 insert 결과로 lastID를 반환
    const consultation_id = result[0];
    console.log('Created consultation with ID:', consultation_id);
    
    // 생성된 상담 기록 조회 (간단한 버전)
    const newConsultation = await db('consultations')
      .select('*')
      .where('consultation_id', consultation_id)
      .first();
    
    // 추가 정보 조회
    const teacher = await db('users')
      .select('full_name')
      .where('user_id', req.user.user_id)
      .first();
    
    // 학생 이름 조회
    const nameAttr = await db('student_attributes')
      .where({ student_id: student_id, attribute_key: 'name' })
      .first();
    
    // 응답 데이터 구성
    const responseData = {
      ...newConsultation,
      student_code: student.student_code,
      teacher_name: teacher ? teacher.full_name : '알 수 없음',
      student_name: nameAttr ? nameAttr.attribute_value : '이름 없음'
    };
    
    console.log('Consultation created successfully:', responseData);
    
    res.status(201).json({
      success: true,
      data: responseData,
      message: 'Consultation created successfully'
    });
  } catch (error) {
    console.error('Create consultation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to create consultation',
      message: error.message,
      details: error.stack
    });
  }
});

// 상담 기록 수정
router.put('/:id', async (req, res) => {
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
    const consultation = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({
        error: {
          message: 'Consultation not found',
          message_ko: '상담 기록을 찾을 수 없습니다'
        }
      });
    }
    
    // 권한 체크 (작성자만 수정 가능)
    if (req.user.role !== 'admin' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: {
          message: 'You can only edit your own consultations',
          message_ko: '자신이 작성한 상담 기록만 수정할 수 있습니다'
        }
      });
    }
    
    // 업데이트
    await db('consultations')
      .where('consultation_id', id)
      .update({
        consultation_date,
        consultation_type,
        content_ko,
        content_vi,
        action_items,
        next_consultation_date,
        updated_at: new Date()
      });
    
    // 업데이트된 상담 기록 조회
    const updatedConsultation = await db('consultations')
      .select('*')
      .where('consultation_id', id)
      .first();
    
    // 추가 정보 조회
    const student = await db('students')
      .where('student_id', updatedConsultation.student_id)
      .first();
    
    const teacher = await db('users')
      .select('full_name')
      .where('user_id', updatedConsultation.teacher_id)
      .first();
    
    const nameAttr = await db('student_attributes')
      .where({ student_id: updatedConsultation.student_id, attribute_key: 'name' })
      .first();
    
    // 응답 데이터 구성
    const responseData = {
      ...updatedConsultation,
      student_code: student ? student.student_code : '',
      teacher_name: teacher ? teacher.full_name : '알 수 없음',
      student_name: nameAttr ? nameAttr.attribute_value : '이름 없음'
    };
    
    res.json({
      success: true,
      data: responseData,
      message: 'Consultation updated successfully'
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to update consultation',
      message: error.message
    });
  }
});

// 상담 기록 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 상담 기록 존재 확인
    const consultation = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({
        error: {
          message: 'Consultation not found',
          message_ko: '상담 기록을 찾을 수 없습니다'
        }
      });
    }
    
    // 권한 체크 (작성자 또는 관리자만 삭제 가능)
    if (req.user.role !== 'admin' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: {
          message: 'You can only delete your own consultations',
          message_ko: '자신이 작성한 상담 기록만 삭제할 수 있습니다'
        }
      });
    }
    
    // 삭제
    await db('consultations')
      .where('consultation_id', id)
      .del();
    
    res.json({
      success: true,
      message: 'Consultation deleted successfully'
    });
  } catch (error) {
    console.error('Delete consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to delete consultation',
      message: error.message
    });
  }
});

module.exports = router;