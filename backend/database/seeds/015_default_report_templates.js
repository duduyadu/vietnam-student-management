exports.seed = async function(knex) {
  // 기존 템플릿 삭제
  await knex('report_templates').del();

  // 기본 상담 보고서 템플릿
  const consultationTemplate = {
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
    css_styles: `
      body {
        font-family: 'Malgun Gothic', 'Noto Sans KR', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        margin: 0;
        padding: 20px;
        background-color: #f8f9fa;
      }
      
      .report-container {
        max-width: 210mm;
        margin: 0 auto;
        background: white;
        padding: 30px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      
      .report-header {
        text-align: center;
        border-bottom: 3px solid #2c3e50;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .report-title {
        font-size: 28px;
        font-weight: bold;
        color: #2c3e50;
        margin: 0;
      }
      
      .report-subtitle {
        font-size: 16px;
        color: #7f8c8d;
        margin: 10px 0 0 0;
      }
      
      .section {
        margin-bottom: 30px;
        page-break-inside: avoid;
      }
      
      .section-title {
        font-size: 20px;
        font-weight: bold;
        color: #34495e;
        border-left: 4px solid #3498db;
        padding-left: 15px;
        margin-bottom: 15px;
      }
      
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
      
      .info-item {
        display: flex;
        margin-bottom: 8px;
      }
      
      .info-label {
        font-weight: bold;
        min-width: 120px;
        color: #5d6d7e;
      }
      
      .info-value {
        flex: 1;
        color: #2c3e50;
      }
      
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin: 20px 0;
      }
      
      .stat-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 5px;
      }
      
      .stat-label {
        font-size: 14px;
        opacity: 0.9;
      }
      
      .chart-container {
        text-align: center;
        margin: 20px 0;
        page-break-inside: avoid;
      }
      
      .chart-image {
        max-width: 100%;
        height: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      
      .table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      
      .table th {
        background-color: #f8f9fa;
        color: #495057;
        font-weight: bold;
        padding: 12px;
        text-align: left;
        border-bottom: 2px solid #dee2e6;
      }
      
      .table td {
        padding: 10px 12px;
        border-bottom: 1px solid #dee2e6;
      }
      
      .table tbody tr:hover {
        background-color: #f8f9fa;
      }
      
      .grade-excellent { color: #27ae60; font-weight: bold; }
      .grade-good { color: #f39c12; font-weight: bold; }
      .grade-average { color: #e67e22; font-weight: bold; }
      .grade-poor { color: #e74c3c; font-weight: bold; }
      
      .consultation-item {
        background: #f8f9fa;
        border-left: 4px solid #3498db;
        padding: 15px;
        margin-bottom: 15px;
        border-radius: 0 4px 4px 0;
      }
      
      .consultation-date {
        font-weight: bold;
        color: #2c3e50;
        margin-bottom: 8px;
      }
      
      .consultation-content {
        line-height: 1.6;
        color: #5d6d7e;
      }
      
      .recommendation-box {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 8px;
        margin-top: 20px;
      }
      
      .recommendation-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
      }
      
      .recommendation-list {
        list-style: none;
        padding: 0;
      }
      
      .recommendation-list li {
        margin-bottom: 10px;
        padding-left: 20px;
        position: relative;
      }
      
      .recommendation-list li:before {
        content: "▶";
        position: absolute;
        left: 0;
        color: #f1c40f;
      }
      
      .footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #dee2e6;
        text-align: center;
        color: #6c757d;
        font-size: 12px;
      }
      
      @media print {
        body { background: white; }
        .report-container { box-shadow: none; margin: 0; }
        .section { page-break-inside: avoid; }
      }
    `,
    html_template: `
      <div class="report-container">
        <div class="report-header">
          <h1 class="report-title">{{labels_ko.title}}</h1>
          <p class="report-subtitle">{{formatDate reportDate 'YYYY년 MM월 DD일'}} 작성</p>
        </div>

        <!-- 학생 기본 정보 -->
        <div class="section">
          <h2 class="section-title">{{labels_ko.student_info}}</h2>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <span class="info-label">이름:</span>
                <span class="info-value">{{student.attributes.name}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">학생코드:</span>
                <span class="info-value">{{student.student_code}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">생년월일:</span>
                <span class="info-value">{{formatDate student.attributes.birth_date 'YYYY년 MM월 DD일'}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">연락처:</span>
                <span class="info-value">{{student.attributes.phone}}</span>
              </div>
            </div>
            <div>
              <div class="info-item">
                <span class="info-label">유학원:</span>
                <span class="info-value">{{student.agency_name}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">상태:</span>
                <span class="info-value">{{student.status}}</span>
              </div>
              <div class="info-item">
                <span class="info-label">등록일:</span>
                <span class="info-value">{{formatDate student.created_at 'YYYY년 MM월 DD일'}}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 학업 성과 통계 -->
        <div class="section">
          <h2 class="section-title">{{labels_ko.academic_performance}}</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">{{formatNumber stats.averageScore 1}}%</div>
              <div class="stat-label">평균 점수</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{stats.totalExams}}</div>
              <div class="stat-label">총 시험 횟수</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{formatNumber stats.attendanceRate 1}}%</div>
              <div class="stat-label">출석률</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{stats.totalConsultations}}</div>
              <div class="stat-label">상담 횟수</div>
            </div>
          </div>

          {{#if scoreChart}}
          <div class="chart-container">
            <h3>성적 추이</h3>
            <img src="{{scoreChart}}" alt="성적 추이 차트" class="chart-image">
          </div>
          {{/if}}

          {{#if examResults.length}}
          <h3>최근 시험 결과</h3>
          <table class="table">
            <thead>
              <tr>
                <th>시험명</th>
                <th>과목</th>
                <th>시험일</th>
                <th>점수</th>
                <th>등급</th>
              </tr>
            </thead>
            <tbody>
              {{#each examResults}}
              <tr>
                <td>{{exam_name}}</td>
                <td>{{subject}}</td>
                <td>{{formatDate exam_date 'MM/DD'}}</td>
                <td>{{formatNumber score}}/{{formatNumber max_score}} ({{formatNumber percentage 1}}%)</td>
                <td class="grade-{{#if_eq grade 'A+'}}excellent{{/if_eq}}{{#if_eq grade 'A'}}excellent{{/if_eq}}{{#if_eq grade 'B+'}}good{{/if_eq}}{{#if_eq grade 'B'}}good{{/if_eq}}{{#if_eq grade 'C+'}}average{{/if_eq}}{{#if_eq grade 'C'}}average{{/if_eq}}">
                  {{grade}}
                </td>
              </tr>
              {{/each}}
            </tbody>
          </table>
          {{/if}}
        </div>

        <!-- 상담 기록 -->
        <div class="section">
          <h2 class="section-title">{{labels_ko.consultation_records}}</h2>
          {{#if consultations.length}}
            {{#each consultations}}
            <div class="consultation-item">
              <div class="consultation-date">
                {{formatDate consultation_date 'YYYY년 MM월 DD일'}} - {{teacher_name}} 교사
              </div>
              <div class="consultation-content">
                {{content_ko}}
                {{#if action_items}}
                <br><strong>후속 조치:</strong> {{action_items}}
                {{/if}}
              </div>
            </div>
            {{/each}}
          {{else}}
            <p>상담 기록이 없습니다.</p>
          {{/if}}
        </div>

        <!-- 향후 계획 및 추천사항 -->
        <div class="section">
          <div class="recommendation-box">
            <h3 class="recommendation-title">{{labels_ko.recommendations}}</h3>
            <ul class="recommendation-list">
              {{#if (gt stats.averageScore 80)}}
              <li>우수한 성취도를 보이고 있습니다. 현재 수준을 유지하며 더 도전적인 목표를 설정하시기 바랍니다.</li>
              {{else}}
              <li>추가적인 학습 지원이 필요합니다. 개별 맞춤 학습 계획을 수립하시기 바랍니다.</li>
              {{/if}}
              
              {{#if (lt stats.attendanceRate 80)}}
              <li>출석률 개선이 필요합니다. 규칙적인 출석을 통해 학습 효과를 높이시기 바랍니다.</li>
              {{/if}}
              
              <li>정기적인 상담을 통해 학습 목표 달성도를 점검하고 동기를 부여하시기 바랍니다.</li>
              <li>한국어 실력 향상을 위한 추가 프로그램 참여를 권장합니다.</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>본 보고서는 베트남 유학생 통합 관리 시스템에서 자동 생성되었습니다.</p>
          <p>Generated on {{formatDate reportDate 'YYYY-MM-DD HH:mm:ss'}}</p>
        </div>
      </div>
    `,
    created_by: 1
  };

  // 학업 진도 보고서 템플릿
  const progressTemplate = {
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
    css_styles: consultationTemplate.css_styles, // 같은 스타일 사용
    html_template: `
      <div class="report-container">
        <div class="report-header">
          <h1 class="report-title">{{labels_ko.title}}</h1>
          <p class="report-subtitle">{{student.attributes.name}} - {{formatDate reportDate 'YYYY년 MM월 DD일'}}</p>
        </div>

        <div class="section">
          <h2 class="section-title">{{labels_ko.progress_overview}}</h2>
          {{#if learningProgress.length}}
          <table class="table">
            <thead>
              <tr>
                <th>과목</th>
                <th>진도율</th>
                <th>출석률</th>
                <th>평가</th>
                <th>기록일</th>
              </tr>
            </thead>
            <tbody>
              {{#each learningProgress}}
              <tr>
                <td>{{subject}}</td>
                <td>{{formatNumber completion_percentage 1}}%</td>
                <td>{{formatNumber attendance_rate 1}}%</td>
                <td>{{overall_performance}}</td>
                <td>{{formatDate record_date 'MM/DD'}}</td>
              </tr>
              {{/each}}
            </tbody>
          </table>
          {{else}}
          <p>학습 진도 기록이 없습니다.</p>
          {{/if}}
        </div>

        <div class="footer">
          <p>본 보고서는 베트남 유학생 통합 관리 시스템에서 자동 생성되었습니다.</p>
        </div>
      </div>
    `,
    created_by: 1
  };

  // 템플릿 삽입
  await knex('report_templates').insert([
    consultationTemplate,
    progressTemplate
  ]);

  console.log('✅ Default report templates inserted');
};