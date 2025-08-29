const reportService = require('./services/reportService');
const fs = require('fs').promises;
const path = require('path');

async function testPDFGeneration() {
  try {
    console.log('📊 테스트 시작: 학생 37번 PDF 생성');
    
    // ReportService 이미 인스턴스임
    const service = reportService;
    
    // HTML 생성 (템플릿 사용)
    console.log('📝 HTML 템플릿 생성 중...');
    const htmlContent = await service.generateHTMLFromTemplate(37, 'ko');
    
    // HTML 파일로 저장
    const testPath = path.join(__dirname, 'test-output.html');
    await fs.writeFile(testPath, htmlContent, 'utf8');
    console.log(`✅ HTML 파일 생성 완료: ${testPath}`);
    
    // 그래프가 포함되었는지 확인
    const hasGraph = htmlContent.includes('<svg');
    const hasPlaceholder = htmlContent.includes('{{topik_graph}}');
    
    console.log('\n📊 결과 분석:');
    console.log(`- SVG 그래프 포함: ${hasGraph ? '✅ 성공' : '❌ 실패'}`);
    console.log(`- {{topik_graph}} 플레이스홀더 남아있음: ${hasPlaceholder ? '❌ 교체 실패' : '✅ 교체 성공'}`);
    
    if (hasGraph) {
      // SVG 태그 위치 찾기
      const svgIndex = htmlContent.indexOf('<svg');
      const svgEndIndex = htmlContent.indexOf('</svg>', svgIndex);
      if (svgIndex !== -1 && svgEndIndex !== -1) {
        const svgContent = htmlContent.substring(svgIndex, svgEndIndex + 6);
        console.log(`\n📐 SVG 크기: ${svgContent.length} 문자`);
        
        // 목표선 확인
        const hasTargetLine = svgContent.includes('120');
        console.log(`- 120점 목표선: ${hasTargetLine ? '✅ 포함됨' : '❌ 없음'}`);
        
        // 점수 범위 확인
        const has50 = svgContent.includes('>50<');
        const has140 = svgContent.includes('>140<');
        console.log(`- Y축 범위 (50-140): ${has50 && has140 ? '✅ 올바름' : '❌ 확인 필요'}`);
      }
    }
    
    console.log('\n💡 브라우저에서 test-output.html 파일을 열어 시각적으로 확인하세요.');
    
  } catch (error) {
    console.error('❌ 에러 발생:', error);
  } finally {
    process.exit(0);
  }
}

testPDFGeneration();
