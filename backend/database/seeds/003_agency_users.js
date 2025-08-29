const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // 유학원별 다중 계정 생성
  const password = await bcrypt.hash('teacher2024', 10);
  
  // 1. Hanoi Education Center - 3명의 교사
  const hanoiUsers = [
    {
      email: 'teacher1.hanoi@vsms.com',
      password_hash: password,
      full_name: 'Nguyen Van An',
      role: 'teacher',
      agency_name: 'Hanoi Education Center',
      phone: '+84 901234567',
      preferred_language: 'vi',
      is_active: true
    },
    {
      email: 'teacher2.hanoi@vsms.com',
      password_hash: password,
      full_name: 'Tran Thi Binh',
      role: 'teacher',
      agency_name: 'Hanoi Education Center',
      phone: '+84 901234568',
      preferred_language: 'vi',
      is_active: true
    },
    {
      email: 'teacher3.hanoi@vsms.com',
      password_hash: password,
      full_name: 'Le Van Cuong',
      role: 'teacher',
      agency_name: 'Hanoi Education Center',
      phone: '+84 901234569',
      preferred_language: 'vi',
      is_active: true
    }
  ];

  // 2. Saigon Study Agency - 2명의 교사
  const saigonUsers = [
    {
      email: 'teacher1.saigon@vsms.com',
      password_hash: password,
      full_name: 'Pham Van Duc',
      role: 'teacher',
      agency_name: 'Saigon Study Agency',
      phone: '+84 902345678',
      preferred_language: 'vi',
      is_active: true
    },
    {
      email: 'teacher2.saigon@vsms.com',
      password_hash: password,
      full_name: 'Vo Thi Em',
      role: 'teacher',
      agency_name: 'Saigon Study Agency',
      phone: '+84 902345679',
      preferred_language: 'vi',
      is_active: true
    }
  ];

  // 3. Da Nang Global Education - 2명의 교사
  const danangUsers = [
    {
      email: 'teacher1.danang@vsms.com',
      password_hash: password,
      full_name: 'Hoang Van Phuc',
      role: 'teacher',
      agency_name: 'Da Nang Global Education',
      phone: '+84 903456789',
      preferred_language: 'vi',
      is_active: true
    },
    {
      email: 'teacher2.danang@vsms.com',
      password_hash: password,
      full_name: 'Truong Thi Giang',
      role: 'teacher',
      agency_name: 'Da Nang Global Education',
      phone: '+84 903456790',
      preferred_language: 'vi',
      is_active: true
    }
  ];

  // 기존 유학원 교사 계정 삭제 (샘플 데이터용)
  await knex('users')
    .where('email', 'like', 'teacher%.%@vsms.com')
    .del();

  // 새 계정 추가
  const allUsers = [...hanoiUsers, ...saigonUsers, ...danangUsers];
  const insertedUsers = await knex('users').insert(allUsers).returning('*');

  console.log('✅ Agency teacher accounts created:');
  console.log('   - Hanoi Education Center: 3 teachers');
  console.log('   - Saigon Study Agency: 2 teachers');
  console.log('   - Da Nang Global Education: 2 teachers');
  console.log('   - All passwords: teacher2024');

  // 각 유학원별로 샘플 학생 데이터 생성
  const hanoiTeacher = insertedUsers.find(u => u.email === 'teacher1.hanoi@vsms.com');
  const saigonTeacher = insertedUsers.find(u => u.email === 'teacher1.saigon@vsms.com');
  const danangTeacher = insertedUsers.find(u => u.email === 'teacher1.danang@vsms.com');

  if (hanoiTeacher && saigonTeacher && danangTeacher) {
    // 기존 학생 데이터 정리
    await knex('student_attributes')
      .whereIn('student_id', function() {
        this.select('student_id')
          .from('students')
          .whereIn('student_code', [
            '20241001', '20241002', '20241003',
            '20242001', '20242002',
            '20243001', '20243002'
          ]);
      })
      .del();

    await knex('students')
      .whereIn('student_code', [
        '20241001', '20241002', '20241003',
        '20242001', '20242002',
        '20243001', '20243002'
      ])
      .del();

    // Hanoi 학생들
    const hanoiStudents = await knex('students').insert([
      {
        student_code: '20241001',
        status: 'studying',
        agency_id: hanoiTeacher.user_id,
        created_by: hanoiTeacher.user_id
      },
      {
        student_code: '20241002',
        status: 'studying',
        agency_id: hanoiTeacher.user_id,
        created_by: hanoiTeacher.user_id
      },
      {
        student_code: '20241003',
        status: 'graduated',
        agency_id: hanoiTeacher.user_id,
        created_by: hanoiTeacher.user_id
      }
    ]).returning('student_id');

    // Saigon 학생들
    const saigonStudents = await knex('students').insert([
      {
        student_code: '20242001',
        status: 'studying',
        agency_id: saigonTeacher.user_id,
        created_by: saigonTeacher.user_id
      },
      {
        student_code: '20242002',
        status: 'studying',
        agency_id: saigonTeacher.user_id,
        created_by: saigonTeacher.user_id
      }
    ]).returning('student_id');

    // Da Nang 학생들
    const danangStudents = await knex('students').insert([
      {
        student_code: '20243001',
        status: 'studying',
        agency_id: danangTeacher.user_id,
        created_by: danangTeacher.user_id
      },
      {
        student_code: '20243002',
        status: 'studying',
        agency_id: danangTeacher.user_id,
        created_by: danangTeacher.user_id
      }
    ]).returning('student_id');

    // 학생 기본 정보 추가
    const studentAttributes = [];
    
    // Hanoi 학생 정보
    if (hanoiStudents[0]) {
      studentAttributes.push(
        {
          student_id: hanoiStudents[0].student_id,
          attribute_key: 'name',
          attribute_value: 'Nguyen Hanoi A',
          is_encrypted: false,
          updated_by: hanoiTeacher.user_id
        },
        {
          student_id: hanoiStudents[0].student_id,
          attribute_key: 'email',
          attribute_value: 'hanoi.a@example.com',
          is_encrypted: false,
          updated_by: hanoiTeacher.user_id
        }
      );
    }

    if (hanoiStudents[1]) {
      studentAttributes.push(
        {
          student_id: hanoiStudents[1].student_id,
          attribute_key: 'name',
          attribute_value: 'Tran Hanoi B',
          is_encrypted: false,
          updated_by: hanoiTeacher.user_id
        },
        {
          student_id: hanoiStudents[1].student_id,
          attribute_key: 'email',
          attribute_value: 'hanoi.b@example.com',
          is_encrypted: false,
          updated_by: hanoiTeacher.user_id
        }
      );
    }

    // Saigon 학생 정보
    if (saigonStudents[0]) {
      studentAttributes.push(
        {
          student_id: saigonStudents[0].student_id,
          attribute_key: 'name',
          attribute_value: 'Pham Saigon A',
          is_encrypted: false,
          updated_by: saigonTeacher.user_id
        },
        {
          student_id: saigonStudents[0].student_id,
          attribute_key: 'email',
          attribute_value: 'saigon.a@example.com',
          is_encrypted: false,
          updated_by: saigonTeacher.user_id
        }
      );
    }

    // Da Nang 학생 정보
    if (danangStudents[0]) {
      studentAttributes.push(
        {
          student_id: danangStudents[0].student_id,
          attribute_key: 'name',
          attribute_value: 'Hoang Danang A',
          is_encrypted: false,
          updated_by: danangTeacher.user_id
        },
        {
          student_id: danangStudents[0].student_id,
          attribute_key: 'email',
          attribute_value: 'danang.a@example.com',
          is_encrypted: false,
          updated_by: danangTeacher.user_id
        }
      );
    }

    await knex('student_attributes').insert(studentAttributes);

    console.log('✅ Sample students created for each agency:');
    console.log('   - Hanoi: 3 students (20241001-20241003)');
    console.log('   - Saigon: 2 students (20242001-20242002)');
    console.log('   - Da Nang: 2 students (20243001-20243002)');
  }
};