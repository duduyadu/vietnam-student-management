const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = null;

// 시스템 통합 테스트
async function testSystem() {
  console.log('🚀 베트남 학생 관리 시스템 통합 테스트 시작...\n');
  
  try {
    // 1. 로그인 테스트
    console.log('1️⃣ 로그인 테스트...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    token = loginResponse.data.token;
    console.log('✅ 로그인 성공!');
    console.log(`   - 사용자: ${loginResponse.data.user.username}`);
    console.log(`   - 역할: ${loginResponse.data.user.role}`);
    
    // axios 기본 헤더에 토큰 설정
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. 대시보드 통계 테스트
    console.log('\n2️⃣ 대시보드 통계 조회...');
    const dashboardResponse = await axios.get(`${API_URL}/dashboard/stats`);
    const stats = dashboardResponse.data.data.stats;
    
    console.log('✅ 대시보드 통계:');
    console.log(`   - 전체 학생: ${stats.totalStudents}명`);
    console.log(`   - 재학 중: ${stats.activeStudents}명`);
    console.log(`   - 졸업생: ${stats.graduatedStudents}명`);
    console.log(`   - 이번 달 상담: ${stats.monthlyConsultations}건`);
    
    // 3. 학생 목록 조회
    console.log('\n3️⃣ 학생 목록 조회...');
    const studentsResponse = await axios.get(`${API_URL}/students?page=1&limit=5`);
    const students = studentsResponse.data.data;
    
    console.log(`✅ 학생 ${students.length}명 조회됨`);
    if (students.length > 0) {
      console.log('   첫 번째 학생:');
      console.log(`   - 이름: ${students[0].attributes?.name || '이름 없음'}`);
      console.log(`   - 코드: ${students[0].student_code}`);
    }
    
    // 4. 상담 기록 조회
    console.log('\n4️⃣ 상담 기록 조회...');
    const consultationsResponse = await axios.get(`${API_URL}/consultations?page=1&limit=5`);
    const consultations = consultationsResponse.data.data;
    
    console.log(`✅ 상담 기록 ${consultations.length}건 조회됨`);
    
    // 5. 보고서 템플릿 조회
    console.log('\n5️⃣ 보고서 템플릿 조회...');
    const templatesResponse = await axios.get(`${API_URL}/reports/templates`);
    const templates = templatesResponse.data.data;
    
    console.log(`✅ 보고서 템플릿 ${templates.length}개 조회됨`);
    templates.forEach(template => {
      console.log(`   - ${template.template_name} (${template.template_code})`);
    });
    
    // 6. 보고서 생성 가능 여부 테스트
    console.log('\n6️⃣ PDF 보고서 생성 테스트 준비...');
    if (students.length > 0) {
      const testStudent = students[0];
      console.log(`✅ 테스트 학생: ${testStudent.attributes?.name || '이름 없음'} (${testStudent.student_code})`);
      console.log('   → 프론트엔드에서 보고서 생성 버튼을 클릭하여 테스트하세요.');
    } else {
      console.log('⚠️ 테스트할 학생이 없습니다. 먼저 학생을 등록하세요.');
    }
    
    console.log('\n✨ 시스템 테스트 완료!');
    console.log('📌 프론트엔드 URL: http://localhost:3000');
    console.log('📌 백엔드 API URL: http://localhost:5000/api');
    
  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 팁: 로그인 정보를 확인하세요 (admin/admin123)');
    }
  }
}

// 테스트 실행
testSystem();