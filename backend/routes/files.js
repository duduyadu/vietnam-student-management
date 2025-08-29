const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { verifyToken } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const db = require('../config/database');

// 인증 미들웨어 적용
router.use(verifyToken);

console.log('📁 File upload router loaded');

// ============================
// 파일 업로드 (단일)
// ============================
router.post('/upload/single', upload.single('file'), handleMulterError, async (req, res) => {
  try {
    console.log('📤 Single file upload request');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: '파일이 업로드되지 않았습니다.' 
      });
    }

    const { student_id, fileType, description } = req.body;
    
    // 파일 정보 데이터베이스에 저장
    const fileRecord = {
      student_id: student_id || null,
      file_type: fileType || 'document',
      file_name: req.file.filename,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      description: description || '',
      uploaded_by: req.user.user_id,
      uploaded_at: new Date()
    };

    // 파일 정보를 데이터베이스에 저장 (files 테이블이 있다고 가정)
    // 실제로는 files 테이블을 먼저 생성해야 함
    console.log('✅ File uploaded successfully:', fileRecord);

    res.json({
      success: true,
      message: '파일이 성공적으로 업로드되었습니다.',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: req.file.path
      }
    });

  } catch (error) {
    console.error('❌ File upload error:', error);
    res.status(500).json({ 
      error: '파일 업로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// ============================
// 파일 업로드 (다중)
// ============================
router.post('/upload/multiple', upload.array('files', 5), handleMulterError, async (req, res) => {
  try {
    console.log('📤 Multiple files upload request');
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: '파일이 업로드되지 않았습니다.' 
      });
    }

    const { student_id, fileType, description } = req.body;
    
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      path: file.path,
      mimeType: file.mimetype
    }));

    console.log(`✅ ${uploadedFiles.length} files uploaded successfully`);

    res.json({
      success: true,
      message: `${uploadedFiles.length}개의 파일이 성공적으로 업로드되었습니다.`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('❌ Multiple files upload error:', error);
    res.status(500).json({ 
      error: '파일 업로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// ============================
// 학생 프로필 사진 업로드
// ============================
router.post('/upload/photo/:studentId', upload.single('photo'), handleMulterError, async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`📸 Photo upload for student ${studentId}`);
    
    if (!req.file) {
      return res.status(400).json({ 
        error: '사진이 업로드되지 않았습니다.' 
      });
    }

    // 이미지 파일인지 확인
    if (!req.file.mimetype.startsWith('image/')) {
      // 업로드된 파일 삭제
      await fs.unlink(req.file.path);
      return res.status(400).json({ 
        error: '이미지 파일만 업로드 가능합니다.' 
      });
    }

    // 학생 정보 업데이트 (photo_path 컬럼이 있다고 가정)
    // await db('students')
    //   .where('student_id', studentId)
    //   .update({ photo_path: req.file.path });

    console.log('✅ Photo uploaded successfully');

    res.json({
      success: true,
      message: '프로필 사진이 성공적으로 업로드되었습니다.',
      photo: {
        filename: req.file.filename,
        path: req.file.path,
        url: `/uploads/students/photos/${req.file.filename}`
      }
    });

  } catch (error) {
    console.error('❌ Photo upload error:', error);
    res.status(500).json({ 
      error: '사진 업로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// ============================
// 파일 다운로드
// ============================
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`📥 File download request: ${filename}`);
    
    // 보안을 위해 파일명 검증
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ 
        error: '잘못된 파일명입니다.' 
      });
    }

    // 파일 경로 조합 (실제로는 DB에서 파일 경로를 조회해야 함)
    const filePath = path.join(__dirname, '..', 'uploads', 'temp', filename);
    
    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ 
        error: '파일을 찾을 수 없습니다.' 
      });
    }

    // 파일 다운로드
    res.download(filePath);

  } catch (error) {
    console.error('❌ File download error:', error);
    res.status(500).json({ 
      error: '파일 다운로드 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

// ============================
// 파일 삭제
// ============================
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`🗑️ File delete request: ${filename}`);
    
    // 관리자만 파일 삭제 가능
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        error: '파일 삭제 권한이 없습니다.' 
      });
    }

    // 보안을 위해 파일명 검증
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({ 
        error: '잘못된 파일명입니다.' 
      });
    }

    // 파일 경로 조합 (실제로는 DB에서 파일 경로를 조회해야 함)
    const filePath = path.join(__dirname, '..', 'uploads', 'temp', filename);
    
    // 파일 삭제
    await fs.unlink(filePath);
    
    console.log('✅ File deleted successfully');

    res.json({
      success: true,
      message: '파일이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('❌ File delete error:', error);
    res.status(500).json({ 
      error: '파일 삭제 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
});

module.exports = router;