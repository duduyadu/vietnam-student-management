exports.up = function(knex) {
  return knex.schema.createTable('generated_reports', table => {
    table.increments('report_id').primary();
    
    // 보고서 기본 정보
    table.integer('student_id').unsigned().notNullable();
    table.foreign('student_id').references('student_id').inTable('students').onDelete('CASCADE');
    table.integer('template_id').unsigned().notNullable();
    table.foreign('template_id').references('template_id').inTable('report_templates');
    
    table.string('report_title', 200).notNullable(); // 보고서 제목
    table.date('report_date').notNullable(); // 보고서 기준일
    table.date('period_start'); // 대상 기간 시작
    table.date('period_end'); // 대상 기간 종료
    
    // 보고서 데이터
    table.jsonb('report_data'); // 보고서 데이터 (JSON 형태)
    table.jsonb('chart_data'); // 차트 데이터
    table.text('summary_text'); // 요약 텍스트
    table.text('recommendations'); // 추천사항
    
    // 파일 정보
    table.string('pdf_path'); // PDF 파일 경로
    table.string('html_path'); // HTML 파일 경로
    table.integer('file_size'); // 파일 크기 (bytes)
    table.string('file_hash', 64); // 파일 해시 (무결성 검증용)
    
    // 상태 및 메타데이터
    table.enum('status', ['generating', 'completed', 'failed', 'archived']).defaultTo('generating');
    table.text('error_message'); // 오류 메시지 (실패시)
    table.integer('generation_time_ms'); // 생성 소요시간 (밀리초)
    
    // 접근 권한
    table.jsonb('shared_with'); // 공유 대상 (user_id 배열)
    table.boolean('is_public').defaultTo(false); // 공개 여부
    table.date('expires_at'); // 만료일 (선택적)
    
    // 메타데이터
    table.integer('generated_by').unsigned().notNullable();
    table.foreign('generated_by').references('user_id').inTable('users');
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.timestamp('last_accessed_at');
    table.integer('access_count').defaultTo(0);
    table.timestamps(true, true);
    
    // 인덱스
    table.index(['student_id', 'report_date']);
    table.index(['template_id']);
    table.index(['status']);
    table.index(['generated_by']);
    table.index(['generated_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('generated_reports');
};