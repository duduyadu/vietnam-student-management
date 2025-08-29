const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

console.log('Consultations router loaded (SIMPLE VERSION)');

router.use(verifyToken);

// 상담 기록 생성 - 간단한 버전
router.post('/', async (req, res) => {
  console.log('=== POST /api/consultations ===');
  console.log('Body:', JSON.stringify(req.body));
  console.log('User:', req.user);
  
  try {
    const {
      student_id,
      consultation_date,
      consultation_type = 'in_person',  // 'academic' 대신 'in_person' 사용 (DB 제약조건에 맞춤)
      content_ko,
      content_vi,
      action_items,
      next_consultation_date
    } = req.body;
    
    // 필수 필드 검증
    if (!student_id || !consultation_date || !content_ko) {
      console.log('Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message_ko: '필수 항목을 모두 입력해주세요'
      });
    }
    
    console.log('Inserting consultation...');
    console.log('🔍 DEBUG - req.user:', JSON.stringify(req.user, null, 2));
    console.log('🔍 DEBUG - req.user.user_id:', req.user.user_id);
    
    const insertData = {
      student_id,
      teacher_id: req.user.user_id,
      consultation_date,
      consultation_type,
      content_ko,
      content_vi: content_vi || '',
      action_items: action_items || '',
      next_consultation_date: next_consultation_date || null,
      created_by: req.user.user_id // created_by 추가
    };
    
    console.log('🔍 DEBUG - Consultation insert data:', JSON.stringify(insertData, null, 2));
    
    // 상담 기록 생성 - PostgreSQL은 returning 사용
    const result = await db('consultations')
      .insert(insertData)
      .returning('consultation_id');
    
    // PostgreSQL은 배열로 반환, ID 추출
    const consultation_id = Array.isArray(result) 
      ? result[0].consultation_id || result[0]
      : result.consultation_id || result;
    console.log('Created consultation ID:', consultation_id);
    
    // 간단한 응답 - 조회 없이 바로 반환
    res.status(201).json({
      success: true,
      data: {
        consultation_id,
        student_id,
        teacher_id: req.user.user_id,
        consultation_date,
        consultation_type,
        content_ko,
        content_vi: content_vi || '',
        action_items: action_items || '',
        next_consultation_date: next_consultation_date || null
      },
      message: 'Consultation created successfully'
    });
    
  } catch (error) {
    console.error('=== CREATE ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Failed to create consultation',
      message: error.message
    });
  }
});

// 상담 기록 목록 조회
router.get('/', async (req, res) => {
  console.log('GET /api/consultations');
  
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // consultation_view 사용 (이미 데이터베이스에 생성됨)
    const consultations = await db('consultation_view')
      .orderBy('consultation_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    const totalCount = await db('consultation_view').count('* as count');
    
    res.json({
      success: true,
      data: consultations,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalCount[0].count / limit),
        total_items: parseInt(totalCount[0].count),
        items_per_page: parseInt(limit)
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
      .where('consultation_id', req.params.id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({ 
        error: 'Consultation not found'
      });
    }
    
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

// 상담 기록 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    await db('consultations')
      .where('consultation_id', id)
      .update({
        ...updateData,
        updated_at: new Date()
      });
    
    res.json({
      success: true,
      message: 'Consultation updated successfully'
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to update consultation'
    });
  }
});

// 상담 기록 삭제
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
      error: 'Failed to delete consultation'
    });
  }
});

module.exports = router;