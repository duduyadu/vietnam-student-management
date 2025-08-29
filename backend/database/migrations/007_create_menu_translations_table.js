exports.up = function(knex) {
  return knex.schema.createTable('menu_translations', table => {
    table.increments('translation_id').primary();
    table.integer('menu_id').unsigned().notNullable();
    table.foreign('menu_id').references('menu_id').inTable('menu_items').onDelete('CASCADE');
    table.enum('language_code', ['ko', 'vi']).notNullable();
    table.string('menu_name', 100).notNullable();
    table.text('description');
    table.timestamps(true, true);
    
    // Indexes
    table.index('menu_id');
    table.index('language_code');
    
    // Unique constraint - 메뉴당 언어별로 하나의 번역만
    table.unique(['menu_id', 'language_code']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('menu_translations');
};