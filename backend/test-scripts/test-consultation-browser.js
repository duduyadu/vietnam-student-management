const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';

async function testConsultationList() {
  try {
    // 1. 로그인
    console.log('1. 로그인 시도...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@vsms.com',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ 로그인 성공');
    
    // 2. 상담 기록 목록 조회
    console.log('\n2. 상담 기록 목록 조회...');
    const listResponse = await axios.get(`${API_URL}/consultations`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 10
      }
    });
    
    console.log('✅ 상담 기록 목록 조회 성공');
    console.log('Total records:', listResponse.data.pagination?.total || 0);
    console.log('Records fetched:', listResponse.data.data?.length || 0);
    
    if (listResponse.data.data && listResponse.data.data.length > 0) {
      console.log('\n상담 기록 샘플:');
      listResponse.data.data.forEach((consultation, idx) => {
        console.log(`\n[${idx + 1}] ID: ${consultation.consultation_id}`);
        console.log(`   학생: ${consultation.student_name || consultation.student_name_ko || 'N/A'} (${consultation.student_code})`);
        console.log(`   교사: ${consultation.teacher_name}`);
        console.log(`   날짜: ${consultation.consultation_date}`);
        console.log(`   유형: ${consultation.consultation_type}`);
        console.log(`   내용: ${consultation.content_ko?.substring(0, 50)}...`);
      });
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
testConsultationList();