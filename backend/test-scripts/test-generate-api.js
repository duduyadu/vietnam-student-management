const axios = require('axios');

async function testGenerateAPI() {
  console.log('🧪 Testing Generate Report API...\n');
  
  try {
    // 로그인하여 토큰 받기
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'password123'  // 기본 비밀번호
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received\n');
    
    // PDF 생성 테스트
    console.log('2️⃣ Testing report generation...');
    
    const generateResponse = await axios.post(
      'http://localhost:5000/api/reports/generate',
      {
        student_id: 1,
        template_code: 'consultation_comprehensive',
        language: 'ko'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Report generation successful!');
    console.log('Response:', JSON.stringify(generateResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed!');
    console.error('Error:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// 테스트 실행
testGenerateAPI().catch(console.error);