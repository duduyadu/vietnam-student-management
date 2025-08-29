const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');

// 모든 라우트에 인증 미들웨어 적용
router.use(verifyToken);

// 유학원 목록 조회 (캐싱 적용)
router.get('/', 
  cacheMiddleware('agencies_list', 1800), // 30분 캐싱
  async (req, res) => {
  try {
    const agencies = await db('agencies')
      .select('agency_id', 'agency_name', 'agency_code', 'contact_person', 'phone', 'email')
      .orderBy('agency_name', 'asc');
    
    res.json({
      success: true,
      data: agencies
    });
  } catch (error) {
    console.error('Get agencies error:', error);
    res.status(500).json({ 
      error: 'Failed to get agencies',
      message: error.message 
    });
  }
});

// 유학원 추가 (관리자만)
router.post('/', async (req, res) => {
  try {
    // 관리자 권한 체크
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied',
        message_ko: '관리자만 유학원을 등록할 수 있습니다'
      });
    }

    const { agency_name, agency_code, contact_person, phone, email, address } = req.body;

    // 필수 필드 체크
    if (!agency_name || !agency_code) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message_ko: '유학원명과 코드는 필수입니다'
      });
    }

    // 유학원 코드 중복 체크
    const existing = await db('agencies')
      .where('agency_code', agency_code)
      .first();
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Agency code already exists',
        message_ko: '이미 존재하는 유학원 코드입니다'
      });
    }

    // 유학원 추가
    const [newAgency] = await db('agencies')
      .insert({
        agency_name,
        agency_code,
        contact_person,
        phone,
        email,
        address,
        created_by: req.user.user_id
      })
      .returning('*');

    // 캐시 무효화
    invalidateCache('agencies');
    
    res.status(201).json({
      success: true,
      data: newAgency,
      message_ko: '유학원이 성공적으로 등록되었습니다'
    });
  } catch (error) {
    console.error('Create agency error:', error);
    res.status(500).json({ 
      error: 'Failed to create agency',
      message: error.message 
    });
  }
});

// 유학원 수정 (관리자만)
router.put('/:id', async (req, res) => {
  try {
    // 관리자 권한 체크
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied',
        message_ko: '관리자만 유학원 정보를 수정할 수 있습니다'
      });
    }

    const { agency_name, contact_person, phone, email, address } = req.body;
    
    await db('agencies')
      .where('agency_id', req.params.id)
      .update({
        agency_name,
        contact_person,
        phone,
        email,
        address
      });

    // 캐시 무효화
    invalidateCache('agencies');
    
    res.json({
      success: true,
      message_ko: '유학원 정보가 수정되었습니다'
    });
  } catch (error) {
    console.error('Update agency error:', error);
    res.status(500).json({ 
      error: 'Failed to update agency',
      message: error.message 
    });
  }
});

// 유학원 삭제 (관리자만)
router.delete('/:id', async (req, res) => {
  try {
    // 관리자 권한 체크
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Access denied',
        message_ko: '관리자만 유학원을 삭제할 수 있습니다'
      });
    }

    // 해당 유학원에 속한 학생이 있는지 체크
    const students = await db('students')
      .where('agency_id', req.params.id)
      .first();
    
    if (students) {
      return res.status(400).json({ 
        error: 'Cannot delete agency with students',
        message_ko: '학생이 등록된 유학원은 삭제할 수 없습니다'
      });
    }

    await db('agencies')
      .where('agency_id', req.params.id)
      .delete();

    // 캐시 무효화
    invalidateCache('agencies');
    
    res.json({
      success: true,
      message_ko: '유학원이 삭제되었습니다'
    });
  } catch (error) {
    console.error('Delete agency error:', error);
    res.status(500).json({ 
      error: 'Failed to delete agency',
      message: error.message 
    });
  }
});

module.exports = router;