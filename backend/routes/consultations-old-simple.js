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
      consultation_type = 'academic',
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
    
    // 상담 기록 생성
    const result = await db('consultations').insert({
      student_id,
      teacher_id: req.user.user_id,
      consultation_date,
      consultation_type,
      content_ko,
      content_vi: content_vi || '',
      action_items: action_items || '',
      next_consultation_date: next_consultation_date || null
    });
    
    const consultation_id = result[0];
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
    const consultations = await db('consultations')
      .select('*')
      .orderBy('consultation_date', 'desc')
      .limit(100);
    
    res.json({
      success: true,
      data: consultations
    });
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ 
      error: 'Failed to get consultations'
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