const axios = require('axios');

const testLogin = async () => {
  const users = [
    { email: 'admin@vsms.com', password: 'admin2024', name: 'Admin' },
    { email: 'teacher@hanoi.edu', password: 'teacher2024', name: 'Teacher' },
    { email: 'seoul@branch.com', password: 'branch2024', name: 'Korean Branch' }
  ];

  for (const user of users) {
    try {
      console.log(`\nTesting login for ${user.name}...`);
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email: user.email,
        password: user.password
      });
      console.log(`✅ ${user.name} login successful:`, {
        userId: response.data.user.user_id,
        role: response.data.user.role,
        email: response.data.user.email
      });
    } catch (error) {
      console.error(`❌ ${user.name} login failed:`, error.response?.data || error.message);
    }
  }
};

testLogin();