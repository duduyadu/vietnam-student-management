const db = require('./config/database');

async function checkConsultationsSchema() {
  try {
    console.log('🔍 Checking consultations table schema in PostgreSQL...\n');
    
    // PostgreSQL용 컬럼 정보 조회
    const columns = await db.raw(`
      SELECT 
        column_name, 
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'consultations'
      ORDER BY ordinal_position
    `);
    
    console.log('consultations 테이블 구조:');
    console.log('===============================');
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${col.column_name}: ${col.data_type} ${nullable}`);
    });
    
    // 학습 진도 관련 컬럼 확인
    const progressFields = ['attendance_rate', 'participation_rate', 'homework_rate'];
    const hasProgressFields = columns.rows.filter(col => 
      progressFields.includes(col.column_name)
    );
    
    if (hasProgressFields.length === 0) {
      console.log('\n⚠️ 학습 진도 관련 컬럼이 없습니다.');
      console.log('attendance_rate, participation_rate, homework_rate 컬럼이 필요할 수 있습니다.');
    } else {
      console.log('\n✅ 발견된 학습 진도 컬럼:');
      hasProgressFields.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
    // 샘플 데이터 확인
    console.log('\n샘플 상담 데이터:');
    const consultations = await db('consultations').select('*').limit(1);
    if (consultations.length > 0) {
      console.log(JSON.stringify(consultations[0], null, 2));
    } else {
      console.log('상담 데이터가 없습니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkConsultationsSchema();