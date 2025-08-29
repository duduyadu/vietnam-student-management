const db = require('../config/database');

async function seedReportTemplates() {
  try {
    // Check if templates already exist
    const existingTemplates = await db('report_templates')
      .where('template_code', 'consultation_comprehensive')
      .first();
    
    if (existingTemplates) {
      console.log('Templates already exist, skipping...');
      return;
    }
    
    // Insert default templates
    await db('report_templates').insert([
      {
        template_name: '종합 상담 보고서',
        template_code: 'consultation_comprehensive',
        description: '학생의 학업 성과, 상담 기록, 학습 진도를 종합한 전문적인 상담 보고서',
        report_type: 'consultation',
        allowed_roles: JSON.stringify(['admin', 'teacher', 'korean_branch']),
        is_active: true,
        is_default: true,
        display_order: 1,
        version: '1.0',
        labels_ko: JSON.stringify({
          title: '종합 상담 보고서',
          student_info: '학생 기본 정보',
          academic_performance: '학업 성과',
          learning_progress: '학습 진도',
          consultation_records: '상담 기록',
          recommendations: '향후 계획 및 추천사항'
        }),
        labels_vi: JSON.stringify({
          title: 'Báo cáo tư vấn toàn diện',
          student_info: 'Thông tin cơ bản sinh viên',
          academic_performance: 'Kết quả học tập',
          learning_progress: 'Tiến độ học tập',
          consultation_records: 'Hồ sơ tư vấn',
          recommendations: 'Kế hoạch và khuyến nghị tương lai'
        }),
        data_sources: JSON.stringify([
          'student_basic_info',
          'exam_results',
          'learning_progress',
          'consultations',
          'academic_goals'
        ]),
        chart_configs: JSON.stringify({
          score_trend: {
            type: 'line',
            title: '성적 추이',
            data_source: 'exam_results'
          }
        }),
        created_by: 1
      },
      {
        template_name: '학업 진도 보고서',
        template_code: 'academic_progress',
        description: '학습 진도와 성과를 중심으로 한 분석 보고서',
        report_type: 'academic_progress',
        allowed_roles: JSON.stringify(['admin', 'teacher']),
        is_active: true,
        is_default: false,
        display_order: 2,
        version: '1.0',
        labels_ko: JSON.stringify({
          title: '학업 진도 보고서',
          progress_overview: '진도 현황',
          performance_analysis: '성과 분석',
          goal_tracking: '목표 달성도'
        }),
        labels_vi: JSON.stringify({
          title: 'Báo cáo tiến độ học tập',
          progress_overview: 'Tổng quan tiến độ',
          performance_analysis: 'Phân tích kết quả',
          goal_tracking: 'Theo dõi mục tiêu'
        }),
        data_sources: JSON.stringify([
          'learning_progress',
          'academic_goals',
          'exam_results'
        ]),
        created_by: 1
      },
      {
        template_name: '성적 분석 보고서',
        template_code: 'performance_analysis',
        description: '시험 성적 추이와 분석을 제공하는 보고서',
        report_type: 'performance_analysis',
        allowed_roles: JSON.stringify(['admin', 'teacher', 'korean_branch']),
        is_active: true,
        is_default: false,
        display_order: 3,
        version: '1.0',
        labels_ko: JSON.stringify({
          title: '성적 분석 보고서',
          score_trends: '성적 추이',
          subject_analysis: '과목별 분석',
          recommendations: '개선 방안'
        }),
        labels_vi: JSON.stringify({
          title: 'Báo cáo phân tích điểm số',
          score_trends: 'Xu hướng điểm số',
          subject_analysis: 'Phân tích theo môn học',
          recommendations: 'Phương án cải thiện'
        }),
        data_sources: JSON.stringify([
          'exam_results',
          'academic_goals'
        ]),
        created_by: 1
      }
    ]);
    
    console.log('✅ Report templates seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding report templates:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Run the seed function
seedReportTemplates().then(() => {
  console.log('Seeding completed!');
  process.exit(0);
}).catch(error => {
  console.error('Seeding failed:', error);
  process.exit(1);
});