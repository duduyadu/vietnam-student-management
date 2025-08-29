const db = require('./config/database');

async function fixDatabaseStructure() {
  try {
    console.log('🔧 데이터베이스 구조 수정 시작...');

    // 1. consultations 테이블에 필요한 컬럼 추가
    console.log('\n📊 consultations 테이블 수정...');
    
    const alterConsultationsSQL = `
      ALTER TABLE consultations 
      ADD COLUMN IF NOT EXISTS content_ko TEXT,
      ADD COLUMN IF NOT EXISTS content_vi TEXT,
      ADD COLUMN IF NOT EXISTS action_items TEXT,
      ADD COLUMN IF NOT EXISTS next_consultation_date TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS teacher_id INTEGER REFERENCES users(user_id);
    `;
    
    await db.raw(alterConsultationsSQL);
    console.log('✅ consultations 테이블에 필요한 컬럼들이 추가되었습니다.');

    // 2. 기존 데이터가 있다면 notes를 content_ko로 이관
    console.log('\n📋 기존 데이터 이관...');
    await db.raw(`
      UPDATE consultations 
      SET content_ko = notes, teacher_id = created_by 
      WHERE content_ko IS NULL AND notes IS NOT NULL;
    `);
    console.log('✅ 기존 notes 데이터를 content_ko로 이관했습니다.');

    // 3. 수정된 테이블 구조 확인
    console.log('\n🔍 수정된 consultations 테이블 구조 확인...');
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'consultations' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ 수정된 consultations 테이블 구조:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    console.log('\n✅ 데이터베이스 구조 수정 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 데이터베이스 수정 중 오류:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixDatabaseStructure();