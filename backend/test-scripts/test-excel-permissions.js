const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:5000/api';

async function testExcelPermissions() {
  console.log('=== 권한별 엑셀 기능 테스트 ===\n');

  // 1. 관리자 테스트
  console.log('1️⃣ 관리자 권한 테스트');
  console.log('------------------------');
  try {
    // 관리자 로그인
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@vsms.com',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ 관리자 로그인 성공');

    // 엑셀 다운로드 테스트
    try {
      const downloadRes = await axios.get(`${API_URL}/excel/students/download`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'arraybuffer'
      });
      console.log('✅ 관리자 엑셀 다운로드 성공');
      
      // 파일 저장 (선택사항)
      // fs.writeFileSync('admin_students.xlsx', downloadRes.data);
    } catch (error) {
      console.log('❌ 관리자 엑셀 다운로드 실패:', error.response?.data || error.message);
    }

    // 템플릿 다운로드 테스트
    try {
      const templateRes = await axios.get(`${API_URL}/excel/template/download`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'arraybuffer'
      });
      console.log('✅ 관리자 템플릿 다운로드 성공');
    } catch (error) {
      console.log('❌ 관리자 템플릿 다운로드 실패:', error.response?.data || error.message);
    }

  } catch (error) {
    console.log('❌ 관리자 로그인 실패');
  }

  console.log('\n');

  // 2. 선생님 테스트
  console.log('2️⃣ 선생님 권한 테스트');
  console.log('------------------------');
  try {
    // 선생님 계정 생성 (이미 있으면 로그인)
    const teacherLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'teacher1@agency.com',
      password: 'teacher123'
    });
    const teacherToken = teacherLogin.data.token;
    console.log('✅ 선생님 로그인 성공');

    // 엑셀 다운로드 테스트 (성공해야 함)
    try {
      const downloadRes = await axios.get(`${API_URL}/excel/students/download`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
        responseType: 'arraybuffer'
      });
      console.log('✅ 선생님 엑셀 다운로드 성공 (자기 학원 학생만)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('ℹ️ 선생님 유학원에 학생이 없음');
      } else {
        console.log('❌ 선생님 엑셀 다운로드 실패:', error.response?.data || error.message);
      }
    }

    // 엑셀 업로드 테스트 (실패해야 함)
    try {
      const uploadRes = await axios.post(`${API_URL}/excel/students/upload`, 
        {},
        {
          headers: { Authorization: `Bearer ${teacherToken}` }
        }
      );
      console.log('❌ 선생님 엑셀 업로드 성공 (이상함!)');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 선생님 엑셀 업로드 차단됨 (정상)');
      } else {
        console.log('⚠️ 예상치 못한 오류:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.log('ℹ️ 선생님 계정이 없음 (teacher1@agency.com)');
  }

  console.log('\n');

  // 3. 한국 지점 테스트
  console.log('3️⃣ 한국 지점 권한 테스트');
  console.log('------------------------');
  
  // 먼저 한국 지점 계정 생성
  try {
    const adminLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@vsms.com',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;

    // 한국 지점 계정 생성
    try {
      await axios.post(`${API_URL}/users`, {
        email: 'branch@korea.com',
        password: 'branch123',
        full_name: '한국 지점',
        role: 'korean_branch',
        phone: '02-1234-5678'
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 한국 지점 계정 생성');
    } catch (error) {
      // 이미 존재할 수 있음
    }

    // 한국 지점 로그인
    const branchLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'branch@korea.com',
      password: 'branch123'
    });
    const branchToken = branchLogin.data.token;
    console.log('✅ 한국 지점 로그인 성공');

    // 엑셀 다운로드 테스트 (실패해야 함)
    try {
      const downloadRes = await axios.get(`${API_URL}/excel/students/download`, {
        headers: { Authorization: `Bearer ${branchToken}` },
        responseType: 'arraybuffer'
      });
      console.log('❌ 한국 지점 엑셀 다운로드 성공 (이상함!)');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 한국 지점 엑셀 다운로드 차단됨 (정상)');
      } else {
        console.log('⚠️ 예상치 못한 오류:', error.response?.data || error.message);
      }
    }

    // 엑셀 업로드 테스트 (실패해야 함)
    try {
      const uploadRes = await axios.post(`${API_URL}/excel/students/upload`, 
        {},
        {
          headers: { Authorization: `Bearer ${branchToken}` }
        }
      );
      console.log('❌ 한국 지점 엑셀 업로드 성공 (이상함!)');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ 한국 지점 엑셀 업로드 차단됨 (정상)');
      } else {
        console.log('⚠️ 예상치 못한 오류:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.log('❌ 테스트 실패:', error.message);
  }

  console.log('\n=== 테스트 완료 ===');
}

// 테스트 실행
testExcelPermissions();