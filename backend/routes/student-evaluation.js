const express = require('express');
const router = express.Router();
const { getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth');

// 학생 학업 데이터 조회
router.get('/:studentId/academic-data', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    
    const result = await client.query(
      'SELECT * FROM student_academic_data WHERE student_id = $1 LIMIT 1',
      [studentId]
    );
    
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ 
        success: true, 
        data: {
          attendance_rate: 0,
          participation_grade: 'C',
          vocabulary_known: 0,
          strength_areas: '',
          weakness_areas: '',
          learning_strategy: ''
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch academic data:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch academic data' });
  }
});

// 학생 포트폴리오 조회
router.get('/:studentId/portfolio', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    
    const result = await client.query(
      'SELECT * FROM student_portfolio WHERE student_id = $1 LIMIT 1',
      [studentId]
    );
    
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ 
        success: true, 
        data: {
          club_activities: '',
          volunteer_activities: '',
          awards: '',
          portfolio_status: '',
          student_opinion: ''
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch portfolio:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch portfolio' });
  }
});

// 학생 생활 평가 조회
router.get('/:studentId/evaluation', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    
    const result = await client.query(
      'SELECT * FROM student_life_evaluation WHERE student_id = $1 LIMIT 1',
      [studentId]
    );
    
    if (result.rows.length > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ 
        success: true, 
        data: {
          social_rating: 'average',
          social_relationship: '',
          attitude_rating: 'average',
          class_attitude: '',
          adaptation_rating: 'average',
          adaptation_level: '',
          growth_rating: 'average',
          growth_potential: '',
          academic_evaluation: '',
          korean_evaluation: '',
          final_recommendation: ''
        }
      });
    }
  } catch (error) {
    console.error('Failed to fetch evaluation:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch evaluation' });
  }
});

// 학업 데이터 저장/업데이트
router.post('/:studentId/academic-data', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    
    // 기존 데이터 확인
    const existing = await client.query(
      'SELECT id FROM student_academic_data WHERE student_id = $1',
      [studentId]
    );
    
    if (existing.rows.length > 0) {
      // 업데이트
      await client.query(
        `UPDATE student_academic_data 
         SET attendance_rate = $1, participation_grade = $2, vocabulary_known = $3,
             strength_areas = $4, weakness_areas = $5, learning_strategy = $6,
             updated_at = NOW()
         WHERE student_id = $7`,
        [
          req.body.attendance_rate || 0,
          req.body.participation_grade || 'C',
          req.body.vocabulary_known || 0,
          req.body.strength_areas || '',
          req.body.weakness_areas || '',
          req.body.learning_strategy || '',
          studentId
        ]
      );
    } else {
      // 새로 삽입
      await client.query(
        `INSERT INTO student_academic_data 
         (student_id, attendance_rate, participation_grade, vocabulary_known,
          strength_areas, weakness_areas, learning_strategy)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          studentId,
          req.body.attendance_rate || 0,
          req.body.participation_grade || 'C',
          req.body.vocabulary_known || 0,
          req.body.strength_areas || '',
          req.body.weakness_areas || '',
          req.body.learning_strategy || ''
        ]
      );
    }
    
    res.json({ success: true, message: '학업 데이터가 저장되었습니다.' });
  } catch (error) {
    console.error('Failed to save academic data:', error);
    console.error('Error details:', error.message);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save academic data',
      details: error.message 
    });
  } finally {
  }
});

// 포트폴리오 저장/업데이트
router.post('/:studentId/portfolio', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    
    // 기존 데이터 확인
    const existing = await client.query(
      'SELECT id FROM student_portfolio WHERE student_id = $1',
      [studentId]
    );
    
    if (existing.rows.length > 0) {
      // 업데이트
      await client.query(
        `UPDATE student_portfolio 
         SET club_activities = $1, volunteer_activities = $2, awards = $3,
             portfolio_status = $4, student_opinion = $5, updated_at = NOW()
         WHERE student_id = $6`,
        [
          req.body.club_activities,
          req.body.volunteer_activities,
          req.body.awards,
          req.body.portfolio_status,
          req.body.student_opinion,
          studentId
        ]
      );
    } else {
      // 새로 삽입
      await client.query(
        `INSERT INTO student_portfolio 
         (student_id, club_activities, volunteer_activities, awards,
          portfolio_status, student_opinion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          studentId,
          req.body.club_activities,
          req.body.volunteer_activities,
          req.body.awards,
          req.body.portfolio_status,
          req.body.student_opinion
        ]
      );
    }
    
    res.json({ success: true, message: '포트폴리오가 저장되었습니다.' });
  } catch (error) {
    console.error('Failed to save portfolio:', error);
    res.status(500).json({ success: false, error: 'Failed to save portfolio' });
  } finally {
  }
});

// 생활 평가 저장/업데이트
router.post('/:studentId/evaluation', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    
    // 기존 데이터 확인
    const existing = await client.query(
      'SELECT id FROM student_life_evaluation WHERE student_id = $1',
      [studentId]
    );
    
    if (existing.rows.length > 0) {
      // 업데이트
      await client.query(
        `UPDATE student_life_evaluation 
         SET social_rating = $1, social_relationship = $2, attitude_rating = $3,
             class_attitude = $4, adaptation_rating = $5, adaptation_level = $6,
             growth_rating = $7, growth_potential = $8, academic_evaluation = $9,
             korean_evaluation = $10, final_recommendation = $11, updated_at = NOW()
         WHERE student_id = $12`,
        [
          req.body.social_rating,
          req.body.social_relationship,
          req.body.attitude_rating,
          req.body.class_attitude,
          req.body.adaptation_rating,
          req.body.adaptation_level,
          req.body.growth_rating,
          req.body.growth_potential,
          req.body.academic_evaluation,
          req.body.korean_evaluation,
          req.body.final_recommendation,
          studentId
        ]
      );
    } else {
      // 새로 삽입
      await client.query(
        `INSERT INTO student_life_evaluation 
         (student_id, social_rating, social_relationship, attitude_rating,
          class_attitude, adaptation_rating, adaptation_level, growth_rating,
          growth_potential, academic_evaluation, korean_evaluation, final_recommendation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          studentId,
          req.body.social_rating,
          req.body.social_relationship,
          req.body.attitude_rating,
          req.body.class_attitude,
          req.body.adaptation_rating,
          req.body.adaptation_level,
          req.body.growth_rating,
          req.body.growth_potential,
          req.body.academic_evaluation,
          req.body.korean_evaluation,
          req.body.final_recommendation
        ]
      );
    }
    
    res.json({ success: true, message: '생활 평가가 저장되었습니다.' });
  } catch (error) {
    console.error('Failed to save evaluation:', error);
    res.status(500).json({ success: false, error: 'Failed to save evaluation' });
  } finally {
  }
});

// 출석 기록 추가
router.post('/:studentId/attendance', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    const { date, status, notes } = req.body;
    
    // 중복 체크
    const existing = await client.query(
      'SELECT id FROM attendance_records WHERE student_id = $1 AND attendance_date = $2',
      [studentId, date]
    );
    
    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE attendance_records SET status = $1, notes = $2 WHERE id = $3',
        [status, notes, existing.rows[0].id]
      );
    } else {
      await client.query(
        'INSERT INTO attendance_records (student_id, attendance_date, status, notes) VALUES ($1, $2, $3, $4)',
        [studentId, date, status, notes]
      );
    }
    
    res.json({ success: true, message: '출석 기록이 저장되었습니다.' });
  } catch (error) {
    console.error('Failed to save attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to save attendance' });
  } finally {
  }
});

// 출석 기록 조회
router.get('/:studentId/attendance', verifyToken, async (req, res) => {
  const client = await getClient();
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM attendance_records WHERE student_id = $1';
    const params = [studentId];
    
    if (startDate) {
      query += ' AND attendance_date >= $' + (params.length + 1);
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND attendance_date <= $' + (params.length + 1);
      params.push(endDate);
    }
    
    query += ' ORDER BY attendance_date DESC';
    
    const result = await client.query(query, params);
    
    // 출석률 계산
    let attendanceRate = 0;
    if (result.rows.length > 0) {
      const presentCount = result.rows.filter(r => 
        r.status === 'present' || r.status === 'late'
      ).length;
      attendanceRate = Math.round((presentCount / result.rows.length) * 100);
    }
    
    res.json({ 
      success: true, 
      data: result.rows,
      attendanceRate
    });
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
  } finally {
  }
});

module.exports = router;