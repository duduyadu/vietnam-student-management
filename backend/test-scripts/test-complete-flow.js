const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

async function testCompleteFlow() {
  try {
    console.log('=== PDF 생성 및 다운로드 완전 테스트 ===\n');
    
    // Step 1: 로그인
    console.log('Step 1: 로그인...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'simple@test.com',
      password: 'simple'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공!');
    
    // Step 2: 학생 조회
    console.log('\nStep 2: 학생 정보 조회...');
    const studentsResponse = await axios.get(`${API_URL}/students`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { limit: 1 }
    });
    
    if (studentsResponse.data.data.length === 0) {
      console.log('❌ 학생이 없습니다');
      return;
    }
    
    const student = studentsResponse.data.data[0];
    console.log(`✅ 학생 찾음: ${student.name_korean || student.name} (ID: ${student.student_id})`);
    
    // Step 3: PDF 생성
    console.log('\nStep 3: PDF 보고서 생성...');
    const generateResponse = await axios.post(
      `${API_URL}/reports/generate`,
      {
        student_id: student.student_id,
        template_code: 'consultation_comprehensive',
        language: 'ko'
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const reportId = generateResponse.data.data.report_id;
    console.log(`✅ PDF 생성 완료!`);
    console.log(`   보고서 ID: ${reportId}`);
    console.log(`   경로: ${generateResponse.data.data.pdf_path}`);
    
    // Step 4: PDF 다운로드
    console.log('\nStep 4: PDF 다운로드...');
    try {
      const downloadResponse = await axios.get(
        `${API_URL}/reports/${reportId}/download`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'arraybuffer'
        }
      );
      
      console.log(`✅ PDF 다운로드 성공!`);
      console.log(`   크기: ${downloadResponse.data.length} bytes (${(downloadResponse.data.length / 1024 / 1024).toFixed(2)} MB)`);
      
      // 파일 저장
      const testPdfPath = path.join(__dirname, `test_report_${reportId}.pdf`);
      fs.writeFileSync(testPdfPath, downloadResponse.data);
      console.log(`   저장 위치: ${testPdfPath}`);
      
    } catch (downloadError) {
      console.log('❌ 다운로드 실패:', downloadError.response?.status);
      if (downloadError.response?.data) {
        const errorText = Buffer.from(downloadError.response.data).toString('utf-8');
        console.log('   에러:', errorText);
      }
    }
    
    console.log('\n=== 테스트 완료 ===');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.response?.data || error.message);
  }
}

testCompleteFlow();