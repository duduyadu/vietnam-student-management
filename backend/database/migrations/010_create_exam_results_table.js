exports.up = function(knex) {
  return knex.schema.createTable('exam_results', table => {
    table.increments('exam_id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.foreign('student_id').references('student_id').inTable('students').onDelete('CASCADE');
    
    // 시험 기본 정보
    table.string('exam_name', 100).notNullable(); // 시험명 (TOPIK, JLPT, 모의고사 등)
    table.string('exam_type', 50).notNullable(); // 시험 유형 (language, subject, mock 등)
    table.string('subject', 100); // 과목명 (수학, 영어, 한국어 등)
    table.date('exam_date').notNullable(); // 시험 일자
    table.string('semester', 20); // 학기 정보 (2024-1, 2024-2 등)
    
    // 점수 정보
    table.decimal('score', 5, 2); // 획득 점수
    table.decimal('max_score', 5, 2); // 만점
    table.decimal('percentage', 5, 2); // 백분율
    table.string('grade', 10); // 등급 (A+, B+, PASS 등)
    table.integer('rank'); // 순위
    table.integer('total_students'); // 전체 응시자 수
    
    // 상세 정보
    table.jsonb('detailed_scores'); // 상세 점수 (영역별, 문항별)
    table.text('notes'); // 비고사항
    table.string('certificate_path'); // 성적표 파일 경로
    
    // 메타데이터
    table.integer('created_by').unsigned();
    table.foreign('created_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    // 인덱스
    table.index(['student_id', 'exam_date']);
    table.index(['exam_name', 'exam_type']);
    table.index(['semester']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('exam_results');
};