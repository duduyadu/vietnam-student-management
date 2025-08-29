exports.up = function(knex) {
  return knex.schema.createTable('students', table => {
    table.increments('student_id').primary();
    table.string('student_code', 20).unique().notNullable(); // 학생 고유 코드
    table.enum('status', ['studying', 'graduated', 'withdrawn', 'archived']).defaultTo('studying');
    table.integer('agency_id').unsigned();
    table.foreign('agency_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.integer('created_by').unsigned();
    table.foreign('created_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    // Indexes
    table.index('student_code');
    table.index('status');
    table.index('agency_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('students');
};