exports.seed = function(knex) {
  // 기존 데이터 삭제
  return knex('consultation_types').del()
    .then(function () {
      // 새 데이터 삽입
      return knex('consultation_types').insert([
        // 일반 상담
        {
          type_code: 'general_consultation',
          type_name_ko: '일반 상담',
          type_name_vi: 'Tư vấn chung',
          category: 'consultation',
          description: '일상적인 학업 및 생활 상담',
          required_fields: JSON.stringify(['content_ko', 'counselor_evaluation']),
          display_order: 1
        },
        {
          type_code: 'career_consultation',
          type_name_ko: '진로 상담',
          type_name_vi: 'Tư vấn nghề nghiệp',
          category: 'consultation',
          description: '대학 진학 및 진로 관련 상담',
          required_fields: JSON.stringify(['content_ko', 'next_goals', 'counselor_evaluation']),
          display_order: 2
        },
        {
          type_code: 'visa_consultation',
          type_name_ko: '비자 상담',
          type_name_vi: 'Tư vấn visa',
          category: 'consultation',
          description: '비자 및 체류 관련 상담',
          required_fields: JSON.stringify(['content_ko', 'action_items', 'counselor_evaluation']),
          display_order: 3
        },
        
        // 학업 평가
        {
          type_code: 'monthly_academic',
          type_name_ko: '월간 학업 평가',
          type_name_vi: 'Đánh giá học tập hàng tháng',
          category: 'evaluation',
          description: '매월 진행하는 학업 성취도 평가',
          required_fields: JSON.stringify([
            'attendance_rate', 
            'participation_grade', 
            'vocabulary_known', 
            'academic_evaluation'
          ]),
          display_order: 10
        },
        {
          type_code: 'quarterly_academic',
          type_name_ko: '분기별 학업 평가',
          type_name_vi: 'Đánh giá học tập hàng quý',
          category: 'evaluation',
          description: '3개월마다 진행하는 종합 학업 평가',
          required_fields: JSON.stringify([
            'attendance_rate',
            'participation_grade',
            'vocabulary_known',
            'strength_areas',
            'weakness_areas',
            'learning_strategy',
            'academic_evaluation'
          ]),
          display_order: 11
        },
        
        // 생활 평가
        {
          type_code: 'monthly_life',
          type_name_ko: '월간 생활 평가',
          type_name_vi: 'Đánh giá sinh hoạt hàng tháng',
          category: 'evaluation',
          description: '매월 진행하는 생활 및 인성 평가',
          required_fields: JSON.stringify([
            'social_rating',
            'attitude_rating',
            'adaptation_rating',
            'class_attitude'
          ]),
          display_order: 20
        },
        {
          type_code: 'semester_life',
          type_name_ko: '학기별 생활 평가',
          type_name_vi: 'Đánh giá sinh hoạt học kỳ',
          category: 'evaluation',
          description: '학기별 종합 생활 평가',
          required_fields: JSON.stringify([
            'social_rating',
            'social_relationship',
            'attitude_rating',
            'class_attitude',
            'adaptation_rating',
            'adaptation_level',
            'growth_rating',
            'growth_potential'
          ]),
          display_order: 21
        },
        
        // 특별 활동
        {
          type_code: 'special_activity',
          type_name_ko: '특별활동 기록',
          type_name_vi: 'Hoạt động ngoại khóa',
          category: 'evaluation',
          description: '동아리, 봉사활동, 수상 기록',
          required_fields: JSON.stringify([
            'club_activities',
            'volunteer_activities',
            'awards'
          ]),
          display_order: 30
        },
        
        // TOPIK 성적
        {
          type_code: 'topik_score',
          type_name_ko: 'TOPIK 성적 기록',
          type_name_vi: 'Điểm TOPIK',
          category: 'evaluation',
          description: 'TOPIK 시험 성적 기록',
          required_fields: JSON.stringify([
            'topik_test_number',
            'topik_reading',
            'topik_listening',
            'topik_writing',
            'topik_total'
          ]),
          display_order: 40
        },
        
        // 종합 평가
        {
          type_code: 'annual_comprehensive',
          type_name_ko: '연간 종합 평가',
          type_name_vi: 'Đánh giá tổng hợp hàng năm',
          category: 'report',
          description: '연말 종합 평가 보고서',
          required_fields: JSON.stringify([
            'academic_evaluation',
            'korean_evaluation',
            'final_recommendation',
            'overall_score'
          ]),
          display_order: 50
        },
        {
          type_code: 'graduation_evaluation',
          type_name_ko: '졸업 평가',
          type_name_vi: 'Đánh giá tốt nghiệp',
          category: 'report',
          description: '졸업 시 최종 평가',
          required_fields: JSON.stringify([
            'academic_evaluation',
            'korean_evaluation',
            'portfolio_status',
            'final_recommendation',
            'overall_score'
          ]),
          display_order: 51
        }
      ]);
    });
};