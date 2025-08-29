exports.up = function(knex) {
  return knex.schema.createTable('report_logs', table => {
    table.increments('report_id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.string('report_type', 50).notNullable(); // 'official', 'consultation', 'complete'
    table.string('purpose', 50); // 'visa', 'university', null
    table.json('consultation_ids'); // 포함된 상담 ID 목록
    table.string('filename', 255).notNullable();
    table.integer('created_by').unsigned();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Foreign keys
    table.foreign('student_id').references('student_id').inTable('students');
    table.foreign('created_by').references('user_id').inTable('users');
    
    // Indexes
    table.index(['student_id', 'created_at']);
    table.index('report_type');
    table.index('purpose');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('report_logs');
};