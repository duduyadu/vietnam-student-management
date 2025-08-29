const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { verifyToken } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const db = require('../config/database');

// 인증 미들웨어
router.use(verifyToken);

console.log('📊 TOPIK Scores Upload Router loaded');

/**
 * TOPIK 점수 엑셀 업로드
 * 샘플2.xlsx 형식의 파일을 처리
 */
router.post('/upload', 
  upload.single('file'), 
  handleMulterError,
  async (req, res) => {
    const trx = await db.transaction();
    
    try {
      console.log(`📤 TOPIK scores upload by ${req.user.email}`);
      
      if (!req.file) {
        return res.status(400).json({ 
          error: '파일이 업로드되지 않았습니다.' 
        });
      }
      
      // 엑셀 파일 읽기
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`📋 Found ${data.length} rows in Excel file`);
      
      const results = {
        success: 0,
        failed: 0,
        errors: [],
        processed: []
      };
      
      // 각 학생 데이터 처리
      for (const row of data) {
        try {
          // 학생 확인
          const student = await trx('students')
            .where('student_code', row['학생ID'])
            .first();
          
          if (!student) {
            results.errors.push(`학생 ${row['학생ID']} (${row['학생이름']})을 찾을 수 없습니다.`);
            results.failed++;
            continue;
          }
          
          // 회차별 점수 처리 (93, 94, 95회차)
          const testNumbers = [93, 94, 95];
          
          for (const testNum of testNumbers) {
            const listening = row[`${testNum}회차_듣기`];
            const reading = row[`${testNum}회차_읽기`];
            const total = row[`${testNum}회차_총점`];
            const level = row[`${testNum}회차_급수`];
            
            if (listening !== undefined && reading !== undefined) {
              // 기존 점수 확인
              const existingScore = await trx('exam_results')
                .where({
                  student_id: student.student_id,
                  exam_type: 'mock',
                  exam_name: 'TOPIK 모의고사'
                })
                .whereRaw('detailed_scores::jsonb @> ?', [JSON.stringify({ test_number: testNum })])
                .first();
              
              const examData = {
                student_id: student.student_id,
                exam_name: 'TOPIK 모의고사',
                exam_type: 'mock',
                subject: 'TOPIK',
                exam_date: new Date().toISOString().split('T')[0], // 실제 시험일로 변경 필요
                score: total || (listening + reading),
                max_score: 200,
                grade: level ? `${level}급` : null,
                detailed_scores: JSON.stringify({
                  test_number: testNum,
                  listening: listening,
                  reading: reading,
                  writing: 0, // TOPIK I은 쓰기 없음
                  total: total || (listening + reading)
                }),
                percentage: ((total || (listening + reading)) / 200) * 100,
                created_by: req.user.user_id
              };
              
              if (existingScore) {
                // 업데이트
                await trx('exam_results')
                  .where('exam_id', existingScore.exam_id)
                  .update({
                    ...examData,
                    updated_at: new Date()
                  });
              } else {
                // 새로 삽입
                await trx('exam_results').insert(examData);
              }
            }
          }
          
          // 현재 회차 처리
          if (row['현재회차'] && row['현재_듣기'] !== undefined) {
            const currentData = {
              student_id: student.student_id,
              exam_name: 'TOPIK 모의고사',
              exam_type: 'mock',
              subject: 'TOPIK',
              exam_date: new Date().toISOString().split('T')[0],
              score: row['현재_총점'],
              max_score: 200,
              grade: row['현재_급수'] ? `${row['현재_급수']}급` : null,
              detailed_scores: JSON.stringify({
                test_number: row['현재회차'],
                listening: row['현재_듣기'],
                reading: row['현재_읽기'],
                writing: 0,
                total: row['현재_총점']
              }),
              percentage: (row['현재_총점'] / 200) * 100,
              created_by: req.user.user_id
            };
            
            // 현재 회차 업데이트/삽입
            const existingCurrent = await trx('exam_results')
              .where({
                student_id: student.student_id,
                exam_type: 'mock',
                exam_name: 'TOPIK 모의고사'
              })
              .whereRaw('detailed_scores::jsonb @> ?', [JSON.stringify({ test_number: row['현재회차'] })])
              .first();
            
            if (existingCurrent) {
              await trx('exam_results')
                .where('exam_id', existingCurrent.exam_id)
                .update({
                  ...currentData,
                  updated_at: new Date()
                });
            } else {
              await trx('exam_results').insert(currentData);
            }
          }
          
          results.processed.push({
            student_code: row['학생ID'],
            student_name: row['학생이름'],
            scores_updated: true
          });
          results.success++;
          
        } catch (error) {
          console.error(`Error processing student ${row['학생ID']}:`, error);
          results.errors.push(`${row['학생ID']}: ${error.message}`);
          results.failed++;
        }
      }
      
      // 트랜잭션 커밋
      await trx.commit();
      
      console.log(`✅ Processed: ${results.success} success, ${results.failed} failed`);
      
      res.json({
        success: true,
        message: `TOPIK 점수 업로드 완료`,
        results: {
          total: data.length,
          success: results.success,
          failed: results.failed,
          errors: results.errors,
          processed: results.processed
        }
      });
      
    } catch (error) {
      await trx.rollback();
      console.error('❌ TOPIK scores upload error:', error);
      res.status(500).json({ 
        error: 'TOPIK 점수 업로드 중 오류가 발생했습니다.',
        message: error.message 
      });
    }
  }
);

/**
 * TOPIK 점수 템플릿 다운로드
 */
router.get('/template', (req, res) => {
  try {
    // 템플릿 데이터
    const templateData = [{
      '학생ID': 'VN001',
      '학생이름': '홍길동',
      '유학원': '대한유학원',
      '93회차_듣기': 50,
      '93회차_읽기': 50,
      '93회차_총점': 100,
      '93회차_급수': 1,
      '94회차_듣기': 60,
      '94회차_읽기': 55,
      '94회차_총점': 115,
      '94회차_급수': 2,
      '95회차_듣기': 65,
      '95회차_읽기': 60,
      '95회차_총점': 125,
      '95회차_급수': 2,
      '현재회차': 95,
      '현재_듣기': 65,
      '현재_읽기': 60,
      '현재_총점': 125,
      '현재_급수': 2
    }];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '점수표');
    
    // 열 너비 설정
    ws['!cols'] = [
      {wch: 10}, {wch: 12}, {wch: 15},
      {wch: 12}, {wch: 12}, {wch: 12}, {wch: 10},
      {wch: 12}, {wch: 12}, {wch: 12}, {wch: 10},
      {wch: 12}, {wch: 12}, {wch: 12}, {wch: 10},
      {wch: 10}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 10}
    ];
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="topik_scores_template.xlsx"');
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Template download error:', error);
    res.status(500).json({ 
      error: '템플릿 다운로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

/**
 * 학생별 TOPIK 점수 이력 조회
 */
router.get('/history/:studentCode', async (req, res) => {
  try {
    const { studentCode } = req.params;
    
    // 학생 확인
    const student = await db('students')
      .where('student_code', studentCode)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: '학생을 찾을 수 없습니다.'
      });
    }
    
    // TOPIK 점수 이력 조회
    const scores = await db('exam_results')
      .where({
        student_id: student.student_id,
        exam_type: 'mock',
        exam_name: 'TOPIK 모의고사'
      })
      .orderBy('exam_date', 'desc');
    
    // 점수 파싱 및 정리
    const scoreHistory = scores.map(score => {
      let detailed = {};
      try {
        detailed = typeof score.detailed_scores === 'string' ? 
          JSON.parse(score.detailed_scores) : score.detailed_scores || {};
      } catch (e) {
        console.error('Failed to parse scores:', e);
      }
      
      return {
        exam_date: score.exam_date,
        test_number: detailed.test_number || '-',
        listening: detailed.listening || 0,
        reading: detailed.reading || 0,
        writing: detailed.writing || 0,
        total: score.score || 0,
        grade: score.grade || '-',
        percentage: score.percentage || 0
      };
    });
    
    res.json({
      success: true,
      student: {
        student_code: student.student_code,
        name_ko: student.name_ko,
        name_vi: student.name_vi
      },
      scores: scoreHistory
    });
    
  } catch (error) {
    console.error('❌ Get score history error:', error);
    res.status(500).json({ 
      error: '점수 이력 조회 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

module.exports = router;