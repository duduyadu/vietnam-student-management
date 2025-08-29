const db = require('./config/database');

async function checkDatabaseObjects() {
  try {
    // 뷰 확인
    const views = await db.raw("SELECT name, sql FROM sqlite_master WHERE type='view'");
    console.log('데이터베이스 뷰:');
    if (views.length > 0) {
      views.forEach(view => {
        console.log(`- ${view.name}`);
        console.log(`  SQL: ${view.sql}`);
      });
    } else {
      console.log('(뷰 없음)');
    }
    
    // 트리거 확인
    const triggers = await db.raw("SELECT name, sql FROM sqlite_master WHERE type='trigger'");
    console.log('\n데이터베이스 트리거:');
    if (triggers.length > 0) {
      triggers.forEach(trigger => {
        console.log(`- ${trigger.name}`);
        console.log(`  SQL: ${trigger.sql}`);
      });
    } else {
      console.log('(트리거 없음)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDatabaseObjects();