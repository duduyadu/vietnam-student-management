const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';
let authToken = '';

async function testLogin() {
  console.log('\n=== 로그인 테스트 ===');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    console.log('✅ 로그인 성공!');
    console.log('Token:', authToken.substring(0, 30) + '...');
    return true;
  } catch (error) {
    console.error('❌ 로그인 실패:', error.response?.data || error.message);
    return false;
  }
}

async function testStudentCreate() {
  console.log('\n=== 학생 추가 테스트 ===');
  try {
    const studentData = {
      student_code: `TEST_${Date.now()}`,
      korean_name: '테스트 학생',
      vietnamese_name: 'Test Student',
      phone: '010-1234-5678',
      email: 'test@example.com',
      birth_date: '2000-01-01'
    };
    
    console.log('요청 데이터:', studentData);
    
    const response = await axios.post(`${API_URL}/students`, studentData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 학생 추가 성공!');
    console.log('응답:', response.data);
    return response.data.data.student_id;
  } catch (error) {
    console.error('❌ 학생 추가 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

async function testConsultationCreate(studentId) {
  console.log('\n=== 상담 기록 추가 테스트 ===');
  try {
    const consultationData = {
      student_id: studentId,
      consultation_date: new Date().toISOString().split('T')[0],
      consultation_type: 'academic',
      content_ko: '학업 진도 상담 내용입니다.',
      content_vi: 'Nội dung tư vấn tiến độ học tập.',
      action_items: '다음 주까지 과제 제출',
      next_consultation_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    console.log('요청 데이터:', consultationData);
    
    const response = await axios.post(`${API_URL}/consultations`, consultationData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 상담 기록 추가 성공!');
    console.log('응답:', response.data);
    return true;
  } catch (error) {
    console.error('❌ 상담 기록 추가 실패:', error.response?.data || error.message);
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('응답 데이터:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 API 테스트 시작...');
  console.log('서버 URL:', API_URL);
  
  // 1. 로그인
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ 로그인 실패로 테스트 중단');
    return;
  }
  
  // 2. 학생 추가
  const studentId = await testStudentCreate();
  if (!studentId) {
    console.log('\n⚠️ 학생 추가 실패');
  } else {
    // 3. 상담 기록 추가 (학생 ID 사용)
    await testConsultationCreate(studentId);
  }
  
  console.log('\n✨ 테스트 완료!');
}

// 서버가 시작될 시간을 주고 테스트 실행
setTimeout(() => {
  runTests().catch(console.error);
}, 2000);