const axios = require('axios');

async function testConsultationAPI() {
  try {
    console.log('1. 관리자로 로그인...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vsms.com',
      password: 'admin2024'
    });
    const token = loginRes.data.token;
    console.log('   ✓ 로그인 성공');
    
    console.log('2. 학생 목록 조회...');
    const studentsRes = await axios.get('http://localhost:5000/api/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const students = studentsRes.data.data;
    console.log('   ✓ 학생 수:', students.length);
    
    if (students.length === 0) {
      console.log('   ! 학생이 없어 테스트할 수 없습니다.');
      return;
    }
    
    const student = students[0];
    console.log(`   선택된 학생: ${student.name_ko || student.name_vi} (${student.student_code})`);
    
    console.log('3. 상담 기록 추가...');
    const newConsultation = {
      student_id: student.student_id,
      consultation_date: new Date().toISOString().split('T')[0],
      consultation_type: 'academic',
      content_ko: '1학기 성적 상담\n\n학생의 현재 성적 상황을 검토하고 향후 학습 계획을 수립했습니다.\n- 한국어 실력이 많이 향상되었음\n- 전공 과목에 대한 이해도가 높아짐\n- 다음 학기 목표 설정 완료',
      content_vi: 'Tư vấn điểm học kỳ 1\n\nĐã xem xét tình hình điểm hiện tại của học sinh và lập kế hoạch học tập trong tương lai.',
      action_items: '1. 한국어 회화 연습 매일 30분\n2. 전공 서적 읽기\n3. 토픽 시험 준비',
      next_consultation_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    const createRes = await axios.post('http://localhost:5000/api/consultations', newConsultation, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✓ 상담 기록 생성 성공:', createRes.data.data.consultation_id);
    
    console.log('4. 상담 기록 목록 조회...');
    const listRes = await axios.get('http://localhost:5000/api/consultations', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✓ 총 상담 기록 수:', listRes.data.pagination.total);
    
    // 진로 상담 추가
    console.log('5. 진로 상담 기록 추가...');
    const careerConsultation = {
      student_id: student.student_id,
      consultation_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      consultation_type: 'career',
      content_ko: '대학 진학 상담\n\n희망 대학 및 전공 선택에 대한 상담을 진행했습니다.\n- 서울대학교 경영학과 희망\n- 연세대학교 경제학과도 고려 중\n- 입학 요건 및 준비 사항 안내',
      action_items: '1. 대학별 입학 요강 확인\n2. 자기소개서 작성 시작\n3. 토픽 6급 취득 목표',
      next_consultation_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    await axios.post('http://localhost:5000/api/consultations', careerConsultation, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✓ 진로 상담 기록 생성 성공');
    
    // 비자 상담 추가
    console.log('6. 비자 상담 기록 추가...');
    const visaConsultation = {
      student_id: students.length > 1 ? students[1].student_id : student.student_id,
      consultation_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      consultation_type: 'visa',
      content_ko: '비자 연장 상담\n\nD-4 비자 연장 절차 안내\n- 필요 서류 목록 제공\n- 출입국 사무소 방문 일정 조율\n- 재정 증명서 준비 안내',
      action_items: '1. 재학 증명서 발급\n2. 은행 잔고 증명서 준비\n3. 출입국 사무소 예약',
      next_consultation_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };
    
    await axios.post('http://localhost:5000/api/consultations', visaConsultation, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✓ 비자 상담 기록 생성 성공');
    
    console.log('\n✅ 상담 기록 API 테스트 완료!');
    console.log('브라우저에서 http://localhost:3000 접속 후 "상담 기록" 메뉴를 확인하세요.');
    
  } catch (error) {
    console.error('❌ 에러:', error.response?.data || error.message);
  }
}

testConsultationAPI();