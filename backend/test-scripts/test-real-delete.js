const axios = require('axios');

async function testRealDelete() {
  try {
    // 1. 로그인
    console.log('1. Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vsms.com',
      password: 'admin2024'
    });
    
    const token = loginRes.data.token;
    console.log('Token:', token.substring(0, 50) + '...');
    
    // 2. 사용자 목록 조회
    console.log('\n2. Getting users...');
    const usersRes = await axios.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Users found:');
    usersRes.data.data.forEach(u => {
      console.log(`  - ID: ${u.user_id}, Email: ${u.email}, Role: ${u.role}`);
    });
    
    // 3. 교사 계정 찾기
    const teacher = usersRes.data.data.find(u => 
      u.role === 'teacher' && u.email !== 'admin@vsms.com'
    );
    
    if (!teacher) {
      console.log('No teacher to delete');
      return;
    }
    
    // 4. 삭제 시도
    console.log(`\n3. Attempting to DELETE /api/users/${teacher.user_id}`);
    console.log(`   User: ${teacher.email}`);
    
    try {
      const deleteRes = await axios.delete(`http://localhost:5000/api/users/${teacher.user_id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ SUCCESS:', deleteRes.data);
    } catch (deleteErr) {
      console.log('❌ FAILED:');
      console.log('   Status:', deleteErr.response?.status);
      console.log('   Data:', deleteErr.response?.data);
      console.log('   URL:', deleteErr.config?.url);
      console.log('   Method:', deleteErr.config?.method);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testRealDelete();