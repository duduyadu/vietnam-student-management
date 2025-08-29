const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

console.log('🎯 TOPIK Mock Exam router initialized');

router.use(verifyToken);

// ============================
// TOPIK 모의고사 목록 조회 (학생별)
// ============================
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', studentId)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    // TOPIK 모의고사 결과 조회 (8회차)
    const exams = await db('exam_results')
      .where({
        student_id: studentId,
        exam_type: 'mock',
        exam_name: 'TOPIK 모의고사'
      })
      .orderBy('exam_date', 'asc')
      .orderBy('semester', 'asc');
    
    // detailed_scores JSON 파싱
    const parsedExams = exams.map(exam => {
      try {
        if (exam.detailed_scores && typeof exam.detailed_scores === 'string') {
          exam.detailed_scores = JSON.parse(exam.detailed_scores);
        }
      } catch (e) {
        console.error('Failed to parse detailed_scores:', e);
      }
      return exam;
    });
    
    // 진전도 계산
    const progress = calculateProgress(parsedExams);
    
    res.json({
      success: true,
      data: {
        student: {
          student_id: student.student_id,
          student_code: student.student_code,
          name: student.name_ko
        },
        exams: parsedExams,
        progress: progress,
        total_exams: parsedExams.length,
        target_level: 2,
        target_score: 140 // TOPIK 2급 기준
      }
    });
    
  } catch (error) {
    console.error('❌ Get TOPIK exams error:', error);
    res.status(500).json({
      error: 'Failed to get TOPIK exams',
      message: error.message
    });
  }
});

// ============================
// TOPIK 모의고사 등록
// ============================
router.post('/', async (req, res) => {
  try {
    const {
      student_id,
      test_number,  // 1~8회차
      test_date,
      reading,      // 읽기 점수 (0-60)
      listening,    // 듣기 점수 (0-60)
      writing,      // 쓰기 점수 (0-50)
      teacher_comment
    } = req.body;
    
    // 필수 필드 검증
    if (!student_id || !test_number || !test_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        message_ko: '필수 항목을 입력해주세요'
      });
    }
    
    // 점수 검증
    if (reading < 0 || reading > 60 || 
        listening < 0 || listening > 60 || 
        writing < 0 || writing > 50) {
      return res.status(400).json({
        error: 'Invalid score range',
        message_ko: '점수 범위가 올바르지 않습니다'
      });
    }
    
    // 총점 및 등급 계산
    const total = reading + listening + writing;
    const achieved_level = total >= 140 ? 2 : (total >= 80 ? 1 : 0);
    
    // 이전 시험 결과 조회 (진전도 비교용)
    const previousExam = await db('exam_results')
      .where({
        student_id: student_id,
        exam_type: 'mock',
        exam_name: 'TOPIK 모의고사'
      })
      .orderBy('exam_date', 'desc')
      .first();
    
    let improvement = 0;
    if (previousExam && previousExam.score) {
      improvement = total - previousExam.score;
    }
    
    // detailed_scores JSON 구성
    const detailed_scores = JSON.stringify({
      reading: reading,
      listening: listening,
      writing: writing,
      total: total,
      target_level: 2,
      achieved_level: achieved_level,
      test_number: test_number,
      improvement: improvement,
      goal_distance: 140 - total // 목표까지 남은 점수
    });
    
    // 시험 결과 저장
    const [exam] = await db('exam_results')
      .insert({
        student_id: student_id,
        exam_name: 'TOPIK 모의고사',
        exam_type: 'mock',
        subject: '한국어',
        exam_date: test_date,
        semester: `${test_number}회차`,
        score: total,
        max_score: 170,  // TOPIK I 만점
        percentage: (total / 170 * 100).toFixed(2),
        grade: achieved_level === 2 ? '2급' : (achieved_level === 1 ? '1급' : '미달'),
        detailed_scores: detailed_scores,
        notes: teacher_comment || '',
        created_by: req.user.user_id
      })
      .returning('*');
    
    // 응답
    res.status(201).json({
      success: true,
      message: `TOPIK 모의고사 ${test_number}회차 성적이 등록되었습니다`,
      data: {
        exam_id: exam.exam_id,
        test_number: test_number,
        scores: {
          reading: reading,
          listening: listening,
          writing: writing,
          total: total
        },
        achieved_level: achieved_level,
        grade: exam.grade,
        improvement: improvement,
        goal_achievement: total >= 140
      }
    });
    
  } catch (error) {
    console.error('❌ Create TOPIK exam error:', error);
    res.status(500).json({
      error: 'Failed to create TOPIK exam',
      message: error.message
    });
  }
});

// ============================
// TOPIK 모의고사 수정
// ============================
router.put('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    const { reading, listening, writing, teacher_comment } = req.body;
    
    // 존재 확인
    const exam = await db('exam_results')
      .where('exam_id', examId)
      .first();
    
    if (!exam) {
      return res.status(404).json({
        error: 'Exam not found',
        message_ko: '시험 기록을 찾을 수 없습니다'
      });
    }
    
    // 총점 및 등급 재계산
    const total = reading + listening + writing;
    const achieved_level = total >= 140 ? 2 : (total >= 80 ? 1 : 0);
    
    // detailed_scores 업데이트
    const currentDetails = typeof exam.detailed_scores === 'string' 
      ? JSON.parse(exam.detailed_scores) 
      : exam.detailed_scores;
    
    const detailed_scores = JSON.stringify({
      ...currentDetails,
      reading: reading,
      listening: listening,
      writing: writing,
      total: total,
      achieved_level: achieved_level,
      goal_distance: 140 - total
    });
    
    // 업데이트
    await db('exam_results')
      .where('exam_id', examId)
      .update({
        score: total,
        percentage: (total / 170 * 100).toFixed(2),
        grade: achieved_level === 2 ? '2급' : (achieved_level === 1 ? '1급' : '미달'),
        detailed_scores: detailed_scores,
        notes: teacher_comment || '',
        updated_at: new Date()
      });
    
    res.json({
      success: true,
      message: 'TOPIK 모의고사 성적이 수정되었습니다',
      data: {
        exam_id: examId,
        scores: {
          reading: reading,
          listening: listening,
          writing: writing,
          total: total
        },
        achieved_level: achieved_level
      }
    });
    
  } catch (error) {
    console.error('❌ Update TOPIK exam error:', error);
    res.status(500).json({
      error: 'Failed to update TOPIK exam',
      message: error.message
    });
  }
});

// ============================
// TOPIK 모의고사 삭제
// ============================
router.delete('/:examId', async (req, res) => {
  try {
    const { examId } = req.params;
    
    // 권한 체크 (관리자만)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '삭제 권한이 없습니다'
      });
    }
    
    const deleted = await db('exam_results')
      .where('exam_id', examId)
      .delete();
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Exam not found',
        message_ko: '시험 기록을 찾을 수 없습니다'
      });
    }
    
    res.json({
      success: true,
      message: 'TOPIK 모의고사 기록이 삭제되었습니다'
    });
    
  } catch (error) {
    console.error('❌ Delete TOPIK exam error:', error);
    res.status(500).json({
      error: 'Failed to delete TOPIK exam',
      message: error.message
    });
  }
});

// ============================
// 전체 학생 TOPIK 현황 (대시보드용)
// ============================
router.get('/dashboard', async (req, res) => {
  try {
    // 최신 TOPIK 성적 요약
    const summary = await db.raw(`
      SELECT 
        s.student_id,
        s.student_code,
        s.name_ko,
        COUNT(e.exam_id) as total_exams,
        MAX(e.score) as best_score,
        AVG(e.score) as avg_score,
        MAX(CASE WHEN e.score >= 140 THEN 1 ELSE 0 END) as achieved_target
      FROM students s
      LEFT JOIN exam_results e ON s.student_id = e.student_id 
        AND e.exam_type = 'mock' 
        AND e.exam_name = 'TOPIK 모의고사'
      GROUP BY s.student_id, s.student_code, s.name_ko
      HAVING COUNT(e.exam_id) > 0
      ORDER BY achieved_target DESC, best_score DESC
    `);
    
    res.json({
      success: true,
      data: summary.rows,
      statistics: {
        total_students: summary.rows.length,
        achieved_target: summary.rows.filter(r => r.achieved_target === 1).length,
        in_progress: summary.rows.filter(r => r.achieved_target === 0).length
      }
    });
    
  } catch (error) {
    console.error('❌ Get dashboard error:', error);
    res.status(500).json({
      error: 'Failed to get dashboard data',
      message: error.message
    });
  }
});

// ============================
// Helper Functions
// ============================
function calculateProgress(exams) {
  if (!exams || exams.length === 0) {
    return {
      trend: 'no_data',
      improvement_rate: 0,
      consistency: 0
    };
  }
  
  // 진전도 계산
  const scores = exams.map(e => e.score || 0);
  const firstScore = scores[0];
  const lastScore = scores[scores.length - 1];
  const improvement = lastScore - firstScore;
  
  // 일관성 계산 (표준편차)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const consistency = 100 - (stdDev / mean * 100);
  
  return {
    trend: improvement > 0 ? 'improving' : (improvement < 0 ? 'declining' : 'stable'),
    improvement_rate: firstScore > 0 ? (improvement / firstScore * 100).toFixed(1) : 0,
    consistency: consistency.toFixed(1),
    total_improvement: improvement,
    average_score: mean.toFixed(1)
  };
}

module.exports = router;