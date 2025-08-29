exports.up = function(knex) {
  return knex.schema.createTable('menu_items', table => {
    table.increments('menu_id').primary();
    table.integer('parent_id').unsigned();
    table.foreign('parent_id').references('menu_id').inTable('menu_items').onDelete('CASCADE');
    table.string('menu_key', 50).unique().notNullable();
    table.string('icon', 50); // Material-UI 아이콘 이름
    table.string('route', 100); // 라우트 경로
    table.integer('sort_order').defaultTo(0);
    table.jsonb('required_roles'); // 접근 가능한 역할 배열
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    // Indexes
    table.index('parent_id');
    table.index('menu_key');
    table.index('is_active');
    table.index('sort_order');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('menu_items');
};