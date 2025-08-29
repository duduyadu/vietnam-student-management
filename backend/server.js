const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const performanceMonitor = require('./utils/performance');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan 로깅 - 모든 요청 로깅
app.use(morgan('dev'));

// 성능 모니터링 미들웨어
app.use(performanceMonitor.measureResponseTime());

// 추가 디버깅용 로그
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl} - Body:`, req.body);
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students-optimized'); // Using optimized version with ID generation
const consultationsRoutes = require('./routes/consultations'); // Temporarily using regular version
const menuRoutes = require('./routes/menu');
const usersRoutes = require('./routes/users');
const filesRoutes = require('./routes/files');
const excelRoutes = require('./routes/excel');
const agenciesRoutes = require('./routes/agencies-optimized'); // Using optimized version with agency codes
const reportsRoutes = require('./routes/reports');
const topikRoutes = require('./routes/topik-mock'); // TOPIK 모의고사 관리
const pdfReportsRoutes = require('./routes/pdf-reports'); // PDF 보고서 생성
const pdfReportsV2Routes = require('./routes/pdf-reports-v2'); // PDF 보고서 V2 (새로운 4페이지 구조)
const studentEvaluationRoutes = require('./routes/student-evaluation'); // 학생 평가 데이터 관리
const dashboardRoutes = require('./routes/dashboard'); // 대시보드 통계 API
const teacherEvaluationsRoutes = require('./routes/teacher-evaluations'); // 선생님별 평가 시스템
const learningMetricsRoutes = require('./routes/learningMetrics'); // 학습 메트릭스 관리
const specialActivitiesRoutes = require('./routes/specialActivities'); // 특별활동 관리
const characterEvaluationsRoutes = require('./routes/characterEvaluations'); // 생활 및 인성평가 관리
const studentImageUploadRoutes = require('./routes/student-image-upload'); // 학생 사진 업로드

console.log('📚 Loading all routes...');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/students', studentImageUploadRoutes); // 이미지 업로드 라우트 추가
app.use('/api/consultations', consultationsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/topik', topikRoutes); // TOPIK API 엔드포인트
app.use('/api/pdf-reports', pdfReportsRoutes); // PDF 보고서 API
app.use('/api/pdf-reports', pdfReportsV2Routes); // PDF 보고서 V2 API (새로운 구조)
app.use('/api/topik-scores', require('./routes/topik-scores-upload')); // TOPIK 점수 일괄 업로드
app.use('/api/auto-record', require('./routes/auto-record')); // 생활기록부 자동 생성
app.use('/api/student-evaluation', studentEvaluationRoutes); // 학생 평가 데이터 API
app.use('/api/dashboard', dashboardRoutes); // 대시보드 통계 API
app.use('/api/batch-reports', require('./routes/batch-reports')); // 일괄 보고서 생성 API
app.use('/api/teacher-evaluations', teacherEvaluationsRoutes); // 선생님별 평가 API
app.use('/api/learning-metrics', learningMetricsRoutes); // 학습 메트릭스 API
app.use('/api/special-activities', specialActivitiesRoutes); // 특별활동 API
app.use('/api/character-evaluations', characterEvaluationsRoutes); // 생활 및 인성평가 API

console.log('✅ All routes registered successfully');

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Vietnam Student Management System API',
    timestamp: new Date().toISOString()
  });
});

// 성능 리포트 엔드포인트 (개발용)
app.get('/api/performance', (req, res) => {
  res.json({
    success: true,
    metrics: performanceMonitor.generateReport()
  });
});

// Debug route to list all registered routes
app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = middleware.regexp.source.replace(/\\/g, '').replace(/\^/, '').replace(/\$.*/, '').replace(/\(\?\:/, '');
          routes.push({
            path: path + handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json({ routes });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error caught in middleware:', err.message);
  console.error('Stack:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: 'Login failed',
      message_ko: '로그인에 실패했습니다',
      message_vi: 'Đăng nhập thất bại',
      details: err.message // 디버깅용
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl} not found`);
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;