const knex = require('knex');
const config = require('./knexfile');
const db = knex(config.development);

async function checkColumns() {
  try {
    const columns = await db.raw(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'exam_results'
      ORDER BY ordinal_position
    `);
    
    console.log('exam_results 테이블 컬럼:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await db.destroy();
  }
}

checkColumns();