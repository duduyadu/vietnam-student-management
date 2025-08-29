const reportService = require('./services/reportService');

async function test() {
  console.log('Testing report generation for student 37...');
  
  const htmlContent = await reportService.generateFromTemplate(
    37,
    'consultation_comprehensive', 
    {},
    null,
    'ko'
  );
  
  // Check if topik_graph placeholder is replaced
  const hasPlaceholder = htmlContent.includes('{{topik_graph}}');
  const hasSVG = htmlContent.includes('<svg');
  
  console.log('HTML content length:', htmlContent.length);
  console.log('Still has {{topik_graph}} placeholder?', hasPlaceholder);
  console.log('Has SVG tag?', hasSVG);
  
  if (hasPlaceholder) {
    console.log('ERROR: topik_graph placeholder was not replaced!');
  }
  
  if (hasSVG) {
    const svgStart = htmlContent.indexOf('<svg');
    console.log('SVG found at position:', svgStart);
    console.log('SVG preview:', htmlContent.substring(svgStart, svgStart + 100));
  }
  
  process.exit(0);
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
