const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

console.log('🚀 Agencies router OPTIMIZED - With ID generation system');

router.use(verifyToken);

// ============================
// 유학원 목록 조회 (최적화)
// ============================
router.get('/', async (req, res) => {
  try {
    const agencies = await db('agencies')
      .select('agency_id', 'agency_name', 'agency_code', 'contact_person', 'phone', 'email', 'address')
      .orderBy('agency_code', 'asc');
    
    res.json({
      success: true,
      data: agencies
    });
  } catch (error) {
    console.error('❌ Get agencies error:', error);
    res.status(500).json({ 
      error: 'Failed to get agencies',
      message: error.message 
    });
  }
});

// ============================
// 유학원 생성 (자동 코드 생성)
// ============================
router.post('/', async (req, res) => {
  try {
    const { agency_name, contact_person, phone, email, address } = req.body;
    
    if (!agency_name) {
      return res.status(400).json({
        error: 'Agency name is required',
        message_ko: '유학원 이름은 필수입니다'
      });
    }
    
    // 다음 유학원 코드 생성 (PostgreSQL 호환)
    const nextCode = await db.raw(`
      SELECT LPAD(
        (COALESCE(MAX(CAST(agency_code AS INTEGER)), 0) + 1)::text, 
        3, 
        '0'
      ) as next_code
      FROM agencies
      WHERE agency_code ~ '^[0-9]{3}$'
    `);
    
    const agency_code = nextCode.rows[0].next_code;
    
    // 유학원 생성
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
    
    console.log(`✅ Created new agency: ${agency_name} with code: ${agency_code}`);
    
    res.status(201).json({
      success: true,
      message: '유학원이 생성되었습니다',
      data: newAgency
    });
    
  } catch (error) {
    console.error('❌ Create agency error:', error);
    res.status(500).json({
      error: 'Failed to create agency',
      message: error.message
    });
  }
});

// ============================
// 유학원 정보 수정
// ============================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { agency_name, contact_person, phone, email, address } = req.body;
    
    const [updated] = await db('agencies')
      .where('agency_id', id)
      .update({
        agency_name,
        contact_person,
        phone,
        email,
        address,
        updated_at: new Date()
      })
      .returning('*');
    
    if (!updated) {
      return res.status(404).json({
        error: 'Agency not found',
        message_ko: '유학원을 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      message: '유학원 정보가 수정되었습니다',
      data: updated
    });
    
  } catch (error) {
    console.error('❌ Update agency error:', error);
    res.status(500).json({
      error: 'Failed to update agency',
      message: error.message
    });
  }
});

// ============================
// 유학원 삭제
// ============================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 학생이 있는지 확인
    const [{ count }] = await db('students')
      .where('agency_id', id)
      .count('* as count');
    
    if (count > 0) {
      return res.status(400).json({
        error: 'Cannot delete agency with students',
        message_ko: '학생이 등록된 유학원은 삭제할 수 없습니다'
      });
    }
    
    const deleted = await db('agencies')
      .where('agency_id', id)
      .delete();
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Agency not found',
        message_ko: '유학원을 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      message: '유학원이 삭제되었습니다'
    });
    
  } catch (error) {
    console.error('❌ Delete agency error:', error);
    res.status(500).json({
      error: 'Failed to delete agency',
      message: error.message
    });
  }
});

module.exports = router;