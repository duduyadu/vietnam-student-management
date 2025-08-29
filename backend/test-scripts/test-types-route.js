const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testTypesRoute() {
  try {
    console.log('🔐 로그인 중...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@system.com',
      password: 'test123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공');
    
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    
    console.log('\n📋 상담 유형 조회 중...');
    console.log('URL:', `${API_URL}/consultations/types`);
    
    const typesResponse = await axios.get(`${API_URL}/consultations/types`, config);
    console.log('✅ 상담 유형 조회 성공!');
    console.log('유형 개수:', typesResponse.data.data.length);
    console.log('\n조회된 유형:');
    typesResponse.data.data.forEach(type => {
      console.log(`- ${type.type_code}: ${type.type_name_ko}`);
    });
    
  } catch (error) {
    console.error('\n❌ 오류:', error.response?.data || error.message);
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('응답:', error.response.data);
    }
  }
}

testTypesRoute();