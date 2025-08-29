const db = require('../config/database');

async function checkTables() {
  try {
    // agencies 테이블 확인
    const agencies = await db('agencies').select('*').limit(5);
    console.log('📋 Agencies 테이블 데이터:');
    console.log(agencies);
    
    // students 테이블 구조 확인
    const studentColumns = await db.raw("PRAGMA table_info('students')");
    console.log('\n📋 Students 테이블 컬럼:');
    studentColumns.forEach(col => {
      console.log(`- ${col.name}: ${col.type}`);
    });
    
    // 유학원 수 확인
    const agencyCount = await db('agencies').count('* as count').first();
    console.log('\n📊 총 유학원 수:', agencyCount.count);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  process.exit(0);
}

checkTables();