const bcrypt = require('bcrypt');
const db = require('./config/database');

async function createAdmin() {
  console.log('Creating admin user...');
  
  try {
    // Check if admin exists
    const existing = await db('users')
      .where('email', 'admin@example.com')
      .first();
    
    if (existing) {
      console.log('Admin user already exists, updating password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db('users')
        .where('email', 'admin@example.com')
        .update({
          password_hash: hashedPassword,
          updated_at: new Date()
        });
      console.log('✅ Admin password updated');
    } else {
      // Create new admin
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db('users').insert({
        email: 'admin@example.com',
        password_hash: hashedPassword,
        full_name: 'System Administrator',
        role: 'admin',
        is_active: true,
        created_at: new Date()
      });
      console.log('✅ Admin user created');
    }
    
    console.log('\nAdmin credentials:');
    console.log('Email: admin@example.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();