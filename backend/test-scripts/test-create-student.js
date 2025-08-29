const axios = require('axios');

async function testCreateStudent() {
  try {
    console.log('🔧 Testing student creation API...\n');
    
    // 1. 먼저 로그인하여 토큰 획득
    console.log('📋 Step 1: Login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testadmin@example.com',
      password: 'test123'  // 새로 생성한 테스트 계정
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // 2. 유학원 목록 가져오기
    console.log('\n📋 Step 2: Get agencies...');
    const agenciesResponse = await axios.get('http://localhost:5000/api/agencies', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const agencies = agenciesResponse.data.data;
    console.log(`✅ Found ${agencies.length} agencies`);
    console.table(agencies);
    
    // 3. 첫 번째 유학원 사용하여 학생 생성 테스트
    if (agencies.length > 0) {
      const testAgency = agencies[0];
      console.log(`\n📋 Step 3: Create student in ${testAgency.agency_name}...`);
      
      const studentData = {
        name_ko: '테스트학생',
        name_vi: 'Test Student',
        agency_id: testAgency.agency_id,
        phone: '010-1234-5678',
        email: 'test@example.com',
        birth_date: '2005-01-01',
        gender: '남성',
        address_korea: '서울시 강남구',
        parent_name: '테스트부모',
        parent_phone: '010-9876-5432'
      };
      
      console.log('\n📝 Sending student data:');
      console.log(JSON.stringify(studentData, null, 2));
      
      const createResponse = await axios.post('http://localhost:5000/api/students', 
        studentData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('\n✅ Student created successfully!');
      console.log('Response:', createResponse.data);
      
    } else {
      console.log('❌ No agencies found to test with');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCreateStudent();