const express = require('express');
const router = express.Router();
const knex = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// 학습 메트릭스 목록 조회
router.get('/', verifyToken, async (req, res) => {
  try {
    const { student_id, start_date, end_date } = req.query;
    
    let query = knex('learning_metrics')
      .select('learning_metrics.*', 's.name_ko', 's.name_vi')
      .leftJoin('students as s', 'learning_metrics.student_id', 's.id')
      .orderBy('metric_date', 'desc');
    
    if (student_id) {
      query = query.where('student_id', student_id);
    }
    
    if (start_date) {
      query = query.where('metric_date', '>=', start_date);
    }
    
    if (end_date) {
      query = query.where('metric_date', '<=', end_date);
    }
    
    const metrics = await query;
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching learning metrics:', error);
    res.status(500).json({ error: '학습 메트릭스 조회 실패' });
  }
});

// 특정 학생의 최신 메트릭스 조회
router.get('/student/:studentId/latest', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const latestMetric = await knex('learning_metrics')
      .where('student_id', studentId)
      .orderBy('metric_date', 'desc')
      .first();
    
    res.json(latestMetric || {});
  } catch (error) {
    console.error('Error fetching latest metric:', error);
    res.status(500).json({ error: '최신 메트릭스 조회 실패' });
  }
});

// 학습 메트릭스 생성
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      student_id,
      metric_date,
      attendance_rate,
      total_class_days,
      attended_days,
      class_participation,
      participation_notes,
      vocabulary_progress,
      target_words,
      learned_words,
      vocabulary_test_score,
      teacher_comment
    } = req.body;
    
    // 자동으로 월 정보 생성
    const metric_month = metric_date ? metric_date.substring(0, 7) : null;
    
    // 종합 점수 계산 (출석률 30% + 참여도 40% + 단어학습 30%)
    let overall_score = 0;
    if (attendance_rate !== undefined && class_participation !== undefined && vocabulary_progress !== undefined) {
      overall_score = (attendance_rate * 0.3) + 
                     (class_participation * 20 * 0.4) + // 5점 만점을 100점으로 환산
                     (vocabulary_progress * 0.3);
    }
    
    const [newMetric] = await knex('learning_metrics')
      .insert({
        student_id,
        metric_date,
        metric_month,
        attendance_rate,
        total_class_days,
        attended_days,
        class_participation,
        participation_notes,
        vocabulary_progress,
        target_words,
        learned_words,
        vocabulary_test_score,
        overall_score,
        teacher_comment,
        created_by: req.user.user_id
      })
      .returning('*');
    
    res.status(201).json(newMetric);
  } catch (error) {
    console.error('Error creating learning metric:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: '해당 날짜의 메트릭스가 이미 존재합니다' });
    } else {
      res.status(500).json({ error: '학습 메트릭스 생성 실패' });
    }
  }
});

// 학습 메트릭스 수정
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // 종합 점수 재계산
    if (updateData.attendance_rate !== undefined && 
        updateData.class_participation !== undefined && 
        updateData.vocabulary_progress !== undefined) {
      updateData.overall_score = (updateData.attendance_rate * 0.3) + 
                                 (updateData.class_participation * 20 * 0.4) +
                                 (updateData.vocabulary_progress * 0.3);
    }
    
    updateData.updated_at = knex.fn.now();
    
    const [updatedMetric] = await knex('learning_metrics')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    if (!updatedMetric) {
      return res.status(404).json({ error: '메트릭스를 찾을 수 없습니다' });
    }
    
    res.json(updatedMetric);
  } catch (error) {
    console.error('Error updating learning metric:', error);
    res.status(500).json({ error: '학습 메트릭스 수정 실패' });
  }
});

// 학습 메트릭스 삭제
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await knex('learning_metrics')
      .where('id', id)
      .del();
    
    if (!deleted) {
      return res.status(404).json({ error: '메트릭스를 찾을 수 없습니다' });
    }
    
    res.json({ message: '학습 메트릭스가 삭제되었습니다' });
  } catch (error) {
    console.error('Error deleting learning metric:', error);
    res.status(500).json({ error: '학습 메트릭스 삭제 실패' });
  }
});

// 학생별 평균 통계 조회
router.get('/student/:studentId/summary', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { period } = req.query; // last3months, last6months, all
    
    let query = knex('learning_metrics')
      .where('student_id', studentId)
      .select(
        knex.raw('AVG(attendance_rate) as avg_attendance'),
        knex.raw('AVG(class_participation) as avg_participation'),
        knex.raw('AVG(vocabulary_progress) as avg_vocabulary'),
        knex.raw('AVG(overall_score) as avg_overall_score'),
        knex.raw('COUNT(*) as total_records'),
        knex.raw('MAX(metric_date) as latest_date'),
        knex.raw('MIN(metric_date) as earliest_date')
      );
    
    if (period === 'last3months') {
      query = query.where('metric_date', '>=', knex.raw("CURRENT_DATE - INTERVAL '3 months'"));
    } else if (period === 'last6months') {
      query = query.where('metric_date', '>=', knex.raw("CURRENT_DATE - INTERVAL '6 months'"));
    }
    
    const [summary] = await query;
    res.json(summary);
  } catch (error) {
    console.error('Error fetching student summary:', error);
    res.status(500).json({ error: '학생 통계 조회 실패' });
  }
});

module.exports = router;