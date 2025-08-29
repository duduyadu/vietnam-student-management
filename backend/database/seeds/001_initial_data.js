const bcrypt = require('bcrypt');

exports.seed = async function(knex) {
  // 기존 데이터 삭제 (개발 환경에서만)
  await knex('audit_logs').del();
  await knex('menu_translations').del();
  await knex('menu_items').del();
  await knex('consultations').del();
  await knex('student_attributes').del();
  await knex('attribute_definitions').del();
  await knex('students').del();
  await knex('users').del();

  // 1. 초기 사용자 생성
  const adminPassword = await bcrypt.hash('admin2024', 10);
  const teacherPassword = await bcrypt.hash('teacher2024', 10);
  const branchPassword = await bcrypt.hash('branch2024', 10);
  
  await knex('users').insert([
    {
      email: 'admin@vsms.com',
      password_hash: adminPassword,
      full_name: '시스템 관리자',
      role: 'admin',
      preferred_language: 'ko',
      is_active: true
    },
    {
      email: 'teacher@hanoi.edu',
      password_hash: teacherPassword,
      full_name: 'Nguyen Van Teacher',
      role: 'teacher',
      agency_name: '하노이 유학원',
      preferred_language: 'vi',
      is_active: true
    },
    {
      email: 'seoul@branch.com',
      password_hash: branchPassword,
      full_name: '서울지점 담당자',
      role: 'korean_branch',
      branch_name: '서울 강남지점',
      preferred_language: 'ko',
      is_active: true
    }
  ]);

  // 2. 속성 정의 생성
  await knex('attribute_definitions').insert([
    // 기본 정보
    {
      attribute_key: 'name',
      attribute_name_ko: '이름',
      attribute_name_vi: 'Họ và tên',
      data_type: 'text',
      is_required: true,
      category: 'basic',
      display_order: 1
    },
    {
      attribute_key: 'birth_date',
      attribute_name_ko: '생년월일',
      attribute_name_vi: 'Ngày sinh',
      data_type: 'date',
      is_required: true,
      category: 'basic',
      display_order: 2
    },
    {
      attribute_key: 'gender',
      attribute_name_ko: '성별',
      attribute_name_vi: 'Giới tính',
      data_type: 'select',
      select_options: JSON.stringify({
        ko: ['남성', '여성'],
        vi: ['Nam', 'Nữ']
      }),
      is_required: true,
      category: 'basic',
      display_order: 3
    },
    {
      attribute_key: 'phone',
      attribute_name_ko: '연락처',
      attribute_name_vi: 'Số điện thoại',
      data_type: 'text',
      is_required: true,
      category: 'basic',
      display_order: 4,
      validation_rules: JSON.stringify({
        pattern: '^[0-9+\\-\\s]+$'
      })
    },
    {
      attribute_key: 'email',
      attribute_name_ko: '이메일',
      attribute_name_vi: 'Email',
      data_type: 'text',
      category: 'basic',
      display_order: 5,
      validation_rules: JSON.stringify({
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      })
    },
    {
      attribute_key: 'address_vietnam',
      attribute_name_ko: '베트남 주소',
      attribute_name_vi: 'Địa chỉ tại Việt Nam',
      data_type: 'text',
      category: 'basic',
      display_order: 6
    },
    {
      attribute_key: 'address_korea',
      attribute_name_ko: '한국 주소',
      attribute_name_vi: 'Địa chỉ tại Hàn Quốc',
      data_type: 'text',
      category: 'basic',
      display_order: 7
    },
    
    // 가족 정보
    {
      attribute_key: 'parent_name',
      attribute_name_ko: '부모님 성함',
      attribute_name_vi: 'Tên phụ huynh',
      data_type: 'text',
      is_required: true,
      category: 'family',
      display_order: 8
    },
    {
      attribute_key: 'parent_phone',
      attribute_name_ko: '부모님 연락처',
      attribute_name_vi: 'Số điện thoại phụ huynh',
      data_type: 'text',
      is_required: true,
      category: 'family',
      display_order: 9
    },
    {
      attribute_key: 'parent_income',
      attribute_name_ko: '가족 연소득',
      attribute_name_vi: 'Thu nhập gia đình',
      data_type: 'text',
      is_sensitive: true,
      is_encrypted: true,
      category: 'family',
      display_order: 10
    },
    
    // 학업 정보
    {
      attribute_key: 'high_school',
      attribute_name_ko: '출신 고등학교',
      attribute_name_vi: 'Trường trung học',
      data_type: 'text',
      category: 'academic',
      display_order: 11
    },
    {
      attribute_key: 'gpa',
      attribute_name_ko: '고등학교 성적',
      attribute_name_vi: 'Điểm trung bình',
      data_type: 'number',
      category: 'academic',
      display_order: 12,
      validation_rules: JSON.stringify({
        min: 0,
        max: 10
      })
    },
    {
      attribute_key: 'transcript',
      attribute_name_ko: '성적표',
      attribute_name_vi: 'Bảng điểm',
      data_type: 'file',
      category: 'academic',
      display_order: 13
    },
    {
      attribute_key: 'desired_major',
      attribute_name_ko: '희망 전공',
      attribute_name_vi: 'Ngành học mong muốn',
      data_type: 'text',
      category: 'academic',
      display_order: 14
    },
    {
      attribute_key: 'desired_university',
      attribute_name_ko: '희망 대학',
      attribute_name_vi: 'Trường đại học mong muốn',
      data_type: 'text',
      category: 'academic',
      display_order: 15
    },
    
    // 비자 정보
    {
      attribute_key: 'visa_type',
      attribute_name_ko: '비자 종류',
      attribute_name_vi: 'Loại visa',
      data_type: 'select',
      select_options: JSON.stringify({
        options: ['D-2', 'D-4-1', 'D-4-7', 'Other']
      }),
      category: 'visa',
      display_order: 16
    },
    {
      attribute_key: 'visa_expiry',
      attribute_name_ko: '비자 만료일',
      attribute_name_vi: 'Ngày hết hạn visa',
      data_type: 'date',
      category: 'visa',
      display_order: 17
    },
    {
      attribute_key: 'alien_registration',
      attribute_name_ko: '외국인등록번호',
      attribute_name_vi: 'Số đăng ký người nước ngoài',
      data_type: 'text',
      is_sensitive: true,
      category: 'visa',
      display_order: 18
    }
  ]);

  // 3. 메뉴 아이템 생성
  const menuItems = await knex('menu_items').insert([
    {
      menu_key: 'dashboard',
      icon: 'Dashboard',
      route: '/dashboard',
      sort_order: 1,
      required_roles: JSON.stringify(['admin', 'teacher', 'korean_branch'])
    },
    {
      menu_key: 'students',
      icon: 'School',
      route: '/students',
      sort_order: 2,
      required_roles: JSON.stringify(['admin', 'teacher', 'korean_branch'])
    },
    {
      menu_key: 'consultations',
      icon: 'RecordVoiceOver',
      route: '/consultations',
      sort_order: 3,
      required_roles: JSON.stringify(['admin', 'teacher'])
    },
    {
      menu_key: 'reports',
      icon: 'Assessment',
      route: '/reports',
      sort_order: 4,
      required_roles: JSON.stringify(['admin', 'teacher'])
    },
    {
      menu_key: 'users',
      icon: 'People',
      route: '/users',
      sort_order: 5,
      required_roles: JSON.stringify(['admin'])
    },
    {
      menu_key: 'settings',
      icon: 'Settings',
      route: '/settings',
      sort_order: 6,
      required_roles: JSON.stringify(['admin'])
    }
  ]).returning('menu_id');

  // 4. 메뉴 번역 생성
  const menuTranslations = [];
  const menuData = [
    { key: 'dashboard', ko: '대시보드', vi: 'Bảng điều khiển' },
    { key: 'students', ko: '학생 관리', vi: 'Quản lý sinh viên' },
    { key: 'consultations', ko: '상담 기록', vi: 'Hồ sơ tư vấn' },
    { key: 'reports', ko: '보고서', vi: 'Báo cáo' },
    { key: 'users', ko: '사용자 관리', vi: 'Quản lý người dùng' },
    { key: 'settings', ko: '설정', vi: 'Cài đặt' }
  ];

  for (let i = 0; i < menuItems.length; i++) {
    const menuId = menuItems[i].menu_id;
    const menuInfo = menuData[i];
    
    menuTranslations.push(
      {
        menu_id: menuId,
        language_code: 'ko',
        menu_name: menuInfo.ko
      },
      {
        menu_id: menuId,
        language_code: 'vi',
        menu_name: menuInfo.vi
      }
    );
  }

  await knex('menu_translations').insert(menuTranslations);

  console.log('✅ Initial data seeded successfully');
};