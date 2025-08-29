exports.up = function(knex) {
  return knex.schema.createTable('report_templates', table => {
    table.increments('template_id').primary();
    
    // 템플릿 기본 정보
    table.string('template_name', 100).notNullable(); // 템플릿명
    table.string('template_code', 50).unique().notNullable(); // 템플릿 코드
    table.text('description'); // 설명
    table.enum('report_type', ['consultation', 'academic_progress', 'comprehensive', 'performance_analysis', 'goal_tracking']).notNullable();
    
    // 템플릿 구성
    table.jsonb('template_config'); // 템플릿 설정 (섹션, 필드, 레이아웃)
    table.text('html_template'); // HTML 템플릿
    table.text('css_styles'); // CSS 스타일
    table.jsonb('data_sources'); // 데이터 소스 정의
    table.jsonb('chart_configs'); // 차트 설정
    
    // 다국어 지원
    table.jsonb('labels_ko'); // 한국어 라벨
    table.jsonb('labels_vi'); // 베트남어 라벨
    
    // 권한 및 가시성
    table.jsonb('allowed_roles'); // 사용 가능한 역할
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_default').defaultTo(false);
    table.integer('display_order').defaultTo(0);
    
    // 버전 관리
    table.string('version', 20).defaultTo('1.0');
    table.integer('parent_template_id').unsigned(); // 상위 템플릿 (버전 관리용)
    table.foreign('parent_template_id').references('template_id').inTable('report_templates');
    
    // 메타데이터
    table.integer('created_by').unsigned();
    table.foreign('created_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    // 인덱스
    table.index(['template_code']);
    table.index(['report_type']);
    table.index(['is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('report_templates');
};