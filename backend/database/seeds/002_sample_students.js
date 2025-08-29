const { encrypt } = require('../../utils/encryption');

exports.seed = async function(knex) {
  // 기존 학생 데이터 삭제 (개발 환경에서만)
  await knex('student_attributes').del();
  await knex('students').del();

  // Teacher 사용자 ID 조회
  const teacher = await knex('users')
    .where('email', 'teacher@hanoi.edu')
    .first();

  const admin = await knex('users')
    .where('email', 'admin@vsms.com')
    .first();

  if (!teacher || !admin) {
    console.log('⚠️ Users not found. Please run 001_initial_data.js first.');
    return;
  }

  // 1. 학생 생성 - 교사 소속
  const teacherStudents = await knex('students').insert([
    {
      student_code: '20240001',
      status: 'studying',
      agency_id: teacher.user_id, // 교사의 user_id를 agency_id로 사용
      created_by: teacher.user_id
    },
    {
      student_code: '20240002',
      status: 'studying',
      agency_id: teacher.user_id,
      created_by: teacher.user_id
    },
    {
      student_code: '20240003',
      status: 'graduated',
      agency_id: teacher.user_id,
      created_by: teacher.user_id
    }
  ]).returning('student_id');

  // 2. 다른 유학원 학생 (관리자가 생성)
  const otherStudents = await knex('students').insert([
    {
      student_code: '20240004',
      status: 'studying',
      agency_id: null, // 다른 유학원 또는 직접 관리
      created_by: admin.user_id
    },
    {
      student_code: '20240005',
      status: 'studying',
      agency_id: null,
      created_by: admin.user_id
    }
  ]).returning('student_id');

  // 3. 학생 속성 추가 (교사 소속 학생들)
  const studentAttributes = [];
  
  // 첫 번째 학생
  studentAttributes.push(
    {
      student_id: teacherStudents[0].student_id,
      attribute_key: 'name',
      attribute_value: 'Nguyen Van A',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[0].student_id,
      attribute_key: 'birth_date',
      attribute_value: '2005-03-15',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[0].student_id,
      attribute_key: 'phone',
      attribute_value: '+84 912345678',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[0].student_id,
      attribute_key: 'email',
      attribute_value: 'nguyenvana@example.com',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[0].student_id,
      attribute_key: 'parent_income',
      attribute_value: encrypt('50000 USD/year'),
      is_encrypted: true,
      updated_by: teacher.user_id
    }
  );

  // 두 번째 학생
  studentAttributes.push(
    {
      student_id: teacherStudents[1].student_id,
      attribute_key: 'name',
      attribute_value: 'Tran Thi B',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[1].student_id,
      attribute_key: 'birth_date',
      attribute_value: '2004-07-20',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[1].student_id,
      attribute_key: 'phone',
      attribute_value: '+84 987654321',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[1].student_id,
      attribute_key: 'email',
      attribute_value: 'tranthib@example.com',
      is_encrypted: false,
      updated_by: teacher.user_id
    }
  );

  // 세 번째 학생
  studentAttributes.push(
    {
      student_id: teacherStudents[2].student_id,
      attribute_key: 'name',
      attribute_value: 'Le Van C',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[2].student_id,
      attribute_key: 'birth_date',
      attribute_value: '2003-11-10',
      is_encrypted: false,
      updated_by: teacher.user_id
    },
    {
      student_id: teacherStudents[2].student_id,
      attribute_key: 'phone',
      attribute_value: '+84 911222333',
      is_encrypted: false,
      updated_by: teacher.user_id
    }
  );

  // 4. 다른 유학원 학생 속성 (관리자만 볼 수 있음)
  studentAttributes.push(
    {
      student_id: otherStudents[0].student_id,
      attribute_key: 'name',
      attribute_value: 'Park Min D',
      is_encrypted: false,
      updated_by: admin.user_id
    },
    {
      student_id: otherStudents[0].student_id,
      attribute_key: 'birth_date',
      attribute_value: '2005-01-25',
      is_encrypted: false,
      updated_by: admin.user_id
    },
    {
      student_id: otherStudents[0].student_id,
      attribute_key: 'phone',
      attribute_value: '+82 1012345678',
      is_encrypted: false,
      updated_by: admin.user_id
    }
  );

  studentAttributes.push(
    {
      student_id: otherStudents[1].student_id,
      attribute_key: 'name',
      attribute_value: 'Kim Young E',
      is_encrypted: false,
      updated_by: admin.user_id
    },
    {
      student_id: otherStudents[1].student_id,
      attribute_key: 'birth_date',
      attribute_value: '2004-09-30',
      is_encrypted: false,
      updated_by: admin.user_id
    },
    {
      student_id: otherStudents[1].student_id,
      attribute_key: 'phone',
      attribute_value: '+82 1087654321',
      is_encrypted: false,
      updated_by: admin.user_id
    }
  );

  // 속성 저장
  await knex('student_attributes').insert(studentAttributes);

  console.log('✅ Sample students created successfully');
  console.log('   - 3 students for teacher@hanoi.edu (agency)');
  console.log('   - 2 students for admin only');
};