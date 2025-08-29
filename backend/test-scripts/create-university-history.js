const db = require('./config/database');

async function createUniversityHistoryTable() {
  try {
    console.log('🚀 Creating university_history table...\n');
    
    // 테이블 생성
    await db.schema.createTable('university_history', (table) => {
      table.increments('history_id').primary();
      table.integer('student_id').notNullable().references('student_id').inTable('students').onDelete('CASCADE');
      table.integer('consultation_id').references('consultation_id').inTable('consultations').onDelete('SET NULL');
      table.string('university', 200);
      table.string('major', 200);
      table.date('change_date').notNullable().defaultTo(db.fn.now());
      table.text('reason_for_change');
      table.integer('created_by').references('user_id').inTable('users');
      table.timestamps(true, true);
      
      // 인덱스 추가
      table.index('student_id');
      table.index('change_date');
    });
    
    console.log('✅ university_history 테이블이 생성되었습니다.');
    
    // 기존 students 테이블의 desired_university와 desired_major 데이터를 초기 이력으로 추가
    console.log('\n📋 기존 학생 데이터를 초기 이력으로 추가...');
    
    const students = await db('students')
      .whereNotNull('desired_university')
      .orWhereNotNull('desired_major')
      .select('student_id', 'desired_university', 'desired_major', 'created_by', 'created_at');
    
    for (const student of students) {
      if (student.desired_university || student.desired_major) {
        await db('university_history').insert({
          student_id: student.student_id,
          university: student.desired_university,
          major: student.desired_major,
          change_date: student.created_at || new Date(),
          reason_for_change: '초기 등록',
          created_by: student.created_by
        });
      }
    }
    
    console.log(`✅ ${students.length}명의 학생 초기 이력이 추가되었습니다.`);
    
    // 테이블 구조 확인
    console.log('\n📊 university_history 테이블 구조:');
    const columns = await db.raw(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'university_history'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    
    // 테이블이 이미 존재하는 경우
    if (error.code === '42P07') {
      console.log('ℹ️ university_history 테이블이 이미 존재합니다.');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

createUniversityHistoryTable();