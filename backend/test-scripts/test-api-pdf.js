const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testPDFAPI() {
  console.log('🧪 Testing PDF Generation API...\n');
  
  try {
    // Login first to get token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testadmin@example.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful!');
    
    // Generate PDF
    console.log('\n2️⃣ Generating PDF for student ID 1...');
    const generateResponse = await axios.post(
      'http://localhost:5000/api/reports/generate',
      {
        student_id: 1,
        template_code: 'consultation_comprehensive'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ PDF Generated successfully!');
    console.log('Full response:', JSON.stringify(generateResponse.data, null, 2));
    const reportId = generateResponse.data.data.report_id;
    console.log('Report ID:', reportId);
    console.log('PDF Path:', generateResponse.data.data.pdf_path);
    
    // Download PDF
    console.log('\n3️⃣ Downloading PDF...');
    const downloadResponse = await axios.get(
      `http://localhost:5000/api/reports/${reportId}/download`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'arraybuffer'
      }
    );
    
    // Save PDF locally for verification
    const outputPath = path.join(__dirname, 'test-output.pdf');
    fs.writeFileSync(outputPath, downloadResponse.data);
    console.log(`✅ PDF downloaded and saved to: ${outputPath}`);
    console.log(`File size: ${downloadResponse.data.length} bytes`);
    
  } catch (error) {
    console.error('❌ Test Failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run test
testPDFAPI();