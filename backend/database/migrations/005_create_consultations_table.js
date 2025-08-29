exports.up = function(knex) {
  return knex.schema.createTable('consultations', table => {
    table.increments('consultation_id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.foreign('student_id').references('student_id').inTable('students').onDelete('CASCADE');
    table.integer('teacher_id').unsigned().notNullable();
    table.foreign('teacher_id').references('user_id').inTable('users');
    table.date('consultation_date').notNullable();
    table.enum('consultation_type', ['academic', 'career', 'personal', 'visa', 'other']).defaultTo('academic');
    table.text('content_ko'); // 한국어 상담 내용
    table.text('content_vi'); // 베트남어 상담 내용
    table.text('action_items'); // 후속 조치 사항
    table.date('next_consultation_date'); // 다음 상담 예정일
    table.jsonb('attachments'); // 첨부파일 정보
    table.timestamps(true, true);
    
    // Indexes
    table.index('student_id');
    table.index('teacher_id');
    table.index('consultation_date');
    table.index('consultation_type');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('consultations');
};