const axios = require('axios');

async function testFromBrowser() {
  try {
    // 1. 로그인
    console.log('1. 브라우저에서 사용하는 방식으로 로그인...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vsms.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공');
    
    // 2. 학생 목록 조회
    const studentsResponse = await axios.get('http://localhost:5000/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const students = studentsResponse.data.data;
    if (students.length === 0) {
      console.log('❌ 학생이 없습니다.');
      return;
    }
    
    const testStudent = students[0];
    console.log(`테스트 학생: ID=${testStudent.student_id}, Code=${testStudent.student_code}`);
    
    // 3. 브라우저에서 보내는 것과 동일한 형식으로 상담 생성
    const consultationData = {
      student_id: testStudent.student_id,
      consultation_date: '2025-08-16',
      consultation_type: 'academic',
      content_ko: '브라우저 테스트 상담',
      content_vi: '',
      action_items: '',
      next_consultation_date: '2025-08-23'
    };
    
    console.log('\n상담 생성 요청:', consultationData);
    
    const createResponse = await axios.post(
      'http://localhost:5000/api/consultations',
      consultationData,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 상담 생성 성공!');
    console.log('응답:', createResponse.data);
    
  } catch (error) {
    console.error('\n❌ 에러 발생!');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('에러 응답:', error.response.data);
    } else {
      console.error('에러:', error.message);
    }
  }
}

testFromBrowser();