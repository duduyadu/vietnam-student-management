exports.up = function(knex) {
  return knex.schema.createTable('student_attributes', table => {
    table.increments('attribute_id').primary();
    table.integer('student_id').unsigned().notNullable();
    table.foreign('student_id').references('student_id').inTable('students').onDelete('CASCADE');
    table.string('attribute_key', 50).notNullable();
    table.foreign('attribute_key').references('attribute_key').inTable('attribute_definitions');
    table.text('attribute_value'); // 실제 값 (암호화될 수 있음)
    table.string('file_path'); // 파일인 경우 경로
    table.boolean('is_encrypted').defaultTo(false);
    table.integer('updated_by').unsigned();
    table.foreign('updated_by').references('user_id').inTable('users');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['student_id', 'attribute_key']); // 복합 인덱스
    table.index('attribute_key');
    
    // Unique constraint - 학생당 속성은 하나만
    table.unique(['student_id', 'attribute_key']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('student_attributes');
};