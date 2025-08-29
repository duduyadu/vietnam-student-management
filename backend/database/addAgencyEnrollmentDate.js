const db = require('../config/database');

async function addAgencyEnrollmentDate() {
  console.log('📅 유학원 등록 년월 필드 추가 중...');
  
  try {
    // 1. students 테이블에 컬럼 추가
    await db.raw(`
      ALTER TABLE students 
      ADD COLUMN agency_enrollment_date VARCHAR(10)
    `);
    console.log('✅ students 테이블에 agency_enrollment_date 컬럼 추가 완료');
    
    // 2. attribute_definitions에도 추가 (선택적으로 UI에서 관리 가능)
    const existingDef = await db('attribute_definitions')
      .where('attribute_key', 'agency_enrollment_date')
      .first();
    
    if (!existingDef) {
      await db('attribute_definitions').insert({
        attribute_key: 'agency_enrollment_date',
        attribute_name_ko: '유학원 등록 년월',
        attribute_name_vi: 'Tháng năm đăng ký trung tâm',
        data_type: 'date',
        category: 'basic',
        is_sensitive: 0,
        is_encrypted: 0,
        display_order: 25
      });
      console.log('✅ attribute_definitions에 유학원 등록 년월 정의 추가 완료');
    }
    
    console.log('✨ 유학원 등록 년월 필드 추가 완료!');
    
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ agency_enrollment_date 컬럼이 이미 존재합니다.');
    } else {
      console.error('❌ 오류:', error.message);
    }
  }
  
  process.exit(0);
}

addAgencyEnrollmentDate();