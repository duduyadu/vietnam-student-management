const axios = require('axios');

async function getToken() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    console.log(response.data.token);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getToken();