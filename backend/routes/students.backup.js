const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, checkRole, checkOwnership } = require('../middleware/auth');
const { logAction, logSensitiveAccess } = require('../middleware/auditLog');
const { encrypt, decrypt, encryptSensitiveFields, decryptSensitiveFields } = require('../utils/encryption');
const attributeCache = require('../utils/attributeCache');

// 모든 라우트에 인증 필요
router.use(verifyToken);

// 학생 목록 조회
router.get('/', async (req, res) => {
  try {
    // 한국 지점도 학생 목록 조회 가능 (조회/등록/수정 권한 있음)

    const { status, agency_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = db('students as s')
      .leftJoin('agencies as a', 's.agency_id', 'a.agency_id')
      .select(
        's.student_id',
        's.student_code',
        's.status',
        's.created_at',
        's.updated_at',
        'a.agency_name',
        'a.agency_code'
      );

    // 권한별 필터링
    if (req.user.role === 'teacher') {
      // 교사는 자신의 agency_id에 속한 학생만 볼 수 있음
      if (req.user.agency_id) {
        query = query.where('s.agency_id', req.user.agency_id);
      } else {
        // agency_id가 없는 교사는 학생을 볼 수 없음
        query = query.whereRaw('1 = 0');
      }
    }

    // 상태 필터
    if (status) {
      query = query.where('s.status', status);
    }

    // 유학원 필터 (관리자용)
    if (agency_id && req.user.role === 'admin') {
      query = query.where('s.agency_id', agency_id);
    }

    // 전체 개수 조회
    const totalQuery = query.clone();
    const countResult = await totalQuery.count('s.student_id as count').first();
    const count = countResult.count;

    // 페이지네이션 적용
    const students = await query
      .orderBy('s.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // 모든 학생의 ID 수집
    const studentIds = students.map(s => s.student_id);

    if (studentIds.length > 0) {
      // 한 번에 모든 학생의 속성 조회 (성능 최적화)
      const allAttributes = await db('student_attributes as sa')
        .join('attribute_definitions as ad', 'sa.attribute_key', 'ad.attribute_key')
        .whereIn('sa.student_id', studentIds)
        .whereIn('sa.attribute_key', ['name', 'birth_date', 'phone', 'email'])
        .select('sa.student_id', 'sa.attribute_key', 'sa.attribute_value', 'ad.is_encrypted');

      // 학생별로 속성 그룹화
      const attributesByStudent = {};
      for (let attr of allAttributes) {
        if (!attributesByStudent[attr.student_id]) {
          attributesByStudent[attr.student_id] = {};
        }
        attributesByStudent[attr.student_id][attr.attribute_key] = attr.is_encrypted ? 
          decrypt(attr.attribute_value) : attr.attribute_value;
      }

      // 각 학생에 속성 할당
      for (let student of students) {
        student.attributes = attributesByStudent[student.student_id] || {};
      }
    }

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
    console.error('Get students error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to retrieve students',
        message_ko: '학생 목록 조회에 실패했습니다',
        message_vi: 'Không thể lấy danh sách sinh viên'
      }
    });
  }
});

// 학생 코드로 조회 (한국 지점용)
router.get('/by-code/:studentCode', async (req, res) => {
  try {
    const { studentCode } = req.params;

    // 학생 기본 정보 조회
    const student = await db('students as s')
      .leftJoin('users as u', 's.agency_id', 'u.user_id')
      .where('s.student_code', studentCode)
      .select(
        's.student_id',
        's.student_code',
        's.status',
        's.created_at',
        's.updated_at',
        db.raw('COALESCE(u.agency_name, u.full_name) as agency_name')
      )
      .first();

    if (!student) {
      return res.status(404).json({
        error: {
          message: 'Student not found',
          message_ko: '학생을 찾을 수 없습니다',
          message_vi: 'Không tìm thấy sinh viên'
        }
      });
    }

    // 기본 속성만 조회 (민감정보 제외)
    const attributes = await db('student_attributes as sa')
      .join('attribute_definitions as ad', 'sa.attribute_key', 'ad.attribute_key')
      .where('sa.student_id', student.student_id)
      .whereIn('sa.attribute_key', ['name', 'birth_date', 'phone', 'email'])
      .select('sa.attribute_key', 'sa.attribute_value');

    // 속성을 객체로 변환
    const attrs = {};
    for (let attr of attributes) {
      attrs[attr.attribute_key] = attr.attribute_value;
    }
    student.attributes = attrs;

    res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Get student by code error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to retrieve student',
        message_ko: '학생 조회에 실패했습니다',
        message_vi: 'Không thể lấy thông tin sinh viên'
      }
    });
  }
});

// 학생 상세 조회
router.get('/:id', 
  checkOwnership('students'),
  logSensitiveAccess('students'),
  async (req, res) => {
  try {
    const { id } = req.params;

    // 학생 기본 정보 조회
    const student = await db('students as s')
      .leftJoin('users as u', 's.agency_id', 'u.user_id')
      .where('s.student_id', id)
      .select(
        's.*',
        'u.agency_name',
        'u.full_name as agency_teacher_name'
      )
      .first();

    if (!student) {
      return res.status(404).json({
        error: {
          message: 'Student not found',
          message_ko: '학생을 찾을 수 없습니다',
          message_vi: 'Không tìm thấy sinh viên'
        }
      });
    }

    // 모든 속성 조회
    const attributes = await db('student_attributes as sa')
      .join('attribute_definitions as ad', 'sa.attribute_key', 'ad.attribute_key')
      .where('sa.student_id', id)
      .select(
        'sa.attribute_key',
        'sa.attribute_value',
        'sa.file_path',
        'ad.attribute_name_ko',
        'ad.attribute_name_vi',
        'ad.data_type',
        'ad.is_sensitive',
        'ad.is_encrypted',
        'ad.category'
      )
      .orderBy('ad.display_order');

    // 속성을 카테고리별로 그룹화
    const groupedAttributes = {};
    for (let attr of attributes) {
      const category = attr.category || 'other';
      if (!groupedAttributes[category]) {
        groupedAttributes[category] = [];
      }

      // 민감정보 처리
      let value = attr.attribute_value;
      if (attr.is_encrypted && value) {
        // 권한에 따라 복호화
        if (req.user.role === 'admin' || 
            (req.user.role === 'teacher' && attr.category !== 'family')) {
          value = decrypt(value);
        } else {
          value = '***암호화된 정보***';
        }
      }

      groupedAttributes[category].push({
        key: attr.attribute_key,
        value: value,
        file_path: attr.file_path,
        name_ko: attr.attribute_name_ko,
        name_vi: attr.attribute_name_vi,
        data_type: attr.data_type,
        is_sensitive: attr.is_sensitive
      });
    }

    // 최근 상담 기록 조회
    const recentConsultations = await db('consultations as c')
      .join('users as u', 'c.teacher_id', 'u.user_id')
      .where('c.student_id', id)
      .select(
        'c.consultation_id',
        'c.consultation_date',
        'c.consultation_type',
        'u.full_name as teacher_name'
      )
      .orderBy('c.consultation_date', 'desc')
      .limit(5);

    res.json({
      success: true,
      data: {
        ...student,
        attributes: groupedAttributes,
        recent_consultations: recentConsultations
      }
    });

  } catch (error) {
    console.error('Get student detail error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to retrieve student details',
        message_ko: '학생 정보 조회에 실패했습니다',
        message_vi: 'Không thể lấy thông tin sinh viên'
      }
    });
  }
});

// 학생 등록
router.post('/', 
  checkRole('admin', 'teacher', 'korean_branch'),
  async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const { attributes } = req.body;

    // 학생 코드 생성 (연도 + 순번)
    const year = new Date().getFullYear();
    const [lastStudent] = await trx('students')
      .where('student_code', 'like', `${year}%`)
      .orderBy('student_code', 'desc')
      .limit(1);

    let studentCode;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.student_code.substring(4));
      studentCode = `${year}${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      studentCode = `${year}0001`;
    }

    // agency_id 처리
    let agencyId = null;
    if (attributes.agency_id && attributes.agency_id !== '') {
      agencyId = parseInt(attributes.agency_id);
      // agency_id는 attribute가 아니므로 attributes에서 제거
      delete attributes.agency_id;
    } else if (req.user.role === 'teacher' && req.user.agency_id) {
      // 교사인 경우 자신이 속한 agency_id 사용
      agencyId = req.user.agency_id;
    }

    // 학생 기본 정보 생성
    const [newStudent] = await trx('students')
      .insert({
        student_code: studentCode,
        status: 'studying',
        agency_id: agencyId,
        created_by: req.user.user_id
      })
      .returning('*');

    // 캐시된 속성 정의 사용
    await attributeCache.getDefinitions();
    
    // 속성 저장 (최적화된 배치 처리)
    const attributesToInsert = [];
    const encryptedValues = [];
    
    // 암호화가 필요한 필드만 모아서 처리
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null && value !== '') {
        const def = attributeCache.getDefinition(key);
        if (def) {
          let finalValue = value;
          
          // 암호화 필요 시
          if (def.is_encrypted) {
            finalValue = encrypt(value.toString());
          }
          
          attributesToInsert.push({
            student_id: newStudent.student_id,
            attribute_key: key,
            attribute_value: finalValue,
            is_encrypted: def.is_encrypted || false,
            updated_by: req.user.user_id
          });
        }
      }
    }

    // 한 번에 모든 속성 삽입 (SQLite는 999개 까지 처리 가능)
    if (attributesToInsert.length > 0) {
      await trx('student_attributes').insert(attributesToInsert);
    }

    // 감사 로그
    req.trx = trx;
    await logAction(req, 'CREATE', 'students', newStudent.student_id, null, newStudent);

    await trx.commit();

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        student_id: newStudent.student_id,
        student_code: newStudent.student_code
      }
    });

  } catch (error) {
    await trx.rollback();
    console.error('Create student error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create student',
        message_ko: '학생 등록에 실패했습니다',
        message_vi: 'Không thể đăng ký sinh viên'
      }
    });
  }
});

// 학생 정보 수정
router.put('/:id',
  checkRole('admin', 'teacher', 'korean_branch'),
  checkOwnership('students'),
  async (req, res) => {
  const trx = await db.transaction();
  
  try {
    const { id } = req.params;
    const { status, attributes } = req.body;

    // 학생 존재 확인
    const student = await trx('students')
      .where('student_id', id)
      .first();

    if (!student) {
      await trx.rollback();
      return res.status(404).json({
        error: {
          message: 'Student not found',
          message_ko: '학생을 찾을 수 없습니다',
          message_vi: 'Không tìm thấy sinh viên'
        }
      });
    }

    // 상태 업데이트
    if (status && status !== student.status) {
      await trx('students')
        .where('student_id', id)
        .update({ 
          status,
          updated_at: new Date()
        });
    }

    // 속성 업데이트
    if (attributes && Object.keys(attributes).length > 0) {
      const definitions = await trx('attribute_definitions')
        .whereIn('attribute_key', Object.keys(attributes))
        .select('attribute_key', 'is_encrypted', 'is_sensitive');

      for (let def of definitions) {
        let value = attributes[def.attribute_key];
        
        if (value !== undefined) {
          // 민감정보 암호화
          if (def.is_encrypted && value !== null) {
            value = encrypt(value.toString());
          }

          // Upsert 속성
          const existing = await trx('student_attributes')
            .where({
              student_id: id,
              attribute_key: def.attribute_key
            })
            .first();

          if (existing) {
            await trx('student_attributes')
              .where({
                student_id: id,
                attribute_key: def.attribute_key
              })
              .update({
                attribute_value: value,
                is_encrypted: def.is_encrypted,
                updated_by: req.user.user_id,
                updated_at: new Date()
              });
          } else {
            await trx('student_attributes')
              .insert({
                student_id: id,
                attribute_key: def.attribute_key,
                attribute_value: value,
                is_encrypted: def.is_encrypted,
                updated_by: req.user.user_id
              });
          }
        }
      }
    }

    // 감사 로그
    req.trx = trx;
    await logAction(req, 'UPDATE', 'students', id, student, { status, attributes });

    await trx.commit();

    res.json({
      success: true,
      message: 'Student updated successfully',
      message_ko: '학생 정보가 성공적으로 수정되었습니다',
      message_vi: 'Cập nhật thông tin sinh viên thành công'
    });

  } catch (error) {
    await trx.rollback();
    console.error('Update student error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update student',
        message_ko: '학생 정보 수정에 실패했습니다',
        message_vi: 'Không thể cập nhật thông tin sinh viên'
      }
    });
  }
});

// 학생 삭제 (실제로는 상태 변경)
router.delete('/:id',
  checkRole('admin'),
  async (req, res) => {
  try {
    const { id } = req.params;

    const student = await db('students')
      .where('student_id', id)
      .first();

    if (!student) {
      return res.status(404).json({
        error: {
          message: 'Student not found',
          message_ko: '학생을 찾을 수 없습니다',
          message_vi: 'Không tìm thấy sinh viên'
        }
      });
    }

    // 소프트 삭제 (상태를 archived로 변경)
    await db('students')
      .where('student_id', id)
      .update({
        status: 'archived',
        updated_at: new Date()
      });

    // 감사 로그
    await logAction(req, 'DELETE', 'students', id, student, { status: 'archived' });

    res.json({
      success: true,
      message: 'Student archived successfully',
      message_ko: '학생 정보가 보관 처리되었습니다',
      message_vi: 'Thông tin sinh viên đã được lưu trữ'
    });

  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete student',
        message_ko: '학생 삭제에 실패했습니다',
        message_vi: 'Không thể xóa sinh viên'
      }
    });
  }
});

module.exports = router;