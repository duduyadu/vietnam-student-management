const reportService = require('./services/reportService');

async function test() {
  
  console.log('Testing getExamResults for student 37...');
  const examResults = await reportService.getExamResults(37);
  
  console.log('Exam results count:', examResults.length);
  console.log('First exam:', JSON.stringify(examResults[0], null, 2));
  
  // Test graph data mapping
  const topikGraphData = examResults.map((exam, index) => ({
    index: index + 1,
    score: exam.total_score || 0,
    level: exam.level || '-'
  }));
  
  console.log('Graph data:', JSON.stringify(topikGraphData, null, 2));
  
  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});