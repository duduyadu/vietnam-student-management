const db = require('./config/database');

async function checkSchema() {
  try {
    // users 테이블의 컬럼 정보 확인
    const columns = await db.raw("PRAGMA table_info('users')");
    
    console.log('users 테이블 구조:');
    console.log('===============================');
    columns.forEach(col => {
      console.log(`${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : 'NULL'} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSchema();