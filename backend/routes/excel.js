const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const { verifyToken } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const db = require('../config/database');
const { getStudentFullInfo } = require('../helpers/studentHelper');

// 인증 미들웨어 적용
router.use(verifyToken);

console.log('📊 Excel import/export router loaded');

// ============================
// 권한 체크 미들웨어
// ============================
const checkExcelPermission = (action) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    
    // 권한 매트릭스
    const permissions = {
      'admin': ['download', 'upload'],      // 관리자: 모두 가능
      'teacher': ['download', 'upload'],     // 선생님: 다운로드/업로드 가능
      'korean_branch': []                          // 한국 지점: 엑셀 기능 불가
    };
    
    if (!permissions[userRole] || !permissions[userRole].includes(action)) {
      return res.status(403).json({
        error: '권한이 없습니다',
        message_ko: `${userRole} 권한으로는 엑셀 ${action === 'download' ? '다운로드' : '업로드'}가 불가능합니다.`
      });
    }
    
    next();
  };
};

// ============================
// 학생 데이터 엑셀 다운로드 (권한별 필터링)
// ============================
router.get('/students/download', checkExcelPermission('download'), async (req, res) => {
  try {
    console.log(`📥 Excel download request by ${req.user.role} (${req.user.email})`);
    
    let query = db('students')
      .select(
        'student_code',
        'name_ko',
        'name_vi',
        'birth_date',
        'gender',
        'phone',
        'email',
        'address_korea',
        'address_vietnam',
        'parent_name_ko',
        'parent_phone',
        'emergency_contact',
        'notes',
        'created_at'
      );
    
    // 권한별 데이터 필터링
    if (req.user.role === 'teacher') {
      // 선생님은 자신의 유학원 학생만 조회 가능
      console.log(`🔒 Filtering students for teacher's agency (user_id: ${req.user.user_id})`);
      query = query.where('agency_id', req.user.user_id);
    } else if (req.user.role === 'admin') {
      // 관리자는 모든 학생 조회 가능
      console.log('👑 Admin access - all students');
    }
    
    const students = await query;
    
    console.log(`✅ Found ${students.length} students for export`);
    
    if (students.length === 0) {
      return res.status(404).json({
        error: '다운로드할 학생 데이터가 없습니다.',
        message_ko: req.user.role === 'teacher' ? 
          '귀하의 유학원에 등록된 학생이 없습니다.' : 
          '등록된 학생이 없습니다.'
      });
    }
    
    // 날짜 포맷팅
    const formattedStudents = students.map(student => ({
      '학생코드': student.student_code,
      '이름(한글)': student.name_ko || '',
      '이름(베트남어)': student.name_vi || '',
      '생년월일': student.birth_date || '',
      '성별': student.gender === 'M' ? '남' : student.gender === 'F' ? '여' : '',
      '전화번호': student.phone || '',
      '이메일': student.email || '',
      '한국주소': student.address_korea || '',
      '베트남주소': student.address_vietnam || '',
      '부모님이름': student.parent_name_ko || '',
      '부모님연락처': student.parent_phone || '',
      '비상연락처': student.emergency_contact || '',
      '비고': student.notes || '',
      '등록일': student.created_at || ''
    }));
    
    // 워크북 생성
    const ws = XLSX.utils.json_to_sheet(formattedStudents);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '학생목록');
    
    // 열 너비 자동 조정
    const max_width = formattedStudents.reduce((w, r) => {
      Object.keys(r).forEach(k => {
        const len = (r[k] ? r[k].toString().length : 10) + 2;
        if (!w[k] || w[k] < len) w[k] = len;
      });
      return w;
    }, {});
    
    ws['!cols'] = Object.keys(max_width).map(k => ({ wch: max_width[k] }));
    
    // 엑셀 파일 생성
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 파일명 생성 (날짜 포함)
    const date = new Date().toISOString().split('T')[0];
    const roleLabel = req.user.role === 'teacher' ? '_teacher' : '_admin';
    const filename = `students_${date}${roleLabel}.xlsx`;
    
    // 다운로드 로그 저장 (감사 목적)
    console.log(`📊 Excel downloaded: ${filename} by ${req.user.email}`);
    
    // 파일 전송
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Excel download error:', error);
    res.status(500).json({ 
      error: '엑셀 다운로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// ============================
// 학생 데이터 엑셀 업로드 (관리자만 가능)
// ============================
router.post('/students/upload', 
  checkExcelPermission('upload'), 
  upload.single('file'), 
  handleMulterError, 
  async (req, res) => {
    try {
      console.log(`📤 Excel upload request by ${req.user.role} (${req.user.email})`);
      
      if (!req.file) {
        return res.status(400).json({ 
          error: '파일이 업로드되지 않았습니다.' 
        });
      }
      
      // 엑셀 파일인지 확인
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      
      if (!validTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          error: '엑셀 파일만 업로드 가능합니다. (.xlsx, .xls)' 
        });
      }
      
      // 엑셀 파일 읽기
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`📋 Found ${data.length} rows in Excel file`);
      
      if (data.length === 0) {
        return res.status(400).json({ 
          error: '엑셀 파일에 데이터가 없습니다.' 
        });
      }
      
      // 데이터 검증 및 변환
      const students = [];
      const errors = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2; // 엑셀 행 번호 (헤더 제외)
        
        // 필수 필드 체크
        if (!row['학생코드'] || !row['이름(한글)']) {
          errors.push(`행 ${rowNum}: 학생코드와 이름(한글)은 필수입니다.`);
          continue;
        }
        
        // 중복 체크
        const existing = await db('students')
          .where('student_code', row['학생코드'])
          .first();
        
        if (existing) {
          errors.push(`행 ${rowNum}: 학생코드 ${row['학생코드']}가 이미 존재합니다.`);
          continue;
        }
        
        // 데이터 변환
        const student = {
          student_code: row['학생코드'],
          name_ko: row['이름(한글)'] || null,
          name_vi: row['이름(베트남어)'] || null,
          birth_date: row['생년월일'] || null,
          gender: row['성별'] === '남' ? 'M' : row['성별'] === '여' ? 'F' : null,
          phone: row['전화번호'] || null,
          email: row['이메일'] || null,
          address_korea: row['한국주소'] || null,
          address_vietnam: row['베트남주소'] || null,
          parent_name_ko: row['부모님이름'] || null,
          parent_phone: row['부모님연락처'] || null,
          emergency_contact: row['비상연락처'] || null,
          notes: row['비고'] || null,
          // 선생님이 업로드하면 자동으로 해당 유학원 소속으로 등록
          agency_id: req.user.role === 'teacher' ? req.user.user_id : null,
          created_by: req.user.user_id,
          created_at: new Date()
        };
        
        students.push(student);
      }
      
      // 에러가 있으면 처리 중단
      if (errors.length > 0) {
        return res.status(400).json({
          error: '데이터 검증 실패',
          errors: errors,
          message_ko: `${errors.length}개의 오류가 발견되었습니다.`
        });
      }
      
      // 데이터베이스에 삽입
      if (students.length > 0) {
        await db('students').insert(students);
        console.log(`✅ ${students.length} students imported successfully`);
      }
      
      res.json({
        success: true,
        message: `${students.length}명의 학생 정보가 성공적으로 업로드되었습니다.`,
        imported: students.length,
        total: data.length
      });
      
    } catch (error) {
      console.error('❌ Excel upload error:', error);
      res.status(500).json({ 
        error: '엑셀 업로드 중 오류가 발생했습니다.',
        message: error.message 
      });
    }
  }
);

// ============================
// 상담 기록 엑셀 다운로드 (권한별 필터링)
// ============================
router.get('/consultations/download', checkExcelPermission('download'), async (req, res) => {
  try {
    console.log(`📥 Consultations Excel download by ${req.user.role}`);
    
    let query = db('consultations')
      .select(
        'consultations.*',
        'students.student_code',
        'students.name_ko as student_name',
        'users.full_name as teacher_name'
      )
      .leftJoin('students', 'consultations.student_id', 'students.student_id')
      .leftJoin('users', 'consultations.teacher_id', 'users.user_id');
    
    // 권한별 필터링
    if (req.user.role === 'teacher') {
      // 선생님은 자신이 작성한 상담기록만
      query = query.where('consultations.teacher_id', req.user.user_id);
    }
    
    const consultations = await query.orderBy('consultation_date', 'desc');
    
    // 엑셀용 데이터 포맷팅
    const formattedData = consultations.map(c => ({
      '상담일자': c.consultation_date,
      '학생코드': c.student_code,
      '학생이름': c.student_name,
      '상담유형': c.consultation_type,
      '상담내용(한글)': c.content_ko,
      '상담내용(베트남어)': c.content_vi || '',
      '조치사항': c.action_items || '',
      '다음상담일': c.next_consultation_date || '',
      '담당교사': c.teacher_name,
      '작성일시': c.created_at
    }));
    
    // 엑셀 생성
    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '상담기록');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // 파일명 생성
    const date = new Date().toISOString().split('T')[0];
    const filename = `consultations_${date}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Consultations Excel download error:', error);
    res.status(500).json({ 
      error: '상담기록 엑셀 다운로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// ============================
// 엑셀 템플릿 다운로드 (빈 양식)
// ============================
router.get('/template/download', checkExcelPermission('upload'), (req, res) => {
  try {
    console.log('📄 Template download request');
    
    // 템플릿 데이터 (예시 1행 포함)
    const templateData = [{
      '학생코드': '20240001 (필수)',
      '이름(한글)': '홍길동 (필수)',
      '이름(베트남어)': 'Hong Gil Dong',
      '생년월일': '2000-01-01',
      '성별': '남 또는 여',
      '전화번호': '010-1234-5678',
      '이메일': 'student@example.com',
      '한국주소': '서울시 강남구',
      '베트남주소': 'Ho Chi Minh City',
      '부모님이름': '홍부모',
      '부모님연락처': '010-8765-4321',
      '비상연락처': '010-1111-2222',
      '비고': '특이사항'
    }];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '학생정보_템플릿');
    
    // 열 너비 설정
    ws['!cols'] = [
      {wch: 15}, {wch: 15}, {wch: 20}, {wch: 12},
      {wch: 10}, {wch: 15}, {wch: 25}, {wch: 30},
      {wch: 30}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}
    ];
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="student_template.xlsx"');
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Template download error:', error);
    res.status(500).json({ 
      error: '템플릿 다운로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

module.exports = router;