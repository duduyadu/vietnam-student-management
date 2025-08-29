const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 파일 타입별 저장 경로 설정
const getDestination = (fileType) => {
  const destinations = {
    'transcript': 'uploads/students/transcripts',
    'certificate': 'uploads/students/certificates',
    'photo': 'uploads/students/photos',
    'document': 'uploads/students/documents',
    'default': 'uploads/temp'
  };
  return destinations[fileType] || destinations.default;
};

// 파일 확장자 검증
const fileFilter = (req, file, cb) => {
  // 허용된 파일 확장자
  const allowedExtensions = {
    image: ['.jpg', '.jpeg', '.png', '.gif'],
    document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.hwp'],
    all: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.hwp']
  };

  const ext = path.extname(file.originalname).toLowerCase();
  
  // 파일 타입에 따른 확장자 검증
  if (allowedExtensions.all.includes(ext)) {
    return cb(null, true);
  }
  
  cb(new Error(`허용되지 않는 파일 형식입니다. 허용된 형식: ${allowedExtensions.all.join(', ')}`));
};

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'default';
    const dest = getDestination(fileType);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    // 파일명: UUID_원본파일명
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    // 한글 파일명 처리를 위한 인코딩
    const safeBasename = Buffer.from(basename, 'latin1').toString('utf8');
    const filename = `${uuidv4()}_${safeBasename}${ext}`;
    cb(null, filename);
  }
});

// 파일 크기 제한 (10MB)
const limits = {
  fileSize: 10 * 1024 * 1024 // 10MB
};

// Multer 인스턴스 생성
const upload = multer({
  storage,
  fileFilter,
  limits
});

// 에러 핸들러
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: '파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.' 
      });
    }
    return res.status(400).json({ 
      error: `파일 업로드 오류: ${err.message}` 
    });
  } else if (err) {
    return res.status(400).json({ 
      error: err.message 
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError
};