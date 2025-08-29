const db = require('./config/database');
const bcrypt = require('bcrypt');

async function fixAgenciesAndSetup() {
  console.log('Fixing agencies table and setting up data...');
  
  try {
    // Check if created_by column exists
    const columnCheck = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agencies' 
      AND column_name = 'created_by'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('Adding created_by column to agencies table...');
      await db.raw('ALTER TABLE agencies ADD COLUMN IF NOT EXISTS created_by INTEGER');
    }
    
    // Check if agencies exist
    const existingAgencies = await db('agencies').select('*');
    
    if (existingAgencies.length === 0) {
      // Create sample agencies
      const agencies = [
        {
          agency_name: '서울 유학원',
          agency_code: 'SEOUL001',
          contact_person: '김철수',
          phone: '02-1234-5678',
          email: 'seoul@example.com',
          address: '서울시 강남구'
        },
        {
          agency_name: '부산 유학원',
          agency_code: 'BUSAN001',
          contact_person: '이영희',
          phone: '051-987-6543',
          email: 'busan@example.com',
          address: '부산시 해운대구'
        }
      ];
      
      const insertedAgencies = await db('agencies')
        .insert(agencies)
        .returning('*');
      
      console.log('✅ Agencies created:', insertedAgencies.map(a => a.agency_name));
      
      // Create teacher accounts for each agency
      for (const agency of insertedAgencies) {
        const hashedPassword = await bcrypt.hash('teacher123', 10);
        
        // Check if teacher exists
        const teacherEmail = `teacher.${agency.agency_code.toLowerCase()}@example.com`;
        const existingTeacher = await db('users')
          .where('email', teacherEmail)
          .first();
        
        if (!existingTeacher) {
          await db('users').insert({
            email: teacherEmail,
            password_hash: hashedPassword,
            full_name: `${agency.agency_name} 교사`,
            role: 'teacher',
            agency_id: agency.agency_id,
            is_active: true,
            created_at: new Date()
          });
          
          console.log(`✅ Teacher created for ${agency.agency_name}`);
          console.log(`   Email: ${teacherEmail}`);
          console.log(`   Password: teacher123`);
        }
      }
      
      // Create branch account
      const branchEmail = 'branch@example.com';
      const existingBranch = await db('users')
        .where('email', branchEmail)
        .first();
      
      if (!existingBranch) {
        const hashedPassword = await bcrypt.hash('branch123', 10);
        await db('users').insert({
          email: branchEmail,
          password_hash: hashedPassword,
          full_name: '한국 지점',
          role: 'branch',
          is_active: true,
          created_at: new Date()
        });
        
        console.log('✅ Branch account created');
        console.log('   Email: branch@example.com');
        console.log('   Password: branch123');
      }
    } else {
      console.log('Agencies already exist:', existingAgencies.map(a => a.agency_name));
    }
    
    console.log('\n📋 Available accounts:');
    console.log('--------------------------------');
    console.log('Admin: admin@example.com / admin123');
    console.log('Teacher (Seoul): teacher.seoul001@example.com / teacher123');
    console.log('Teacher (Busan): teacher.busan001@example.com / teacher123');
    console.log('Branch: branch@example.com / branch123');
    console.log('--------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAgenciesAndSetup();