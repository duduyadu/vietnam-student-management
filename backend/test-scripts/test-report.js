const reportService = require('./services/reportService');

(async () => {
  try {
    console.log('\n🎯 보고서 생성 테스트 시작 (Student ID: 38)...');
    const result = await reportService.generateHTMLFromTemplate(38, 'ko');
    console.log('\n✅ HTML 생성 완료!');
    console.log('  - HTML 길이:', result.length);
    
    // academic_evaluation이 포함되어 있는지 확인
    const hasAcademic = result.includes('TEST 학업 평가');
    const hasKorean = result.includes('TEST 한국어 평가');
    const hasRecommendation = result.includes('TEST 최종 추천');
    
    console.log('\n📊 콘텐츠 확인:');
    console.log('  - TEST 학업 평가 포함?', hasAcademic);
    console.log('  - TEST 한국어 평가 포함?', hasKorean);
    console.log('  - TEST 최종 추천 포함?', hasRecommendation);
    
    if (!hasAcademic || !hasKorean || !hasRecommendation) {
      console.log('\n⚠️ 일부 콘텐츠가 누락되었습니다!');
      
      // HTML에서 해당 부분 찾기
      const academicIndex = result.indexOf('학업 성취도 평가');
      if (academicIndex > 0) {
        console.log('\n학업 평가 섹션 내용:');
        console.log(result.substring(academicIndex, academicIndex + 300));
      }
      
      const koreanIndex = result.indexOf('한국어 능력 평가');
      if (koreanIndex > 0) {
        console.log('\n한국어 평가 섹션 내용:');
        console.log(result.substring(koreanIndex, koreanIndex + 300));
      }
    } else {
      console.log('\n✨ 모든 테스트 콘텐츠가 정상적으로 포함되었습니다!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();