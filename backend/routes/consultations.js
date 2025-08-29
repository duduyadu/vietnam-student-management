const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');
const { getStudentFullInfo, getStudentName } = require('../helpers/studentHelper');

console.log('🚀 Consultations router V2 loaded - With complete student info support');

router.use(verifyToken);

// TEST ROUTE
router.get('/test', async (req, res) => {
  console.log('TEST ROUTE HIT - VERSION 4!');
  res.json({ message: 'Test route works!', version: 'VERSION 4 - UPDATED!' });
});

// ============================
// 상담 유형 조회
// ============================
router.get('/types', async (req, res) => {
  console.log('GET /types route hit in consultations.js');
  
  try {
    const types = await db('consultation_types')
      .where('is_active', true)
      .orderBy('display_order', 'asc');
    
    res.json({
      success: true,
      data: types
    });
  } catch (error) {
    console.error('❌ Get consultation types error:', error);
    res.status(500).json({
      error: 'Failed to get consultation types',
      message: error.message
    });
  }
});

// ============================
// 상담 기록 목록 조회
// ============================
router.get('/', async (req, res) => {
  console.log('📋 GET /api/consultations - Fetching consultation list - FIXED VERSION');
  
  try {
    const { page = 1, limit = 10, search = '', student_id } = req.query;
    const offset = (page - 1) * limit;
    
    // Build WHERE conditions that will be used for both count and data queries
    const buildWhereConditions = (queryBuilder) => {
      // 권한 필터링
      if (req.user.role === 'teacher') {
        queryBuilder.where('consultations.created_by', req.user.user_id);
      }
      
      // 검색 필터
      if (search) {
        queryBuilder.where(function() {
          this.where('students.student_code', 'like', `%${search}%`)
            .orWhere('consultations.notes', 'like', `%${search}%`);
        });
      }
      
      // 특정 학생 필터
      if (student_id) {
        queryBuilder.where('consultations.student_id', student_id);
      }
      
      return queryBuilder;
    };
    
    // 1. Count query - completely separate
    let countQuery = db('consultations');
    if (search) {
      countQuery = countQuery.leftJoin('students', 'consultations.student_id', 'students.student_id');
    }
    countQuery = buildWhereConditions(countQuery);
    const [{ count }] = await countQuery.count('* as count');
    
    // 2. Data query - completely separate
    let dataQuery = db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'teacher.full_name as teacher_name',
        'counselor.full_name as counselor_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users as teacher', 'consultations.teacher_id', 'teacher.user_id')
      .leftJoin('users as counselor', 'consultations.created_by', 'counselor.user_id');
    
    dataQuery = buildWhereConditions(dataQuery);
    
    // 페이지네이션 적용
    const consultations = await dataQuery
      .orderBy('consultations.consultation_date', 'desc')
      .limit(limit)
      .offset(offset);
    
    // 2. 각 상담에 대해 학생 전체 정보 추가
    const consultationsWithStudentInfo = await Promise.all(
      consultations.map(async (consultation) => {
        // 학생 이름 조회
        const studentName = await getStudentName(consultation.student_id);
        
        return {
          ...consultation,
          student_name: studentName,
          student_name_ko: studentName,  // 프론트엔드 호환성
          student_name_vi: ''  // 프론트엔드 호환성
        };
      })
    );
    
    console.log(`✅ Found ${consultationsWithStudentInfo.length} consultations`);
    
    res.json({
      success: true,
      data: consultationsWithStudentInfo,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Get consultations error:', error);
    res.status(500).json({ 
      error: 'Failed to get consultations',
      message: error.message 
    });
  }
});

// ============================
// 특정 상담 기록 조회
// ============================
router.get('/:id', async (req, res) => {
  console.log(`📄 GET /api/consultations/${req.params.id}`);
  
  try {
    const consultation = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', req.params.id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({ 
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크
    if (req.user.role === 'teacher' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({ 
        error: 'Access denied',
        message_ko: '접근 권한이 없습니다'
      });
    }
    
    // 학생 이름 추가
    const studentName = await getStudentName(consultation.student_id);
    consultation.student_name = studentName;
    consultation.student_name_ko = studentName;
    consultation.student_name_vi = '';
    
    res.json({
      success: true,
      data: consultation
    });
    
  } catch (error) {
    console.error('❌ Get consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to get consultation',
      message: error.message
    });
  }
});

// ============================
// 상담 기록 생성
// ============================
router.post('/', async (req, res) => {
  console.log('➕ POST /api/consultations - Creating new consultation');
  console.log('Request body:', req.body);
  
  try {
    const {
      student_id,
      consultation_date,
      consultation_type = 'general_consultation',
      content_ko,
      content_vi,
      action_items,
      next_consultation_date,
      summary,  // summary 필드 추가
      // 평가 관련 필드
      evaluation_category,
      evaluation_period,
      evaluation_data,
      overall_score,
      // TOPIK 점수 필드 추가
      topik_test_number,
      topik_reading,
      topik_listening,
      topik_writing,
      topik_total
    } = req.body;
    
    // 필수 필드 검증
    if (!student_id || !consultation_date) {
      console.log('⚠️ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        message_ko: '필수 항목을 모두 입력해주세요'
      });
    }
    
    // 상담 카테고리가 consultation인 경우 content_ko 필수
    if (evaluation_category === 'consultation' && !content_ko) {
      return res.status(400).json({
        error: 'Content is required for consultations',
        message_ko: '상담 내용은 필수 항목입니다'
      });
    }
    
    // 평가 카테고리인 경우 evaluation_data 필수
    if (evaluation_category === 'evaluation' && !evaluation_data) {
      return res.status(400).json({
        error: 'Evaluation data is required',
        message_ko: '평가 데이터는 필수 항목입니다'
      });
    }
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', student_id)
      .first();
    
    if (!student) {
      console.log('⚠️ Student not found:', student_id);
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    // 교사 권한 체크
    if (req.user.role === 'teacher' && 
        student.agency_id && 
        student.agency_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'You can only create consultations for your agency students',
        message_ko: '자신의 학원 학생에 대해서만 상담 기록을 작성할 수 있습니다'
      });
    }
    
    console.log('💾 Inserting consultation into database...');
    console.log('📦 Data to insert:', {
      student_id,
      evaluation_category: evaluation_category || null,
      action_items_length: action_items ? action_items.length : 0,
      action_items_type: typeof action_items,
      summary: summary
    });
    
    // 상담 기록 생성
    const consultationResult = await db('consultations').insert({
      student_id,
      teacher_id: req.user.user_id,
      created_by: req.user.user_id,  // 중요: created_by 필드 추가
      consultation_date,
      consultation_type,
      content_ko: content_ko || summary || '',  // content_ko가 없으면 summary 사용
      content_vi: content_vi || '',
      action_items: action_items || '',
      next_consultation_date: next_consultation_date || null,
      notes: summary || content_ko || '',  // summary를 notes 필드에 저장
      // 평가 관련 필드
      evaluation_category: evaluation_category || null,
      evaluation_period: evaluation_period || null,
      evaluation_data: evaluation_data ? JSON.stringify(evaluation_data) : null,
      overall_score: overall_score || null,
      writer_role: req.user.role || 'teacher'
    }).returning('consultation_id');
    
    const consultation = Array.isArray(consultationResult) ? consultationResult[0] : consultationResult;
    console.log('✅ Consultation created with ID:', consultation.consultation_id);
    
    // 대학/전공 변경 이력 저장 (action_items에서 추출)
    if (action_items) {
      try {
        const actionItemsData = typeof action_items === 'string' ? JSON.parse(action_items) : action_items;
        
        // action_items에 희망대학/전공 정보가 있으면 이력 추가
        if (actionItemsData.target_university || actionItemsData.target_major) {
          console.log('🎓 Checking university/major changes...');
          
          // 학생의 현재 희망대학/전공 조회
          const currentStudent = await db('students')
            .where('student_id', student_id)
            .select('desired_university', 'desired_major')
            .first();
          
          const hasUniversityChanged = actionItemsData.target_university && 
            actionItemsData.target_university !== currentStudent.desired_university;
          const hasMajorChanged = actionItemsData.target_major && 
            actionItemsData.target_major !== currentStudent.desired_major;
          
          if (hasUniversityChanged || hasMajorChanged) {
            // university_history 테이블에 이력 추가
            await db('university_history').insert({
              student_id,
              consultation_id: consultation.consultation_id,
              university: actionItemsData.target_university || currentStudent.desired_university,
              major: actionItemsData.target_major || currentStudent.desired_major,
              change_date: consultation_date,
              reason_for_change: actionItemsData.change_reason || '상담 중 변경',
              created_by: req.user.user_id
            });
            
            // students 테이블도 업데이트
            await db('students')
              .where('student_id', student_id)
              .update({
                desired_university: actionItemsData.target_university || currentStudent.desired_university,
                desired_major: actionItemsData.target_major || currentStudent.desired_major,
                updated_at: new Date()
              });
            
            console.log('✅ University/major history updated');
          }
        }
      } catch (e) {
        console.error('Failed to update university history:', e);
        // 이력 저장 실패는 무시하고 계속 진행
      }
    }
    
    // TOPIK 점수가 있으면 exam_results에도 저장
    if (topik_test_number && topik_test_number > 0) {
      console.log('📝 Saving TOPIK mock exam scores...');
      
      try {
        // 기존 동일 회차 점수가 있는지 확인
        const existingExam = await db('exam_results')
          .where('student_id', student_id)
          .where('exam_name', `TOPIK 모의고사 ${topik_test_number}회차`)
          .first();
        
        const examData = {
          student_id,
          exam_name: `TOPIK 모의고사 ${topik_test_number}회차`,
          exam_type: 'TOPIK_MOCK',
          subject: 'TOPIK',
          exam_date: consultation_date,
          score: topik_total,
          max_score: 200,  // TOPIK I 만점 (읽기 100 + 듣기 100)
          percentage: (topik_total / 200) * 100,
          notes: `읽기: ${topik_reading}점, 듣기: ${topik_listening}점`,
          created_by: req.user.user_id
        };
        
        if (existingExam) {
          // 기존 점수 업데이트
          await db('exam_results')
            .where('exam_id', existingExam.exam_id)
            .update({
              ...examData,
              updated_at: new Date()
            });
          console.log('✅ TOPIK scores updated');
        } else {
          // 새로운 점수 추가
          await db('exam_results').insert(examData);
          console.log('✅ TOPIK scores saved');
        }
      } catch (error) {
        console.error('⚠️ Failed to save TOPIK scores:', error);
        // TOPIK 점수 저장 실패는 상담 생성 전체를 실패시키지 않음
      }
    }
    
    // 생성된 상담 기록 조회
    const newConsultation = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', consultation.consultation_id)
      .first();
    
    // 학생 이름 추가
    const studentName = await getStudentName(student_id);
    newConsultation.student_name = studentName;
    newConsultation.student_name_ko = studentName;
    newConsultation.student_name_vi = '';
    
    res.status(201).json({
      success: true,
      data: newConsultation,
      message: 'Consultation created successfully'
    });
    
  } catch (error) {
    console.error('❌ Create consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to create consultation',
      message: error.message
    });
  }
});

// ============================
// 상담 기록 수정
// ============================
router.put('/:id', async (req, res) => {
  console.log(`✏️ PUT /api/consultations/${req.params.id}`);
  
  try {
    const { id } = req.params;
    const {
      consultation_date,
      consultation_type,
      content_ko,
      content_vi,
      action_items,
      next_consultation_date,
      summary,  // summary 필드 추가
      // TOPIK 점수 필드 추가
      topik_test_number,
      topik_reading,
      topik_listening,
      topik_writing,
      topik_total
    } = req.body;
    
    // 상담 기록 존재 확인
    const consultation = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크 (작성자만 수정 가능)
    if (req.user.role !== 'admin' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'You can only edit your own consultations',
        message_ko: '자신이 작성한 상담 기록만 수정할 수 있습니다'
      });
    }
    
    // 업데이트
    await db('consultations')
      .where('consultation_id', id)
      .update({
        consultation_date,
        consultation_type,
        content_ko: content_ko || summary || '',
        content_vi: content_vi || '',
        action_items: action_items || '',
        next_consultation_date: next_consultation_date || null,
        notes: summary || content_ko || '',  // summary를 notes 필드에 저장
        updated_at: new Date()
      });
    
    // TOPIK 점수가 있으면 exam_results에도 저장/업데이트
    if (topik_test_number && topik_test_number > 0) {
      console.log('📝 Updating TOPIK mock exam scores...');
      
      try {
        const existingExam = await db('exam_results')
          .where('student_id', consultation.student_id)
          .where('exam_name', `TOPIK 모의고사 ${topik_test_number}회차`)
          .first();
        
        const examData = {
          student_id: consultation.student_id,
          exam_name: `TOPIK 모의고사 ${topik_test_number}회차`,
          exam_type: 'TOPIK_MOCK',
          subject: 'TOPIK',
          exam_date: consultation_date,
          score: topik_total,
          max_score: 200,  // TOPIK I 만점
          percentage: (topik_total / 200) * 100,
          notes: `읽기: ${topik_reading}점, 듣기: ${topik_listening}점`,
          created_by: req.user.user_id
        };
        
        if (existingExam) {
          await db('exam_results')
            .where('exam_id', existingExam.exam_id)
            .update({
              ...examData,
              updated_at: new Date()
            });
          console.log('✅ TOPIK scores updated');
        } else {
          await db('exam_results').insert(examData);
          console.log('✅ TOPIK scores saved');
        }
      } catch (error) {
        console.error('⚠️ Failed to save TOPIK scores:', error);
      }
    }
    
    // 업데이트된 상담 기록 조회
    const updatedConsultation = await db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id')
      .where('consultations.consultation_id', id)
      .first();
    
    // 학생 이름 추가
    const studentName = await getStudentName(updatedConsultation.student_id);
    updatedConsultation.student_name = studentName;
    updatedConsultation.student_name_ko = studentName;
    updatedConsultation.student_name_vi = '';
    
    res.json({
      success: true,
      data: updatedConsultation,
      message: 'Consultation updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Update consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to update consultation',
      message: error.message
    });
  }
});

// ============================
// 상담 기록 삭제
// ============================
router.delete('/:id', async (req, res) => {
  console.log(`🗑️ DELETE /api/consultations/${req.params.id}`);
  
  try {
    const { id } = req.params;
    
    // 상담 기록 존재 확인
    const consultation = await db('consultations')
      .where('consultation_id', id)
      .first();
    
    if (!consultation) {
      return res.status(404).json({
        error: 'Consultation not found',
        message_ko: '상담 기록을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크 (작성자 또는 관리자만 삭제 가능)
    if (req.user.role !== 'admin' && 
        consultation.teacher_id !== req.user.user_id) {
      return res.status(403).json({
        error: 'You can only delete your own consultations',
        message_ko: '자신이 작성한 상담 기록만 삭제할 수 있습니다'
      });
    }
    
    // 삭제
    await db('consultations')
      .where('consultation_id', id)
      .del();
    
    console.log('✅ Consultation deleted successfully');
    
    res.json({
      success: true,
      message: 'Consultation deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete consultation error:', error);
    res.status(500).json({ 
      error: 'Failed to delete consultation',
      message: error.message
    });
  }
});

module.exports = router;