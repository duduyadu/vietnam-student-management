const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getClient } = require('../config/database');

// 대시보드 통계 API
router.get('/stats', verifyToken, async (req, res) => {
  const client = await getClient();
  
  try {
    // 전체 학생 수
    const totalStudentsResult = await client.query(
      'SELECT COUNT(*) FROM students'
    );
    const totalStudents = parseInt(totalStudentsResult.rows[0].count) || 0;

    // 재학 중 학생 수 (status가 active 또는 status가 없거나 'graduated'가 아닌 학생)
    const activeStudentsResult = await client.query(`
      SELECT COUNT(*) FROM students 
      WHERE (status = 'active' OR status IS NULL OR status != 'graduated')
    `);
    const activeStudents = parseInt(activeStudentsResult.rows[0].count) || 0;

    // 졸업생 수
    const graduatedStudentsResult = await client.query(`
      SELECT COUNT(*) FROM students 
      WHERE status = 'graduated'
    `);
    const graduatedStudents = parseInt(graduatedStudentsResult.rows[0].count) || 0;

    // 이번 달 상담 건수
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    const monthlyConsultationsResult = await client.query(`
      SELECT COUNT(*) FROM consultations 
      WHERE consultation_date >= $1 
      AND consultation_date <= $2
    `, [firstDayOfMonth, lastDayOfMonth]);
    const monthlyConsultations = parseInt(monthlyConsultationsResult.rows[0].count) || 0;

    // 최근 활동 (최근 5개 상담)
    const recentActivitiesResult = await client.query(`
      SELECT 
        c.consultation_id,
        c.consultation_date,
        c.consultation_type,
        c.content_ko as summary,
        s.student_id,
        s.student_code,
        s.name_ko as student_name
      FROM consultations c
      LEFT JOIN students s ON c.student_id = s.student_id
      ORDER BY c.consultation_date DESC
      LIMIT 5
    `);
    const recentActivities = recentActivitiesResult.rows;

    // 다가오는 상담 일정 (향후 7일 이내)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const upcomingConsultationsResult = await client.query(`
      SELECT 
        c.consultation_id,
        c.consultation_date,
        c.consultation_type,
        s.student_id,
        s.student_code,
        s.name_ko as student_name
      FROM consultations c
      LEFT JOIN students s ON c.student_id = s.student_id
      WHERE c.consultation_date >= CURRENT_DATE 
      AND c.consultation_date <= $1
      ORDER BY c.consultation_date ASC
      LIMIT 5
    `, [futureDate]);
    const upcomingConsultations = upcomingConsultationsResult.rows;

    // 통계 데이터 반환
    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          activeStudents,
          graduatedStudents,
          monthlyConsultations
        },
        recentActivities,
        upcomingConsultations
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: '대시보드 통계를 가져오는데 실패했습니다.',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;