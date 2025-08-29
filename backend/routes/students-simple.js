const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole } = require('../middleware/auth');
const { logAction } = require('../middleware/auditLog');

// 모든 라우트에 인증 필요
router.use((req, res, next) => {
  console.log('📌 Students-Simple Router Called:', req.method, req.path);
  console.log('📌 Authorization header:', req.headers.authorization);
  next();
});
router.use(verifyToken);

// 학생 목록 조회 (간단 버전 - 뷰 사용)
router.get('/', async (req, res) => {
  try {
    console.log('🔍 학생 목록 조회 시작...');
    console.log('요청 정보:', { user: req.user, query: req.query });
    
    const { status, agency_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('student_list_view');

    // 권한별 필터링
    if (req.user.role === 'teacher') {
      // 교사는 자신의 user_id를 agency_id로 사용
      const teacherAgencyId = req.user.user_id;
      query = query.where('agency_id', teacherAgencyId);
    }

    // 상태 필터
    if (status) {
      query = query.where('status', status);
    }

    // 유학원 필터 (관리자용)
    if (agency_id && req.user.role === 'admin') {
      query = query.where('agency_id', agency_id);
    }

    // 전체 개수 조회
    const totalQuery = query.clone();
    const countResult = await totalQuery.count('student_id as count').first();
    const count = countResult.count;

    // 페이지네이션 적용
    const students = await query
      .orderBy('student_id', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: students,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: parseInt(count),
        items_per_page: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching students:', error);
    console.error('에러 상세:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch students'
    });
  }
});

// 학생 상세 정보 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // student_full_info 뷰 사용
    const student = await db('student_full_info')
      .where('student_id', id)
      .first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // 권한 체크
    if (req.user.role === 'teacher' && student.agency_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // 민감정보 접근 로그
    await logAction(req, 'VIEW', 'students', id);

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch student'
    });
  }
});

// 학생 등록
router.post('/', [
  body('student_code').notEmpty().trim(),
  body('korean_name').notEmpty().trim(),
  body('agency_id').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { student_code, korean_name, vietnamese_name, phone, email, birth_date, agency_id, ...otherData } = req.body;

    // 권한 체크
    if (req.user.role === 'teacher') {
      // 교사는 자신의 유학원 학생만 등록 가능
      req.body.agency_id = req.user.user_id;
    }

    // 디버깅: 사용자 정보 확인
    console.log('🔍 DEBUG - req.user:', JSON.stringify(req.user, null, 2));
    console.log('🔍 DEBUG - req.user.user_id:', req.user.user_id);
    console.log('🔍 DEBUG - req.user.role:', req.user.role);

    // 트랜잭션 시작
    const result = await db.transaction(async trx => {
      // 1. students 테이블에 기본 정보 삽입
      const insertData = {
        student_code,
        status: 'studying', // 'active' 대신 'studying' 사용 (DB 제약조건에 맞춤)
        agency_id: agency_id || (req.user.role === 'teacher' ? req.user.user_id : null),
        created_by: req.user.user_id
      };
      
      console.log('🔍 DEBUG - Insert data:', JSON.stringify(insertData, null, 2));
      
      const studentResult = await trx('students')
        .insert(insertData)
        .returning(['student_id', 'student_code', 'status']);
      
      // PostgreSQL은 배열로 반환, 첫 번째 요소 추출
      const student = Array.isArray(studentResult) ? studentResult[0] : studentResult;

      // 2. student_attributes 테이블에 속성 삽입
      const attributes = [];
      
      if (korean_name) {
        attributes.push({
          student_id: student.student_id,
          attribute_name: 'korean_name',
          attribute_value: korean_name
        });
      }
      
      if (vietnamese_name) {
        attributes.push({
          student_id: student.student_id,
          attribute_name: 'vietnamese_name',
          attribute_value: vietnamese_name
        });
      }
      
      if (phone) {
        attributes.push({
          student_id: student.student_id,
          attribute_name: 'phone',
          attribute_value: phone
        });
      }
      
      if (email) {
        attributes.push({
          student_id: student.student_id,
          attribute_name: 'email',
          attribute_value: email
        });
      }
      
      if (birth_date) {
        attributes.push({
          student_id: student.student_id,
          attribute_name: 'birth_date',
          attribute_value: birth_date
        });
      }

      // 기타 속성들 추가
      for (const [key, value] of Object.entries(otherData)) {
        if (value) {
          attributes.push({
            student_id: student.student_id,
            attribute_name: key,
            attribute_value: String(value)
          });
        }
      }

      if (attributes.length > 0) {
        await trx('student_attributes').insert(attributes);
      }

      // 생성 로그
      await logAction(req, 'CREATE', 'students', student.student_id);

      return student;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Student created successfully'
    });

  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create student'
    });
  }
});

// 학생 정보 수정
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // 권한 체크
    const student = await db('students').where('student_id', id).first();
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    if (req.user.role === 'teacher' && student.agency_id !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // 트랜잭션 시작
    await db.transaction(async trx => {
      // students 테이블 업데이트 (status, agency_id)
      if (updates.status || updates.agency_id) {
        await trx('students')
          .where('student_id', id)
          .update({
            status: updates.status || student.status,
            agency_id: updates.agency_id || student.agency_id,
            updated_at: new Date()
          });
      }

      // student_attributes 업데이트
      for (const [key, value] of Object.entries(updates)) {
        if (key !== 'status' && key !== 'agency_id' && key !== 'student_code') {
          // 기존 속성 확인
          const existing = await trx('student_attributes')
            .where({ student_id: id, attribute_name: key })
            .first();

          if (existing) {
            // 업데이트
            await trx('student_attributes')
              .where({ student_id: id, attribute_name: key })
              .update({
                attribute_value: String(value),
                updated_at: new Date()
              });
          } else {
            // 새로 삽입
            await trx('student_attributes').insert({
              student_id: id,
              attribute_name: key,
              attribute_value: String(value)
            });
          }
        }
      }

      // 수정 로그
      await logAction(req, 'UPDATE', 'students', id);
    });

    res.json({
      success: true,
      message: 'Student updated successfully'
    });

  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update student'
    });
  }
});

// 학생 삭제
router.delete('/:id', checkRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // 트랜잭션 시작
    await db.transaction(async trx => {
      // 관련 데이터 삭제
      await trx('student_attributes').where('student_id', id).del();
      await trx('consultations').where('student_id', id).del();
      await trx('students').where('student_id', id).del();

      // 삭제 로그
      await logAction(req, 'DELETE', 'students', id);
    });

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete student'
    });
  }
});

module.exports = router;