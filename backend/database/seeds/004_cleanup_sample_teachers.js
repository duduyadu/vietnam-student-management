const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // 기존 샘플 교사 계정 모두 삭제
  await knex('student_attributes')
    .whereIn('student_id', function() {
      this.select('student_id')
        .from('students')
        .whereIn('agency_id', function() {
          this.select('user_id')
            .from('users')
            .where('email', 'like', 'teacher%.%@vsms.com');
        });
    })
    .del();

  await knex('students')
    .whereIn('agency_id', function() {
      this.select('user_id')
        .from('users')
        .where('email', 'like', 'teacher%.%@vsms.com');
    })
    .del();

  await knex('users')
    .where('email', 'like', 'teacher%.%@vsms.com')
    .del();

  // 기본 teacher@hanoi.edu도 삭제
  await knex('student_attributes')
    .whereIn('student_id', function() {
      this.select('student_id')
        .from('students')
        .whereIn('agency_id', function() {
          this.select('user_id')
            .from('users')
            .where('email', 'teacher@hanoi.edu');
        });
    })
    .del();

  await knex('students')
    .whereIn('agency_id', function() {
      this.select('user_id')
        .from('users')
        .where('email', 'teacher@hanoi.edu');
    })
    .del();

  await knex('users')
    .where('email', 'teacher@hanoi.edu')
    .del();

  console.log('✅ Cleaned up all sample teacher accounts');

  // 2개의 기본 교사 계정만 생성
  const password = await bcrypt.hash('teacher2024', 10);
  
  const teachers = [
    {
      email: 'teacher1@vsms.com',
      password_hash: password,
      full_name: '김선생',
      role: 'teacher',
      agency_name: 'Sample Agency 1',
      phone: '+84 901234567',
      preferred_language: 'ko',
      is_active: true
    },
    {
      email: 'teacher2@vsms.com',
      password_hash: password,
      full_name: '이선생',
      role: 'teacher',
      agency_name: 'Sample Agency 2',
      phone: '+84 901234568',
      preferred_language: 'ko',
      is_active: true
    }
  ];

  const insertedTeachers = await knex('users').insert(teachers).returning('*');

  console.log('✅ Created 2 sample teacher accounts:');
  console.log('   - teacher1@vsms.com / teacher2024 (Sample Agency 1)');
  console.log('   - teacher2@vsms.com / teacher2024 (Sample Agency 2)');

  // 각 교사에게 샘플 학생 2명씩 생성
  if (insertedTeachers && insertedTeachers.length >= 2) {
    const teacher1 = insertedTeachers.find(t => t.email === 'teacher1@vsms.com');
    const teacher2 = insertedTeachers.find(t => t.email === 'teacher2@vsms.com');

    if (teacher1 && teacher2) {
      // Teacher1의 학생들
      const students1 = await knex('students').insert([
        {
          student_code: '20240101',
          status: 'studying',
          agency_id: teacher1.user_id,
          created_by: teacher1.user_id
        },
        {
          student_code: '20240102',
          status: 'studying',
          agency_id: teacher1.user_id,
          created_by: teacher1.user_id
        }
      ]).returning('student_id');

      // Teacher2의 학생들
      const students2 = await knex('students').insert([
        {
          student_code: '20240201',
          status: 'studying',
          agency_id: teacher2.user_id,
          created_by: teacher2.user_id
        },
        {
          student_code: '20240202',
          status: 'studying',
          agency_id: teacher2.user_id,
          created_by: teacher2.user_id
        }
      ]).returning('student_id');

      // 학생 기본 정보 추가
      const studentAttributes = [];
      
      if (students1[0]) {
        studentAttributes.push(
          {
            student_id: students1[0].student_id,
            attribute_key: 'name',
            attribute_value: '홍길동',
            is_encrypted: false,
            updated_by: teacher1.user_id
          },
          {
            student_id: students1[0].student_id,
            attribute_key: 'email',
            attribute_value: 'student1@example.com',
            is_encrypted: false,
            updated_by: teacher1.user_id
          }
        );
      }

      if (students1[1]) {
        studentAttributes.push(
          {
            student_id: students1[1].student_id,
            attribute_key: 'name',
            attribute_value: '김철수',
            is_encrypted: false,
            updated_by: teacher1.user_id
          },
          {
            student_id: students1[1].student_id,
            attribute_key: 'email',
            attribute_value: 'student2@example.com',
            is_encrypted: false,
            updated_by: teacher1.user_id
          }
        );
      }

      if (students2[0]) {
        studentAttributes.push(
          {
            student_id: students2[0].student_id,
            attribute_key: 'name',
            attribute_value: '이영희',
            is_encrypted: false,
            updated_by: teacher2.user_id
          },
          {
            student_id: students2[0].student_id,
            attribute_key: 'email',
            attribute_value: 'student3@example.com',
            is_encrypted: false,
            updated_by: teacher2.user_id
          }
        );
      }

      if (students2[1]) {
        studentAttributes.push(
          {
            student_id: students2[1].student_id,
            attribute_key: 'name',
            attribute_value: '박민수',
            is_encrypted: false,
            updated_by: teacher2.user_id
          },
          {
            student_id: students2[1].student_id,
            attribute_key: 'email',
            attribute_value: 'student4@example.com',
            is_encrypted: false,
            updated_by: teacher2.user_id
          }
        );
      }

      await knex('student_attributes').insert(studentAttributes);

      console.log('✅ Created sample students:');
      console.log('   - Sample Agency 1: 2 students (20240101-20240102)');
      console.log('   - Sample Agency 2: 2 students (20240201-20240202)');
    }
  }
};