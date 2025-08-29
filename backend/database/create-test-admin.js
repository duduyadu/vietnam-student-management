const bcrypt = require('bcrypt');
const db = require('../config/database');

async function createTestAdmin() {
  try {
    console.log('🔧 Creating test admin account...\n');
    
    // 1. 기존 test admin 삭제
    await db('users')
      .where('email', 'testadmin@example.com')
      .delete();
    
    // 2. 새 admin 계정 생성
    const password = 'test123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [newUser] = await db('users')
      .insert({
        email: 'testadmin@example.com',
        password_hash: hashedPassword,
        full_name: '테스트 관리자',
        role: 'admin',
        preferred_language: 'ko',
        is_active: true
      })
      .returning('*');
    
    console.log('✅ Test admin account created successfully!');
    console.log('📧 Email: testadmin@example.com');
    console.log('🔑 Password: test123');
    console.log('👤 Role: admin');
    console.log('✅ Active: true');
    
    // 3. 모든 사용자 확인
    console.log('\n📋 All active users:');
    const users = await db('users')
      .select('user_id', 'email', 'full_name', 'role', 'is_active')
      .where('is_active', true);
    console.table(users);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestAdmin();