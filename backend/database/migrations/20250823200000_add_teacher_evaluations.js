/**
 * Teacher Evaluations - 선생님별 학생 평가 이력 관리
 * 각 선생님이 학생에 대한 개별 평가를 시간순으로 기록
 */

exports.up = function(knex) {
  return knex.schema
    // 선생님별 학생 평가 테이블 (이력 관리)
    .createTable('teacher_evaluations', function(table) {
      table.increments('evaluation_id').primary();
      
      // 학생 정보
      table.integer('student_id').unsigned().notNullable()
        .references('student_id').inTable('students').onDelete('CASCADE');
      
      // 평가한 선생님 정보
      table.integer('teacher_id').unsigned().notNullable()
        .references('user_id').inTable('users').onDelete('RESTRICT');
      table.string('teacher_name', 100); // 평가 당시 선생님 이름 기록
      table.string('teacher_agency', 100); // 평가 당시 소속 유학원
      
      // 평가 기본 정보
      table.date('evaluation_date').notNullable();
      table.enum('evaluation_type', ['monthly', 'quarterly', 'semester', 'special'])
        .defaultTo('monthly'); // 월간, 분기, 학기, 특별 평가
      table.string('evaluation_period', 50); // 예: "2024년 8월", "2024년 2학기"
      
      // 학업 평가
      table.float('attendance_rate').defaultTo(0); // 출석률 (0-100)
      table.enum('participation_grade', ['A', 'B', 'C', 'D', 'F']).defaultTo('C');
      table.text('academic_progress'); // 학업 진척도 상세
      table.text('strength_areas'); // 강점 영역
      table.text('weakness_areas'); // 개선 필요 영역
      
      // 태도 및 생활 평가 (4단계 평가)
      table.enum('attitude_rating', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.text('attitude_detail'); // 수업 태도 상세
      
      table.enum('social_rating', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.text('social_detail'); // 교우 관계 상세
      
      table.enum('responsibility_rating', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.text('responsibility_detail'); // 책임감 상세
      
      // 한국 생활 적응
      table.enum('adaptation_rating', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.text('adaptation_detail'); // 적응도 상세
      table.text('cultural_understanding'); // 한국 문화 이해도
      
      // 한국어 능력 평가
      table.enum('korean_speaking', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.enum('korean_listening', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.enum('korean_reading', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.enum('korean_writing', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.text('korean_detail'); // 한국어 능력 종합 평가
      
      // 성장 및 발전 가능성
      table.enum('growth_potential', ['very_high', 'high', 'medium', 'low'])
        .defaultTo('medium');
      table.text('growth_detail'); // 성장 가능성 상세
      table.text('improvement_areas'); // 개선 권장 사항
      
      // 특별 사항
      table.text('special_notes'); // 특이사항
      table.text('parent_communication'); // 학부모 전달 사항
      table.text('next_goals'); // 다음 목표
      
      // 종합 평가
      table.enum('overall_rating', ['excellent', 'good', 'average', 'poor'])
        .defaultTo('average');
      table.text('comprehensive_evaluation'); // 종합 평가 의견
      table.text('recommendation'); // 추천사 또는 조언
      
      // 평가 상태
      table.enum('status', ['draft', 'submitted', 'approved', 'shared'])
        .defaultTo('draft'); // 초안, 제출됨, 승인됨, 공유됨
      table.boolean('is_visible_to_student').defaultTo(false); // 학생 열람 가능 여부
      table.boolean('is_visible_to_parent').defaultTo(false); // 학부모 열람 가능 여부
      
      // 메타데이터
      table.timestamps(true, true); // created_at, updated_at
      table.integer('approved_by').unsigned(); // 승인한 관리자
      table.timestamp('approved_at'); // 승인 시간
      
      // 인덱스
      table.index(['student_id', 'evaluation_date']);
      table.index(['teacher_id', 'evaluation_date']);
      table.index(['evaluation_type', 'status']);
    })
    
    // 평가 항목별 점수 기록 (선택적 상세 평가용)
    .createTable('evaluation_scores', function(table) {
      table.increments('score_id').primary();
      
      table.integer('evaluation_id').unsigned().notNullable()
        .references('evaluation_id').inTable('teacher_evaluations').onDelete('CASCADE');
      
      table.string('category', 50).notNullable(); // 평가 카테고리
      table.string('item', 100).notNullable(); // 평가 항목
      table.integer('score').notNullable(); // 점수 (1-5 or 1-10)
      table.text('comment'); // 항목별 코멘트
      
      table.timestamps(true, true);
      
      table.index(['evaluation_id', 'category']);
    })
    
    // 평가 열람 기록
    .createTable('evaluation_views', function(table) {
      table.increments('view_id').primary();
      
      table.integer('evaluation_id').unsigned().notNullable()
        .references('evaluation_id').inTable('teacher_evaluations').onDelete('CASCADE');
      
      table.integer('viewer_id').unsigned().notNullable()
        .references('user_id').inTable('users').onDelete('CASCADE');
      
      table.string('viewer_type', 20); // teacher, student, parent, admin
      table.timestamp('viewed_at').defaultTo(knex.fn.now());
      
      table.index(['evaluation_id', 'viewer_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('evaluation_views')
    .dropTableIfExists('evaluation_scores')
    .dropTableIfExists('teacher_evaluations');
};