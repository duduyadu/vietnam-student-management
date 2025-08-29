const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJhZ2VuY3lJZCI6bnVsbCwiaWF0IjoxNzU1NDM4MDYwLCJleHAiOjE3NTYwNDI4NjB9.U_6L2onsKaKIYT_ffJfBw_pWDmmb4LOi4ksK5w2gOjQ';

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  console.log('🔍 토큰 디코딩 결과:', JSON.stringify(decoded, null, 2));
  console.log('🔍 decoded.userId:', decoded.userId);
  console.log('🔍 decoded.role:', decoded.role);
} catch (error) {
  console.error('❌ 토큰 검증 실패:', error.message);
}