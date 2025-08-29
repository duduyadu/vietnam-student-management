const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testDownload() {
  try {
    // Step 1: Login
    console.log('Step 1: Logging in as test2...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test2@test.com',
      password: 'test'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Step 2: Get list of reports
    console.log('\nStep 2: Getting list of reports...');
    const reportsResponse = await axios.get(`${API_URL}/reports`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Reports found:', reportsResponse.data.data.length);
    
    if (reportsResponse.data.data.length > 0) {
      const report = reportsResponse.data.data[0];
      console.log(`\nFirst report: ID=${report.report_id}, Status=${report.status}, PDF=${report.pdf_path ? 'YES' : 'NO'}`);
      
      // Step 3: Try to download
      console.log(`\nStep 3: Attempting to download report ${report.report_id}...`);
      try {
        const downloadResponse = await axios.get(`${API_URL}/reports/${report.report_id}/download`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'arraybuffer'
        });
        
        console.log('✅ Download successful!');
        console.log('PDF size:', downloadResponse.data.length, 'bytes');
      } catch (downloadError) {
        console.log('❌ Download failed:', downloadError.response?.status, downloadError.response?.statusText);
        if (downloadError.response?.data) {
          const errorText = Buffer.from(downloadError.response.data).toString('utf-8');
          console.log('Error details:', errorText);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testDownload();
