const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');

// 선생님 평가 목록 조회 (학생별)
router.get('/student/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type, status, limit = 10, offset = 0 } = req.query;
    
    let query = db('teacher_evaluations as te')
      .leftJoin('users as u', 'te.teacher_id', 'u.user_id')
      .where('te.student_id', studentId)
      .select(
        'te.*',
        'u.full_name as current_teacher_name',
        'u.agency_name as current_teacher_agency'
      );
    
    // 필터 적용
    if (type) query = query.where('te.evaluation_type', type);
    if (status) query = query.where('te.status', status);
    
    // 권한에 따른 필터
    if (req.user.role === 'teacher') {
      // 선생님은 자신의 평가 또는 공유된 평가만 볼 수 있음
      query = query.where(function() {
        this.where('te.teacher_id', req.user.user_id)
          .orWhere('te.status', 'shared');
      });
    }
    
    const evaluations = await query
      .orderBy('te.evaluation_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    // 총 개수 조회
    const countQuery = db('teacher_evaluations')
      .where('student_id', studentId);
    
    if (type) countQuery.where('evaluation_type', type);
    if (status) countQuery.where('status', status);
    
    const [{ count }] = await countQuery.count('* as count');
    
    res.json({
      success: true,
      data: evaluations,
      pagination: {
        total: parseInt(count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Failed to fetch evaluations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch evaluations' 
    });
  }
});

// 특정 평가 상세 조회
router.get('/:evaluationId', verifyToken, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    
    const evaluation = await db('teacher_evaluations as te')
      .leftJoin('users as u', 'te.teacher_id', 'u.user_id')
      .leftJoin('students as s', 'te.student_id', 's.student_id')
      .where('te.evaluation_id', evaluationId)
      .select(
        'te.*',
        'u.full_name as current_teacher_name',
        'u.agency_name as current_teacher_agency',
        's.name_ko as student_name_korean',
        's.name_vi as student_name_vietnamese',
        's.student_code'
      )
      .first();
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation not found'
      });
    }
    
    // 권한 확인
    if (req.user.role === 'teacher') {
      if (evaluation.teacher_id !== req.user.user_id && evaluation.status !== 'shared') {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }
    
    // 평가 항목별 점수 조회
    const scores = await db('evaluation_scores')
      .where('evaluation_id', evaluationId)
      .orderBy('category', 'asc')
      .orderBy('item', 'asc');
    
    // 열람 기록 추가
    await db('evaluation_views').insert({
      evaluation_id: evaluationId,
      viewer_id: req.user.user_id,
      viewer_type: req.user.role,
      viewed_at: new Date()
    });
    
    res.json({
      success: true,
      data: {
        ...evaluation,
        scores
      }
    });
  } catch (error) {
    console.error('Failed to fetch evaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evaluation'
    });
  }
});

// 새 평가 생성
router.post('/', verifyToken, async (req, res) => {
  try {
    // 선생님과 관리자만 평가 생성 가능
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers and admins can create evaluations'
      });
    }
    
    const evaluationData = {
      ...req.body,
      teacher_id: req.user.user_id,
      teacher_name: req.user.full_name,
      teacher_agency: req.user.agency_name,
      evaluation_date: req.body.evaluation_date || new Date(),
      status: 'draft'
    };
    
    // 트랜잭션 시작
    const trx = await db.transaction();
    
    try {
      // 평가 생성
      const [evaluation] = await trx('teacher_evaluations')
        .insert(evaluationData)
        .returning('*');
      
      // 점수 항목이 있으면 추가
      if (req.body.scores && req.body.scores.length > 0) {
        const scores = req.body.scores.map(score => ({
          evaluation_id: evaluation.evaluation_id,
          category: score.category,
          item: score.item,
          score: score.score,
          comment: score.comment
        }));
        
        await trx('evaluation_scores').insert(scores);
      }
      
      await trx.commit();
      
      res.status(201).json({
        success: true,
        data: evaluation,
        message: '평가가 생성되었습니다.'
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Failed to create evaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create evaluation'
    });
  }
});

// 평가 수정
router.put('/:evaluationId', verifyToken, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    
    // 평가 조회
    const evaluation = await db('teacher_evaluations')
      .where('evaluation_id', evaluationId)
      .first();
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation not found'
      });
    }
    
    // 권한 확인 (작성자 또는 관리자만 수정 가능)
    if (evaluation.teacher_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // 승인된 평가는 수정 불가
    if (evaluation.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify approved evaluation'
      });
    }
    
    const trx = await db.transaction();
    
    try {
      // 평가 업데이트
      const updatedData = {
        ...req.body,
        updated_at: new Date()
      };
      
      // teacher_id는 변경 불가
      delete updatedData.teacher_id;
      delete updatedData.evaluation_id;
      
      await trx('teacher_evaluations')
        .where('evaluation_id', evaluationId)
        .update(updatedData);
      
      // 점수 업데이트
      if (req.body.scores) {
        // 기존 점수 삭제
        await trx('evaluation_scores')
          .where('evaluation_id', evaluationId)
          .delete();
        
        // 새 점수 추가
        if (req.body.scores.length > 0) {
          const scores = req.body.scores.map(score => ({
            evaluation_id: evaluationId,
            category: score.category,
            item: score.item,
            score: score.score,
            comment: score.comment
          }));
          
          await trx('evaluation_scores').insert(scores);
        }
      }
      
      await trx.commit();
      
      res.json({
        success: true,
        message: '평가가 수정되었습니다.'
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Failed to update evaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update evaluation'
    });
  }
});

// 평가 상태 변경
router.patch('/:evaluationId/status', verifyToken, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    const { status } = req.body;
    
    // 유효한 상태값 확인
    const validStatuses = ['draft', 'submitted', 'approved', 'shared'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const evaluation = await db('teacher_evaluations')
      .where('evaluation_id', evaluationId)
      .first();
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation not found'
      });
    }
    
    // 권한 확인
    if (status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Only admins can approve evaluations'
      });
    }
    
    if (evaluation.teacher_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const updateData = {
      status,
      updated_at: new Date()
    };
    
    // 승인 시 승인자 정보 추가
    if (status === 'approved') {
      updateData.approved_by = req.user.user_id;
      updateData.approved_at = new Date();
    }
    
    await db('teacher_evaluations')
      .where('evaluation_id', evaluationId)
      .update(updateData);
    
    res.json({
      success: true,
      message: `평가 상태가 ${status}로 변경되었습니다.`
    });
  } catch (error) {
    console.error('Failed to update evaluation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update evaluation status'
    });
  }
});

// 평가 삭제
router.delete('/:evaluationId', verifyToken, async (req, res) => {
  try {
    const { evaluationId } = req.params;
    
    const evaluation = await db('teacher_evaluations')
      .where('evaluation_id', evaluationId)
      .first();
    
    if (!evaluation) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation not found'
      });
    }
    
    // 작성자 또는 관리자만 삭제 가능
    if (evaluation.teacher_id !== req.user.user_id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // 승인된 평가는 관리자만 삭제 가능
    if (evaluation.status === 'approved' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete approved evaluation'
      });
    }
    
    await db('teacher_evaluations')
      .where('evaluation_id', evaluationId)
      .delete();
    
    res.json({
      success: true,
      message: '평가가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Failed to delete evaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete evaluation'
    });
  }
});

// 최신 평가 요약 조회 (대시보드용)
router.get('/summary/latest', verifyToken, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    let query = db('teacher_evaluations as te')
      .leftJoin('students as s', 'te.student_id', 's.student_id')
      .leftJoin('users as u', 'te.teacher_id', 'u.user_id')
      .select(
        'te.evaluation_id',
        'te.evaluation_date',
        'te.evaluation_type',
        'te.overall_rating',
        'te.status',
        's.name_ko as student_name',
        's.student_code',
        'u.full_name as teacher_name'
      );
    
    // 권한에 따른 필터
    if (req.user.role === 'teacher') {
      query = query.where('te.teacher_id', req.user.user_id);
    }
    
    const evaluations = await query
      .orderBy('te.evaluation_date', 'desc')
      .limit(limit);
    
    res.json({
      success: true,
      data: evaluations
    });
  } catch (error) {
    console.error('Failed to fetch evaluation summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evaluation summary'
    });
  }
});

// 평가 통계 조회
router.get('/stats/:studentId', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // 전체 평가 수
    const [totalCount] = await db('teacher_evaluations')
      .where('student_id', studentId)
      .count('* as count');
    
    // 평가 유형별 수
    const typeCount = await db('teacher_evaluations')
      .where('student_id', studentId)
      .groupBy('evaluation_type')
      .select('evaluation_type')
      .count('* as count');
    
    // 최근 평가 평균
    const recentAverage = await db('teacher_evaluations')
      .where('student_id', studentId)
      .where('status', 'approved')
      .whereRaw("evaluation_date >= NOW() - INTERVAL '6 months'")
      .select(
        db.raw('AVG(CASE overall_rating WHEN \'excellent\' THEN 4 WHEN \'good\' THEN 3 WHEN \'average\' THEN 2 WHEN \'poor\' THEN 1 END) as avg_rating')
      );
    
    res.json({
      success: true,
      data: {
        total: totalCount.count,
        byType: typeCount,
        recentAverage: recentAverage[0].avg_rating
      }
    });
  } catch (error) {
    console.error('Failed to fetch evaluation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch evaluation stats'
    });
  }
});

module.exports = router;