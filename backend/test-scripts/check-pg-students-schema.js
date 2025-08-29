const db = require('./config/database');

async function checkStudentsSchema() {
  try {
    console.log('🔍 Checking students table schema in PostgreSQL...\n');
    
    // PostgreSQL용 컬럼 정보 조회
    const columns = await db.raw(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'students'
      ORDER BY ordinal_position
    `);
    
    console.log('students 테이블 구조:');
    console.log('===============================');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`${col.column_name}: ${col.data_type}${length} ${nullable}`);
    });
    
    // 희망대학/전공 관련 컬럼 확인
    const hasTargetFields = columns.rows.some(col => 
      col.column_name === 'target_university' || col.column_name === 'target_major'
    );
    
    if (!hasTargetFields) {
      console.log('\n⚠️ target_university 또는 target_major 컬럼이 없습니다.');
      console.log('컬럼 추가가 필요할 수 있습니다.');
    } else {
      console.log('\n✅ target_university와 target_major 컬럼이 존재합니다.');
    }
    
    // 샘플 데이터 확인
    console.log('\n샘플 학생 데이터:');
    const students = await db('students').select('*').limit(1);
    if (students.length > 0) {
      console.log(JSON.stringify(students[0], null, 2));
    } else {
      console.log('학생 데이터가 없습니다.');
    }
    
    // university_history 테이블 확인
    console.log('\n\n🔍 Checking university_history table...');
    try {
      const historyColumns = await db.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'university_history'
      `);
      
      if (historyColumns.rows.length > 0) {
        console.log('✅ university_history 테이블이 존재합니다.');
        historyColumns.rows.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type}`);
        });
      } else {
        console.log('⚠️ university_history 테이블이 없습니다. 생성이 필요합니다.');
      }
    } catch (err) {
      console.log('⚠️ university_history 테이블 확인 실패. 생성이 필요할 수 있습니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentsSchema();