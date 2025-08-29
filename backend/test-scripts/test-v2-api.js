const axios = require('axios');

async function testV2API() {
  try {
    // 1. 로그인
    console.log('🔐 로그인 중...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vsms.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ 로그인 성공\n');
    
    // 2. 상담 목록 조회 테스트
    console.log('📋 상담 목록 조회 테스트...');
    const listResponse = await axios.get('http://localhost:5000/api/consultations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ 상담 목록 조회 성공!');
    console.log(`- 조회된 상담 수: ${listResponse.data.data.length}`);
    if (listResponse.data.data.length > 0) {
      const firstConsultation = listResponse.data.data[0];
      console.log('- 첫 번째 상담 정보:');
      console.log(`  - ID: ${firstConsultation.consultation_id}`);
      console.log(`  - 학생 이름: ${firstConsultation.student_name || firstConsultation.student_name_ko}`);
      console.log(`  - 학생 코드: ${firstConsultation.student_code}`);
      console.log(`  - 교사: ${firstConsultation.teacher_name}`);
    }
    
    // 3. 학생 목록 조회
    console.log('\n👥 학생 목록 조회...');
    const studentsResponse = await axios.get('http://localhost:5000/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const students = studentsResponse.data.data;
    if (students.length === 0) {
      console.log('❌ 학생이 없습니다.');
      return;
    }
    
    const testStudent = students[0];
    console.log(`✅ 테스트 학생: ID=${testStudent.student_id}, Code=${testStudent.student_code}`);
    
    // 4. 새 상담 생성 테스트
    console.log('\n➕ 새 상담 생성 테스트...');
    const consultationData = {
      student_id: testStudent.student_id,
      consultation_date: '2025-08-16',
      consultation_type: 'academic',
      content_ko: 'V2 API 테스트 상담 내용',
      content_vi: 'Nội dung test V2 API',
      action_items: '다음 주까지 과제 완료',
      next_consultation_date: '2025-08-23'
    };
    
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
    console.log('생성된 상담 정보:');
    console.log(`  - ID: ${createResponse.data.data.consultation_id}`);
    console.log(`  - 학생 이름: ${createResponse.data.data.student_name}`);
    console.log(`  - 학생 코드: ${createResponse.data.data.student_code}`);
    console.log(`  - 내용: ${createResponse.data.data.content_ko}`);
    
    console.log('\n🎉 모든 테스트 통과!');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패!');
    if (error.response) {
      console.error('상태 코드:', error.response.status);
      console.error('에러 응답:', error.response.data);
    } else {
      console.error('에러:', error.message);
    }
  }
}

testV2API();