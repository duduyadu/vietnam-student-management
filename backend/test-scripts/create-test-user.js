const bcrypt = require('bcrypt');
const db = require('./config/database');

(async () => {
  try {
    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // 기존 test@test.com 사용자 삭제
    await db('users').where('email', 'test@test.com').del();
    
    // 새 사용자 생성
    const [userId] = await db('users').insert({
      email: 'test@test.com',
      password_hash: hashedPassword,
      full_name: 'Test Teacher',
      role: 'teacher',
      is_active: true,
      created_at: new Date()
    }).returning('user_id');
    
    console.log('✅ 테스트 사용자 생성 완료');
    console.log('- Email: test@test.com');
    console.log('- Password: test123');
    console.log('- User ID:', userId);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 에러:', error.message);
    process.exit(1);
  }
})();
