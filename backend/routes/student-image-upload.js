const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

// uploads 디렉토리 생성
const uploadDir = path.join(__dirname, '..', 'uploads', 'students');
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Multer 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `student-${req.body.studentId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 학생 프로필 이미지 업로드
router.post('/upload-image', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지가 업로드되지 않았습니다.' });
    }
    
    const { studentId } = req.body;
    
    if (!studentId) {
      // 파일 삭제
      await fs.unlink(req.file.path);
      return res.status(400).json({ error: '학생 ID가 필요합니다.' });
    }
    
    // 기존 이미지가 있다면 삭제
    const [student] = await db('students')
      .where('student_id', studentId)
      .select('profile_image');
    
    if (student && student.profile_image) {
      const oldImagePath = path.join(uploadDir, student.profile_image);
      await fs.unlink(oldImagePath).catch(() => {}); // 파일이 없어도 에러 무시
    }
    
    // 데이터베이스 업데이트
    const filename = `students/${req.file.filename}`;
    await db('students')
      .where('student_id', studentId)
      .update({ 
        profile_image: filename,
        updated_at: new Date()
      });
    
    res.json({
      success: true,
      filename: filename,
      message: '프로필 이미지가 업로드되었습니다.'
    });
    
  } catch (error) {
    console.error('Image upload error:', error);
    
    // 에러 발생 시 업로드된 파일 삭제
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      error: '이미지 업로드 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 학생 프로필 이미지 삭제
router.delete('/:studentId/image', verifyToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // 권한 체크
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ error: '권한이 없습니다.' });
    }
    
    // 학생 정보 조회
    const [student] = await db('students')
      .where('student_id', studentId)
      .select('profile_image');
    
    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }
    
    if (student.profile_image) {
      // 파일 삭제
      const imagePath = path.join(__dirname, '..', 'uploads', student.profile_image);
      await fs.unlink(imagePath).catch(() => {});
      
      // 데이터베이스 업데이트
      await db('students')
        .where('student_id', studentId)
        .update({ 
          profile_image: null,
          updated_at: new Date()
        });
    }
    
    res.json({
      success: true,
      message: '프로필 이미지가 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({
      error: '이미지 삭제 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

module.exports = router;