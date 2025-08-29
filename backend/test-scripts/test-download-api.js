const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testDownloadAPI() {
  console.log('🧪 Testing Download API...\n');
  
  try {
    // 로그인하여 토큰 받기
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/users/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received\n');
    
    // 다운로드 테스트
    const reportId = 36; // 존재하는 report ID
    console.log(`2️⃣ Testing download for report ID: ${reportId}`);
    
    try {
      const downloadResponse = await axios.get(
        `http://localhost:5000/api/reports/${reportId}/download`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          responseType: 'arraybuffer'
        }
      );
      
      console.log('✅ Download successful!');
      console.log(`Response status: ${downloadResponse.status}`);
      console.log(`Content-Type: ${downloadResponse.headers['content-type']}`);
      console.log(`Data size: ${downloadResponse.data.length} bytes`);
      
      // 테스트 파일로 저장
      const testPath = path.join(__dirname, 'test-download.pdf');
      fs.writeFileSync(testPath, downloadResponse.data);
      console.log(`✅ PDF saved to: ${testPath}`);
      
    } catch (downloadError) {
      console.error('❌ Download failed!');
      console.error(`Status: ${downloadError.response?.status}`);
      console.error(`Status Text: ${downloadError.response?.statusText}`);
      
      if (downloadError.response?.data) {
        const errorData = downloadError.response.data;
        if (Buffer.isBuffer(errorData)) {
          const errorText = errorData.toString('utf8');
          console.error('Error response:', errorText);
        } else {
          console.error('Error response:', errorData);
        }
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// 테스트 실행
testDownloadAPI().catch(console.error);