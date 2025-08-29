const express = require('express');
const router = express.Router();
const knex = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// 인성평가 목록 조회
router.get('/', verifyToken, async (req, res) => {
  try {
    const { student_id, evaluation_period } = req.query;
    
    let query = knex('character_evaluations')
      .select('character_evaluations.*', 's.name_ko', 's.name_vi')
      .leftJoin('students as s', 'character_evaluations.student_id', 's.id')
      .orderBy('evaluation_date', 'desc');
    
    if (student_id) {
      query = query.where('student_id', student_id);
    }
    
    if (evaluation_period) {
      query = query.where('evaluation_period', evaluation_period);
    }
    
    const evaluations = await query;
    res.json(evaluations);
  } catch (error) {
    console.error('Error fetching character evaluations:', error);
    res.status(500).json({ error: '인성평가 조회 실패' });
  }
});

// 특정 학생의 최신 평가 조회
router.get('/student/:studentId/latest', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const latestEvaluation = await knex('character_evaluations')
      .where('student_id', studentId)
      .orderBy('evaluation_date', 'desc')
      .first();
    
    res.json(latestEvaluation || {});
  } catch (error) {
    console.error('Error fetching latest evaluation:', error);
    res.status(500).json({ error: '최신 평가 조회 실패' });
  }
});

// 인성평가 생성
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      student_id,
      evaluation_date,
      evaluation_period,
      social_relationship,
      social_notes,
      class_attitude,
      attitude_notes,
      korea_adaptation,
      adaptation_notes,
      growth_potential,
      growth_notes,
      leadership,
      responsibility,
      creativity,
      communication,
      strengths,
      improvement_areas,
      counselor_opinion,
      teacher_opinion
    } = req.body;
    
    // 전체 인성 점수 계산 (모든 항목의 평균)
    const scores = [
      social_relationship,
      class_attitude,
      korea_adaptation,
      growth_potential,
      leadership,
      responsibility,
      creativity,
      communication
    ].filter(score => score !== undefined && score !== null);
    
    const overall_character_score = scores.length > 0 
      ? (scores.reduce((a, b) => a + b, 0) / scores.length) * 20 // 5점 만점을 100점으로 환산
      : null;
    
    const [newEvaluation] = await knex('character_evaluations')
      .insert({
        student_id,
        evaluation_date,
        evaluation_period,
        social_relationship,
        social_notes,
        class_attitude,
        attitude_notes,
        korea_adaptation,
        adaptation_notes,
        growth_potential,
        growth_notes,
        leadership,
        responsibility,
        creativity,
        communication,
        overall_character_score,
        strengths,
        improvement_areas,
        counselor_opinion,
        teacher_opinion,
        evaluated_by: req.user.user_id
      })
      .returning('*');
    
    res.status(201).json(newEvaluation);
  } catch (error) {
    console.error('Error creating character evaluation:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: '해당 날짜의 평가가 이미 존재합니다' });
    } else {
      res.status(500).json({ error: '인성평가 생성 실패' });
    }
  }
});

// 인성평가 수정
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // 전체 인성 점수 재계산
    const scores = [
      updateData.social_relationship,
      updateData.class_attitude,
      updateData.korea_adaptation,
      updateData.growth_potential,
      updateData.leadership,
      updateData.responsibility,
      updateData.creativity,
      updateData.communication
    ].filter(score => score !== undefined && score !== null);
    
    if (scores.length > 0) {
      updateData.overall_character_score = (scores.reduce((a, b) => a + b, 0) / scores.length) * 20;
    }
    
    updateData.updated_at = knex.fn.now();
    
    const [updatedEvaluation] = await knex('character_evaluations')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    if (!updatedEvaluation) {
      return res.status(404).json({ error: '평가를 찾을 수 없습니다' });
    }
    
    res.json(updatedEvaluation);
  } catch (error) {
    console.error('Error updating character evaluation:', error);
    res.status(500).json({ error: '인성평가 수정 실패' });
  }
});

// 인성평가 삭제
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await knex('character_evaluations')
      .where('id', id)
      .del();
    
    if (!deleted) {
      return res.status(404).json({ error: '평가를 찾을 수 없습니다' });
    }
    
    res.json({ message: '인성평가가 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting character evaluation:', error);
    res.status(500).json({ error: '인성평가 삭제 실패' });
  }
});

// 학생별 평가 추이 조회
router.get('/student/:studentId/trend', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { limit = 5 } = req.query;
    
    const trend = await knex('character_evaluations')
      .where('student_id', studentId)
      .select(
        'evaluation_date',
        'evaluation_period',
        'social_relationship',
        'class_attitude',
        'korea_adaptation',
        'growth_potential',
        'leadership',
        'responsibility',
        'creativity',
        'communication',
        'overall_character_score'
      )
      .orderBy('evaluation_date', 'desc')
      .limit(limit);
    
    res.json(trend);
  } catch (error) {
    console.error('Error fetching evaluation trend:', error);
    res.status(500).json({ error: '평가 추이 조회 실패' });
  }
});

// 전체 학생 평균 통계
router.get('/statistics', verifyToken, async (req, res) => {
  try {
    const { evaluation_period } = req.query;
    
    let query = knex('character_evaluations')
      .select(
        knex.raw('AVG(social_relationship) as avg_social'),
        knex.raw('AVG(class_attitude) as avg_attitude'),
        knex.raw('AVG(korea_adaptation) as avg_adaptation'),
        knex.raw('AVG(growth_potential) as avg_growth'),
        knex.raw('AVG(leadership) as avg_leadership'),
        knex.raw('AVG(responsibility) as avg_responsibility'),
        knex.raw('AVG(creativity) as avg_creativity'),
        knex.raw('AVG(communication) as avg_communication'),
        knex.raw('AVG(overall_character_score) as avg_overall'),
        knex.raw('COUNT(DISTINCT student_id) as total_students')
      );
    
    if (evaluation_period) {
      query = query.where('evaluation_period', evaluation_period);
    }
    
    const [statistics] = await query;
    res.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: '통계 조회 실패' });
  }
});

module.exports = router;