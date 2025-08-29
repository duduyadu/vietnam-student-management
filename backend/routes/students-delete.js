const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

router.use(verifyToken);

// ============================
// 완전히 새로운 삭제 로직
// ============================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    
    console.log(`🗑️ Delete request for student ID: ${id}, force: ${force}`);
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', id)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    console.log(`📋 Found student: ${student.student_code} (${student.name_ko})`);
    
    // 권한 체크 (관리자만)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '삭제 권한이 없습니다'
      });
    }
    
    // 관련 데이터 확인
    const relatedData = {};
    let hasRelatedData = false;
    
    // 상담 기록 확인
    const consultationResult = await db('consultations')
      .where('student_id', id)
      .count('* as count');
    const consultationCount = parseInt(consultationResult[0].count) || 0;
    if (consultationCount > 0) {
      hasRelatedData = true;
      relatedData.consultations = consultationCount;
    }
    
    // student_attributes 확인
    const attrResult = await db('student_attributes')
      .where('student_id', id)
      .count('* as count')
      .catch(() => [{ count: 0 }]);
    const attrCount = parseInt(attrResult[0].count) || 0;
    if (attrCount > 0) {
      hasRelatedData = true;
      relatedData.student_attributes = attrCount;
    }
    
    console.log(`📊 Related data:`, relatedData);
    
    // 삭제 처리 결정
    if (hasRelatedData && force !== 'true') {
      // 소프트 삭제: archived 상태로 변경
      console.log('📦 Soft delete - archiving student');
      
      await db('students')
        .where('student_id', id)
        .update({
          status: 'archived',
          updated_at: new Date()
        });
      
      return res.json({
        success: true,
        message: '학생이 보관 처리되었습니다',
        message_ko: '학생이 보관 처리되었습니다',
        soft_delete: true,
        archived: true,
        related_data: relatedData
      });
    }
    
    // 하드 삭제: CASCADE DELETE 활용
    console.log('🔥 Hard delete - removing student and all related data');
    
    try {
      // CASCADE DELETE가 설정되어 있으므로 학생만 삭제하면 됨
      const deleted = await db('students')
        .where('student_id', id)
        .delete();
      
      if (deleted) {
        console.log(`✅ Successfully deleted student ${student.student_code}`);
        
        return res.json({
          success: true,
          message: '학생이 완전히 삭제되었습니다',
          message_ko: '학생이 완전히 삭제되었습니다',
          hard_delete: true,
          deleted_student: student.student_code,
          cascaded_deletions: relatedData
        });
      } else {
        throw new Error('Failed to delete student');
      }
    } catch (deleteError) {
      console.error('Delete error:', deleteError);
      
      // CASCADE가 실패한 경우 수동으로 삭제 시도
      if (deleteError.code === '23503') {
        console.log('⚠️ CASCADE failed, trying manual deletion...');
        
        await db.transaction(async (trx) => {
          // 관련 테이블 수동 삭제
          await trx('consultations').where('student_id', id).delete();
          await trx('student_attributes').where('student_id', id).delete().catch(() => {});
          await trx('exam_results').where('student_id', id).delete().catch(() => {});
          await trx('learning_progress').where('student_id', id).delete().catch(() => {});
          await trx('academic_goals').where('student_id', id).delete().catch(() => {});
          await trx('generated_reports').where('student_id', id).delete().catch(() => {});
          
          // 학생 삭제
          await trx('students').where('student_id', id).delete();
        });
        
        return res.json({
          success: true,
          message: '학생과 관련 데이터가 삭제되었습니다',
          message_ko: '학생과 관련 데이터가 삭제되었습니다',
          manual_cascade: true
        });
      }
      
      throw deleteError;
    }
    
  } catch (error) {
    console.error('❌ Delete student error:', error);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    
    res.status(500).json({
      error: 'Failed to delete student',
      message: error.message,
      code: error.code
    });
  }
});

module.exports = router;