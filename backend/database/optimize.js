const db = require('../config/database');

async function optimizeDatabase() {
  console.log('🔧 SQLite 최적화 시작...');
  
  try {
    // 1. WAL 모드 활성화 (동시 읽기/쓰기 성능 향상)
    await db.raw('PRAGMA journal_mode = WAL');
    console.log('✅ WAL 모드 활성화');
    
    // 2. 캐시 크기 증가 (64MB)
    await db.raw('PRAGMA cache_size = -64000');
    console.log('✅ 캐시 크기 64MB로 설정');
    
    // 3. 동기화 모드 설정 (성능 향상, 안정성 유지)
    await db.raw('PRAGMA synchronous = NORMAL');
    console.log('✅ 동기화 모드 최적화');
    
    // 4. 메모리 매핑 I/O 활성화
    await db.raw('PRAGMA mmap_size = 268435456'); // 256MB
    console.log('✅ 메모리 매핑 I/O 활성화');
    
    // 5. 임시 저장소를 메모리로 설정
    await db.raw('PRAGMA temp_store = MEMORY');
    console.log('✅ 임시 저장소 메모리 사용');
    
    // 6. 체크포인트 자동 실행
    await db.raw('PRAGMA wal_autocheckpoint = 1000');
    console.log('✅ WAL 자동 체크포인트 설정');
    
    // 7. 데이터베이스 분석 및 최적화
    await db.raw('ANALYZE');
    console.log('✅ 데이터베이스 통계 업데이트');
    
    // 8. VACUUM으로 공간 최적화 (한 번만 실행)
    // await db.raw('VACUUM');
    // console.log('✅ 데이터베이스 공간 최적화');
    
    console.log('✨ SQLite 최적화 완료!');
    console.log('📊 예상 성능 향상: 40-60%');
    
    // 현재 설정 확인
    const walMode = await db.raw('PRAGMA journal_mode');
    const cacheSize = await db.raw('PRAGMA cache_size');
    const syncMode = await db.raw('PRAGMA synchronous');
    
    console.log('\n📋 현재 설정:');
    console.log('- Journal Mode:', walMode[0].journal_mode);
    console.log('- Cache Size:', Math.abs(cacheSize[0].cache_size) + ' KB');
    console.log('- Synchronous:', syncMode[0].synchronous);
    
  } catch (error) {
    console.error('❌ 최적화 실패:', error.message);
  }
  
  process.exit(0);
}

optimizeDatabase();