const express = require('express');
const router = express.Router();
const knex = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// 특별활동 목록 조회
router.get('/', verifyToken, async (req, res) => {
  try {
    const { student_id, activity_type } = req.query;
    
    let query = knex('special_activities')
      .select('special_activities.*', 's.name_ko', 's.name_vi')
      .leftJoin('students as s', 'special_activities.student_id', 's.id')
      .orderBy('start_date', 'desc');
    
    if (student_id) {
      query = query.where('student_id', student_id);
    }
    
    if (activity_type) {
      query = query.where('activity_type', activity_type);
    }
    
    const activities = await query;
    res.json(activities);
  } catch (error) {
    console.error('Error fetching special activities:', error);
    res.status(500).json({ error: '특별활동 조회 실패' });
  }
});

// 특정 학생의 활동 요약 조회
router.get('/student/:studentId/summary', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const summary = await knex('special_activities')
      .where('student_id', studentId)
      .select(
        knex.raw("COUNT(CASE WHEN activity_type = 'club' THEN 1 END) as club_count"),
        knex.raw("COUNT(CASE WHEN activity_type = 'volunteer' THEN 1 END) as volunteer_count"),
        knex.raw("COUNT(CASE WHEN activity_type = 'award' THEN 1 END) as award_count"),
        knex.raw("COUNT(CASE WHEN activity_type = 'portfolio' THEN 1 END) as portfolio_count"),
        knex.raw('SUM(hours_participated) as total_hours'),
        knex.raw('AVG(impact_score) as avg_impact')
      )
      .first();
    
    const activities = await knex('special_activities')
      .where('student_id', studentId)
      .orderBy('start_date', 'desc');
    
    res.json({ summary, activities });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: '활동 요약 조회 실패' });
  }
});

// 특별활동 생성
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      student_id,
      activity_type,
      activity_name,
      activity_name_vi,
      start_date,
      end_date,
      is_ongoing,
      description,
      description_vi,
      achievement,
      document_url,
      certificate_url,
      hours_participated,
      teacher_evaluation,
      impact_score
    } = req.body;
    
    const [newActivity] = await knex('special_activities')
      .insert({
        student_id,
        activity_type,
        activity_name,
        activity_name_vi,
        start_date,
        end_date,
        is_ongoing,
        description,
        description_vi,
        achievement,
        document_url,
        certificate_url,
        hours_participated,
        teacher_evaluation,
        impact_score,
        created_by: req.user.user_id
      })
      .returning('*');
    
    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Error creating special activity:', error);
    res.status(500).json({ error: '특별활동 생성 실패' });
  }
});

// 특별활동 수정
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    updateData.updated_at = knex.fn.now();
    
    const [updatedActivity] = await knex('special_activities')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    if (!updatedActivity) {
      return res.status(404).json({ error: '특별활동을 찾을 수 없습니다' });
    }
    
    res.json(updatedActivity);
  } catch (error) {
    console.error('Error updating special activity:', error);
    res.status(500).json({ error: '특별활동 수정 실패' });
  }
});

// 특별활동 삭제
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await knex('special_activities')
      .where('id', id)
      .del();
    
    if (!deleted) {
      return res.status(404).json({ error: '특별활동을 찾을 수 없습니다' });
    }
    
    res.json({ message: '특별활동이 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting special activity:', error);
    res.status(500).json({ error: '특별활동 삭제 실패' });
  }
});

// 활동 유형별 통계
router.get('/statistics', verifyToken, async (req, res) => {
  try {
    const stats = await knex('special_activities')
      .select('activity_type')
      .count('* as count')
      .sum('hours_participated as total_hours')
      .avg('impact_score as avg_impact')
      .groupBy('activity_type');
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({ error: '활동 통계 조회 실패' });
  }
});

module.exports = router;