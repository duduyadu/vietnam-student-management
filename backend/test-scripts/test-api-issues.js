const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';

// 테스트용 토큰 (실제 로그인된 사용자의 토큰 필요)
let authToken = '';

async function testLogin() {
  try {
    console.log('🔑 로그인 테스트...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    authToken = response.data.token;
    console.log('✅ 로그인 성공');
    return authToken;
  } catch (error) {
    console.error('❌ 로그인 실패:', error.response?.data || error.message);
    return null;
  }
}

async function testStudentAdd() {
  try {
    console.log('\n👨‍🎓 학생 추가 테스트...');
    
    const studentData = {
      student_code: 'TEST' + Date.now(),
      korean_name: '테스트학생',
      vietnamese_name: 'Sinh viên thử nghiệm',
      phone: '010-1234-5678',
      email: 'test@example.com',
      birth_date: '2005-08-15'
    };
    
    console.log('요청 데이터:', studentData);
    
    const response = await axios.post(`${API_BASE}/students`, studentData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 학생 추가 성공:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ 학생 추가 실패:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', error.response?.data);
    console.error('  Message:', error.message);
    return null;
  }
}

async function testConsultationAdd() {
  try {
    console.log('\n💬 상담 기록 추가 테스트...');
    
    // 먼저 학생 목록을 가져와서 첫 번째 학생 ID 사용
    const studentsResponse = await axios.get(`${API_BASE}/students`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    const students = studentsResponse.data.data;
    if (students.length === 0) {
      console.log('❌ 테스트할 학생이 없습니다.');
      return null;
    }
    
    const consultationData = {
      student_id: students[0].student_id,
      consultation_date: '2025-01-17',
      consultation_type: 'academic',
      content_ko: '테스트 상담 내용입니다.',
      content_vi: 'Nội dung tư vấn thử nghiệm.',
      action_items: '다음 주까지 과제 완료',
      next_consultation_date: '2025-01-24'
    };
    
    console.log('요청 데이터:', consultationData);
    
    const response = await axios.post(`${API_BASE}/consultations`, consultationData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 상담 기록 추가 성공:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ 상담 기록 추가 실패:');
    console.error('  Status:', error.response?.status);
    console.error('  Data:', error.response?.data);
    console.error('  Message:', error.message);
    return null;
  }
}

async function testAPIEndpoints() {
  try {
    console.log('🚀 API 엔드포인트 테스트 시작...');
    
    // 1. 로그인
    const token = await testLogin();
    if (!token) {
      console.log('❌ 로그인 실패로 테스트 중단');
      return;
    }
    
    // 2. 학생 추가 테스트
    await testStudentAdd();
    
    // 3. 상담 기록 추가 테스트
    await testConsultationAdd();
    
    console.log('\n✅ 모든 테스트 완료');
  } catch (error) {
    console.error('❌ 테스트 실행 중 오류:', error.message);
  }
}

testAPIEndpoints();