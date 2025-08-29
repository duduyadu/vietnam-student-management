exports.up = function(knex) {
  return knex.schema.createTable('audit_logs', table => {
    table.increments('log_id').primary();
    table.integer('user_id').unsigned();
    table.foreign('user_id').references('user_id').inTable('users').onDelete('SET NULL');
    table.string('action', 50).notNullable(); // CREATE, READ, UPDATE, DELETE
    table.string('entity_type', 50).notNullable(); // students, consultations, etc.
    table.integer('entity_id'); // ID of the affected entity
    table.jsonb('old_values'); // 변경 전 값
    table.jsonb('new_values'); // 변경 후 값
    table.string('ip_address', 45);
    table.string('user_agent', 255);
    table.boolean('is_sensitive_access').defaultTo(false); // 민감정보 접근 여부
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('user_id');
    table.index('action');
    table.index('entity_type');
    table.index('created_at');
    table.index('is_sensitive_access');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('audit_logs');
};