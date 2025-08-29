const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const recordGenerator = require('../services/student-record-generator');
const pdfGenerator = require('../services/pdf-generator');
const db = require('../config/database');

router.use(verifyToken);

/**
 * 학생 생활기록부 자동 생성 데이터 조회
 */
router.get('/generate/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log(`📝 Generating comprehensive record for student ${studentId}`);
    
    // 자동 생성
    const record = await recordGenerator.generateComprehensiveRecord(studentId);
    
    res.json({
      success: true,
      data: record
    });
    
  } catch (error) {
    console.error('❌ Record generation error:', error);
    res.status(500).json({
      error: 'Failed to generate record',
      message: error.message
    });
  }
});

/**
 * 생활기록부 PDF 자동 생성 (풍부한 내용 포함)
 */
router.post('/generate-pdf/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { consultationId } = req.body;
    
    console.log(`📄 Generating enhanced PDF for student ${studentId}`);
    
    // 자동 생성 데이터 가져오기
    const autoRecord = await recordGenerator.generateComprehensiveRecord(studentId);
    
    // 기존 PDF 생성 데이터와 병합
    const existingData = await pdfGenerator.fetchReportData(consultationId || 1, studentId);
    
    // 자동 생성 내용으로 보강
    const enhancedData = {
      ...existingData,
      
      // 자동 생성된 평가 내용들
      attitude_evaluation: autoRecord.attitude_evaluation,
      korean_development: autoRecord.growth_story,
      study_strategy: autoRecord.learning_strategy,
      academic_evaluation: autoRecord.attitude_evaluation,
      
      // 단어 학습 진도 추가
      vocabulary_progress: autoRecord.vocabulary_progress ? 
        `필수 1000단어 중 ${autoRecord.vocabulary_progress.known_words}단어 습득 (${autoRecord.vocabulary_progress.percentage}%)` 
        : '측정 중',
      
      // 강점과 개선 노력
      strengths: autoRecord.topik_analysis.strengths_weaknesses?.strengths 
        ? `${autoRecord.topik_analysis.strengths_weaknesses.strengths.join(', ')} 영역에서 특별한 강점을 보입니다.`
        : existingData.strengths,
      
      improvement_efforts: autoRecord.topik_analysis.pattern.description,
      
      // 추천사
      counselor_evaluation: autoRecord.recommendation,
      
      // 통계 정보
      topik_growth_trend: autoRecord.topik_analysis.pattern.pattern,
      average_grade: autoRecord.topik_analysis.average_score >= 140 ? 'A' 
        : autoRecord.topik_analysis.average_score >= 100 ? 'B' 
        : 'C',
      
      // 특별 활동
      special_achievements: autoRecord.special_achievements
        .map(a => `• ${a.date}: ${a.achievement}`)
        .join('\n') || existingData.special_achievements
    };
    
    // HTML 템플릿 로드 및 데이터 바인딩
    const fs = require('fs').promises;
    const path = require('path');
    const templatePath = path.join(__dirname, '..', 'templates', 'consultation-report.html');
    const template = await fs.readFile(templatePath, 'utf-8');
    const html = pdfGenerator.bindDataToTemplate(template, enhancedData);
    
    // PDF 생성
    const browser = await pdfGenerator.initBrowser();
    const page = await browser.newPage();
    
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    await page.close();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="student_record_${studentId}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ PDF generation error:', error);
    res.status(500).json({
      error: 'Failed to generate PDF',
      message: error.message
    });
  }
});

/**
 * 여러 학생의 생활기록부 일괄 생성
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const { studentIds } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds)) {
      return res.status(400).json({
        error: 'Student IDs array is required'
      });
    }
    
    console.log(`📚 Batch generating records for ${studentIds.length} students`);
    
    const results = [];
    const errors = [];
    
    for (const studentId of studentIds) {
      try {
        const record = await recordGenerator.generateComprehensiveRecord(studentId);
        results.push({
          studentId,
          success: true,
          record
        });
      } catch (error) {
        errors.push({
          studentId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      total: studentIds.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });
    
  } catch (error) {
    console.error('❌ Batch generation error:', error);
    res.status(500).json({
      error: 'Failed to batch generate records',
      message: error.message
    });
  }
});

/**
 * TOPIK 데이터 기반 예측 분석
 */
router.get('/predict/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // TOPIK 점수 이력 조회
    const scores = await db('exam_results')
      .where({
        student_id: studentId,
        exam_type: 'mock'
      })
      .whereRaw("exam_name LIKE '%TOPIK%'")
      .orderBy('exam_date', 'desc');
    
    if (scores.length < 3) {
      return res.json({
        success: false,
        message: '예측을 위한 충분한 데이터가 없습니다. (최소 3회 이상의 시험 기록 필요)'
      });
    }
    
    // 선형 회귀를 통한 다음 점수 예측
    const recentScores = scores.slice(0, 5).reverse();
    const scoreValues = recentScores.map(s => s.score);
    
    // 간단한 선형 추세 계산
    const n = scoreValues.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = scoreValues.reduce((a, b) => a + b, 0);
    const sumXY = scoreValues.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // 다음 회차 예측
    const nextPrediction = Math.round(intercept + slope * n);
    const nextPredictionAdjusted = Math.max(0, Math.min(200, nextPrediction)); // 0-200 범위 제한
    
    // 목표 도달 예상 시기 계산
    const targetScore = 140; // TOPIK 2급 안정권
    const testsToTarget = targetScore > nextPredictionAdjusted 
      ? Math.ceil((targetScore - intercept) / slope) - n
      : 0;
    
    res.json({
      success: true,
      analysis: {
        current_score: scores[0].score,
        current_level: scores[0].grade,
        trend_slope: slope.toFixed(2),
        next_prediction: nextPredictionAdjusted,
        tests_to_target: Math.max(0, testsToTarget),
        target_score: targetScore,
        confidence: scores.length >= 5 ? 'high' : 'medium',
        recommendation: slope > 5 ? '현재 학습 방법을 유지하세요!' 
          : slope > 0 ? '조금 더 집중적인 학습이 필요합니다.'
          : '학습 방법을 개선해보세요.'
      }
    });
    
  } catch (error) {
    console.error('❌ Prediction error:', error);
    res.status(500).json({
      error: 'Failed to generate prediction',
      message: error.message
    });
  }
});

module.exports = router;