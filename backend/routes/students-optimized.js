const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

console.log('🚀 Students router OPTIMIZED - With automatic ID generation');

router.use(verifyToken);

// ============================
// 학생 목록 조회 (뷰 사용으로 최적화)
// ============================
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', agency_id } = req.query;
    const offset = (page - 1) * limit;
    
    // 뷰 사용으로 JOIN 간소화
    let query = db('v_students_full');
    
    // 권한 필터링
    if (req.user.role === 'teacher') {
      const agency = await db('agencies')
        .where('created_by', req.user.user_id)
        .first();
      if (agency) {
        query = query.where('agency_code', agency.agency_code);
      }
    }
    
    // 검색 필터
    if (search) {
      query = query.where(function() {
        this.where('student_code', 'like', `%${search}%`)
          .orWhere('name_ko', 'like', `%${search}%`);
      });
    }
    
    // 특정 유학원 필터
    if (agency_id) {
      query = query.where('agency_id', agency_id);
    }
    
    // 전체 개수
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    
    // 페이지네이션
    const students = await query
      .orderBy('student_code', 'desc')
      .limit(limit)
      .offset(offset);
    
    // 응답 데이터 형식 통일
    const formattedStudents = students.map(student => ({
      ...student,
      // 이름 필드 확인 (name_ko가 있으면 사용, 없으면 name 필드 사용)
      name: student.name_ko || student.name || '-',
      // 다른 필드들도 확인
      phone: student.phone || '-',
      email: student.email || '-'
    }));
    
    res.json({
      success: true,
      data: formattedStudents,
      pagination: {
        total: parseInt(count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
        total_items: parseInt(count) // 프론트엔드 호환성
      }
    });
    
  } catch (error) {
    console.error('❌ Get students error:', error);
    res.status(500).json({ 
      error: 'Failed to get students',
      message: error.message 
    });
  }
});

// ============================
// 학생 생성 (자동 ID 생성)
// ============================
router.post('/', async (req, res) => {
  try {
    const { 
      name_ko, 
      name_vi, 
      agency_id,
      phone,
      email,
      birth_date,
      gender,
      address_vietnam,
      address_korea,
      parent_name,
      parent_phone,
      parent_income,
      high_school,
      gpa,
      desired_major,
      desired_university,
      visa_type,
      visa_expiry,
      alien_registration,
      agency_enrollment_date
    } = req.body;
    
    console.log('📋 Request body received:', {
      name_ko,
      agency_id,
      hasName: !!name_ko,
      hasAgency: !!agency_id,
      fullBody: req.body
    });
    
    // 필수 필드 검증
    if (!name_ko || !agency_id) {
      console.error('❌ Missing required fields:', { 
        name_ko: name_ko || 'MISSING', 
        agency_id: agency_id || 'MISSING' 
      });
      return res.status(400).json({
        error: 'Required fields missing',
        message_ko: '이름과 유학원은 필수입니다',
        details: {
          name_ko: !name_ko ? 'missing' : 'ok',
          agency_id: !agency_id ? 'missing' : 'ok'
        }
      });
    }
    
    // 유학원 코드 조회
    const agency = await db('agencies')
      .where('agency_id', agency_id)
      .first();
    
    if (!agency) {
      return res.status(404).json({
        error: 'Agency not found',
        message_ko: '유학원을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크 (교사는 자기 유학원만)
    if (req.user.role === 'teacher') {
      const teacherAgency = await db('agencies')
        .where('created_by', req.user.user_id)
        .first();
      
      if (!teacherAgency || teacherAgency.agency_id !== agency_id) {
        return res.status(403).json({
          error: 'Access denied',
          message_ko: '권한이 없습니다'
        });
      }
    }
    
    // 학생 코드 자동 생성
    const result = await db.raw('SELECT generate_student_code(?) as student_code', [agency.agency_code]);
    const student_code = result.rows[0].student_code;
    
    console.log(`📝 Creating student with code: ${student_code}`);
    
    // birth_date와 visa_expiry 형식 변환 (YYYY-MM-DD)
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      // 하이픈이 이미 있으면 그대로 사용
      if (dateStr.includes('-')) return dateStr;
      // YYYYMMDD 형식을 YYYY-MM-DD로 변환
      if (dateStr.length === 8) {
        return `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
      }
      return dateStr;
    };
    
    // 학생 데이터 준비
    const studentData = {
      student_code,
      name_ko,
      name_vi: name_vi || name_ko, // name_vi가 없으면 name_ko 사용
      agency_id,
      status: 'studying',
      phone,
      email,
      birth_date: formatDate(birth_date),
      gender,
      address_vietnam,
      address_korea,
      parent_name,
      parent_phone,
      parent_income,
      high_school,
      gpa: gpa ? parseFloat(gpa) : null,
      desired_major,
      desired_university,
      visa_type,
      visa_expiry: formatDate(visa_expiry),
      alien_registration,
      agency_enrollment_date,
      created_by: req.user.user_id
    };
    
    console.log('📝 Student data prepared:', JSON.stringify(studentData, null, 2));
    
    // 학생 생성
    const [newStudent] = await db('students')
      .insert(studentData)
      .returning('*');
    
    console.log(`✅ Created student: ${name_ko} with code: ${student_code}`);
    
    res.status(201).json({
      success: true,
      message: `학생이 등록되었습니다. 학생 ID: ${student_code}`,
      data: newStudent
    });
    
  } catch (error) {
    console.error('❌ Create student error:', error);
    res.status(500).json({
      error: 'Failed to create student',
      message: error.message
    });
  }
});

// ============================
// 학생 정보 수정
// ============================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name_ko, 
      name_vi,
      status,
      phone,
      email,
      birth_date,
      address
    } = req.body;
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', id)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크
    if (req.user.role === 'teacher') {
      const agency = await db('agencies')
        .where('agency_id', student.agency_id)
        .first();
      
      if (agency.created_by !== req.user.user_id) {
        return res.status(403).json({
          error: 'Access denied',
          message_ko: '수정 권한이 없습니다'
        });
      }
    }
    
    // 업데이트
    const [updated] = await db('students')
      .where('student_id', id)
      .update({
        name_ko,
        name_vi: name_vi || '',
        status,
        updated_at: new Date()
      })
      .returning('*');
    
    res.json({
      success: true,
      message: '학생 정보가 수정되었습니다',
      data: updated
    });
    
  } catch (error) {
    console.error('❌ Update student error:', error);
    res.status(500).json({
      error: 'Failed to update student',
      message: error.message
    });
  }
});

// ============================
// 학생 삭제 - CASCADE DELETE 활용
// ============================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    
    console.log(`🗑️ Delete request for student ID: ${id}, force: ${force}`);
    
    // 학생 존재 확인
    const student = await db('students')
      .where('student_id', id)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    console.log(`📋 Found student: ${student.student_code} (${student.name_ko})`);
    
    // 권한 체크 (관리자만)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message_ko: '삭제 권한이 없습니다'
      });
    }
    
    // 관련 데이터 확인 (정보 제공용)
    const consultationResult = await db('consultations')
      .where('student_id', id)
      .count('* as count');
    const consultationCount = parseInt(consultationResult[0].count) || 0;
    
    console.log(`📊 Student has ${consultationCount} consultation records`);
    
    // 삭제 옵션 결정
    if (consultationCount > 0 && force !== 'true') {
      // 소프트 삭제: archived 상태로 변경
      console.log('📦 Archiving student (soft delete)');
      
      await db('students')
        .where('student_id', id)
        .update({
          status: 'archived',
          updated_at: new Date()
        });
      
      return res.json({
        success: true,
        message: '학생이 보관 처리되었습니다',
        message_ko: '학생이 보관 처리되었습니다',
        soft_delete: true,
        consultation_count: consultationCount
      });
    }
    
    // 하드 삭제: CASCADE DELETE 활용
    console.log('🔥 Hard delete - CASCADE DELETE will remove all related data');
    
    // Foreign keys는 모두 CASCADE DELETE로 설정되어 있으므로
    // 학생만 삭제하면 관련 데이터도 자동으로 삭제됨
    const deletedCount = await db('students')
      .where('student_id', id)
      .delete();
    
    if (deletedCount === 0) {
      throw new Error('Failed to delete student');
    }
    
    console.log(`✅ Successfully deleted student ${student.student_code} and all related data`);
    
    return res.json({
      success: true,
      message: '학생이 완전히 삭제되었습니다',
      message_ko: '학생이 완전히 삭제되었습니다',
      hard_delete: true,
      force: force === 'true',
      deleted_student: student.student_code
    });
    
  } catch (error) {
    console.error('❌ Delete student error:', error);
    console.error('Error code:', error.code);
    console.error('Error detail:', error.detail);
    
    res.status(500).json({
      error: 'Failed to delete student',
      message: error.message,
      code: error.code
    });
  }
});

// ============================
// 학생 상세 정보 조회
// ============================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const student = await db('v_students_full')
      .where('student_id', id)
      .first();
    
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        message_ko: '학생을 찾을 수 없습니다'
      });
    }
    
    // 권한 체크
    if (req.user.role === 'teacher') {
      const agency = await db('agencies')
        .where('agency_id', student.agency_id)
        .first();
      
      if (agency.created_by !== req.user.user_id) {
        return res.status(403).json({
          error: 'Access denied',
          message_ko: '조회 권한이 없습니다'
        });
      }
    }
    
    res.json({
      success: true,
      data: student
    });
    
  } catch (error) {
    console.error('❌ Get student error:', error);
    res.status(500).json({
      error: 'Failed to get student',
      message: error.message
    });
  }
});

// ============================
// 학생 사진 업로드
// ============================
const multer = require('multer');
const path = require('path');

// 사진 업로드 설정
const photoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/student-photos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'student-' + req.params.id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const photoUpload = multer({ 
  storage: photoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다 (jpg, jpeg, png, gif)'));
    }
  }
});

// 학생 사진 업로드
router.post('/:id/photo', photoUpload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: '사진 파일이 필요합니다' });
    }
    
    // 파일 경로를 상대 경로로 저장
    const photoUrl = '/uploads/student-photos/' + req.file.filename;
    
    // 학생 정보 업데이트
    const [updatedStudent] = await db('students')
      .where('id', id)
      .update({
        photo_url: photoUrl,
        photo_uploaded_at: db.fn.now(),
        updated_at: db.fn.now()
      })
      .returning('*');
    
    if (!updatedStudent) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다' });
    }
    
    res.json({
      success: true,
      message: '사진이 업로드되었습니다',
      photo_url: photoUrl,
      student: updatedStudent
    });
    
  } catch (error) {
    console.error('❌ Photo upload error:', error);
    res.status(500).json({
      error: '사진 업로드 실패',
      message: error.message
    });
  }
});

// 학생 사진 삭제
router.delete('/:id/photo', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 기존 사진 정보 조회
    const student = await db('students')
      .where('id', id)
      .first();
    
    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다' });
    }
    
    // 파일 시스템에서 사진 삭제 (옵션)
    if (student.photo_url) {
      const fs = require('fs').promises;
      const filePath = path.join(__dirname, '..', student.photo_url);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.warn('파일 삭제 실패:', err.message);
      }
    }
    
    // DB에서 사진 정보 제거
    const [updatedStudent] = await db('students')
      .where('id', id)
      .update({
        photo_url: null,
        photo_uploaded_at: null,
        updated_at: db.fn.now()
      })
      .returning('*');
    
    res.json({
      success: true,
      message: '사진이 삭제되었습니다',
      student: updatedStudent
    });
    
  } catch (error) {
    console.error('❌ Photo delete error:', error);
    res.status(500).json({
      error: '사진 삭제 실패',
      message: error.message
    });
  }
});

module.exports = router;