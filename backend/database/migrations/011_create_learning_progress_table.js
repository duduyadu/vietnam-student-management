exports.up = function(knex) {
  return knex.schema.createTable('learning_progress', table => {
    table.increments('progress_id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.foreign('student_id').references('student_id').inTable('students').onDelete('CASCADE');
    
    // 학습 기본 정보
    table.string('subject', 100).notNullable(); // 과목명
    table.string('course_name', 150); // 강좌명
    table.string('level', 50); // 레벨 (초급, 중급, 고급, N1-N5 등)
    table.date('record_date').notNullable(); // 기록 일자
    table.string('semester', 20); // 학기
    
    // 진도 정보
    table.integer('total_lessons'); // 전체 수업 수
    table.integer('completed_lessons'); // 완료한 수업 수
    table.decimal('completion_percentage', 5, 2); // 완료율
    table.integer('attendance_count'); // 출석 횟수
    table.integer('absence_count'); // 결석 횟수
    table.decimal('attendance_rate', 5, 2); // 출석률
    
    // 성과 정보
    table.decimal('quiz_average', 5, 2); // 퀴즈 평균점수
    table.decimal('assignment_average', 5, 2); // 과제 평균점수
    table.decimal('participation_score', 5, 2); // 수업 참여도
    table.text('strengths'); // 강점
    table.text('weaknesses'); // 약점
    table.text('improvement_areas'); // 개선 필요 영역
    
    // 목표 및 계획
    table.text('monthly_goals'); // 월별 목표
    table.text('action_plan'); // 실행 계획
    table.date('target_completion_date'); // 목표 완료일
    
    // 교사 평가
    table.enum('overall_performance', ['excellent', 'good', 'average', 'below_average', 'poor']);
    table.text('teacher_comments'); // 교사 의견
    table.jsonb('skill_assessment'); // 기술별 평가 (말하기, 듣기, 읽기, 쓰기)
    
    // 메타데이터
    table.integer('teacher_id').unsigned();
    table.foreign('teacher_id').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    // 인덱스
    table.index(['student_id', 'record_date']);
    table.index(['subject', 'level']);
    table.index(['semester']);
    table.index(['teacher_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('learning_progress');
};