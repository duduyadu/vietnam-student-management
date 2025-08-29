exports.up = function(knex) {
  return knex.schema.createTable('attribute_definitions', table => {
    table.increments('definition_id').primary();
    table.string('attribute_key', 50).unique().notNullable();
    table.string('attribute_name_ko', 100).notNullable(); // 한국어 이름
    table.string('attribute_name_vi', 100).notNullable(); // 베트남어 이름
    table.enum('data_type', ['text', 'number', 'date', 'boolean', 'file', 'select', 'multiselect']).notNullable();
    table.boolean('is_required').defaultTo(false);
    table.boolean('is_sensitive').defaultTo(false); // 민감정보 여부
    table.boolean('is_encrypted').defaultTo(false); // 암호화 필요 여부
    table.jsonb('validation_rules'); // 유효성 검사 규칙
    table.jsonb('select_options'); // select/multiselect인 경우 옵션
    table.integer('display_order').defaultTo(0);
    table.string('category', 50); // 카테고리 (기본정보, 학업정보, 재정정보 등)
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index('attribute_key');
    table.index('category');
    table.index('is_active');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('attribute_definitions');
};