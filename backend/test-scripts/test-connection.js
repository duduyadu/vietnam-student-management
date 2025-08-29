const db = require('./config/database');

async function testConnection() {
  console.log('🔍 Supabase 연결 테스트 시작...');
  const startTime = Date.now();
  
  try {
    // 1. 기본 연결 테스트
    const result = await db.raw('SELECT NOW() as time');
    const connectionTime = Date.now() - startTime;
    
    console.log('✅ 연결 성공!');
    console.log(`⏱️ 연결 시간: ${connectionTime}ms`);
    console.log(`📅 서버 시간: ${result.rows[0].time}`);
    
    // 2. 테이블 존재 확인
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('\n📋 사용 가능한 테이블:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // 3. 성능 테스트
    console.log('\n⚡ 성능 테스트:');
    
    // INSERT 테스트
    const insertStart = Date.now();
    const testStudent = await db('students').insert({
      student_code: `TEST${Date.now()}`,
      status: 'studying',
      created_at: new Date()
    }).returning('*');
    const insertTime = Date.now() - insertStart;
    console.log(`  INSERT: ${insertTime}ms`);
    
    // SELECT 테스트
    const selectStart = Date.now();
    const students = await db('students').select('*').limit(10);
    const selectTime = Date.now() - selectStart;
    console.log(`  SELECT: ${selectTime}ms`);
    
    // DELETE 테스트 (정리)
    if (testStudent && testStudent[0]) {
      await db('students').where('student_id', testStudent[0].student_id).delete();
    }
    
    console.log('\n🎉 모든 테스트 통과!');
    console.log('📈 예상 성능:');
    console.log('  - 학생 등록: 200-300ms');
    console.log('  - 목록 조회: 50-100ms');
    
  } catch (error) {
    const connectionTime = Date.now() - startTime;
    console.error(`\n❌ 연결 실패 (${connectionTime}ms):`, error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 해결 방법:');
      console.log('1. Supabase 대시보드에서 Connection String 확인');
      console.log('2. Settings → Database → Connection String');
      console.log('3. Host와 Port가 올바른지 확인');
    } else if (error.message.includes('password')) {
      console.log('\n💡 비밀번호가 틀렸습니다.');
      console.log('Supabase 프로젝트 생성 시 설정한 비밀번호를 확인해주세요.');
    } else if (error.message.includes('does not exist')) {
      console.log('\n💡 테이블이 없습니다.');
      console.log('SUPABASE_SETUP.sql을 Supabase SQL Editor에서 실행해주세요.');
    }
  }
  
  process.exit();
}

testConnection();