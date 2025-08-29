/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // 학생 학업 데이터 테이블
    .createTable('student_academic_data', function(table) {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable()
        .references('student_id').inTable('students').onDelete('CASCADE');
      table.float('attendance_rate').defaultTo(0); // 출석률
      table.string('participation_grade', 2).defaultTo('C'); // 수업 참여도 (A-F)
      table.integer('vocabulary_known').defaultTo(0); // 학습한 단어 수
      table.text('strength_areas'); // 강점 영역
      table.text('weakness_areas'); // 약점 영역
      table.text('learning_strategy'); // 학습 전략
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique('student_id'); // 학생당 하나의 레코드만
    })
    
    // 학생 포트폴리오 테이블
    .createTable('student_portfolio', function(table) {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable()
        .references('student_id').inTable('students').onDelete('CASCADE');
      table.text('club_activities'); // 동아리 활동
      table.text('volunteer_activities'); // 봉사 활동
      table.text('awards'); // 수상 경력
      table.text('portfolio_status'); // 포트폴리오 상태
      table.text('student_opinion'); // 학생 의견 및 포부
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique('student_id');
    })
    
    // 학생 생활 평가 테이블  
    .createTable('student_life_evaluation', function(table) {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable()
        .references('student_id').inTable('students').onDelete('CASCADE');
      table.enum('social_rating', ['excellent', 'good', 'average', 'poor']).defaultTo('average'); // 교우 관계
      table.text('social_relationship'); // 교우 관계 상세
      table.enum('attitude_rating', ['excellent', 'good', 'average', 'poor']).defaultTo('average'); // 수업 태도
      table.text('class_attitude'); // 수업 태도 상세
      table.enum('adaptation_rating', ['excellent', 'good', 'average', 'poor']).defaultTo('average'); // 한국 생활 적응도
      table.text('adaptation_level'); // 적응도 상세
      table.enum('growth_rating', ['excellent', 'good', 'average', 'poor']).defaultTo('average'); // 성장 가능성
      table.text('growth_potential'); // 성장 가능성 상세
      table.text('academic_evaluation'); // 학업 성취도 평가
      table.text('korean_evaluation'); // 한국어 능력 평가
      table.text('final_recommendation'); // 최종 추천사
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      
      table.unique('student_id');
    })
    
    // 출석 기록 테이블
    .createTable('attendance_records', function(table) {
      table.increments('id').primary();
      table.integer('student_id').unsigned().notNullable()
        .references('student_id').inTable('students').onDelete('CASCADE');
      table.date('attendance_date').notNullable();
      table.enum('status', ['present', 'absent', 'late', 'excused']).defaultTo('present');
      table.text('notes');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.index(['student_id', 'attendance_date']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('attendance_records')
    .dropTableIfExists('student_life_evaluation')
    .dropTableIfExists('student_portfolio')
    .dropTableIfExists('student_academic_data');
};
