/**
 * PDF API 엔드포인트 테스트 스크립트
 * 실행: node test-pdf-api.js
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const API_URL = 'http://localhost:5001';

async function testPDFAPI() {
  console.log('🧪 PDF API 테스트 시작...\n');
  
  try {
    // 1. 로그인하여 토큰 얻기
    console.log('1️⃣ 로그인 중...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공, 토큰 획득\n');
    
    // 2. PDF 다운로드 테스트
    console.log('2️⃣ PDF 다운로드 API 테스트...');
    const consultationId = 22;
    const studentId = 37;
    
    const pdfResponse = await axios.get(
      `${API_URL}/api/pdf-reports/consultation/${consultationId}/student/${studentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'arraybuffer' // 바이너리 데이터 받기
      }
    );
    
    console.log('✅ PDF 다운로드 성공');
    console.log(`   - Status: ${pdfResponse.status}`);
    console.log(`   - Content-Type: ${pdfResponse.headers['content-type']}`);
    console.log(`   - Size: ${(pdfResponse.data.length / 1024).toFixed(2)} KB\n`);
    
    // PDF 파일로 저장
    const outputPath = path.join(__dirname, 'test-api-output.pdf');
    await fs.writeFile(outputPath, pdfResponse.data);
    console.log(`📄 PDF 파일 저장됨: ${outputPath}\n`);
    
    // 3. HTML 미리보기 테스트
    console.log('3️⃣ HTML 미리보기 API 테스트...');
    const previewResponse = await axios.get(
      `${API_URL}/api/pdf-reports/preview/consultation/${consultationId}/student/${studentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ HTML 미리보기 성공');
    console.log(`   - HTML 길이: ${previewResponse.data.length} 문자\n`);
    
    // HTML 파일로 저장
    const htmlPath = path.join(__dirname, 'test-preview.html');
    await fs.writeFile(htmlPath, previewResponse.data);
    console.log(`📄 HTML 파일 저장됨: ${htmlPath}\n`);
    
    // 4. 쿼리 파라미터 토큰 테스트
    console.log('4️⃣ 쿼리 파라미터 토큰 테스트...');
    const queryTokenUrl = `${API_URL}/api/pdf-reports/consultation/${consultationId}/student/${studentId}?token=${token}`;
    console.log(`   URL: ${queryTokenUrl}`);
    
    const queryTokenResponse = await axios.get(queryTokenUrl, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ 쿼리 파라미터 토큰으로 PDF 다운로드 성공');
    console.log(`   - Size: ${(queryTokenResponse.data.length / 1024).toFixed(2)} KB\n`);
    
    console.log('✨ 모든 테스트 성공!');
    console.log('\n📊 테스트 결과 요약:');
    console.log('   ✅ 헤더 토큰 인증 작동');
    console.log('   ✅ PDF 생성 및 다운로드 작동');
    console.log('   ✅ HTML 미리보기 작동');
    console.log('   ✅ 쿼리 파라미터 토큰 인증 작동');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    
    if (error.response) {
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
    } else if (error.request) {
      console.error('   - 서버 응답 없음. 서버가 실행 중인지 확인하세요.');
      console.error('   - URL:', API_URL);
    } else {
      console.error('   - 에러 상세:', error);
    }
  }
}

// 실행
testPDFAPI();