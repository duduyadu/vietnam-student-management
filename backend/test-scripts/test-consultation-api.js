const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';

async function testConsultationAPI() {
  try {
    // 1. 로그인
    console.log('1. 로그인 시도...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@vsms.com',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ 로그인 성공');
    console.log('Token:', authToken.substring(0, 20) + '...');
    
    // 2. 학생 목록 조회
    console.log('\n2. 학생 목록 조회...');
    const studentsResponse = await axios.get(`${API_URL}/students`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const students = studentsResponse.data.data;
    console.log(`✅ 학생 ${students.length}명 조회 완료`);
    
    if (students.length === 0) {
      console.log('❌ 테스트할 학생이 없습니다. 학생을 먼저 등록해주세요.');
      return;
    }
    
    const testStudent = students[0];
    console.log(`테스트 학생: ${testStudent.name_ko} (ID: ${testStudent.student_id})`);
    
    // 3. 상담 기록 생성
    console.log('\n3. 상담 기록 생성 테스트...');
    const consultationData = {
      student_id: testStudent.student_id,
      consultation_date: new Date().toISOString().split('T')[0],
      consultation_type: 'academic',
      content_ko: '테스트 상담 내용입니다.',
      content_vi: 'Nội dung tư vấn thử nghiệm',
      action_items: '다음 상담까지 과제 완료하기',
      next_consultation_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    console.log('요청 데이터:', JSON.stringify(consultationData, null, 2));
    
    const createResponse = await axios.post(
      `${API_URL}/consultations`,
      consultationData,
      {
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ 상담 기록 생성 성공!');
    console.log('응답:', JSON.stringify(createResponse.data, null, 2));
    
    // 4. 생성된 상담 기록 조회
    if (createResponse.data.data && createResponse.data.data.consultation_id) {
      console.log('\n4. 생성된 상담 기록 조회...');
      const getResponse = await axios.get(
        `${API_URL}/consultations/${createResponse.data.data.consultation_id}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      console.log('✅ 상담 기록 조회 성공!');
      console.log('조회 결과:', JSON.stringify(getResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ 에러 발생!');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('에러 메시지:', error.response.data);
    } else {
      console.error('에러:', error.message);
    }
  }
}

// 테스트 실행
testConsultationAPI();