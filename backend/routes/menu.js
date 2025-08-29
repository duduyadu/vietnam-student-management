const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../config/database');

router.use(verifyToken);

// 메뉴 조회
router.get('/', async (req, res) => {
  try {
    const { language = 'ko' } = req.query;
    const userRole = req.user.role;

    // 하드코딩된 메뉴 (DB 구조 생성 전까지 임시)
    const allMenus = [
      {
        menu_id: 1,
        menu_key: 'dashboard',
        icon: 'Dashboard',
        route: '/',
        sort_order: 1,
        menu_name: language === 'ko' ? '대시보드' : 'Dashboard',
        required_roles: ['admin', 'teacher', 'korean_branch']
      },
      {
        menu_id: 2,
        menu_key: 'students',
        icon: 'School',
        route: '/students',
        sort_order: 2,
        menu_name: language === 'ko' ? '학생 관리' : 'Quản lý sinh viên',
        required_roles: ['admin', 'teacher', 'korean_branch']
      },
      {
        menu_id: 3,
        menu_key: 'consultations',
        icon: 'RecordVoiceOver',
        route: '/consultations',
        sort_order: 3,
        menu_name: language === 'ko' ? '상담 관리' : 'Quản lý tư vấn',
        required_roles: ['admin', 'teacher']
      },
      // 보고서 메뉴 임시 제거 - UI 단순화
      // {
      //   menu_id: 4,
      //   menu_key: 'reports',
      //   icon: 'Assessment',
      //   route: '/reports',
      //   sort_order: 4,
      //   menu_name: language === 'ko' ? '보고서' : 'Báo cáo',
      //   required_roles: ['admin', 'teacher']
      // },
      {
        menu_id: 5,
        menu_key: 'users',
        icon: 'People',
        route: '/users',
        sort_order: 5,
        menu_name: language === 'ko' ? '사용자 관리' : 'Quản lý người dùng',
        required_roles: ['admin']
      }
    ];

    // 사용자 권한에 따른 필터링
    const menus = allMenus.filter(menu => 
      menu.required_roles.includes(userRole)
    );

    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Failed to get menu' });
  }
});

module.exports = router;