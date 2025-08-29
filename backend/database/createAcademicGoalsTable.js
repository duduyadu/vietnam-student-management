const db = require('../config/database');

async function createAcademicGoalsTable() {
  try {
    // academic_goals 테이블 생성
    const tableExists = await db.schema.hasTable('academic_goals');
    
    if (!tableExists) {
      await db.schema.createTable('academic_goals', (table) => {
        table.increments('goal_id').primary();
        table.integer('student_id').notNullable().references('student_id').inTable('students');
        table.date('goal_date').notNullable();
        table.string('preferred_major', 200).notNullable();
        table.string('preferred_university', 200);
        table.string('career_goal', 500);
        table.text('notes');
        table.integer('created_by').references('user_id').inTable('users');
        table.timestamps(true, true);
        
        table.index(['student_id', 'goal_date']);
      });
      
      console.log('✅ academic_goals 테이블이 생성되었습니다.');
    } else {
      console.log('ℹ️ academic_goals 테이블이 이미 존재합니다.');
    }
    
  } catch (error) {
    console.error('❌ 테이블 생성 중 오류:', error);
    throw error;
  }
}

// 실행
if (require.main === module) {
  createAcademicGoalsTable()
    .then(() => {
      console.log('✅ 테이블 생성 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 테이블 생성 실패:', error);
      process.exit(1);
    });
}

module.exports = createAcademicGoalsTable;