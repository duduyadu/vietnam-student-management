exports.up = function(knex) {
  return knex.schema.createTable('academic_goals', table => {
    table.increments('goal_id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.foreign('student_id').references('student_id').inTable('students').onDelete('CASCADE');
    
    // 목표 기본 정보
    table.string('goal_type', 50).notNullable(); // 목표 유형 (academic, language, career, university)
    table.string('goal_category', 100); // 목표 카테고리 (TOPIK, JLPT, 대학입학, 취업 등)
    table.text('goal_description').notNullable(); // 목표 설명
    table.enum('priority', ['high', 'medium', 'low']).defaultTo('medium'); // 우선순위
    
    // 기간 정보
    table.date('start_date').notNullable(); // 시작일
    table.date('target_date').notNullable(); // 목표일
    table.date('completion_date'); // 완료일
    table.enum('status', ['planning', 'in_progress', 'completed', 'delayed', 'cancelled']).defaultTo('planning');
    
    // 성과 지표
    table.decimal('target_score', 5, 2); // 목표 점수
    table.decimal('current_score', 5, 2); // 현재 점수
    table.decimal('progress_percentage', 5, 2); // 달성률
    table.jsonb('milestones'); // 중간 목표들
    
    // 상세 계획
    table.text('action_steps'); // 실행 단계
    table.text('required_resources'); // 필요 자원
    table.text('potential_obstacles'); // 예상 장애물
    table.text('support_needed'); // 필요한 지원
    
    // 평가 및 피드백
    table.text('teacher_feedback'); // 교사 피드백
    table.text('student_reflection'); // 학생 성찰
    table.text('adjustment_notes'); // 조정 사항
    
    // 메타데이터
    table.integer('created_by').unsigned();
    table.foreign('created_by').references('user_id').inTable('users');
    table.integer('assigned_teacher').unsigned();
    table.foreign('assigned_teacher').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    // 인덱스
    table.index(['student_id', 'status']);
    table.index(['goal_type', 'goal_category']);
    table.index(['target_date']);
    table.index(['assigned_teacher']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('academic_goals');
};