const db = require('./config/database');

async function checkUsers() {
  console.log('🔍 Checking users in database...\n');
  
  try {
    // 사용자 조회
    const users = await db('users')
      .select('user_id', 'email', 'role', 'full_name')
      .limit(5);
    
    console.log('Users in database:');
    console.log('==================');
    
    for (const user of users) {
      console.log(`ID: ${user.user_id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
      console.log(`Name: ${user.full_name}`);
      console.log('------------------');
    }
    
    if (users.length === 0) {
      console.log('No users found! Creating test user...');
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const [userId] = await db('users').insert({
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        full_name: 'Test Admin'
      }).returning('user_id');
      
      console.log(`✅ Test user created with ID: ${userId.user_id || userId}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

checkUsers().catch(console.error);
