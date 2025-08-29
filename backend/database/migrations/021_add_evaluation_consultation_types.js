exports.up = function(knex) {
  return knex.schema
    // consultations 테이블에 평가 관련 필드 추가
    .alterTable('consultations', table => {
      // 평가 주기 필드 추가 (월간, 분기, 학기, 연간)
      table.string('evaluation_period', 20);
      
      // 평가 유형 세분화를 위한 필드
      table.string('evaluation_category', 50);
      
      // 작성자 역할 구분 (교사, 상담사, 관리자)
      table.string('writer_role', 20);
      
      // 평가 점수 (종합 평가용)
      table.integer('overall_score');
      
      // 평가 데이터 JSON
      table.jsonb('evaluation_data');
    })
    
    // consultation_types 테이블 생성 (상담/평가 유형 관리)
    .createTable('consultation_types', table => {
      table.increments('id').primary();
      table.string('type_code', 50).notNullable().unique();
      table.string('type_name_ko', 100).notNullable();
      table.string('type_name_vi', 100);
      table.string('category', 50); // consultation, evaluation, report
      table.text('description');
      table.jsonb('required_fields'); // 필수 입력 필드 정의
      table.boolean('is_active').defaultTo(true);
      table.integer('display_order').defaultTo(0);
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('consultations', table => {
      table.dropColumn('evaluation_period');
      table.dropColumn('evaluation_category');
      table.dropColumn('writer_role');
      table.dropColumn('overall_score');
      table.dropColumn('evaluation_data');
    })
    .dropTableIfExists('consultation_types');
};