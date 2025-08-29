const knex = require('knex');
const knexConfig = require('./knexfile');
const db = knex(knexConfig.development);

(async () => {
  try {
    // Check recent reports
    const reports = await db('generated_reports')
      .select('report_id', 'student_id', 'status', 'pdf_path', 'file_size', 'generated_at')
      .orderBy('generated_at', 'desc')
      .limit(10);
    
    console.log('Recent reports:');
    reports.forEach(r => {
      console.log(`  ID: ${r.report_id}, Student: ${r.student_id}, Status: ${r.status}, PDF: ${r.pdf_path ? 'YES' : 'NO'}, Size: ${r.file_size || 0}`);
    });
    
    // Check if there are any completed reports
    const completedCount = await db('generated_reports').where('status', 'completed').count();
    const failedCount = await db('generated_reports').where('status', 'failed').count();
    
    console.log(`\nStats: Completed: ${completedCount[0].count}, Failed: ${failedCount[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();