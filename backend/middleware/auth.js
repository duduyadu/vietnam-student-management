const jwt = require('jsonwebtoken');
const db = require('../config/database');

// JWT 토큰 검증 미들웨어
const verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        error: {
          message: 'No token provided',
          message_ko: '토큰이 제공되지 않았습니다',
          message_vi: 'Không có mã thông báo được cung cấp'
        }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 사용자 정보 조회 - PostgreSQL boolean 처리
    const user = await db('users')
      .where('user_id', decoded.userId)
      .where('is_active', true)  // PostgreSQL boolean은 true/false 사용
      .first();
    
    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid token or user not found',
          message_ko: '유효하지 않은 토큰이거나 사용자를 찾을 수 없습니다',
          message_vi: 'Mã thông báo không hợp lệ hoặc không tìm thấy người dùng'
        }
      });
    }

    // 비밀번호 제거
    delete user.password_hash;
    
    // JWT 토큰에서 agencyId 추가
    req.user = {
      ...user,
      agency_id: decoded.agencyId || (user.role === 'teacher' ? user.user_id : null)
    };
    
    // 디버깅: req.user 구조 확인
    console.log('🔍 AUTH MIDDLEWARE - decoded:', JSON.stringify(decoded, null, 2));
    console.log('🔍 AUTH MIDDLEWARE - user from DB:', JSON.stringify(user, null, 2));
    console.log('🔍 AUTH MIDDLEWARE - req.user:', JSON.stringify(req.user, null, 2));
    console.log('🔍 AUTH MIDDLEWARE - req.user.user_id:', req.user.user_id);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Token expired',
          message_ko: '토큰이 만료되었습니다',
          message_vi: 'Mã thông báo đã hết hạn'
        }
      });
    }
    
    return res.status(401).json({
      error: {
        message: 'Invalid token',
        message_ko: '유효하지 않은 토큰입니다',
        message_vi: 'Mã thông báo không hợp lệ'
      }
    });
  }
};

// 역할 확인 미들웨어
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          message_ko: '인증이 필요합니다',
          message_vi: 'Yêu cầu xác thực'
        }
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          message_ko: '권한이 부족합니다',
          message_vi: 'Không đủ quyền'
        }
      });
    }

    next();
  };
};

// 자신의 데이터만 접근 가능한지 확인
const checkOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // admin은 모든 데이터 접근 가능
      if (req.user.role === 'admin') {
        return next();
      }

      // teacher는 자신의 유학원 학생만 접근 가능
      if (req.user.role === 'teacher') {
        if (model === 'students') {
          const student = await db('students')
            .where({ student_id: id, agency_id: req.user.user_id })
            .first();
          
          if (!student) {
            return res.status(403).json({
              error: {
                message: 'Access denied',
                message_ko: '접근이 거부되었습니다',
                message_vi: 'Truy cập bị từ chối'
              }
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        error: {
          message: 'Error checking ownership',
          message_ko: '소유권 확인 중 오류가 발생했습니다',
          message_vi: 'Lỗi khi kiểm tra quyền sở hữu'
        }
      });
    }
  };
};

module.exports = {
  verifyToken,
  checkRole,
  checkOwnership
};