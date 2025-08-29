const bcrypt = require('bcrypt');
const db = require('../config/database');

async function resetAdminPassword() {
  try {
    console.log('🔧 Resetting admin password...\n');
    
    // 1. 관리자 계정 확인
    const admin = await db('users')
      .where('email', 'admin@example.com')
      .first();
    
    if (!admin) {
      console.log('❌ Admin account not found');
      
      // 관리자 계정 생성
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const [newAdmin] = await db('users')
        .insert({
          email: 'admin@example.com',
          password: hashedPassword,
          full_name: '시스템 관리자',
          role: 'admin',
          preferred_language: 'ko',
          is_active: true
        })
        .returning('*');
      
      console.log('✅ Admin account created');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
      
    } else {
      // 비밀번호 리셋
      const newPassword = 'admin123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db('users')
        .where('user_id', admin.user_id)
        .update({
          password: hashedPassword,
          updated_at: new Date()
        });
      
      console.log('✅ Admin password reset successful');
      console.log('Email: admin@example.com');
      console.log('New Password: admin123');
    }
    
    console.log('\n📋 All user accounts:');
    const users = await db('users')
      .select('user_id', 'email', 'full_name', 'role', 'is_active');
    console.table(users);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();