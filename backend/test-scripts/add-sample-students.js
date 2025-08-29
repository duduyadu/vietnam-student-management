const db = require('./config/database');

async function addSampleStudents() {
  console.log('Adding sample students...');
  
  try {
    // Get agencies
    const agencies = await db('agencies').select('agency_id', 'agency_name');
    
    if (agencies.length === 0) {
      console.log('No agencies found. Please run fix-agencies-table.js first.');
      process.exit(1);
    }
    
    // Get admin user (created_by)
    const admin = await db('users').where('role', 'admin').first();
    
    if (!admin) {
      console.log('No admin user found. Please run create-admin.js first.');
      process.exit(1);
    }
    
    // Sample students data
    const students = [
      {
        student_code: 'VN2024001',
        status: 'studying',
        agency_id: agencies[0].agency_id,
        created_by: admin.user_id
      },
      {
        student_code: 'VN2024002',
        status: 'studying',
        agency_id: agencies[0].agency_id,
        created_by: admin.user_id
      },
      {
        student_code: 'VN2024003',
        status: 'studying',
        agency_id: agencies.length > 1 ? agencies[1].agency_id : agencies[0].agency_id,
        created_by: admin.user_id
      }
    ];
    
    // Insert students
    const insertedStudents = await db('students')
      .insert(students)
      .returning('*');
    
    console.log(`✅ ${insertedStudents.length} students created`);
    
    // Add student attributes for each student
    const attributeDefinitions = await db('attribute_definitions').select('*');
    
    for (const student of insertedStudents) {
      // Basic info attributes
      const attributes = [
        {
          student_id: student.student_id,
          attribute_id: attributeDefinitions.find(a => a.attribute_key === 'name_ko')?.attribute_id,
          value_text: `학생${student.student_code.slice(-3)}`
        },
        {
          student_id: student.student_id,
          attribute_id: attributeDefinitions.find(a => a.attribute_key === 'name_vi')?.attribute_id,
          value_text: `Sinh viên ${student.student_code.slice(-3)}`
        },
        {
          student_id: student.student_id,
          attribute_id: attributeDefinitions.find(a => a.attribute_key === 'birth_date')?.attribute_id,
          value_date: new Date('2005-01-15')
        },
        {
          student_id: student.student_id,
          attribute_id: attributeDefinitions.find(a => a.attribute_key === 'gender')?.attribute_id,
          value_text: student.student_code.slice(-1) === '1' ? 'M' : 'F'
        },
        {
          student_id: student.student_id,
          attribute_id: attributeDefinitions.find(a => a.attribute_key === 'phone')?.attribute_id,
          value_text: `010-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`
        },
        {
          student_id: student.student_id,
          attribute_id: attributeDefinitions.find(a => a.attribute_key === 'email')?.attribute_id,
          value_text: `student${student.student_code.slice(-3)}@example.com`
        }
      ].filter(attr => attr.attribute_id); // Filter out any undefined attributes
      
      if (attributes.length > 0) {
        await db('student_attributes').insert(attributes);
        console.log(`✅ Attributes added for student ${student.student_code}`);
      }
      
      // Add sample consultation
      await db('consultations').insert({
        student_id: student.student_id,
        consultation_date: new Date(),
        consultation_type: 'in_person',
        content_ko: '첫 상담 진행. 학생의 한국 유학 목표와 계획에 대해 논의함.',
        content_vi: 'Buổi tư vấn đầu tiên. Thảo luận về mục tiêu và kế hoạch du học Hàn Quốc của học sinh.',
        notes: '학생이 서울대학교 컴퓨터공학과에 관심이 있음',
        status: 'completed',
        created_by: admin.user_id
      });
      
      // Add academic goal
      await db('academic_goals').insert({
        student_id: student.student_id,
        university_name: '서울대학교',
        major: '컴퓨터공학과',
        goal_type: 'primary',
        notes: '1지망',
        is_active: true,
        created_by: admin.user_id
      });
      
      // Add exam result
      await db('exam_results').insert({
        student_id: student.student_id,
        exam_type: 'TOPIK',
        exam_date: new Date('2024-01-15'),
        reading_score: 80,
        listening_score: 75,
        writing_score: 70,
        total_score: 225,
        grade: '5',
        created_by: admin.user_id
      });
    }
    
    console.log('\n✅ Sample data creation completed!');
    console.log(`- ${insertedStudents.length} students`);
    console.log(`- ${insertedStudents.length} consultations`);
    console.log(`- ${insertedStudents.length} academic goals`);
    console.log(`- ${insertedStudents.length} exam results`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addSampleStudents();