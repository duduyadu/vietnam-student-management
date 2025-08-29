const db = require('./config/database');

async function fixConsultationsSchema() {
  try {
    console.log('🔍 consultations 테이블 상세 구조 확인...');
    
    // 현재 consultations 테이블 구조 확인
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'consultations' 
      ORDER BY ordinal_position
    `);
    
    console.log('현재 consultations 테이블 구조:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}) ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // 필요한 컬럼들이 있는지 확인
    const currentColumns = columns.rows.map(row => row.column_name);
    const requiredColumns = ['content_ko', 'content_vi', 'action_items', 'next_consultation_date', 'teacher_id'];
    
    console.log('\n필요한 컬럼 확인:');
    requiredColumns.forEach(col => {
      const exists = currentColumns.includes(col);
      console.log(`  ${col}: ${exists ? '✅ 존재' : '❌ 없음'}`);
    });
    
    // 백엔드 코드에서 기대하는 컬럼들과 비교
    console.log('\n백엔드 코드 vs 실제 테이블:');
    console.log('  백엔드에서 사용하는 컬럼: content_ko, content_vi, action_items, next_consultation_date, teacher_id');
    console.log('  실제 테이블의 컬럼:', currentColumns.join(', '));
    
    // 테이블 수정이 필요한지 확인
    const missingColumns = requiredColumns.filter(col => !currentColumns.includes(col));
    if (missingColumns.length > 0) {
      console.log('\n⚠️  다음 컬럼들이 누락되었습니다:', missingColumns);
      console.log('   이 컬럼들을 추가해야 상담 기록 API가 정상 작동합니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixConsultationsSchema();