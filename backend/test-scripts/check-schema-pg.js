const db = require('./config/database');

async function checkSchema() {
  try {
    console.log('🔍 데이터베이스 테이블 확인...');
    
    // 테이블 목록 확인
    const tables = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('존재하는 테이블들:', tables.rows.map(r => r.table_name));
    
    // students 테이블 구조 확인
    console.log('\n📊 students 테이블 구조:');
    const studentsSchema = await db.raw("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'students' ORDER BY ordinal_position");
    studentsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // consultations 테이블 구조 확인
    console.log('\n📊 consultations 테이블 구조:');
    const consultationsSchema = await db.raw("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'consultations' ORDER BY ordinal_position");
    consultationsSchema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // 뷰 확인
    console.log('\n📊 존재하는 뷰들:');
    const views = await db.raw("SELECT table_name FROM information_schema.views WHERE table_schema = 'public'");
    views.rows.forEach(view => {
      console.log(`  - ${view.table_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSchema();