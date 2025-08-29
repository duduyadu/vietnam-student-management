exports.up = async function(knex) {
  // 먼저 agencies 테이블이 없으면 생성
  const hasAgenciesTable = await knex.schema.hasTable('agencies');
  
  if (!hasAgenciesTable) {
    await knex.schema.createTable('agencies', (table) => {
      table.increments('agency_id').primary();
      table.string('agency_name', 100).notNullable();
      table.string('agency_code', 20).unique().notNullable();
      table.string('contact_person', 100);
      table.string('phone', 20);
      table.string('email', 100);
      table.text('address');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.integer('created_by').references('user_id').inTable('users');
    });
  }

  // students 테이블의 agency_id 외래키 수정
  await knex.schema.alterTable('students', (table) => {
    // 기존 외래키 제약 제거
    table.dropForeign('agency_id');
    
    // 새로운 외래키 제약 추가 (agencies 테이블 참조)
    table.foreign('agency_id').references('agency_id').inTable('agencies').onDelete('SET NULL');
  });
};

exports.down = async function(knex) {
  // 롤백: 원래대로 users 테이블을 참조하도록 변경
  await knex.schema.alterTable('students', (table) => {
    table.dropForeign('agency_id');
    table.foreign('agency_id').references('user_id').inTable('users').onDelete('SET NULL');
  });
};