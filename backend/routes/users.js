const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { verifyToken, checkRole } = require('../middleware/auth');
const db = require('../config/database');

console.log('Users router loaded');

// 모든 라우트에 인증 필요
router.use(verifyToken);

// 사용자 생성 (관리자만)
router.post('/create', 
  checkRole('admin'),
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('full_name').notEmpty().trim(),
    body('role').isIn(['admin', 'teacher', 'korean_branch']),
    body('agency_name').optional().trim(),
    body('branch_name').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          errors: errors.array(),
          message_ko: '입력값을 확인해주세요'
        });
      }

      const { email, password, full_name, role, agency_name, branch_name } = req.body;

      // 이메일 중복 확인
      const existingUser = await db('users')
        .where('email', email)
        .first();

      if (existingUser) {
        return res.status(400).json({
          error: {
            message: 'Email already exists',
            message_ko: '이미 사용중인 이메일입니다'
          }
        });
      }

      // 역할별 필수 필드 확인
      if (role === 'teacher' && !agency_name) {
        return res.status(400).json({
          error: {
            message: 'Agency name is required for teachers',
            message_ko: '교사 계정은 유학원 정보가 필요합니다'
          }
        });
      }

      if (role === 'korean_branch' && !branch_name) {
        return res.status(400).json({
          error: {
            message: 'Branch name is required for branch accounts',
            message_ko: '지점 계정은 지점명이 필요합니다'
          }
        });
      }

      // 비밀번호 해시
      const hashedPassword = await bcrypt.hash(password, 10);

      // 사용자 생성
      const [newUser] = await db('users')
        .insert({
          email,
          password_hash: hashedPassword,
          full_name,
          role,
          agency_name: role === 'teacher' ? agency_name : null,
          branch_name: role === 'korean_branch' ? branch_name : null,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning(['user_id', 'email', 'full_name', 'role']);

      console.log('New user created:', newUser);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        message_ko: '사용자가 생성되었습니다',
        data: newUser
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        error: {
          message: 'Failed to create user: ' + error.message,
          message_ko: '사용자 생성에 실패했습니다'
        }
      });
    }
  }
);

// 사용자 목록 조회 (관리자만)
router.get('/', checkRole('admin'), async (req, res) => {
  try {
    const users = await db('users')
      .select(
        'user_id',
        'email',
        'full_name',
        'role',
        'agency_name',
        'branch_name',
        'is_active',
        'last_login',
        'created_at'
      )
      .orderBy('created_at', 'desc');

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// 사용자 삭제 (관리자만)
router.delete('/:id', checkRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Delete user request for ID:', id);
    
    // 자기 자신은 삭제 불가
    if (req.user.user_id === parseInt(id)) {
      return res.status(400).json({
        error: {
          message: 'Cannot delete your own account',
          message_ko: '자신의 계정은 삭제할 수 없습니다'
        }
      });
    }

    // 사용자 확인
    const user = await db('users')
      .where('user_id', id)
      .first();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          message_ko: '사용자를 찾을 수 없습니다'
        }
      });
    }

    // 관리자는 다른 관리자를 삭제할 수 없음
    if (user.role === 'admin') {
      return res.status(403).json({
        error: {
          message: 'Cannot delete admin account',
          message_ko: '관리자 계정은 삭제할 수 없습니다'
        }
      });
    }

    // 교사인 경우, 해당 교사가 만든 학생들을 다른 교사에게 이전하거나 NULL로 설정
    if (user.role === 'teacher') {
      // 같은 유학원의 다른 교사 찾기
      const otherTeacher = await db('users')
        .where('agency_name', user.agency_name)
        .where('role', 'teacher')
        .whereNot('user_id', id)
        .first();

      if (otherTeacher) {
        // 다른 교사에게 학생 이전
        await db('students')
          .where('agency_id', id)
          .update({ agency_id: otherTeacher.user_id });
        console.log('Students transferred to:', otherTeacher.user_id);
      } else {
        // 다른 교사가 없으면 agency_id를 NULL로
        await db('students')
          .where('agency_id', id)
          .update({ agency_id: null });
        console.log('Students agency_id set to NULL');
      }
    }

    // 사용자 삭제
    const deleteResult = await db('users')
      .where('user_id', id)
      .del();

    console.log('Delete result:', deleteResult);

    if (deleteResult === 0) {
      return res.status(404).json({
        error: {
          message: 'User not found or already deleted',
          message_ko: '사용자를 찾을 수 없거나 이미 삭제되었습니다'
        }
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      message_ko: '사용자가 삭제되었습니다'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete user: ' + error.message,
        message_ko: '사용자 삭제에 실패했습니다: ' + error.message
      }
    });
  }
});

// 비밀번호 재설정 (관리자만)
router.post('/:id/reset-password', 
  checkRole('admin'),
  [body('new_password').isLength({ min: 6 })],
  async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array(),
        message_ko: '비밀번호는 최소 6자 이상이어야 합니다'
      });
    }

    // 사용자 존재 확인
    const user = await db('users')
      .where('user_id', id)
      .first();

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          message_ko: '사용자를 찾을 수 없습니다'
        }
      });
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // 비밀번호 업데이트
    await db('users')
      .where('user_id', id)
      .update({
        password_hash: hashedPassword,
        updated_at: new Date()
      });

    console.log('Password reset for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset successfully',
      message_ko: '비밀번호가 재설정되었습니다'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to reset password',
        message_ko: '비밀번호 재설정에 실패했습니다'
      }
    });
  }
});

module.exports = router;