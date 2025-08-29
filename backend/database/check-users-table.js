const db = require('../config/database');

async function checkUsersTable() {
  try {
    console.log('🔧 Checking users table structure...\n');
    
    // 1. users 테이블 컬럼 정보 확인
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('=== Users Table Columns ===');
    console.table(columns.rows);
    
    // 2. 샘플 사용자 데이터 확인
    console.log('\n=== Sample User Data ===');
    const users = await db('users')
      .select('*')
      .limit(2);
    
    if (users.length > 0) {
      console.log('Sample user:');
      console.log(JSON.stringify(users[0], null, 2));
    } else {
      console.log('No users found in database');
    }
    
    // 3. auth.users 테이블 확인 (Supabase Auth)
    try {
      const authUsers = await db.raw(`
        SELECT id, email, created_at 
        FROM auth.users 
        LIMIT 5
      `);
      
      console.log('\n=== Auth Users (Supabase) ===');
      console.table(authUsers.rows);
    } catch (e) {
      console.log('\nℹ️ Auth.users table not accessible or doesn\'t exist');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkUsersTable();