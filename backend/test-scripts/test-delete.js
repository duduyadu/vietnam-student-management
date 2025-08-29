const axios = require('axios');

async function testDelete() {
  try {
    console.log('1. Logging in as admin...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@vsms.com',
      password: 'admin2024'
    });
    const token = loginRes.data.token;
    console.log('   ✓ Login successful');
    
    console.log('2. Getting user list...');
    const usersRes = await axios.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✓ Found', usersRes.data.data.length, 'users');
    
    // Find a teacher to delete
    const teacher = usersRes.data.data.find(u => u.role === 'teacher' && u.email === 'teacher1@vsms.com');
    if (!teacher) {
      console.log('   ! No teacher1 found to delete');
      return;
    }
    
    console.log(`3. Attempting to delete ${teacher.email} (ID: ${teacher.user_id})...`);
    const deleteRes = await axios.delete(`http://localhost:5000/api/users/${teacher.user_id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('   ✓ Delete successful:', deleteRes.data.message_ko);
    
    console.log('4. Verifying deletion...');
    const verifyRes = await axios.get('http://localhost:5000/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const stillExists = verifyRes.data.data.find(u => u.user_id === teacher.user_id);
    if (!stillExists) {
      console.log('   ✓ User successfully deleted');
    } else {
      console.log('   ✗ User still exists!');
    }
    
  } catch (err) {
    console.error('Error:', err.response?.status, err.response?.data || err.message);
    if (err.response?.data?.error) {
      console.error('Details:', err.response.data.error);
    }
  }
}

testDelete();