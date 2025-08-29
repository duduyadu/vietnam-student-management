exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    table.increments('user_id').primary();
    table.string('email', 100).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('full_name', 100).notNullable();
    table.string('phone', 20);
    table.enum('role', ['admin', 'teacher', 'korean_branch']).notNullable();
    table.string('agency_name', 100); // 유학원 이름 (teacher인 경우)
    table.string('branch_name', 100); // 지점 이름 (branch인 경우)
    table.enum('preferred_language', ['ko', 'vi']).defaultTo('ko');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login');
    table.timestamps(true, true); // created_at, updated_at
    
    // Indexes
    table.index('email');
    table.index('role');
    table.index('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('users');
};